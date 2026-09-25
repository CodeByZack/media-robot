import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { AcquireResult } from "../lib/api-types";

/**
 * A request is "locked" once it has been queued, is already tracked, or has an
 * active workflow — in every case the acquire control should stop offering to
 * re-queue. Shared so the four acquire components agree on the exact set of
 * terminal/in-flight statuses instead of each re-listing them.
 */
export function isLockedResult(result: AcquireResult | null): boolean {
  return (
    result?.status === "requested" ||
    result?.status === "already_tracked" ||
    result?.status === "active_workflow"
  );
}

/**
 * 获取操作的结果提示。
 *
 * **必须显示失败，不能只显示 llm_not_configured** —— 早先它只认这一个状态，而
 * 调用方把"请求失败"（网络错误、服务端拒绝、该盘不支持该资源）一律设为
 * `unsupported`，于是**点「获取」失败后界面毫无反应**：按钮恢复可点，没有任何说明。
 * 用户只会觉得"点了没用"，而真实原因（例如该网盘不支持磁力）完全看不到。
 *
 * 只对"锁定类"状态返回 null：那些情况下按钮自己已经变成「已请求/已追踪」，
 * 再叠一段文字是重复。
 */
export function AcquireResultNotice({
  result,
}: {
  result: AcquireResult | null;
}) {
  if (result === null || isLockedResult(result)) {
    return null;
  }
  return <p className="request-result">{result.message}</p>;
}

/** The standalone "已请求" pill shown after a request is queued (spinner — it is
 *  NOT done, only accepted). Shared by the badge-style acquire controls. It links
 *  to the live 活动 page so the real, persistent progress is one click away instead
 *  of a manual nav (the 投产 feedback gap the author flagged: "真实情况要去活动里看").
 *  The href is built inline (mirrors workflow's globalNavHref) — NOT imported from
 *  the @mediarobot/workflow barrel, which would drag pg/postgres into this client
 *  bundle and break the Next build. */
export function RequestedBadge({
  title,
}: {
  title?: string | undefined;
  /** Active drive — scopes the 活动 link with ?w so leaving keeps the drive. */
}) {
  const href = "/activity";
  return (
    <Link className="hub-badge tone-green" href={href} title={title ?? "查看获取进度（活动）"}>
      <LoaderCircle size={12} className="spin" aria-hidden />
      已请求
    </Link>
  );
}
