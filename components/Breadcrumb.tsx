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
  // Die Startseite wird generell nicht angezeigt — zentral hier gefiltert, damit
  // die Aufrufer sie weiter mitgeben können (und das strukturierte Datenblatt
  // dieselbe Kette abbildet wie die sichtbare Spur).
  const crumbs = items.filter((it) => it.href !== "/");
  // Bleibt nur die aktuelle Seite übrig (typisch für Seiten direkt unter der
  // Startseite), ist das keine Spur mehr — dann gar nichts rendern, auch kein
  // BreadcrumbList mit einem einzigen Eintrag.
  if (crumbs.length < 2) return null;
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdHtml(breadcrumbJsonLd(crumbs.map((it) => ({ name: it.label, path: it.href })), BASE_URL)),
          }}
        />
      )}
      <nav className="crumb-nav" style={S.nav} aria-label="Brotkrümel">
        {crumbs.map((item, i) => (
          <span key={`${item.label}-${i}`} className="crumb-item" style={S.item}>
            {i > 0 && <span aria-hidden style={S.sep} />}
            {item.href ? (
              <Link href={item.href} className="crumb-label" style={S.link}>
                {item.label}
              </Link>
            ) : (
              <span className="crumb-label" style={S.current} aria-current="page">
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
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
    marginBottom: 30,
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  item: { display: "inline-flex", alignItems: "center", gap: 8 },
  sep: { width: 14, height: 1, background: v("--color-text-faint"), display: "inline-block" },
  // Nur die Links tragen Farbe (heller Akzent). Die aktuelle Seite ist kein
  // Ziel mehr und steht deshalb in hellem Grau, nicht im Link-Blau.
  link: { color: v("--color-accent-light"), textDecoration: "none" },
  current: { color: v("--color-text-faint") },
};
