"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { apiCall } from "../lib/api";
import type { SettingsResult } from "../lib/api-types";
import { LlmTestConnectionButton } from "./llm-test-connection-button";

export function LlmConfigForm({
  baseURL: initialBaseURL,
  modelId: initialModelId,
  apiKeySet,
}: {
  baseURL: string;
  modelId: string;
  apiKeySet: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [baseURL, setBaseURL] = useState(initialBaseURL);
  const [modelId, setModelId] = useState(initialModelId);
  // The API key is never echoed back from the server; the user only types one to
  // set/replace it. Blank submit keeps the stored key.
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleSave = () => {
    startTransition(async () => {
      const r = await apiCall<SettingsResult>("/api/settings/save", { type: "llm", baseURL, modelId, apiKey });
      if (!r.ok) {
        setResult(`❌ ${r.error}`);
        setTimeout(() => setResult(null), 4000);
        return;
      }
      const res = r.value;
      setResult(res.success ? "✅ 保存成功 —— 点「测试连接」确认可用" : `❌ ${res.message ?? "保存失败"}`);
      if (res.success) setApiKey("");
      setTimeout(() => setResult(null), 4000);
    });
  };

  return (
    <div className="push-form">
      <div className="field-row">
        <div className="field">
          <label htmlFor="llm-base-url">接口地址 Base URL</label>
          <input
            id="llm-base-url"
            type="text"
            className="input input-mono"
            value={baseURL}
            onChange={(event) => setBaseURL(event.target.value)}
            placeholder="https://api.openai.com/v1"
            aria-label="LLM Base URL"
          />
        </div>
        <div className="field">
          <label htmlFor="llm-model-id">模型 ID</label>
          <input
            id="llm-model-id"
            type="text"
            className="input input-mono"
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            placeholder="gpt-4o-mini"
            aria-label="LLM Model ID"
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="llm-api-key">API Key</label>
        <input
          id="llm-api-key"
          type="password"
          className="input input-mono"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={apiKeySet ? "已设置(留空不改)" : "sk-…"}
          aria-label="LLM API Key"
          autoComplete="off"
        />
        <span className="hint">仅存本机数据库，不会随任何请求外发；留空不会改动已保存的值。</span>
      </div>
      <div className="form-foot">
        <button type="button" className="primary-button" onClick={handleSave} disabled={isPending}>
          {isPending ? <LoaderCircle size={14} className="spin" aria-hidden /> : <Check size={14} aria-hidden />}
          保存
        </button>
        <LlmTestConnectionButton />
        {result ? <span className="panel-note">{result}</span> : null}
      </div>
    </div>
  );
}
