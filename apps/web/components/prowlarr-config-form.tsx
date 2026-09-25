"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, LoaderCircle, Trash2 } from "lucide-react";
import { apiCall } from "../lib/api";
import type { SettingsResult } from "../lib/api-types";

export function ProwlarrConfigForm({ baseURL: initialBaseURL, apiKeySet }: { baseURL: string; apiKeySet: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [baseURL, setBaseURL] = useState(initialBaseURL);
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(apiKeySet);
  const [result, setResult] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      const r = await apiCall<SettingsResult>("/api/settings/save", { type: "prowlarr", baseURL, apiKey });
      if (!r.ok) {
        setResult(`❌ ${r.error}`);
        setTimeout(() => setResult(null), 3000);
        return;
      }
      const res = r.value;
      setResult(res.success ? "✅ 保存成功" : `❌ ${res.message ?? "保存失败"}`);
      if (res.success && apiKey.trim()) {
        setApiKey("");
        setHasKey(true);
      }
      setTimeout(() => setResult(null), 3000);
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      const r = await apiCall<SettingsResult>("/api/settings/save", { type: "prowlarr-clear" });
      if (!r.ok) {
        setResult(`❌ ${r.error}`);
        setTimeout(() => setResult(null), 3000);
        return;
      }
      const res = r.value;
      setResult(res.success ? "✅ 已清除" : `❌ ${res.message ?? "清除失败"}`);
      if (res.success) {
        setHasKey(false);
        setBaseURL("");
      }
      setTimeout(() => setResult(null), 3000);
    });
  };

  return (
    <div className="push-form">
      <p className="panel-note" style={{ marginBottom: 6 }}>
        Prowlarr 是索引器聚合器：用它把你的公共/私有种子站统一成一个 API，agent 搜资源时会把 Prowlarr 的磁力和网盘搜索结果合并判断。磁力靠 115 秒传（哈希匹配）瞬时转存。不填则只用内置网盘搜索。留空 API Key 不改动已保存的值。
      </p>
      <p className="hint-help" style={{ marginBottom: 12 }}>
        了解 Prowlarr{" "}
        <a href="https://prowlarr.com/" target="_blank" rel="noopener noreferrer">
          官网 <ExternalLink size={12} style={{ verticalAlign: "-1px" }} />
        </a>
      </p>
      <div className="field-row">
        <div className="field">
          <label htmlFor="prowlarr-base-url">Base URL（Prowlarr 实例地址）</label>
          <input
            id="prowlarr-base-url"
            type="text"
            className="input input-mono"
            value={baseURL}
            onChange={(event) => setBaseURL(event.target.value)}
            placeholder="形如 http://192.168.x.x:9696"
            aria-label="Prowlarr Base URL"
          />
        </div>
        <div className="field">
          <label htmlFor="prowlarr-api-key">API Key（设置 → General 里获取）</label>
          <input
            id="prowlarr-api-key"
            type="password"
            className="input input-mono"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={hasKey ? "已设置(留空不改)" : "粘贴 Prowlarr API Key"}
            aria-label="Prowlarr API Key"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="form-foot">
        <button type="button" className="primary-button" onClick={handleSave} disabled={isPending}>
          {isPending ? <LoaderCircle size={14} className="spin" aria-hidden /> : <Check size={14} aria-hidden />}
          保存
        </button>
        {hasKey ? (
          <button type="button" className="secondary-button" onClick={handleClear} disabled={isPending}>
            <Trash2 size={14} aria-hidden />
            清除
          </button>
        ) : null}
        {result ? <span className="panel-note">{result}</span> : null}
      </div>
    </div>
  );
}
