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
 * 为什么是"永远渲染"而不是"点的时候才加 name"：用户可能用**浏览器前进/后退**完成同一
 * 次跳转（甚至直接键盘操作），那时没有任何点击事件可挂钩 —— 而 View Transition 是浏览器
 * 在导航时自己比对新旧树的。让 name 常驻，前进/后退也自然获得同样的形变。
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
  // ⚠️ 这里**没有** className：React 的 `ViewTransitionProps` 不含它（它的 `default`/
  // `enter`/`exit` 是 view-transition-class 不是元素 class）。页面样式写在真实元素上，
  // 动画写在 `::view-transition-*` 伪元素上 —— 后者是唯一能让共享元素动起来的写法。
  if (name === null) {
    // 退化成普通渲染：动画没了，内容照常。装饰性功能不该有"失败也把页面搞崩"的能力。
    return <>{children}</>;
  }
  return <ViewTransition name={name}>{children}</ViewTransition>;
}
