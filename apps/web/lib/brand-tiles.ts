/**
 * 「添加网盘」品牌选择行的纯数据（无 JSX、无 import）。
 *
 * 为什么单独放 lib/ 而不是留在组件里：
 * - 组件是客户端组件，**不能** import `@mediarobot/workflow` 的 barrel ——
 *   它会经 index.js 牵进 `node:sqlite`，浏览器 chunk 编译直接失败
 *   （实测：chunking context does not support external modules）。
 *   所以这张表必须在客户端本地维护，不能直接从注册表读。
 * - 本地维护就有与注册表漂移的风险。抽成纯 .ts 后可以被 node 环境的
 *   vitest 直接引用，用 `brand-tiles.test.ts` 把 mark 钉死在与注册表逐字一致上
 *   —— 漂移会红灯，而不是静默让盘卡显示「夸」、品牌行显示别的字。
 * - 项目约定也是「纯逻辑/数据放 lib/ + 同名 .test.ts」，与 trending.ts 一致。
 */

export type Brand = "pan115" | "quark" | "guangya" | "tianyi" | "pan123";

export interface BrandTile {
  key: Brand;
  /** 胶囊上的品牌名（比注册表 label 更紧凑：注册表是「115 网盘」，这里是「115网盘」）。 */
  label: string;
  /** navy 文字方牌里的字。**必须**与 workflow 注册表 `STORAGE_BRANDS[].mark` 逐字一致。 */
  mark: string;
  /** 认证方式，前置到选择时刻（选之前就知道要扫码还是粘贴）。 */
  authNote: string;
}

export const BRAND_TILES: BrandTile[] = [
  { key: "pan115", label: "115网盘", mark: "115", authNote: "扫码登录" },
  { key: "quark", label: "夸克网盘", mark: "夸", authNote: "扫码 / 粘 cookie" },
  { key: "guangya", label: "光鸭云盘", mark: "鸭", authNote: "粘贴 token" },
  { key: "tianyi", label: "天翼云盘", mark: "翼", authNote: "扫码 / SSON" },
  { key: "pan123", label: "123网盘", mark: "123", authNote: "扫码 / 粘 token" },
];
