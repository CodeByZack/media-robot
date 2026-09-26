import { beforeEach, describe, expect, it } from "vitest";
import {
  pendingPosterFor,
  posterKeyFromHref,
  posterPathFromSrc,
  setPendingPoster,
  type PendingPoster,
} from "./poster-handoff";

describe("posterKeyFromHref", () => {
  it("从卡片链接取出 tmdbId 与媒体类型", () => {
    expect(posterKeyFromHref("/show/30981?from=library&t=anime")).toEqual({
      tmdbId: 30981,
      mediaType: "anime",
    });
    expect(posterKeyFromHref("/show/1108427?from=search&t=movie")).toEqual({
      tmdbId: 1108427,
      mediaType: "movie",
    });
  });

  it("没有 ?t= 就不认 —— 算不出与详情页一致的名字，拼错只会静默失效", () => {
    expect(posterKeyFromHref("/show/30981")).toBeNull();
    expect(posterKeyFromHref("/show/30981?from=library")).toBeNull();
    expect(posterKeyFromHref("/show/30981?t=")).toBeNull();
  });

  it("只认 /show/<数字>，别的站内链接一律不认", () => {
    expect(posterKeyFromHref("/library?t=tv")).toBeNull();
    expect(posterKeyFromHref("/shows/30981?t=tv")).toBeNull();
    expect(posterKeyFromHref("/show/abc?t=tv")).toBeNull();
    expect(posterKeyFromHref("/show/")).toBeNull();
  });

  it("挡掉空值与非法 URL", () => {
    expect(posterKeyFromHref(null)).toBeNull();
    expect(posterKeyFromHref(undefined)).toBeNull();
    expect(posterKeyFromHref("")).toBeNull();
  });
});

describe("posterPathFromSrc", () => {
  it("取出 TMDB 图片路径", () => {
    expect(posterPathFromSrc("https://image.tmdb.org/t/p/w342/4Uk0Ma.jpg")).toBe("/4Uk0Ma.jpg");
    // 不同尺寸前缀都要认（卡片用 w342、通知用 w154）
    expect(posterPathFromSrc("https://image.tmdb.org/t/p/w154/abc.png")).toBe("/abc.png");
  });

  it("别的来源一律不认（不能把任意 URL 塞进骨架屏）", () => {
    expect(posterPathFromSrc("https://evil.com/t/p/w342/x.jpg")).toBeNull();
    expect(posterPathFromSrc("/local/x.jpg")).toBeNull();
    expect(posterPathFromSrc("data:image/png;base64,AAAA")).toBeNull();
  });

  it("挡掉空值", () => {
    expect(posterPathFromSrc(null)).toBeNull();
    expect(posterPathFromSrc(undefined)).toBeNull();
    expect(posterPathFromSrc("")).toBeNull();
  });
});

describe("pendingPosterFor", () => {
  const entry: PendingPoster = { tmdbId: 30981, name: "poster-tv-30981", posterPath: "/a.jpg" };

  beforeEach(() => {
    setPendingPoster(null);
  });

  it("tmdbId 对不上就返回 null —— 防止串片（点 A、却从别的路径进了 B）", () => {
    setPendingPoster(entry);
    expect(pendingPosterFor(30981)).toEqual(entry);
    expect(pendingPosterFor(999)).toBeNull();
  });

  it("没写入过就是 null（服务端渲染、硬刷新都走这条）", () => {
    expect(pendingPosterFor(30981)).toBeNull();
  });

  it("写 null 能清除（点了没有海报的链接）", () => {
    setPendingPoster(entry);
    setPendingPoster(null);
    expect(pendingPosterFor(30981)).toBeNull();
  });
});
