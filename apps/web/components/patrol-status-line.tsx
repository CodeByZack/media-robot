import { connection } from "next/server";
import { getAccountScopedSettings, getCurrentAccountId, getDailySweepTimes, getWorkflowRepository, beijingDateTime } from "../lib/workflow-runtime";
import { patrolStatusLine } from "../lib/patrol-status";
import { isDemoMode } from "../lib/demo-mode";

/**
 * 侧栏底部的「巡检运行中 · 下次 HH:MM」状态行。
 *
 * `AppSidebar` 出现在部分页面的**静态壳**里，所以光有 Suspense 不够 ——
 * 与 `WorkspaceSwitcherLoader` 同理：`await connection()` 把读取推迟到请求期，
 * 让 fallback 预渲染，否则 `docker build`（无 MEDIA_TRACK_SQLITE_PATH）会炸。
 *
 * 读失败一律不渲染：巡检状态是**装饰性**信息，它的读取失败不该把整个侧栏
 * （进而是整页）拖下水。宁可少一行，不可白屏。
 */
export async function PatrolStatusLine() {
  await connection();

  // 只读演示站上巡检并不会真的跑，显示"巡检运行中"等于编造状态。
  // 设计铁律：拿不到真实状态就如实标注，不要给一个好看但假的绿灯。
  if (isDemoMode()) {
    return null;
  }

  let times: string[];
  try {
    const repository = getWorkflowRepository();
    // 设置按账号作用域存，与设置页「每日定时巡检」读的是同一份数据。
    times = await getDailySweepTimes(getAccountScopedSettings(await getCurrentAccountId()));
  } catch {
    return null;
  }

  const line = patrolStatusLine(times, beijingDateTime().hhmm);
  if (!line) {
    return null;
  }

  return (
    <p className="sidebar-status" title={`已启用 ${times.length} 个巡检时间点（北京时间）`}>
      <span className="sidebar-status-dot" aria-hidden />
      <span>{line.headline}</span>
      <span className="sidebar-status-detail">{line.detail}</span>
    </p>
  );
}
