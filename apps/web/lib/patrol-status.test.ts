import { describe, expect, it } from "vitest";
import { nextSweepSlot, patrolStatusLine } from "./patrol-status";

describe("nextSweepSlot", () => {
  it("取第一个晚于当前时刻的班次", () => {
    expect(nextSweepSlot(["06:00", "12:00", "20:00"], "07:30")).toBe("12:00");
  });

  it("正好到点时取下一班（该班次已在跑，不该报成本班次）", () => {
    expect(nextSweepSlot(["06:00", "12:00", "20:00"], "12:00")).toBe("20:00");
  });

  it("当天班次都过了就回绕到次日第一班", () => {
    expect(nextSweepSlot(["06:00", "12:00", "20:00"], "23:59")).toBe("06:00");
  });

  it("单班次时任何时刻都返回它", () => {
    expect(nextSweepSlot(["06:00"], "06:00")).toBe("06:00");
    expect(nextSweepSlot(["06:00"], "05:59")).toBe("06:00");
  });

  it("忽略非法时间点", () => {
    expect(nextSweepSlot(["99:99", "07:00", "abc"], "06:00")).toBe("07:00");
  });

  it("无有效时间点返回 null", () => {
    expect(nextSweepSlot([], "06:00")).toBeNull();
    expect(nextSweepSlot(["nope"], "06:00")).toBeNull();
  });

  it("乱序输入也能得到正确结果", () => {
    expect(nextSweepSlot(["20:00", "06:00", "12:00"], "07:30")).toBe("12:00");
  });
});

describe("patrolStatusLine", () => {
  it("给出 headline 与等宽的 next 时间", () => {
    expect(patrolStatusLine(["06:00", "12:00"], "07:30")).toEqual({
      headline: "巡检运行中",
      detail: "下次 12:00",
    });
  });

  it("无有效班次时不显示状态行（返回 null，而非编造文案）", () => {
    expect(patrolStatusLine([], "06:00")).toBeNull();
  });

  it("当前时刻非法时返回 null（宁可不出，也不显示错的时间）", () => {
    expect(patrolStatusLine(["06:00"], "25:00")).toBeNull();
    expect(patrolStatusLine(["06:00"], "")).toBeNull();
  });
});
