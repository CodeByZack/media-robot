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
 * 为什么不用 `router.back()` 一条道走到黑：它走 popstate，而 **popstate + 跨路由**
 * 不触发过渡（实测 0 次；popstate + 同路由会触发）。这是 Next `onPopState` 走
 * `startTransition` 的窗口太小所致，详见 DESIGN.md 的四象限表。
 * ⚠️ 已知取舍：走 replace 会把详情页这条历史记录盖掉，所以**浏览器自带的后退按钮**
 * 在这个页面依旧没有过渡（那是 popstate 路径，改不动）—— 本组件只解决应用内的返回。
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
      router.replace(origin);
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
