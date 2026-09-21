/**
 * API 路由返回类型 —— 前后端共享。
 * 从 actions.ts 提取，供客户端组件和 API 路由共同引用。
 */

export interface AcquireResult {
  status:
    | "requested"
    | "already_tracked"
    | "active_workflow"
    | "reserved"
    | "unsupported"
    | "llm_not_configured";
  message: string;
}

export interface UntrackResult {
  status: "untracked" | "not_found" | "in_flight";
  message: string;
}

export interface ImportResult {
  status: "imported" | "failed";
  message: string;
}

export interface DriveResult {
  ok: boolean;
  message: string;
}

export interface TestStorageResult {
  ok: boolean;
  status: "active" | "frozen";
  message: string;
}

export interface SettingsResult {
  success: boolean;
  message?: string;
}

export interface TestLlmResult {
  ok: boolean;
  message: string;
}

export interface TestTmdbResult {
  success: boolean;
  message?: string;
}

export interface PatrolResult {
  success: boolean;
  message?: string;
  checked?: number;
}

export interface RuleSaveResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export interface RuleResetResult {
  success: boolean;
  message?: string;
}

export interface TestEpisodeResult {
  code: string | null;
  matched: string | null;
  message?: string;
}
