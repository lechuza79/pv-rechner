import { Metadata } from "next";
import Link from "next/link";
import Header from "../../../../components/Header";
import { IconArrowRight } from "../../../../components/Icons";
import { v, iconSizes } from "../../../../lib/theme";
import { pageMetadata } from "../../../../lib/seo";
import { getNuclearImport, dateLong, buildCitation } from "../figure";

// ISR: same hourly refresh + same live source as the overview page, so the
// citation figure never drifts from what the dashboard shows.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  path: "/atomstrom-import/methodik",
  title: "Atomstrom-Import: Methodik & Quellenangabe",
  description:
    "Wie der rechnerische Atomstrom-Import Deutschlands bestimmt wird: Grenzflüsse gewichtet mit dem Kernkraft-Anteil der Exportländer — Formel, Datenquelle und zitierfähiger Baustein (CC BY 4.0).",
  ogImageTitle: "Atomstrom-Import: Methodik",
  ogImageSubtitle: "Formel, Datenquelle und zitierfähige Quelle.",
});

const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: v("--page-max-width"), margin: "0 auto" },
  back: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-secondary"),
    textDecoration: "none",
    display: "inline-block",
    marginBottom: 20,
  },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.25,
    marginBottom: 24,
  },
  section: { marginTop: 32 },
  h2: { fontSize: v("--font-size-h2"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: 8 },
  p: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.7, marginBottom: 12 },
  formula: {
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-small"),
    lineHeight: 1.7,
    color: v("--color-text-primary"),
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    padding: "14px 16px",
    whiteSpace: "pre-wrap" as const,
  },
  citeBox: {
    background: v("--color-bg-muted"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    padding: "14px 16px",
    fontSize: v("--font-size-small"),
    lineHeight: 1.65,
    color: v("--color-text-primary"),
    fontFamily: v("--font-mono"),
  },
  source: { fontSize: v("--font-size-small"), color: v("--color-text-faint"), marginTop: 28, lineHeight: 1.6 },
};

export default async function AtomstromMethodikPage() {
  const { result, asOf } = await getNuclearImport();
  const avgGw = result?.avg_gw ?? null;
  const standStr = dateLong(asOf);
  const citation = buildCitation(avgGw, standStr);

  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <Link href="/atomstrom-import" style={S.back}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IconArrowRight size={iconSizes.sm} style={{ transform: "rotate(180deg)" }} /> Zurück
            zum Atomstrom-Import
          </span>
        </Link>

        <h1 style={S.h1}>Methodik &amp; Quellenangabe</h1>

        <div style={S.section}>
          <h2 style={S.h2}>Was die Zahl bedeutet</h2>
          <p style={S.p}>
            Strom lässt sich im Netz nicht etikettieren: Sobald er fließt, ist nicht mehr
            unterscheidbar, aus welchem Kraftwerk ein einzelnes Elektron stammt. Wenn Deutschland
            also Strom aus Frankreich importiert, importiert es rechnerisch denselben Mix, den
            Frankreich in dieser Stunde erzeugt — und der besteht zu einem großen Teil aus Kernkraft.
          </p>
          <p style={S.p}>
            Der Import-Wert ist deshalb eine <strong>Hochrechnung</strong>, kein gemessener
            Zählerstand: Er beziffert, wie viel des nach Deutschland fließenden Stroms rechnerisch
            aus Kernkraftwerken der Nachbarländer stammt.
          </p>
        </div>

        <div style={S.section}>
          <h2 style={S.h2}>So wird gerechnet</h2>
          <p style={S.p}>
            Für jede Stunde und jedes Nachbarland, das gerade nach Deutschland exportiert, nehmen wir
            den physischen Grenzfluss und gewichten ihn mit dem Kernkraft-Anteil im Strommix dieses
            Landes zur selben Stunde. Die Summe über alle sechs Länder ergibt den Atomstrom-Import.
          </p>
          <div style={S.formula}>
{`Atomstrom-Import (GW) =
  Σ  Grenzfluss → DE [Land]  ×  Kernkraft-Anteil [Land]

Länder:  Frankreich · Tschechien · Schweiz ·
         Schweden · Belgien · Niederlande
Auflösung: stündlich, nur Importe (positive Flüsse)
Datenquelle: Energy-Charts (Fraunhofer ISE)`}
          </div>
        </div>

        <div style={S.section}>
          <h2 style={S.h2}>So zitieren Sie diese Zahl</h2>
          <p style={S.p}>
            Frei nutzbar unter CC BY 4.0 — mit Quellenangabe. Diesen Baustein können Sie direkt
            übernehmen:
          </p>
          <div style={S.citeBox}>{citation}</div>
        </div>

        <p style={S.source}>
          Datenquelle: Energy-Charts (Fraunhofer ISE), Lizenz CC BY 4.0 — Grenzflüsse und nationale
          Strommixe. Berechnung und Darstellung: Solar Check. Der Wert aktualisiert sich stündlich
          und ist eine rechnerische Näherung, kein gemessener Importwert.
        </p>
      </div>
    </div>
  );
}
