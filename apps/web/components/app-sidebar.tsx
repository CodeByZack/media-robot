import { Suspense } from "react";
import Link from "next/link";
import { Activity, Bell, Library, Settings } from "lucide-react";
import { globalNavHref } from "@mediarover/workflow";
import { SearchNavLink } from "./search-memory";
import { ActivityNavBadge } from "./activity-nav-badge";
import { NotificationsNavBadge } from "./notifications-nav-badge";
import { SettingsAttentionBadge } from "./settings-attention-badge";
import { WorkspaceSwitcherLoader } from "./workspace-switcher-loader";

export function AppSidebar({
  active,
  searchQuery = "",
  basePath = "/",
  activeStorageId,
}: {
  active: "search" | "library" | "notifications" | "activity" | "settings" | "none";
  searchQuery?: string;
  /** Tree model: the active workspace path ("/w/<id>" or "/") so the search/library
   *  tabs keep you in the workspace you're viewing. */
  basePath?: string;
  /** The active non-primary drive id (undefined = primary). Global links
   *  (通知/活动/设置) carry it as `?w` so leaving a workspace keeps the drive. */
  activeStorageId?: string | undefined;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        {/* 品牌标识:取自 newui/assets/brand/mediarover-icon-flat.svg(去掉最外层
            渐变底 —— 容器 .brand-mark 已经是 navy 圆角底)。 */}
        <span className="brand-mark">
          <svg viewBox="0 0 512 512" width="26" height="26" aria-hidden focusable="false">
            <rect x="118" y="160" width="276" height="196" rx="92" fill="#F4FAFF" />
            <rect x="142" y="184" width="228" height="148" rx="64" fill="#102B4D" />
            <circle cx="214" cy="255" r="15" fill="#39C5FF" />
            <circle cx="298" cy="255" r="15" fill="#39C5FF" />
            <rect x="246" y="91" width="20" height="69" rx="10" fill="#F4FAFF" />
            <circle cx="256" cy="75" r="22" fill="#39C5FF" />
            <circle cx="162" cy="370" r="47" fill="#F4FAFF" />
            <circle cx="350" cy="370" r="47" fill="#F4FAFF" />
            <circle cx="162" cy="370" r="21" fill="#2C83D9" />
            <circle cx="350" cy="370" r="21" fill="#2C83D9" />
            <rect x="72" y="276" width="118" height="118" rx="34" fill="#2C83D9" />
            <path d="M116 305L116 365L164 335Z" fill="#fff" />
          </svg>
        </span>
        <span className="brand-copy">
          <strong>
            Media<span className="brand-copy-accent">Rover</span>
          </strong>
          <span>YOUR PERSONAL MEDIA AGENT</span>
        </span>
      </div>

      {/* Drive switcher (≥2 drives). In Suspense so its DB read never blocks the
          static shell, and so the client switcher's useSearchParams() is allowed. */}
      <Suspense fallback={null}>
        <WorkspaceSwitcherLoader />
      </Suspense>

      <nav aria-label="主导航">
        <ul className="nav-list">
          <li>
            <SearchNavLink active={active === "search"} knownQuery={searchQuery} basePath={basePath} />
          </li>
          <li>
            <Link
              className={`nav-item ${active === "library" ? "is-active" : ""}`}
              href={`${basePath}?tab=library`}
            >
              <Library size={16} aria-hidden />
              媒体库
            </Link>
          </li>
          <li>
            <Link
              className={`nav-item ${active === "notifications" ? "is-active" : ""}`}
              href={globalNavHref("/notifications", activeStorageId)}
            >
              <Bell size={16} aria-hidden />
              通知
              <NotificationsNavBadge storageId={activeStorageId} />
            </Link>
          </li>
          {/* 活动 + 设置 are secondary: on desktop they live in the footer; on the
              mobile top bar (footer hidden) they surface as nav items here. */}
          <li className="nav-activity-item">
            <Link
              className={`nav-item ${active === "activity" ? "is-active" : ""}`}
              href={globalNavHref("/activity", activeStorageId)}
            >
              <Activity size={16} aria-hidden />
              活动
              <ActivityNavBadge storageId={activeStorageId} />
            </Link>
          </li>
          <li className="nav-settings-item">
            <Link
              className={`nav-item ${active === "settings" ? "is-active" : ""}`}
              href={globalNavHref("/settings", activeStorageId)}
            >
              <Settings size={16} aria-hidden />
              设置
              <SettingsAttentionBadge storageId={activeStorageId} visibleWhen="mobile" />
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <Link
          className={`nav-item nav-secondary ${active === "activity" ? "is-active" : ""}`}
          href={globalNavHref("/activity", activeStorageId)}
        >
          <Activity size={16} aria-hidden />
          活动
          <ActivityNavBadge storageId={activeStorageId} />
        </Link>
        <Link className="health-card" href={globalNavHref("/settings", activeStorageId)} style={{ textDecoration: "none", color: "inherit" }}>
          <span className="health-icon">
            <Settings size={16} aria-hidden />
          </span>
          <span>
            <strong>设置</strong>
            <span>网盘 · 偏好 · 设置</span>
          </span>
          <SettingsAttentionBadge storageId={activeStorageId} visibleWhen="desktop" />
        </Link>
      </div>
    </aside>
  );
}
