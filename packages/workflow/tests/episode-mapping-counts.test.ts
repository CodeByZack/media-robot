import { describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { episodeMappingCounts, tryEpisodeMapping } from "../src/consumption/fast-path/landing.js";
import type { StagingDigest } from "../src/acquisition-v2/staging-digest.js";
import type { TaskSandbox } from "../src/acquisition-v2/sandbox.js";

const USAGE = {
  inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
} as const;

function mappingModel(mapping: Record<string, string>) {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "text" as const, text: JSON.stringify({ mapping, unmapped: [], reasoning: "纯数字按序" }) }],
      finishReason: { unified: "stop" as const, raw: "stop" as const },
      usage: USAGE,
      warnings: [],
    }),
  });
}

/** Only videos/junkSignals/episodeCodes are read by tryEpisodeMapping. */
function digestOf(paths: string[]): StagingDigest {
  return {
    videos: paths.map((p, i) => ({ id: `f${i}`, path: p, sizeBytes: 100, isVideo: true, isSubtitle: false })),
    subtitles: [],
    episodeCodes: [],
    unparsedVideos: paths,
    dateRejectedVideos: [],
    outOfSeasonCodes: [],
    junkSignals: [],
    coveredCodes: [],
    coveredFileMap: new Map(),
    missingCodes: [],
    passes: false,
    summary: "",
    parsed: [],
  };
}

const SANDBOX = { logRunId: "run-x" } as unknown as TaskSandbox;

async function runMapping(options: {
  needCodes: string[];
  mapping: Record<string, string>;
  ram: () => StagingDigest;
}): Promise<{ verdict: string; lines: string[] }> {
  const digest = digestOf(Object.keys(options.mapping));
  const lines: string[] = [];
  const sinks = [
    vi.spyOn(console, "log").mockImplementation((m: unknown) => { lines.push(String(m)); }),
    vi.spyOn(console, "warn").mockImplementation((m: unknown) => { lines.push(String(m)); }),
  ];
  try {
    const verdict = await tryEpisodeMapping({
      sandbox: SANDBOX,
      model: mappingModel(options.mapping),
      digest,
      seasons: [11],
      targetTitle: "明星大侦探",
      needCodes: options.needCodes,
      ram: options.ram,
      onDigest: () => {},
      onProgress: undefined,
    });
    return { verdict, lines };
  } finally {
    for (const s of sinks) s.mockRestore();
  }
}

describe("episodeMappingCounts — 只把本季 need 里的映射算「识别出」", () => {
  it("splits in-scope from off-scope (a pack spanning many seasons)", () => {
    // 线上原案:AI 把整包(横跨 S01–S10)映射了 23 条,本次只要 S11。
    const clean = { "01.mp4": "S01E01", "02.mp4": "S07E03", "03.mp4": "S11E01", "04.mp4": "S11E02" };
    expect(episodeMappingCounts(clean, ["S11E01", "S11E02"])).toEqual({ inScope: 2, offScope: 2 });
  });

  it("counts nothing in scope when every mapping belongs to another season", () => {
    expect(episodeMappingCounts({ "01.mp4": "S01E01" }, ["S11E01"])).toEqual({ inScope: 0, offScope: 1 });
  });

  it("is empty for an empty mapping", () => {
    expect(episodeMappingCounts({}, ["S11E01"])).toEqual({ inScope: 0, offScope: 0 });
  });
});

describe("集数映射 文案 — 不再出现「识别出 N 集,还有 N 集没认出来」的自相矛盾", () => {
  it("fail 分支:只报本季命中,越季的单独说明", async () => {
    const { verdict, lines } = await runMapping({
      needCodes: ["S11E01", "S11E02"],
      // 3 条映射里只有 1 条落在本季(S01E01/S01E02 是别的季的映射)
      mapping: { "01.mp4": "S01E01", "02.mp4": "S01E02", "03.mp4": "S11E01" },
      ram: () => ({ ...digestOf(["01.mp4", "02.mp4", "03.mp4"]), passes: false, missingCodes: ["S11E02"] }),
    });

    expect(verdict).toBe("failed");
    const line = lines.find((l) => l.includes("集数映射:"))!;
    expect(line).toContain("AI 识别出 1 集");
    expect(line).toContain("另 2 集不属于本季(不计)");
    expect(line).toContain("还有 1 集没认出来");
    // 本季命中 + 仍缺 ≤ 本季需求 —— 两个数不再自相矛盾
    expect(line).not.toContain("AI 识别出 3 集");
  });

  it("fail 分支:没有越季映射时不加多余说明", async () => {
    const { lines } = await runMapping({
      needCodes: ["S11E01", "S11E02"],
      mapping: { "01.mp4": "S11E01" },
      ram: () => ({ ...digestOf(["01.mp4"]), passes: false, missingCodes: ["S11E02"] }),
    });

    const line = lines.find((l) => l.includes("集数映射:"))!;
    expect(line).toContain("AI 识别出 1 集,还有 1 集没认出来");
    expect(line).not.toContain("不属于本季");
  });

  it("pass 分支:同样只算本季命中", async () => {
    const { verdict, lines } = await runMapping({
      needCodes: ["S11E01", "S11E02"],
      mapping: { "01.mp4": "S01E01", "02.mp4": "S11E01", "03.mp4": "S11E02" },
      ram: () => ({ ...digestOf(["01.mp4", "02.mp4", "03.mp4"]), passes: true, missingCodes: [] }),
    });

    expect(verdict).toBe("passed");
    const line = lines.find((l) => l.includes("集数映射:"))!;
    expect(line).toContain("AI 识别出 2 集,另 1 集不属于本季(不计),目标集数已齐");
  });
});
