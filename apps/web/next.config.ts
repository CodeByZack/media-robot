import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Next only auto-loads .env files from the app directory; this workspace
// keeps ALL runtime config (TMDB token, 115 cookie, adapter switches) in the
// repo-root .env. Load it here without overriding anything already set.
try {
  const repoRootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");
  for (const line of readFileSync(repoRootEnv, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
} catch {
  // no .env present (CI, fresh clone) — fine, fall back to process env
}

// 侧栏页脚显示的版本号，唯一事实来源 = 仓库根 package.json 的 version。
// 在这里(BUILD 时)读出来，经 `env` 内联进产物 —— Docker runner 阶段只 COPY
// .next/standalone + public，运行时的 /app 下并没有 package.json，所以不能指望
// 运行时读文件。改版本号只需改 package.json 一处。
const appVersion = (() => {
  try {
    const pkg = JSON.parse(
      readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

// 侧栏页脚显示的构建 commit。取不到就**不注入**，页脚只留版本号 —— 拿不到就
// 如实少显示一段，不编一个（设计铁律：永远不要编一个漂亮数字）。
//
// 取值顺序：
//   1. GIT_SHA —— compose build.args 传进来（见 deploy/docker/docker-compose.yml）。
//      容器路径必须走这条：.dockerignore 排掉了 .git，镜像里没有仓库可查。
//      另外必须滤掉 compose 的 `${GIT_SHA:-unknown}` 默认值，否则会把字面量
//      "unknown" 当 commit 显示出去 —— 那比不显示更糟，看着像真的。
//   2. git rev-parse —— 本地 dev / 桌面构建走这条，取到的是当前 HEAD，准确。
//   3. 都拿不到 → 空串。
//
// ⚠️ 两个值都是**构建期**常量：本地 dev 里页脚显示的是**启动 dev server 那一刻**
// 的 HEAD，之后 commit 不会自动刷新（next.config 只在进程启动时读一次）。重启
// dev server 即同步。容器里无此问题 —— 每次 `up -d --build` 都是新构建。
const appCommit = (() => {
  const fromBuildArg = process.env.GIT_SHA?.trim();
  if (fromBuildArg && fromBuildArg !== "unknown") return fromBuildArg;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
      encoding: "utf8",
      // stderr 吞掉：非仓库目录下 git 会吵，而这是预期内的情况。
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  // NEXT_PUBLIC_* 由 Next 在构建期内联，服务端/客户端组件都能直接读。
  // APP_COMMIT 与 Dockerfile 盖进 /app/BUILD_COMMIT 的是同一个 GIT_SHA ——
  // deploy.sh 部署自校验比对的就是那个文件，同源才不会出现「界面显示 A、
  // 自检认 B」的分裂。
  env: { NEXT_PUBLIC_APP_VERSION: appVersion, NEXT_PUBLIC_APP_COMMIT: appCommit },
  // Lean container image: a self-contained server bundle (+ traced node_modules
  // and the @mediarobot/workflow workspace) the Docker runner stage copies whole.
  output: "standalone",
  // Trace from the monorepo root so standalone captures the workspace package +
  // root-hoisted deps (the app is in apps/web; deps hoist to the repo root).
  outputFileTracingRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  transpilePackages: ["@mediarobot/workflow"],
  // Cache Components: PPR becomes the default rendering model. "use cache"
  // builds the static shell; runtime reads live inside Suspense holes.
  cacheComponents: true,
  // Keep a visited route (and its loading boundary) reusable in the client Router
  // Cache for a window, so re-entering a detail page you just opened doesn't
  // re-fetch the dynamic hole and flash a skeleton every time. Fresh data still
  // arrives after the window / on a real change (the AcquiringPoller refreshes
  // mid-acquisition regardless).
  experimental: {
    staleTimes: { dynamic: 60, static: 300 },
    serverActions: {
      allowedOrigins: (process.env.MEDIA_TRACK_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    },
  },
  // Legacy per-season URL → the canonical one-page-per-show route. Handled at
  // the routing layer (not a render-time redirect page, which can't prerender
  // under cacheComponents).
  async redirects() {
    return [
      { source: "/show/:tmdbId/:seasonNumber", destination: "/show/:tmdbId", permanent: false },
    ];
  },
};

export default nextConfig;
