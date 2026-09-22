"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Radar } from "lucide-react";
import { apiCall } from "../lib/api";
import type { PatrolResult } from "../lib/api-types";

/** 手动触发一次全量巡检（force：不占用定时计划）。 */
export function PatrolNowButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const run = () => {
    startTransition(async () => {
      const r = await apiCall<PatrolResult>("/api/settings/save", { type: "patrol-now" });
      if (!r.ok) {
        setNote(`❌ ${r.error}`);
        router.refresh();
        setTimeout(() => setNote(null), 6000);
        return;
      }
      const res = r.value;
      setNote(res.success ? `✅ 巡检完成，检查了 ${res.checked ?? 0} 项` : `❌ ${res.message}`);
      router.refresh();
      setTimeout(() => setNote(null), 6000);
    });
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button type="button" className="primary-button" onClick={run} disabled={isPending}>
        {isPending ? <LoaderCircle size={14} className="spin" aria-hidden /> : <Radar size={14} aria-hidden />}
        {isPending ? "巡检中…" : "立即巡检"}
      </button>
      <span className="hint-help">手动巡检不占用定时计划</span>
      {note ? <span className="hint-help">{note}</span> : null}
    </span>
  );
}
