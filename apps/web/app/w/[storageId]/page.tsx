import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  DRIVE_COOKIE_NAME,
  getCurrentAccountId,
  getWorkflowRepository,
} from "../../../lib/workflow-runtime";
import { isRegisteredStorageProvider } from "@mediarobot/workflow";

/**
 * 老的 `/w/<storageId>` 工作区链接 —— 兼容层。
 *
 * 盘不再进 URL（改由 cookie 决定），所以这个路由不再是页面，而是一个**重定向器**：
 * 把"你想去某块盘"这个意图写进 cookie，然后把用户送到对应的新地址。
 *
 * 为什么保留而不是直接删：旧链接散落在书签、浏览器历史、以及用户之间抄来抄去的地址
 * 里。删掉它们会变成 404 —— 而用户的意图完全明确，能读懂就该读懂。
 *
 * 目标地址按 `?tab=` 判断（旧实现里它决定搜索面还是媒体库面）。未知 storageId 也照样
 * redirect 到 `/`，由 cookie 解析层回退主盘 —— 与旧 `/w/<id>` 的 404 行为不同，但更符合
 * "盘只是偏好"的新模型：请求一块已不存在的盘，回退比报错有用。
 */
export default async function WorkspaceRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ storageId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { storageId } = await params;
  const sp = (await searchParams) ?? {};
  const tabRaw = sp["tab"];
  const tab = Array.isArray(tabRaw) ? tabRaw[0] : tabRaw;

  // 只在真的拥有该盘时种 cookie —— 否则保持现有偏好不动（不要用垃圾值覆盖它）。
  const accountId = await getCurrentAccountId();
  const storages = (await getWorkflowRepository().listConnectedStorages(accountId)).filter((storage) =>
    isRegisteredStorageProvider(storage.provider),
  );
  if (storages.some((storage) => storage.id === storageId)) {
    const store = await cookies();
    store.set(DRIVE_COOKIE_NAME, storageId, {
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
  }

  // 保留查询参数里的筛选（type/filter）与搜索词（q），否则点旧书签会丢掉筛选状态。
  const forwarded = new URLSearchParams();
  for (const key of ["q", "type", "filter"]) {
    const v = sp[key];
    const value = Array.isArray(v) ? v[0] : v;
    if (value) forwarded.set(key, value);
  }
  const qs = forwarded.toString();
  redirect(`${tab === "library" ? "/library" : "/"}${qs ? `?${qs}` : ""}`);
}
