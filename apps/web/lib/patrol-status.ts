/**
 * 侧栏「巡检运行中」状态行的纯计算。
 *
 * 为什么要单独抽出来：侧栏在每个页面都渲染，巡检时间点来自数据库。显示什么字
 * （尤其"下一个时间点跨天回绕"这条）值得单测钉住，而不是埋在 JSX 里靠肉眼验。
 *
 * 数据来源与设置页的「每日定时巡检」同一份：`getDailySweepTimes` 已做
 * 升序 + 去重 + 范围校验 + 1~6 条截断，正常调用无需重复校验；这里的校验是
 * 给「直接传裸数组」的调用方兜底，保持函数自身不信任输入。
 */

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface PatrolStatusLine {
  /** 常显短语（呼吸点之后的主文案）。 */
  headline: string;
  /** 等宽补充：下一次运行时间。 */
  detail: string;
}

/**
 * 下一个巡检时间点。
 *
 * 取第一个**晚于**当前时刻的——注意是严格大于：正好到点时该班次已在跑，
 * 显示"下次"应为再下一班。都过了就回绕到次日第一班（这也符合巡检的
 * 「错过整天不重放」语义：今天的班次不会再补，下次就是明天那一班）。
 *
 * @returns 无有效时间点时返回 null（调用方据此不渲染状态行）。
 */
export function nextSweepSlot(times: readonly string[], hhmm: string): string | null {
  const valid = times.filter((slot): slot is string => HHMM_RE.test(slot)).sort();
  if (valid.length === 0) return null;
  return valid.find((slot) => slot > hhmm) ?? valid[0]!;
}

/**
 * 组装状态行文案。
 *
 * 刻意**不**显示"上次巡检"：那是设置页「每日定时巡检」面板的职责，侧栏只需要
 * 一个"它是活的、下次几点"的信号。两处都显示会变成两份要同步维护的文案。
 *
 * @returns 无有效时间点（或 hhmm 非法）时返回 null。
 */
export function patrolStatusLine(
  times: readonly string[],
  hhmm: string,
): PatrolStatusLine | null {
  if (!HHMM_RE.test(hhmm)) return null;
  const next = nextSweepSlot(times, hhmm);
  if (!next) return null;
  return { headline: "巡检运行中", detail: `下次 ${next}` };
}
