import { DEFAULT_ACCOUNT_ID, type MediaType } from "./domain.js";
import { getStorageBrand, isRegisteredStorageProvider } from "./storage-brands.js";

/** The data partition key for the multi-drive tree model: an account (identity)
 *  plus the specific connected storage (workspace). `connectedStorageId` may be
 *  null for unscoped/legacy reads — before backfill, and for the cross-(account,
 *  storage) daily patrol that must see every drive's shows. A non-null value
 *  means "only this drive" (fail-closed isolation). */
export interface WorkflowScope {
  accountId: string;
  connectedStorageId: string | null;
}

export function scopeFromAccount(
  accountId: string,
  connectedStorageId: string | null,
): WorkflowScope {
  return { accountId, connectedStorageId };
}

/** Read methods accept either a bare accountId (legacy, account-only — no storage
 *  filter) or a full WorkflowScope. `undefined` → the default account, no filter. */
export type ScopeArg = string | WorkflowScope | undefined;

export function normalizeScope(arg: ScopeArg): WorkflowScope {
  if (arg === undefined) {
    return { accountId: DEFAULT_ACCOUNT_ID, connectedStorageId: null };
  }
  if (typeof arg === "string") {
    return { accountId: arg, connectedStorageId: null };
  }
  return arg;
}

/** Thrown when a request targets a /w/<storageId> workspace the current account
 *  does not own (or that doesn't exist) — the route layer maps it to a 404. */
export class WorkspaceNotFoundError extends Error {
  constructor(storageId: string) {
    super(`Workspace not found: ${storageId}`);
    this.name = "WorkspaceNotFoundError";
  }
}

/**
 * Resolve which drive a request's workspace targets, from the account's drives:
 * - no `storageIdParam` (root route) → the earliest-created (primary) drive id,
 *   or null when the account has no drive yet (single-user fresh — root works
 *   account-only).
 * - explicit `storageIdParam` that the account owns → that id.
 * - explicit `storageIdParam` the account does NOT own → throw (→ 404).
 * Pure: takes the already-loaded drive list, so it's testable without a DB.
 */
export function pickWorkspaceStorageId(
  storages: ReadonlyArray<{ id: string; createdAt: string }>,
  storageIdParam: string | undefined,
): string | null {
  if (storageIdParam === undefined) {
    if (storages.length === 0) {
      return null;
    }
    return [...storages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]!.id;
  }
  const owned = storages.some((storage) => storage.id === storageIdParam);
  if (!owned) {
    throw new WorkspaceNotFoundError(storageIdParam);
  }
  return storageIdParam;
}

/**
 * Resolve which connected storage a queue/reserve action should pin to.
 * Unlike pickWorkspaceStorageId (route 404 on unknown), unknown explicit ids
 * fail closed with unknown:true — never soft-fallback to primary, never
 * passthrough a ghost storageId into the run.
 */
export function resolveQueueStorageChoice(
  storages: ReadonlyArray<{ id: string; createdAt: string; status?: string }>,
  explicitId?: string | null,
): { id: string | null; frozen: boolean; unknown: boolean } {
  if (explicitId) {
    const found = storages.find((storage) => storage.id === explicitId);
    if (!found) {
      return { id: null, frozen: false, unknown: true };
    }
    return { id: found.id, frozen: found.status === "frozen", unknown: false };
  }
  if (storages.length === 0) {
    return { id: null, frozen: false, unknown: false };
  }
  const earliest = [...storages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]!;
  return {
    id: earliest.id,
    frozen: earliest.status === "frozen",
    unknown: false,
  };
}

export interface WorkspaceSwitcherItem {
  id: string;
  label: string;
  isActive: boolean;
  frozen: boolean;
  provider?: string | undefined;
}

/** The switcher chip's brand label, sourced from the brand registry so every
 *  brand (115 / 夸克 / 光鸭) reads correctly — not a 夸克-vs-115 ternary that
 *  mislabels a 光鸭 drive as "115". Falls back to the raw provider for an
 *  unknown / undefined provider. */
function providerLabel(provider: string | undefined): string {
  return provider !== undefined && isRegisteredStorageProvider(provider)
    ? getStorageBrand(provider).label
    : (provider ?? "网盘");
}

/**
 * Build the workspace switcher tabs (pure, testable).
 *
 * 盘不再进 URL（当前盘存在 cookie 里）——所以五个页面对**所有盘都是同一个路径**。
 * 这直接干掉了旧实现里最难的部分：以前每个 tab 要算「你在哪个功能区 + 目标盘 → 目标
 * URL」，现在切盘根本不产生 URL 差异，`href` 字段因此整个消失。
 *
 * active 由调用方从当前盘 id 传入（那是 cookie 解析出来的，不在 pathname 里）。
 * The caller renders nothing when fewer than 2 drives exist.
 */
export function switcherItems(
  storages: ReadonlyArray<{
    id: string;
    label: string | null;
    provider?: string;
    providerUid: string;
    createdAt: string;
    status: "active" | "frozen";
  }>,
  activeStorageId: string | null,
): WorkspaceSwitcherItem[] {
  const sorted = [...storages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  // 当前盘缺省（无 cookie / 未拥有 → 主盘）时视为第一块盘。
  // 多一道 exists 判断：调用方传进来的 id 理论上已被 resolveCurrentWorkspace 校验过，
  // 但本函数是纯函数且对外导出 —— 一个不存在的 id 若照单全收，会产出"没有任何一项
  // active"的列表（侧栏看起来像当前盘丢了）。这里兜到主盘，宁可显示主盘高亮。
  const requested = activeStorageId ?? null;
  const activeId =
    requested !== null && sorted.some((storage) => storage.id === requested)
      ? requested
      : (sorted[0]?.id ?? null);
  return sorted.map((storage) => ({
    id: storage.id,
    label:
      storage.label?.trim() ??
      `${providerLabel(storage.provider)} …${storage.providerUid.slice(-4)}`,
    isActive: storage.id === activeId,
    frozen: storage.status === "frozen",
    provider: storage.provider,
  }));
}

/** True when a stored row belongs to the scope: account must match; storage only
 *  filters when the scope pins one (connectedStorageId != null). fail-closed. */
export function scopeMatches(
  scope: WorkflowScope,
  rowAccountId: string | null | undefined,
  rowStorageId: string | null | undefined,
): boolean {
  if ((rowAccountId ?? DEFAULT_ACCOUNT_ID) !== scope.accountId) {
    return false;
  }
  if (scope.connectedStorageId != null && (rowStorageId ?? null) !== scope.connectedStorageId) {
    return false;
  }
  return true;
}

/** Link to a title's detail page, carrying the originating surface (`from`).
 *  盘不再进 URL：当前盘由 cookie 决定，详情页与服务端读的是同一个来源，所以不需要
 *  （也无法）用 `?w` 传递。 */
export function showHref(
  tmdbId: number,
  from: "search" | "library",
  type?: MediaType,
): string {
  let href = `/show/${tmdbId}?from=${from}`;
  // `t` disambiguates TMDB's separate movie/tv id namespaces for an UNTRACKED
  // title (the card knows the type; the detail page can't guess it). Tracked
  // titles resolve by DB type and ignore this.
  if (type) {
    href += `&t=${type}`;
  }
  return href;
}
