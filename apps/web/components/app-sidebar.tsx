import { Suspense } from "react";
import { Activity, Bell, Library, Search, Settings } from "lucide-react";
import { GitHubMark } from "./github-mark";
import { SidebarNav } from "./sidebar-nav";
import { PatrolStatusLine } from "./patrol-status-line";
import { WorkspaceSwitcherLoader } from "./workspace-switcher-loader";

// 构建期常量（Next 在构建时把 NEXT_PUBLIC_* 内联成字面量），放模块级
// 而不是组件里 —— 它们是常量，不是每渲染一次要重算的东西。
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
/** 完整 commit；构建时拿不到就是空串。 */
const APP_COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT?.trim() ?? "";
/** 页脚只放前 7 位（git 的惯例短哈希）；完整值挂在 title 上，需要核实能悬停看到。 */
const APP_COMMIT_SHORT = APP_COMMIT.slice(0, 7);

/**
 * 侧栏（外壳）。**服务端组件** —— 里面有两个 async 服务端组件
 * （WorkspaceSwitcherLoader / PatrolStatusLine）要读数据库，客户端组件无法承载。
 *
 * 因此**不收 `active` prop**：高亮由客户端组件 <SidebarNav> 自己从 pathname 推导
 * （layout 拿不到 pathname，而这里是 layout 的一部分）。这也是侧栏能移进 layout
 * 的关键 —— 它不再依赖任何"当前页面"的信息。
 */
export function AppSidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        {/* 品牌标识:取自 newui/assets/brand/mediarover-icon-flat.svg(去掉最外层
            渐变底 —— 容器 .brand-mark 已经是 navy 圆角底)。viewBox 是正方形,
            外层容器也保持正方形,不做非等比缩放。 */}
        <span className="brand-mark">
          {/* 原 viewBox 0 0 512 512 里图案四周留白很大(内容 bbox x72-397 / y53-417),
              在 48px 的容器里机器人看着偏小,这里裁成正方形 viewBox 让机器人撑满。
              x 起点取 54 而不是按 bbox 居中的 45:左侧的播放键(x72)把 bbox 往左
              撑开,若按 bbox 居中,机身(118-394,中心 256)视觉上会偏右。取 54 让
              机身接近容器中心(左右留白 4.1 / 6.3px),既纠正了偏右、又不会让播放键
              贴到圆角边上。仍是 380×380 正方形,不变形。
              容器 .brand-mark 提供 navy 圆角底,所以不画 symbol 里的背景 rect。 */}
          <svg viewBox="54 45 380 380" width="44" height="44" aria-hidden focusable="false">
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
            Media<span className="brand-copy-accent">Robot</span>
          </strong>
          {/* 副题 = 设计稿横排 lockup 的**官方全文** `YOUR PERSONAL MEDIA AGENT`
              （25 字符），只是按品牌中文动词体系之外的书写习惯改成全小写。
              设计语言里「字标副题」是英文仅有的三个合法出场位之一。
              全小写是有意的：与 20px 的粗字标形成体重差，比全大写更安静，
              也不会和 MediaRobot 抢视觉重量；同时小写比大写省宽度（同字号下
              约省 20px），否则这行会超预算。 */}
          <span className="brand-copy-sub">your personal media agent</span>
        </span>
      </div>

      {/* Drive switcher (≥2 drives). In Suspense so its DB read never blocks the
          static shell, and so the client switcher's useSearchParams() is allowed. */}
      <Suspense fallback={null}>
        <WorkspaceSwitcherLoader />
      </Suspense>

      {/* 高亮靠客户端推导 → 必须包 Suspense（useSearchParams 在静态壳里的要求）。
          fallback 渲染同样的导航但不高亮任何一项：避免侧栏在 hydration 前"少一块"
          导致的高度跳动（这正是导航时抖动 42px 的老问题来源）。 */}
      <Suspense fallback={<SidebarNavShell />}>
        <SidebarNav />
      </Suspense>

      {/* 页脚 = 侧栏底部的「收尾卡片」：上半是活体状态（巡检呼吸点），
          下半是元信息（仓库 + 版本）。此前是两行散落的文字，看着单调。

          状态行读数据库，故在 Suspense 里。fallback 是 null 而非占位块：
          卡片靠 margin-top:auto 吸在侧栏底部，状态行加载完只是让卡片**向上**
          长高一点（下面全是导航之后的空白），nav 不动 —— 为此写一套高度对齐的
          骨架是纯开销。若日后侧栏内容变密、底部出现被挤动的元素，再补占位。 */}
      <div className="sidebar-footer">
        <Suspense fallback={null}>
          <PatrolStatusLine />
        </Suspense>
        <div className="sidebar-meta">
          <a
            className="sidebar-meta-link"
            href="https://github.com/CodeByZack/mediarobot"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubMark />
            GitHub
          </a>
          <code
            className="sidebar-version"
            title={APP_COMMIT ? `构建提交 ${APP_COMMIT}` : undefined}
          >
            {/* 版本 + 构建 commit，而不是「自托管」—— 后者是每一份部署都
                一样的话，占着位置却不提供任何可核对的信息（设计 §3：位置
                要留给可核实的事实）。commit 才能回答“这台机器跑的是哪份代码”。 */}
            v{APP_VERSION}
            {APP_COMMIT_SHORT ? ` · ${APP_COMMIT_SHORT}` : ""}
          </code>
        </div>
      </div>
    </aside>
  );
}

/** SidebarNav 的静态兜底：同样的结构、同样的高度，只是不高亮、不挂徽章。 */
function SidebarNavShell() {
  const items = [
    { href: "/", label: "搜索", Icon: Search },
    { href: "/library", label: "媒体库", Icon: Library },
    { href: "/notifications", label: "通知", Icon: Bell },
    { href: "/activity", label: "活动", Icon: Activity },
    { href: "/settings", label: "设置", Icon: Settings },
  ];
  return (
    <nav aria-label="主导航" aria-busy="true">
      <ul className="nav-list">
        {items.map(({ href, label, Icon }) => (
          <li key={href}>
            <span className="nav-item">
              <Icon size={16} aria-hidden />
              {label}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
