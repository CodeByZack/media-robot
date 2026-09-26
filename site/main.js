import { REPO, repoUrl, starsLabel } from "./lib.mjs";

/**
 * 落地页的 DOM 增强。全部是**渐进增强**：
 * 任何一步失败都不能让页面变残 —— 所以每个 init 都自己兜住错误，
 * 星数取不到就保持 hidden，复制失败就退回「手动选中」。
 */

function setNavScrolled() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  let ticking = false;
  const apply = () => {
    nav.classList.toggle("scrolled", window.scrollY > 8);
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    },
    { passive: true },
  );
  apply();
}

/**
 * star 数：只显示真的从本仓库取到的值。
 * 取不到（限流 / 断网 / 被墙）→ 整块保持 hidden。**绝不**用硬编码的兜底数字 ——
 * 落地页上写一个编造的 star 数比不写更糟。
 */
async function wireStars() {
  const el = document.querySelector("[data-stars]");
  if (!el) return;
  try {
    const ctrl = typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(4000) : undefined;
    const res = await fetch(`https://api.github.com/repos/${REPO}`, ctrl ? { signal: ctrl } : {});
    if (!res.ok) return;
    const { stargazers_count: n } = await res.json();
    const label = starsLabel(n);
    if (!label) return;
    el.textContent = label;
    el.hidden = false;
  } catch {
    // 静默：保持 hidden。这里不需要 console 噪音。
  }
}

/** <details> 手风琴：只能开一个。原生 details[name] 是更好的方案，但写出
 *  兼容分支不如这一行监听来得直接，且不依赖引擎版本。 */
function initFAQ() {
  const faqs = [...document.querySelectorAll("details.faq")];
  if (faqs.length === 0) return;
  for (const d of faqs) {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      for (const other of faqs) if (other !== d) other.open = false;
    });
  }
}

/** 代码块「复制」按钮。clipboard API 要安全上下文（https / localhost）；
 *  file:// 或旧浏览器走 execCommand 兜底。 */
function initCopy() {
  for (const btn of document.querySelectorAll(".copy")) {
    btn.addEventListener("click", async () => {
      const code = btn.closest(".code")?.querySelector("code");
      const text = code?.textContent ?? "";
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        // 兜底：临时 textarea + execCommand，覆盖非安全上下文
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.top = "-1000px";
          document.body.appendChild(ta);
          ta.select();
          ok = document.execCommand("copy");
          ta.remove();
        } catch {
          ok = false;
        }
      }
      const original = btn.textContent;
      btn.textContent = ok ? "已复制" : "请手动选中";
      btn.classList.toggle("ok", ok);
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("ok");
      }, 1600);
    });
  }
}

for (const init of [setNavScrolled, wireStars, initFAQ, initCopy]) {
  try {
    init();
  } catch (err) {
    console.warn(`[site] ${init.name} 初始化失败（已忽略）`, err);
  }
}
