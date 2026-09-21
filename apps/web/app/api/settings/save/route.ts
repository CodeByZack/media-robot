import { connection, NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "../../../../lib/demo-mode";
import {
  getWorkflowRepository,
  getCurrentAccountId,
  DAILY_SWEEP_TIMES_SETTING_KEY,
  MAX_DAILY_SWEEP_TIMES,
  PREFERRED_LANGUAGE_SETTING_KEY,
  QUALITY_PREFERENCE_SETTING_KEY,
  LLM_BASE_URL_SETTING_KEY,
  LLM_MODEL_ID_SETTING_KEY,
  LLM_API_KEY_SETTING_KEY,
  TMDB_API_KEY_SETTING_KEY,
  TMDB_BASE_URL_SETTING_KEY,
  ASSRT_TOKEN_SETTING_KEY,
  PANSOU_BASE_URL_SETTING_KEY,
  PANSOU_HEALTH_SETTING_KEY,
  PROWLARR_BASE_URL_SETTING_KEY,
  PROWLARR_API_KEY_SETTING_KEY,
  runScheduledType3,
} from "../../../../lib/workflow-runtime";
import { normalizeLlmBaseUrl, sanitizeLlmApiKey } from "@media-track/workflow";
import { probePanSou, validatePanSouBaseUrlFormat } from "../../../../lib/pansou-probe";

export async function POST(request: NextRequest) {
  await connection();

  if (isDemoMode()) {
    return NextResponse.json({ success: false, message: "演示模式为只读，不支持此操作" }, { status: 403 });
  }

  const body = await request.json();

  try {
    switch (body.type) {
      case "sweep": {
        const times = body.times as string[];
        if (!Array.isArray(times) || times.length === 0) {
          return NextResponse.json({ success: false, message: "至少保留一个时间点" });
        }
        const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
        const trimmed = times.map((t) => (typeof t === "string" ? t.trim() : ""));
        if (trimmed.some((t) => !HHMM.test(t))) {
          return NextResponse.json({ success: false, message: "时间格式应为 HH:MM" });
        }
        const clean = [...new Set(trimmed)].sort();
        if (clean.length > MAX_DAILY_SWEEP_TIMES) {
          return NextResponse.json({ success: false, message: `最多 ${MAX_DAILY_SWEEP_TIMES} 个时间点` });
        }
        await getWorkflowRepository().setSetting(DAILY_SWEEP_TIMES_SETTING_KEY, JSON.stringify(clean));
        return NextResponse.json({ success: true });
      }

      case "patrol-now": {
        const result = await runScheduledType3({ force: true });
        return NextResponse.json({ success: true, checked: result.outcomes.length });
      }

      case "language": {
        const language = String(body.language ?? "").trim();
        const repository = getWorkflowRepository();
        await repository.setAccountSetting(await getCurrentAccountId(), PREFERRED_LANGUAGE_SETTING_KEY, language);
        return NextResponse.json({ success: true });
      }

      case "quality": {
        const quality = String(body.quality ?? "").trim();
        const repository = getWorkflowRepository();
        await repository.setAccountSetting(await getCurrentAccountId(), QUALITY_PREFERENCE_SETTING_KEY, quality);
        return NextResponse.json({ success: true });
      }

      case "llm": {
        const repository = getWorkflowRepository();
        const accountId = await getCurrentAccountId();
        await repository.setAccountSetting(accountId, LLM_BASE_URL_SETTING_KEY, normalizeLlmBaseUrl(body.baseURL));
        await repository.setAccountSetting(accountId, LLM_MODEL_ID_SETTING_KEY, String(body.modelId ?? "").trim());
        const apiKey = sanitizeLlmApiKey(String(body.apiKey ?? ""));
        if (apiKey) {
          await repository.setAccountSetting(accountId, LLM_API_KEY_SETTING_KEY, apiKey);
        }
        return NextResponse.json({ success: true });
      }

      case "tmdb": {
        const repository = getWorkflowRepository();
        const accountId = await getCurrentAccountId();
        const trimmedKey = String(body.apiKey ?? "").trim();
        if (trimmedKey) {
          await repository.setAccountSetting(accountId, TMDB_API_KEY_SETTING_KEY, trimmedKey);
        }
        if (body.baseUrl !== undefined) {
          await repository.setAccountSetting(accountId, TMDB_BASE_URL_SETTING_KEY, String(body.baseUrl).trim());
        }
        return NextResponse.json({ success: true });
      }

      case "tmdb-clear": {
        const repository = getWorkflowRepository();
        const accountId = await getCurrentAccountId();
        await repository.setAccountSetting(accountId, TMDB_API_KEY_SETTING_KEY, "");
        await repository.setAccountSetting(accountId, TMDB_BASE_URL_SETTING_KEY, "");
        return NextResponse.json({ success: true });
      }

      case "assrt": {
        const repository = getWorkflowRepository();
        const accountId = await getCurrentAccountId();
        const token = String(body.token ?? "").trim();
        if (token) {
          await repository.setAccountSetting(accountId, ASSRT_TOKEN_SETTING_KEY, token);
        }
        return NextResponse.json({ success: true });
      }

      case "assrt-clear": {
        const repository = getWorkflowRepository();
        const accountId = await getCurrentAccountId();
        await repository.setAccountSetting(accountId, ASSRT_TOKEN_SETTING_KEY, "");
        return NextResponse.json({ success: true });
      }

      case "pansou": {
        const repository = getWorkflowRepository();
        const accountId = await getCurrentAccountId();
        const trimmed = String(body.baseURL ?? "").trim();
        if (!trimmed) {
          await repository.setAccountSetting(accountId, PANSOU_BASE_URL_SETTING_KEY, "");
          await repository.setAccountSetting(accountId, PANSOU_HEALTH_SETTING_KEY, "");
          return NextResponse.json({ success: true });
        }
        const format = validatePanSouBaseUrlFormat(trimmed);
        if (!format.ok) {
          return NextResponse.json({ success: false, message: format.message });
        }
        const probe = await probePanSou(trimmed);
        if (!probe.ok) {
          return NextResponse.json({ success: false, message: probe.message });
        }
        await repository.setAccountSetting(accountId, PANSOU_BASE_URL_SETTING_KEY, trimmed);
        await repository.setAccountSetting(accountId, PANSOU_HEALTH_SETTING_KEY, "ok");
        return NextResponse.json({ success: true });
      }

      case "prowlarr": {
        const repository = getWorkflowRepository();
        const accountId = await getCurrentAccountId();
        await repository.setAccountSetting(accountId, PROWLARR_BASE_URL_SETTING_KEY, String(body.baseURL ?? "").trim());
        const apiKey = String(body.apiKey ?? "").trim();
        if (apiKey) {
          await repository.setAccountSetting(accountId, PROWLARR_API_KEY_SETTING_KEY, apiKey);
        }
        return NextResponse.json({ success: true });
      }

      case "prowlarr-clear": {
        const repository = getWorkflowRepository();
        const accountId = await getCurrentAccountId();
        await repository.setAccountSetting(accountId, PROWLARR_BASE_URL_SETTING_KEY, "");
        await repository.setAccountSetting(accountId, PROWLARR_API_KEY_SETTING_KEY, "");
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, message: `未知操作类型: ${body.type}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message: `保存失败：${message.slice(0, 200)}` }, { status: 500 });
  }
}
