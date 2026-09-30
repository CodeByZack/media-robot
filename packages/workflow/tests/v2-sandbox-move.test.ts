import { describe, expect, it } from "vitest";
import { TaskSandbox } from "../src/acquisition-v2/sandbox.js";
import { FakeResourceProviderV2 } from "../src/acquisition-v2/fake-provider.js";
import { Storage115Simulator } from "../src/acquisition-v2/storage-115-simulator.js";

async function setup() {
  const provider = new FakeResourceProviderV2({
    results: { show: [{ id: "cand_full", title: "Show 全集" }] },
  });
  const storage = new Storage115Simulator({
    packs: { cand_full: { files: Array.from({ length: 3 }, (_, i) => ({ path: `Pack/Show - 0${i + 1}.mkv`, sizeBytes: 1 })) } },
  });
  const stagingDirectoryId = await storage.createDirectory({ name: "staging", parentId: "root" });
  const targetSeasonDirectoryId = await storage.createDirectory({ name: "Season 1", parentId: "root" });
  const sandbox = new TaskSandbox({ provider, storage, stagingDirectoryId, targetSeasonDirectoryIds: { 1: targetSeasonDirectoryId }, recheckDelayMs: 0 });
  return { sandbox };
}

describe("TaskSandbox — moveToSeason (agent-driven extract, scoped, reread)", () => {
  it("moves agent-selected staging files into the scoped season dir and rereads both", async () => {
    const { sandbox } = await setup();
    const search = await sandbox.searchResources("show");
    const transfer = await sandbox.transferCandidate({ snapshotId: search.snapshot!.id, candidateId: "cand_full" });
    const videoIds = transfer.staging.filter((file) => file.isVideo).map((file) => file.id);

    const result = await sandbox.moveToSeason({ moves: [{ season: 1, fileIds: videoIds }] });

    // The episodes are now directly in Season 1 (extracted out of the pack dir);
    // staging no longer holds them.
    expect(result.seasons[1]!.filter((file) => file.isVideo)).toHaveLength(3);
    expect(result.staging.filter((file) => file.isVideo)).toHaveLength(0);
  });

  it("SKIPS a file that is not in this task's staging（scope guard 仍成立：绝不搬本目录外的东西）", async () => {
    // 2026-09-30 语义修正：守卫保证"只搬本 staging 里确实在的"，但"不在"不再升级成
    // 整轮 failed（夸克索引滞后 2~6s 会让刚转存的文件一次读不到）。
    const { sandbox } = await setup();
    const result = await sandbox.moveToSeason({ moves: [{ season: 1, fileIds: ["not_in_staging"] }] });
    expect(result.seasons[1] ?? []).toEqual([]);
  });

  it("moves the ones that ARE there and skips the ones that are not（混合场景）", async () => {
    const { sandbox } = await setup();
    const search = await sandbox.searchResources("show");
    const transfer = await sandbox.transferCandidate({ snapshotId: search.snapshot!.id, candidateId: "cand_full" });
    const videoIds = transfer.staging.filter((file) => file.isVideo).map((file) => file.id);

    const result = await sandbox.moveToSeason({
      moves: [{ season: 1, fileIds: [...videoIds, "not_in_staging"] }],
    });

    expect(result.seasons[1]!.filter((file) => file.isVideo)).toHaveLength(3);
  });
});
