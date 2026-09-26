import { connection, NextResponse } from "next/server";
import { hasLoginPassword } from "../../../../lib/workflow-runtime";

/**
 * 实例是否已设登录密码 —— 登录页据此在「登录 / 首次设置密码」两个表单间选择。
 *
 * ⚠️⚠️ **必须 `await connection()`。** 这是全仓库唯一会读 DB 的 **GET** 路由，
 * 而 `nextConfig.cacheComponents` 下不声明动态的 GET 路由会在 `next build` 时被
 * **静态预渲染**，把构建那一刻的答案冻结进产物发给所有访客。
 *
 * 2026-09-26 就是这么炸的：CI/fpk 的构建用空库路径（`MEDIA_TRACK_SQLITE_PATH=""`），
 * 那里读 DB 抛错 → `hasLoginPassword()` 返回 `"unknown"` → 老代码 `!== false` 算成
 * `true` → 产物里冻结了 `{"passwordSet":true}` → 远程访客永远看到「输入密码」+
 * 「已设置访问密码」，提交后又被实时的 `/api/auth/login` 回一句「未设置访问密码」，
 * 同一屏两句互相打脸（用户上报原文）。判定逻辑与文案见 `lib/login-view.ts`。
 *
 * 不能用 `export const dynamic`：cacheComponents 下被禁止（`api/health/route.ts`
 * 里有同一说明）。回归守卫见 `apps/web/prerender-manifest.test.ts`。
 *
 * 返回三态：`true` 已设 / `false` 未设 / **`null` 读不出来**。
 * `null` 是刻意保留的 —— 报成 `false` 会让远程匿名访客看到设置表单（服务端必然拒绝，
 * 因为设置密码要求已认证）；报成 `true` 就是这次事故。让页面自己决定怎么措辞。
 */
export async function GET() {
  await connection();
  const state = await hasLoginPassword();
  return NextResponse.json({ passwordSet: state === "unknown" ? null : state });
}
