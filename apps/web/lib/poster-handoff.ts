/**
 * 「刚点的那张海报」—— 从列表页交到详情页**骨架屏**手上的一次性交接。
 *
 * 为什么需要它：详情页整体包在 `<Suspense>` 里（DB 还没读到就只能先给骨架），
 * 而形变的硬性要求是「**新旧两侧在同一个 commit 里都出现同名元素**」。冷启动时
 * React 提交的第一个版本是**骨架屏**，它上面没有海报 → 配不上对 → 那一路
 * **完全没有形变**（官方文档原话：*"If the destination suspends into a fallback
 * first, no pair forms"*）。
 *
 * 把被点那张卡的海报交给骨架屏，骨架屏就能带上同一个 `view-transition-name`；
 * 于是冷启动也形变成功，顺带让骨架从灰块变成真海报。
 *
 * ⚠️ **故意存在模块级变量里，不进 sessionStorage。** 它的寿命正好是「一次客户端
 * 导航」：点击时写入、目标页渲染骨架时读取。放进 storage 有两个坏处：
 *   ① 硬刷新后残留 → 骨架屏会显示上一部片子的海报；
 *   ② 还需要额外发明一套过期校验规则。
 * 模块级变量在服务端渲染时恒为 `null`（服务端不会有人点击），所以骨架的**首屏
 * HTML 仍是灰块**，客户端 hydration 也读到 `null` → 不会 hydration mismatch。
 */

export interface PendingPoster {
  /** 目标详情的 tmdb id —— 用来确认交接对象就是当前这条路由。 */
  tmdbId: number;
  /** 已经拼好的 view-transition-name（拼法见 lib/poster-transition）。 */
  name: string;
  /** TMDB 图片路径，形如 `/4Uk0Ma.jpg`。 */
  posterPath: string;
}

let pending: PendingPoster | null = null;

/** 点击卡片时写入；点的是非详情链接、或那条链接上找不到海报时传 `null` 清除。 */
export function setPendingPoster(value: PendingPoster | null): void {
  pending = value;
}

/**
 * 取交接对象。**必须**用 `tmdbId` 确认它就是当前这条路由 —— 否则会串片：
 * 点 A 进详情（交接 A）→ 返回 → 用浏览器前进/后退进 B 的详情页（走的是缓存之外
 * 的路径，没有点击事件）→ 骨架屏会拿 A 的海报顶上。
 */
export function pendingPosterFor(tmdbId: number): PendingPoster | null {
  return pending !== null && pending.tmdbId === tmdbId ? pending : null;
}

/** 只认 `/show/<数字>`；顺带取出 `?t=`（站内 MediaType）。 */
const SHOW_PATH = /^\/show\/(\d+)\/?$/;

/**
 * 从卡片链接里取出「这部片的身份」。取不到 `t` 就返回 `null` —— 没有它就算不出
 * 与详情页一致的名字（TMDB 的 movie/tv 是两套 id 命名空间），拼错了只会静默失效。
 */
export function posterKeyFromHref(
  href: string | null | undefined,
): { tmdbId: number; mediaType: string } | null {
  if (typeof href !== "string" || href === "") return null;
  let url: URL;
  try {
    url = new URL(href, "http://localhost");
  } catch {
    return null;
  }
  const match = SHOW_PATH.exec(url.pathname);
  if (!match || match[1] === undefined) return null;
  const mediaType = url.searchParams.get("t");
  if (mediaType === null || mediaType === "") return null;
  return { tmdbId: Number(match[1]), mediaType };
}

/** `https://image.tmdb.org/t/p/w342/<path>` → `/<path>`；其它来源一律不认。 */
const TMDB_SRC = /^https?:\/\/image\.tmdb\.org\/t\/p\/[^/]+\/(.+)$/;

export function posterPathFromSrc(src: string | null | undefined): string | null {
  if (typeof src !== "string" || src === "") return null;
  const match = TMDB_SRC.exec(src);
  const path = match?.[1];
  return path ? `/${path}` : null;
}
