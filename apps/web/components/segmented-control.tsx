"use client";

import { useRef, type KeyboardEvent } from "react";

/**
 * 设置页的分段控件（设计稿 .seg）。
 *
 * 用途：在少量互斥选项里选一个。语义上是单选，所以用 WAI-ARIA 的
 * radiogroup / radio + aria-checked（而不是 aria-pressed 的 toggle 按钮，
 * 也不是 tablist —— 它不切换面板）。
 *
 * 设计要点（见 DESIGN.md §6）：激活档刻意用 --bg-card-alt（设计稿里叫
 * --surface-3）的中性抬色而不是巡弋蓝，避免和同屏的主操作抢注意力。
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  /** 无障碍名（radiosroup 的可读标签）。 */
  label: string;
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  const refs = useRef(new Map<T, HTMLButtonElement | null>());

  // roving tabindex：只有选中项可 Tab 进入，方向键在组内移动并即时选中。
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = options.findIndex((option) => option.key === value);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = options[(currentIndex + step + options.length) % options.length];
    if (!next) return;
    onChange(next.key);
    refs.current.get(next.key)?.focus();
  };

  return (
    <div className="seg" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            ref={(node) => {
              refs.current.set(option.key, node);
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={active ? "is-active" : undefined}
            disabled={disabled}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
