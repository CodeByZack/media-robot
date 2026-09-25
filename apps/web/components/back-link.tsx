"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Returns to where the user actually came from. history.back() preserves
 * the previous list state (e.g. the search query); the fallback href covers
 * direct navigation with no history.
 */
export function BackLink({
  label = "返回",
  fallbackHref = "/",
}: {
  label?: string;
  fallbackHref?: string;
}) {
  const router = useRouter();

  // 用 router.back() 而不是 push(fallbackHref)：后退**保留上一页的完整状态**
  // （媒体库的 type/filter、搜索页的 ?q=），这些信息不在详情页的 URL 里，push 会丢。
  // 代价是**跨路由**后退没有 View Transition（同路由后退有，见下方注释）。功能优先，
  // 所以这里保持 back()。
  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      className="back-link"
      type="button"
      onClick={goBack}
    >
      <ArrowLeft size={16} aria-hidden />
      {label}
    </button>
  );
}
