"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { apiCall } from "../lib/api";
import type { SettingsResult } from "../lib/api-types";
import { SegmentedControl } from "./segmented-control";

const LANGUAGES = [
  { key: "中文", label: "中文（默认）" },
  { key: "English", label: "English" },
  { key: "日本語", label: "日本語" },
  { key: "any", label: "不限（最大化覆盖）" },
] as const;

export function PreferredLanguageForm({ initial }: { initial: string }) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initial || "中文");
  const [result, setResult] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      const r = await apiCall<SettingsResult>("/api/settings/save", { type: "language", language: value });
      if (!r.ok) {
        setResult(`❌ ${r.error}`);
        setTimeout(() => setResult(null), 3000);
        return;
      }
      const res = r.value;
      setResult(res.success ? "✅ 保存成功" : `❌ ${res.message}`);
      setTimeout(() => setResult(null), 3000);
    });
  };

  return (
    <div className="push-form">
      {/* 选项值保持真实语义不变（中文 / English / 日本語 / 不限）——只把下拉框换成
          设计稿的分段控件，功能零变化。 */}
      <SegmentedControl
        label="偏好语言"
        options={LANGUAGES}
        value={value as (typeof LANGUAGES)[number]["key"]}
        onChange={(next) => setValue(next)}
        disabled={isPending}
      />
      <div className="form-foot">
        <button type="button" className="primary-button" onClick={handleSave} disabled={isPending}>
          {isPending ? <LoaderCircle size={14} className="spin" aria-hidden /> : <Check size={14} aria-hidden />}
          保存
        </button>
        {result ? <span className="panel-note">{result}</span> : null}
      </div>
    </div>
  );
}
