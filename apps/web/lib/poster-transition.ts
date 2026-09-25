/**
 * 海报共享元素（View Transition）的命名与判定 —— 纯逻辑，可测。
 *
 * 为什么单独抽出来：View Transition 的失效方式**都是静默的** —— 名字重复时整个过渡
 * 直接不发生、不报错；名字里含非法字符同样静默失效。这类问题在浏览器里靠肉眼很难发现，
 * 所以把"名字怎么拼、什么时候该用"放进可测的地方。
 *
 * ⚠️ **名字必须在「同一时刻的整棵树」里唯一**。所以我们带上 mediaType 一起拼：
 * TMDB 的电影与剧集是**两套独立的 id 命名空间**（movie 278 ≠ tv 278），只写
 * `poster-278` 会让同一页上恰好同时存在的两部作品（一部电影 + 一部剧）撞名 ——
 * 那不是理论风险，搜索页的候选卡就可能同时出现。
 */

export interface PosterKeyParts {
  tmdbId: number;
  /** 卡片的 `MediaType`（movie/tv/anime/variety）或详情页的 `kind`（只有 movie/tv）。 */
  mediaType: string;
}

/**
 * 把各种「类型」归一到 TMDB 的 **id 命名空间**（只有 tv / movie 两种）。
 *
 * ⚠️ 不归一化会让动漫/综艺**完全没有形变**（实测踩过）：卡片用的是站内
 * `MediaType`，动漫是 `anime`、综艺是 `variety`（见 domain.ts）；而详情页
 * `view.kind` 只有 `"tv" | "movie"` —— 于是卡片拼出 `poster-anime-30981`、
 * 详情页拼出 `poster-tv-30981`，**配不上对**。而配对失败是静默的：不报错、
 * 就是不动，最难查。
 *
 * 归到 tv 是对的：动漫和综艺在 TMDB 里都走 tv 命名空间（它们本来就是剧集）。
 */
function tmdbNamespace(mediaType: string): string {
  switch (mediaType) {
    case "movie":
      return "movie";
    case "tv":
    case "anime":
    case "variety":
      return "tv";
    default:
      // 未知类型原样带出（仍是合法标识符），至少不会与已知类型撞名。
      return mediaType;
  }
}

/**
 * View Transition 的 `name` 值。
 *
 * CSS 自定义标识符不能以数字开头、不能含空格，所以前面加 `poster-` 前缀，
 * 并把 mediaType 里的非字母数字换成 `-`（当前取值都是纯字母，这一步是防御性的）。
 */
export function posterTransitionName({ tmdbId, mediaType }: PosterKeyParts): string | null {
  // 拿不到类型就**不给名字**，而不是猜一个：猜错的名字不会报错，只会让过渡静默不发生
  // （比崩掉更难查），而猜一个"看起来对"的名字还可能与别的元素撞名。
  // 更要紧的是：这是**装饰性**功能，字段缺失绝不该把整页拖成 500。调用方见 null 时
  // 直接渲染内容（无过渡），功能完全不受影响。
  if (typeof mediaType !== "string" || mediaType === "" || !Number.isFinite(tmdbId)) {
    return null;
  }
  const safe = tmdbNamespace(mediaType).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  // CSS 自定义标识符不能以数字开头（tmdbId 是数字，所以前面必须有前缀），
  // 且不能为空 —— 这两个都由 `poster-${safe}-` 保证。
  return `poster-${safe}-${tmdbId}`;
}
