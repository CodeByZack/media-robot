/**
 * 客户端 API 调用封装：fetch → tagged union，替代 server action 的 startTransition。
 *
 * 与 runAction 的区别：
 * - 网络层错误 → 可读 HTTP 状态码 + 服务端 message（不是静默失败）
 * - 不依赖 Next.js 内部 RPC —— 前后端走标准 HTTP
 */
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string };

export async function apiCall<T>(
  url: string,
  body: Record<string, unknown>,
  fallbackMessage = "操作失败了。刷新页面后再试一次。",
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: (data as { message?: string }).message ?? fallbackMessage };
    }
    return { ok: true, value: data as T };
  } catch {
    return { ok: false, error: fallbackMessage };
  }
}
