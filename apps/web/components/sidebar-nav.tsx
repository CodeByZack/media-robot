"use client";

import Link from "next/link";
import { Activity, Bell, Library, Settings } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseShowOrigin, sidebarActive } from "../lib/sidebar-active";
import { SearchNavLink } from "./search-memory";
import { ActivityNavBadge } from "./activity-nav-badge";
import { NotificationsNavBadge } from "./notifications-nav-badge";
import { SettingsAttentionBadge } from "./settings-attention-badge";

/**
 * 侧栏主导航。**客户端组件**，因为侧栏现在是 `(shell)/layout.tsx` 的一部分，
 * 而 layout 拿不到 pathname / searchParams —— 高亮只能客户端推导。
 *
 * 五个链接都是**常量路径**：盘进了 cookie，所有盘共用同一套 URL（旧实现里每个链接
 * 都要按当前盘拼 basePath，那套机制已随盘移出 URL 一起删除）。
 *
 * 必须在 <Suspense> 里渲染：`useSearchParams()` 在静态壳中会要求最近的 Suspense
 * 边界（否则构建报错）。
 */
export function SidebarNav() {
  const pathname = usePathname() ?? "/";
  const search = useSearchParams();
  const active = sidebarActive(pathname, parseShowOrigin(search.get("from")));

  return (
    <nav aria-label="主导航">
      <ul className="nav-list">
        <li>
          <SearchNavLink active={active === "search"} />
        </li>
        <li>
          <Link className={`nav-item ${active === "library" ? "is-active" : ""}`} href="/library">
            <Library size={16} aria-hidden />
            媒体库
          </Link>
        </li>
        <li>
          <Link
            className={`nav-item ${active === "notifications" ? "is-active" : ""}`}
            href="/notifications"
          >
            <Bell size={16} aria-hidden />
            通知
            <NotificationsNavBadge />
          </Link>
        </li>
        <li>
          <Link className={`nav-item ${active === "activity" ? "is-active" : ""}`} href="/activity">
            <Activity size={16} aria-hidden />
            活动
            <ActivityNavBadge />
          </Link>
        </li>
        <li>
          <Link className={`nav-item ${active === "settings" ? "is-active" : ""}`} href="/settings">
            <Settings size={16} aria-hidden />
            设置
            <SettingsAttentionBadge />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
