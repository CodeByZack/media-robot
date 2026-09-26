import Link from "next/link";
import { GitHubMark } from "./github-mark";

/** Small open-source nameplate at the bottom of the Settings page — a quiet
 * 暗记 + CTA: self-hosters who dig into Settings are exactly the audience for
 *  "this is open source, here's the repo". Shows on both demo and self-hosted
 *  (demo visitors are potential self-hosters too). No star count (new repo,
 *  thin numbers look bleak) — just the GitHub mark + a one-line pitch. */
export function GitHubNameplate() {
  return (
    <footer className="github-nameplate">
      <Link
        href="https://github.com/CodeByZack/mediarobot"
        target="_blank"
        rel="noopener noreferrer"
        className="github-nameplate-link"
      >
        {/* GitHub mark（共享组件，见 github-mark.tsx）。 */}
        <GitHubMark />
        <span className="github-nameplate-text">
          MediaRobot · 开源自部署 · <span className="github-nameplate-cta">GitHub →</span>
        </span>
      </Link>
    </footer>
  );
}