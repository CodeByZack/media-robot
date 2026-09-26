import { describe, expect, it } from "vitest";
import { formatStars, repoUrl, starsLabel, REPO } from "./lib.mjs";

describe("REPO / repoUrl", () => {
  it("指向本仓库，不是被 fork 的上游", () => {
    expect(REPO).toBe("CodeByZack/media-robot");
    expect(REPO).not.toContain("fancydirty");
    expect(repoUrl()).toBe("https://github.com/CodeByZack/media-robot");
  });
});

describe("formatStars", () => {
  it("1000 以下原样显示", () => {
    expect(formatStars(0)).toBe("0");
    expect(formatStars(7)).toBe("7");
    expect(formatStars(999)).toBe("999");
  });

  it("1000 起折成 k，保留 1 位小数", () => {
    expect(formatStars(1000)).toBe("1k");
    expect(formatStars(1234)).toBe("1.2k");
    expect(formatStars(12800)).toBe("12.8k");
  });

  it("去掉多余的 .0（1000 → 1k，不是 1.0k）", () => {
    expect(formatStars(2000)).toBe("2k");
    expect(formatStars(10000)).toBe("10k");
  });

  it("小数按四舍五入进位", () => {
    expect(formatStars(1249)).toBe("1.2k");
    expect(formatStars(1250)).toBe("1.3k");
  });

  it("非法输入返回 null —— 宁可整块不显示，也不编数字", () => {
    expect(formatStars(NaN)).toBeNull();
    expect(formatStars(-1)).toBeNull();
    expect(formatStars(Infinity)).toBeNull();
    expect(formatStars(undefined)).toBeNull();
    expect(formatStars(null)).toBeNull();
    expect(formatStars("1234")).toBeNull();
  });
});

describe("starsLabel", () => {
  it("合法数字加星号", () => {
    expect(starsLabel(1234)).toBe("★ 1.2k");
    expect(starsLabel(6)).toBe("★ 6");
  });

  it("0 不显示 —— 真实的 0 也不显示（省略，不是编造）", () => {
    expect(starsLabel(0)).toBeNull();
  });

  it("非法数字返回 null（main.js 据此保持 hidden）", () => {
    expect(starsLabel(NaN)).toBeNull();
    expect(starsLabel(undefined)).toBeNull();
    expect(starsLabel(-3)).toBeNull();
  });
});
