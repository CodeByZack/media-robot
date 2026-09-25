import { Suspense } from "react";
import { CalendarClock, CheckCircle2, Clock3, Library, LoaderCircle, TriangleAlert } from "lucide-react";
import { AcquiringPoller } from "../../../components/acquiring-poller";
import { DemoSessionLibrary } from "../../../components/demo-session-library";
import Link from "next/link";
import { PosterTransition } from "../../../components/poster-transition";
import { posterTransitionName } from "../../../lib/poster-transition";
import { showHref } from "@mediarobot/workflow";
import type { MediaType } from "@mediarobot/workflow";
/** Shelf label for every media type. A Record (not a ternary chain), so adding a
 *  type is a compile error instead of silently landing on the last branch. */
const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: "电影",
  tv: "电视剧",
  anime: "动漫",
  variety: "综艺",
};

import {
  getInProgressTitles,
  getLibraryWall,
  type InProgressTitle,
  type LibraryWallEntry,
} from "../../../lib/title-hub";

function stringParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}


/**
 * 媒体库（/library）。
 *
 * 为什么是路径段而不是 `/?tab=library` —— 媒体库与搜索是**两个页面**，不是同一个
 * 页面的两个镜头：搜索是"找东西"，媒体库是"看我有什么"。旧实现把两者塞进一个
 * page 用 `?tab=` 切换，代价是所有链接都要带 tab 参数、且盘还得再叠一层 `?w`。
 * 盘进 cookie 后，页面级的路径段就能和盘解耦，URL 只剩"看哪个页面 + 怎么看"。
 *
 * `?type=` / `?filter=` 仍是查询参数 —— 它们是"怎么看这个页面"（筛选/排序），
 * 不是另一个页面。这条划分和 URL 里其余部分一致：路径段放身份，query 放修饰。
 */
export default function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <Suspense fallback={<LibrarySurfaceSkeleton />}>
          <LibraryParams searchParams={searchParams} />
        </Suspense>
    </>
  );
}

async function LibraryParams({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | undefined;
}) {
  const params = (await searchParams) ?? {};
  // `?type` is validated against the known shelves: an unrecognized value falls back
  // to the full library. The old three-if filter chain matched nothing for an
  // unrecognized type and leaked every title into that one shelf.
  const typeParam = stringParam(params.type);
  const mediaType: MediaType | "all" =
    typeParam === "movie" || typeParam === "tv" || typeParam === "anime" || typeParam === "variety"
      ? typeParam
      : "all";
  const filter = stringParam(params.filter) || "all";
  return (
    <>
      <DemoSessionLibrary />
      <LibrarySurface mediaType={mediaType} filter={filter} />
    </>
  );
}

async function LibrarySurface({ mediaType, filter }: { mediaType: MediaType | "all"; filter: string;  }) {
  const [rawWall, inProgress] = await Promise.all([getLibraryWall(), getInProgressTitles()]);
  const inProgressIds = new Set(inProgress.map((title) => title.tmdbId));
  // A title still being fetched shows as a 获取中 placeholder, not (yet) a card.
  const wall = rawWall.filter((entry) => !inProgressIds.has(entry.tmdbId));

  if (wall.length === 0 && inProgress.length === 0) {
    return (
      <section className="library-surface">
        <div className="quiet-state">
          <Library size={24} aria-hidden />
          <strong>媒体库还是空的</strong>
          <span>去搜索页发起第一次获取吧。</span>
        </div>
      </section>
    );
  }

  // Homepage: every type as a horizontal row, with in-progress titles shown
  // inline (as 获取中 cards) alongside the landed ones — plus the dedicated
  // 获取中 row at the very top.
  if (mediaType === "all") {
    const byType = (type: MediaType) => ({
      inProgressTitles: inProgress.filter((title) => title.type === type),
      wallEntries: wall.filter((entry) => entry.type === type),
    });
    return (
      <section className="library-surface">
        <div className="section-heading library-heading">
          <div>
            <h1>我的媒体库</h1>
          </div>
        </div>

        {inProgress.length > 0 ? <AcquiringPoller /> : null}
        <InProgressRow titles={inProgress} />

        <CategoryRow label="电影" type="movie" {...byType("movie")} />
        <CategoryRow label="电视剧" type="tv" {...byType("tv")} />
        <CategoryRow label="动漫" type="anime" {...byType("anime")} />
        <CategoryRow label="综艺" type="variety" {...byType("variety")} />
      </section>
    );
  }

  // Category detail page
  const filteredWall = wall.filter((entry) => {
    // Type filter. mediaType is validated above and covers every MediaType, so one
    // equality check is exhaustive (see MEDIA_TYPE_LABELS).
    if (entry.type !== mediaType) return false;
    // State filter
    if (filter === "complete") return entry.state === "complete";
    if (filter === "tracking") return entry.state === "tracking";
    if (filter === "partial") return entry.state === "partial";
    return true;
  });

  const typeLabel = MEDIA_TYPE_LABELS[mediaType];
  const trackingCount = wall
    .filter((entry) => entry.type === mediaType)
    .filter((entry) => entry.state === "tracking" || entry.state === "partial").length;

  return (
    <section className="library-surface">
      <div className="section-heading library-heading">
        <div>
          <h1>
            <Link href="/library" style={{ marginRight: 12, opacity: 0.6 }}>
              ‹
            </Link>
            {typeLabel}
          </h1>
          <p>{trackingCount > 0 && `${trackingCount} 部正在追踪`}</p>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Link
          className={`filter-pill ${filter === "all" ? "is-active" : ""}`}
          href={`/library?type=${mediaType}&filter=all`}
        >
          全部
        </Link>
        <Link
          className={`filter-pill ${filter === "complete" ? "is-active" : ""}`}
          href={`/library?type=${mediaType}&filter=complete`}
        >
          已完结
        </Link>
        <Link
          className={`filter-pill ${filter === "tracking" ? "is-active" : ""}`}
          href={`/library?type=${mediaType}&filter=tracking`}
        >
          追更中
        </Link>
        <Link
          className={`filter-pill ${filter === "partial" ? "is-active" : ""}`}
          href={`/library?type=${mediaType}&filter=partial`}
        >
          有缺集
        </Link>
      </div>

      {inProgress.length > 0 ? <AcquiringPoller /> : null}
      <InProgressRow titles={inProgress.filter((title) => title.type === mediaType)} />

      <div className="poster-wall">
        {filteredWall.map((entry) => (
          <PosterCard entry={entry} key={entry.tmdbId} />
        ))}
      </div>
    </section>
  );
}

function CategoryRow({
  label,
  type,
  inProgressTitles,
  wallEntries,
}: {
  label: string;
  type: string;
  inProgressTitles: InProgressTitle[];
  wallEntries: LibraryWallEntry[];
}) {
  const count = inProgressTitles.length + wallEntries.length;
  if (count === 0) {
    return null;
  }
  return (
    <div className="category-section">
      <Link className="category-header" href={`/library?type=${type}&filter=all`}>
        <h2>
          {label} {count}
        </h2>
        <span className="category-arrow">›</span>
      </Link>
      <div className="poster-row">
        {inProgressTitles.map((title) => (
          <InProgressCard title={title} key={`ip_${title.tmdbId}`} />
        ))}
        {wallEntries.map((entry) => (
          <PosterCard entry={entry} key={entry.tmdbId} />
        ))}
      </div>
    </div>
  );
}

function InProgressRow({ titles }: { titles: InProgressTitle[] }) {
  if (titles.length === 0) {
    return null;
  }
  return (
    <div className="category-section">
      <div className="category-header is-static">
        <h2>获取中 {titles.length}</h2>
      </div>
      <div className="poster-row">
        {titles.map((title) => (
          <InProgressCard title={title} key={title.tmdbId} />
        ))}
      </div>
    </div>
  );
}

function InProgressCard({ title }: { title: InProgressTitle }) {
  return (
    <div className="wall-card is-loading" aria-disabled title="获取中，完成后可进入">
      <span className="wall-poster">
        {title.posterPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://image.tmdb.org/t/p/w342${title.posterPath}`} alt="" loading="lazy" />
        ) : (
          <span className="poster-fallback">{title.title.slice(0, 4)}</span>
        )}
        <span className="wall-loading-overlay">
          <LoaderCircle size={20} className="spin" aria-hidden />
          <span>获取中</span>
        </span>
      </span>
      <span className="wall-copy">
        <strong>{title.title}</strong>
        <span>{title.year} · 正在获取</span>
      </span>
    </div>
  );
}

function PosterCard({ entry }: { entry: LibraryWallEntry; activeStorageId?: string | undefined }) {
  // Completeness and "still airing" are orthogonal: a 缺集 title whose latest
  // season is still releasing shows BOTH ⚠️有缺集 and 追更中 (斗破苍穹), so the
  // blue/indigo "在更" signal isn't swallowed by the warning (parity with 达顿牧场).
  const badges =
    entry.state === "reserved"
      ? [{ tone: "blue", icon: CalendarClock, label: "预定（未上映）" }]
      : entry.state === "complete"
        ? [{ tone: "green", icon: CheckCircle2, label: "已全部入库" }]
        : entry.state === "tracking"
          ? [{ tone: "indigo", icon: Clock3, label: "追更中" }]
          : [
              { tone: "amber", icon: TriangleAlert, label: "有缺集" },
              ...(entry.airing ? [{ tone: "indigo", icon: Clock3, label: "追更中" }] : []),
            ];

  return (
    <Link className="wall-card" href={showHref(entry.tmdbId, "library", entry.type)}>
      {/* 共享元素：点开时这张海报会形变到详情页大图（名字由 lib/poster-transition
          统一拼法，两侧必须一致；mediaType 参与命名是因为 TMDB 的 movie/tv 是两套
          id 命名空间，同号不同片）。 */}
      <PosterTransition name={posterTransitionName({ tmdbId: entry.tmdbId, mediaType: entry.type })}>
        <span className="wall-poster">
        {entry.posterPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`https://image.tmdb.org/t/p/w342${entry.posterPath}`} alt="" loading="lazy" />
        ) : (
          <span className="poster-fallback">{entry.title.slice(0, 4)}</span>
        )}
        <span className="wall-states">
          {badges.map((badge) => {
            const BadgeIcon = badge.icon;
            return (
              <span className={`wall-state tone-${badge.tone}`} title={badge.label} key={badge.label}>
                <BadgeIcon size={13} aria-hidden />
              </span>
            );
          })}
        </span>
        </span>
      </PosterTransition>
      <span className="wall-copy">
        <strong>{entry.title}</strong>
        <span>
          {/* A movie has no seasons/episodes; reserved ones name the release date.
              Series show 已获取/已播/共 (e.g. 6/6/9) so 6/6 of a 9-ep season no
              longer reads as "100% complete". */}
          {entry.type === "movie"
            ? entry.state === "reserved"
              ? `预定 · ${formatReleaseDate(entry.releaseDate)}上映`
              : entry.year
            : `${entry.year} · ${entry.seasonCount} 季 · ${entry.obtainedEpisodes}/${entry.totalAiredEpisodes}/${entry.totalEpisodes} 集`}
        </span>
      </span>
    </Link>
  );
}

/** "2026-12-16" → "12月16日"; falls back to the year when only a year is known. */
function formatReleaseDate(releaseDate: string | null): string {
  if (!releaseDate) {
    return "";
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(releaseDate);
  if (!match) {
    return releaseDate;
  }
  return `${Number(match[2])}月${Number(match[3])}日`;
}


function LibrarySurfaceSkeleton() {
  return (
    <section className="library-surface">
      <div className="skeleton skeleton-heading" />
      <div className="poster-wall">
        <div className="skeleton skeleton-poster" />
        <div className="skeleton skeleton-poster" />
        <div className="skeleton skeleton-poster" />
        <div className="skeleton skeleton-poster" />
      </div>
    </section>
  );
}

