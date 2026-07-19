import Link from "next/link";
import { v } from "../lib/theme";

export type Crumb = {
  label: string;
  /** Omit on the last item — the page you are already on. */
  href?: string;
};

/**
 * The site's breadcrumb. One implementation, so the separator and spacing cannot
 * drift apart across page types.
 *
 * The separator is a thin rule, not a chevron: that is the established look on
 * the Förder pages, and a shared trail is worth more than a nicer arrow on one
 * branch of the site.
 */
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav style={S.nav} aria-label="Brotkrümel">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} style={S.item}>
          {i > 0 && <span aria-hidden style={S.sep} />}
          {item.href ? (
            <Link href={item.href} style={S.link}>
              {item.label}
            </Link>
          ) : (
            <span style={S.current} aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

const S: Record<string, React.CSSProperties> = {
  nav: {
    fontSize: 12,
    color: v("--color-text-secondary"),
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  item: { display: "inline-flex", alignItems: "center", gap: 8 },
  sep: { width: 14, height: 1, background: v("--color-text-faint"), display: "inline-block" },
  link: { color: "inherit", textDecoration: "none" },
  current: { color: v("--color-text-primary") },
};
