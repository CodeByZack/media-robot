import { describe, expect, it } from "vitest";
import { getStorageBrand } from "@mediarobot/workflow";
import { BRAND_TILES } from "./brand-tiles";

/**
 * 契约测试：客户端品牌表的 mark 必须与 workflow 注册表逐字一致。
 *
 * 背景：`add-drive-brand-tabs.tsx` 是客户端组件，不能 import 注册表所在的 barrel
 * （`node:sqlite` 会进浏览器 chunk），所以那张表在客户端本地维护。本地维护的
 * 漂移风险由这个测试兜住 —— 盘卡与品牌行必须显示同一个字。
 */
describe("BRAND_TILES", () => {
  it("mark 与 workflow 注册表一致（盘卡与品牌行不能显示成两个不同的字）", () => {
    for (const tile of BRAND_TILES) {
      expect(getStorageBrand(tile.key).mark).toBe(tile.mark);
    }
  });

  it("每个 key 都已注册（本地表不能凭空多出 provider）", () => {
    for (const tile of BRAND_TILES) {
      expect(() => getStorageBrand(tile.key)).not.toThrow();
    }
  });

  it("mark 非空且不超过 3 字符（方牌是 24px 的小方块）", () => {
    for (const tile of BRAND_TILES) {
      expect(tile.mark.length).toBeGreaterThan(0);
      expect(tile.mark.length).toBeLessThanOrEqual(3);
    }
  });
});
