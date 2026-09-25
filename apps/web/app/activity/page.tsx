import { Suspense } from "react";
import { AppSidebar } from "../../components/app-sidebar";
import { ActivityFeed } from "../../components/activity-feed";
import { resolveCurrentWorkspace } from "../../lib/workflow-runtime";

// The drive is a cookie/DB read, so the surface lives inside Suspense: the static
// app shell prerenders instead of the whole route blocking on it (cacheComponents
// "blocking-route"). Mirrors page.tsx.
export default function ActivityPage() {
  return (
    <Suspense fallback={<ActivityShell />}>
      <ActivitySurface />
    </Suspense>
  );
}

function ActivityShell() {
  return (
    <div className="app-shell">
      <AppSidebar active="activity" />
      <main className="main product-main" aria-busy="true" />
    </div>
  );
}

async function ActivitySurface() {
  // 盘由 cookie 决定（不再从 URL 读），仅用于 gate 多盘 UI。
  await resolveCurrentWorkspace();
  return (
    <div className="app-shell">
      <AppSidebar active="activity" />
      <main className="main product-main">
        <div className="section-heading library-heading">
          <div>
            <h1>活动</h1>
            <p>点了获取之后，资源在这里逐个被处理 —— 看得见 agent 正在干什么</p>
          </div>
        </div>
        {/* ActivityFeed is a client component in the page's STATIC shell (not inside a
            Suspense'd async server component — those don't hydrate, which froze the
            live poll). It self-fetches /api/activity on mount and polls. */}
        <ActivityFeed />
      </main>
    </div>
  );
}
