"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { lastQueryKeyForCurrentDrive } from "../lib/drive-cookie";

/** Persists the current search query so navigation can restore it.
 *  **每块盘各记一份** —— key 里带当前盘 id，而盘 id 由客户端直接读 cookie（不进 URL，
 *  也不再从服务端层层传递）。切到夸克后搜索框会恢复夸克自己的关键词。 */
export function RememberQuery({ query }: { query: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(lastQueryKeyForCurrentDrive(), query);
    } catch {
      // storage unavailable — nothing to remember
    }
  }, [query]);
  return null;
}

/**
 * 搜索 nav entry that restores the last query (per drive): leaving for 媒体库/通知
 * and coming back must not reset the result list.
 */
export function SearchNavLink({ active }: { active: boolean }) {
  const router = useRouter();
  return (
    <Link
      className={`nav-item ${active ? "is-active" : ""}`}
      href="/"
      onClick={(event) => {
        // 记忆里的 query 只能在**点击时**读（渲染期读 sessionStorage 会造成 SSR
        // hydration 不一致）。没有记忆就让它走 href 的普通导航，不做多余跳转。
        let remembered = "";
        try {
          remembered = sessionStorage.getItem(lastQueryKeyForCurrentDrive()) ?? "";
        } catch {
          remembered = "";
        }
        if (remembered) {
          event.preventDefault();
          router.push(`/?q=${encodeURIComponent(remembered)}`);
        }
      }}
    >
      <Search size={16} aria-hidden />
      搜索
    </Link>
  );
}
