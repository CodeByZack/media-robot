"use client";

import { useEffect, useState } from "react";
import type { ActivityActiveRun, ActivityView } from "./activity-view";
import { findActiveRun } from "./inline-progress";

/**
 * Poll /api/activity for THIS card's active run (by tmdbId [+season]). Returns the
 * matched ActivityActiveRun or null. SSR-safe (starts null, fills on mount); keeps
 * the last value on a transient fetch error. 2.6s cadence matches ActivityFeed.
 */
export function useActiveRun(
  tmdbId: number,
  seasonNumber: number | null,
): ActivityActiveRun | null {
  const [run, setRun] = useState<ActivityActiveRun | null>(null);
  useEffect(() => {
    let alive = true;
    // Reset on key change (tmdbId/season define the lookup) so a reused instance
    // doesn't briefly show a different card's stale progress until the first poll
    // returns. 盘不参与 key —— 它由 cookie 决定，切盘会整页重渲染。
    setRun(null);
    const poll = async () => {
      try {
        const res = await fetch("/api/activity", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as ActivityView;
        if (alive) setRun(findActiveRun(data.active, tmdbId, seasonNumber));
      } catch {
        // transient — keep last value, retry next tick
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 2600);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [tmdbId, seasonNumber]);
  return run;
}
