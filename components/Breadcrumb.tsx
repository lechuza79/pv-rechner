import Link from "next/link";
import { v } from "../lib/theme";
import { BASE_URL } from "../lib/seo";
import { breadcrumbJsonLd, jsonLdHtml } from "../lib/json-ld";

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
 *
 * Pass `jsonLd` to also emit a BreadcrumbList JSON-LD block from the SAME items
 * (SEO) — opt-in, so pages that render their own breadcrumb schema (Förder,
 * Atlas) stay unchanged.
 */
export default function Breadcrumb({ items, jsonLd = false }: { items: Crumb[]; jsonLd?: boolean }) {
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdHtml(breadcrumbJsonLd(items.map((it) => ({ name: it.label, path: it.href })), BASE_URL)),
          }}
        />
      )}
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
    </>
  );
}

const S: Record<string, React.CSSProperties> = {
  nav: {
    fontSize: v("--font-size-small"),
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
