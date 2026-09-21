"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "../lib/api";
import type { DriveResult } from "../lib/api-types";

/** Per-drive「取消绑定」(settings). Two-step: click → confirm. On success the
 *  drive disappears from the account; tracking data is kept (re-bind restores). */
export function UnbindStorageButton({ storageId, label }: { storageId: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (result?.ok) {
    return <span className="hint-help">{result.message}</span>;
  }

  if (!confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <button type="button" className="ghost-button" onClick={() => setConfirming(true)}>
          取消绑定
        </button>
        {result && !result.ok ? <span className="hint-help tone-amber">{result.message}</span> : null}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="hint-help">取消绑定 {label}？追踪记录保留，重绑同盘可恢复。</span>
      <button
        type="button"
        className="secondary-button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            // apiCall 内部已 catch。**状态机复位 setConfirming(false)
            // 必须在失败时也执行** —— 否则失败后按钮永远停在「确认取消绑定」
            // 的中间态(spec B 点名的陷阱)。
            const r = await apiCall<DriveResult>("/api/drives", {
              type: "unbind",
              storageId,
            });
            setConfirming(false);
            if (!r.ok) {
              setResult({ ok: false, message: r.error });
              return;
            }
            setResult(r.value);
            if (r.value.ok) router.refresh();
          })
        }
      >
        {pending ? "处理中…" : "确认取消绑定"}
      </button>
      <button type="button" className="ghost-button" disabled={pending} onClick={() => setConfirming(false)}>
        返回
      </button>
    </span>
  );
}
