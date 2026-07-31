"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { v, space, pad } from "../lib/theme";

/**
 * Shell für den eingeloggten INTERNEN Bereich (Dashboard + Admin). Legt links
 * eine Navigations-Sidebar an, rechts den Seiteninhalt. Der öffentliche Header
 * darüber bleibt bestehen (Vorgabe) — die Sidebar ist die Navigation INNERHALB
 * des internen Bereichs, nicht ihr Ersatz.
 *
 * Auf schmalen Schirmen (<900px) klappt die Sidebar über den Inhalt: eine
 * horizontal scrollbare Pillen-Reihe statt einer Spalte, damit kein halber
 * Bildschirm für Navigation draufgeht.
 */

type NavLink = { href?: string; label: string; exact?: boolean; children?: NavLink[] };
type NavSection = { title: string; links: NavLink[] };

export default function InternalShell({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const narrow = useIsNarrow();

  const sections: NavSection[] = [
    { title: "Mein Konto", links: [{ href: "/dashboard", label: "Meine Berechnungen" }] },
  ];
  if (isAdmin) {
    sections.push({
      title: "Kommunen",
      links: [
        { href: "/admin/kommunen", label: "Outreach" },
        {
          label: "Award",
          children: [
            { href: "/admin/awards", label: "Rangliste", exact: true },
            { href: "/admin/awards/anschreiben", label: "Anschreiben" },
          ],
        },
      ],
    });
    sections.push({
      title: "Versorger",
      links: [{ href: "/admin/versorger", label: "Stadtwerke" }],
    });
    sections.push({
      title: "System",
      links: [
        { href: "/admin", label: "Übersicht", exact: true },
        { href: "/admin/theme", label: "Signalfarben-Theming" },
        { href: "/admin/prices", label: "Marktpreise" },
        { href: "/admin/charts", label: "Chart-Baukasten" },
        { href: "/admin/waechter", label: "Wächter-Berichte" },
      ],
    });
  }

  return (
    <div
      style={{
        // Der interne Bereich ist breiter als die öffentlichen Seiten: dort
        // begrenzt `--header-max-width` (960px) die Lesebreite, hier stehen
        // Arbeitstabellen mit vielen Spalten. Mit 960px wurde die
        // Kommunen-Tabelle abgeschnitten. 1440px plus Seiten-Gutter, aber nie
        // breiter als das Fenster.
        maxWidth: 1440,
        width: "100%",
        margin: "0 auto",
        // Kein eigenes Top-Padding mehr: der Header→Content-Abstand kommt
        // zentral aus dem (site)-Layout (headerContentGap). Hier bleibt nur das
        // horizontale Seiten-Gutter (16px, wie alle Seiten).
        padding: `0 ${space.xl}px 0`,
        display: "flex",
        flexDirection: narrow ? "column" : "row",
        gap: narrow ? space.md : space.xl,
        alignItems: "flex-start",
      }}
    >
      <Sidebar sections={sections} horizontal={narrow} />
      {/* minWidth:0 lässt breite Inhalte (Charts, Tabellen) im Flex-Kind
          schrumpfen statt die Zeile zu sprengen. */}
      <main style={{ flex: 1, minWidth: 0, width: narrow ? "100%" : undefined, paddingBottom: space.xxl }}>
        {children}
      </main>
    </div>
  );
}

function Sidebar({ sections, horizontal }: { sections: NavSection[]; horizontal: boolean }) {
  const pathname = usePathname();
  const isActive = (l: NavLink) => (!!l.href && (l.exact ? pathname === l.href : pathname.startsWith(l.href)));

  if (horizontal) {
    // Schmale Schirme: alle Links (inkl. Untergruppen-Kinder) als eine
    // scrollbare Pillen-Reihe (Sektionen aufgelöst).
    const links = sections
      .flatMap((s) => s.links)
      .flatMap((l) => l.children ?? [l])
      .filter((l): l is NavLink & { href: string } => !!l.href);
    return (
      <nav
        aria-label="Interner Bereich"
        style={{
          width: "100%",
          display: "flex",
          gap: space.xs,
          overflowX: "auto",
          paddingBottom: space.xs,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={pillStyle(isActive(l))}>
            {l.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Interner Bereich"
      style={{
        flex: "0 0 220px",
        width: 220,
        position: "sticky",
        top: space.md,
        display: "flex",
        flexDirection: "column",
        gap: space.lg,
      }}
    >
      {sections.map((s, i) => (
        <div
          key={s.title}
          style={i > 0 ? { borderTop: `1px solid ${v("--color-border-muted")}`, paddingTop: space.lg } : undefined}
        >
          <div style={sectionTitleStyle}>{s.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {s.links.map((l) =>
              l.children ? (
                <div key={l.label} style={{ marginTop: space.xs }}>
                  <div style={groupLabelStyle}>{l.label}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {l.children.map((c) => (
                      <Link key={c.href} href={c.href!} style={{ ...itemStyle(isActive(c)), paddingLeft: space.lg }}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link key={l.href} href={l.href!} style={itemStyle(isActive(l))}>
                  {l.label}
                </Link>
              ),
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: v("--color-text-faint"),
  padding: `0 ${space.sm}px`,
  marginBottom: space.sm,
};

const groupLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: v("--color-text-secondary"),
  padding: `0 ${space.sm}px`,
  marginBottom: 2,
};

function itemStyle(active: boolean): React.CSSProperties {
  return {
    display: "block",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: active ? 700 : 600,
    color: active ? v("--color-accent") : v("--color-text-secondary"),
    background: active ? v("--color-accent-dim") : "transparent",
    borderRadius: v("--radius-sm"),
    padding: pad("sm", "md"),
    lineHeight: 1.4,
  };
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    flex: "0 0 auto",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: active ? 700 : 600,
    color: active ? v("--color-text-on-accent") : v("--color-text-secondary"),
    background: active ? v("--color-accent") : v("--color-bg-muted"),
    border: `1px solid ${active ? v("--color-accent") : v("--color-border")}`,
    borderRadius: 999,
    padding: pad("xs", "md"),
    whiteSpace: "nowrap",
  };
}

/** <900px → Sidebar klappt über den Inhalt. Erst nach Mount echt ausgewertet. */
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}
