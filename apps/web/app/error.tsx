"use client";

import { ErrorFallback } from "../components/error-fallback";

/**
 * 根级错误边界 —— 捕获 `app/layout.tsx` 本身以及 `(shell)` 与 `login` 之外的东西。
 *
 * 注意它**没有外壳**（侧栏在这里不存在），所以后台页面的崩溃由
 * `app/(shell)/error.tsx` 接手，那里侧栏会保留、用户能导航离开。这一个是最后一道
 * 兜底：连外壳都渲染不出来时才走到这里。
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
