# Deploy Media Robot

Media Robot 有两种部署方式:

| | 飞牛 fnOS 原生应用 (fpk) | Docker Compose (服务器) |
|---|---|---|
| 适合 | 飞牛 NAS 用户,不想开终端 | NAS / 软路由 / VPS / 闲置 PC |
| 数据层 | SQLite(应用数据目录,升级保留) | SQLite(volume `mediary-data`) |
| 部署 | Releases 下载 `.fpk` → 应用中心手动安装 | `git clone` + `docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d` |
| 端口 | 3333 | 3000 |
| 下载 | [GitHub Releases](https://github.com/CodeByZack/media-robot/releases) | 本指南下方 |

**fnOS fpk**:去 [Releases](https://github.com/CodeByZack/media-robot/releases) 按架构下载 `.fpk`(`media-robot-<版本>-arm.fpk` / `media-robot-<版本>-x86.fpk`),在飞牛应用中心「手动安装」,装完直接开 `http://<NAS>:3333` 进设置页配网盘和 LLM。打包与维护细节见 [deploy/fpk/README.md](../deploy/fpk/README.md)。

**Docker 版**:继续往下看。

---

> **English summary.** Self-host with one command — `docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d` brings up web (Next.js + in-process worker, SQLite storage) + a bundled PanSou. Open `http://<host>:3000`, go to Settings: scan-login your drive (115 / Quark / 123 / Tianyi by QR; GuangYaPan by pasted token), **paste a TMDB read token (required — there is no built-in key and no fallback)**, and add an OpenAI-compatible LLM endpoint. **Never expose `:3000` raw to the internet.** Full walkthrough below (Chinese).

一行命令起整套:**web(Next + 进程内 worker,SQLite 存储)+ 自带 PanSou**。本指南覆盖:选宿主 → compose 起服务 → 从自己的设备访问 → 安全/升级。

## 目录
- [选择你的宿主](#选择你的宿主)
- [Compose 快速开始](#compose-快速开始)
- [光鸭云盘(GuangYaPan)连接](#光鸭云盘guangyapan连接)
- [天翼云盘连接](#天翼云盘连接)
- [123网盘连接](#123网盘连接)
- [想跑真实获取还需要](#想跑真实获取还需要)
- [可选增强](#可选增强)
- [从你的设备访问](#从你的设备访问)
- [安全](#安全)
- [登录密码](#登录密码)
- [国内构建加速](#国内构建加速连不上-docker-hub)
- [升级](#升级)
- [备份与恢复](#备份与恢复mediary-data)

## 选择你的宿主

任何能跑 Docker 的常开机器都行。挑一个(**飞牛 fnOS 用户**:原生 fpk 安装比 Docker 更省事,见本文开头,可跳过本节):

- **NAS(群晖 / 威联通 / unRAID)** —— 最推荐(常开、省电)。群晖用 Container Manager、威联通用 Container Station、unRAID 用 Community Apps 的 Compose Manager 插件,把本仓库 `docker-compose.yml` 贴进去起即可。数据(volume `mediary-data`)落在阵列/SSD 上。
- **软路由(iStoreOS 等)** —— 作者实测在带镜像加速的 iStoreOS 上一把过。用 Docker 插件或 ssh 跑 compose;软路由存储小,可把 `mediary-data` 指到外挂盘。
- **闲置 PC / Linux 主机** —— 装 Docker + Compose 插件,`git clone` 后 `docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d`。睡眠会停巡检,建议设为常开。
- **VPS** —— 跑得动;115/夸克转存走网盘服务端,VPS 带宽不影响转存速度,只要能连上网盘 API 即可。⚠️ VPS 在公网,务必看[安全](#安全)。

下面的 compose 步骤在以上任何宿主都一样。

## Compose 快速开始

```bash
git clone https://github.com/CodeByZack/media-robot && cd media-robot
docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d        # 首次会构建 web 镜像,几分钟
```

> ### ⚠️ 墙内先看这个:Docker Hub 大概率拉不动
>
> 本项目镜像来自 Docker Hub(构建 web 用的 `node`),
> 而 **Docker Hub 在中国大陆常年不稳定**。典型报错:
>
> ```
> failed to fetch anonymous token: Get "https://auth.docker.io/token...": EOF
> failed to resolve reference "docker.io/library/node:22-slim"
> read: connection reset by peer
> ```
>
> **这不是你配置错了,重试也没用**(实测重试十余次全失败)。在仓库根 `.env` 里
> 加一行镜像源,三处会一起生效:
>
> ```bash
> echo 'DOCKER_MIRROR=docker.1ms.run' >> .env
> docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d
> ```
>
> 已实测可用(2026-08-01,大陆直连,四个都能拉到全部三个镜像):
>
> | 镜像源 | 备注 |
> |---|---|
> | `docker.1ms.run` | 作者实测首选 |
> | `dockerproxy.net` | |
> | `docker.m.daocloud.io` | |
> | `hub.rat.dev` | |
>
> **公共镜像站会轮流失效 —— 一个不通就换下一个,别只记住一个。** 验证某站可用:
>
> ```bash
> docker pull docker.1ms.run/library/node:22-slim
> ```
>
> 留空(默认)= 直连 Docker Hub 官方,**境外网络无需任何设置**。
> `pansou` 走 `ghcr.io`,不受此变量影响(墙内通常可直连)。
>
> 另一条路是给 Docker daemon 配全局 `registry-mirrors`(`/etc/docker/daemon.json`),
> 效果一样。`DOCKER_MIRROR` 的好处是只影响本项目、不需要 root、不用重启 daemon。

打开 `http://<你的主机>:3000`:
1. **设置 → 网盘**:在品牌瓦片里选一个开始连接——115 / 夸克 / 天翼 / 123 扫码登录,光鸭粘贴 token(见各品牌连接小节);凭证入库后自动用于转存。五个品牌可各绑一块盘,互为独立工作区。
2. **设置 → TMDB 元数据**:填一个 TMDB read token。元数据的唯一来源,**没有内置 key、也没有兜底通道** —— 不填则搜片名 / 查季集数全都不可用(免费申请见 [tmdb-setup.md](tmdb-setup.md))。
3. **设置 → AI 模型**:填一个 OpenAI 兼容的 `baseURL / apiKey / modelId` —— agent 靠它决策。
4. 就这样。**PanSou 网盘搜索源已自带**,不用配。

### 组成 / 端口

| 服务 | 镜像 | 说明 |
|---|---|---|
| `web` | 本仓库 `Dockerfile` | Next.js + 进程内 worker(`instrumentation.ts` 自启),`:3000` |
| `web`(数据) | SQLite(volume `mediary-data`) | 库文件 `mediary.db` 首次查询自建,无需迁移;备份=拷贝该文件 |
| `pansou` | `ghcr.io/fish2018/pansou-web` | 网盘搜索源,compose 内经服务名 `http://pansou` 调用 |

### 覆盖配置

`docker-compose.yml` 的 `environment:` 已设好库路径、PanSou 地址与运行模式。想覆盖额外项(**Prowlarr、出站代理、媒体库目录名、session 密钥**等),在仓库根放 `.env`(参照 `.env.example`)——compose 会自动加载(缺失也无妨)。

> **网盘凭证、TMDB key、LLM 配置都不走 `.env`** —— 这些只在设置页配,存在实例自己的 SQLite 库里(`PAN115_COOKIE` / `*_CID` / `TMDB_READ_TOKEN` / `AGENT_MODEL_*` 这些旧环境变量已于 2026-09-18 移除)。

## 光鸭云盘(GuangYaPan)连接

光鸭云盘(迅雷旗下,2026 年上线)是第三个支持的网盘品牌。它走**磁力 / 离线下载优先**路径:agent 把 PanSou(magnet 类型)与可选 Prowlarr 找到的磁力 / ed2k / BT 候选,经光鸭的离线下载 API 拉进你自己的盘——和 115 的离线任务路径同理。

> ⚠️ **v1 仅支持磁力 / 离线。** 光鸭目前**不**转存 115 / 夸克 / 光鸭自己的**分享链**(这类候选会按设计明确报错 `GUANGYA_ONLY_MAGNET`,不静默失败)。所以光鸭和 **Prowlarr 搭配最好**(磁力覆盖更全)。
>
> 和所有获取一样,光鸭也需要先配好 **AI 模型(LLM)**,见下文「[想跑真实获取还需要](#想跑真实获取还需要)」。

光鸭用 **`access_token` + `refresh_token`** 鉴权(不是 cookie、不是扫码)。`access_token` 约 2 小时过期,`refresh_token` 会在过期时自动续期,续期后的新 token 自动写回该盘,无需你手动重粘。

### 1. 在设置页粘 token

**设置 → 网盘连接 → 选「光鸭云盘」标签页**。最省事:把下面 Console 打印出来的内容(打印的两段、或它复制到剪贴板的 JSON,都行)整段粘到**第一个框**,再点框下方的 **「识别并拆分 token」**,两个框会自动填好;确认无误后点「连接光鸭」。(也可以仍按老办法手动把两个值分别粘进两个框。)连接时会用 token 校验登录态、并在你盘里建好 `MediaRobot/{Movies,TV,Anime,Variety}` 分类目录。

### 2. 怎么拿到这两个 token

1. 用浏览器登录光鸭云盘网页版:**[https://www.guangyapan.com](https://www.guangyapan.com)**(或 app.guangyapan.com),确保已登录。
2. 按 **F12** 打开 DevTools → 切到 **Console(控制台)** 标签。
3. 粘贴并运行下面这段(它从 `localStorage` 里读出登录态。光鸭把凭证存在键 `credentials_<clientid>`,当前 clientid 是 `aMe-8VSlkrbQXpUR`,即键名 `credentials_aMe-8VSlkrbQXpUR`):

   ```js
   (() => {
     const clientId = "aMe-8VSlkrbQXpUR"; // 光鸭 web app 的 client_id
     const raw = localStorage.getItem(`credentials_${clientId}`);
     if (!raw) { console.warn("没找到 credentials_* —— 请确认已登录光鸭网页版后重试"); return; }
     const c = JSON.parse(raw);
     const out = { accessToken: c.access_token, refreshToken: c.refresh_token };
     console.log("accessToken:\n" + out.accessToken);
     console.log("\nrefreshToken:\n" + out.refreshToken);
     try { copy(JSON.stringify(out, null, 2)); console.log("\n(已复制到剪贴板)"); } catch {}
     return out;
   })();
   ```

   > 如果 `credentials_aMe-8VSlkrbQXpUR` 取不到(光鸭后续改了 clientid),在 Console 里跑 `Object.keys(localStorage).filter(k => k.startsWith("credentials_"))` 看实际键名,把后缀换进上面的 `clientId`。

4. 控制台会打印 `accessToken` 与 `refreshToken`(且尝试把 `{accessToken, refreshToken}` JSON 复制到剪贴板)。把打印的两段、或复制的 JSON,整段粘到设置页**第一个框**,点 **「识别并拆分 token」**即可自动填好两个框(不必手动分辨哪段是哪个)。

> 🔒 **别把 token 贴到任何公开地方**(issue、聊天群、截图、粘贴板网站)。它们等同你光鸭账号的登录态;只该出现在你自己实例的设置页里。

### 3. 来源致谢(API 逆向)

光鸭云盘的网盘 API 集成,基于开源项目 **[AList](https://github.com/AlistGo/alist)** 的 `guangyapan` driver(目录 [`drivers/guangyapan`](https://github.com/AlistGo/alist/tree/main/drivers/guangyapan))。该 driver 是本项目逆向光鸭 API 的来源,在此致谢。

## 天翼云盘连接

天翼云盘(中国电信)是第四个支持的品牌,走**转存分享**路径(`cloud.189.cn/t/…` 分享链,与夸克同模型;无磁力/离线 API,Prowlarr 不适用)。

- **连接**:设置 → 网盘 → 选「天翼云盘」→ 用天翼云盘 App 扫码。扫码不便时点开「手动粘 SSON cookie」:浏览器登录 [cloud.189.cn](https://cloud.189.cn) 后,从开发者工具 → Application → Cookies 里复制 `SSON` 的值粘入。
- 会话由系统自动续期;显示「掉线」时重新扫码绑定同一账号即可恢复,追踪数据不丢。
- 资源量提示:PanSou 上天翼分享目前偏少(电影尤其弱,剧/动漫可用),见 README 的分享量对比表。

## 123网盘连接

123网盘是第五个支持的品牌,走**转存分享**路径(`123pan.com/s/…` 分享链;免费账号即可转存——转存是服务端秒传复制,不消耗提取流量)。

- **连接**:设置 → 网盘 → 选「123网盘」→ 用 123网盘 App 扫码(登录约 **90 天**有效)。扫码不便时点开「手动粘 token」:浏览器登录 [123pan.com](https://www.123pan.com) 网页版后,开发者工具 → Application → Local Storage 里找 `eyJ…` 开头的登录 token 整段粘入。
- token 到期后显示「掉线」,重新扫码即恢复。
- v1 未启用 123 的磁力离线接口(免费配额极少);候选全部来自 PanSou 的 123 分享。

## 想跑真实获取还需要

两项都**必填**,缺任一项「获取」都跑不起来(都在设置页,不用改 `.env`):

- **TMDB Key**(设置 → TMDB 元数据):片名 / 季集数 / 上映状态的唯一来源。**没有内置 key、也不读环境变量兜底** —— 这是刻意设计(宁可不工作,也不用别人的额度)。免费申请见 [tmdb-setup.md](tmdb-setup.md)。
- **AI 模型**(设置 → AI 模型):填一个 OpenAI 兼容的 `baseURL / apiKey / modelId` —— agent 靠它决策。不填则获取流程无法规划。

> 网盘的**写盘范围不用你配**:连接网盘时会自动在你盘里 find-or-create 出 `MediaRobot/{Movies,TV,Anime,Variety}`(幂等、不删东西),并把写权限就限制在这几个目录内。目录名想改见「可选增强」。

## 可选增强

- **自定义媒体库目录名**(`.env`):默认根目录叫 `MediaRobot`、分类目录叫 `Movies / TV / Anime / Variety`。想换名字(比如用中文)设 `MEDIA_TRACK_LIBRARY_ROOT_DIR` / `MEDIA_TRACK_LIBRARY_MOVIES_DIR` / `..._TV_DIR` / `..._ANIME_DIR` / `..._VARIETY_DIR`。⚠️ **目录名是连接那一刻定下的**:建好之后,应用只认它拿到的目录 CID,所以改这几个变量**不会动已连接的盘**(同账号重新登录只刷新凭据、保留原 CID)。要让已连接的盘换名字,得先在网盘里把目录改名(CID 不变,应用无感),或者断开重连(重连会新建目录、老文件不会自己搬过去)。
- **自建 TMDB 代理**(墙内可选):`workers/tmdb-proxy/` 里带一个 Cloudflare Worker 参考实现 —— 把 TMDB 请求经它出海 + KV 缓存。注意它**不再是作者托管的能力**,要自己部署到自己的 Cloudflare 账号,然后在 **设置 → TMDB 元数据** 把 base URL 指过去(部署步骤见 [workers/tmdb-proxy/README.md](../workers/tmdb-proxy/README.md))。相比配 `HTTP_PROXY`,它的好处是只代理白名单元数据路径、带宽和延迟都可控。
- **出站代理**(`.env` 设 `HTTP_PROXY` / `HTTPS_PROXY`):TMDB 的 API 主机(`api.themoviedb.org`)在国内常被单独墙(官网能开 ≠ API 能通),直连不到 TMDB 你的 key 就用不上。给容器配一个能穿透的代理即可让全部出站请求(TMDB / PanSou / Prowlarr)走它:在仓库根 `.env` 里写 `HTTP_PROXY=http://172.17.0.1:7890` 和 `HTTPS_PROXY=http://172.17.0.1:7890`(`172.17.0.1` 是 Docker 默认网关,指向宿主机;端口换成你宿主上代理软件的实际端口,如 Clash 的 7890),再 `docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d`。`NO_PROXY` 可排除内网地址。**不设代理时行为不变**。
  - **WSL2 部署注意**(#83 踩坑实录):容器内的 `127.0.0.1` 指容器自身,填 Windows 宿主上的代理要用 WSL2 虚拟网卡的宿主 IP;且 Windows 防火墙常拦截来自 WSL2 虚拟网卡的入站连接(即使代理软件开了「允许局域网连接」),需要放行防火墙或在 WSL2 内起一层转发(监听 0.0.0.0 转发到 127.0.0.1:代理端口),容器再指向 WSL2 自身 IP。
- **Prowlarr**(设置 → 资源提供商):接入索引器聚合,磁力与 PanSou 结果合并,走 115 或光鸭的离线下载落盘(夸克无磁力 API)。
- **换 PanSou 实例**(设置 → 资源提供商):默认用 compose 自带的;想指向别的实例/公共域名在此手填。

## 从你的设备访问

默认 web 只监听宿主的 `:3000`。局域网内手机 / 电视浏览器直接开 `http://<宿主局域网IP>:3000` 即可。

要在外网(手机流量、出门在外)用,就在前面放一层带鉴权的入口 —— 私有 VPN(WireGuard 之类,不需要公网 IP)或带登录的反向代理都行。**别把 `:3000` 裸暴露到公网**(见下节)。

## 安全

- 本项目只走**自部署**,不提供任何托管(见 [distribution-and-legal-positioning.md](distribution-and-legal-positioning.md))。**单用户** —— 没有注册、没有多用户,登录页只输密码(见下节)。
- **别在公网裸暴露 `:3000`**:远程请求虽然一律要登录,但那只是一道密码,不该是实例唯一的防线。要远程访问,就在前面再放一层带鉴权的入口。
- 实例的全部凭证(网盘 cookie / token、TMDB key、LLM key)都存在实例自己的 SQLite 库里 —— 能碰到这台机器的人就能读到。别把库文件或 `.env` 拷到公开地方。

## 登录密码

单用户:一个实例服务一个人。登录页**只输密码**(用户名被忽略),没有注册流程。

- **远程访问一律要登录**(无论你有没有设过密码),局域网直连免登录。
- 首次从远程打开会落到 `/login`,那里提供**「设置访问密码」**表单(至少 6 位)—— 设完即用,不用重启。
- 之后想换密码:打开 `/login` 重新设置。

**忘记密码怎么办**(本项目不发邮件,无需配 SMTP):在宿主机上把 SQLite 库(`mediary.db`;Docker 在 `mediary-data` 卷 `/data/mediary.db`,fpk 在应用数据目录)里 `acct_default` 的 `password_hash` 清成空串:

```sql
-- 单用户模式只有一个账号,固定是 acct_default(登录时用户名被忽略,
-- 所以直接按 id 找它就行，不用管 username)
UPDATE accounts SET password_hash = '' WHERE id = 'acct_default';
```

然后打开 `/login`,它会识别「未设密码」并给出**设置访问密码**表单,设完即用新密码登录。

任何时候能碰到这台机器的人都能这么做 —— 这是「本地可自救」的刻意设计,也是为什么实例永远不该裸暴露公网。

## 国内构建加速(Docker Hub 常年不稳定)

Docker Hub 和 ghcr 在国内常年不稳定,首次 `docker compose --project-directory . -f deploy/docker/docker-compose.yml up` 构建 / 拉取会卡住。下面的镜像加速**只解决 Docker Hub**(占绝大多数镜像);来自 ghcr 的 `pansou` 是例外,见本节末尾。典型报错(任一即是此问题):

```
failed to fetch oauth token: Post "https://auth.docker.io/token": ... i/o timeout
DeadlineExceeded / dial tcp ...:443: i/o timeout
```

解决办法是**给 Docker 配一个国内 registry 镜像**。按你的平台来 —— ⚠️ 两者方式不同,别搞混:

**Docker Desktop(macOS / Windows)** — 不是改 `daemon.json` 文件、也没有 `systemctl`:
1. 打开 **Settings(设置)→ Docker Engine**;
2. 在那段 JSON 里加上 `registry-mirrors`(和已有字段并列):
   ```json
   {
     "registry-mirrors": ["https://docker.1ms.run"]
   }
   ```
3. **Apply & Restart**(应用并重启),等鲸鱼图标变绿再重试 `docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d`。

**Linux(含软路由 / NAS,直接装的 Docker Engine)**:把镜像写进 `/etc/docker/daemon.json` 的 `registry-mirrors`,然后 `sudo systemctl restart docker`:
```json
{ "registry-mirrors": ["https://docker.1ms.run"] }
```

**npm 也慢的话**,构建时换国内源:
```bash
docker compose --project-directory . -f deploy/docker/docker-compose.yml build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
```

> 镜像地址会失效/限速,`docker.1ms.run` 只是示例;搜「Docker 镜像加速 可用」找当前能用的即可。配好后,所有 **Docker Hub** 镜像(构建 web 用的 `node`)都会走镜像 —— 本仓库 Dockerfile 已**特意不写 `# syntax=` 指令**,避免它绕过镜像、第一步就卡死(见 #46)。

**⚠️ 注意 `pansou` 例外**:它来自 **ghcr.io**(`ghcr.io/fish2018/pansou-web`),而 Docker 的 `registry-mirrors` **只对 Docker Hub 生效、管不到 ghcr**。若 ghcr 也连不上,二选一:
- 在 `.env` 设 `PANSOU_IMAGE=` 指向一个 ghcr 镜像/代理(如 `ghcr.nju.edu.cn/fish2018/pansou-web:latest`,镜像可用性自行确认),再 `docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d`;
- 或者不用自带 pansou —— 把 `PANSOU_BASE_URL` 指到一个外部 PanSou 实例,然后 `docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d web`(不起 pansou 容器)。

实测在带镜像加速的软路由(iStoreOS)上一把过。

## 升级

```bash
./deploy/docker/deploy.sh
```

`deploy/docker/deploy.sh` 会 `git pull` → 重建 `web` → `up -d` → **验证跑起来的容器确实是刚拉取的 commit**(读容器内 `BUILD_COMMIT` 和 `HEAD` 比对,不一致直接报错退出)。等价于 `docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d --build`,但多了那道**自校验**,并且不用 `--no-cache`。

> **为什么要自校验?** 升级最阴的失败是**静默回退**:`git pull` 之后容器仍在跑**旧代码**,而所有常规信号都在骗你——宿主 `git rev-parse HEAD` 显示的是新 commit(和容器里实际跑的代码无关),盯镜像 hash 也没用(`--no-cache` 重建每次 hash 都不同,纯粹是构建不确定性)。#88–#98 就是这样连续五次「部署成功」实则一整天跑旧代码。所以真正的护栏不是缓存技巧,而是**一道检查**:把镜像构建时刻的 commit 盖进 `BUILD_COMMIT`,部署后比对运行容器的 `BUILD_COMMIT` 是否等于 `HEAD`,不等就报错——无论病根是构建缓存、`git pull` 空转、还是容器没被重建,都会当场暴露而非静默溜过。
>
> `deploy/docker/deploy.sh` 顺带传 `GIT_SHA=$(git rev-parse HEAD)` 作构建参数,Dockerfile 用它在 `COPY . .` 前触发缓存失效(ARG 在**首次使用**时 cache-miss,连带其后各层重建),每换 commit 强制重传源码 + 重建,而慢的 `npm ci` 依赖层仍走缓存。**不必 `--no-cache`**(那会把依赖层也丢掉,慢几分钟)。装了 buildx / 用内置 BuildKit 的宿主本就内容寻址、`COPY` 可靠,这层主要是给用**经典构建器**(`DOCKER_BUILDKIT=0` 或很老的 Docker)的自部署者兜底;两种构建器下都正确无副作用。
>
> 手动等价执行 + 校验:
> ```bash
> git pull --ff-only
> GIT_SHA=$(git rev-parse HEAD) docker compose --project-directory . -f deploy/docker/docker-compose.yml up -d --build
> # 核对容器真在跑新代码(应等于上面的 HEAD):
> docker compose --project-directory . -f deploy/docker/docker-compose.yml exec web cat BUILD_COMMIT
> ```


## 备份与恢复（mediary-data）

自托管时数据在 compose 卷 `mediary-data` 里(SQLite 文件 `/data/mediary.db`)，是媒体库/追踪状态的唯一真相。建议定期备份(2026-09 起 `sqlite-backup.sh` 已随目录梳理删除，直接用 Docker 体积备份):

```bash
# 停库前先停写入/worker 再拷贝单文件(与旧脚本语义一致、更简单):
docker compose stop web
docker run --rm -v mediary-data:/data -v "$PWD/backups:/backups" \
  --entrypoint sh node:22-slim -c 'cp /data/mediary.db /backups/mediary-$(date +%Y%m%d-%H%M%S).db'
docker compose start web
# → backups/mediary-YYYYMMDD-HHMMSS.db
```

恢复（会覆盖当前库内容，先停写入/worker）：

```bash
docker compose --project-directory . -f deploy/docker/docker-compose.yml stop web
docker compose --project-directory . -f deploy/docker/docker-compose.yml run --rm -v mediary-data:/data -v "$PWD/backups:/backups" \
  --entrypoint sh node:22-slim -c 'cat /backups/mediary-你的备份.db > /data/mediary.db'
docker compose --project-directory . -f deploy/docker/docker-compose.yml start web
```

也可直接备份 Docker 卷目录（停库后拷贝），但按上面这样拷单文件最省事。

### 定时备份（host crontab 示例）

在部署机用户 crontab 里加一行即可（路径改成你的仓库目录）：

```cron
# 每天 03:30 备份 mediary-data；保留最近 14 天
# 若要固定北京时间，在 crontab 顶部加: TZ=Asia/Shanghai
30 3 * * * cd /path/to/media-robot && docker compose exec -T web sh -c 'cp /data/mediary.db /backups/mediary-$(date +%Y%m%d-%H%M%S).db' >>./backups/cron.log 2>&1
0 4 * * * find /path/to/media-robot/backups -name 'mediary-*.db' -mtime +14 -delete
```

把 `backups/` 目录同步到机外（对象存储 / NAS / 另一台机器）再算真正有备份。
