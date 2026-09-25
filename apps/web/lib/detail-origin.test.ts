import { describe, expect, it } from "vitest";
import { isDetailHref, isUsableOrigin, originPathname, shouldRestoreScroll } from "./detail-origin";

describe("isUsableOrigin", () => {
  it("接受站内相对路径（含 query）", () => {
    expect(isUsableOrigin("/library")).toBe(true);
    expect(isUsableOrigin("/library?type=tv&filter=all")).toBe(true);
    expect(isUsableOrigin("/?q=%E6%80%AA%E7%89%A9")).toBe(true);
  });

  it("挡掉协议相对 / 绝对 URL — 不能让外部输入决定跳转目标", () => {
    // `//evil.com` 是协议相对 URL，`router.replace` 会真的跳出去
    expect(isUsableOrigin("//evil.com")).toBe(false);
    expect(isUsableOrigin("https://evil.com")).toBe(false);
    expect(isUsableOrigin("javascript:alert(1)")).toBe(false);
  });

  it("挡掉空值与非字符串", () => {
    expect(isUsableOrigin("")).toBe(false);
    expect(isUsableOrigin(null)).toBe(false);
    expect(isUsableOrigin(undefined)).toBe(false);
  });

  it("挡掉不以 / 开头的相对路径（避免相对当前路由拼接的不确定行为）", () => {
    expect(isUsableOrigin("library")).toBe(false);
    expect(isUsableOrigin("./library")).toBe(false);
  });
});

describe("isDetailHref", () => {
  it("认得详情页链接", () => {
    expect(isDetailHref("/show/1108427")).toBe(true);
    expect(isDetailHref("/show/1108427?from=library&t=movie")).toBe(true);
  });

  it("不认别的站内链接", () => {
    expect(isDetailHref("/library")).toBe(false);
    expect(isDetailHref("/library?type=tv")).toBe(false);
    // 前缀相近但不是详情页
    expect(isDetailHref("/shows")).toBe(false);
    expect(isDetailHref("/showcase/1")).toBe(false);
  });

  it("挡掉空值", () => {
    expect(isDetailHref(null)).toBe(false);
    expect(isDetailHref(undefined)).toBe(false);
    expect(isDetailHref("")).toBe(false);
  });
});

describe("originPathname", () => {
  it("丢掉 query，只留路径", () => {
    expect(originPathname("/library?type=tv&filter=all")).toBe("/library");
    expect(originPathname("/?q=%E6%80%AA%E7%89%A9")).toBe("/");
    expect(originPathname("/library")).toBe("/library");
  });

  it("路径里的 / 不受影响（只切第一个 ?）", () => {
    expect(originPathname("/show/30981?from=library")).toBe("/show/30981");
  });
});

describe("shouldRestoreScroll", () => {
  it("当前页正是当初点进详情页的那一页 → 恢复", () => {
    expect(
      shouldRestoreScroll({ pendingY: 482, originPath: "/library", currentPath: "/library" }),
    ).toBe(true);
  });

  it("路径不同 → 不恢复", () => {
    // 点了海报、进了详情页，然后没返回而是去点「通知」—— 不能把媒体库的位置套上去
    expect(
      shouldRestoreScroll({ pendingY: 482, originPath: "/library", currentPath: "/notifications" }),
    ).toBe(false);
  });

  it("同路径不同 state 也算同一页（query 已被丢掉）", () => {
    // 记的是 /library?type=tv&filter=all，当前是 /library —— pathname 相同即认账
    expect(
      shouldRestoreScroll({ pendingY: 482, originPath: "/library", currentPath: "/library" }),
    ).toBe(true);
  });

  it("没有待恢复的位置 → 不恢复", () => {
    expect(
      shouldRestoreScroll({ pendingY: null, originPath: "/library", currentPath: "/library" }),
    ).toBe(false);
  });

  it("位置是 0 或负数 → 没什么可恢复的", () => {
    expect(
      shouldRestoreScroll({ pendingY: 0, originPath: "/library", currentPath: "/library" }),
    ).toBe(false);
    expect(
      shouldRestoreScroll({ pendingY: -5, originPath: "/library", currentPath: "/library" }),
    ).toBe(false);
  });

  it("没有来路记忆 → 不恢复", () => {
    expect(
      shouldRestoreScroll({ pendingY: 482, originPath: null, currentPath: "/library" }),
    ).toBe(false);
  });
});
