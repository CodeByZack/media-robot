"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { lockScope, releaseScope } from "../lib/acquisition-lock-state";

interface AcquisitionLockState {
  /** Scope currently being acquired (e.g. "remaining" or "season-2"), or null. */
  acquiring: string | null;
  /** 上锁。 */
  lock: (scope: string) => void;
  /** 释放**自己**持有的锁（scope 必须匹配）。 */
  release: (scope: string) => void;
}

const AcquisitionLockContext = createContext<AcquisitionLockState | null>(null);

/**
 * Shares one "an acquisition is in flight" flag across every acquisition button
 * for a single title. The instant the user fires one scope, all sibling scopes
 * disable — so "get S1" then "get S2" then "get S3" can't open three overlapping
 * requests against the same title (the backend title lock is the safety net;
 * this is the immediate UX guard).
 *
 * ⚠️ **为什么必须有 `release`**：早先这个 context 只有 `lock`（写），没有释放途径 ——
 * 于是"解锁"只能靠 `router.refresh()` 让 Provider 重挂载。这有两个真问题：
 *   1. 刷新失败（或用户在此期间导航走了）→ `acquiring` 永远不为 null →
 *      **同剧所有获取按钮永久禁用**，只能整页刷新才能恢复。
 *   2. 它把"重置一个前端状态"这件事挂在一次网络往返上，代价与不确定性都不必要。
 * 现在由调用方在 transition 结束时显式释放，锁的生命周期 = 请求在飞的那段时间。
 *
 * `release` 带 scope 校验是刻意的：迟到的回调不该清掉别人刚上的锁。
 */
export function AcquisitionLockProvider({ children }: { children: ReactNode }) {
  const [acquiring, setAcquiring] = useState<string | null>(null);
  // 状态转移是纯函数（lib/acquisition-lock-state.ts），可单测 —— 项目没有 jsdom，
  // 组件本身测不了，所以把"只有持有者能解锁"这条不变量放在可测的地方。
  const release = useCallback((scope: string) => {
    setAcquiring((current) => releaseScope(current, scope));
  }, []);
  const lock = useCallback((scope: string) => {
    setAcquiring((current) => lockScope(current, scope));
  }, []);
  // useMemo：context value 每次渲染都新建的话，消费方的 useEffect(依赖 lock) 会每帧重跑。
  const value = useMemo(() => ({ acquiring, lock, release }), [acquiring, lock, release]);
  return <AcquisitionLockContext.Provider value={value}>{children}</AcquisitionLockContext.Provider>;
}

export function useAcquisitionLock(): AcquisitionLockState | null {
  return useContext(AcquisitionLockContext);
}
