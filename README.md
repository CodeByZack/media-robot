<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.svg">
    <img src="docs/images/hero.svg" alt="MediaRobot — your personal media agent" width="560">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/CodeByZack/mediary-scout/actions/workflows/ci.yml"><img src="https://github.com/CodeByZack/mediary-scout/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/CodeByZack/mediary-scout/releases"><img src="https://img.shields.io/github/v/release/CodeByZack/mediary-scout?display_name=tag&sort=semver" alt="最新发布"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-0BSD-blue" alt="许可证"></a>
  <img src="https://img.shields.io/badge/self--hosted-only-success" alt="仅自部署">
</p>

---

## 这是做什么的

你说要某部**电影 / 剧 / 番**,它跨资源源(PanSou / Prowlarr)检索,把最合适的**转存进你自己的网盘**(夸克 / 115 / 光鸭 / 123 / 天翼),转存后**回读网盘真实落盘结果做验证**,按 TMDB 规范命名归位,并持续追踪**还缺哪些集** —— 定时巡检只回来处理仍有缺口的剧。

不做的事:不往本地磁盘下载、不提供托管服务、失败就如实报「暂无资源」并继续尝试,**绝不伪造成功**。

<p align="center">
  <img src="docs/images/demo.gif" alt="MediaRobot —— 搜到目标、点获取、去通知页看结果" width="820">
</p>

---

## 下载与部署

### 飞牛 fnOS(原生应用,NAS 首选)

去 [Releases](https://github.com/CodeByZack/mediary-scout/releases/latest) 按架构下载 `.fpk`(`mediary-scout-arm.fpk` / `mediary-scout-x86.fpk`),在 fnOS 应用中心「手动安装」。应用跑在 **3333** 端口,数据由 fnOS 应用目录持久化 —— 不装 Docker、不开终端。

### Docker Compose(任何常开主机)

```bash
git clone https://github.com/CodeByZack/mediary-scout && cd mediary-scout
cp .env.example .env
docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d
```

然后打开 `http://<主机>:3000`。

> 🇨🇳 **国内 Docker Hub 不稳定?** 首次构建若报 `auth.docker.io ... i/o timeout`,在 `.env` 里加 `DOCKER_MIRROR=docker.1ms.run` 再 `up`。详见 [docs/deploy.md](docs/deploy.md#国内构建加速docker-hub-常年不稳定)。

完整部署向导(反向代理、Tailscale、多用户、升级):**[docs/deploy.md](docs/deploy.md)**。

---

## 怎么用

装好之后的顺序:**① 配 TMDB → ② 配 AI → ③ 连一块网盘 → ④ 去搜索页点「获取」**。

### 前提 1:TMDB(元数据)

没有它就无法识别片名、季集数、上映状态。

**必须自己配 —— 代码里没有任何内置 key,也不读环境变量兜底**(这是刻意设计:宁可不工作,也不用别人的额度)。免费申请只要几分钟,步骤见 **[docs/tmdb-setup.md](docs/tmdb-setup.md)**。

拿到 key 后填进 **设置 → 资源与服务 → TMDB**。没配时相关页面会直接提示你去配。

### 前提 2:AI(判断)

资源文件名充满歧义(压制组前缀、多季打包、简繁混杂、同名异作),机械规则之外的解释由 LLM **单次仲裁**完成。

在 **设置 → 资源与服务 → LLM** 填任意 **OpenAI 兼容**端点:

| 字段 | 说明 |
|---|---|
| `baseURL` | 兼容端点地址(OpenAI / DeepSeek / 本地 Ollama 等) |
| `apiKey` | 你的 key,**只存在你自己的实例里** |
| `modelId` | 模型名 |

页面上有「**测试连接**」按钮,填完点一下就知道通不通。

> **确定性优先**,不是每步都问 AI:能靠规则判定的绝不用它(唯一 A 级候选直接盲转)。一次干净的获取通常只花 2 次调用,顺利时为 0 次。

### 前提 3:一块网盘

| 盘 | 转存方式 | 登录 | 备注 |
|---|---|---|---|
| **夸克** | 分享链(无磁力 web API) | 扫码 / cookie | PanSou 上分享池最大 |
| **123网盘** | 分享链 **+** 原生离线下载 | 扫码 / token | **免费账号可转存** |
| **115** | 分享链 **+** 磁力 | 扫码 / cookie | 支持字幕文件一并转存 |
| **光鸭云盘** | **仅磁力 / 离线下载** | token | 迅雷系,与 Prowlarr 搭配最好 |
| **天翼云盘** | 分享链 | 扫码 / SSON cookie | PanSou 上分享池最小 |

> 115 / 夸克通常需要会员;123 / 天翼免费账号可用。多块盘就是一等工作区,侧栏可切换;连接教程都在 **[docs/deploy.md](docs/deploy.md)**。

### 然后

1. **搜索页**输入片名 → 找到目标 → 点「获取」
2. **活动页**看它逐个处理:搜索资源 → 核对入库目录 → 转存 → 验证落盘 → 入库完成,每一步的证据都能展开
3. **媒体库**按类型分架,海报带「已入库 / 有缺集 / 追更中」徽章;点进**详情页**看逐季覆盖与缺口
4. **设置 → 巡检与通知**里设每日巡检时间点(可多个),后台只补缺口;**通知页**是每次巡检的日报(新增了哪几集、还缺哪些)

### 设置里还能调什么

| 分区 | 内容 |
|---|---|
| **网盘** | 各盘连接 / 测试 / 解绑 |
| **资源与服务** | TMDB、LLM、PanSou 地址(内置默认实例)、Prowlarr(可选,拿磁力源)、外挂中文字幕(assrt.net 免费) |
| **获取偏好** | 偏好语言、偏好画质(作为选片优先级传给 AI,**不进搜索关键词**) |
| **识别规则** | 正则解析文件名里的季 / 集号。内置规则只读且恒在,自定义规则追加在后;自带**规则测试台**,粘一个文件名就能看解析结果 |
| **巡检与通知** | 每日巡检时间点、立即巡检、上次 / 下次巡检时间 |

---

## 状态与限制

- 自部署、面向进阶用户。**需要自己配 TMDB key 与 LLM 端点**,不接受任何托管服务形态。
- 需要一块受支持网盘的**可用转存权限**(115 / 夸克通常要会员;123 / 天翼免费账号可用)。
- 定时巡检需要**常开主机**才有意义。
- 外挂中文字幕目前**只有 115 / 光鸭**支持(需网盘支持外链离线落盘),夸克 / 天翼 / 123 不支持。
- 通知目前是**站内的**(通知页 + 侧栏未读徽章),没有内置第三方推送渠道。

---

## 技术栈

Next.js 16(App Router / Turbopack)+ React 19 + TypeScript strict;元数据 TMDB;存储 SQLite(`node:sqlite`);单进程内跑 web + worker + 定时巡检,没有额外的消息队列或独立服务。测试用 Vitest。

```bash
npm run dev:web      # 开发
npm test             # 单测
npm run typecheck    # 类型检查
npm run lint         # ESLint（0 warning 门槛）
npm run build:web    # 生产构建
```

---

## 关于本项目(与来源)

**本项目 fork 自 [`fancydirty/clawd-media-track`](https://github.com/fancydirty/clawd-media-track),并在其基础上做了大量改造。**

原项目是一个面向 115 网盘、以 agent skill 形式组织的媒体获取与追踪工具。这个 fork 保留了它最核心的东西 —— **把「获取」当成状态问题、凭证据行动、确定性优先、验证之后才入库** 的方法论 —— 其余部分基本重做:

| | 原项目 | 本项目 |
|---|---|---|
| **形态** | agent skill + 脚本 | 完整 Web UI(搜索 / 媒体库 / 详情 / 活动 / 通知 / 设置) |
| **网盘** | 115 | **5 块**:夸克 / 115 / 光鸭 / 123 / 天翼(含双路径盘) |
| **多用户** | — | 可开多用户,各自绑盘、各看各的库 |
| **配置** | 改代码 / 环境变量 | TMDB / LLM / PanSou / Prowlarr / 字幕 / 识别规则 / 巡检时间**全部进设置页** |
| **部署** | 手动 bootstrap | Docker Compose + **飞牛 fnOS 原生应用(.fpk)** |
| **动效** | — | 海报共享元素形变(卡片 → 详情页之间连续) |

方法论、以及这套「agent 帮我把片收齐」的思路,来自原项目。**感谢 [`fancydirty/clawd-media-track`](https://github.com/fancydirty/clawd-media-track)。**

## 致谢

- **[fancydirty/clawd-media-track](https://github.com/fancydirty/clawd-media-track)** —— 本项目的来源(fork 自它)
- [PanSou](https://github.com/fish2018/pansou-web) —— 资源搜索后端
- [Prowlarr](https://github.com/Prowlarr/Prowlarr) —— 索引器管理(可选)
- [p115client](https://github.com/ChenyangGao/p115client) —— 115 API 参考
- [AList](https://github.com/AlistGo/alist) —— 光鸭云盘 API 接入参考(`drivers/guangyapan`)
- [p123client](https://github.com/ChenyangGao/p123client) —— 123网盘 API 参考
- [cloud189-auto-save](https://github.com/1307super/cloud189-auto-save) / [cloudpan189-api](https://github.com/tickstep/cloudpan189-api) —— 天翼云盘 API 参考
- [assrt.net](https://assrt.net) —— 中文字幕
- [TMDB](https://www.themoviedb.org/) —— 元数据(本产品未经 TMDB 认可或认证)

与 115、夸克、光鸭云盘、123网盘、天翼云盘、TMDB 及任何索引器均无隶属关系。

## 许可证

[0BSD](LICENSE)。

**MediaRobot 是开源、自部署软件,不提供任何托管服务** —— 你自己跑实例、自带网盘 / LLM / 元数据凭证。项目定位详见 [docs/distribution-and-legal-positioning.md](docs/distribution-and-legal-positioning.md)。
