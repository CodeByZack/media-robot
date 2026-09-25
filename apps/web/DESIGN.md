# MediaRobot — 设计系统（应用表面）

> 本文档描述**仓库内实际生效**的设计系统。
>
> 视觉契约的原始来源是设计交付包（本地 `.design/`，已 gitignore、不入库）：
> `DESIGN.md`（系统说明）、`colors_and_type.css`（权威 token 表）、六张应用页 HTML。
> 本文档是它的**落地版本**：凡代码与设计稿有出入，以本文档记录的实际值为准，
> 差异集中在 §3 与 §12，别照抄设计稿的 token 名。

---

## 1. 产品语境

MediaRobot 是一个**自托管**的个人媒体获取 Agent。它替你**巡弋**想看的剧集与电影，
从多个来源检索候选、按确定规则筛选，把文件转存到你自己的网盘，最后回读校验并按
规范名归位。它不猜、不赌：确定性优先，AI 只在选片、诊断、集数映射三处各做一次仲裁；
读不回来就如实标注，**绝不假报成功**。

**界面立场.** 深色石墨底，大面积近黑，**没有彩色背景**。颜色只来自两处：海报本身，
以及代表"执行"的巡弋蓝 / 信号青。屏幕上永远只有一件事在发光 —— 正在进行的操作。

**两种表面，同一套品牌.** 应用（默认）= 深色石墨，靠**明度层级**分层，阴影只在海报下出现；
对外页（`site/`）= 浅色，靠**描边**分层。只要有海报，就回到深色。

---

## 2. Token 落在哪

全部在 `apps/web/app/globals.css` 的 `:root`。**设计交付包与本仓库的 token 命名并不一致**
（代码里是早期 `--bg-* / --text-*` 家族，设计稿是 `--surface-* / --fg-*` 家族）。
新增样式请**用代码这一套**，并在 §3 对照表里查值。

⚠️ **引用未定义的 `var()` 不会报错**，只会静默回退到继承值 —— 这类 bug 已经踩过三次
（`--radius-md` / `--danger` / `--fg-2`，见 §12）。写 `var()` 前先在 `:root` 里搜一下。

---

## 3. Token 对照表（★ 最常查的一节）

### 明度阶梯（分层只靠抬明度，不靠堆描边）

| 设计稿 token | **代码 token** | 值 | 角色 |
| --- | --- | --- | --- |
| `--bg` | `--bg-base` | `#111419` | 页面底色 |
| `--bg-elev` | `--bg-surface` | `#181c22` | 侧栏 / 顶栏 / 抬升行 |
| `--surface` | `--bg-raised` | `#1e232b` | 卡片 |
| `--surface-2` | `--bg-card` | `#262d37` | 输入框 / hover 卡 |
| `--surface-3` | `--bg-card-alt` | `#313a46` | 高亮 / 激活分段 / 进度槽 |

每级约 +0.05 L。**层级靠抬明度表达，不靠加边框。**

### 文字

| 设计稿 token | **代码 token** | 值 | 角色 |
| --- | --- | --- | --- |
| `--fg` | `--text` | `#eef1f5` | 主文字 |
| `--fg-2` | `--text-muted` | `#b4bdc9` | 次文字 |
| `--muted` | `--text-faint` | `#79838f` | 弱文字 / 占位 / 时间戳 |

`--text-faint` 对 `--bg-base` 对比约 4.9:1。它**只服务默认态**的弱信息
（占位符、时间戳、页脚）—— **永远不能**作为 hover / focus / active 之后的前景色。

### 描边 / 品牌 / 语义

| 设计稿 token | **代码 token** | 值 | 备注 |
| --- | --- | --- | --- |
| `--border` | `--border` | `#2e3641` | 同名 |
| `--border-soft` | `--border-soft` | `#232a33` | 同名，发丝分隔线 |
| `--navy-tint` | `--navy-tint` | `#12345a` | 盘卡文字方牌底色 |
| `--navy` | `--navy` | `#102b4d` | 标识底 |
| `--navy-deep` | `--navy-deep` | `#0b1e38` | — |
| `--accent` | `--accent` | `#4c9be8` | **巡弋蓝**，同名 |
| `--accent-on` | `--accent-on` | `#071626` | 主操作上的前景，**深墨蓝不是白** |
| `--accent-hover` | `--accent-hover` | `#6aaef0` | 同名 |
| `--accent-active` | `--accent-press` | `#3a8ad9` | ⚠️ **名字不同** |
| `--cyan` | `--cyan` | `#39c5ff` | 信号青：焦点 / 进度尾端 / AI 标记 |
| `--success` | `--success` | `#3fbf88` | 回读校验通过 · 已归位 |
| `--warn` | `--warning` | `#d9a441` | ⚠️ **名字不同** |
| `--danger` | `--negative`（另有别名 `--danger`） | `#e7685a` | ⚠️ **代码里两者并存** |

### 圆角

| 设计稿 token | **代码 token** | 设计值 | 代码值 | 备注 |
| --- | --- | --- | --- | --- |
| `--radius-sm` | `--radius-sm` | 4px | 4px | — |
| `--radius-md` | `--radius-md` | 8px | 8px | — |
| `--radius-lg` | `--radius-lg` | 12px | 12px | — |
| `--radius-card` | `--radius-card` | **13px** | **8px** | ⚠️ 同名不同值，见 §12 |
| `--radius-art` | — | 9px | **未落地** | 海报圆角目前直接用 `--radius-md` |
| `--radius-pill` | `--radius-pill` | 9999px | 9999px | 搜索框 / 状态胶囊 / 分段控件 |

---

## 4. 颜色规则

1. **一个强调色原则.** `--accent` 每屏最多出现两处。第二处之后改用 `--text-muted`
   \+ 描边 + 等宽字号来表达层级。
2. **派生色一律 `color-mix(in oklab, …)`.** 状态胶囊底 =
   `color-mix(in oklab, var(--success), transparent 84%)`。**不写裸 hex，不做 `opacity` 叠加**
   （会串色）。
3. **状态永远成对.** 任何状态色都必须同时给出前景与背景（`.chip-ok / .chip-warn /
   .chip-error / .chip-info / .chip-neutral`）。禁止只给文字上色让它落在同色底上。
4. **深色不是纯黑.** `--bg-base` 保持近黑而非 `#000`，让海报的黑色边角仍然"贴在墙上"。
5. **浅色表面**只用于对外页（`site/`），且整页切换，不与深色混排。

---

## 5. 排版

两把声音，**互不越位**：

- **界面黑体**（`--font-stack`）承担全部操作语言：标题、正文、按钮、导航、表单。
- **证据等宽**（`--font-mono`）承担全部**可核对**信息：工具名 `searchCandidates`、
  时间戳 `23:04:12`、路径、评分、正则、URL / Key / Token。

为什么只有一个显示字族：这是数据密集的工具界面，不是营销页。层级靠**字号 + 字重**
拉开，不靠第二款字体；真正的第二把声音是等宽体。

| 字号 | 用途 |
| --- | --- |
| 12px | 时间戳、字段标签、页脚 |
| 14px | **界面默认**（`body`）、导航、卡片标题 |
| 16px | 页头说明、面板正文 |
| 18px | 面板标题、字标 |
| 24px | 区块标题 |
| 32px | 详情页标题 |
| `clamp(27px, 3.6vw, 38px)` | 页面主标题（`.page-head h1`） |
| `clamp(20px, 2.2vw, 24px)` | 货架区段标题（`.sec-head h2`） |

**行高.** 大标题 1.1；卡片标题 1.32；界面正文 1.5；说明段落 1.85（中文长句要更松）。

**字距.** 字标 `+0.025em`（注意：设计稿写的 `-0.025em` 是给 44px 大标题的，20px 字标套用会挤成一团，
代码里已按实际观感调成正字距）。mono 小标签 `0.18em`，全大写小节链接 `0.1em`。

**字重.** 只有四档：`400` 正文 / `600` 强调 / `700` 按钮与卡片标题 / `800` 标题与字标。
**不要 500、不要 300。**

数字统一 `font-variant-numeric: tabular-nums`，让进度与秒数不跳动。

---

## 6. 组件

### 导航

| 组件 | 类名 | 要点 |
| --- | --- | --- |
| 侧栏导航项 | `.nav-item` | 36–40px 高、14px/700；`is-active` 用 `--bg-raised` + 图标染 `--accent` |
| 底部标签栏 | `.nav-item`（≤860px 变形） | ≥44px 触控目标；激活态文字染 `--accent`，**不变灰** |
| 徽章 | `.nav-badge` | mono 10px，warn 底 8% 透明，最小 18px |
| 搜索区头部 | `.search-head` / `.search-hero` / `.search-scope-note` | 间距**只由 `.search-head` 给**（28px），内部元素不自带下边距 —— 否则多一条提示就叠加成两套间距互相打架。多盘隔离提示属于搜索区，故紧贴 hero（12px）、远离下方内容（28px）：**距离即归属** |
| 品牌区 | `.brand` / `.brand-mark` / `.brand-copy` | 标识底用设计稿 symbol 的**渐变**（`--navy-tint → --navy-deep`，135°），不是平涂 navy；字标双色 + 副题见 §9 |
| 页脚收尾卡 | `.sidebar-footer` | 抬升卡（`--bg-raised` + `--border-soft` + `--radius-lg`），上半活体状态、下半元信息 |
| 巡检状态行 | `.sidebar-status` | 呼吸绿点（`--success`，`breathe` 2.6s，**全站唯一常驻动画**）+ 「巡检运行中」+ 右对齐 `下次 HH:MM`。数据来自巡检设置（`lib/patrol-status.ts` 纯逻辑）；**只读演示站不显示**（那里巡检并不真跑，给绿灯等于编造状态） |
| 页脚元信息 | `.sidebar-meta` | 发丝线上方；仓库链接在左、`v<版本> · <commit 前 7 位>` 在右（`margin-left:auto`）。commit 来自 `NEXT_PUBLIC_APP_COMMIT`（`next.config.ts` 构建期注入，与 Dockerfile 盖进 `BUILD_COMMIT` 的同一个 `GIT_SHA`）；取不到就只显示版本号。**不要**写回「自托管」一类每份部署都一样的话 —— 那个位置要放可核实的事实 |

### 操作

| 组件 | 类名 | 要点 |
| --- | --- | --- |
| 主按钮 | `.primary-button` | `--accent` 底 + `--accent-on` 字；hover 走 `--accent-hover`（**前后景一起换**） |
| 次按钮 | `.ghost-button` / `.secondary-button` | 透明底 + 描边；hover 抬背景并把文字提亮 |
| 危险操作 | `.ghost-button.danger` / `.icon-act.danger` | **红色只在 hover 出现** —— 常驻红色等于全程催促 |
| 行内小按钮 | `.icon-act` | 30px 描边胶囊 |

### 输入与选择

| 组件 | 类名 | 要点 |
| --- | --- | --- |
| 输入框 | `.settings-shell .input` | 40px / `--radius-md` / `--bg-card` 底；`:focus` 描边转 `--accent` |
| 等宽输入 | `.settings-shell .input-mono` | 技术字段（URL / Key / Token / 正则）必用 |
| 字段 | `.settings-shell .field` | label 12.5px/700 + `.hint` 11.5px `--text-faint` |
| 字段行 | `.settings-shell .field-row` | 多字段并排，`flex:1` + `min-width:200px` |
| 表单尾 | `.settings-shell .form-foot` | 按钮组统一收口 |
| 分段控件 | `.settings-shell .seg` + `SegmentedControl` | 见下 |

**分段控件的设计要点**（`.settings-shell .seg`）：激活档用 `--bg-card-alt`（= 设计稿
`--surface-3`）的**中性抬色**，刻意**不用** `--accent` —— 它和同屏的主操作是竞争关系，
让分段控件也染强调色会让"哪个是主操作"失去焦点。语义上用
`role="radiogroup"` + `role="radio"` + `aria-checked`，配 roving tabindex 与方向键。

### 状态与证据（本产品的签名组件）

| 组件 | 类名 | 要点 |
| --- | --- | --- |
| 状态胶囊 | `.hub-badge` / `.feed-status-pill` / `.act-pill` | 底一律是语义色 `color-mix(…, transparent 84%)` |
| 任务卡 | `.act-row` | 收起 `--bg-surface`；展开 `.is-open` 抬到 `--bg-raised` |
| 进度条 | `.act-bar` / `.act-bar-fill` | 5–6px；填充 `linear-gradient(90deg, --accent-press, --cyan)`，**必须有填充** |
| 证据链 | `.act-round` / `.act-step` | 见下方"嵌套明度" |
| AI 标记 | `.act-step-ai` | mono 9.5px/800 + `--cyan` 字 + 青色 14% 底。**只在真正调 LLM 的三处出现** |
| 评分标签 | `.act-ev-grade` | mono 描边胶囊；`.act-ev-a` = success 色 / `.act-ev-c` = warn 色 |

**嵌套明度（证据链）—— 容易踩的坑.** 展开卡与它内部的轮次条必须**拉开两级**，否则看起来像一块糊在一起的颜色：

| 层 | 值 |
| --- | --- |
| `.feed-card`（收起） | `--bg-surface` `#181c22` |
| `.feed-card.is-open` | `--bg-raised` `#1e232b` |
| `.act-round`（内嵌条） | `--bg-base` `#111419` ← 比展开卡**暗两级** |

只暗一级（`--bg-surface`）实测差异太小、肉眼看不出分界。证据链**容器本身不设底色**，
层级交给里面的 `.act-round`；容器也上色会和它抢层级。

### 媒体内容

| 组件 | 类名 | 要点 |
| --- | --- | --- |
| 首页货架 | `.trending .shelf` | 横向滚动 + `scroll-snap-type: x proximity`；卡宽 168px（≤860px 用 136px） |
| 货架卡 | `.trending .card` + `.art` | 海报 `aspect-ratio: 2/3`；hover 卡底抬 `--bg-raised` 且海报 `scale(1.045)` |
| 通知卡 | `.feed-card` | 有海报时两列 grid；海报固定 2:3，**不随卡片高度拉伸** |
| 盘卡 | `.drive-card` | 网格 `minmax(300px, 1fr)`；左侧 navy 文字方牌 |
| 文字方牌 | `.drive-card-icon` / `.brand-tile-mark` | **共用同一条规则**（只有尺寸不同），保证两处是同一个体系 |

### 类名作用域（约定）

`.card` / `.section` / `.sec-head` 这类名字**太通用**，全局定义迟早被无关元素命中。
所以它们一律**收窄在父级下**（`.trending .card`）；设置页同理，全部挂在 `.settings-shell` 下
（`.settings-shell .panel`）—— 因为 `.panel` / `.panel-title` 是 `login`、`foreign-work`
也在用的共享类。**加新样式前先想清楚作用域。**

---

## 7. 布局与断点

```
≤ 860px                                          > 860px
┌───────────────┐                                ┌────────┬──────────────────────┐
│ appbar 顶栏    │  sticky                        │        │                      │
├───────────────┤                                │ 侧栏   │        主区           │
│               │                                │ 248px  │  max 1360px          │
│    主区        │                                │ sticky │  padding 40 / gutter │
├───────────────┤                                │        │                      │
│ tabbar 底部栏  │  fixed                         │        │                      │
└───────────────┘                                └────────┴──────────────────────┘
```

- 桌面：`grid-template-columns: 248px minmax(0, 1fr)`，侧栏 `position: sticky`。
- ≤860px：侧栏收起，顶栏（毛玻璃 + 发丝底边）替代导航，底部固定标签栏承担主导航，
  触控目标 ≥ 44px。**移动端不横向滚动 —— 横向滚动只允许出现在"货架"这一种组件里。**
  顶栏很窄（390px 下内容区仅 331px）且要装品牌 + 盘切换器，**任何新增元素都先量**：
  曾因盘标识 16px→20px 就撑出 4px 横滚（当时零余量）。
- ⚠️ **不要用裸 `1fr`**，用 `minmax(0, 1fr)`。裸 `1fr` = `minmax(auto, 1fr)`，会被宽子元素
  （搜索框、候选卡）撑破视口。
- 主区 `max-width: 1360px`，超出后居中留白，不做通栏拉伸。

**设置页面板不设宽度上限** —— 早先用 inline `maxWidth: 720/960` 卡住，宽屏下输入框被拉长；
现在的对策是让面板吃满宽度，再用 `.field-row` 把字段并排（这正是 `.field-row` 存在的理由）。

移动端重排范例（通知卡，≤620px）：用 `display: contents` 把 `.feed-card-body` 的子元素
提升为卡片的网格项，从而做到"标题行整宽 + 海报与元数据并排 + 步骤条整宽"，
纯 CSS 完成、不动 DOM 结构。

### 7.1 外壳（`app/(shell)/`）

侧栏 + `<main>` 由 **`app/(shell)/layout.tsx`** 提供，不再由各页面各自渲染。
需要外壳的页面（搜索 / 媒体库 / 通知 / 活动 / 设置 / 详情 / 外来作品）都放在这个
**路由组**里；`login` 留在组外（它是独立全屏页，不该套侧栏）。路由组不影响 URL：
`(shell)/library` 仍是 `/library`。

为什么必须在外壳里（两条都是实测出来的，不是理论）：

| 问题 | 症状 |
| --- | --- |
| 侧栏随页面重挂 | 一次导航发 **9 个请求**（本该 1 个 RSC）；3 个徽章的 `useEffect` 重挂各重发一次 |
| 盘切换器在 Suspense 里、fallback 为 null | 它塌陷时下方导航整列**上移 42px**，数据回来又弹回（导航时可见的双跳）|

App Router 的 layout **在导航间不重新渲染**，所以侧栏放这里，两个问题一起消失
（请求数降到 2：1 个 RSC + 1 个定时轮询）。

> ⚠️ **外壳 layout 里不能出现读 pathname / searchParams 的客户端组件。**
> 试过用一个客户端 `<ShellMain>` 按 pathname 选 `main` 的类名，结果在
> `/show/[tmdbId]`（外壳组里唯一的动态段路由）报 blocking-route：动态段的 pathname
> 在构建期未知 → layout 的静态壳无法预渲染，而**包住 `children` 的客户端组件又让页面
> 自己的 Suspense 失效**。需要"随路由变的样式"请改用 CSS 从内容推导 ——
> 例如详情页去掉 `main` 的顶部内边距用的是 `.main:has(.title-hub-immersive)`，
> 它跟着"页面画了什么"走，比按路径硬编码还稳。

高亮由客户端推导（`components/sidebar-nav.tsx` + `lib/sidebar-active.ts` 纯函数），
因为 layout 拿不到 pathname。详情页的高亮来自 `?from=search|library`（与旧实现同一来源，
不是丢了信息）。`<main>` 的类名固定，不再随路由变。

---

## 8. 动效

| token / 动画 | 值 | 用途 |
| --- | --- | --- |
| 颜色 / 描边 / 位移 | `150ms cubic-bezier(0.2, 0, 0, 1)` | 快速反馈 |
| 卡片底 / 海报缩放 | `240ms` 同曲线 | 稍慢，避免抖动 |
| `reveal` | `260ms` | 证据链展开：`translateY(-4px) → 0` + 淡入，**不做回弹** |
| `breathe` | `2.6s` 循环 | 侧栏运行中绿点（唯一常驻动画） |
| `spin` | `0.7s / 1.1s` | 加载指示、正在运行的证据步骤 |

### 交互态契约

每个可交互元素必须**成对**定义前景 / 背景，且状态变化后对比度**不得低于默认态**：

| 状态 | 做法 |
| --- | --- |
| hover（卡片 / 行） | 背景抬到下一级明度，文字从 `--text-muted` **提亮**到 `--text` |
| hover（实心主操作） | `--accent` → `--accent-hover`，前景**同步**保持 `--accent-on` |
| focus-visible | 全站唯一焦点环 `0 0 0 3px rgba(76,155,232,.5)` |
| is-active（导航 / 分段 / 筛选） | 明确不透明底 + 提亮文字；**绝不用"文字变灰"表达选中** |
| is-open（折叠） | 内容出现 + `reveal`；chevron 旋转 90°（行）/ 180°（季） |
| disabled | **唯一**允许降低对比度的状态 |

> chevron 的正确做法是**始终渲染同一个图标**，靠 CSS `.is-open` 旋转。
> 换成"两个图标对调"就做不出过渡动画了。

### 8.1 共享元素过渡（海报变形）

`媒体库卡片 → 详情页大图`（以及反向）走 View Transitions：源和目标共用同一个
`view-transition-name`，由 React 19.3 的 `<ViewTransition>` 驱动（需
`next.config.ts` 的 `experimental.viewTransition`）。

**接入点**（都指向 `/show/...`）：

| 来源 | 位置 | 备注 |
| --- | --- | --- |
| 媒体库海报 | `app/(shell)/library/page.tsx` | 最早接的一处，基线 |
| 搜索候选卡海报 | `app/(shell)/page.tsx` | 候选列表，需去重 |
| 活动页「获取中」海报 | `components/activity-feed.tsx` | 多季并发时同 tmdbId 会撞名，必须去重 |
| 详情页大图 | `app/(shell)/show/[tmdbId]/page.tsx` | 两端 |

| 项 | 值 / 位置 |
| --- | --- |
| 名字规则 | `poster-<type>-<tmdbId>`，见 `lib/poster-transition.ts` |
| 同页去重 | `posterNamePicker(items)` —— 撞名的**整批**返回 `null` |
| 时长 / 曲线 | `--vt-poster-duration: 420ms`、`--vt-poster-ease`，`globals.css` 的 `:root` |
| 包裹组件 | `components/poster-transition.tsx`（`name: string \| null`） |

三条**踩过的坑**，改这块之前先读：

- **同一页出现重复的 `view-transition-name`，浏览器会放弃「整个」过渡** —— 不是少一个
  元素形变，是全页都不动（只在控制台丢一句 duplicate，极易漏掉）。所以「撞名的代价」
  远大于「少一次形变」：`posterNamePicker` 对重复项**全部**返回 `null`（不是只留第一个
  —— 那样「哪一张动」会变得不可预测）。这不是理论风险：活动页**多季并发获取**是常规
  场景，同一部剧的第 1、2 季在同一页、tmdbId 相同；搜索候选列表也没有去重保证。
- **时长必须写成 `::view-transition-group(*)` + CSS 变量。**
  `::view-transition-group(...)` 括号里是**运行时**生成的元素名，静态选择器
  `::view-transition-group(poster-movie-*)` 永远命中不了 —— 实测一直停在默认
  250ms，而 `::view-transition-old(root)` 却是 420ms，两边不一致非常明显。
- **算不出名字时返回 `null`，让调用方退化成普通渲染，绝不抛错。**
  实测踩过：`mediaType` 一度为 `undefined` → TypeError → 整个详情页 500，而它
  只是个装饰动画。拿不到类型就**不给名字**（不猜：猜错的名字不报错，只让过渡
  静默失效，比崩更难查）。凡是装饰性动效，都不该有"失败也把页面搞崩"的能力。

> **尺寸契约：所有形变端点必须是 2:3。**
> | 端点 | 尺寸 | 定尺寸的写法 |
> | --- | --- | --- |
> | `.hub-poster` 详情页大图 | 180×270 | `width` + `aspect-ratio: 2/3` |
> | `.wall-poster` 媒体库 | 160×240 | `padding-bottom: 150%` |
> | `.act-poster` 活动页 | 46×69 | `width` + `aspect-ratio: 2/3` |
> | `.candidate-poster` 搜索结果 | 96×144 | `width` + `aspect-ratio: 2/3` |
>
> 为什么必须一致 —— 形变会在两个盒子之间插值。比例不同时，动画**中途**的快照是被
> **拉伸**的（整张图都在、被压扁），而动画结束由真实元素接管、走的是
> `object-fit: cover`（裁掉上下）—— 两种取景不一样，收尾那一下就会看到某一边
> "多一截然后瞬间消失"（实测被用户当场看到，就是搜索卡）。
>
> 写法上统一用「定宽度 + `aspect-ratio`」而不是硬编码高度：改宽度时比例不会悄悄跑掉。
> 新增任何 `PosterTransition` 端点前，先回来核对这张表。

#### 冷启动为什么原本没有形变，以及怎么补上的

形变的硬性前提是「**新旧两侧在同一个 commit 里都出现同名元素**」。官方指南原文：

> The morph plays when the destination content renders in the same commit as the
> navigation… **If the destination suspends into a fallback first, no pair forms**.

详情页整体包在一个 `<Suspense>` 里（`await connection()` + 读 DB），所以**冷启动**
时 React 提交的第一个版本是**骨架屏** —— 它上面没有海报 → 配不上对 → 那一路完全
没有形变；等真内容到达已是另一次提交（过渡之外）→ 骨架硬切。
（第二次访问有动画，是因为 `staleTimes.dynamic = 60` 让访问过的路由在客户端缓存里
复用、不再 suspend。）

两件事补上：

| 做法 | 位置 | 作用 |
| --- | --- | --- |
| 海报交接 | `lib/poster-handoff.ts` + `components/hub-skeleton-poster.tsx` | 骨架屏用**真海报** + 同一个 name → 冷启动也有配对对象 |
| Suspense reveal | `page.tsx` 的 `enter`/`exit` + `globals.css` | 骨架 → 内容从"硬切"变成有方向的交接 |

交接的几个**必须守住的点**：

- **模块级变量，不进 sessionStorage。** 它的寿命正好是一次客户端导航。放 storage
  会在硬刷新后残留（骨架显示上一部片子的海报），还要另造过期校验。
- **必须用 tmdbId 核对**（`pendingPosterFor`）。否则「点 A 进详情 → 返回 → 再用浏览器
  前进到 B」会把 A 的海报顶到 B 上。
- **链接没有 `?t=` 就不做**。TMDB 的 movie/tv 是两套 id 命名空间，拼错的名字只会
  静默失效，不如干脆不给名字。
- **海报图可能不在被点的 `<a>` 里**：搜索页候选卡把「海报」和「标题」拆成了两个
  链接，点标题时锚点内没有 `img`，要退一步到外层 `<article>` 找。
- ⚠️ **读 `useParams()` 的那半段必须包自己的 `<Suspense>`。** 它是外层 Suspense 的
  *fallback*，而 cacheComponents 把 `useParams()` 视作读未缓存数据 → 在 fallback 里
  直接读会让 `next build` 失败：*"Uncached data was accessed outside of `<Suspense>`"*。

#### 整页怎么交接（以及一个必须改的默认行为）

Chrome 默认对 `old(root)`/`new(root)` 用**叠加混合**（实测 keyframes 里带
`mix-blend-mode`）。后果是新页从第一帧就以全不透明呈现、旧页的淡出被盖住看不见 ——
测下来 80ms 与 220ms 两帧截图除海报外**完全一致**，观感就是"整页瞬间出现，只有海报
在自己滑"。所以显式把旧页变成**遮罩层**（`z-index: 2` + `mix-blend-mode: normal`，
淡出），新页不做动画、被"揭示"出来。

共享元素（海报）反过来要**关掉交叉淡入**：同一张图的新旧两帧叠加会变成发白重影。
`components/poster-transition.tsx` 用 `share="morph"`（= view-transition-class）
挂类名，CSS 里以 `::view-transition-old(.morph)` / `new(.morph)` 关掉它（`animation:
none; opacity: 1`）—— 用 class 是因为元素名带 `tmdbId`、运行时生成，静态选择器选不到。
`default="none"` 必须与 `share` 成对出现（只给 `default="none"` 会让配对静默失去形变）。

#### ⚠️ 那条 `.morph` 规则的位置是**有语义的**，不要挪

`globals.css` 里 `::view-transition-old(.morph)` / `new(.morph)` 必须写在
`::view-transition-old(.slide-down)` / `new(.slide-up)` **之后**。

原因：揭幕（骨架 → 内容）时，海报那个伪元素会**同时**带上两个 class ——
`.morph`（它自己与内容里的同一张海报配对成功 → share）**和** `.slide-down`／
`.slide-up`（它所在的 Suspense 边界在做 exit/enter）。两条规则都是
「伪元素 + 一个 class」，**优先级完全相同 → 后写的赢**。放在前面时 `.slide-down`
会赢，`animation: none` 被覆盖成「淡出 + 位移」，于是海报在揭幕那一瞬间
**暗一下再亮回来**（用户实测原话：\"在骨架屏数据回来的那一瞬间，海报闪烁了一下\"）。

验证方式（不需要真实导航，也不依赖能不能复现骨架）：造一个
`view-transition-class: morph slide-down` 的元素跑一次手动 `startViewTransition`，
读 `getComputedStyle(documentElement, '::view-transition-old(<name>)')`：

| 顺序 | `animation-name` | 观感 |
| --- | --- | --- |
| `.slide-*` 在前、`.morph` 在后（**现在**） | `none`, `opacity: 1` | 海报干净 |
| 反过来（曾经的 bug） | `vt-slide-fade` | 海报淡出再淡入 = 闪 |

#### 后退的过渡：用「记忆来路 + replace」拿到（已实现）

先看清楚**为什么**要绕：实测（3 轮重复一致）popstate 这条路径下——

| 场景 | 触发 |
| --- | --- |
| 跨路由**前进** `/library` → `/show/[id]` | ✅ |
| 跨路由**后退** `/show/[id]` → `/library` | ❌ 0 次 |
| 同路由**前进** `/library` → `/library?type=tv` | ✅ |
| 同路由**后退**（只回退 query） | ✅ |

机制：同路由回退只改 `searchParams`，路由段身份不变、commit 很小，能落进 Next
`onPopState` 的 `startTransition`（`dispatchTraverseAction`）窗口；跨路由回退要换
整个路由段，落不进那个窗口。

> ❗️本文早期版本写的是「`back()` **完全不触发** `startViewTransition`（0 次）」——
> **那是错的**，只在跨路由场景测过就推广到了所有后退。教训：按
> （前进/后退 × 同路由/跨路由）四象限逐个测，别用单一场景推断「完全不支持」。
> Next 官方指南其实说对了（「back navigations… the shared element morph **still
> applies**」）。

**解法：不要走 popstate，走普通导航。** 详情页的返回按钮现在这样工作（三条按优先级）：

1. **记住了来路** → `router.replace(来路)`。常态路径。来路 URL 里带着完整状态
   （媒体库的 `type`/`filter`、搜索页的 `?q=`），所以**状态不丢**；而普通导航
   **会触发 View Transition**，所以**海报形变回来**。
2. 没记住（直接输网址进来 / storage 不可用）→ 退化成 `router.back()`：没有过渡，
   但回到正确位置、状态也不丢。
3. 也没有历史 → `push(fallbackHref)`。

实现四件套：

| 文件 | 职责 |
| --- | --- |
| `lib/detail-origin.ts` | 纯函数：记/读来路与 scrollY（sessionStorage）+ 形状校验 + 恢复决策 |
| `components/detail-origin-memory.tsx` | `DetailOriginMemory`：全局捕获 `click`，只对 `/show/...` 链接记来路 + scrollY<br>`ScrollRestore`：按 pathname 重跑，把 scrollY 放回去 |
| `components/back-link.tsx` | 读来路 → `replace`；退化到 `back()` / `push()`。**不负责滚动** |
| `app/(shell)/layout.tsx` | 挂上面两个组件 |

**三个实测踩过的坑**（改这块之前先读）：

- **滚动恢复不能放在「点击返回」的处理函数里**。那一刻目标页还没渲染，`document` 里
  还是详情页 —— 于是"等高度稳定"的判据立刻成立，函数误判"页面就这么高"，滚到详情页的
  maxScroll（0）并**清掉记忆**；等列表页真渲染出来已经没人再恢复它了。表现为「返回后停在
  顶部」，而且是**间歇性**的（取决于导航比高度稳定快还是慢，同一操作时好时坏）。
  正解：`ScrollRestore` 挂在 `(shell)/layout.tsx`，在**目标页自己的 layout effect** 里消费。
  layout 常驻所以不会卸载，用 `usePathname()` 进依赖数组让它每次导航重跑
  （⚠️ 空依赖的 effect 在 layout 里**整个会话只跑一次** —— 实测就是这么静默失效的）。
- **恢复动作还必须早于 View Transition 抓新快照**，所以用 `useLayoutEffect`。抓快照时页面
  还没滚，形变的目标位置就按"未滚动的布局"算；页面随后被滚走，而动画层是视口固定的，
  海报便悬在原地不动 —— 用户描述为「海报卡在列表页上」。
  实测对照：改前恢复发生在过渡中途（`y` 在 `vt` 动画进行中从 0 跳到 458），
  改后与形变同时落地（`t=89ms` 时 `y=458` 且形变组正在跑），且形变末帧
  `translate(296, 457)` 与卡片返回后的实际视口位置 `y:457` **精确吻合**。
- **记忆是 sessionStorage，会跨导航留着**，所以恢复前必须校验"当前页正是当初点进详情页
  的那一页"（比对 pathname，不是整个 URL —— query 的序列化顺序/编码不保证逐字一致）。
  不校验的话：点海报进详情页、然后不返回而是去点「通知」，媒体库的位置就会套到通知页上。
  过期记忆要**清掉**，否则它会在下次碰巧回到同一路径时突然生效。
- **媒体类型有 2 个 id 命名空间，不是 4 个**。卡片用站内 `MediaType`
  （movie/tv/anime/variety），详情页 `kind` 只有 `tv | movie`。不归一化的话动漫/综艺
  会拼出 `poster-anime-30981` 对 `poster-tv-30981`，**配不上对且完全静默**（不报错、
  就是不动）。见 `lib/poster-transition.ts` 的 `tmdbNamespace()`。
  ⚠️ 曾经有个测试断言「四个类型互不撞名」—— 那条断言把 bug 固化成了期望；正确的不变量
  是命名空间数量（2），不是媒体类型数量（4）。

两个**取舍**，改之前先读：

- 走 `replace` 会**盖掉详情页那条历史记录**，所以**浏览器自带的后退按钮**在这个页面
  依旧没有过渡（那是 popstate，改不动）。本方案只覆盖应用内的返回按钮。
- 来路必须做**形状校验**（单个 `/` 开头、拒 `//`）：值存在 sessionStorage 里，可能是
  上次会话的旧值或人为塞入的字符串，直接喂给 `router.replace` 等于让外部输入决定跳转。

**试过但走不通的两条**（留档，别再试）：

- 自己包 `startViewTransition(() => router.back())`：抓不到新帧（`ready` 都不解析），
  还会因 DOM 更新超时抛 `TimeoutError`。
- 直接 `router.push(一个写死的返回地址)`：过渡有了，但**丢掉上一页状态**。

第一条说明「必须让 React 自己发起过渡」；第二条说明「目标地址必须带完整状态」。
上面那套 `replace(记下的来路)` 正好同时满足 —— 状态在来路 URL 里，导航是 React 发的。

---

## 9. 品牌

**标识.** 扁平机器人 —— navy 圆角底 + 云白头部 + 信号青双目 + 巡弋蓝播放键 + 巡弋天线。
来源是设计包的品牌资产（**文件名仍是交付时的 `mediarover-*`** —— 设计包是外部交付物，
未跟着改名；仓库内引用时别以为路径写错了），图标已内联进 `components/app-sidebar.tsx`。

**字标.** `Media`（前景色）+ `Robot`（信号青，深底上）。两段在 JSX 里是**分开的字符串**
（`Media<span className="brand-copy-accent">Robot</span>`）—— 搜品牌名时注意这一点，
连续字符串 grep 抓不到拆开的那部分。

**字标副题.** `.brand-copy-sub` = `your personal media agent` —— 即设计稿横排 lockup
的**官方全文**（`YOUR PERSONAL MEDIA AGENT`），只按书写习惯改成**全小写**。10px +
`--text-faint` 照设计稿；**字体族跟项目正文字体栈走**（设计稿那里是等宽）：副题是
**读的**，不属于 §3「等宽承担可核对信息」那类，侧栏这一格只有 140px，10px 等宽会
显出一股机器感。小写则与 20px 粗字标形成体重差，比全大写安静，也省宽度（同字号下
约省 20px）。这是「英文只出现在字标副题」这条规则的**实际落点** —— 之前这条规则写在
文档里，但界面并没有副题。

> **副题要比字标宽（这条是设计要求，不是巧合）.** 20px 的 `MediaRobot` 实测 121px，
> 副题若与之等宽或更窄，两行会看着像一个方块的两条边；让副题伸出一点（现 135.8px，
> 长出 14.8px），视觉上才分层 —— 副题是标题的**底座**，而不是第二个标题。
> 这正是文案取 25 字符官方全文而非 20 字符版的原因。

> ⚠️ **≤860px 隐藏副题。** 移动端侧栏变成顶栏，要同时装「品牌 + 盘切换器」；
> 副题是纯装饰、没有信息功能，让位给功能控件（§7）。这同时修掉一个真实的横向溢出：
> 顶栏此前**刚好卡在 390px 零余量**，任何微小变化都会撑出横滚 —— 盘标识从旧实现的
> 16px 图片换成 20px 方牌时就多出 4px。隐藏副题后余量 15px（375/390）。

> ⚠️ 副题**长度受侧栏宽度硬约束**，实测预算（10px / w500）：`.brand` 内容宽 200 −
> 标志 48 − gap 12 = **文本可用 140px**。`your personal media agent` 在 system-ui
> （最差情况，Inter/Arial 都更窄）下的字距—宽度对照：
> `0.06em` → 145.8px（**溢出 5.8px**）、`0.04em` → 140.8px（溢出）、
> `0.03em` → 138.3px（余 1.7px）、**`0.02em` → 135.8px（余 4.2px，采用）**。
> 即：补回 `your` 恢复了官方全文，但字距必须从 0.06em 降到 0.02em 才塞得下 ——
> 字数上去了，字距就得下来，24+ 字符本来也不需要那么大字距。
> 改文案或字体前先量这份预算。


**盘卡标识.** 网盘标识一律用**文字方牌**（`115` / `夸` / `鸭` / `翼` / `123`），
不用品牌 logo 图片。数据源：`packages/workflow/src/storage-brands.ts` 的 `STORAGE_BRANDS[].mark`，
统一经 `apps/web/lib/provider-display.ts` 的 `providerMark()` 取值。

> ⚠️ **配色只定义一处：`.drive-mark`。** 这个方牌在**三处**出现 —— 设置页盘卡
> （`drive-card-icon`，38px）、设置页「添加网盘」品牌胶囊（`brand-tile-mark`，24px）、
> 侧栏盘切换器（`ws-mark`，20px）。三处的规则**只写尺寸**，配色全部继承 `.drive-mark`；
> 尺寸可以不同（场景不同），配色必须一致。
>
> 为什么抽出来：这三份曾经各写一份，已经漂移了两次 ——
> ① 切换器整个漏改成 `/brands/<provider>.svg` 图片（同一块盘侧栏彩色、设置页 navy，
> 看着像两个体系）；② `tabular-nums` / `letter-spacing` 只加在设置页那份，侧栏没有
> （数字牌宽度会抖）。**改这个方牌时先想另外两处。**

> ⚠️ **底色不是设计稿的 `--navy-tint` 原值，而是 `color-mix(in oklab, var(--navy-tint), white 16%)`。**
> 原值 `#12345a` 是个很暗的实心块，压在同样暗的石墨底上对比度只有 **1.1–1.36**
> （在 `--bg-card` 上仅 1.1），方块几乎看不出边界 —— 看着像糊掉的印子而不是标识。
> 提亮一档后升到 **1.72–2.12**，牌内文字仍有 **7.2**（远超 AA 的 4.5）。
> 这是有意的偏离设计稿：设计稿那个方牌是 30px/11px，靠粗白字撑住辨识度；
> 缩到 20px/9px 后底色必须自己站出来。另加一道 `inset` 发丝内描边（用 inset 而非
> border，避免 border 占盒模型导致三处尺寸不一致）。

> 注：`apps/web/public/brands/*.svg` 是旧实现遗留的品牌图，现已无引用（但文件保留，
> 删它要连 Dockerfile 的 `COPY public` 一起动）。它里面的字与注册表**不一致**
> （SVG 是 光/天，注册表是 鸭/翼），**以注册表为准**。

> ⚠️ 客户端组件**不能** import `@mediarobot/workflow` 的 barrel（会把 `node:sqlite`
> 拽进浏览器 chunk，编译直接失败），所以「添加网盘」的品牌表在
> `apps/web/lib/brand-tiles.ts` 本地维护，并由 `brand-tiles.test.ts` 把 `mark`
> 钉死在与注册表逐字一致上。

**数据契约（改名时别顺手改）.** 在用户云盘里创建的媒体库**根目录名**默认是
`MediaRover`（`account-credentials.ts` 的 `rootName` 默认值，可用
`MEDIA_TRACK_LIBRARY_ROOT_DIR` 覆盖）。**不要**跟着品牌名改成 `MediaRobot`：
老用户的文件已在 `MediaRover/`，改了会把他们的文件拆到两个目录。

同样属于运行时/数据契约、改名时**不动**的：`MEDIA_TRACK_*` 环境变量前缀、
`mediary-scout` 仓库与打包产物名、115 请求的 User-Agent。

---

## 10. 用词（这是品牌的一部分，不要同义替换）

| 说 | 不说 |
| --- | --- |
| 获取 | 下载 |
| 归位 | 移动文件 |
| 秒传转存 | 上传 |
| 回读校验 | 校验一下 |
| 候选 / 机械评分 | 推荐 / 智能打分 |
| 缺集 · 覆盖 | 不完整 |
| **巡弋** | 爬取 |
| 仲裁（仅 AI 三处） | AI 帮你搞定 |

**排版语气.** 界面文案全中文，句末**不加句号**（短标签、按钮、导航项）；说明段落用完整句子并加句号。
英文只出现在三处：字标副题、证据里的工具名与代号、token / 字段名。

**数字给具体值**：`已确认 6 / 8 集`、`机械评分 92`、`写入 24.6 GB`。
**永远不要编一个漂亮数字** —— 拿不到就写"待确认"。

> 注：「巡弋」是 "Rover" 的中文载体（巡弋蓝）。品牌英文名已改为 MediaRobot 后，
> **中文动词体系保留「巡弋」不变** —— 机器人形象与"巡弋"并不冲突。
> 但**状态行**改口「巡检运行中」：那个位置说的是**功能**（每日定时巡检），
> 不是品牌修辞，得和设置页同名 —— 同一个东西在两个页面叫两个名字才是真的怪。

---

## 11. 反模式

1. **不要复制 Spotify.** 绿色主色、满屏胶囊、圆形悬停播放键属于另一家的产品语言。
   MediaRobot 的巡弋蓝是青蓝系，主操作是**矩形圆角**按钮，胶囊只留给搜索框与状态标签。
2. **不要 emoji 当功能图标.** 分享链接用线性图标，不用 🔗。
3. **不要彩色背景与大渐变.** 除品牌封面与海报本身，背景永远是石墨色系。
4. **不要"左侧色条 + 圆角卡"的提示卡.** 需要强调就用明度层级或状态胶囊。
5. **不要把 hover 做成"文字变灰".** hover 必须提亮文字或抬升背景。
6. **不要给图表画空框.** 进度条必须有填充，统计必须有数值。
7. **不要编造指标.** 没有数据就写"待确认"。
8. **不要在同一屏放两个主操作.**
9. **不要用 `max-height` 做折叠动画.** 用 `grid-template-rows: 0fr → 1fr`。
10. **不要在未回读校验前显示"成功".** 顺序是：转存中 → 回读校验 → 已归位。
11. **不要把 AI 标记当装饰.** `.act-step-ai` 只出现在真正调用 LLM 的三处。
12. **不要用 `white-space: nowrap` 硬塞文字.**
13. **不要在深色界面里混排浅色组件.** 浅色必须整页切换。
14. **不要写裸 hex 做派生色.** 一律 `color-mix(in oklab, …)`。

---

## 12. 已知技术债

| 项 | 说明 |
| --- | --- |
| `--radius-card` 同名不同值 | 设计稿 13px / 代码 8px。改名会波及 40+ 处调用点，一直没动。**新增样式时留意别被名字误导** |
| `--accent-press` vs `--accent-active` | 同一个东西两个名字（代码 / 设计稿），未统一 |
| `--warning` vs `--warn` | 同上 |
| `--negative` / `--danger` 并存 | 已加 `--danger: var(--negative)` 别名兜底 |
| 曾经静默失效的 token | `--radius-md` / `--danger` / `--fg-2` 都曾"被引用但未定义"，圆角塌成 0、红色信号条从不显示。**加 `var()` 前先在 `:root` 搜一遍** |
| `--radius-art` 未落地 | 海报圆角直接用 `--radius-md`（8px），设计稿是 9px |
| 主按钮形状只在设置页生效 | 设计稿要求全站矩形圆角，目前 `.settings-shell .primary-button` 生效，搜索页「搜索」仍是胶囊 —— 待全站收口 |
| 热门货架缺「全部」链接 | 设计稿 `.sec-head .more` 有，但 App 没有「热门全部」列表页，加了就是死链 |
| 设计交付包不入库 | `.design/` 已 gitignore，是本地参照物。本文档是它的落地版本；设计稿若有更新，需要人工同步到这里 |

---

## 13. 改设计时的检查清单

1. 改色 / 圆角 → 先动 `:root` 的 token，不要在组件里写裸值。
2. 加 `var()` → 确认该 token 真的在 `:root` 定义（否则静默回退）。
3. 加通用类名 → 收窄作用域（`.trending .card` / `.settings-shell .panel`）。
4. 改 hover / active → 保证前景与背景**成对**，且对比度不低于默认态。
5. 改移动端 → 检查 `minmax(0, 1fr)`、触控目标 ≥ 44px、无横向溢出。
6. 动品牌名 → 只改展示层；**不要**碰云盘根目录名、`MEDIA_TRACK_*`、仓库名（见 §9）。
7. 跑 `npx tsc --noEmit && npm run lint && npm test`。
