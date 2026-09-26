"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lastQueryKeyForDrive } from "../lib/drive-cookie";

export interface WorkspaceTab {
  id: string;
  label: string;
  /** 文字方牌的字符（115 / 夸 / 鸭 / 翼 / 123）。**由服务端 loader 从注册表取好
   *  传下来** —— 本组件是客户端组件，不能去读 workflow 的 barrel。 */
  mark: string;
  /** 服务端已按 cookie 判定好的当前盘（不再靠客户端从 pathname 猜）。 */
  isActive: boolean;
  frozen: boolean;
}

/**
 * 侧栏顶部网盘切换器（≥2 盘才显示）。
 *
 * **切盘不再产生 URL 差异** —— 五个页面对所有盘都是同一个路径，所以旧实现里那套
 * 「你现在在哪个功能区 + 目标盘 → 目标 URL」（workflow 的 switcherTabHref）整个消失了。
 * 现在只需两步：
 *   1. POST /api/workspace 种下当前盘 cookie（服务端会校验归属）
 *   2. router.push + router.refresh() 让服务端用新盘重渲染
 *
 * 因为 URL 形态不变，页面**不会卸载** —— 侧栏、导航、滚动位置都保持原位。
 *
 * 用原生 <details> 下拉（SSR 友好、无第三方依赖）。
 */
export function WorkspaceSwitcher({ tabs }: { tabs: WorkspaceTab[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  /** 切盘失败的原因。**必须有** —— 见下方 switchTo 里的注释。 */
  const [error, setError] = useState<string | null>(null);
  // 当前盘（服务端按 cookie 算出来的）。钩子必须在提前 return 之前调用，所以
  // 这里先算出一个可空值。
  const activeId = tabs.find((tab) => tab.isActive)?.id ?? null;

  // 切换完成 = 服务端下发了新的当前盘。此时清掉"切换中"——**不能在 switchTo 里清**：
  // 切盘后页面不卸载（同路由 + refresh），组件实例保留，过早清除会让提示闪一下就没了；
  // 而如果只在成功分支清，失败后又清不到（原来就是这个 bug：提示永久卡住）。
  useEffect(() => {
    setSwitchingTo(null);
  }, [activeId]);

  if (tabs.length < 2) {
    return null;
  }
  const current = tabs.find((tab) => tab.isActive) ?? tabs[0]!;

  const switchTo = async (driveId: string) => {
    // 守卫要同时看**两段飞行期**：
    //   switchingTo ≠ null —— POST 在路上（`pending` 这时还是 false，见下）
    //   pending           —— POST 已回来、router.refresh() 还在跑
    // 只看 pending 不够：它要等 startTransition 才变 true，而那是 `await fetch`
    // 之后的事 —— 请求在路上时它仍是 false，连点会发出第二个 POST，
    // 两次写 cookie 谁赢不确定。
    if (driveId === current.id || switchingTo !== null || pending) {
      return;
    }
    setError(null);
    setSwitchingTo(driveId);
    let ok = false;
    let failure = "";
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ driveId }),
      });
      ok = res.ok;
      if (!ok) {
        // 路由会给出有意义的错误体（400 `driveId required` / 403 `unknown drive`），
        // 原样带给用户。以前这里只是 return，等于把错误吞掉 —— 那正是这个组件
        // 注释里说要避免的「点了没反应」。
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        failure = typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
      }
    } catch {
      ok = false;
      failure = "网络请求失败";
    }
    if (!ok) {
      setSwitchingTo(null);
      setError(failure);
      return;
    }
    // 回到搜索区并恢复**那块盘自己**的搜索词（与旧行为一致：切盘保持在同一功能区，
    // 搜索区额外恢复记忆 query）。
    let remembered = "";
    try {
      remembered = sessionStorage.getItem(lastQueryKeyForDrive(driveId)) ?? "";
    } catch {
      remembered = "";
    }
    startTransition(() => {
      router.push(remembered ? `/?q=${encodeURIComponent(remembered)}` : "/");
      router.refresh();
    });
  };

  return (
    <details className="workspace-switcher">
      <summary className="ws-current" aria-label="切换网盘工作区">
        <span className="drive-mark ws-mark" aria-hidden>
          {current.mark}
        </span>
        <span className="ws-label">{current.label}</span>
        {current.frozen ? (
          <span className="ws-frozen" aria-label="掉线">
            ⚠
          </span>
        ) : null}
        <span className="ws-caret" aria-hidden>
          ⌄
        </span>
      </summary>
      <nav className="ws-menu" aria-label="网盘工作区">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={tab.frozen}
            className={`ws-tab${tab.isActive ? " is-active" : ""}${tab.frozen ? " is-frozen" : ""}`}
            title={tab.frozen ? `${tab.label}（网盘掉线，去设置重新绑定）` : tab.label}
            aria-current={tab.isActive ? "true" : undefined}
            onClick={() => void switchTo(tab.id)}
          >
            <span className="drive-mark ws-mark" aria-hidden>
              {tab.mark}
            </span>
            <span className="ws-label">{tab.label}</span>
            {switchingTo === tab.id ? <span className="ws-pending">切换中…</span> : null}
            {tab.frozen ? (
              <span className="ws-frozen" aria-label="掉线">
                ⚠
              </span>
            ) : null}
          </button>
        ))}
      </nav>
      {/* 失败必须看得见：这条不渲染的话，用户看到的就是「点了没反应」。 */}
      {error !== null ? (
        <p className="ws-error" role="alert">
          切换失败：{error}
        </p>
      ) : null}
    </details>
  );
}
