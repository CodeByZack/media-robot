"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, LoaderCircle, Trash2 } from "lucide-react";
import { apiCall } from "../lib/api";
import type { SettingsResult, TestTmdbResult } from "../lib/api-types";

export function TmdbApiKeyForm({ apiKeySet, baseUrlSet, currentBaseUrl }: { apiKeySet: boolean; baseUrlSet: boolean; currentBaseUrl?: string }) {
  const [isPending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(currentBaseUrl ?? "");
  const [hasKey, setHasKey] = useState(apiKeySet);
  const [hasBaseUrl, setHasBaseUrl] = useState(baseUrlSet);
  const [result, setResult] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      const r = await apiCall<SettingsResult>("/api/settings/save", { type: "tmdb", apiKey, baseUrl });
      if (!r.ok) {
        setResult(`❌ ${r.error}`);
        setTimeout(() => setResult(null), 3000);
        return;
      }
      const res = r.value;
      setResult(res.success ? "✅ 保存成功" : `❌ ${res.message ?? "保存失败"}`);
      if (res.success) {
        if (apiKey.trim()) {
          setApiKey("");
          setHasKey(true);
        }
        if (baseUrl.trim()) {
          setBaseUrl("");
          setHasBaseUrl(true);
        }
      }
      setTimeout(() => setResult(null), 3000);
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      const r = await apiCall<SettingsResult>("/api/settings/save", { type: "tmdb-clear" });
      if (!r.ok) {
        setResult(`❌ ${r.error}`);
        setTimeout(() => setResult(null), 3000);
        return;
      }
      const res = r.value;
      setResult(res.success ? "✅ 已清除" : `❌ ${res.message ?? "清除失败"}`);
      if (res.success) {
        setHasKey(false);
        setHasBaseUrl(false);
      }
      setTimeout(() => setResult(null), 3000);
    });
  };

  const handleTest = () => {
    startTransition(async () => {
      const r = await apiCall<TestTmdbResult>("/api/settings/test", { type: "tmdb-test" });
      if (!r.ok) {
        setResult(`❌ ${r.error}`);
        setTimeout(() => setResult(null), 3000);
        return;
      }
      const res = r.value;
      setResult(res.success ? `✅ ${res.message ?? "连接成功"}` : `❌ ${res.message ?? "连接失败"}`);
      setTimeout(() => setResult(null), 5000);
    });
  };

  return (
    <div className="push-form">
      <p className="hint-help" style={{ marginBottom: 12 }}>
        了解 TMDB{" "}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
          官网 <ExternalLink size={12} style={{ verticalAlign: "-1px" }} />
        </a>
        {" · 申请自己的 API Read Token "}
        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">
          获取方法 <ExternalLink size={12} style={{ verticalAlign: "-1px" }} />
        </a>
      </p>
      <div className="field-row" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="tmdb-api-key">API Key</label>
          <input
            id="tmdb-api-key"
            type="password"
            className="input input-mono"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={hasKey ? "已设置(留空不改)" : "TMDB API Read Token（eyJhbGciOi…）"}
            aria-label="TMDB API Key"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="tmdb-base-url">自定义代理地址（可选）</label>
          <input
            id="tmdb-base-url"
            type="text"
            className="input input-mono"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://tmdb-proxy.example.com"
            aria-label="TMDB Base URL"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="form-foot">
        <button type="button" className="primary-button" onClick={handleSave} disabled={isPending}>
          {isPending ? <LoaderCircle size={14} className="spin" aria-hidden /> : <Check size={14} aria-hidden />}
          保存
        </button>
        {(hasKey || hasBaseUrl) ? (
          <button type="button" className="secondary-button" onClick={handleClear} disabled={isPending}>
            <Trash2 size={14} aria-hidden />
            清除
          </button>
        ) : null}
        <button type="button" className="secondary-button" onClick={handleTest} disabled={isPending}>
          {isPending ? <LoaderCircle size={14} className="spin" aria-hidden /> : null}
          测试连接
        </button>
      </div>
      {result ? (
        <p className="panel-note" style={{ marginTop: 10 }}>
          {result}
        </p>
      ) : null}
    </div>
  );
}
