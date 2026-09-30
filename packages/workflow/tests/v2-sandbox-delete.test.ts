import { describe, expect, it } from "vitest";
import { TaskSandbox } from "../src/acquisition-v2/sandbox.js";
import { FakeResourceProviderV2 } from "../src/acquisition-v2/fake-provider.js";
import { Storage115Simulator } from "../src/acquisition-v2/storage-115-simulator.js";

async function setup() {
  const provider = new FakeResourceProviderV2({
    results: { show: [{ id: "cand", title: "Show" }] },
  });
  const storage = new Storage115Simulator({
    packs: { cand: { files: [{ path: "a.mkv", sizeBytes: 1 }, { path: "b.mkv", sizeBytes: 1 }] } },
  });
  const stagingDirectoryId = await storage.createDirectory({ name: "staging", parentId: "root" });
  const targetSeasonDirectoryId = await storage.createDirectory({ name: "Season 1", parentId: "root" });
  const sandbox = new TaskSandbox({ provider, storage, stagingDirectoryId, targetSeasonDirectoryIds: { 1: targetSeasonDirectoryId }, recheckDelayMs: 0 });
  return { sandbox };
}

describe("TaskSandbox — deleteFiles (agent-decided dedup/residue, scoped, reread)", () => {
  it("deletes agent-chosen files in the season dir and rereads the result", async () => {
    const { sandbox } = await setup();
    const search = await sandbox.searchResources("show");
    const transfer = await sandbox.transferCandidate({ snapshotId: search.snapshot!.id, candidateId: "cand" });
    const moved = await sandbox.moveToSeason({ moves: [{ season: 1, fileIds: transfer.staging.map((f) => f.id) }] });
    const toDelete = moved.seasons[1]!.find((f) => f.path === "a.mkv")!.id;

    const result = await sandbox.deleteFiles({ directory: "season", fileIds: [toDelete], season: 1 });

    expect(result.directory.map((f) => f.path)).toEqual(["b.mkv"]);
  });

  it("SKIPS a file that is not in the named scoped directory（缺的跳过，不抛）", async () => {
    // 2026-09-30 语义修正：守卫只保证"不删本目录之外的东西"，"不在"不是违规。
    // 旧行为会把一次正常的索引滞后升级成整轮 failed（云雀叫天录删残留时）。
    const { sandbox } = await setup();
    const result = await sandbox.deleteFiles({ directory: "season", fileIds: ["ghost"], season: 1 });
    expect(result.deleted).toEqual([]);
  });

  it("deletes the ones that ARE there and skips the ones that already left（云雀叫天录那一步）", async () => {
    const { sandbox } = await setup();
    const search = await sandbox.searchResources("show");
    const transfer = await sandbox.transferCandidate({ snapshotId: search.snapshot!.id, candidateId: "cand" });
    const moved = await sandbox.moveToSeason({ moves: [{ season: 1, fileIds: transfer.staging.map((f) => f.id) }] });
    const stillThere = moved.seasons[1]!.find((f) => f.path === "b.mkv")!.id;

    // "a.mkv" 刚被搬走/已经不在（等价于滞后读不到），b.mkv 还在 → 只删 b，不抛。
    const result = await sandbox.deleteFiles({
      directory: "season",
      fileIds: ["left-already", stillThere],
      season: 1,
    });

    expect(result.deleted).toEqual([stillThere]);
    expect(result.directory.map((f) => f.path)).toEqual(["a.mkv"]);
  });
});
