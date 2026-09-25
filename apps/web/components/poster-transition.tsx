"use client";

import { ViewTransition } from "react";

/**
 * 海报的共享元素包装 —— 让"媒体库卡片 → 详情页大图"在导航时形变成同一张图，
 * 而不是小图消失、大图突兀出现。
 *
 * 为什么要这个组件而不是各处直接用 `<ViewTransition>`：两侧必须用**同一个 name**，
 * 而 name 的拼法有坑（见 lib/poster-transition.ts：TMDB 的 movie/tv 是两套 id 命名
 * 空间，名字重复会让过渡**静默不发生**）。把拼法收敛到一个函数，两边就不可能拼歪。
 *
 * 为什么是"永远渲染"而不是"点的时候才加 name"：View Transition 是浏览器在导航时
 * 自己比对新旧树、按 name 配对的，没有点击事件可挂钩。让 name 常驻，任何**能触发
 * React transition 的导航**（`<Link>`、`router.push`）都会自动获得同样的形变。
 *
 * ⚠️ **popstate 那条路径例外**：`router.back()` 走 popstate，**跨路由**回退不触发
 * 过渡（同路由回退会触发；实测 3 轮一致，详见 DESIGN.md 的四象限表）。所以详情页的
 * 返回按钮不再用 `back()`，而是「记下来路 → `router.replace(来路)`」：普通导航，
 * 照样有形变，而且来路 URL 带着完整状态（`?type=`/`?filter=`/`?q=`）。
 * ❗️本文件早期版本写的是「后退**完全**不触发」，那是**错的** —— 只在跨路由场景
 * 测过就下了结论。请勿用单一场景的实测去推断「某功能完全不支持」。
 *
 * ⚠️ `name` 在同一时刻的整棵树里必须唯一 —— 所以同一部作品在同一页只能出现一次带
 * name 的元素。若日后出现"同一个卡片渲染两遍"的布局（例如桌面/移动双份），需要改成
 * 只给可见的那一份加 name。
 */
export function PosterTransition({
  name,
  children,
}: {
  /** null = 拿不到可靠的名字 → 不做过渡（见 lib/poster-transition.ts）。 */
  name: string | null;
  children: React.ReactNode;
}) {
  // ⚠️ 这里**没有** className：React 的 `ViewTransitionProps` 不含它（`share`/`enter`/
  // `exit` 是 view-transition-class 不是元素 class）。页面样式写在真实元素上，
  // 动画写在 `::view-transition-*` 伪元素上 —— 后者是唯一能让共享元素动起来的写法。
  if (name === null) {
    // 退化成普通渲染：动画没了，内容照常。装饰性功能不该有"失败也把页面搞崩"的能力。
    return <>{children}</>;
  }
  // `share="morph"` / `default="none"` 是 React 官方文档给共享元素形变的写法：
  //   · `share` 只在**两侧同名配对**时生效，并给伪元素挂上 `.morph` 类 → CSS 可选中
  //     （元素名带 tmdbId、运行时生成，静态选择器选不到，只能靠 class）。
  //   · `default="none"` 关掉"本元素在其他任何过渡里也跟着淡入淡出"的默认行为。
  // ⚠️ 官方文档明确警告：**配了 `default="none"` 就必须同时给 `share`** —— 只给
  // `default="none"` 会让配对静默失去形变（不报错）。所以这两个 prop 是一对。
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
