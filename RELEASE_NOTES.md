Media Robot 是**自己部署的个人媒体库助手**。

说一个片名，它去搜资源、转存进你自己的网盘，**回读落盘的真实文件做验证**，
再按 TMDB 规范命名归位。剧集还会持续盯着**还缺哪些集**，定时巡检只补缺口。

- **不下载到本地磁盘**，也不提供托管服务 —— 跑在你自己 NAS / 服务器上。
- 找不到资源就如实报「暂无资源」并继续尝试，**绝不伪造成功**。
- 需要自备三样：TMDB API Key、一个 OpenAI 兼容的 LLM 端点、一块网盘账号
  （夸克 / 115 / 光鸭 / 123 / 天翼）。
- 开源 0BSD，与上述网盘及 TMDB 均无隶属关系。

**安装**：飞牛 fnOS 按架构下载下面的 `.fpk`（x86 / arm），在应用中心「手动安装」；
其他常开主机用 Docker Compose。

> 说明与部署步骤见 [README](https://github.com/CodeByZack/media-robot)
> 与 [部署文档](https://github.com/CodeByZack/media-robot/blob/main/docs/deploy.md)。

<details>
<summary>本版改动（v1.0.1 → v1.0.2）</summary>

- fix(workflow): 守卫缺了跳过而非抛错 + 夸克 settle 窗口 + 改名保留真实扩展名 (#17) (82d1b92)
- docs(release): 把 RELEASE_NOTES.md 同步为 v1.0.1 的真实正文 (#16) (fa9838b)
- fix(dead-links): 夸克分享接入死链库（封禁/无可用文件永久拉黑） (#14) (11a7e95)
- fix(tv): 集数映射计数只算本季命中，消除自相矛盾文案 (#15) (7ddf287)

</details>
