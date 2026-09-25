import { connection, NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "../../../lib/demo-mode";
import { getWorkflowRepository, requireAuthenticatedAccountId } from "../../../lib/workflow-runtime";
import {
  validateRuleExpression,
  isArbitrationKind,
  validatePromptBody,
  BUILTIN_RULE_PATTERNS,
  compileEpisodeRules,
  episodeCodeFromFileName,
  loadEpisodeRules,
  loadRulePatterns,
  BUILTIN_RULE_IDS,
} from "@mediarobot/workflow";
import type { EpisodeParseRules } from "@mediarobot/workflow";

export async function POST(request: NextRequest) {
  await connection();

  const body = await request.json();

  try {
    switch (body.type) {
      case "save": {
        if (isDemoMode()) {
          return NextResponse.json({ success: false, message: "演示模式为只读" }, { status: 403 });
        }
        await requireAuthenticatedAccountId();
        const patterns = body.patterns as Array<{
          ruleId: string; role: string; expression: string; label?: string; sortOrder: number; isDefault?: boolean;
        }>;
        const errors: Record<string, string> = {};
        const valid: Array<{
          ruleId: string; role: "season-episode" | "episode-only"; expression: string; label: string; sortOrder: number; isDefault: boolean;
        }> = [];
        for (const draft of patterns) {
          if (BUILTIN_RULE_IDS.has(draft.ruleId)) continue;
          const role = draft.role as "season-episode" | "episode-only";
          const error = validateRuleExpression(role, draft.expression);
          if (error !== null) { errors[draft.ruleId] = error; continue; }
          valid.push({
            ruleId: draft.ruleId,
            role,
            expression: draft.expression.trim(),
            label: draft.label ?? "",
            sortOrder: draft.sortOrder,
            isDefault: draft.isDefault !== false,
          });
        }
        if (Object.keys(errors).length > 0) {
          return NextResponse.json({ success: false, message: "部分规则校验失败，未保存", errors });
        }
        await getWorkflowRepository().replaceRulePatterns(valid);
        return NextResponse.json({ success: true });
      }

      case "reset": {
        if (isDemoMode()) {
          return NextResponse.json({ success: false, message: "演示模式为只读" }, { status: 403 });
        }
        await requireAuthenticatedAccountId();
        await getWorkflowRepository().replaceRulePatterns([]);
        return NextResponse.json({ success: true });
      }

      case "save-prompts": {
        if (isDemoMode()) {
          return NextResponse.json({ success: false, message: "演示模式为只读" }, { status: 403 });
        }
        await requireAuthenticatedAccountId();
        const drafts = body.drafts as Array<{ arbitrationKind: string; promptText: string }>;
        const errors: Record<string, string> = {};
        const valid: Array<{ arbitrationKind: string; promptText: string; isActive: boolean }> = [];
        for (const draft of drafts) {
          if (!isArbitrationKind(draft.arbitrationKind)) { errors[draft.arbitrationKind] = "未知 kind"; continue; }
          const body2 = draft.promptText.trim();
          if (body2.length === 0) continue;
          const error = validatePromptBody(body2);
          if (error !== null) { errors[draft.arbitrationKind] = error; continue; }
          valid.push({ arbitrationKind: draft.arbitrationKind, promptText: body2, isActive: true });
        }
        if (Object.keys(errors).length > 0) return NextResponse.json({ success: false, errors });
        await getWorkflowRepository().replacePromptOverrides(valid);
        return NextResponse.json({ success: true });
      }

      case "reset-prompts": {
        if (isDemoMode()) {
          return NextResponse.json({ success: false, message: "演示模式为只读" }, { status: 403 });
        }
        await requireAuthenticatedAccountId();
        await getWorkflowRepository().replacePromptOverrides([]);
        return NextResponse.json({ success: true });
      }

      case "test-episode": {
        // 只读操作，demo 模式也可用
        const fileName = String(body.fileName ?? "").trim();
        const multiSeason = Boolean(body.multiSeason);
        const seasons = multiSeason ? [1, 2] : [1];
        if (fileName.length === 0) return NextResponse.json({ code: null, matched: null, message: "文件名不能为空" });

        const repository = getWorkflowRepository();
        const rules = await loadEpisodeRules(repository);
        const code = episodeCodeFromFileName(fileName, seasons, undefined, rules);
        const patterns = await loadRulePatterns(repository);
        const compiled = compileEpisodeRules(patterns);
        const builtinRules = compileEpisodeRules(BUILTIN_RULE_PATTERNS);
        const NEVER = /[^\s\S]/;
        const slot = (n: "sxxexx" | "variant" | "epOnly" | "cross" | "chinese" | "digits") =>
          compiled[n] ?? builtinRules[n] ?? NEVER;
        const isolate = (active: EpisodeParseRules): EpisodeParseRules => ({
          sxxexx: NEVER, variant: NEVER, epOnly: NEVER, cross: NEVER, chinese: NEVER, digits: NEVER,
          custom: [], ...active,
        });
        const probe: Array<[string, EpisodeParseRules]> = [
          ["sxxexx", isolate({ sxxexx: slot("sxxexx") })],
          ["variant", isolate({ variant: slot("variant") })],
          ["ep-only", isolate({ epOnly: slot("epOnly") })],
          ["cross", isolate({ cross: slot("cross") })],
          ["chinese", isolate({ chinese: slot("chinese") })],
          ["digits", isolate({ digits: slot("digits") })],
          ...(compiled.custom ?? []).map((c, i): [string, EpisodeParseRules] => [`自定义 ${i + 1}`, isolate({ custom: [c] })]),
        ];
        const ROLE_LABEL: Record<string, string> = { "season-episode": "带季号", "episode-only": "仅集号" };
        const builtinById = new Map(BUILTIN_RULE_PATTERNS.map((p) => [p.ruleId, p] as const));
        const customs = patterns.filter((p) => !builtinById.has(p.ruleId));
        const builtinSerial = (b: (typeof BUILTIN_RULE_PATTERNS)[number]) =>
          String(BUILTIN_RULE_PATTERNS.filter((p) => p.role === b.role).indexOf(b) + 1);
        const customSerial = (c: (typeof BUILTIN_RULE_PATTERNS)[number]) =>
          "自" + (customs.filter((x) => x.role === c.role).indexOf(c) + 1);
        let matched: string | null = null;
        for (const [label, slotRules] of probe) {
          const slotCode = episodeCodeFromFileName(fileName, seasons, undefined, slotRules);
          if (slotCode !== null) {
            const builtin = /^自定义 \d+$/.test(label) ? null : builtinById.get(label);
            if (builtin) {
              matched = `${ROLE_LABEL[builtin.role] ?? builtin.role} · ${builtinSerial(builtin)} · ${builtin.expression}`;
            } else {
              const c = customs[Number(label.slice(4)) - 1];
              matched = c ? `${ROLE_LABEL[c.role] ?? c.role} · ${customSerial(c)} · ${c.expression}` : label;
            }
            break;
          }
        }
        return NextResponse.json({ code, matched });
      }

      default:
        return NextResponse.json({ success: false, message: `未知操作类型: ${body.type}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message: `操作失败：${message.slice(0, 200)}` }, { status: 500 });
  }
}
