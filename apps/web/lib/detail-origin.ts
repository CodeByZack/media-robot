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

/**
 * 是不是指向详情页的链接 —— 只有点进详情页时才值得记住来路。
 *
 * 写成**类型谓词**（`href is string`）而不是普通 boolean：调用方拿到 true 之后
 * 通常马上要用 `href` 本身（拿去解析、存起来），普通 boolean 还得再写一次
 * `typeof href === "string"` 才能过类型检查。
 */
export function isDetailHref(href: string | null | undefined): href is string {
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

/* ---------- 滚动位置：返回时得放回原处 ---------- */

/**
 * 为什么需要它 —— 返回用的是 `router.replace(来路)`（普通导航，才有过渡）。
 * 而**浏览器只在 popstate 时自动恢复滚动位置**，普通导航会把新页面滚到顶部。
 * 于是"滑到底部点进详情、再返回"就会跳回顶部（实测踩过）。
 * 这里记下点击那一刻的 scrollY，返回后放回去。
 */
export const DETAIL_SCROLL_KEY = "mr_detail_scroll";

/** 滚动位置只在合理范围内才可信；负数 / NaN / 超大值都当没记。 */
export function isUsableScrollY(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function rememberScrollY(y: number): void {
  if (!isUsableScrollY(y)) return;
  try {
    window.sessionStorage.setItem(DETAIL_SCROLL_KEY, String(Math.round(y)));
  } catch {
    // storage unavailable — 退化成回到顶部
  }
}

export function readScrollY(): number | null {
  try {
    const raw = window.sessionStorage.getItem(DETAIL_SCROLL_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return isUsableScrollY(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearScrollY(): void {
  try {
    window.sessionStorage.removeItem(DETAIL_SCROLL_KEY);
  } catch {
    // ignore
  }
}

/**
 * 从记录的来路 URL 里取 pathname（丢掉 query）。
 * 比对时**不能**用整个 URL：`useSearchParams()` 序列化出来的 query 顺序、编码
 * 不保证与原始 URL 逐字一致，拿它做等值判断会莫名失配。
 */
export function originPathname(origin: string): string {
  const questionMark = origin.indexOf("?");
  return questionMark === -1 ? origin : origin.slice(0, questionMark);
}

/**
 * 该不该把滚动放回去 —— 纯函数，好测。
 *
 * 为什么需要 originPath 这一层判断：记忆是 sessionStorage，会跨导航留着。用户完全
 * 可能点了海报、进详情页，然后不返回而是去点"通知" —— 那时把媒体库的位置套到通知页
 * 上就是明明白白的 bug。只有"当前页正是当初点进详情页的那一页"才认账。
 */
export function shouldRestoreScroll(input: {
  pendingY: number | null;
  originPath: string | null;
  currentPath: string;
}): boolean {
  if (input.pendingY === null || input.pendingY <= 0) return false;
  if (input.originPath === null) return false;
  return input.originPath === input.currentPath;
}

/** 滚到 y，但不超过当前能滚的最大值。返回「是否已经到位」。 */
function applyScroll(y: number): boolean {
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const target = Math.min(y, maxScroll);
  if (Math.round(window.scrollY) !== Math.round(target)) window.scrollTo(0, target);
  return maxScroll >= y;
}

/**
 * 回到列表页后把滚动位置放回去。
 *
 * ⚠️ **必须在目标页自己的 layout effect 里调用，不能放在「点击返回」的处理函数里。**
 * 这是实测踩过的坑，两个原因都很硬：
 *
 *  1. **点击时目标页还没渲染**。那时 `document` 里还是详情页，而详情页当时的高度
 *     稳定，于是「等高度稳定」的判据立刻成立 → 函数认定"页面就是没这么高" → 滚到
 *     详情页的 maxScroll（0）、顺手把记忆清掉。等列表页真的渲染出来，没有任何人再
 *     去恢复它 → 用户看到的就是「返回后停在顶部」。这个 bug 是间歇性的：它取决于
 *     导航比"高度稳定"快还是慢，所以同一操作时而正常时而失败。
 *  2. **滚动必须在 View Transition 抓新快照之前落地**。抓快照时页面还没滚，形变动画
 *     的目标位置就是按"未滚动的布局"算出来的 —— 页面随后被滚走，而动画层是
 *     视口固定的，海报就会悬在那儿不动、看起来"卡在列表页上"。
 *     layout effect 在同一个 commit 里、浏览器抓新快照之前跑，所以正好。
 *
 * 残留的流式渲染情形（目标页内容还没到）用一个短促的补正循环兜住：先滚一次（哪怕是
 * 被钳住的位置），之后几帧再校正，够到 y 就停。
 */
export function restorePendingScroll(): void {
  // 还在详情页（或其他 /show/ 页）→ 记忆留着，等真的回去了再消费
  if (window.location.pathname.startsWith("/show")) return;

  const origin = readDetailOrigin();
  const pendingY = readScrollY();

  if (
    !shouldRestoreScroll({
      pendingY,
      originPath: origin === null ? null : originPathname(origin),
      currentPath: window.location.pathname,
    })
  ) {
    // 两条路会走到这里：没记忆（本来就不需要恢复），或记忆过期（用户去了别处）。
    // 后者必须清掉，否则它会在下一次碰巧回到同一路径时突然生效。
    clearScrollY();
    return;
  }

  const y = pendingY as number;
  if (applyScroll(y)) {
    clearScrollY();
    return;
  }

  // 目标页还在变高（流式渲染）→ 补正几帧。上限很短：再久也该让用户自己滚了。
  let frames = 0;
  const tick = () => {
    frames += 1;
    if (applyScroll(y) || frames > 12) {
      clearScrollY();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
