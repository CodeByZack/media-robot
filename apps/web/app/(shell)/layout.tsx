import { Suspense, type ReactNode } from "react";
import { AppSidebar } from "../../components/app-sidebar";
import { DetailOriginMemory } from "../../components/detail-origin-memory";

/**
 * 后台外壳（侧栏 + 主区）。
 *
 * 为什么要有这个 layout —— 侧栏此前由**每个页面各自渲染**，代价是实测出来的：
 *   - 每次导航页面卸载 → 侧栏重挂 → 里面 3 个徽章的 useEffect 重新挂载各发一次请求
 *     （一次导航实测 9 个请求，其中本该只有 1 个 RSC）
 *   - 侧栏里的盘切换器在 Suspense 里、fallback 为 null → 它塌陷时下方导航整列上移
 *     42px，服务端数据回来又弹回去（导航时可见的双跳）
 * App Router 的 layout **在导航时不重新渲染**，所以把侧栏放这里，上面两个问题一起消失。
 *
 * 为什么用路由组 `(shell)` 而不是直接放根 layout：`/login` 是独立的全屏页面
 * （自己的 <main>、没有 <div className="app-shell">），不该套上侧栏。路由组让
 * 「需要外壳的页面」聚在一起，而**不影响 URL**（`(shell)/library` 仍是 `/library`）。
 *
 * ⚠️ 这个 layout 里**不能出现读 pathname / searchParams 的客户端组件** —— 试过：
 * 用一个客户端 <ShellMain> 按 pathname 选 main 的类名，会在 `/show/[tmdbId]`
 * （外壳组里唯一的动态段路由）触发 blocking-route 报错，因为动态段的 pathname 在
 * 构建期未知，layout 的静态壳无法预渲染，而包住 children 的客户端组件又让页面的
 * Suspense 失效。现在 main 的类名固定，需要随内容变的样式改用 CSS（见 .main:has(...)）。
 */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      {/* 只挂一个全局 click 监听、渲染 null（见组件注释：不碰渲染期路由状态，
          所以不违反上面那条「不能读 pathname」的限制）。 */}
      <DetailOriginMemory />
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <main className="main">{children}</main>
    </div>
  );
}
