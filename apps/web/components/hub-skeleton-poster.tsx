"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PosterTransition } from "./poster-transition";
import { pendingPosterFor } from "../lib/poster-handoff";

const POSTER = "https://image.tmdb.org/t/p/w342";

const GrayBlock = () => <div className="skeleton skeleton-hub-poster" />;

/**
 * 详情页骨架屏上的海报位。
 *
 * 默认是灰块；**如果这次导航是被点卡片进来的**，就用那张真海报 + 同一个
 * `view-transition-name` —— 冷启动时形变才有配对对象（原因见 lib/poster-handoff）。
 *
 * ⚠️ **`useParams()` 必须包在自己的 `<Suspense>` 里，不能用外层那个。**
 * 本组件是 `ShowPage` 的 Suspense **fallback**，而 `cacheComponents` 把
 * `useParams()` 视作「读取未缓存数据」；在 fallback 里直接读 → 构建期直接报
 * *"Uncached data was accessed outside of `<Suspense>`"*（实测踩过，`next build` 挂掉）。
 * 套一层内层边界后，静态壳里这个洞由 `GrayBlock` 填上、客户端再换成真海报，
 * 与"没交接时就是灰块"完全一致，所以观感上没有额外代价。
 *
 * 为什么用 `useParams()` 而不是从 props 拿 tmdbId：`ShowPage` 里的 `params` 是
 * Promise，`await` 它会让页面**自己** suspend，于是 fallback 就轮到更外层的边界了。
 * `useParams()` 从路由上下文里读，在 fallback 里同样可用。
 *
 * 为什么不做 `useSyncExternalStore` / `useState` 初始化读取：`pendingPosterFor` 在
 * 服务端恒为 `null`（模块变量只在浏览器点击时写入），首屏 HTML 与 hydration 读到的
 * 都是 `null` → 两边都是灰块，不会 hydration mismatch。
 *
 * 用 `.hub-poster`（而不是 `.skeleton-hub-poster`）是为了**几何完全一致**：
 * 骨架里就已经是 180px / 2:3，等真内容换上同一个类，海报位置不动 —— 揭幕动画里
 * 那张海报不会跟着抖一下。
 */
export function HubSkeletonPoster() {
  return (
    <Suspense fallback={<GrayBlock />}>
      <HandoffPoster />
    </Suspense>
  );
}

function HandoffPoster() {
  const params = useParams<{ tmdbId?: string | string[] }>();
  const raw = params?.["tmdbId"];
  const tmdbId = Number(Array.isArray(raw) ? raw[0] : raw);
  const pending = Number.isInteger(tmdbId) ? pendingPosterFor(tmdbId) : null;

  if (pending === null) return <GrayBlock />;

  return (
    <PosterTransition name={pending.name}>
      <div className="hub-poster">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${POSTER}${pending.posterPath}`} alt="" />
      </div>
    </PosterTransition>
  );
}
