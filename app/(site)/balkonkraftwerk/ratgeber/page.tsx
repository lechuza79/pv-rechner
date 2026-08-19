import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../../components/Breadcrumb";
import RelatedLinks from "../../../../components/RelatedLinks";
import { RATGEBER } from "../../../../lib/ratgeber";
import { pageMetadata } from "../../../../lib/seo";
import { v } from "../../../../lib/theme";

// Kategorie-Übersicht der Balkon-Ratgeber.
//
// WARUM ES DIESE SEITE GIBT: Seit dem 19.08.2026 liegen die Artikel des Bereichs
// unter einem gemeinsamen Pfadstück. Ein Adress-Segment, das ins Leere führt,
// ist ein Fehler — Google crawlt Verzeichnis-Adressen, und eine 404 mitten im
// eigenen Bereich sieht aus wie ein kaputter Umbau. Die Seite beantwortet das
// mit dem, was der Pfad verspricht: allen Artikeln dieses Bereichs.
//
// Die Liste kommt aus der Ratgeber-Registry und filtert auf das Präfix — kein
// zweites Verzeichnis, das man synchron halten müsste. Ein neuer Artikel unter
// /balkonkraftwerk/ratgeber/ steht hier automatisch.

const PRAEFIX = "/balkonkraftwerk/ratgeber/";

export const metadata: Metadata = pageMetadata({
  path: "/balkonkraftwerk/ratgeber",
  title: "Balkonkraftwerk-Ratgeber: alle Artikel im Überblick",
  description:
    "Die Ratgeber rund ums Balkonkraftwerk — Anmeldung im Marktstammdatenregister und die Frage, ob sich ein Speicher trägt. Alle Beispiele live gerechnet, ohne Anmeldung und ohne Verkaufsanruf.",
  ogImageTitle: "Balkonkraftwerk-Ratgeber",
  ogImageSubtitle: "Alle Artikel des Bereichs.",
});

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "0 16px 20px" },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  h1: { fontSize: v("--font-size-h1"), fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: 10 },
  lede: { fontSize: v("--font-size-lead"), color: v("--color-text-muted"), marginBottom: 28, lineHeight: 1.6 },
  karte: {
    display: "block",
    background: v("--color-bg-accent"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    marginBottom: 10,
    textDecoration: "none",
  },
  karteTitel: { fontSize: v("--font-size-h3"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4 },
  karteText: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.6 },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  small: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 },
};

export default function BalkonRatgeberUebersicht() {
  const artikel = RATGEBER.filter(r => r.slug.startsWith(PRAEFIX));

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Balkonkraftwerk", href: "/balkonkraftwerk" },
            { label: "Ratgeber" },
          ]}
          jsonLd
        />
        <h1 style={S.h1}>Balkonkraftwerk-Ratgeber</h1>
        <p style={S.lede}>
          Was man wissen muss, bevor man ein Steckersolargerät kauft, anmeldet oder um
          einen Speicher ergänzt. Jeder Artikel rechnet seine Beispiele mit demselben
          Modell wie der{" "}
          <Link href="/balkonkraftwerk/rechner" style={S.link}>Balkonkraftwerk-Rechner</Link>,
          damit hier nichts steht, was der Rechner anders sagt.
        </p>

        {artikel.map(a => (
          <Link key={a.slug} href={a.slug} style={S.karte}>
            <div style={S.karteTitel}>{a.title}</div>
            <div style={S.karteText}>{a.teaser}</div>
          </Link>
        ))}

        <RelatedLinks
          title="Weiter im Bereich"
          currentPath="/balkonkraftwerk/ratgeber"
          links={[
            { href: "/balkonkraftwerk", label: "Balkonkraftwerk — Überblick", desc: "Ertrag, Kosten, Förderung und Anmeldung auf einer Seite." },
            { href: "/balkonkraftwerk/rechner", label: "Balkonkraftwerk-Rechner", desc: "Ertrag und Amortisation für deinen Haushalt, standortgenau." },
            { href: "/balkonkraftwerk/foerderung", label: "Balkonkraftwerk-Förderung", desc: "Welche Kommunen einen Zuschuss zahlen." },
          ]}
        />

        <p style={{ ...S.small, marginTop: 24 }}>
          Alle Ratgeber der Seite — auch zu Photovoltaik und Wärmepumpe — stehen in der{" "}
          <Link href="/ratgeber" style={S.link}>Ratgeber-Übersicht</Link>.
        </p>
      </div>
    </div>
  );
}
