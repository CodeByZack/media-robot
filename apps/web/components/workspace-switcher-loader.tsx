import { connection } from "next/server";
import { switcherItems } from "@mediarobot/workflow";
import { resolveCurrentWorkspace } from "../lib/workflow-runtime";
import { providerMark } from "../lib/provider-display";
import { WorkspaceSwitcher } from "./workspace-switcher";

/**
 * Server loader for the drive switcher: fetches the account's connected drives
 * (sanitized — no cookie) and hands the computed tab list to the client switcher.
 * Renders nothing for 0–1 drives, so single-user/single-drive sees no chrome.
 *
 * `AppSidebar` renders this in some pages' STATIC shell, so a Suspense boundary
 * alone is NOT enough under cacheComponents — Next would prerender this at build
 * and the DB read crashes when there's no MEDIA_TRACK_SQLITE_PATH (e.g. `docker
 * build`). `await connection()` marks it dynamic so the read defers to request
 * time and the fallback (null) prerenders. Mirrors every other DB-reading server
 * component (ForeignWorkReview / ActivitySurface / show / settings / notifications).
 */
export async function WorkspaceSwitcherLoader() {
  await connection();
  // 当前盘来自 cookie（resolveCurrentWorkspace 已做归属校验），所以这里不再需要从
  // pathname 推 active —— 旧实现要靠客户端读 /w/<id> 才知道哪块盘是当前。
  const { storages, connectedStorageId } = await resolveCurrentWorkspace();
  if (storages.length < 2) {
    return null;
  }
  const tabs = switcherItems(
    storages.map((storage) => ({
      id: storage.id,
      label: storage.label,
      provider: storage.provider,
      providerUid: storage.providerUid,
      createdAt: storage.createdAt,
      status: storage.status,
    })),
    connectedStorageId,
    // `mark` 在这里算好再传：客户端组件不能 import workflow 的 barrel
    // （node:sqlite 会进浏览器 chunk），所以标识字符必须由服务端 props 下发。
    // 与设置页盘卡、添加网盘胶囊共用 providerMark，保证三处长得一样。
  ).map((item) => ({
    id: item.id,
    label: item.label,
    mark: providerMark(item.provider ?? ""),
    isActive: item.isActive,
    frozen: item.frozen,
  }));
  return <WorkspaceSwitcher tabs={tabs} />;
}
