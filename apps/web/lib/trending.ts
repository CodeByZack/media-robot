import { fetchTmdbList, REALITY_GENRE_ID } from "@mediarobot/workflow";
import { getTmdbAccesses, getAccountScopedSettings, getCurrentAccountId } from "./workflow-runtime";

export type TrendingKind = "movie" | "tv" | "anime" | "variety";

export interface TrendingCard {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  mediaType: "movie" | "tv";
}

/** The four discovery feeds, aligned to the app's 电影/剧集/动漫/综艺 library types.
 *  path + query MUST match workers/tmdb-proxy TRENDING_FEEDS so the proxy serves
 *  the Cron-warmed KV entry (cacheKey = path + sorted query). */
export const TRENDING_KINDS: Record<
  TrendingKind,
  { label: string; path: string; query: Record<string, string>; mediaType: "movie" | "tv" }
> = {
  movie: { label: "热门电影", path: "trending/movie/week", query: { language: "zh-CN" }, mediaType: "movie" },
  tv: { label: "热门剧集", path: "trending/tv/week", query: { language: "zh-CN" }, mediaType: "tv" },
  anime: {
    label: "热门动漫",
    path: "discover/tv",
    // 静态参数;动态 first_air_date.gte 由 trendingFeedQuery 注入(见下)。
    // include_adult=false + vote_count.gte=50 挡成人/里番,只留主流;first_air_date
    // 门槛保证「近期」而非史上最热老番。契约=与 workers/tmdb-proxy getTrendingFeeds
    // 的 anime feed 同 `now` **参数集(名+值)一致**即可,顺序无关(cacheKeyFor 两边都排序)。
    query: {
      include_adult: "false",
      language: "zh-CN",
      sort_by: "popularity.desc",
      "vote_count.gte": "50",
      with_genres: "16",
      with_original_language: "ja",
    },
    mediaType: "tv",
  },
  variety: {
    label: "热门综艺",
    path: "discover/tv",
    // 静态参数;动态 last_air_date.gte 由 trendingFeedQuery 注入(见下)。
    // with_genres 引用判据常量(单一事实源,防与分类器漂移)。注意 workers/tmdb-proxy
    // 侧同 feed 写的是字面量 10764 —— 双侧 cacheKey 契约钉在 handler.test.ts。
    // 与 anime 两处刻意不同(见 design §1.4):
    //  - 无 vote_count.gte —— 综艺投票数极低(地球超新鲜=6、极限挑战=14),50 门槛全灭;
    //  - 用 last_air_date 而非 first_air_date —— 经典季播剧首季很老(极限 2015),
    //    first_air_date 门槛会把整部剧挡掉,而「最近一季还在更」才是热门信号。
    query: {
      include_adult: "false",
      language: "zh-CN",
      sort_by: "popularity.desc",
      with_genres: String(REALITY_GENRE_ID),
      with_original_language: "zh",
    },
    mediaType: "tv",
  },
};

/** 首页货架的展示顺序（设计稿要求的固定次序：剧集 → 综艺 → 电影 → 动漫）。
 *  注意这**不是** feeds 的定义顺序 —— `TRENDING_KINDS` 的 key 集合才是契约。 */
export const TRENDING_KIND_ORDER: TrendingKind[] = ["tv", "variety", "movie", "anime"];

/** Short noun for a card's meta line — the kind label minus the 热门 prefix, so a
 *  card under 热门综艺 reads 「2025 · 综艺」 instead of the full tab label. */
export const TRENDING_NOUN: Record<TrendingKind, string> = {
  movie: "电影",
  tv: "剧集",
  anime: "动漫",
  variety: "综艺",
};

/** Is this string one of the known feed kinds? Derived from the TRENDING_KINDS key
 *  set, so a 5th feed becomes reachable automatically.
 *
 *  注：首页曾用 `?trending=` 药丸切换单个货架，现已改为四块同屏，URL 参数取消；
 *  这个守卫因此暂无生产调用点，但保留 —— 它是 kind 集合的单一事实源校验，
 *  lib 的公开契约 + 有测试覆盖，删掉会让「集合变更」失去编译期外的保障。 */
export function isTrendingKind(value: string): value is TrendingKind {
  return (Object.keys(TRENDING_KINDS) as string[]).includes(value);
}

/** Last-calendar-year floor (rolls yearly): the anime feed shows RECENT seasons,
 *  not TMDB's all-time-popularity classics (全职猎人1999/死神2004…). MUST match
 *  workers/tmdb-proxy handler.ts animeFirstAirDateFloor. */
export function animeFirstAirDateFloor(now: Date = new Date()): string {
  return `${now.getUTCFullYear() - 1}-01-01`;
}

/** Rolling 6-month floor (half a year back, calendar-relative): the variety feed
 *  shows shows that are CURRENTLY airing/recently aired, not TMDB's all-time
 *  popularity classics. MUST match workers/tmdb-proxy handler.ts
 *  varietyLastAirDateFloor. */
export function varietyLastAirDateFloor(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate()));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** The query for a feed, with the rolling date floor injected for anime
 *  (first_air_date) and variety (last_air_date). MUST match workers/tmdb-proxy
 *  getTrendingFeeds for the same `now` — cacheKeyFor sorts params, so the param
 *  SET (not order) is the contract. */
export function trendingFeedQuery(kind: TrendingKind, now: Date = new Date()): Record<string, string> {
  const query = { ...TRENDING_KINDS[kind].query };
  if (kind === "anime") {
    query["first_air_date.gte"] = animeFirstAirDateFloor(now);
  }
  if (kind === "variety") {
    query["last_air_date.gte"] = varietyLastAirDateFloor(now);
  }
  return query;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function yearOf(value: unknown): number | null {
  if (typeof value !== "string" || value.length < 4) return null;
  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

/** Pure: TMDB list body → cards. Tolerates movie(title/release_date) and
 *  tv(name/first_air_date); drops idless/titleless rows; [] on any bad shape. */
export function mapTrendingResults(raw: unknown, kind: TrendingKind): TrendingCard[] {
  const results = isRecord(raw) && Array.isArray(raw.results) ? raw.results : [];
  const mediaType = TRENDING_KINDS[kind].mediaType;
  const cards: TrendingCard[] = [];
  for (const item of results) {
    if (!isRecord(item)) continue;
    const tmdbId = typeof item.id === "number" ? item.id : null;
    const title =
      typeof item.title === "string" ? item.title : typeof item.name === "string" ? item.name : null;
    if (tmdbId === null || !title) continue;
    const poster = typeof item.poster_path === "string" ? item.poster_path : null;
    cards.push({
      tmdbId,
      title,
      year: yearOf(item.release_date) ?? yearOf(item.first_air_date),
      posterPath: poster,
      mediaType,
    });
  }
  return cards;
}

/** Fetch + map one feed. Any failure → [] (silent degrade; the row hides and the
 *  search page falls back to its original empty state). Never throws. */
export async function getTrending(kind: TrendingKind): Promise<TrendingCard[]> {
  try {
    const accesses = await getTmdbAccesses(getAccountScopedSettings(await getCurrentAccountId()));
    const raw = await fetchTmdbList(accesses, TRENDING_KINDS[kind].path, trendingFeedQuery(kind));
    return mapTrendingResults(raw, kind).slice(0, 12);
  } catch {
    return [];
  }
}

/** 首页要一次性展示全部货架（剧集/综艺/电影/动漫从上到下）。
 *  返回**只含非空货架**的有序数组 —— 单个 feed 拿不到就整块不渲染，
 *  而不是留下一个空标题；四个全失败则返回 []，页面回退到原本的空状态。
 *  顺序拉取（undici 对同一 CF Worker 并发请求会因连接池耗尽抛
 *  TypeError: fetch failed — 和 acquire 同族问题）。 */
export async function getTrendingShelves(): Promise<
  Array<{ kind: TrendingKind; label: string; note: string; cards: TrendingCard[] }>
> {
  const cards: TrendingCard[][] = [];
  for (const kind of TRENDING_KIND_ORDER) {
    cards.push(await getTrending(kind));
  }
  return TRENDING_KIND_ORDER.flatMap((kind, index) => {
    const shelfCards = cards[index] ?? [];
    if (shelfCards.length === 0) return [];
    return [{ kind, label: TRENDING_KINDS[kind].label, note: TRENDING_NOUN[kind], cards: shelfCards }];
  });
}
