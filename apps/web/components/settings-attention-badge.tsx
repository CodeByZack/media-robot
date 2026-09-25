"use client";

import { useEffect, useState } from "react";

/** Live count of Settings attention items. Hidden at zero.
 *  设置 现在只挂在主导航一处（桌面与移动共用同一个 nav 列表），所以只有
 *  一个实例，不再需要按断点择一挂载 —— 常驻轮询即可。 */
export function SettingsAttentionBadge({
  storageId,
}: {
  storageId?: string | undefined;
}) {
  const [count, setCount] = useState(0);
  const [severity, setSeverity] = useState<"info" | "warning" | "blocker" | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 10000);
      try {
        const url = storageId
          ? `/api/settings/attention?w=${encodeURIComponent(storageId)}`
          : "/api/settings/attention";
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as {
          count?: number;
          severity?: "info" | "warning" | "blocker" | null;
        };
        if (!alive) return;
        setCount(typeof data.count === "number" ? data.count : 0);
        setSeverity(
          data.severity === "blocker" || data.severity === "warning" || data.severity === "info"
            ? data.severity
            : null,
        );
      } catch {
        // keep last (including abort/timeout)
      } finally {
        clearTimeout(abortTimer);
        // Self-schedule so slow/hung requests never stall the loop forever.
        if (alive) {
          timer = setTimeout(() => void poll(), 8000);
        }
      }
    };
    void poll();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [storageId]);

  if (count <= 0) return null;
  const tone =
    severity === "blocker"
      ? "nav-badge-alert"
      : severity === "info"
        ? "nav-badge-info"
        : "nav-badge-warning";
  return <span className={`nav-badge ${tone}`}>{count}</span>;
}
