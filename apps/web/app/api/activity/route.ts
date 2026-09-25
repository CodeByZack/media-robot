import { connection, NextResponse } from "next/server";
import { getActivityView } from "../../../lib/activity-view";
import { ensureDemoSeeded, getWorkflowRepository, resolveCurrentWorkspace } from "../../../lib/workflow-runtime";

/**
 * Live activity feed for the /activity page: the queue+running set + recent
 * completed runs, scoped to the active drive. The client session-scopes
 * 已完成 by matching against the runIds it observed active.
 *
 * 盘不再从 `?w` 取 —— 改由 cookie 决定（resolveCurrentWorkspace 会做归属校验）。
 * 所以客户端的轮询 URL 里不再需要携带任何盘标识。
 */
export async function GET() {
  // Request-time only: keep this out of build-time prerender (it reads the DB).
  await connection();
  const repository = getWorkflowRepository();
  await ensureDemoSeeded(repository);
  const { accountId, connectedStorageId } = await resolveCurrentWorkspace();
  const view = await getActivityView({ repository, accountId, connectedStorageId });
  return NextResponse.json(view);
}
