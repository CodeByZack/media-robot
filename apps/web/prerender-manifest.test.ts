import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * 守卫：**`/api/*` 路由一个都不许被静态预渲染。**
 *
 * ## 为什么需要这条守卫
 *
 * `nextConfig.cacheComponents` 下，一个不声明动态的 GET 路由会在 `next build` 时被
 * 静态预渲染 —— 把**构建那一刻**的答案冻结进产物，发给之后所有访客。对读 DB 的接口
 * 来说这必然是错的：构建机没有运行时数据（CI 的 `MEDIA_TRACK_SQLITE_PATH=""` 更会直接
 * 让 DB 读抛错）。
 *
 * 2026-09-26 用户上报的登录页怪象就是这么来的：`/api/auth/bootstrap` 漏了
 * `await connection()`，被冻成 `{"passwordSet":true}`，远程访客永远看到「已设置访问密码」，
 * 提交后又被实时的 `/api/auth/login` 回一句「未设置访问密码」。
 *
 * 那个 bug 在单测、lint、tsc 里都看不见 —— 只有**真构建**才暴露，而构建产物里唯一
 * 可机检的痕迹就是这个 manifest。所以守在这里。
 *
 * 修法只有一种：在该路由里 `await connection()`（cacheComponents 下 `export const
 * dynamic` 被禁止，见 `app/api/health/route.ts` 的注释）。
 *
 * ## 本地 vs CI
 *
 * manifest 只在跑过 `npm run build:web` 之后存在。本地没构建时跳过（不打扰日常
 * `npm test`）；CI 里构建是无条件前置步骤，所以**找不到 manifest 就判失败** ——
 * 否则哪天有人调了 CI 步骤顺序，这条守卫会静默失效。
 */

const MANIFEST = fileURLToPath(new URL("./.next/prerender-manifest.json", import.meta.url));

describe("构建产物：没有 /api 路由被静态预渲染", () => {
  it("prerender-manifest 里不含 /api 条目", () => {
    if (!existsSync(MANIFEST)) {
      if (process.env.CI) {
        throw new Error(
          `找不到 ${MANIFEST}。这条守卫需要先跑 npm run build:web —— ` +
            `CI 里它是前置步骤，请检查 .github/workflows/ci.yml 的步骤顺序。`,
        );
      }
      return; // 本地未构建：跳过（这个 it 会在有构建产物时才真正检查）
    }

    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
      routes?: Record<string, unknown>;
    };
    const prerenderedApiRoutes = Object.keys(manifest.routes ?? {}).filter((route) =>
      route.startsWith("/api"),
    );

    expect(
      prerenderedApiRoutes,
      `这些 API 路由被静态预渲染了，会把构建时刻的答案冻结给所有访客。` +
        `请在路由里加上 await connection()（不能用 export const dynamic）：` +
        prerenderedApiRoutes.join(", "),
    ).toEqual([]);
  });
});
