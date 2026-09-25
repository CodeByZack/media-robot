import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { isMovieUnreleased } from "@mediarobot/workflow";
import { AcquiringPoller } from "../../../../components/acquiring-poller";
import { AcquisitionLockProvider } from "../../../../components/acquisition-lock";
import { PosterTransition } from "../../../../components/poster-transition";
import { posterTransitionName } from "../../../../lib/poster-transition";
import { BackLink } from "../../../../components/back-link";
import { MovieSynopsis } from "../../../../components/movie-synopsis";
import { RequestTrackButton } from "../../../../components/request-track-button";
import {
  RequestRemainingButton,
  RequestSeasonButton,
} from "../../../../components/title-action-buttons";
import { UntrackButton } from "../../../../components/untrack-button";
import type { DemoAcquisitionEntry } from "../../../../lib/demo-session";
import {
  getDetailView,
  type MovieHubView,
  type TitleHubSeason,
  type TitleHubView,
} from "../../../../lib/title-hub";
import { seasonBadgeState } from "../../../../lib/title-aggregate";
import { getActiveWorkspaceScope } from "../../../../lib/workflow-runtime";

const aggregateBadge = {
  untracked: null,
  tracking: { label: "追更中", tone: "indigo" },
  partial: { label: "部分入库", tone: "amber" },
  complete: { label: "已全部入库", tone: "green" },
} as const;

const seasonBadge = {
  untracked: null,
  missing: { label: "缺集", tone: "amber" },
  airing: { label: "追更中", tone: "indigo" },
  complete: { label: "已完结", tone: "green" },
} as const;

export default function ShowPage({
  params,
  searchParams,
}: {
  params: Promise<{ tmdbId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Everything here is dynamic (searchParams + params + DB), so the whole shell
  // streams inside one Suspense — cacheComponents forbids reading uncached data
  // outside a boundary. The fallback mirrors the hub骨架（侧栏与 <main> 已由
  // (shell)/layout.tsx 提供，这里只需骨架）。
  return (
    <Suspense
      fallback={<HubSkeleton backLabel="返回" backHref="/" />}
    >
      <ShowContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ShowContent({
  params,
  searchParams,
}: {
  params: Promise<{ tmdbId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>> | undefined;
}) {
  await connection();
  // 搜索是搜索，媒体库是媒体库: the title page belongs to whichever surface the
  // user came FROM. Entry links carry ?from=search|library; back keeps the
  // previous list state (history.back preserves the search query).
  const params0 = (await searchParams) ?? {};
  const fromParam = params0["from"];
  const from = fromParam === "library" ? "library" : fromParam === "search" ? "search" : null;
  // The title page resolves against the CURRENT drive (cookie), which is the one the
  // user is browsing — so a non-primary title is found in the right scope instead of
  // falling back to a TMDB lookup of the same numeric id in the OTHER namespace
  // (movie 278 ≠ tv 278 = unrelated show).
  const workspace = await getActiveWorkspaceScope();
  // `t` (the card's media type) disambiguates TMDB's movie/tv id namespaces for an
  // untracked title — without it a movie id can resolve to an unrelated tv show.
  const tParam = params0["t"];
  const tRaw = Array.isArray(tParam) ? tParam[0] : tParam;
  const typeHint = tRaw === "movie" || tRaw === "tv" || tRaw === "anime" || tRaw === "variety" ? tRaw : undefined;
  const { tmdbId: tmdbIdParam } = await params;
  const tmdbId = Number(tmdbIdParam);
  const view = Number.isInteger(tmdbId)
    ? await getDetailView(tmdbId, workspace.connectedStorageId ?? undefined, typeHint)
    : null;

  const backLabel = from === "search" ? "搜索" : from === "library" ? "媒体库" : "返回";
  const backHref = from === "library" ? "/library" : "/";

  return (
    <>
      {view ? (
        view.kind === "movie" ? (
          <MovieHub
            view={view}
            backLabel={backLabel}
            backHref={backHref}
          />
        ) : (
          <TvHub
            view={view}
            backLabel={backLabel}
            backHref={backHref}
          />
        )
      ) : (
        <div className="quiet-state">
          <BackLink label={backLabel} fallbackHref={backHref} />
          <TriangleAlert size={24} aria-hidden />
          <strong>没有找到这部影片</strong>
          <span>回到搜索页重新查找。</span>
        </div>
      )}
    </>
  );
}

function TvHub({
  view,
  backLabel,
  backHref,
}: {
  view: TitleHubView;
  backLabel: string;
  backHref: string;
}) {
  const badge = aggregateBadge[view.aggregate];
  return (
    <AcquisitionLockProvider>
    {view.acquiring ? <AcquiringPoller /> : null}
    <section className="title-hub title-hub-immersive">
      {/* Backdrop clipped to hub-hero only — seasons stay on plain page bg. */}
      <div className="hub-hero">
        {view.backdropPath ? (
          <div
            className="hub-backdrop"
            style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w1280${view.backdropPath})` }}
            aria-hidden
          />
        ) : null}
        <BackLink label={backLabel} fallbackHref={backHref} />
      <header className="hub-header">
        {/* 共享元素：从媒体库/搜索卡片形变过来（名字由 lib/poster-transition 拼，
            两侧一致才配上对）。 */}
        <PosterTransition name={posterTransitionName({ tmdbId: view.tmdbId, mediaType: view.kind })}>
          <div className="hub-poster">
          {view.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w342${view.posterPath}`}
              alt={`${view.title} 海报`}
            />
          ) : (
            <span className="poster-fallback">{view.title.slice(0, 4)}</span>
          )}
          </div>
        </PosterTransition>
        <div className="hub-title-block">
          {/* 缺集 and 在更 are orthogonal: a partial title whose latest season is
              still releasing shows 追更中 alongside 部分入库 (斗破苍穹) — side by
              side in a row, not stacked. */}
          {badge ? (
            <div className="hub-badges">
              <span className={`hub-badge tone-${badge.tone}`}>{badge.label}</span>
              {view.airing && view.aggregate === "partial" ? (
                <span className="hub-badge tone-indigo">追更中</span>
              ) : null}
            </div>
          ) : null}
          <h1>
            {view.title} <span className="hub-year">({view.year})</span>
          </h1>
          <p className="hub-attributes">
            {view.seasons.length} 季
            {view.originalTitle && view.originalTitle !== view.title
              ? ` · ${view.originalTitle}`
              : ""}
          </p>
          <div className="hub-actions">
            {/* Single-season titles get their button on the season row. */}
            {view.untrackedSeasonNumbers.length > 0 && view.seasons.length > 1 ? (
              <RequestRemainingButton
                tmdbId={view.tmdbId}
                  titleAcquiring={view.acquiring}
                label={
                  view.aggregate === "untracked"
                    ? "获取所有季"
                    : `获取剩余 ${view.untrackedSeasonNumbers.length} 季`
                }
                demoEntry={{
                  tmdbId: view.tmdbId,
                  title: view.title,
                  year: view.year,
                  type: "tv",
                  posterPath: view.posterPath,
                }}
              />
            ) : null}
            {view.aggregate !== "untracked" ? (
              <UntrackButton tmdbId={view.tmdbId} mediaKind="tv" />
            ) : null}
          </div>
        </div>
      </header>
      </div>

      <div className="hub-body">
        {view.overview ? <MovieSynopsis overview={view.overview} /> : null}
      </div>

      <section className="hub-seasons" aria-label="季列表">
        <ul className="hub-season-list">
          {view.seasons.map((season) => (
            <SeasonRow
              key={season.seasonNumber}
              season={season}
              tmdbId={view.tmdbId}
              acquiring={view.acquiring}
              demoEntry={{
                tmdbId: view.tmdbId,
                title: view.title,
                year: view.year,
                type: "tv",
                posterPath: view.posterPath,
              }}
            />
          ))}
        </ul>
      </section>
    </section>
    </AcquisitionLockProvider>
  );
}

const movieStateMeta = {
  acquired: { label: "已入库", tone: "green" },
  reserved: { label: "预定 · 未上映", tone: "blue" },
  acquiring: { label: "获取中", tone: "indigo" },
  missing: { label: "未获取", tone: "amber" },
  untracked: { label: "未追踪", tone: "muted" },
} as const;

/** A movie's detail page: immersive hero + full synopsis body (no season grid). */
function MovieHub({
  view,
  backLabel,
  backHref,
}: {
  view: MovieHubView;
  backLabel: string;
  backHref: string;
}) {
  const meta = movieStateMeta[view.state];
  const activityHref = "/activity";
  const nowIso = new Date().toISOString();
  const unreleased =
    view.state === "untracked" && isMovieUnreleased(view.releaseDate, nowIso);
  const movieCandidateId = `tmdb_movie_${view.tmdbId}`;
  const chips: Array<{ label: string; value: string }> = [];
  if (view.releaseDate) chips.push({ label: "上映", value: formatMovieDate(view.releaseDate) });
  if (view.originalTitle && view.originalTitle !== view.title) {
    chips.push({ label: "原名", value: view.originalTitle });
  }
  chips.push({ label: "类型", value: "电影" });

  return (
    <AcquisitionLockProvider>
      {view.acquiring ? <AcquiringPoller /> : null}
      <section className="title-hub title-hub-immersive">
        {/* Backdrop lives inside hub-hero only — must NOT cover synopsis body. */}
        <div className="hub-hero">
          {view.backdropPath ? (
            <div
              className="hub-backdrop"
              style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w1280${view.backdropPath})` }}
              aria-hidden
            />
          ) : null}
          <BackLink label={backLabel} fallbackHref={backHref} />
          <header className="hub-header">
            {/* 共享元素：从媒体库/搜索卡片形变过来（名字由 lib/poster-transition 拼，
                两侧一致才配上对）。 */}
            <PosterTransition name={posterTransitionName({ tmdbId: view.tmdbId, mediaType: view.kind })}>
              <div className="hub-poster">
              {view.posterPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`https://image.tmdb.org/t/p/w342${view.posterPath}`} alt={`${view.title} 海报`} />
              ) : (
                <span className="poster-fallback">{view.title.slice(0, 4)}</span>
              )}
              </div>
            </PosterTransition>
            <div className="hub-title-block">
              <span className={`hub-badge tone-${meta.tone}`}>{meta.label}</span>
              <h1>
                {view.title} <span className="hub-year">({view.year})</span>
              </h1>
              <p className="hub-attributes">电影</p>
              <div className="hub-actions">
                {view.state === "untracked" ? (
                  <RequestTrackButton
                    candidateId={movieCandidateId}
                    tmdbId={view.tmdbId}
                    actionState={unreleased ? "can_reserve" : "can_request"}
                    label={unreleased ? "预定" : "获取"}
                        />
                ) : null}
                {view.state === "acquiring" ? (
                  <Link className="primary-button" href={activityHref}>
                    查看活动
                  </Link>
                ) : null}
                {view.state !== "untracked" ? (
                  <UntrackButton tmdbId={view.tmdbId} mediaKind="movie" />
                ) : null}
              </div>
              {view.state === "missing" ? (
                <p className="hub-missing-note">已上映但仍缺资源，日常巡检会继续尝试。</p>
              ) : null}
            </div>
          </header>
        </div>
        <div className="hub-body">
          {view.overview ? <MovieSynopsis overview={view.overview} /> : null}
          {chips.length > 0 ? (
            <div className="movie-meta-chips">
              {chips.map((chip) => (
                <span key={`${chip.label}-${chip.value}`} className="movie-meta-chip">
                  {chip.label} <strong>{chip.value}</strong>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </AcquisitionLockProvider>
  );
}

function formatMovieDate(releaseDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(releaseDate);
  return match ? `${match[1]}年${Number(match[2])}月${Number(match[3])}日` : releaseDate;
}

/** Shared placeholder while the hub streams. Header-only — no fake TV season
 *  rows (movies have none; TV content replaces this quickly). */
function HubSkeleton({ backLabel, backHref }: { backLabel: string; backHref: string }) {
  return (
    <section className="title-hub title-hub-immersive">
      <div className="hub-hero">
        <BackLink label={backLabel} fallbackHref={backHref} />
        <header className="hub-header">
          <div className="skeleton skeleton-hub-poster" />
          <div className="skeleton-hub-titleblock">
            <div className="skeleton skeleton-hub-badge" />
            <div className="skeleton skeleton-hub-h1" />
            <div className="skeleton skeleton-hub-line" />
            <div className="skeleton skeleton-hub-line short" />
            <div className="skeleton skeleton-hub-line short" />
          </div>
        </header>
      </div>
      <div className="hub-body movie-synopsis" aria-hidden>
        <div className="skeleton skeleton-hub-section" />
        <div className="skeleton skeleton-hub-line" />
        <div className="skeleton skeleton-hub-line" />
        <div className="skeleton skeleton-hub-line short" />
      </div>
    </section>
  );
}

function SeasonRow({
  season,
  tmdbId,
  acquiring,
  demoEntry,
}: {
  season: TitleHubSeason;
  tmdbId: number;
  acquiring: boolean;
  demoEntry?: DemoAcquisitionEntry | undefined;
}) {
  const total = season.totalEpisodes;
  const aired = Math.min(season.latestAiredEpisode, total);
  // Obtained never exceeds aired for bar purposes (resource-ahead caps at aired).
  const obtained = Math.min(season.obtainedCount, aired);
  const airedPct = total > 0 ? (aired / total) * 100 : 0;
  const obtainedPct = total > 0 ? (obtained / total) * 100 : 0;

  const badge = seasonBadge[seasonBadgeState(season)];

  const rowBody = (
    <>
      <span className="season-cell-name">第 {season.seasonNumber} 季</span>
      <span className="season-cell-count">{total} 集</span>
      {badge ? (
        <span className={`hub-badge tone-${badge.tone}`}>{badge.label}</span>
      ) : (
        <span className="hub-badge tone-muted">未追踪</span>
      )}
      <span className="season-cell-progress" aria-hidden>
        {season.tracked ? (
          <>
            <span className="seg-aired" style={{ width: `${airedPct}%` }} />
            <span className="seg-obtained" style={{ width: `${obtainedPct}%` }} />
          </>
        ) : null}
      </span>
      {/* 已获取 / 已播 / 总集数 — so 6/6 of a 9-ep season isn't read as complete. */}
      <span className="season-cell-obtained">
        {season.tracked ? `${season.obtainedCount}/${aired}/${total}` : "—"}
      </span>
    </>
  );

  if (!season.tracked) {
    return (
      <li className="hub-season-row untracked">
        {rowBody}
        <RequestSeasonButton
          tmdbId={tmdbId}
          seasonNumber={season.seasonNumber}
          titleAcquiring={acquiring}
          demoEntry={demoEntry}
        />
      </li>
    );
  }

  return (
    <li>
      <details className="hub-season-details">
        <summary className="hub-season-row">{rowBody}</summary>
        <div className="episode-grid hub-episode-grid">
          {season.episodes.map((episode) => (
            <div
              className={`episode-cell ${episode.displayState.replace("_", "-")}`}
              key={episode.episodeCode}
            >
              <strong>{episode.episodeCode.replace(/^S\d+/, "")}</strong>
              <span>
                {episode.displayState === "obtained"
                  ? "已获取"
                  : episode.displayState === "missing_aired"
                    ? "缺集"
                    : episode.displayState === "provider_ahead"
                      ? "超前"
                      : episode.displayState === "unaired"
                        ? "未播"
                        : "未知"}
              </span>
            </div>
          ))}
        </div>
        <div className="season-untrack-row">
          <UntrackButton
            tmdbId={tmdbId}
              mediaKind="tv"
            seasonNumber={season.seasonNumber}
            label={`取消第 ${season.seasonNumber} 季追踪`}
          />
        </div>
      </details>
    </li>
  );
}

