"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { readDetailOrigin } from "../lib/detail-origin";

/**
 * 回到用户真正来的那一页。
 *
 * 三条路，按优先级：
 *  1. **记住了来路** → `router.replace(来路)`。这是常态，两个好处一起拿到：
 *     完整状态不丢（媒体库的 type/filter、搜索页的 ?q= 都在来路 URL 里），而且
 *     普通导航**会触发 View Transition**（海报形变回去）。
 *  2. 没记住（直接输网址进来、或 storage 不可用）→ 退化成 `router.back()`：
 *     跨路由回退没有过渡，但至少回到正确的地方、状态也不丢。
 *  3. 也没有历史 → `push(fallbackHref)`。
 *
 * ⚠️ **这里不负责恢复滚动位置。** 曾经在这里调 `scheduleScrollRestore()`，但那一刻
 * 目标页还没渲染，函数看到的还是详情页的 DOM —— 于是它误判"页面就这么高"、把记忆
 * 清掉，等列表页真出现时已经没人再恢复它了。恢复动作现在归目标页自己：
 * `<ScrollRestore />`（挂在 `(shell)/layout.tsx`）在 layout effect 里消费记忆，
 * 既拿到正确的 DOM，也赶在 View Transition 抓新快照之前落地。
 */
export function BackLink({
  label = "返回",
  fallbackHref = "/",
}: {
  label?: string;
  fallbackHref?: string;
}) {
  const router = useRouter();

  const goBack = () => {
    const origin = readDetailOrigin();
    if (origin) {
      // scroll: false —— 不让 Next 先滚到顶部（会闪一下）。真正的恢复由 ScrollRestore 做。
      router.replace(origin, { scroll: false });
      return;
    }
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      className="back-link"
      type="button"
      onClick={goBack}
    >
      <ArrowLeft size={16} aria-hidden />
      {label}
    </button>
  );
}
