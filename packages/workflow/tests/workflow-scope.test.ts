import { describe, expect, it } from "vitest";
import { DEFAULT_ACCOUNT_ID } from "../src/domain.js";
import {
  scopeFromAccount,
  showHref,
  type WorkflowScope,
} from "../src/workflow-scope.js";

describe("WorkflowScope", () => {
  it("scopeFromAccount fills account + storage", () => {
    const s: WorkflowScope = scopeFromAccount(DEFAULT_ACCOUNT_ID, "cs_1");
    expect(s).toEqual({ accountId: DEFAULT_ACCOUNT_ID, connectedStorageId: "cs_1" });
  });
  it("scopeFromAccount allows null storage (pre-migration / unscoped reads)", () => {
    expect(scopeFromAccount(DEFAULT_ACCOUNT_ID, null)).toEqual({
      accountId: DEFAULT_ACCOUNT_ID,
      connectedStorageId: null,
    });
  });
});






describe("showHref", () => {
  // 盘不再进 URL（cookie 决定当前盘），所以链接**只有** from 和 type 提示。
  it("只带 from，不带盘", () => {
    expect(showHref(278, "library")).toBe("/show/278?from=library");
    expect(showHref(278, "search")).toBe("/show/278?from=search");
  });
  it("带 &t= 类型提示，让未追踪的标题落在正确的 TMDB 命名空间（movie≠tv 同号）", () => {
    expect(showHref(278, "search", "movie")).toBe("/show/278?from=search&t=movie");
    expect(showHref(1399, "search", "tv")).toBe("/show/1399?from=search&t=tv");
    expect(showHref(123, "library", "anime")).toBe("/show/123?from=library&t=anime");
  });
});
