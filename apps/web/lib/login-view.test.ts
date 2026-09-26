import { describe, expect, it } from "vitest";
import {
  bootstrapAfterRejection,
  resolveLoginView,
  type BootstrapStatus,
} from "./login-view";

describe("resolveLoginView", () => {
  it("只在明确读到「未设密码」时才给设置表单", () => {
    const view = resolveLoginView({ status: "ready", passwordSet: false });
    expect(view.kind).toBe("setup");
    expect(view.buttonText).toBe("设置密码并进入");
    expect(view.title).toBe("设置访问密码");
    // 首次设密码不能被密码管理器当「当前密码」自动填。
    expect(view.autoComplete).toBe("new-password");
    expect(view.note).toContain("还没有设置访问密码");
  });

  it("读到「已设密码」时给登录表单，并说明局域网免登录", () => {
    const view = resolveLoginView({ status: "ready", passwordSet: true });
    expect(view.kind).toBe("login");
    expect(view.buttonText).toBe("进入");
    expect(view.autoComplete).toBe("current-password");
    expect(view.note).toContain("已设置访问密码");
    expect(view.note).toContain("局域网内无需登录");
  });

  /**
   * 这条是本模块存在的理由 —— 2026-09-26 事故的回归钉子。
   *
   * 事故：bootstrap 被静态预渲染冻结成「已设密码」，而登录接口读到真实状态是「未设」，
   * 同一屏出现「已设置访问密码」+「未设置访问密码」两句互相打脸的话。
   * 只要「读不到状态」时文案保持不确定，那一屏就不可能再出现。
   */
  it("读不到状态时绝不替实例断言有没有密码（事故回归）", () => {
    const states: BootstrapStatus[] = [
      { status: "ready", passwordSet: "unknown" },
      { status: "loading" },
      { status: "failed" },
    ];

    for (const state of states) {
      const view = resolveLoginView(state);
      expect(view.kind).toBe("login");
      // 两句断言句都不许出现。
      expect(view.note).not.toContain("已设置访问密码");
      expect(view.note).not.toContain("未设置访问密码");
      // 也不能落到设置表单（那会让远程匿名访客提交一个服务端必然拒绝的表单）。
      expect(view.buttonText).not.toBe("设置密码并进入");
    }
  });

  it("加载中与请求失败的措辞不同（失败要能引导重试）", () => {
    const loading = resolveLoginView({ status: "loading" });
    const failed = resolveLoginView({ status: "failed" });
    expect(loading.note).not.toBe(failed.note);
    expect(loading.note).toContain("正在检查");
    expect(failed.note).toContain("重新检查");
  });
});

describe("bootstrapAfterRejection", () => {
  it("登录被拒以 404（未设密码）时翻成设置表单", () => {
    expect(bootstrapAfterRejection(404)).toEqual({ status: "ready", passwordSet: false });
  });

  it("其它状态码不动状态（401 密码错、500 故障等）", () => {
    for (const status of [400, 401, 403, 429, 500]) {
      expect(bootstrapAfterRejection(status)).toBeNull();
    }
  });
});
