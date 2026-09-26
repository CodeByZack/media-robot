/**
 * 客户端读"当前盘"。
 *
 * 为什么客户端需要它：盘存进了 cookie，服务端读它做数据隔离；但有一类**客户端**
 * 状态也需要按盘区分 —— 目前是"每块盘各自记住上次搜索词"（sessionStorage）。
 * 以前这个 id 由服务端的 basePath 推导后逐层传下来，现在不该为它再铺一条 props 链。
 *
 * 之所以能这么做：`mr_drive` **不是凭证**（真正的凭证是 httpOnly 的 mt_session），
 * 所以服务端特意没给它 httpOnly —— 客户端读它不会带来任何越权风险，而且**服务端仍然
 * 会独立校验归属**（resolveCurrentWorkspace），所以就算这里被篡改也无害。
 *
 * ⚠️ 本文件必须在客户端调用（读 document）。服务端组件请用
 * `workflow-runtime.ts` 的 `resolveCurrentWorkspace()`。
 */

/** 与服务端 workflow-runtime 的 DRIVE_COOKIE_NAME 保持一致。刻意重复字面量而不是
 *  从那边 import：那个模块带着 node:sqlite，会污染浏览器 chunk（见 provider-display
 *  里同样的说明）。 */
const DRIVE_COOKIE_NAME = "mr_drive";

/** 当前盘 id；无 cookie（首次访问 / 只有一块盘且未切换过）时返回 null。 */
export function currentDriveIdFromCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  for (const part of document.cookie.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === DRIVE_COOKIE_NAME) {
      const value = decodeURIComponent(part.slice(eq + 1).trim());
      return value === "" ? null : value;
    }
  }
  return null;
}

/** 每块盘各自记住上次搜索词的 sessionStorage key。key 里带盘 id，所以切盘后搜索框
 *  会恢复那块盘自己的关键词。 */
export function lastQueryKeyForDrive(driveId: string | null): string {
  return `media-track.lastQuery.${driveId ?? "none"}`;
}

/** 同上，但用"当前盘"（切盘按钮需要按**目标盘**取 key，所以两个都要有）。 */
export function lastQueryKeyForCurrentDrive(): string {
  return lastQueryKeyForDrive(currentDriveIdFromCookie());
}
