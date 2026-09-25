import { connection, NextResponse } from "next/server";
import {
  ensureDemoSeeded,
  getWorkflowRepository,
  notificationWindowSince,
  resolveCurrentWorkspace,
} from "../../../../lib/workflow-runtime";

/**
 * Lightweight feed metadata for the 通知 nav unread badge: the recent notification
 * timestamps, newest first. The client compares them against its localStorage
 * lastSeen to compute the unread count + mark NEW items — no server-side per-user
 * read state (the "按浏览器消费" model). Scoped to the active drive (cookie).
 */
export async function GET() {
  // Request-time only: keep this out of build-time prerender (it reads the DB).
  await connection();
  const repository = getWorkflowRepository();
  await ensureDemoSeeded(repository);
  const { accountId, connectedStorageId } = await resolveCurrentWorkspace();
  // Mirror the 通知 page's 7-day window so the unread badge can't count items the
  // page won't show (otherwise the badge would be unclearable).
  const notifications = await repository.listNotifications({
    limit: 50,
    accountId,
    connectedStorageId,
    since: notificationWindowSince(),
  });
  return NextResponse.json({ createdAts: notifications.map((notification) => notification.createdAt) });
}
