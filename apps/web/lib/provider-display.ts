import { getStorageBrand, isRegisteredStorageProvider } from "@mediarobot/workflow";

/**
 * 网盘的「展示数据」（显示名 / 文字方牌里的字）。
 *
 * 为什么单独一个文件、而不是各页面各写一份：**三处**渲染盘标识的地方必须长得一样
 * ——设置页盘卡、设置页「添加网盘」的品牌胶囊、侧栏的盘切换器。设置页那条注释早就
 * 写明了这条约束（「以字代图的标识语言在两处必须长得一样，否则看着像两个体系」），
 * 但它数漏了第三处：切换器当时仍在用 `/brands/<provider>.svg` 图片。结果就是同一块
 * 盘在切换器里是品牌色图片、在设置页里是 navy 方牌 —— 正是那句话预言的「两个体系」。
 *
 * 所以这里把取值收敛成一个函数，三处共用。各写一份 = 迟早再次漂移。
 *
 * ⚠️ 本文件 import 了 workflow 的 barrel，**只能被服务端组件引用**。客户端组件
 * （如 workspace-switcher）不能 import 它 —— barrel 会把 `node:sqlite` 拽进浏览器
 * chunk，编译直接失败。客户端的做法是由服务端 loader 把结果当 props 传下去。
 */

/** 品牌显示名。已注册品牌读注册表（单一事实源），未注册兜底显示原始 provider 串。 */
export function providerLabel(provider: string): string {
  return isRegisteredStorageProvider(provider) ? getStorageBrand(provider).label : provider;
}

/**
 * 文字方牌里的字（设计稿 `.drive-icon`：navy 底 + 白字）。
 *
 * 已注册品牌取注册表的 `mark`（数字牌用产品号 115/123，中文牌取一个记忆点强的字
 * 夸/鸭/翼）。未注册品牌兜底 provider 串首字符，保证方牌**永远有内容、不会空框**
 * —— 空方牌看着像渲染坏了，而这是"未注册品牌"这一真实状态，该如实显示点什么。
 */
export function providerMark(provider: string): string {
  if (isRegisteredStorageProvider(provider)) return getStorageBrand(provider).mark;
  return provider.trim().charAt(0).toUpperCase() || "?";
}
