"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, ChevronRight, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { apiCall } from "../lib/api";
import type { RuleSaveResult, RuleResetResult } from "../lib/api-types";
import { BUILTIN_RULE_PATTERNS, type RuleRole } from "@mediarobot/workflow/ruleset";
import { ruleRowError, type RulePatternDraft } from "../lib/rule-patterns-utils";

/**
 * 正则区 UI(2026-09-07 用户拍板定稿 + 当晚微调):
 * - 节标题 + 右侧「恢复默认」;内置 N 条**只读**;
 * - 带季号 / 仅集号 两组可折叠(默认折叠);
 * - 每组标题行尾部「+ 添加」,点开才出现输入框;
 * - 自定义排在各组内置之后,每条独立 保存 / 编辑 / 删除。
 *
 * 2026-09 样式改造:内联样式全部换成 .rule-* 类(见 globals.css 的设置页区块),
 * 内置规则从「编号文本行」改成设计稿的 chip 列表 —— 更紧凑,且天然表达只读。
 * 功能与数据流未变。
 */

const ROLES: Array<{ role: RuleRole; title: string; note: string }> = [
  { role: "season-episode", title: "带季号", note: "文件名里同时带季号和集号,任何任务都认" },
  { role: "episode-only", title: "仅集号", note: "文件名里只有集号,仅单季任务启用" },
];

/** 内置槽位总数 = 自定义 sortOrder 起点。 */
const CUSTOM_ORDER_BASE = BUILTIN_RULE_PATTERNS.length;

/** 下一个自定义 ruleId 序号(整表替换保存,删除释放的序号可复用,取当前最大 +1)。 */
function nextCustomId(customs: RulePatternDraft[]): string {
  let max = 0;
  for (const c of customs) {
    const m = /^custom-(\d+)$/.exec(c.ruleId);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return "custom-" + (max + 1);
}

/** 保存前按数组位置重排 sortOrder,保证显示顺序 == 采集优先级顺序。 */
function indexSortOrder(customs: RulePatternDraft[]): RulePatternDraft[] {
  return customs.map((c, i) => ({ ...c, sortOrder: CUSTOM_ORDER_BASE + i }));
}

interface EditorState {
  role: RuleRole;
  editingId: string | null; // null = 新增
  expression: string;
}

export function RulePatternsForm({ initial }: { initial: RulePatternDraft[] }) {
  const [customs, setCustoms] = useState<RulePatternDraft[]>(initial);
  // 默认折叠(2026-09-07 用户拍板),点标题行展开;+ 添加 点击会自动展开该组。
  const [expanded, setExpanded] = useState<Record<RuleRole, boolean>>({
    "season-episode": false,
    "episode-only": false,
  });
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAdd(role: RuleRole) {
    setExpanded((prev) => ({ ...prev, [role]: true }));
    setEditor({ role, editingId: null, expression: "" });
    setEditorError(null);
  }

  function openEdit(role: RuleRole, row: RulePatternDraft) {
    setEditor({ role, editingId: row.ruleId, expression: row.expression });
    setEditorError(null);
  }

  function closeEditor() {
    setEditor(null);
    setEditorError(null);
  }

  function flash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  function persist(next: RulePatternDraft[], onSaved: () => void) {
    startTransition(async () => {
      const ordered = indexSortOrder(next);
      const r = await apiCall<RuleSaveResult>("/api/rules", { type: "save", patterns: ordered });
      if (!r.ok) {
        flash("❌ " + r.error);
        return;
      }
      if (!r.value.success) {
        flash("❌ " + (r.value.message ?? "保存失败"));
        return;
      }
      setCustoms(ordered);
      onSaved();
    });
  }

  function commit() {
    if (!editor || isPending) return;
    const expression = editor.expression.trim();
    const err = ruleRowError({ ruleId: "custom-x", role: editor.role, expression, sortOrder: 0 });
    if (err !== null) {
      setEditorError(err);
      return;
    }
    setEditorError(null);
    const ok = () => {
      setEditor(null);
      flash("✅ 已保存(下次采集任务即生效)");
    };
    if (editor.editingId === null) {
      const next = [
        ...customs,
        { ruleId: nextCustomId(customs), role: editor.role, expression, label: "自定义规则", sortOrder: 0, isDefault: false },
      ];
      persist(next, ok);
    } else {
      const next = customs.map((c) => (c.ruleId === editor.editingId ? { ...c, role: editor.role, expression } : c));
      persist(next, ok);
    }
  }

  function remove(row: RulePatternDraft) {
    if (isPending) return;
    const next = customs.filter((c) => c.ruleId !== row.ruleId);
    persist(next, () => flash("✅ 已删除"));
  }

  function handleReset() {
    if (isPending) return;
    startTransition(async () => {
      const r = await apiCall<RuleResetResult>("/api/rules", { type: "reset" });
      if (!r.ok) {
        flash("❌ " + r.error);
        return;
      }
      if (r.value.success) {
        setCustoms([]);
        setEditor(null);
        flash("✅ 已恢复默认(清空全部自定义)");
      } else {
        flash("❌ " + (r.value.message ?? "恢复失败"));
      }
    });
  }

  const editorForm = (role: RuleRole) => {
    const captureHint = role === "season-episode" ? "第 1 组季号、第 2 组集号" : "1 个捕获组:集号";
    return (
      <div className="rule-editor">
        <div className="rule-editor-row">
          <input
            value={editor?.expression ?? ""}
            onChange={(e) => setEditor((prev) => (prev ? { ...prev, expression: e.target.value } : prev))}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              else if (e.key === "Escape") closeEditor();
            }}
            placeholder={"正则,如 [Ss]([0-9]{1,2})_([0-9]{1,4}) —— " + captureHint}
            spellCheck={false}
            className="input input-mono"
            aria-label={role === "season-episode" ? "自定义带季号正则" : "自定义仅集号正则"}
          />
          <button type="button" className="primary-button" onClick={commit} disabled={isPending}>
            {isPending ? <LoaderCircle size={14} className="spin" aria-hidden /> : <Check size={14} aria-hidden />}
            保存
          </button>
          <button type="button" className="secondary-button" onClick={closeEditor} disabled={isPending}>
            <X size={14} aria-hidden />
            取消
          </button>
        </div>
        {editorError ? <span className="rule-editor-error">⚠ {editorError}</span> : null}
      </div>
    );
  };

  return (
    <div className="rule-form">
      <div className="rule-toolbar">
        <button type="button" className="rule-reset" onClick={handleReset} disabled={isPending}>
          恢复默认
        </button>
      </div>
      <p className="rule-note">
        正则只决定匹配文本；剥扩展名 / 集数守卫 / 年份排除 / 衍生黑名单由解析代码固定保留。
      </p>

      <div className="rule-list">
        {ROLES.map(({ role, title, note }) => {
          const isOpen = expanded[role] ?? false;
          const slots = BUILTIN_RULE_PATTERNS.filter((p) => p.role === role);
          const groupCustoms = customs.filter((c) => c.role === role);
          const editingThisGroup = editor?.role === role;
          const captureHint = role === "season-episode" ? "需 2 个捕获组：第 1 组季号、第 2 组集号" : "需 1 个捕获组：集号";
          return (
            <div className="rule-group" key={role}>
              <div
                className="rule-group-head"
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setExpanded((prev) => ({ ...prev, [role]: !prev[role] }))}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  setExpanded((prev) => ({ ...prev, [role]: !prev[role] }));
                }}
              >
                {isOpen ? <ChevronDown size={15} aria-hidden /> : <ChevronRight size={15} aria-hidden />}
                <strong className="rule-group-title">{title}</strong>
                {/* 角色徽章：设计稿 .role —— 把「这组要几个捕获组」变成一眼可读的标记 */}
                <span className="role">{role === "season-episode" ? "2 组" : "1 组"}</span>
                <span className="rule-group-note">{note}</span>
                <button
                  type="button"
                  className="rule-group-add"
                  onClick={(e) => {
                    e.stopPropagation();
                    openAdd(role);
                  }}
                >
                  ＋ 添加
                </button>
              </div>
              {isOpen ? (
                <div className="rule-group-body">
                  <div className="rule-hint">{captureHint}</div>
                  {/* 内置规则以 chip 展示（设计稿 .builtin）：紧凑，且天然表达只读 */}
                  <div className="builtin">
                    {slots.map((p) => (
                      <span className="chip" key={p.ruleId} title={p.example ? `例：${p.example}` : undefined}>
                        {p.expression}
                      </span>
                    ))}
                  </div>
                  {groupCustoms.length > 0 ? (
                    <div className="rule-customs">
                      {groupCustoms.map((c) => (
                        <div className="rule-row" key={c.ruleId}>
                          {editingThisGroup && editor.editingId === c.ruleId ? (
                            editorForm(role)
                          ) : (
                            <>
                              <code className="rule-expr">{c.expression}</code>
                              {c.label ? <span className="rule-row-label">{c.label}</span> : null}
                              <span className="rule-row-actions">
                                <button
                                  type="button"
                                  className="icon-act"
                                  onClick={() => openEdit(role, c)}
                                  disabled={isPending}
                                >
                                  <Pencil size={12} aria-hidden /> 编辑
                                </button>
                                <button
                                  type="button"
                                  className="icon-act danger"
                                  onClick={() => remove(c)}
                                  disabled={isPending}
                                >
                                  <Trash2 size={12} aria-hidden /> 删除
                                </button>
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {editingThisGroup && editor?.editingId === null ? editorForm(role) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {feedback ? <p className="panel-note">{feedback}</p> : null}
    </div>
  );
}
