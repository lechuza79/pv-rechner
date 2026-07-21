import { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "../../../components/Icons";
import { v, iconSizes } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { jsonLdHtml } from "../../../lib/json-ld";
import AtomstromWidget from "./AtomstromWidget";
import AutoHeightIframe from "../../../components/AutoHeightIframe";
import FaqAccordion, { AccordionItem } from "./FaqAccordion";
import { importFaqs, strommixFaqs, zubauFaqs, weitereFaqs } from "./faq-data";
import { getNuclearImport, nf0, nf1, dateLong, PAGE_URL, BASE_URL } from "./figure";

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
  faqHeading: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    color: v("--color-text-secondary"),
    marginBottom: 10,
  },
  p: { fontSize: 13.5, color: v("--color-text-muted"), lineHeight: 1.7, marginBottom: 10 },
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

  // Methodology FAQs — dynamic (depend on the live import figure). They lead the
  // import group directly under the nuclear-share donut.
  const methodikFaqs: AccordionItem[] = [
    {
      q: "Wie viel Atomstrom importiert Deutschland?",
      long: avgGw != null
        ? `Im Durchschnitt der letzten sieben Tage bezieht Deutschland rechnerisch rund ${nf1(avgGw)} GW Atomstrom aus seinen Nachbarländern (Stand ${standStr}) — das sind etwa ${nf0(gwhPerDay!)} GWh pro Tag. Der Wert schwankt je nach Grenzflüssen und der Kernkraft-Auslastung der Nachbarn.`
        : "Deutschland importiert je nach Grenzflüssen und der Kernkraft-Auslastung der Nachbarländer rechnerisch Atomstrom aus Frankreich, Tschechien, der Schweiz, Schweden, Belgien und den Niederlanden.",
    },
    {
      q: "Aus welchen Ländern kommt der importierte Atomstrom?",
      long: "Aus den sechs Nachbarländern mit aktiven Kernkraftwerken, die Strom nach Deutschland exportieren: Frankreich, Tschechien, Schweiz, Schweden, Belgien und Niederlande.",
    },
    {
      q: "Ist der Wert physisch gemessen?",
      long: "Nein, er ist rechnerisch. Strom trägt kein Etikett, sobald er im Netz ist. Wir gewichten den physischen Stromfluss aus jedem Nachbarland mit dem Kernkraft-Anteil im Strommix dieses Landes zur selben Stunde — so ergibt sich der rechnerische Atomstrom-Anteil der Importe.",
    },
  ];

  // Group directly under the donut: methodology first (what is this number?),
  // then the import fact-check arguments.
  const importGroup: AccordionItem[] = [...methodikFaqs, ...importFaqs];

  // FAQPage schema uses every Q/A on the page; short + Erläuterung as one text.
  const allFaqs: AccordionItem[] = [
    ...importGroup,
    ...strommixFaqs,
    ...zubauFaqs,
    ...weitereFaqs,
  ];
  const faqText = (it: AccordionItem) =>
    it.short ? `${it.short}\n\n${it.long}` : it.long;

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
    mainEntity: allFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: faqText(f) },
    })),
  };

  return (
    <div style={S.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(datasetJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqJsonLd) }}
      />
      <div style={S.wrap}>
        <h1 style={S.h1}>Wie viel Atomstrom importiert Deutschland?</h1>
        <p style={S.subtitle}>
          Deutschland hat seine eigenen Kernkraftwerke abgeschaltet — bezieht über das europäische
          Stromnetz aber weiterhin Strom aus Ländern, die Kernkraft nutzen.
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
          <AutoHeightIframe
            src="/embed/zubau-erneuerbare-atom"
            title="Zubau: Erneuerbare vs. Atomkraft"
            fallbackHeight={420}
          />
        </div>

        <div style={S.section}>
          <h2 style={S.h2}>Häufige Fragen &amp; Fakten-Check</h2>

          <h3 style={S.faqHeading}>Atomstrom-Import</h3>
          <FaqAccordion items={importGroup} />

          <h3 style={{ ...S.faqHeading, marginTop: 28 }}>Strommix</h3>
          <FaqAccordion items={strommixFaqs} />

          <h3 style={{ ...S.faqHeading, marginTop: 28 }}>Zubau &amp; Reaktoren</h3>
          <FaqAccordion items={zubauFaqs} />

          <h3 style={{ ...S.faqHeading, marginTop: 28 }}>Weitere Fragen</h3>
          <FaqAccordion items={weitereFaqs} />
        </div>

        <div style={S.section}>
          <h2 style={S.h2}>Methodik &amp; Quellenangabe</h2>
          <p style={S.p}>
            Wie der Import rechnerisch bestimmt wird, die genaue Formel und ein
            zitierfähiger Baustein (CC BY 4.0) stehen auf der Methodik-Seite.
          </p>
          <Link href="/atomstrom-import/methodik" style={S.link}>
            Zur Methodik &amp; Quellenangabe →
          </Link>
        </div>

        <Link href="/strommix-deutschland" style={S.cta}>
          Live-Verlauf im Strommix-Dashboard <IconArrowRight size={iconSizes.md} />
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
