#!/usr/bin/env node
/**
 * 从 apps/web/app/icon.svg 重新生成 fpk 的四个应用图标。
 *
 * 为什么需要这个脚本：图标是**一次性静态资源**（打包时不重新生成，见
 * build-fpk.sh 的说明），所以**换品牌/换图标时很容易漏掉** —— 2026-09-26 就漏过
 * 一次：Web UI、站点、README 全换成了新标，只有飞牛应用中心里还是上游那个绿罗盘。
 * 把生成方式写成脚本 + 在 README/构建脚本里指过来，下次就不会漏。
 *
 * 用 sharp 而不是浏览器/sips/ffmpeg：
 *   - sips / ffmpeg **不能**把 SVG 渲成位图；
 *   - 浏览器能渲但要开页面、截屏，重（且 CI 里没有浏览器）；
 *   - sharp 是 Next 自带的依赖（内部用 librsvg），零新增依赖、跨平台、
 *     直接输出带 alpha 的 PNG。SVG 里 `rect rx="112"` 的圆角外因此保持透明 ——
 *     fnOS 桌面要求如此，用带底色的方图会露出方角。
 *
 * 用法（在仓库根执行）：
 *   node deploy/fpk/make-icons.mjs
 *
 * 改了 apps/web/app/icon.svg 之后就该跑一次，并把结果一起提交。
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SVG = path.join(ROOT, "apps/web/app/icon.svg");

/** fnOS 要求的四个位置：两个在 fpk 根（应用中心用），两个在 app/ui/images
 *  （飞牛桌面图标用）。同尺寸的两份内容必须一致。 */
const TARGETS = [
  { file: "deploy/fpk/ICON.PNG", size: 64 },
  { file: "deploy/fpk/ICON_256.PNG", size: 256 },
  { file: "deploy/fpk/app/ui/images/icon_64.png", size: 64 },
  { file: "deploy/fpk/app/ui/images/icon_256.png", size: 256 },
];

const sharp = require("sharp");

const svg = readFileSync(SVG);
if (!svg.includes("<svg")) {
  console.error(`❌ ${path.relative(ROOT, SVG)} 看起来不是 SVG`);
  process.exit(1);
}

// 每个尺寸渲一次，然后写到引用它的各个路径（避免同尺寸渲两遍）。
const bySize = new Map();
for (const { size } of TARGETS) {
  if (bySize.has(size)) continue;
  const buf = await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
  bySize.set(size, buf);
  console.log(`  渲染 ${size}×${size}  ${buf.length} 字节`);
}

for (const { file, size } of TARGETS) {
  writeFileSync(path.join(ROOT, file), bySize.get(size));
  console.log(`  ✓ ${file}`);
}
console.log(`\n完成：${TARGETS.length} 个图标已更新（源 ${path.relative(ROOT, SVG)}）`);
