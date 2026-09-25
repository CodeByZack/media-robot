import { NextResponse, type NextRequest } from "next/server";
import {
  DRIVE_COOKIE_NAME,
  getCurrentAccountId,
  getWorkflowRepository,
  isCookieSecure,
} from "../../../lib/workflow-runtime";
import { isRegisteredStorageProvider } from "@mediarobot/workflow";

/**
 * 切换当前网盘工作区（种 cookie）。
 *
 * 为什么是一个接口而不是导航 —— 因为盘已经不在 URL 里了：切换只是改一个会话偏好，
 * URL 一个字都不变。旧实现里切盘要算出"目标盘在本功能区的 URL"（switcherTabHref），
 * 现在那个函数整个不存在了，这里只需写 cookie + 让客户端 router.refresh()。
 *
 * 归属校验是必须的：cookie 由客户端提交，不能因为请求里带了某个 id 就认为该盘属于
 * 当前账号。不属于则 403（而不是静默回退 —— 静默回退会让"切盘没反应"无从排查）。
 *
 * 与 auth/login 一致：httpOnly 之外的属性都按同一套规则（sameSite=lax、secure 依
 * 请求 scheme 判定），这样走 Cloudflare 隧道时 cookie 不会因 scheme 判断错而丢失。
 */
export async function POST(request: NextRequest) {
  let driveId: unknown;
  try {
    ({ driveId } = (await request.json()) as { driveId?: unknown });
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof driveId !== "string" || driveId === "") {
    return NextResponse.json({ error: "driveId required" }, { status: 400 });
  }

  const accountId = await getCurrentAccountId();
  const storages = (await getWorkflowRepository().listConnectedStorages(accountId)).filter(
    (storage) => isRegisteredStorageProvider(storage.provider),
  );
  if (!storages.some((storage) => storage.id === driveId)) {
    return NextResponse.json({ error: "unknown drive" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DRIVE_COOKIE_NAME, driveId, {
    // 非凭证，只是偏好 → 不需要 httpOnly（客户端读它也没用，但不必设限）。
    sameSite: "lax",
    secure: isCookieSecure(request),
    path: "/",
    // 一年。它不是凭证，没有理由随会话消失 —— 用户切过盘之后不该下次打开又变回去。
    maxAge: 365 * 24 * 60 * 60,
  });
  return response;
}
