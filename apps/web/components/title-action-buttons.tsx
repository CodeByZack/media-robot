"use client";

import { Check, DownloadCloud, Layers, LoaderCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apiCall } from "../lib/api";
import type { AcquireResult } from "../lib/api-types";
import { useAcquisitionLock } from "./acquisition-lock";
import { AcquireResultNotice, isLockedResult } from "./request-state";
import { isDemoModeClient } from "../lib/demo-mode";
import { DemoAcquirePlayback } from "./demo-acquire-playback";
import type { DemoAcquisitionEntry } from "../lib/demo-session";
import { useDemoAcquiredTmdbIds } from "../lib/use-demo-session";

export function RequestSeasonButton({
  tmdbId,
  seasonNumber,
  titleAcquiring = false,
  demoEntry,
}: {
  tmdbId: number;
  seasonNumber: number;
  /** Tree model: the active workspace drive — acquisition lands HERE. REQUIRED
   *  (value may be undefined = primary) so the workspace is always threaded. */
  /** Server truth: this title already has an acquisition run in flight. */
  titleAcquiring?: boolean;
  /** Demo only: recorded to the session library when the scripted playback ends. */
  demoEntry?: DemoAcquisitionEntry | undefined;
}) {
  const router = useRouter();
  const lock = useAcquisitionLock();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AcquireResult | null>(null);
  const scope = `season-${seasonNumber}`;
  const isLocked = isLockedResult(result);
  const mine = lock?.acquiring === scope;
  const othersAcquiring = (lock != null && lock.acquiring != null && !mine) || titleAcquiring;
  const inFlight = isPending || mine;
  const demo = isDemoModeClient();
  const [demoPlaying, setDemoPlaying] = useState(false);
  const acquiredIds = useDemoAcquiredTmdbIds();

  // 锁的生命周期 = 这次请求在飞的那段时间。transition 结束（成功或失败）即释放，
  // 不再依赖 router.refresh() 让 Provider 重挂载 —— 那样一旦刷新失败，acquiring
  // 永远是当前 scope，同剧所有按钮会永久禁用。
  useEffect(() => {
    if (!isPending) {
      lock?.release(scope);
    }
  }, [isPending, lock, scope]);

  if (demo && demoPlaying) {
    return <DemoAcquirePlayback entry={demoEntry} />;
  }

  if (demo && acquiredIds.has(tmdbId)) {
    return (
      <span className="hub-badge tone-green">
        <Check size={13} aria-hidden />
        已获取
      </span>
    );
  }

  return (
    <>
      <button
        className="season-request-button"
        type="button"
        title={
          othersAcquiring && !inFlight ? "该剧正在获取中，请稍候" : result?.message ?? `获取第 ${seasonNumber} 季`
        }
        disabled={isPending || isLocked || othersAcquiring}
        onClick={() => {
          if (demo) {
            setDemoPlaying(true);
            return;
          }
          lock?.lock(scope);
          startTransition(async () => {
            const r = await apiCall<AcquireResult>("/api/acquire", {
              type: "season",
              tmdbId,
              seasonNumber,
            });
            if (!r.ok) {
              setResult({ status: "unsupported", message: r.error });
              // 不刷新：请求失败意味着服务端什么都没变，重渲染整页毫无收益
              // （旧注释说"必须 refresh 才能清锁"—— 那是锁没有释放接口时的绕法，
              //   现在由上面的 effect 显式释放，且不依赖任何网络往返）。
              return;
            }
            setResult(r.value);
            router.refresh();
          });
        }}
      >
        {inFlight ? (
          <LoaderCircle size={13} className="spin" aria-hidden />
        ) : isLocked ? (
          <Check size={13} aria-hidden />
        ) : (
          <DownloadCloud size={13} aria-hidden />
        )}
        {inFlight ? "获取中" : isLocked ? "已请求" : "获取本季"}
      </button>
      <AcquireResultNotice result={result} />
    </>
  );
}

export function RequestRemainingButton({
  tmdbId,
  label,
  titleAcquiring = false,
  demoEntry,
}: {
  tmdbId: number;
  label: string;
  /** Tree model: the active workspace drive — acquisition lands HERE. REQUIRED
   *  (value may be undefined = primary) so the workspace is always threaded. */
  /** Server truth: this title already has an acquisition run in flight. */
  titleAcquiring?: boolean;
  /** Demo only: recorded to the session library when the scripted playback ends. */
  demoEntry?: DemoAcquisitionEntry | undefined;
}) {
  const router = useRouter();
  const lock = useAcquisitionLock();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AcquireResult | null>(null);
  const scope = "remaining";
  const isLocked = isLockedResult(result);
  const mine = lock?.acquiring === scope;
  const othersAcquiring = (lock != null && lock.acquiring != null && !mine) || titleAcquiring;
  const inFlight = isPending || mine;
  const demo = isDemoModeClient();
  const [demoPlaying, setDemoPlaying] = useState(false);
  const acquiredIds = useDemoAcquiredTmdbIds();

  // 锁的生命周期 = 这次请求在飞的那段时间。transition 结束（成功或失败）即释放，
  // 不再依赖 router.refresh() 让 Provider 重挂载 —— 那样一旦刷新失败，acquiring
  // 永远是当前 scope，同剧所有按钮会永久禁用。
  useEffect(() => {
    if (!isPending) {
      lock?.release(scope);
    }
  }, [isPending, lock, scope]);

  if (demo && demoPlaying) {
    return <DemoAcquirePlayback entry={demoEntry} />;
  }

  if (demo && acquiredIds.has(tmdbId)) {
    return (
      <span className="hub-badge tone-green">
        <Check size={13} aria-hidden />
        已获取
      </span>
    );
  }

  return (
    <>
      <button
        className="primary-button"
        type="button"
        title={othersAcquiring && !inFlight ? "该剧正在获取中，请稍候" : result?.message ?? label}
        disabled={isPending || isLocked || othersAcquiring}
        onClick={() => {
          if (demo) {
            setDemoPlaying(true);
            return;
          }
          lock?.lock(scope);
          startTransition(async () => {
            const r = await apiCall<AcquireResult>("/api/acquire", {
              type: "remaining",
              tmdbId,
            });
            if (!r.ok) {
              setResult({ status: "unsupported", message: r.error });
              // 同上一处：失败不刷新，锁由 effect 释放。
              return;
            }
            setResult(r.value);
            router.refresh();
          });
        }}
      >
        {inFlight ? (
          <LoaderCircle size={14} className="spin" aria-hidden />
        ) : isLocked ? (
          <Check size={14} aria-hidden />
        ) : (
          <Layers size={14} aria-hidden />
        )}
        {inFlight ? "获取中" : isLocked ? "已请求" : label}
      </button>
      <AcquireResultNotice result={result} />
    </>
  );
}
