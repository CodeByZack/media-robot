import { describe, expect, it } from "vitest";
import { lockScope, releaseScope } from "./acquisition-lock-state";

describe("releaseScope", () => {
  it("持有者可以释放", () => {
    expect(releaseScope("season-2", "season-2")).toBeNull();
  });

  it("非持有者释放是空操作 —— 迟到的回调不该清掉别人刚上的锁", () => {
    // 用户先点了第 2 季，随即点了「获取所有季」；第 2 季的请求回调迟到
    expect(releaseScope("remaining", "season-2")).toBe("remaining");
  });

  it("无锁时释放保持无锁（返回同值 → React 跳过重渲染）", () => {
    expect(releaseScope(null, "season-2")).toBeNull();
  });
});

describe("lockScope", () => {
  it("上锁即持有", () => {
    expect(lockScope(null, "season-2")).toBe("season-2");
  });
});

describe("锁的完整生命周期", () => {
  it("上锁 → 释放 → 可再次上锁", () => {
    let s: string | null = null;
    s = lockScope(s, "season-1");
    expect(s).toBe("season-1");
    s = releaseScope(s, "season-1");
    expect(s).toBeNull();
    s = lockScope(s, "season-2");
    expect(s).toBe("season-2");
  });

  it("持有期间别人的释放请求不生效（护栏不被绕过）", () => {
    let s: string | null = lockScope(null, "season-1");
    s = releaseScope(s, "season-2");
    expect(s).toBe("season-1");
  });
});
