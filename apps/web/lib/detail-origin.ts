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
 * 导航回列表后把滚动位置放回去。
 *
 * ⚠️ 必须放在**模块级函数**里，不能挂在组件上：调用它的那个组件（详情页的返回按钮）
 * 导航完就卸载了，等目标页渲染好时它已经不在了。模块函数不随导航卸载，这正是需要的。
 *
 * 两条实测得来的规矩：
 *  1. **等渲染稳定再滚**。目标页是流式渲染的，太早滚会被浏览器钳到当时的最大值。
 *     判据用「scrollHeight 连续若干帧不变」，而不是固定等几毫秒。
 *  2. **滚不到原位置时，滚到能到的最远处**，不要放弃。实测踩过：返回后的页面比离开时
 *     矮了 24px（内容/布局略有差异），而我原来的判据要求必须能精确滚到 y —— 于是它
 *     一直等到超时后什么都不做，用户看到的是"回到顶部"。
 */
export function scheduleScrollRestore(): void {
  const y = readScrollY();
  if (y === null || y <= 0) return;

  const deadline = performance.now() + 2000;
  let lastHeight = -1;
  let stableFrames = 0;

  const finish = (target: number) => {
    window.scrollTo(0, Math.max(0, target));
    clearScrollY();
  };

  const tick = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    // 能滚到原位 → 完成
    if (maxScroll >= y) {
      finish(y);
      return;
    }
    // 还在变高（流式渲染中）→ 继续等
    const height = document.documentElement.scrollHeight;
    if (height !== lastHeight) {
      lastHeight = height;
      stableFrames = 0;
    } else {
      stableFrames += 1;
    }
    // 高度稳定了（或超时）→ 页面就是比离开时矮，滚到能到的最远处
    if (stableFrames >= 6 || performance.now() > deadline) {
      finish(maxScroll);
      return;
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
