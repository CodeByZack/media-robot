import { describe, expect, it } from "vitest";
import { switcherItems } from "../src/index.js";

const drives = [
  { id: "csNew", label: null, providerUid: "100000002", createdAt: "2026-06-10T00:00:00.000Z", status: "active" as const },
  { id: "csOld", label: "我的主号", providerUid: "100000001", createdAt: "2026-06-01T00:00:00.000Z", status: "active" as const },
];

describe("switcherItems", () => {
  // 盘不再进 URL（当前盘存在 cookie 里），所以 tab 上**没有 href** —— 五个页面对
  // 所有盘都是同一个路径，切盘是写 cookie 而不是导航到另一个地址。这正是旧实现里
  // switcherTabHref 存在的唯一理由，它随这次改动一起消失了。
  it("不再产出 href（路径与盘无关）", () => {
    const items = switcherItems(drives, "csOld");
    expect(items.every((i) => !("href" in i))).toBe(true);
  });

  it("传入的当前盘被标为 active", () => {
    expect(switcherItems(drives, "csNew").find((i) => i.isActive)?.id).toBe("csNew");
    expect(switcherItems(drives, "csOld").find((i) => i.isActive)?.id).toBe("csOld");
  });

  it("当前盘为 null（无 cookie / 未拥有）时回退到最早创建的那块", () => {
    expect(switcherItems(drives, null).find((i) => i.isActive)?.id).toBe("csOld");
  });

  it("当前盘不属于本账号时也回退到主盘（不做 404）", () => {
    expect(switcherItems(drives, "cs_ghost").find((i) => i.isActive)?.id).toBe("csOld");
  });

  it("carries provider through to the output item", () => {
    const withProvider = [
      { id: "csOld", label: "主号", provider: "pan115", providerUid: "100000001", createdAt: "2026-06-01T00:00:00.000Z", status: "active" as const },
      { id: "csNew", label: null, provider: "quark", providerUid: "100000002", createdAt: "2026-06-10T00:00:00.000Z", status: "active" as const },
    ];
    const items = switcherItems(withProvider, "csOld");
    expect(items.map((i) => i.provider)).toEqual(["pan115", "quark"]);
  });

  it("label 缺省时用品牌名 + uid 尾 4 位", () => {
    const withProvider = [
      { id: "csNew", label: null, provider: "quark", providerUid: "AATPyrbqA0JT", createdAt: "2026-06-10T00:00:00.000Z", status: "active" as const },
    ];
    expect(switcherItems(withProvider, "csNew")[0]!.label).toBe("夸克网盘 …A0JT");
  });

  it("frozen 状态透传", () => {
    const mixed = [
      { id: "csOld", label: "主号", providerUid: "100000001", createdAt: "2026-06-01T00:00:00.000Z", status: "frozen" as const },
    ];
    expect(switcherItems(mixed, "csOld")[0]!.frozen).toBe(true);
  });
});
