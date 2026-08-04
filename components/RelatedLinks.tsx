import Link from "next/link";
import { IconArrowRight } from "./Icons";
import { iconSizes, space, v } from "../lib/theme";

export interface RelatedLinkItem {
  href: string;
  label: string;
  /** One full sentence on what the reader gets there. Omit for slim utility links. */
  desc?: string;
}

/**
 * The one shared "Weiterlesen" block. Pages pass their editorial link set;
 * the component filters out the current page so sets can be shared between
 * templates (e.g. all funding city pages) without self-links. Rendered as a
 * <nav> so crawlers read it as site structure, not body text.
 */
export default function RelatedLinks({
  title = "Weiterlesen",
  links,
  currentPath,
}: {
  title?: string;
  links: RelatedLinkItem[];
  currentPath?: string;
}) {
  const items = links.filter((l) => l.href !== currentPath);
  if (items.length === 0) return null;
  return (
    <nav aria-label={title} style={{ marginTop: space.xxl, marginBottom: space.xxl }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, margin: `0 0 ${space.lg}px`, color: v("--color-text-primary") }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
        {items.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: "block",
              textDecoration: "none",
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
              padding: `${space.md}px ${space.lg}px`,
              background: v("--color-bg"),
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: space.xs, fontSize: 14, fontWeight: 700, color: v("--color-accent") }}>
              {l.label} <IconArrowRight size={iconSizes.sm} />
            </span>
            {l.desc && (
              <span style={{ display: "block", marginTop: space.xxs, fontSize: 13, lineHeight: 1.5, color: v("--color-text-secondary") }}>
                {l.desc}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
