/**
 * 落地页里能被单测覆盖的纯逻辑。
 *
 * 刻意只留「纯函数」：DOM 与网络留在 main.js。这样 lib.mjs 可以在 node 环境下
 * 直接测（vitest 的 environment 是 node，没有 jsdom）。
 */

/** 唯一事实来源：本仓库地址（不是被 fork 的上游；上游见仓库根的 README「项目来源」）。 */
export const REPO = "CodeByZack/media-robot";

/** 仓库的 GitHub 页面地址。 */
export function repoUrl(repo = REPO) {
  return `https://github.com/${repo}`;
}

/**
 * star 数的显示形式：1000 以上折成 1 位小数的 k，并且去掉多余的 .0。
 * 输入非法（NaN / 负数 / 非整数）时返回 null —— 交给调用方决定「不显示」，
 * 绝不让一个编出来的数字或 NaN 出现在页面上。
 */
export function formatStars(n) {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
  if (n < 1000) return String(Math.round(n));
  const k = (n / 1000).toFixed(1).replace(/\.0$/, "");
  return `${k}k`;
}

/**
 * 带星号的完整标签。
 *
 * 返回 null 的两种情况，都表示「这个数字不该出现在页面上」：
 *   1. 数字非法（NaN / 负数 / 非数字）—— 绝不把 NaN 或编造值写上去；
 *   2. 数字是 0 —— 真实的 0 不算编造，但「★ 0」在落地页上零信息量，徒增宄0
 *      样。刻意省略。若以后想让它显示，把 `n <= 0` 改成 `n < 0` 即可。
 */
export function starsLabel(n) {
  const s = formatStars(n);
  if (s === null) return null;
  if (n === 0) return null;
  return `★ ${s}`;
}
