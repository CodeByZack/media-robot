import { connection, NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { isDemoMode } from "../../../lib/demo-mode";
import {
  testConnection,
  getCurrentAccountId,
  getWorkflowRepository,
  clearPan115GlobalMirrorForUnboundDrive,
  requireAuthenticatedAccountId,
  connectQuarkCookie,
  connectGuangYa,
  connectTianyiSson,
  connectPan123Token,
} from "../../../lib/workflow-runtime";

export async function POST(request: NextRequest) {
  await connection();

  if (isDemoMode()) {
    return NextResponse.json({ ok: false, message: "演示模式为只读，不支持此操作" }, { status: 403 });
  }

  const body = await request.json();

  try {
    switch (body.type) {
      case "test": {
        const result = await testConnection(await getCurrentAccountId(), body.storageId);
        revalidatePath("/settings");
        return NextResponse.json(result);
      }

      case "unbind": {
        let accountId: string;
        try {
          accountId = await requireAuthenticatedAccountId();
        } catch (error) {
          return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) });
        }
        const repository = getWorkflowRepository();
        const result = await repository.tryUnbindConnectedStorage(accountId, body.storageId);
        if (!result.ok) {
          if (result.reason === "active_runs") {
            return NextResponse.json({ ok: false, message: "该盘还有获取任务在进行，完成或取消后再取消绑定。" });
          }
          return NextResponse.json({ ok: false, message: "未找到该网盘。" });
        }
        if (result.storage.provider === "pan115") {
          try {
            await clearPan115GlobalMirrorForUnboundDrive(result.storage.providerUid, repository);
          } catch { /* best-effort */ }
        }
        revalidatePath("/settings");
        revalidatePath("/");
        return NextResponse.json({ ok: true, message: "已取消绑定（追踪记录已保留，重新绑定同一块盘即可恢复）。" });
      }

      case "connect-quark": {
        try {
          const { providerUid } = await connectQuarkCookie(body.cookie);
          revalidatePath("/settings");
          return NextResponse.json({ ok: true, message: `夸克网盘已连接（账号 ${providerUid.slice(0, 10)}…）。` });
        } catch (error) {
          return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) });
        }
      }

      case "connect-guangya": {
        try {
          const { providerUid } = await connectGuangYa(body.accessToken, body.refreshToken);
          revalidatePath("/settings");
          return NextResponse.json({ ok: true, message: `光鸭云盘已连接（账号 ${providerUid.slice(0, 10)}…）。` });
        } catch (error) {
          return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) });
        }
      }

      case "connect-tianyi": {
        try {
          const { providerUid } = await connectTianyiSson(body.sson);
          revalidatePath("/settings");
          return NextResponse.json({ ok: true, message: `天翼云盘已连接（账号 ${providerUid.slice(0, 10)}…）。` });
        } catch (error) {
          return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) });
        }
      }

      case "connect-pan123": {
        try {
          const { providerUid } = await connectPan123Token(body.token);
          revalidatePath("/settings");
          return NextResponse.json({ ok: true, message: `123网盘已连接（账号 ${providerUid.slice(0, 10)}…）。` });
        } catch (error) {
          return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : String(error) });
        }
      }

      default:
        return NextResponse.json({ ok: false, message: `未知操作类型: ${body.type}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, message: `操作失败：${message.slice(0, 200)}` }, { status: 500 });
  }
}
