"use client";

import { TriangleAlert } from "lucide-react";

/**
 * 页面渲染失败的兜底 UI。被两处错误边界共用：
 *   - `app/error.tsx`（根级：捕获根 layout / login 等）
 *   - `app/(shell)/error.tsx`（外壳级：捕获后台页面，**侧栏保留**）
 *
 * 为什么生产环境只敢显示 digest：服务端错误信息在生产构建里会被抹掉，digest 是唯一
 * 既安全又能让反馈者引用具体线索的东西。
 */
export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="quiet-state" role="alert">
      <TriangleAlert size={28} aria-hidden />
      <strong>页面渲染失败</strong>
      <span>
        多半是部署环境连不上某个上游服务（TMDB／资源搜索）——国内网络未配置代理时常见。
        检查部署主机（或容器）的网络后重试。
      </span>
      <button className="primary-button" type="button" onClick={reset}>
        重试
      </button>
      {error.digest ? <span className="panel-note">digest: {error.digest}</span> : null}
    </div>
  );
}
