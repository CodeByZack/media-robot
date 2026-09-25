import { describe, expect, it } from "vitest";
import { posterTransitionName } from "./poster-transition";

describe("posterTransitionName", () => {
  it("同一部作品在同一页面类型下名字一致（两侧才能配上对）", () => {
    const a = posterTransitionName({ tmdbId: 1108427, mediaType: "movie" });
    const b = posterTransitionName({ tmdbId: 1108427, mediaType: "movie" });
    expect(a).toBe(b);
    expect(a).toBe("poster-movie-1108427");
  });

  it("TMDB 的电影/剧集是两套 id 命名空间 —— 同号也必须得到不同的名字", () => {
    // movie 278 与 tv 278 是两部完全无关的作品。若名字只带 id，同一页上同时出现
    // 两者就会撞名，而 View Transition 撞名是**静默失效**（过渡直接不发生）。
    const movie = posterTransitionName({ tmdbId: 278, mediaType: "movie" });
    const tv = posterTransitionName({ tmdbId: 278, mediaType: "tv" });
    expect(movie).not.toBe(tv);
  });

  it("只有两个 id 命名空间：movie 独立，tv/anime/variety 归到 tv", () => {
    // ⚠️ 这里原本断言的是「四个类型互不撞名」—— 那条断言把 bug 固化成了期望：
    // 卡片用 MediaType（含 anime/variety），详情页 kind 只有 tv/movie，四个名字
    // 互不相同就意味着**动漫/综艺永远配不上对**（静默不变形）。
    // 正确的不变量是 TMDB 的命名空间数量（2 个），不是站内的媒体类型数量（4 个）。
    const names = ["movie", "tv", "anime", "variety"].map((mediaType) =>
      posterTransitionName({ tmdbId: 1, mediaType }),
    );
    expect(names).toEqual(["poster-movie-1", "poster-tv-1", "poster-tv-1", "poster-tv-1"]);
  });

  it("生成的是合法 CSS 标识符（不以数字开头、无空格/非法字符）", () => {
    // CSS 自定义标识符：不能以数字开头，不能含空格。非法会让 name 被忽略 → 静默失效。
    for (const mediaType of ["movie", "tv", "anime", "variety"]) {
      const name = posterTransitionName({ tmdbId: 12345, mediaType });
      expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(name).not.toMatch(/\s/);
    }
  });

  it("防御性：mediaType 含异常字符时仍产出合法名字", () => {
    const name = posterTransitionName({ tmdbId: 7, mediaType: "Movie Type" });
    expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it("字段缺失/非法时返回 null 而不是抛错（装饰性功能不该把整页拖成 500）", () => {
    // 实测踩过：运行时 kind 一度为 undefined → 直接 TypeError，整个详情页 500，
    // 而这只影响一个动画。宁可无动画。
    expect(posterTransitionName({ tmdbId: 7, mediaType: undefined as unknown as string })).toBeNull();
    expect(posterTransitionName({ tmdbId: 7, mediaType: "" })).toBeNull();
    expect(posterTransitionName({ tmdbId: Number.NaN, mediaType: "tv" })).toBeNull();
  });
});

describe("类型归一：动漫/综艺必须与详情页配对", () => {
  // 实测踩过：卡片用 MediaType（anime/variety），详情页 view.kind 只有 tv/movie
  // → 名字拼不到一起，且配对失败是**静默**的（不报错、就是不动）。
  it("anime / variety 归到 tv 命名空间", () => {
    expect(posterTransitionName({ tmdbId: 30981, mediaType: "anime" })).toBe("poster-tv-30981");
    expect(posterTransitionName({ tmdbId: 30981, mediaType: "variety" })).toBe("poster-tv-30981");
  });

  it("同一部作品的卡片与详情页拼出同一个名字", () => {
    const id = 30981;
    const fromCard = posterTransitionName({ tmdbId: id, mediaType: "anime" });
    const fromDetail = posterTransitionName({ tmdbId: id, mediaType: "tv" });
    expect(fromCard).toBe(fromDetail);
  });

  it("movie 不被归一化掉（两套 id 命名空间必须区分开）", () => {
    expect(posterTransitionName({ tmdbId: 278, mediaType: "movie" })).toBe("poster-movie-278");
    expect(posterTransitionName({ tmdbId: 278, mediaType: "tv" })).toBe("poster-tv-278");
    expect(posterTransitionName({ tmdbId: 278, mediaType: "movie" })).not.toBe(
      posterTransitionName({ tmdbId: 278, mediaType: "tv" }),
    );
  });

  it("未知类型原样带出，不会与已知类型撞名", () => {
    expect(posterTransitionName({ tmdbId: 7, mediaType: "documentary" })).toBe("poster-documentary-7");
  });
});
