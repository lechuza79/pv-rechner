import { Metadata } from "next";
import Link from "next/link";
import Header from "../../../components/Header";
import { IconArrowRight } from "../../../components/Icons";
import { v } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { computeNuclearImport } from "../../../lib/nuclear-import";
import AtomstromWidget from "./AtomstromWidget";
import AutoHeightIframe from "../../../components/AutoHeightIframe";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
const PAGE_URL = `${BASE_URL}/atomstrom-import`;

// ISR: re-render hourly so the headline figure stays current without a deploy.
// The page reads from the SAME computeNuclearImport() the live dashboard and the
// API route use, so the number can never drift from what the dashboard shows.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  path: "/atomstrom-import",
  title: "Atomstrom-Import Deutschland – wie viel Kernstrom kommt aus dem Ausland?",
  description:
    "Wie viel Atomstrom importiert Deutschland rechnerisch aus seinen Nachbarländern? Aktueller Wert, Methodik und zitierfähige Quelle — berechnet aus Grenzflüssen und dem Kernkraft-Anteil der Exportländer.",
  ogImageTitle: "Atomstrom-Import",
  ogImageSubtitle: "Wie viel Kernstrom Deutschland aus dem Ausland bezieht.",
});

const WINDOW_HOURS = 168; // 7-day rolling average — smooths day/night & FR swings

async function getNuclearImport() {
  const now = new Date();
  const start = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);
  const startStr = start.toISOString().slice(0, 19) + "+01:00";
  const endStr = now.toISOString().slice(0, 19) + "+01:00";
  try {
    const result = await computeNuclearImport(startStr, endStr, WINDOW_HOURS);
    return { result, asOf: now };
  } catch {
    return { result: null, asOf: now };
  }
}

const nf1 = (n: number) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = (n: number) => Math.round(n).toLocaleString("de-DE");
const dateLong = (d: Date) =>
  d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: v("--page-max-width"), margin: "0 auto" },
  h1: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.25,
    marginBottom: 8,
  },
  subtitle: { fontSize: 13.5, color: v("--color-text-muted"), marginBottom: 24, lineHeight: 1.6 },
  hero: {
    background: v("--color-bg-accent"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-lg"),
    padding: "26px 20px",
    textAlign: "center" as const,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    color: v("--color-text-secondary"),
    marginBottom: 10,
  },
  heroValue: {
    fontFamily: v("--font-mono"),
    fontSize: 52,
    fontWeight: 700,
    lineHeight: 1,
    color: v("--color-energy-nuclear-import"),
  },
  heroUnit: { fontSize: 22, fontWeight: 700, color: v("--color-text-muted"), marginLeft: 6 },
  heroSub: { fontSize: 12.5, color: v("--color-text-muted"), marginTop: 12, lineHeight: 1.6 },
  heroStand: {
    fontSize: 11,
    fontFamily: v("--font-mono"),
    color: v("--color-accent"),
    fontWeight: 700,
    marginTop: 8,
  },
  section: { marginTop: 32 },
  h2: { fontSize: 16, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 8 },
  p: { fontSize: 13.5, color: v("--color-text-muted"), lineHeight: 1.7, marginBottom: 10 },
  formula: {
    fontFamily: v("--font-mono"),
    fontSize: 12.5,
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
    fontSize: 12.5,
    lineHeight: 1.65,
    color: v("--color-text-primary"),
    fontFamily: v("--font-mono"),
  },
  faqItem: { marginTop: 16 },
  faqQ: { fontSize: 14, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 5 },
  cta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    padding: "11px 18px",
    borderRadius: v("--radius-md"),
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
  },
  source: { fontSize: 11.5, color: v("--color-text-faint"), marginTop: 28, lineHeight: 1.6 },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
};

export default async function AtomstromImportPage() {
  const { result, asOf } = await getNuclearImport();
  const avgGw = result?.avg_gw ?? null;
  const gwhPerDay = avgGw != null ? avgGw * 24 : null;
  const standStr = dateLong(asOf);

  const citation = avgGw != null
    ? `Atomstrom-Import Deutschland: rund ${nf1(avgGw)} GW im Durchschnitt (7-Tage-Mittel, Stand ${standStr}). Quelle: Solar Check (solar-check.io), berechnet aus Daten von Energy-Charts / Fraunhofer ISE (CC BY 4.0). ${PAGE_URL}`
    : `Atomstrom-Import Deutschland: rechnerischer Kernstrom-Import aus sechs Nachbarländern. Quelle: Solar Check (solar-check.io), berechnet aus Daten von Energy-Charts / Fraunhofer ISE (CC BY 4.0). ${PAGE_URL}`;

  const faqs = [
    {
      q: "Wie viel Atomstrom importiert Deutschland?",
      a: avgGw != null
        ? `Im Durchschnitt der letzten sieben Tage bezieht Deutschland rechnerisch rund ${nf1(avgGw)} GW Atomstrom aus seinen Nachbarländern (Stand ${standStr}) — das sind etwa ${nf0(gwhPerDay!)} GWh pro Tag. Der Wert schwankt je nach Grenzflüssen und der Kernkraft-Auslastung der Nachbarn.`
        : "Deutschland importiert je nach Grenzflüssen und der Kernkraft-Auslastung der Nachbarländer rechnerisch Atomstrom aus Frankreich, Tschechien, der Schweiz, Schweden, Belgien und den Niederlanden.",
    },
    {
      q: "Aus welchen Ländern kommt der importierte Atomstrom?",
      a: "Aus den sechs Nachbarländern mit aktiven Kernkraftwerken, die Strom nach Deutschland exportieren: Frankreich, Tschechien, Schweiz, Schweden, Belgien und Niederlande.",
    },
    {
      q: "Ist der Wert physisch gemessen?",
      a: "Nein, er ist rechnerisch. Strom trägt kein Etikett, sobald er im Netz ist. Wir gewichten den physischen Stromfluss aus jedem Nachbarland mit dem Kernkraft-Anteil im Strommix dieses Landes zur selben Stunde — so ergibt sich der rechnerische Atomstrom-Anteil der Importe.",
    },
  ];

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Atomstrom-Import Deutschland",
    description:
      "Rechnerischer Import von Kernkraft-Strom nach Deutschland aus den sechs Nachbarländern mit Kernkraftwerken (Frankreich, Tschechien, Schweiz, Schweden, Belgien, Niederlande), abgeleitet aus physischen Grenzflüssen gewichtet mit dem Kernkraft-Anteil des jeweiligen Exportlandes.",
    url: PAGE_URL,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "Solar Check", url: BASE_URL },
    isBasedOn: "https://api.energy-charts.info",
    keywords: ["Atomstrom", "Stromimport", "Kernenergie", "Deutschland", "Strommix"],
    ...(avgGw != null
      ? {
          variableMeasured: {
            "@type": "PropertyValue",
            name: "Atomstrom-Import (7-Tage-Mittel)",
            value: avgGw,
            unitText: "GW",
          },
        }
      : {}),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div style={S.page}>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div style={S.wrap}>
        <h1 style={S.h1}>Wie viel Atomstrom importiert Deutschland?</h1>
        <p style={S.subtitle}>
          Deutschland hat seine eigenen Kernkraftwerke abgeschaltet — bezieht über das europäische
          Stromnetz aber weiterhin Strom aus Ländern, die Kernkraft nutzen. Diese Seite zeigt, wie
          viel davon rechnerisch Atomstrom ist, aktuell und mit offengelegter Methodik.
        </p>

        <AutoHeightIframe
          src="/embed/strommix-anteil"
          title="Kernenergie im deutschen Strommix"
          fallbackHeight={400}
        />

        <div style={S.section}>
          <AtomstromWidget />
        </div>

        <div style={S.section}>
          <h2 style={S.h2}>Erneuerbare vs. Atomkraft im Zubau</h2>
          <p style={S.p}>
            Während Deutschland Atomstrom importiert, zeigt der jährliche Zubau,
            worauf tatsächlich gesetzt wird — wählbar je Land, plus direkter
            Vergleich Deutschland ↔ China.
          </p>
          <AutoHeightIframe
            src="/embed/zubau-erneuerbare-atom"
            title="Zubau: Erneuerbare vs. Atomkraft"
            fallbackHeight={420}
          />
        </div>

        <div style={S.section}>
          <h2 style={S.h2}>Was die Zahl bedeutet</h2>
          <p style={S.p}>
            Strom lässt sich im Netz nicht etikettieren: Sobald er fließt, ist nicht mehr
            unterscheidbar, aus welchem Kraftwerk ein einzelnes Elektron stammt. Wenn Deutschland
            also Strom aus Frankreich importiert, importiert es rechnerisch denselben Mix, den
            Frankreich in dieser Stunde erzeugt — und der besteht zu einem großen Teil aus Kernkraft.
          </p>
          <p style={S.p}>
            Der Wert oben ist deshalb eine <strong>Hochrechnung</strong>, kein gemessener Zählerstand:
            Er beziffert, wie viel des nach Deutschland fließenden Stroms rechnerisch aus
            Kernkraftwerken der Nachbarländer stammt.
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

        <div style={S.section}>
          <h2 style={S.h2}>Häufige Fragen</h2>
          {faqs.map((f) => (
            <div key={f.q} style={S.faqItem}>
              <div style={S.faqQ}>{f.q}</div>
              <p style={S.p}>{f.a}</p>
            </div>
          ))}
        </div>

        <Link href="/strommix-deutschland" style={S.cta}>
          Live-Verlauf im Strommix-Dashboard <IconArrowRight size={14} />
        </Link>

        <p style={S.source}>
          Datenquelle: Energy-Charts (Fraunhofer ISE), Lizenz CC BY 4.0 — Grenzflüsse und nationale
          Strommixe. Berechnung und Darstellung: Solar Check. Der Wert aktualisiert sich stündlich
          und ist eine rechnerische Näherung, kein gemessener Importwert.
        </p>
      </div>
    </div>
  );
}
