"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { apiCall } from "../lib/api";
import type { SettingsResult } from "../lib/api-types";
import { SegmentedControl } from "./segmented-control";

const QUALITIES = [
  { key: "any", label: "不限（默认）" },
  { key: "high", label: "高画质（≈4K）" },
  { key: "medium", label: "中画质（≈1080p）" },
] as const;

export function QualityPreferenceForm({ initial }: { initial: string }) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initial || "any");
  const [result, setResult] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      const r = await apiCall<SettingsResult>("/api/settings/save", { type: "quality", quality: value });
      if (!r.ok) {
        setResult(`❌ ${r.error}`);
        setTimeout(() => setResult(null), 3000);
        return;
      }
      const res = r.value;
      setResult(res.success ? "✅ 保存成功" : `❌ ${res.message ?? "保存失败"}`);
      setTimeout(() => setResult(null), 3000);
    });
  };

  return (
    <div className="push-form">
      {/* 选项值保持真实语义不变（不限 / 高画质 / 中画质）——只把下拉框换成设计稿的
          分段控件，功能零变化。 */}
      <SegmentedControl
        label="偏好画质"
        options={QUALITIES}
        value={value as (typeof QUALITIES)[number]["key"]}
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
