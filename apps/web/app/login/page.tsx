"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import {
  bootstrapAfterRejection,
  resolveLoginView,
  type BootstrapStatus,
} from "../../lib/login-view";

/**
 * 单用户登录 / 设置密码。
 *
 * 远程访问无条件需要 session。未设密码的实例远程会被挡在这里，
 * 页面上提供设置密码表单——设完密码再登录换取 session。
 *
 * ⚠️ 显示哪个表单、说哪句话由 `resolveLoginView`（`lib/login-view.ts`）决定 ——
 * 那里记录了一次真实事故：这个页面曾经替用户断言一个自己并不知道的状态。
 * 改动下面这三个状态时要一起读那段注释。
 */
export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [bootstrap, setBootstrap] = useState<BootstrapStatus>({ status: "loading" });

  /**
   * 读实例状态。用三态（loading / ready / failed），**不用** `null` 兼做“没拿到”——
   * 曾经把「没拿到」和「已设置」混为一谈，见 lib/login-view.ts 的事故记录。
   */
  const loadBootstrap = useCallback(() => {
    setBootstrap({ status: "loading" });
    fetch("/api/auth/bootstrap")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { passwordSet?: boolean | null }) => {
        setBootstrap({
          status: "ready",
          // null/undefined 都表示「服务端也读不出来」→ 交给文案保持不确定。
          passwordSet:
            data.passwordSet === undefined || data.passwordSet === null
              ? "unknown"
              : data.passwordSet,
        });
      })
      .catch(() => setBootstrap({ status: "failed" }));
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const view = resolveLoginView(bootstrap);
  const settingPassword = view.kind === "setup";

  /** 首次设置访问密码，然后立刻用它登录换 session，最后回媒体库。 */
  const submitNewPassword = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "设置失败，请重试。");
        return;
      }
      // 设完密码，远程这条路仍然需要 session：顺手登录，免得用户再输一次。
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      }).catch(() => undefined);
      window.location.href = "/";
    });
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      // 服务端实时状态说「这台实例未设密码」→ 页面手上的状态是旧的，就地翻成设置表单，
      // 别让用户对着一个提交不了的表单反复试。
      const next = bootstrapAfterRejection(res.status);
      if (next) setBootstrap(next);
      setError(body.error ?? "操作失败，请重试。");
    });
  };

  return (
    <main style={{ maxWidth: 360, margin: "14vh auto", padding: "0 20px" }}>
      <div className="panel" style={{ textAlign: "center" }}>
        <h1 className="panel-title" style={{ margin: "0 0 6px" }}>
          {view.title}
        </h1>
        <p className="panel-note" style={{ marginBottom: 20 }}>
          {view.note}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (settingPassword) {
              submitNewPassword();
            } else {
              submit();
            }
          }}
        >
          <div className="setting-row" style={{ marginBottom: 14 }}>
            <input
              type="password"
              className="setting-control"
              // ⚠️ 必须是 {password}。这里曾写成 value="password"（字面量字符串），
              // 于是输入框被钉死在 8 个字符上：永远显示 8 个圆点、用户根本打不进
              // 自己的密码，提交时发出去的还是被污染过的状态值。
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={view.placeholder}
              aria-label={settingPassword ? "设置访问密码" : "密码"}
              autoComplete={view.autoComplete}
            />
          </div>
          {error ? (
            <p className="panel-note" style={{ color: "var(--danger, #e5484d)", marginBottom: 12 }}>
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="primary-button"
            disabled={isPending}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {isPending ? <LoaderCircle size={14} className="spin" aria-hidden /> : view.buttonText}
          </button>
        </form>

        {bootstrap.status === "failed" ? (
          <button
            type="button"
            className="ghost-button"
            onClick={loadBootstrap}
            style={{ marginTop: 12, width: "100%" }}
          >
            重新检查
          </button>
        ) : null}
      </div>
    </main>
  );
}
