<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.svg">
    <img src="docs/images/hero.svg" alt="MediaRobot — your personal media agent" width="400">
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

说一个片名,它去搜资源、转存进你自己的网盘、**回读落盘结果做验证**、按 TMDB 规范命名归位。剧集还会持续盯着**还缺哪些集**,定时巡检只处理仍有缺口的。

不下载到本地磁盘、不提供托管服务;找不到就如实报「暂无资源」并继续尝试,**绝不伪造成功**。

<p align="center">
  <img src="docs/images/demo.gif" alt="MediaRobot —— 从首页最近热门点进一部片，点获取，去通知页看到已入库" width="820">
</p>

<p align="center"><sub>首页最近热门 → 点一张卡片 → 点「获取」→ 通知页看到这条「已入库」</sub></p>

---

## 下载与部署

### 飞牛 fnOS(原生应用,NAS 首选)

去 [Releases](https://github.com/CodeByZack/mediary-scout/releases/latest) 按架构下载 `.fpk`(`mediary-scout-arm.fpk` / `mediary-scout-x86.fpk`),在 fnOS 应用中心「手动安装」。

### Docker Compose(任何常开主机)

```bash
git clone https://github.com/CodeByZack/mediary-scout && cd mediary-scout
cp .env.example .env
docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d
```

装好后打开 `http://<主机>:3000`。

---

## 快速开始

**① 配 TMDB → ② 配 AI → ③ 连一块网盘 → ④ 搜索片名,点「获取」**。

### 前提 1:TMDB

片名 / 季集数 / 上映状态靠它,**必填**,免费申请见 **[docs/tmdb-setup.md](docs/tmdb-setup.md)** —— 拿到后填进 **设置 → 资源与服务**。

### 前提 2:AI

资源名里的歧义(多季打包、简繁混杂、同名异作)由它判断,在 **设置 → 资源与服务 → LLM** 填一个 **OpenAI 兼容**端点与 key,点「测试连接」验证。

### 前提 3:一块网盘

转存的落点,连一块就能跑;多块盘是一等工作区,侧栏随时切换。

### 然后

1. **搜索页**输入片名 → 找到目标 → 点「获取」
2. **活动页**看它逐个处理:搜索资源 → 核对入库目录 → 转存 → 验证落盘 → 入库完成,每一步的证据都能展开
3. **媒体库**按类型分架,海报带「已入库 / 有缺集 / 追更中」徽章;点进**详情页**看逐季覆盖与缺口
4. **设置 → 巡检与通知**里设每日巡检时间点(可多个),后台只补缺口;**通知页**是每次巡检的日报(新增了哪几集、还缺哪些)

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

原项目是一个面向 115 网盘、以 agent skill 形式组织的媒体获取与追踪工具。这个 fork 保留了它最核心的东西 —— **把「获取」当成状态问题、凭证据行动、确定性优先、验证之后才入库** 的方法论 —— 其余部分基本重做:完整的 Web UI、5 块网盘、多用户、配置全部进设置页、Docker Compose 与 fnOS 原生应用。

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
