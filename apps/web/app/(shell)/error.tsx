"use client";

import { ErrorFallback } from "../../components/error-fallback";

/**
 * 后台页面的错误边界。
 *
 * 为什么要有它（而不只留根级那个）：错误边界会**替换掉同级 layout 的 children**，
 * 而 `(shell)/layout.tsx` 提供侧栏与 <main>，所以这里渲染失败时**侧栏仍然在**——
 * 用户能直接点去别的页面，而不是被困在一个孤立的错误页上（这是只有根级 error.tsx
 * 时的实际后果：整页接管、连导航都没有）。
 *
 * 作用域是外壳组内所有页面；单个路由若需要更细的边界，可在该目录再放一个 error.tsx。
 */
export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} />;
}
