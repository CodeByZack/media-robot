import { describe, expect, it } from "vitest";
import { parseShowOrigin, sidebarActive } from "./sidebar-active";

describe("sidebarActive", () => {
  it("五个主页面各自高亮", () => {
    expect(sidebarActive("/", null)).toBe("search");
    expect(sidebarActive("/library", null)).toBe("library");
    expect(sidebarActive("/notifications", null)).toBe("notifications");
    expect(sidebarActive("/activity", null)).toBe("activity");
    expect(sidebarActive("/settings", null)).toBe("settings");
  });

  it("子路径也算同一区（/library?type=… 是 pathname /library，但更深的路由也要认）", () => {
    expect(sidebarActive("/library/abc", null)).toBe("library");
    expect(sidebarActive("/settings/account", null)).toBe("settings");
  });

  it("/foreign-work 是通知点进去的，高亮回通知", () => {
    expect(sidebarActive("/foreign-work/run_1", null)).toBe("notifications");
  });

  it("详情页归属用户来路（?from=）", () => {
    expect(sidebarActive("/show/278", "library")).toBe("library");
    expect(sidebarActive("/show/278", "search")).toBe("search");
  });

  it("详情页无从得知来路时不高亮任何一项（不猜）", () => {
    expect(sidebarActive("/show/278", null)).toBe("none");
  });

  it("未知路由不高亮", () => {
    expect(sidebarActive("/nope", null)).toBe("none");
  });
});

describe("parseShowOrigin", () => {
  it("只接受两个已知值", () => {
    expect(parseShowOrigin("search")).toBe("search");
    expect(parseShowOrigin("library")).toBe("library");
    expect(parseShowOrigin("evil")).toBeNull();
    expect(parseShowOrigin(null)).toBeNull();
  });
});

