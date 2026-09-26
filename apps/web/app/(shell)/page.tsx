import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, CheckCircle2, Clock3, Info, Library, LoaderCircle, TriangleAlert } from "lucide-react";
import { AcquiringPoller } from "../../components/acquiring-poller";
import { RequestTrackButton } from "../../components/request-track-button";
import { AcquireProgressBadge } from "../../components/acquire-progress-badge";
import { DemoSessionLibrary } from "../../components/demo-session-library";
import { PosterTransition } from "../../components/poster-transition";
import { RememberQuery } from "../../components/search-memory";
import { SearchForm } from "../../components/search-form";
import { SeasonRequestMenu } from "../../components/season-request-menu";
import { TrendingRow } from "../../components/trending-row";
import { getSearchView } from "../../lib/search-page";
import { posterNamePicker } from "../../lib/poster-transition";
import {
  getInProgressTitles,
  getLibraryWall,
  type InProgressTitle,
  type LibraryWallEntry,
} from "../../lib/title-hub";
import {
  ensureDemoSeeded,
  getActiveWorkspaceScope,
  getRegisteredDriveCount,
  getWorkflowRepository,
} from "../../lib/workflow-runtime";
import { showHref } from "@mediarobot/workflow";
import type { MediaType, SearchCandidateCard, TrackedSeasonState } from "@mediarobot/workflow";

/** Shelf label for every media type. A Record (not a ternary chain), so adding a
 *  type is a compile error instead of silently landing on the last branch. */
const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: "电影",
  tv: "电视剧",
  anime: "动漫",
  variety: "综艺",
};

/**
 * 搜索（/）。
 *
 * 媒体库已拆成独立路由 /library —— 两者是不同页面（找东西 vs 看我有什么），
 * 不再用 `?tab=` 在同一个 page 里切换。盘进了 cookie，所以 URL 里也不再需要 `?w`。
 *
 * `?q=` 是查询参数（看什么），与路径段的分工一致：路径段放身份，query 放修饰。
 */
export default function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // searchParams is a dynamic input. Reading it inside a Suspense boundary lets
  // the static app shell prerender instead of the whole route blocking on it —
  // this is what silences the cacheComponents "blocking-route" warning.
  //
  // fallback 是 null：外壳（侧栏 + <main>）现在由 (shell)/layout.tsx 提供且**不会**
  // 随导航卸载，所以这里只需等待参数解析，不需要再画一份外壳副本。
  return (
    <Suspense fallback={null}>
      <HomeSurface searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeSurface({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | undefined;
}) {
  const params = (await searchParams) ?? {};
  const query = stringParam(params.q);
  const driveCount = await getRegisteredDriveCount();

  return (
    <section className="search-surface">
      <RememberQuery query={query} />
      {/* 搜索区头部 = 标题 + 表单 +（多盘时）网盘隔离提示。
          提示必须留在 .search-head 里、紧贴 hero —— **距离即归属**：它讲的是
          搜索/获取的行为，就该读作搜索区的一部分。此前它是散在 hero 之后的一个
          裸 <p>（还带 marginTop:-4 的负边距硬塞），离下方货架只有 8px、离 hero
          有 24px，于是眼睛把它读成「热门剧集」的说明文字 —— 位置错了，而不是
          文案错了。 */}
      <div className="search-head">
        <div className="search-hero">
          <div>
            <h1>搜索</h1>
            <p>找到目标后发起获取，后台会处理资源判断、转存和验证。</p>
          </div>
          <SearchForm defaultQuery={query} />
        </div>
        {driveCount >= 2 ? (
          <p className="search-scope-note">
            <Info size={13} aria-hidden />
            搜索与获取按网盘隔离 —— 请先切到目标网盘再操作
          </p>
        ) : null}
      </div>
      <Suspense key={`search-${query}`} fallback={<SearchResultsSkeleton />}>
        <SearchResults query={query} />
      </Suspense>
    </section>
  );
}


async function SearchResults({ query }: { query: string }) {
  const searchView = await getSearchView(query);
  // 共享元素：候选卡海报 → 详情页大图。名字统一从这里出，但**同页撞名的一律不给**
  // （重复的 view-transition-name 会让浏览器放弃整个过渡，见 lib/poster-transition）。
  const candidatePosterName = posterNamePicker(searchView.candidates);
  // Library awareness on results: a tracked title shows WHICH seasons are
  // obtained and routes to the same title page as the library — search must
  // anticipate re-searching something already obtained. Scoped to the active
  // workspace (drive), so "已获取" reflects THIS drive.
  const repository = getWorkflowRepository();
  await ensureDemoSeeded(repository);
  const scope = await getActiveWorkspaceScope();
  const trackedByTmdbId = new Map<number, TrackedSeasonState[]>();
  for (const state of await repository.listTrackedSeasonStates(scope)) {
    // Season-awareness covers anything tracked with seasons — TV AND anime
    // (anime is a TV-shaped title routed to its own library). Only movies, which
    // have no season menu, are excluded. (Was `!== "tv"`, which wrongly hid every
    // acquired anime's tracked state on the search card.)
    if (state.title.type === "movie") {
      continue;
    }
    const list = trackedByTmdbId.get(state.title.tmdbId) ?? [];
    list.push(state);
    trackedByTmdbId.set(state.title.tmdbId, list);
  }

  // Search results auto-update like the library: while ANY acquisition is in
  // flight, mount the poller so the card flips 已请求 → 已获取 the moment the run
  // finishes, with no manual refresh. (Previously only the library mounted it,
  // so a result acquired from search stayed stuck on 已请求.)
  const inProgress = await getInProgressTitles();
  const inProgressIds = new Set(inProgress.map((title) => title.tmdbId));

  return (
    <>
      {inProgress.length > 0 ? <AcquiringPoller /> : null}
      {searchView.state === "empty" ? (
        <TrendingRow />
      ) : searchView.state === "provider_error" ? (
        // TMDB access failed — either no key configured or network unreachable.
        // Show actionable guidance instead of crashing the page.
        <section className="search-results" aria-label="搜索结果">
          <div className="quiet-state compact" role="alert">
            <TriangleAlert size={22} aria-hidden />
            <strong>TMDB 元数据不可用</strong>
            <span>
              未配置 TMDB API Key 或网络不通。请在设置页填入 TMDB API Key。
            </span>
            {searchView.providerError ? (
              <span className="panel-note">{searchView.providerError}</span>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="search-results" aria-label="搜索结果">
          <div className="section-heading">
            <div>
              <h2>结果</h2>
              <p>
                {searchView.candidates.length} 个候选
                {searchView.cacheStatus === "hit" ? "，来自缓存" : ""}
              </p>
            </div>
          </div>
          {searchView.candidates.length > 0 ? (
            <div className="candidate-grid">
              {searchView.candidates.map((candidate) => (
                <CandidateCard
                  candidate={candidate}
                  posterName={candidatePosterName({
                    tmdbId: candidate.tmdbId,
                    mediaType: candidate.mediaType,
                  })}
                  acquiring={inProgressIds.has(candidate.tmdbId)}
                  trackedLabel={
                    // The per-season summary ("第 N 季已获取/追更中") is a TV concept.
                    // A movie has no seasons — let it fall through to its own
                    // 已获取/已追踪 action label instead of an invented "第 1 季".
                    candidate.mediaType === "tv"
                      ? trackedSummaryLabel(
                          trackedByTmdbId.get(candidate.tmdbId) ?? [],
                          candidate.seasonNumbers.length,
                        )
                      : null
                  }
                  trackedSeasonNumbers={(trackedByTmdbId.get(candidate.tmdbId) ?? []).map(
                    (state) => state.season.seasonNumber,
                  )}
                                    key={`${candidate.mediaType}_${candidate.tmdbId}`}
                />
              ))}
            </div>
          ) : (
            <div className="quiet-state compact">
              <TriangleAlert size={22} aria-hidden />
              <strong>没有匹配结果</strong>
              <span>{searchView.query}</span>
            </div>
          )}
        </section>
      )}
    </>
  );
}

/**
 * Concrete library awareness for a result card: not just "tracked", but
 * WHICH seasons are obtained / airing / missing.
 */

function trackedSummaryLabel(states: TrackedSeasonState[], totalSeasonCount: number): string | null {
  if (states.length === 0) {
    return null;
  }
  const seasonNumber = (state: TrackedSeasonState) => state.season.seasonNumber;
  const obtainedCount = (state: TrackedSeasonState) =>
    state.episodes.filter((episode) => episode.obtained).length;
  const complete = states
    .filter(
      (state) =>
        state.season.status === "completed" && obtainedCount(state) >= state.season.totalEpisodes,
    )
    .map(seasonNumber)
    .sort((a, b) => a - b);
  const active = states
    .filter((state) => state.season.status === "active")
    .map(seasonNumber)
    .sort((a, b) => a - b);
  if (totalSeasonCount > 0 && complete.length === totalSeasonCount) {
    return `全 ${totalSeasonCount} 季已获取`;
  }
  const parts: string[] = [];
  if (complete.length > 0) {
    parts.push(`第 ${complete.join("、")} 季已获取`);
  }
  if (active.length > 0) {
    parts.push(`第 ${active.join("、")} 季追更中`);
  }
  const rest = states.length - complete.length - active.length;
  if (rest > 0) {
    parts.push(`${rest} 季有缺集`);
  }
  return parts.join(" · ") || "已追踪";
}


function CandidateCard({
  candidate,
  posterName,
  acquiring,
  trackedLabel,
  trackedSeasonNumbers,
  storageId,
}: {
  candidate: SearchCandidateCard;
  /** 共享元素的 name；null = 本页撞名或字段缺失，这张不做形变（见 lib/poster-transition）。 */
  posterName: string | null;
  /** This title has a queued/running acquisition — show 获取中, not its
   *  (possibly "有缺集") tracked snapshot, which is misleading mid-acquisition. */
  acquiring: boolean;
  trackedLabel: string | null;
  trackedSeasonNumbers: number[];
  /** Tree model: the active workspace drive — acquisition lands HERE. */
  storageId?: string | undefined;
}) {
  const isTv = candidate.mediaType === "tv";
  const trackedSet = new Set(trackedSeasonNumbers);
  // Only seasons NOT yet tracked are offered as acquisition scopes.
  const untrackedSeasons = candidate.seasonNumbers.filter(
    (seasonNumber) => !trackedSet.has(seasonNumber),
  );
  return (
    <article className="candidate-card">
      {/* 共享元素：点开时这张海报会形变到详情页大图，而不是小图消失、大图突兀出现。 */}
      <PosterTransition name={posterName}>
      <Link className="candidate-poster" href={showHref(candidate.tmdbId, "search", candidate.mediaType)} aria-hidden tabIndex={-1}>
        {candidate.posterPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://image.tmdb.org/t/p/w342${candidate.posterPath}`} alt="" loading="lazy" />
        ) : (
          <span>{candidate.title.slice(0, 4)}</span>
        )}
      </Link>
      </PosterTransition>
      <div className="candidate-body">
        <div className="candidate-title-row">
          <div>
            <h3>
              <Link href={showHref(candidate.tmdbId, "search", candidate.mediaType)}>{candidate.title}</Link>
            </h3>
            <p>
              {candidate.year} · {isTv ? "剧集" : "电影"}
            </p>
          </div>
          <div className="candidate-actions">
            {acquiring ? (
              // #3a: while the run is RUNNING, show an inline live progress bar in
              // place (real /api/activity data) — the demo-style elegance the author
              // wanted instead of a bare spinner. When queued/just-finished it falls
              // back to the static 已请求 pill, which still links to the live 活动 page
              // (#6: "真实情况要去活动里看"). seasonNumber null = match this title's
              // running season; storageId scopes the 活动 link with ?w.
              <AcquireProgressBadge
                tmdbId={candidate.tmdbId}
                seasonNumber={null}
                                title="后台正在获取——点查看进度（活动）"
              />
            ) : null}
            {!acquiring && isTv && untrackedSeasons.length > 0 ? (
              <SeasonRequestMenu
                tmdbId={candidate.tmdbId}
                seasonNumbers={untrackedSeasons}
                totalSeasonCount={candidate.seasonNumbers.length}
                allLabel={
                  trackedLabel !== null ? `获取剩余 ${untrackedSeasons.length} 季` : "获取所有季"
                }
                                demoEntry={{
                  tmdbId: candidate.tmdbId,
                  title: candidate.title,
                  year: candidate.year,
                  type: candidate.mediaType,
                  posterPath: candidate.posterPath,
                }}
              />
            ) : null}
            {/* The clickable title is the detail entry already. Only surface an
                explicit 查看详情 when the show is FULLY tracked (no 获取 action
                left) — never crammed next to a 获取 button. */}
            {!acquiring && isTv && trackedLabel !== null && untrackedSeasons.length === 0 ? (
              <Link className="primary-button" href={showHref(candidate.tmdbId, "search", candidate.mediaType)}>
                查看详情
              </Link>
            ) : null}
            {!acquiring && !isTv && trackedLabel === null ? (
              <RequestTrackButton
                candidateId={candidate.id}
                tmdbId={candidate.tmdbId}
                actionState={candidate.action.state}
                disabled={candidate.action.disabled}
                label={candidate.action.label}
                                demoEntry={{
                  tmdbId: candidate.tmdbId,
                  title: candidate.title,
                  year: candidate.year,
                  type: candidate.mediaType,
                  posterPath: candidate.posterPath,
                }}
              />
            ) : null}
          </div>
        </div>
        {candidate.overview ? (
          <p className="candidate-overview">{candidate.overview}</p>
        ) : null}
        <div className="candidate-meta">
          {isTv && candidate.seasonNumbers.length > 0 ? (
            <span>共 {candidate.seasonNumbers.length} 季</span>
          ) : null}
          {!acquiring && trackedLabel !== null ? (
            <span className="hub-badge tone-green">{trackedLabel}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}


function SearchResultsSkeleton() {
  return (
    <div className="candidate-grid" style={{ marginTop: 24 }}>
      <div className="skeleton-card" />
      <div className="skeleton-card" />
    </div>
  );
}


function stringParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

