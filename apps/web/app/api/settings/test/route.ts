import { connection, NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "../../../../lib/demo-mode";
import {
  requireAuthenticatedAccountId,
  getAccountScopedSettings,
  resolveAgentModelConfig,
  getWorkflowRepository,
  getTmdbAccesses,
} from "../../../../lib/workflow-runtime";
import { createAgentModel, llmConfigError, fetchTmdbList } from "@mediarover/workflow";
import { generateText } from "ai";

export async function POST(request: NextRequest) {
  await connection();

  if (isDemoMode()) {
    return NextResponse.json({ success: false, message: "演示模式为只读，不支持此操作" }, { status: 403 });
  }

  const body = await request.json();

  try {
    switch (body.type) {
      case "llm-test": {
        const accountId = await requireAuthenticatedAccountId();
        const cfg = await resolveAgentModelConfig(getAccountScopedSettings(accountId));
        const configError = llmConfigError(cfg);
        if (configError) {
          return NextResponse.json({ ok: false, message: configError });
        }
        const model = createAgentModel(cfg);
        await generateText({ model, prompt: "ping" });
        return NextResponse.json({ ok: true, message: `连接正常 · ${cfg.modelId}` });
      }

      case "tmdb-test": {
        const repository = getWorkflowRepository();
        const accountId = await requireAuthenticatedAccountId();
        const accesses = await getTmdbAccesses({
          getSetting: (key: string) => repository.getAccountSetting(accountId, key),
        });
        if (accesses.length === 0) {
          return NextResponse.json({ success: false, message: "未配置 TMDB API Key" });
        }
        await fetchTmdbList(accesses, "configuration");
        return NextResponse.json({ success: true, message: "连接成功" });
      }

      default:
        return NextResponse.json({ success: false, message: `未知操作类型: ${body.type}` }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: `连接失败：${msg.slice(0, 200)}` }, { status: 500 });
  }
}
