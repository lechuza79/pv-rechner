import { Metadata } from "next";
import Link from "next/link";
import ArticleMeta from "../../../components/ArticleMeta";
import Breadcrumb from "../../../components/Breadcrumb";
import Faq from "../../../components/Faq";
import GlossaryTerm from "../../../components/GlossaryTerm";
import { DataSourceNote } from "../../../components/PoweredBy";
import RelatedLinks from "../../../components/RelatedLinks";
import { DATA_SOURCES } from "../../../lib/data-sources";
import { einspeiseverguetungTabelleFaq } from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import { FEED_IN_YEARS } from "../../../lib/constants";
import {
  feedInEndIso,
  feedInPeriodsSince2022,
  feedInRatesFor,
} from "../../../lib/feedin-config";
import { FEED_IN_ARCHIV } from "../../../lib/feedin-archiv";
import {
  FEEDIN_HISTORY_VALUES,
  FEEDIN_HISTORY_YEARS,
} from "../../../lib/feedin-history";
import { eegDatum, eegReformStandLabel, eegVerfahrenSatz } from "../../../lib/eeg-reform-config";
import { MARKTWERT_SOLAR_HISTORIE } from "../../../lib/marktwert-config";
import { fetchMarketPrices } from "../../../lib/prices-server";
import VerlaufsChart, { MONAT_KURZ, verlaufJahre } from "./VerlaufsChart";

// Jede Zahl auf dieser Seite kommt live aus den geprüften Modulen
// (feedin-config-Kette, BNetzA-Monatsarchiv, SFV-Jahresreihe) — nichts ist
// handgetippt (Zahlen-Korrektheit-BLOCKER). ISR statt Rebuild, damit der
// Stichtags-Plan (1.2./1.8.) und der Strompreis von selbst aktuell bleiben.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const year = new Date().getFullYear();
  return pageMetadata({
    path: "/einspeiseverguetung-tabelle",
    title: `Einspeisevergütung ${year}: aktuelle Sätze & Tabelle seit 2000`,
    description:
      "Wie hoch ist die Einspeisevergütung? Aktuelle EEG-Sätze für Teil- und Volleinspeisung plus die komplette Tabelle: amtliche Monatswerte 2012–2022 für Bestandsanlagen, Halbjahres-Sätze seit 2022, Jahreswerte seit 2000 — und was nach 20 Jahren passiert.",
    ogImageTitle: "Einspeisevergütung: die komplette Tabelle",
    ogImageSubtitle: "Aktuelle Sätze und alle historischen Werte seit 2000.",
  });
}

// ─── Styles (content-page conventions, same tokens as die anderen Ratgeber) ──
const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: v("--color-text-primary"),
    lineHeight: 1.25,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: v("--font-size-lead"),
    color: v("--color-text-muted"),
    marginBottom: 24,
    lineHeight: 1.6,
  },
  h2: {
    fontSize: v("--font-size-h2"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginTop: 32,
    marginBottom: 10,
  },
  h3: {
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    marginTop: 20,
    marginBottom: 8,
  },
  p: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: 12,
  },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
  hero: {
    background: v("--color-bg-accent"),
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    marginBottom: 8,
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    lineHeight: 1.7,
  },
  card: {
    background: v("--color-bg"),
    borderRadius: v("--radius-md"),
    padding: "14px 16px",
    border: `1px solid ${v("--color-border")}`,
    marginBottom: 12,
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
  },
  label: {
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 6,
    display: "block",
  },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
  muted: { color: v("--color-text-muted") },
  ctaButton: {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: v("--radius-md"),
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    textDecoration: "none",
  },
  ctaSecondary: {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: v("--radius-md"),
    fontSize: v("--font-size-body"),
    fontWeight: 700,
    border: `1px solid ${v("--color-border")}`,
    color: v("--color-accent"),
    textDecoration: "none",
  },
  th: {
    textAlign: "right" as const,
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap" as const,
  },
  thLeft: {
    textAlign: "left" as const,
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap" as const,
  },
  td: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    lineHeight: 1.4,
    whiteSpace: "nowrap" as const,
  },
  tdNum: {
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-small"),
    color: v("--color-text-primary"),
    textAlign: "right" as const,
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap" as const,
  },
  small: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    lineHeight: 1.6,
  },
};

// ─── Formatierung (deutsche Zahlen, Datumsangaben) ───────────────────────────
const ct = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2 });
const dd = (iso: string) => iso.split("-").reverse().join(".");

/** Nächster Degressions-Stichtag nach § 49 EEG (1.2. / 1.8.) nach heute. */
function naechsteAbsenkungIso(todayIso: string): string {
  const y = Number(todayIso.slice(0, 4));
  for (const c of [`${y}-02-01`, `${y}-08-01`, `${y + 1}-02-01`]) {
    if (c > todayIso) return c;
  }
  return `${y + 1}-02-01`;
}

// ─── Monats-Matrix aus dem BNetzA-Archiv (Zeile = Jahr, Spalte = Monat) ──────
function archivMatrix(field: "u10" | "u40"): { year: number; months: (number | null)[] }[] {
  const byYear = new Map<number, (number | null)[]>();
  for (const row of FEED_IN_ARCHIV) {
    const y = Number(row.ym.slice(0, 4));
    const m = Number(row.ym.slice(5, 7));
    if (!byYear.has(y)) byYear.set(y, Array(12).fill(null));
    byYear.get(y)![m - 1] = row[field];
  }
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, months]) => ({ year, months }));
}

function ArchivTabelle({ field }: { field: "u10" | "u40" }) {
  const rows = archivMatrix(field);
  return (
    <div style={{ overflowX: "auto", marginBottom: 10 }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
        <thead>
          <tr>
            <th style={S.thLeft}>Jahr</th>
            {MONAT_KURZ.map((m) => (
              <th key={m} style={S.th}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <td style={{ ...S.td, fontWeight: 700, color: v("--color-text-primary") }}>{r.year}</td>
              {r.months.map((val, i) => (
                <td key={i} style={{ ...S.tdNum, color: val == null ? v("--color-text-muted") : v("--color-text-primary") }}>
                  {val == null ? "—" : ct(val)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function EinspeiseverguetungTabellePage() {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const year = now.getFullYear();
  const rates = feedInRatesFor(now);
  const prices = await fetchMarketPrices();
  const strompreisCt = (prices.electricityPrice * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const priceRatio = Math.round((prices.electricityPrice * 100) / rates.teilUnder10);
  const naechsteAbsenkung = eegDatum(naechsteAbsenkungIso(todayIso));
  const REFORM_STAND = eegReformStandLabel();

  // Halbjahres-Perioden seit dem 30.07.2022 — Grenzen und Sätze aus der
  // geprüften Kette (feedInPeriodsSince2022, Anker-Test in feedin-config.test).
  const perioden = feedInPeriodsSince2022(now);

  // Jahreswerte vor 2012 (SFV-Reihe) + Spitzenwert für den Einstieg.
  const vor2012 = FEEDIN_HISTORY_YEARS
    .map((y, i) => ({ year: y, value: FEEDIN_HISTORY_VALUES[i] }))
    .filter((r) => r.year <= 2011);
  const maxWert = Math.max(...FEEDIN_HISTORY_VALUES);
  const maxJahr = FEEDIN_HISTORY_YEARS[FEEDIN_HISTORY_VALUES.indexOf(maxWert)];
  const wert2012 = FEEDIN_HISTORY_VALUES[FEEDIN_HISTORY_YEARS.indexOf(2012)];

  // Jüngster amtlicher Jahresmarktwert Solar (ÜNB) aus der geteilten Quelle.
  const marktwert = MARKTWERT_SOLAR_HISTORIE[MARKTWERT_SOLAR_HISTORIE.length - 1];

  // Chart-Sektionen (2000–heute) für den Verlaufs-Chart.
  const chartJahre = verlaufJahre(now);

  // § 25 EEG live gerechnet: welcher Jahrgang läuft gerade aus?
  const jahrgangEnde = year - 20; // Vergütung endet am 31.12. dieses Jahres
  const endeDatum = dd(feedInEndIso(`${jahrgangEnde}-01-01`));

  const faqItems = einspeiseverguetungTabelleFaq();

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Ratgeber", href: "/ratgeber" },
            { label: "Einspeisevergütung: Tabelle" },
          ]}
          jsonLd
        />

        <h1 style={S.h1}>Einspeisevergütung {year}: aktuelle Sätze und die komplette Tabelle</h1>
        <p style={S.subtitle}>
          Alle Vergütungssätze für Photovoltaik zum Nachschlagen: die aktuellen Werte, die
          Halbjahres-Sätze seit 2022, die amtliche Monatstabelle 2012–2022 für
          Bestandsanlagen und die Jahreswerte zurück bis 2000.
        </p>
        <ArticleMeta
          headline={`Einspeisevergütung ${year}: aktuelle Sätze & Tabelle seit 2000`}
          description="Aktuelle EEG-Vergütungssätze plus die komplette historische Tabelle — Monatswerte 2012–2022, Halbjahres-Sätze seit 2022, Jahreswerte seit 2000."
          path="/einspeiseverguetung-tabelle"
          published="2026-08-04"
          modified="2026-08-04"
        />

        {/* ── Kurzantwort ── */}
        <div style={S.hero}>
          <span style={S.label}>Die Kurzantwort</span>
          Für neue Anlagen bis {rates.thresholdKwp} kWp gibt es aktuell{" "}
          <strong style={S.strong}>{ct(rates.teilUnder10)} ct/kWh</strong> bei{" "}
          Teileinspeisung (Überschusseinspeisung) und{" "}
          <strong style={S.strong}>{ct(rates.vollUnder10)} ct/kWh</strong> bei
          Volleinspeisung. Der Satz, mit dem eine Anlage in Betrieb geht, bleibt{" "}
          {FEED_IN_YEARS} Jahre fest — deshalb steht in den Tabellen unten für jeden
          Inbetriebnahme-Zeitraum ein eigener Wert, in der Spitze über{" "}
          {Math.round(maxWert)} ct/kWh ({maxJahr}). Selbst verbrauchter Strom spart mit
          rund {strompreisCt} ct/kWh heute etwa das {priceRatio}-Fache der Vergütung.
        </div>
        <p style={{ ...S.p, fontSize: v("--font-size-small"), marginBottom: 0 }}>
          Alle Werte auf dieser Seite werden live aus den gesetzlichen Sätzen und den
          amtlichen Archivtabellen gerendert — ohne Gewähr; verbindlich ist die
          offizielle Quelle.
        </p>

        {/* ── EEG-Reform: Sachstand (geteilte Quelle, kein eigener Rechtssatz) ── */}
        <div style={S.card}>
          <span style={S.label}>Geplante EEG-Reform 2027</span>
          Vorgesehen ist, die feste Einspeisevergütung für Neuanlagen ab 2027 zu beenden.{" "}
          {eegVerfahrenSatz()} Für Anlagen, die bis Ende 2026 in Betrieb gehen, bleibt die
          Vergütung {FEED_IN_YEARS} Jahre garantiert (Bestandsschutz) — an den Tabellen
          auf dieser Seite ändert der Entwurf nichts. Was die Reform für neue Anlagen
          bedeutet, steht im Ratgeber{" "}
          <Link href="/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung" style={S.link}>
            „Lohnt sich PV ohne Einspeisevergütung?"
          </Link>{" "}
          <span style={S.muted}>(Stand: {REFORM_STAND})</span>
        </div>

        {/* ── Verlaufs-Chart 2000–heute (Balken je Monat, Jahres-Sektionen) ──
             Der Chart beantwortet „wie ist der Verlauf?", die Tabellen darunter
             „was gilt für mich?" — bewusst beides sichtbar, nichts versteckt.
             Exakte Werte je Balken per Hover (<title>); mobil über die
             Aufklapp-Zeilen bzw. Tabellen mit denselben Daten. ── */}
        <h2 style={S.h2}>Der Verlauf seit 2000 auf einen Blick</h2>
        <p style={S.p}>
          Von {ct(maxWert)} ct/kWh in der Spitze ({maxJahr}) auf {ct(rates.teilUnder10)} ct
          heute — jeder Balken ist ein Inbetriebnahme-Monat (bis 2011: ein Jahr), die
          Höhe der Satz, der dann {FEED_IN_YEARS} Jahre fest gilt. Mit der Maus über
          einem Balken erscheint der exakte Wert; zum Nachschlagen dienen die Tabellen
          darunter.
        </p>
        <VerlaufsChart jahre={chartJahre} />
        <p style={{ ...S.small, marginBottom: 16 }}>
          Kleinste Dachanlagen-Klasse (bis 2008: bis 30 kW, ab 2009: bis 10 kWp), ab dem
          30.07.2022 Teileinspeisung; 2000–2011 Jahresanfangswerte. Der sichtbare Sprung
          Ende Juli 2022 ist die EEG-2023-Anhebung — real, kein Datenfehler.
        </p>

        {/* ── Halbjahres-Tabelle seit 30.07.2022 (neueste zuerst — die erste
             Zeile SIND die aktuellen Sätze; die eigene Aktuell-Tabelle entfiel
             bewusst, weil /einspeiseverguetung-rechner diesen Block trägt) ── */}
        <h2 style={S.h2}>Tabelle: Sätze nach Inbetriebnahme seit dem 30.07.2022</h2>
        <p style={S.p}>
          Mit dem EEG 2023 (Sätze ab 30. Juli 2022) wurde die Vergütung erstmals seit
          Langem wieder angehoben und in{" "}
          <GlossaryTerm id="teileinspeisung">Teileinspeisung</GlossaryTerm> (der Normalfall:{" "}
          <GlossaryTerm id="eigenverbrauch">Eigenverbrauch</GlossaryTerm> plus Überschuss
          ins Netz) und <GlossaryTerm id="volleinspeisung">Volleinspeisung</GlossaryTerm>{" "}
          geteilt. Maßgeblich ist das Inbetriebnahme-Halbjahr, der Satz bleibt dann{" "}
          {FEED_IN_YEARS} Jahre fest — die erste Zeile ist also der aktuelle Stand. Die
          Werte folgen der gesetzlichen Kette aus §§ 48, 49 und 53 EEG:
        </p>
        <div style={{ overflowX: "auto", marginBottom: 10 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
            <thead>
              <tr>
                <th style={S.thLeft}>Inbetriebnahme</th>
                <th style={S.th}>Teil ≤{rates.thresholdKwp} kWp</th>
                <th style={S.th}>Teil &gt;{rates.thresholdKwp} kWp*</th>
                <th style={S.th}>Voll ≤{rates.thresholdKwp} kWp</th>
                <th style={S.th}>Voll &gt;{rates.thresholdKwp} kWp*</th>
              </tr>
            </thead>
            <tbody>
              {[...perioden].reverse().map((p) => {
                const aktuell = p.toIso === null;
                return (
                  <tr key={p.fromIso}>
                    <td style={{ ...S.td, color: aktuell ? v("--color-text-primary") : S.td.color, fontWeight: aktuell ? 700 : 400 }}>
                      {aktuell ? `seit ${dd(p.fromIso)} (aktuell)` : `${dd(p.fromIso)} – ${dd(p.toIso as string)}`}
                    </td>
                    <td style={{ ...S.tdNum, fontWeight: aktuell ? 700 : 400 }}>{ct(p.rates.teilUnder10)}</td>
                    <td style={{ ...S.tdNum, fontWeight: aktuell ? 700 : 400 }}>{ct(p.rates.teilOver10)}</td>
                    <td style={{ ...S.tdNum, fontWeight: aktuell ? 700 : 400 }}>{ct(p.rates.vollUnder10)}</td>
                    <td style={{ ...S.tdNum, fontWeight: aktuell ? 700 : 400 }}>{ct(p.rates.vollOver10)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ ...S.small, marginBottom: 16 }}>
          Alle Werte in ct/kWh, feste Einspeisevergütung für Gebäudeanlagen. *Satz für den
          Anlagenteil über {rates.thresholdKwp} kWp (Klasse bis 40 kWp); bei größeren
          Anlagen ergibt sich daraus ein gewichteter Mischsatz, den der{" "}
          <Link href="/einspeiseverguetung-rechner" style={S.link}>Einspeisevergütungs-Rechner</Link>{" "}
          für deine Anlagengröße ausweist. Das EEG senkt die Sätze für neu in Betrieb
          genommene Anlagen <GlossaryTerm id="degression">planmäßig</GlossaryTerm> um 1 %
          je Halbjahr, jeweils zum 1. Februar und zum 1. August (§ 49 EEG) — nach
          geltendem Recht folgt die nächste Absenkung zum {naechsteAbsenkung}. Vom
          30.07.2022 bis zum 31.01.2024 setzte die Absenkung gesetzlich aus, deshalb gilt
          für diesen Zeitraum eine gemeinsame Zeile. Alle aktuellen Werte mit Stand-Datum
          stehen auf der <Link href="/datenstand" style={S.link}>Datenstand-Seite</Link>.
        </p>

        {/* ── Monatstabelle 04/2012–07/2022 (BNetzA-Archiv) ── */}
        <h2 style={S.h2}>Tabelle für Bestandsanlagen: Monatswerte April 2012 bis Juli 2022</h2>
        <p style={S.p}>
          Zwischen April 2012 und Juli 2022 sank die Vergütung für neue Anlagen meist von
          Monat zu Monat — zeitweise stand sie auch still. Für Bestandsanlagen aus dieser
          Zeit zählt deshalb der <strong style={S.strong}>Inbetriebnahme-Monat</strong>.
          Die Tabelle zeigt die feste Einspeisevergütung für Dachanlagen auf Wohngebäuden
          aus den Archivtabellen der Bundesnetzagentur; eine getrennte (höhere)
          Volleinspeisungs-Vergütung gab es in dieser Ära noch nicht — es galt ein Satz
          je Größenklasse.
        </p>
        <h3 style={S.h3}>Anlagen bis 10 kWp</h3>
        <ArchivTabelle field="u10" />
        <h3 style={S.h3}>Anlagenteil über 10 bis 40 kWp</h3>
        <ArchivTabelle field="u40" />
        <p style={{ ...S.small, marginBottom: 16 }}>
          Alle Werte in ct/kWh. Januar bis März 2012 gehören noch zur älteren
          Vergütungslogik (Jahresbeginn 2012: {ct(wert2012)} ct/kWh, siehe Jahrestabelle
          unten); ab dem 30.07.2022 gilt die Halbjahres-Tabelle oben. Wie viel eine
          Bestandsanlage mit ihrem Satz übers Jahr und über die Laufzeit einnimmt, rechnet
          der <Link href="/einspeiseverguetung-rechner" style={S.link}>Einspeisevergütungs-Rechner</Link> aus.
        </p>

        {/* ── Jahreswerte 2000–2011 ── */}
        <h2 style={S.h2}>Die Anfangsjahre: 2000 bis 2011</h2>
        <p style={S.p}>
          In den Anfangsjahren des EEG lag die Vergütung um ein Vielfaches höher — in der
          Spitze bei {ct(maxWert)} ct/kWh ({maxJahr}). Die Werte sind Jahresanfangs-Stände
          für die kleinste Dachanlagen-Klasse; für die exakte Vergütung einer konkreten
          Altanlage ist der Bescheid bzw. die Abrechnung des Netzbetreibers maßgeblich —
          aus dieser Zeit gibt es hier bewusst keine Monatswerte.
        </p>
        <div style={{ overflowX: "auto", marginBottom: 10 }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={S.thLeft}>Inbetriebnahme (Jahresbeginn)</th>
                <th style={S.th}>Vergütung</th>
              </tr>
            </thead>
            <tbody>
              {vor2012.map((r) => (
                <tr key={r.year}>
                  <td style={S.td}>{r.year}</td>
                  <td style={S.tdNum}>{ct(r.value)} ct/kWh</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...S.small, marginBottom: 16 }}>
          Klasse: bis 2008 Dachanlagen bis 30 kW (die 10-kWp-Klasse existierte noch
          nicht), ab 2009 bis 10 kWp.{" "}
          <DataSourceNote source={DATA_SOURCES.eegVerguetung} /> Wie der fallende Satz und
          der Zubau zusammenhängen, zeigt die{" "}
          <Link href="/photovoltaik-zubau-deutschland" style={S.link}>PV-Zubau-Datenstory</Link>{" "}
          mit dem interaktiven Chart seit 2000.
        </p>

        {/* ── Wie lange wird gezahlt ── */}
        <h2 style={S.h2}>Wie lange wird die Einspeisevergütung gezahlt?</h2>
        <p style={S.p}>
          {FEED_IN_YEARS} Jahre ab Inbetriebnahme — bei der festen Einspeisevergütung
          verlängert sich die Zahlung sogar bis zum 31. Dezember des zwanzigsten Jahres
          (§ 25 EEG). Konkret heißt das gerade: Eine Anlage, die {jahrgangEnde} in Betrieb
          ging, wird noch bis zum {endeDatum} vergütet; Anlagen mit Inbetriebnahme bis
          Ende {jahrgangEnde - 1} sind bereits aus der Vergütung gelaufen.
        </p>
        <p style={S.p}>
          Nach dem Ende der Vergütung läuft die Ersparnis durch{" "}
          <GlossaryTerm id="eigenverbrauch">Eigenverbrauch</GlossaryTerm> unverändert
          weiter — unser <Link href="/photovoltaik-rechner" style={S.link}>PV-Rechner</Link>{" "}
          kalkuliert genau so: Vergütung nur {FEED_IN_YEARS} Jahre, danach null, die
          Eigenverbrauchs-Ersparnis über die gesamte Laufzeit.
        </p>

        {/* ── Nach der festen Vergütung: Marktwert Solar ──────────────────────
             Bewusst kurz (3–4 Sätze): die Rechnung dazu lebt im interaktiven
             Block des Reform-Ratgebers — dieselbe Frage zweimal zu beantworten
             wäre Thin Content gegen uns selbst. Zahl + Quelle kommen aus
             lib/marktwert-config.ts (eine Quelle, Realitäts-Anker im Repo);
             Entwurfs-Geldwerte stehen hier KEINE (Council-Vorbehalt). ── */}
        <h2 style={S.h2}>Was kommt nach der festen Vergütung: der Marktwert Solar</h2>
        <p style={S.p}>
          Wo keine feste Einspeisevergütung fließt — nach den {FEED_IN_YEARS} Jahren, oder
          falls die geplante Reform die feste Vergütung für Neuanlagen beendet —, bleibt
          für den Überschuss die Direktvermarktung: Ein Dienstleister verkauft den Strom
          an der Börse, du erhältst den Marktpreis abzüglich einer Gebühr. Maßstab dafür
          ist der <GlossaryTerm id="marktwert-solar">Marktwert Solar</GlossaryTerm>, den
          die Übertragungsnetzbetreiber veröffentlichen: {marktwert.jahr} lag er bei{" "}
          <strong style={S.strong}>{ct(marktwert.ctKwh)} ct/kWh</strong> — gegenüber{" "}
          {ct(rates.teilUnder10)} ct fester Vergütung und rund {strompreisCt} ct
          Haushaltsstrompreis. Er liegt strukturell unter dem mittleren Börsenpreis, weil
          Solarstrom überall zur selben Zeit anfällt und das große Mittagsangebot den
          Preis genau dann drückt. Wie sich das auf Amortisation und Rendite auswirkt,
          zeigt der interaktive Renditevergleich im Ratgeber{" "}
          <Link href="/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung" style={S.link}>
            „Lohnt sich PV ohne Einspeisevergütung?"
          </Link>
          .
        </p>
        <p style={{ ...S.small, marginBottom: 16 }}>
          <DataSourceNote source={DATA_SOURCES.marktwertSolar} /> Jahresmarktwert{" "}
          {marktwert.jahr}, Stand siehe <Link href="/datenstand" style={S.link}>Datenstand-Seite</Link>.
        </p>

        {/* ── CTA ── */}
        <div style={{ ...S.hero, marginTop: 28 }}>
          <span style={S.label}>Was bringt dir dein Satz?</span>
          <p style={{ ...S.p, color: v("--color-text-primary"), marginBottom: 14 }}>
            Der Einspeisevergütungs-Rechner nennt den Satz für dein Inbetriebnahme-Datum
            und rechnet aus, wie viel deine Anlage damit schon eingenommen hat und was
            noch aussteht — ohne Anmeldung, ohne Verkaufsanrufe.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/einspeiseverguetung-rechner" style={S.ctaButton}>
              Vergütung berechnen →
            </Link>
            <Link href="/photovoltaik-rechner" style={S.ctaSecondary}>
              Komplette Rentabilität rechnen
            </Link>
          </div>
        </div>

        {/* ── FAQ (visible accordion + FAQPage JSON-LD from the same data) ── */}
        <Faq items={faqItems} title="Häufige Fragen zur Einspeisevergütung" currentPath="/einspeiseverguetung-tabelle" />

        <RelatedLinks
          currentPath="/einspeiseverguetung-tabelle"
          links={[
            { href: "/einspeiseverguetung-rechner", label: "Einspeisevergütung-Rechner", desc: "Satz für dein Inbetriebnahme-Datum plus Lebenslauf-Rechnung: schon erhalten und noch ausstehend." },
            { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Amortisation, Rendite und Eigenverbrauch für deine Anlage — alle Annahmen transparent und anpassbar." },
            { href: "/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung", label: "Lohnt sich PV ohne Einspeisevergütung?", desc: "Was die geplante EEG-Reform für neue Anlagen bedeutet — und warum Eigenverbrauch die Rechnung trägt." },
            { href: "/photovoltaik-zubau-deutschland", label: "PV-Zubau in Deutschland seit 2000", desc: "Die Datenstory: Wie Einspeisevergütung, Strompreis und Zubau zusammenhängen — mit interaktivem Chart." },
            { href: "/datenstand", label: "Aktuelle Werte & Annahmen" },
            { href: "/glossar", label: "Glossar" },
          ]}
        />
        <p style={{ ...S.p, fontSize: v("--font-size-small"), marginTop: 16 }}>
          Zuletzt aktualisiert: {now.toLocaleDateString("de-DE", { month: "long", year: "numeric" })} —
          die aktuellen Sätze folgen automatisch den gesetzlichen Stichtagen, die
          historischen Tabellen sind amtliche Archivstände. Ohne Gewähr; verbindlich sind
          Gesetz und Bescheid.
        </p>
      </div>
    </div>
  );
}
