"use client";

import { useEffect, useState } from "react";

/** Small live count of active (queued + running) acquisitions, shown on the 活动
 *  nav entry. Polls the same endpoint the activity page uses; hidden at zero. */
export function ActivityNavBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        // 盘由 cookie 决定（服务端 resolveCurrentWorkspace）—— 不再需要把 storageId
        // 拼进查询串，客户端也就无从伪造"我看哪块盘"。
        const params = new URLSearchParams({ since: new Date().toISOString() });
        const res = await fetch(`/api/activity?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { active?: unknown[] };
        if (alive) setCount(Array.isArray(data.active) ? data.active.length : 0);
      } catch {
        // transient — keep the last count
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (count === 0) {
    return null;
  }
  return <span className="nav-badge">{count}</span>;
}
