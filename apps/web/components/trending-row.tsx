import Link from "next/link";
import { Film, RefreshCw, Search } from "lucide-react";
import { getTrendingShelves, TRENDING_NOUN, type TrendingCard, type TrendingKind } from "../lib/trending";

const POSTER = "https://image.tmdb.org/t/p/w342";

/** 首页空态发现区：4 个货架自上而下（剧集 → 综艺 → 电影 → 动漫），每块横向滚动。
 *
 *  此前是「单行 + 药丸 tab 切换」，一次只显示一类；改成设计稿的多货架同屏。
 *  每个 feed 独立降级：某一块拿不到数据就整块不渲染，其余照常显示；
 *  四块全空则回退到原本的「输入目标名称」占位。
 *
 *  海报点击仍走 `?q=<title>`，落回常规搜索结果流 —— 由用户显式选「获取」，
 *  与设计稿里卡片只是入口的定位一致。
 *  `basePath` 是 `/` 或 `/w/<id>`（不带 query），所以 `?` 永远是正确分隔符。 */
export async function TrendingRow({ basePath }: { basePath: string }) {
  const shelves = await getTrendingShelves();
  if (shelves.length === 0) {
    return (
      <div className="quiet-state">
        <Search size={24} aria-hidden />
        <strong>输入目标名称</strong>
        <span>搜索后才会请求元数据。</span>
      </div>
    );
  }
  return (
    <div className="trending" aria-label="近期热门">
      {shelves.map((shelf) => (
        <TrendingShelf key={shelf.kind} shelf={shelf} basePath={basePath} />
      ))}
    </div>
  );
}

function TrendingShelf({
  shelf,
  basePath,
}: {
  shelf: { kind: TrendingKind; label: string; note: string; cards: TrendingCard[] };
  basePath: string;
}) {
  return (
    <section className="section" aria-labelledby={`sec-${shelf.kind}`}>
      <div className="sec-head">
        <h2 id={`sec-${shelf.kind}`}>{shelf.label}</h2>
        <span className="sec-note">
          <RefreshCw size={11} aria-hidden /> TMDB · 每日更新
        </span>
      </div>
      {/* 货架是唯一的横向滚动位（设计 §5：移动端不横向滚，除货架外） */}
      <div className="shelf">
        {shelf.cards.map((card) => (
          <Link
            key={`${card.mediaType}_${card.tmdbId}`}
            className="card"
            href={`${basePath}?q=${encodeURIComponent(card.title)}`}
          >
            <span className="art">
              {card.posterPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${POSTER}${card.posterPath}`} alt="" loading="lazy" />
              ) : (
                <span className="art-fallback">
                  <Film size={22} aria-hidden />
                </span>
              )}
            </span>
            <span className="card-title">{card.title}</span>
            <span className="card-meta">
              {card.year ?? "—"} · {TRENDING_NOUN[shelf.kind]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
