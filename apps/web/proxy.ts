import { NextResponse, type NextRequest } from "next/server";

/**
 * §7 P1 auth gate (Next 16 "proxy" convention, formerly middleware).
 *
 * 两种门禁形态：
 *  - 远程：需要 session（单用户模式）。
 *  - 单用户：**凡是经隧道来的远程请求都门禁**，与是否设过密码无关；局域网直通，零摩擦。
 *
 * 远程门禁不再看 `mt_auth_required`。旧规则是 `passwordSet && isRemote`，于是一台
 * 尚未设密码的实例对公网匿名访客完全放行——这与服务端 getCurrentAccountId() 修复后的
 * 判定相矛盾：服务端会返回 acct_unauthenticated 哨兵，而 proxy 却不把人送去 /login，
 * 结果远程站主看到的是一个没有任何出口的空页面。两侧必须同规则：**远程一律要 session**。
 *
 * 未设密码的远程访客因此落到 /login，那里提供「设置访问密码」表单（app/login/page.tsx）,
 * 站主可以就地设密码并登录，不会被锁死。
 *
 * This does cheap PRESENCE gating for the redirect UX (runs on the Edge runtime,
 * no DB access). The authoritative check — signature + session row + expiry — is
 * server-side in getCurrentAccountId(), which returns a no-data sentinel for an
 * invalid/expired cookie, so reads fail closed even if a stale cookie slips past.
 */
const SESSION_COOKIE_NAME = "mt_session";
const HANDLER_GUARDED_API_PREFIXES = ["/api/health", "/api/workflows/", "/api/agent/"];

/**
 * Server Actions CSRF fix (Next 16 behind a reverse proxy).
 *
 * Next 16 的 action-handler.js 对转发的 Server Action 请求做 CSRF 校验：把
 * `x-forwarded-host`（反代写入的“真实”host）与浏览器发来的 `Origin` 比对，不一致就
 * abort（E80，「点了没反应」）。反代把 x-forwarded-host 写成内网地址/飞牛子域名
 * （如 `192.168.6.194:3333`），而浏览器 Origin 是动态端口的公网反代域名
 * （如 `office.app.5ddd.com:60565`）时必然不匹配；`serverActions.allowedOrigins`
 * 匹配不了动态端口，`allowedForwardedHosts` 在 Next 16 已移除。
 *
 * 这里把 server action 请求的 `x-forwarded-host` 改写为 `Origin` 的 host，让 Next
 * 内部的 originHost === host.value 成立。只对带 `Next-Action` header 的请求生效，
 * 其它流量原样通过；不改 `host` header，也不影响下方的 auth gate。
 *
 * 注意：这是 Edge runtime，只用 Web 标准 API（Headers / URL），不能引 node 模块。
 */
function serverActionForwardedHeaders(request: NextRequest): Headers | null {
  // 只碰 Server Action 请求（浏览器对 action POST 一定带 Next-Action header）。
  if (!request.headers.has("next-action")) {
    return null;
  }
  const origin = request.headers.get("origin");
  // 无 Origin（手搓请求/非浏览器）或 "null"（sandboxed iframe）不重写——Next 对
  // 这两种有自己的处理路径（放行+警告 / originHost='null'），保持原行为。
  if (!origin || origin === "null") {
    return null;
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    // 畸形 Origin：Next 自己也会在这里 throw，但 proxy 不该替它提前崩。
    return null;
  }
  const forwardedHost = request.headers.get("x-forwarded-host");
  // 反代没设 x-forwarded-host（直连/局域网，Next 会回退用 host header）或已一致 →
  // 无需改写。只处理真正不匹配的情况，尽量少改请求。
  if (!forwardedHost || forwardedHost === originHost) {
    return null;
  }
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", originHost);
  return headers;
}

/** 直通响应：需要改写 header 时把新 headers 交给 NextResponse.next() 透传下去，
 *  否则原样 NextResponse.next()（与旧行为完全一致）。 */
function passThrough(headers: Headers | null): NextResponse {
  return headers ? NextResponse.next({ request: { headers } }) : NextResponse.next();
}

/** 经隧道的远程请求判定。与 workflow-runtime.isRemoteRequest() 保持一致：
 *  用 cf-ray/cdn-loop 而非仅 cf-connecting-ip（后者可被 zone 规则删除 → fail-open）。 */
function isRemoteRequest(request: NextRequest): boolean {
  return (
    request.headers.has("cf-ray") ||
    request.headers.has("cdn-loop") ||
    request.headers.has("cf-connecting-ip")
  );
}

const DRIVE_COOKIE_NAME = "mr_drive";

/**
 * 老的 `/w/<storageId>` 工作区链接 —— 兼容重定向。
 *
 * 盘已移出 URL（改由 cookie 决定当前盘），所以这些旧链接不再是页面。它们散落在书签与
 * 历史里，用户意图完全明确（"我要看这块盘"），所以读懂并转成 cookie，而不是 404。
 *
 * ⚠️ **为什么在中介件里而不是页面里**（这里是两处踩坑换来的）：
 *   1. **页面渲染期不能设置 cookie** —— 只有中介件 / 路由处理器 / Server Action 可以。
 *      写在 page.tsx 里在 dev 下"能用"，但生产构建会挂。
 *   2. 页面里读数据库（为校验归属）会在 `cacheComponents` 下让路由无法预渲染 ——
 *      实测 `next build` 直接失败（blocking-route）。
 * 中介件同时满足这两点：可以写 cookie，且运行在 Edge、本来就不该碰数据库。
 *
 * **归属校验不在这里做，是刻意的**：校验由 `resolveCurrentWorkspace()` 在每次读取时
 * 兜底——cookie 里的盘不属于本账号就静默回退主盘。所以即使有人手改 URL 塞一个别人的
 * 盘 id，也读不到任何越权数据；这里省掉一次 DB 往返，Edge 侧也保持无依赖。
 *
 * 只搬 `q` / `type` / `filter`：旧链接的筛选与搜索词不能在跳转中丢掉。旧实现里
 * `?tab=library` 表示媒体库面，其余一律搜索面。
 */
function legacyWorkspaceRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/w/")) {
    return null;
  }
  const driveId = pathname.slice("/w/".length).split("/")[0] ?? "";
  if (driveId === "") {
    return null;
  }

  // 默认落到搜索面（旧实现的默认），`?tab=library` 时改到媒体库面。
  const target = new URL("/", request.nextUrl.origin);
  if (request.nextUrl.searchParams.get("tab") === "library") {
    target.pathname = "/library";
  }
  for (const key of ["q", "type", "filter"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) {
      target.searchParams.set(key, value);
    }
  }

  const response = NextResponse.redirect(target);
  // secure 依据客户端可见的协议：隧道/反代会写 x-forwarded-proto。与 auth 路由的
  // isCookieSecure 同语义（此处不能复用那个函数——它在 workflow-runtime 里，带着
  // node:sqlite，Edge 运行时引不进来；该模块的 SESSION_COOKIE_NAME 也是同样原因重复的）。
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol;
  response.cookies.set(DRIVE_COOKIE_NAME, driveId, {
    sameSite: "lax",
    secure: proto.startsWith("https"),
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const legacy = legacyWorkspaceRedirect(request);
  if (legacy) {
    return legacy;
  }

  const forwardedHeaders = serverActionForwardedHeaders(request);

  const gated = isRemoteRequest(request);
  if (!gated) {
    return passThrough(forwardedHeaders);
  }
  if (HANDLER_GUARDED_API_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return passThrough(forwardedHeaders);
  }
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (hasSession) {
    return passThrough(forwardedHeaders);
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Gate pages; exclude the auth API, the login page, Next internals and assets.
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
