import { describe, expect, it } from "vitest";
import { isDetailHref, isUsableOrigin } from "./detail-origin";

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
