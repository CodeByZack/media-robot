"use client";

import { useState, useTransition } from "react";
import { apiCall } from "../lib/api";
import type { TestStorageResult } from "../lib/api-types";

/** Per-drive "测试连接" button (settings). Probes the cookie; a dead one freezes
 *  the drive server-side, and the result message tells the user to re-bind. */
export function TestConnectionButton({ storageId }: { storageId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        className="ghost-button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await apiCall<TestStorageResult>("/api/drives", {
              type: "test",
              storageId,
            });
            if (!r.ok) {
              setResult({ ok: false, message: r.error });
              return;
            }
            setResult({ ok: r.value.ok, message: r.value.message });
          })
        }
      >
        {pending ? "检测中…" : "测试连接"}
      </button>
      {result ? (
        <span className={`hint-help ${result.ok ? "" : "tone-amber"}`}>{result.message}</span>
      ) : null}
    </span>
  );
}
