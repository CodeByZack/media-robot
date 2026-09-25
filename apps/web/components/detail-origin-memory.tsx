"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  isDetailHref,
  rememberDetailOrigin,
  rememberScrollY,
  restorePendingScroll,
} from "../lib/detail-origin";
import {
  posterKeyFromHref,
  posterPathFromSrc,
  setPendingPoster,
} from "../lib/poster-handoff";
import { posterTransitionName } from "../lib/poster-transition";

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
      // 连同滚动位置一起记 —— 返回用的是普通导航，浏览器不会自动恢复位置。
      rememberScrollY(window.scrollY);
      // 把这张海报交给详情页的骨架屏：冷启动时详情页先 suspend 到骨架，
      // 骨架带上名字才配得上对，形变才成立（见 lib/poster-handoff）。
      rememberPosterHandoff(href, anchor);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}

/**
 * 记下「这次要交给详情页骨架屏的海报」。**总是**写入（取不到时写 `null`）——
 * 否则上一次点击的海报会留在那里，被下一次导航误用成"串片"。
 *
 * 海报图可能不在被点的这个 `<a>` 里：搜索页的候选卡把「海报」和「标题」拆成了
 * 两个链接，点标题时锚点内没有 `img`。所以退一步到外层 `<article>` 里找。
 */
function rememberPosterHandoff(href: string, anchor: HTMLAnchorElement): void {
  const key = posterKeyFromHref(href);
  if (key === null) {
    setPendingPoster(null);
    return;
  }
  const img = anchor.querySelector("img") ?? anchor.closest("article")?.querySelector("img") ?? null;
  const posterPath = posterPathFromSrc(img?.getAttribute("src"));
  const name = posterTransitionName({ tmdbId: key.tmdbId, mediaType: key.mediaType });
  if (posterPath === null || name === null) {
    setPendingPoster(null);
    return;
  }
  setPendingPoster({ tmdbId: key.tmdbId, name, posterPath });
}

/**
 * 导航回列表页时把滚动位置放回去。
 *
 * 挂在 `(shell)/layout.tsx`，与 `DetailOriginMemory` 并列（后者记来路，这个消费滚动位置）。
 *
 * 三个约束，缺一个都会出问题：
 *
 *  1. **依赖 pathname，不能是空依赖**。layout 在导航时**不重新挂载**，空依赖的 effect
 *     只会在整个会话里跑一次 —— 实测就是这么静默失效的。订阅 pathname 让它在每次
 *     路由变化时都重跑。
 *  2. **用 `useLayoutEffect`**。必须早于浏览器抓 View Transition 的新快照，否则形变动画
 *     的目标位置按"未滚动"的布局算，页面随后被滚走，海报就悬在原地。layout effect 在
 *     同一个 commit 里跑（DOM 已换好、快照还没抓），正好。
 *  3. **不读渲染期的路由状态**。pathname 只进依赖数组；真正要比对的当前路径在 effect
 *     里从 `window.location` 读，所以不碰 layout 顶部那条「渲染期不能读 pathname」
 *     的限制（那条踩过 blocking-route）。
 */
export function ScrollRestore() {
  const pathname = usePathname();
  // `useLayoutEffect` 在服务端渲染时会告警，用同构别名换成 `useEffect`（服务端它本来
  // 也不执行，换掉只是消掉噪音）。客户端留在 layout effect —— 时序要求见上。
  const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

  useIsomorphicLayoutEffect(() => {
    restorePendingScroll();
  }, [pathname]);

  return null;
}
