/**
 * 侧栏「当前在哪个功能区」的推导（纯函数，可测）。
 *
 * 为什么要抽出来：侧栏已移入 `app/(shell)/layout.tsx`（外壳），**layout 拿不到
 * pathname / searchParams** —— 这是 App Router 的硬限制。所以高亮只能由客户端从
 * `usePathname()` / `useSearchParams()` 推。这段推导就是那个"路径 → 高亮"的映射，
 * 它必须与路由表保持一致，所以值得单测钉住（改路由时测试会立刻指出漏改）。
 *
 * 与旧实现的等价性：`/show/<id>` 的高亮原本由页面读 `?from=search|library` 后当
 * prop 传下来；客户端读同一个 searchParam 即可，语义完全一致（不是"丢了这个信息"）。
 */

export type SidebarSection =
  | "search"
  | "library"
  | "notifications"
  | "activity"
  | "settings"
  | "none";

/** 详情页的来路（`?from=`），决定侧栏高亮哪一项。 */
export type ShowOrigin = "search" | "library" | null;

/**
 * @param pathname 当前路径（不含 query）
 * @param showOrigin `/show/*` 上的 `?from=`，其它路径忽略
 */
export function sidebarActive(pathname: string, showOrigin: ShowOrigin): SidebarSection {
  if (pathname === "/") {
    return "search";
  }
  if (pathname.startsWith("/library")) {
    return "library";
  }
  if (pathname.startsWith("/notifications")) {
    return "notifications";
  }
  // 外来作品的审阅页是从「通知」点进去的，高亮回通知 —— 与旧实现一致。
  if (pathname.startsWith("/foreign-work")) {
    return "notifications";
  }
  if (pathname.startsWith("/activity")) {
    return "activity";
  }
  if (pathname.startsWith("/settings")) {
    return "settings";
  }
  if (pathname.startsWith("/show")) {
    // 搜索是搜索，媒体库是媒体库：详情页归属用户**来**的那个面。
    // 无从得知（直接输 URL / 外部链接）时不高亮任何一项，而不是猜一个。
    return showOrigin ?? "none";
  }
  return "none";
}

/** `?from=` 的窄化：只接受两个已知值，其它一律 null（不猜）。 */
export function parseShowOrigin(raw: string | null): ShowOrigin {
  return raw === "search" || raw === "library" ? raw : null;
}
