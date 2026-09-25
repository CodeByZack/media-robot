/**
 * 「从哪个页面点进详情页的」记忆。
 *
 * 为什么需要它 —— 详情页的返回按钮要**保留上一页的完整状态**（媒体库的
 * `?type=`/`?filter=`、搜索页的 `?q=`），这些都不在详情页的 URL 里，所以不能写死
 * 一个地址；而 `router.back()` 走的是 popstate，**跨路由回退不会触发 View
 * Transition**（实测 0 次；同路由回退会触发，见 DESIGN.md 的四象限表）→ 海报就没有
 * 形变。把来路记下来、返回时用 `router.replace(来路)` 走普通导航，两个目标就都达成：
 * 状态不丢 + 过渡正常。
 *
 * 只记「目标是详情页」的那次点击 —— 别的导航不需要来路，也不必让记忆被覆盖。
 */

/** sessionStorage key。不加盘前缀：URL 本身与盘无关（盘在 cookie 里）。 */
export const DETAIL_ORIGIN_KEY = "mr_detail_origin";

/**
 * 只有**站内相对路径**才可用。
 * sessionStorage 里可能是上一次会话的旧值、或被人为塞进的任意字符串，直接交给
 * `router.replace()` 等于让外部输入决定跳转目标，所以这里做形状校验：
 * 必须以单个 `/` 开头（`//evil.com` 是协议相对 URL，必须挡掉）。
 */
export function isUsableOrigin(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

/** 是不是指向详情页的链接 —— 只有点进详情页时才值得记住来路。 */
export function isDetailHref(href: string | null | undefined): boolean {
  if (typeof href !== "string") return false;
  return href === "/show" || href.startsWith("/show/");
}

/** 读记忆。storage 不可用（隐私模式等）时返回 null，调用方自然退化成原行为。 */
export function readDetailOrigin(): string | null {
  try {
    const raw = window.sessionStorage.getItem(DETAIL_ORIGIN_KEY);
    return isUsableOrigin(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** 写记忆。失败静默 —— 记不住只是少了过渡，不该影响导航。 */
export function rememberDetailOrigin(url: string): void {
  if (!isUsableOrigin(url)) return;
  try {
    window.sessionStorage.setItem(DETAIL_ORIGIN_KEY, url);
  } catch {
    // storage unavailable — 退化成 back()
  }
}
