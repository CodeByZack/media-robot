import { describe, expect, it } from "vitest";
import { TaskSandbox } from "../src/acquisition-v2/sandbox.js";
import { FakeResourceProviderV2 } from "../src/acquisition-v2/fake-provider.js";
import { Storage115Simulator } from "../src/acquisition-v2/storage-115-simulator.js";
import { finalizeFromPending } from "../src/acquisition-v2/finalize-landing.js";

async function setup() {
  const provider = new FakeResourceProviderV2({ results: { show: [] } });
  const storage = new Storage115Simulator({ packs: {} });
  const stagingDirectoryId = await storage.createDirectory({ name: "staging", parentId: "root" });
  const pendingDirectoryId = await storage.createDirectory({ name: "pending", parentId: "root" });
  const targetSeasonDirectoryId = await storage.createDirectory({ name: "Season 1", parentId: "root" });
  const sandbox = new TaskSandbox({
    provider,
    storage,
    stagingDirectoryId,
    pendingDirectoryId,
    targetSeasonDirectoryIds: { 1: targetSeasonDirectoryId },
    recheckDelayMs: 0, // 测试里不等那 1.5s 的滞后窗口
  });
  return { sandbox, storage, stagingDirectoryId };
}

async function landFile(storage: Storage115Simulator, stagingDirectoryId: string, filename: string) {
  const [id] = (await storage.transferSubtitleUrl({
    url: "http://x/file",
    filename,
    intoDirectoryId: stagingDirectoryId,
  })).materializedFileIds;
  return id!;
}

describe("TaskSandbox — pending tools", () => {
  it("inspectPending returns empty when nothing has been moved", async () => {
    const { sandbox } = await setup();
    const tree = await sandbox.inspectPending();
    expect(tree).toEqual([]);
  });

  it("moveToPending moves a video from staging to pending", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const videoId = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    await sandbox.moveToPending({
      moves: [{ fileId: videoId, newName: "Show.S01E01.mkv" }],
    });

    const pending = await sandbox.inspectPending();
    expect(pending.map((f) => f.path)).toEqual(["Show.S01E01.mkv"]);

    const staging = await sandbox.inspectStaging();
    expect(staging).toEqual([]);
  });

  it("moveToPending moves video + subtitle together", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const videoId = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    const subId = await landFile(storage, stagingDirectoryId, "show.srt");
    await sandbox.moveToPending({
      moves: [{ fileId: videoId, newName: "Show.S01E01.mkv", subtitleFileIds: [subId] }],
    });

    const pending = await sandbox.inspectPending();
    expect(pending.map((f) => f.path).sort()).toEqual(["Show.S01E01.mkv", "show.srt"]);
  });

  it("moveToPending SKIPS files not in staging instead of throwing（2026-09-30 语义修正）", async () => {
    // 守卫的职责是「只动目录里确实在的」，不是「你要动的必须全在」——后者会把一次正常的
    // 索引滞后（夸克 2~6s）升级成整轮 failed（云雀叫天录就是这么死的）。缺的跳过，
    // 少搬了几集由 run 末对账如实报缺集。
    const { sandbox } = await setup();
    await expect(sandbox.moveToPending({ moves: [{ fileId: "nonexistent" }] })).resolves.toEqual({
      moved: [],
    });
  });

  it("moveToPending 批量搬 + 如实回报 moved（2026-09-30 去掉每次搬完的两趟全树遍历）", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const v1 = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    const v2 = await landFile(storage, stagingDirectoryId, "Show - 02.mkv");
    const result = await sandbox.moveToPending({
      moves: [
        { fileId: v1, newName: "Show.S01E01.mkv" },
        { fileId: v2, newName: "Show.S01E02.mkv" },
        { fileId: "ghost" },
      ],
    });

    // moved 只含真正搬了的 id（ghost 跳过）——调用方据此判断哪一集没搬成，
    // 不必再自己回读一遍 pending/staging。
    expect(result.moved.sort()).toEqual([v1, v2].sort());
    expect((await sandbox.inspectPending()).map((f) => f.path).sort()).toEqual([
      "Show.S01E01.mkv",
      "Show.S01E02.mkv",
    ]);
    expect(await sandbox.inspectStaging()).toEqual([]);
  });

  it("moveToPending survives a lagging first listing（重读确认救回，而不是跳过）", async () => {
    const { storage, stagingDirectoryId } = await setup();
    const videoId = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    // 第一次列目录故意漏掉它、第二次才读到 —— 模拟夸克异步 move 后的索引滞后。
    let reads = 0;
    const lagging = new Proxy(storage, {
      get(target, prop, recv) {
        if (prop !== "listTree") return Reflect.get(target, prop, recv);
        return async (input: { directoryId: string }) => {
          const tree = await (target as Storage115Simulator).listTree(input);
          if (input.directoryId !== stagingDirectoryId) return tree;
          reads += 1;
          return reads === 1 ? tree.filter((f) => f.id !== videoId) : tree;
        };
      },
    }) as Storage115Simulator;
    const sandbox = new TaskSandbox({
      provider: new FakeResourceProviderV2({ results: { show: [] } }),
      storage: lagging,
      stagingDirectoryId,
      pendingDirectoryId: await lagging.createDirectory({ name: "pending2", parentId: "root" }),
      targetSeasonDirectoryIds: { 1: await lagging.createDirectory({ name: "Season 1b", parentId: "root" }) },
      recheckDelayMs: 0,
    });

    await sandbox.moveToPending({ moves: [{ fileId: videoId, newName: "Show.S01E01.mkv" }] });

    expect((await sandbox.inspectPending()).map((f) => f.path)).toEqual(["Show.S01E01.mkv"]);
  });

  it("deleteFromPending removes files from pending", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const videoId = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    await sandbox.moveToPending({
      moves: [{ fileId: videoId, newName: "Show.S01E01.mkv" }],
    });

    const pending = await sandbox.inspectPending();
    const pendingFile = pending[0]!;
    const result = await sandbox.deleteFromPending({ fileIds: [pendingFile.id] });

    expect(result.deleted).toEqual([pendingFile.id]);
    expect(result.pending).toEqual([]);
  });

  it("deleteFromPending SKIPS files not in pending（对删来说「不在」就是目标已达成）", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const videoId = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    await sandbox.moveToPending({ moves: [{ fileId: videoId, newName: "Show.S01E01.mkv" }] });
    const kept = (await sandbox.inspectPending())[0]!.id;

    const result = await sandbox.deleteFromPending({ fileIds: [kept, "nonexistent"] });

    expect(result.deleted).toEqual([kept]);
    expect(result.pending).toEqual([]);
  });

  it("renameInPending renames a file in pending", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const videoId = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    await sandbox.moveToPending({
      moves: [{ fileId: videoId, newName: "Show.S01E01.mkv" }],
    });

    const pending = await sandbox.inspectPending();
    const result = await sandbox.renameInPending({
      renames: [{ fileId: pending[0]!.id, newName: "Show.S01E02.mkv" }],
    });

    expect(result.renamed.length).toBe(1);
    const updated = await sandbox.inspectPending();
    expect(updated.map((f) => f.path)).toEqual(["Show.S01E02.mkv"]);
  });

  it("renameInPending rejects empty renames", async () => {
    const { sandbox } = await setup();
    await expect(
      sandbox.renameInPending({ renames: [] }),
    ).rejects.toThrow("SANDBOX_EMPTY_RENAMES");
  });

  it("moveToSeasonFromPending moves files from pending to season directory", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const videoId = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    await sandbox.moveToPending({
      moves: [{ fileId: videoId, newName: "Show.S01E01.mkv" }],
    });

    const pending = await sandbox.inspectPending();
    const result = await sandbox.moveToSeasonFromPending({
      moves: [{ season: 1, fileIds: [pending[0]!.id] }],
    });

    expect(result.seasons[1]!.map((f) => f.path)).toEqual(["Show.S01E01.mkv"]);
    expect(result.pending).toEqual([]);
  });

  it("moveToSeasonFromPending SKIPS files not in pending（明星大侦探就死在这个 throw 上）", async () => {
    const { sandbox } = await setup();
    const result = await sandbox.moveToSeasonFromPending({ moves: [{ season: 1, fileIds: ["nonexistent"] }] });
    expect(result.pending).toEqual([]);
  });

  it("moveToSeasonFromPending rejects when no season directory exists", async () => {
    const { sandbox } = await setup();
    await expect(
      sandbox.moveToSeasonFromPending({ moves: [{ season: 99, fileIds: ["x"] }] }),
    ).rejects.toThrow("SANDBOX_SEASON_REQUIRED");
  });
});

describe("finalizeFromPending", () => {
  it("finalizes entries from pending to season directories", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const videoId1 = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    const videoId2 = await landFile(storage, stagingDirectoryId, "Show - 02.mkv");
    await sandbox.moveToPending({
      moves: [
        { fileId: videoId1, newName: "Show - 01.mkv" },
        { fileId: videoId2, newName: "Show - 02.mkv" },
      ],
    });

    const result = await finalizeFromPending({
      sandbox,
      entries: [
        { code: "S01E01", fileId: videoId1 },
        { code: "S01E02", fileId: videoId2 },
      ],
      canonicalTitle: "Show",
      seasons: [1],
    });

    expect(result.marked).toEqual(["S01E01", "S01E02"]);
    expect(result.movedCount).toBe(2);
    expect(result.renamed.length).toBe(2);
    // ★ 2026-09-12:tv.ts 的 pending 收尾把本字段交给 UI 的 finalizeLanding.args.files
    // (活动页「原名 → 规范名」明细)。from 必须是 rename 前的 pending 原名,否则显示成
    // 「新名 → 新名」;修前 pending 路径只 stepLog 到 stdout,UI 恒为空。
    expect(result.renamedPairs).toEqual([
      { from: "Show - 01.mkv", to: "Show.S01E01.mkv" },
      { from: "Show - 02.mkv", to: "Show.S01E02.mkv" },
    ]);
    // Pending should be empty
    const pending = await sandbox.inspectPending();
    expect(pending).toEqual([]);
  });

  it("skips codes not in onlyCodes", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const videoId = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    await sandbox.moveToPending({
      moves: [{ fileId: videoId, newName: "Show - 01.mkv" }],
    });

    const result = await finalizeFromPending({
      sandbox,
      entries: [{ code: "S01E01", fileId: videoId }],
      canonicalTitle: "Show",
      seasons: [1],
      onlyCodes: ["S01E02"],
    });

    expect(result.marked).toEqual([]);
    expect(result.skippedNotNeeded).toContain("S01E01(not needed)");
  });

  it("skips codes in skipCodes", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const videoId = await landFile(storage, stagingDirectoryId, "Show - 01.mkv");
    await sandbox.moveToPending({
      moves: [{ fileId: videoId, newName: "Show - 01.mkv" }],
    });

    const result = await finalizeFromPending({
      sandbox,
      entries: [{ code: "S01E01", fileId: videoId }],
      canonicalTitle: "Show",
      seasons: [1],
      skipCodes: ["S01E01"],
    });

    expect(result.marked).toEqual([]);
    expect(result.skippedOnDisk).toContain("S01E01");
  });

  it("改名保留真实扩展名（此前一律写死 .mkv）", async () => {
    const { sandbox, storage, stagingDirectoryId } = await setup();
    const videoId = await landFile(storage, stagingDirectoryId, "01.mp4");
    await sandbox.moveToPending({ moves: [{ fileId: videoId, newName: "01.mp4" }] });

    const result = await finalizeFromPending({
      sandbox,
      entries: [{ code: "S01E01", fileId: videoId }],
      canonicalTitle: "Show",
      seasons: [1],
    });

    expect(result.renamedPairs).toEqual([{ from: "01.mp4", to: "Show.S01E01.mp4" }]);
    const landed = await sandbox.inspectTargetDir({ season: 1 });
    expect(landed.map((f) => f.path)).toEqual(["Show.S01E01.mp4"]);
  });
});
