/**
 * 登录页「该显示哪个表单 + 说哪句话」的决策 —— 纯函数，放 `lib` 是为了可测
 * （本仓库 vitest 是 node 环境、没有 jsdom，组件本身测不了）。
 *
 * ## 为什么这里会有一段事故记录
 *
 * 2026-09-26 用户上报：外网访问时同一屏上出现两句互相打脸的话 ——
 * 标题「输入密码」+「这台实例已设置访问密码」+ 底下红字「这台实例未设置访问密码，无需登录」。
 *
 * 根因有两个，都在别处，但这个模块的措辞是第二层防线：
 *
 * 1. **`/api/auth/bootstrap` 被构建期静态预渲染了**（漏了 `await connection()`）。
 *    CI/fpk 的构建用空库路径 → `hasLoginPassword()` 读 DB 抛错 → 返回 `"unknown"` →
 *    老代码写成 `!== false` → 算成 `true` → 答案被**冻结**进产物：所有访客永远看到
 *    「已设置访问密码」。而提交时打到的是**实时**的 `/api/auth/login`，它读到真实状态
 *    （没设密码）→ 回一句「未设置访问密码」。两句都不是瞎编，只是一个来自构建时刻、
 *    一个来自请求时刻。
 * 2. **页面不该替用户断言自己并不知道的事**。老代码在 bootstrap 还没拿到 / 拿失败时
 *    （`bootstrap === null`）直接落进「已设置」分支的文案，等于凭空断言。
 *
 * 所以这个模块的契约是：**只有明确读到 `passwordSet: false` 才显示设置表单；
 * 读不到（`"unknown"` / 加载中 / 请求失败）时，文案必须保持不确定，不许出现
 * 「已设置访问密码」或「未设置访问密码」这种断言句。**
 * 回归测试见 `login-view.test.ts`（它钉死了上面那条不许断言的规则）。
 */

/** `hasLoginPassword()` 的三态：`true` 已设 / `false` 未设 / `"unknown"` 读不出来（DB 故障）。 */
export type PasswordSetState = boolean | "unknown";

/**
 * 页面侧对 `/api/auth/bootstrap` 的获取情况。
 * ⚠️ 三态是必需的：`"loading"` 与 `"failed"` 都**不能**折叠成「已设/未设」，
 * 那正是上面 2 号事故的成因。
 */
export type BootstrapStatus =
  | { status: "loading" }
  | { status: "ready"; passwordSet: PasswordSetState }
  | { status: "failed" };

export interface LoginView {
  /** `setup` = 首次设置密码（外网访问的门）；`login` = 用已有密码登录。 */
  kind: "setup" | "login";
  title: string;
  note: string;
  buttonText: string;
  placeholder: string;
  autoComplete: "new-password" | "current-password";
}

const SETUP_NOTE =
  "这台实例已开启外网访问，但还没有设置访问密码。任何人只要知道这个网址就能进来，看到你的媒体库、网盘凭据和全部设置。现在设一个密码把它锁上——局域网内依旧免登录。";

const LOGIN_NOTE = "这台实例已设置访问密码。局域网内无需登录，从外网访问需要输入密码。";

/** 读不到实例设置时的措辞：陈述「读不到」，而不是替实例断言有没有密码。 */
const UNKNOWN_NOTE =
  "没能读取实例设置，无法确认是否已设访问密码。设过就直接输入；如果其实没设过，提交后这里会切成设置密码。";

const LOADING_NOTE = "正在检查实例状态…";

const FAILED_NOTE =
  "没能读到实例状态，无法确认是否已设访问密码。设过就直接输入，或重新检查一次。";

/**
 * 决定登录页的标题 / 说明 / 按钮 / 输入框文案。
 *
 * 顺序有意义：**先判「明确未设密码」**，其余一切（已设、读不到、加载中、请求失败）
 * 都走登录表单 —— 这是安全侧（fail-safe）的选择：设置密码接口在服务端要求
 * `hasLoginPassword() !== false` 即需已认证，所以让匿名访客看到设置表单既没用也不合适。
 */
export function resolveLoginView(bootstrap: BootstrapStatus): LoginView {
  if (bootstrap.status === "ready" && bootstrap.passwordSet === false) {
    return {
      kind: "setup",
      title: "设置访问密码",
      note: SETUP_NOTE,
      buttonText: "设置密码并进入",
      placeholder: "设置密码（至少 6 位）",
      autoComplete: "new-password",
    };
  }

  const note =
    bootstrap.status === "loading"
      ? LOADING_NOTE
      : bootstrap.status === "failed"
        ? FAILED_NOTE
        : bootstrap.passwordSet === "unknown"
          ? UNKNOWN_NOTE
          : LOGIN_NOTE;

  return {
    kind: "login",
    title: "输入密码",
    note,
    buttonText: "进入",
    placeholder: "密码",
    autoComplete: "current-password",
  };
}

/**
 * 登录接口回了「这台实例未设置访问密码」时的兜底：服务端实时状态与页面手上的状态不一致
 * （老版本因 bootstrap 被静态预渲染而**必然**如此），就地翻成设置表单，
 * 别让用户对着一个提交不了的表单反复试。返回 null 表示不是这种情况、状态不变。
 */
export function bootstrapAfterRejection(status: number): BootstrapStatus | null {
  return status === 404 ? { status: "ready", passwordSet: false } : null;
}
