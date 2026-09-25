"use client";

import { useEffect } from "react";
import { isDetailHref, rememberDetailOrigin } from "../lib/detail-origin";

/**
 * 记录「点进详情页之前所在的那个 URL」。挂在 `(shell)/layout.tsx`，全局只此一处 ——
 * 卡片散落在媒体库 / 搜索 / 热门货架等多处，逐个接线早晚会漏。
 *
 * 为什么用 `click` 捕获监听而不是 `usePathname()`：外壳 layout 里**渲染期**读
 * pathname 会在 `/show/[tmdbId]`（组内唯一动态段）触发 blocking-route 报错（见
 * layout 顶部注释）。这里只挂监听、永远渲染 `null`，不碰渲染期路由状态，绕开了那个坑。
 * 用捕获阶段是为了在 Next 的导航处理之前读到**当前**URL。
 */
export function DetailOriginMemory() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href");
      if (!isDetailHref(href)) return;
      // 新标签页打开时当前页不导航，记了也不会被用到；但记下也无害（值仍然正确）。
      rememberDetailOrigin(window.location.pathname + window.location.search);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
