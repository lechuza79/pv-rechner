import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../../components/Breadcrumb";
import ProConLists from "../../../../components/ProConLists";
import Faq from "../../../../components/Faq";
import RelatedLinks from "../../../../components/RelatedLinks";
import ArticleMeta from "../../../../components/ArticleMeta";
import AutoHeightIframe from "../../../../components/AutoHeightIframe";
import { DataSourceNote } from "../../../../components/PoweredBy";
import GlossaryTerm from "../../../../components/GlossaryTerm";
import StickyCta from "./StickyCta";
import WpRechnerModal from "./WpRechnerModal";
import KfwFoerderpraxis from "../../../../components/KfwFoerderpraxis";
import { heizungsfoerderungBund } from "../../../../lib/kfw-foerderdaten";
import { DATA_SOURCES } from "../../../../lib/data-sources";
import { waermepumpeFoerderungFaq } from "../../../../lib/faq";
import { v } from "../../../../lib/theme";
import { calcBegSubsidy, calcInvestBrutto, calcHeatLoad } from "../../../../lib/heatpump";
import {
  DEFAULT_HEATPUMP_CONFIG as HP,
  begStufeAm,
  begNaechsteStufe,
  BEG_WERTSCHOEPFUNGS_BONUS,
} from "../../../../lib/heatpump-config";
import {
  BEG_ANTRAG_ANKER,
  BEG_ANTRAG_GELTUNGSBEREICH,
  BEG_ANTRAG_STAND,
  BEG_ANTRAG_SCHRITTE,
  BEG_ANTRAG_FRISTEN,
  BEG_EIGENLEISTUNG,
  BEG_KEINE_AUFSTOCKUNG,
  BEG_VORHABENBEGINN,
} from "../../../../lib/beg-antrag";
import { pageMetadata } from "../../../../lib/seo";

// Figures on this page come live from the same BEG engine the calculator and
// the Förder-Check widget use (calcBegSubsidy + the geprüfte config, KfW
// Merkblatt 458). If a number here ever differs from the tool, that's a bug,
// not a rounding choice. ISR keeps the render-time date fresh without a rebuild.
export const revalidate = 3600;

// ─── Die Jahreszahl steht im TITEL, nicht in der Adresse ────────────────────
//
// Am 26.08.2026 ist die Seite von `/ratgeber/waermepumpe-foerderung-2026` auf
// den zeitlosen Pfad umgezogen. Gemessen (DataForSEO, Deutschland, drei
// unabhängige Prüfer): Die jahreslose Anfrage bringt 33.100 Aufrufe im Monat
// und läuft ganzjährig; die Jahresvariante bricht zum Jahreswechsel um 93 %
// ein („wärmepumpe förderung 2025": 6.600 → 40). Auf der Anfrage MIT Jahr
// stehen die Plätze 1–3 trotzdem auf jahreslosen Adressen (KfW, ADAC, Bosch) —
// Google zieht das Jahr aus dem Titel, nicht aus dem Pfad.
//
// **Was Google dazu NICHT sagt:** Die URL-Empfehlung von Search Central äußert
// sich zu Datumsangaben in Adressen überhaupt nicht. Wer den Umzug mit einer
// Google-Aussage begründet, hat keine — dieselbe Falle wie die kursierende
// Behauptung über Verzeichnistiefe, die hier schon einmal zweieinhalb Wochen
// als Google-Aussage im Regelwerk stand.
//
// Die Jahreszahl kommt aus dem KALENDER, nicht aus der Förderstufe. Naheliegend
// wäre `begStufeAm(...)`, und es wäre falsch: Wer im Januar 2028 liest, steht
// auf der Stufe „August 2027" — der Titel sagte dann 2027, während der Leser
// 2028 schreibt. Die Zahlen im Text ziehen sich ihre Stufe ohnehin selbst; das
// Jahr im Titel beantwortet die andere Frage, nämlich „gilt das noch für mich".
// Mit ISR (siehe `revalidate`) wandert es ohne Deploy mit.
const JAHR = new Date().getFullYear();

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    path: "/ratgeber/waermepumpe-foerderung",
    title: `Wärmepumpen-Förderung ${JAHR}: Wie viel Zuschuss gibt es wirklich?`,
    description:
      "Grundförderung, Klima-Bonus, Einkommens-Bonus: Wie sich der BEG-Zuschuss für den Heizungstausch zusammensetzt — mit live gerechneten Beispielfällen nach KfW Merkblatt 458 und dem Förder-Check zum selbst Durchrechnen. Ohne Anmeldung.",
    ogImageTitle: `Wärmepumpen-Förderung ${JAHR}`,
    ogImageSubtitle: "Wie viel Zuschuss wirklich drin ist.",
  });
}

// ─── Styles (same content-page conventions as the other Ratgeber) ───────────
const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: 60, paddingBottom: 88 },
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
  p: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    lineHeight: 1.7,
    marginBottom: 12,
  },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
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
  hero: {
    background: v("--color-bg-accent"),
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    marginBottom: 8,
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    lineHeight: 1.7,
  },
  // Der einzige rot gerahmte Kasten der Seite. Er gehört der Reihenfolge-Regel,
  // weil sie die einzige Aussage hier ist, bei der ein Fehler den ganzen
  // Zuschuss kostet — ein zweiter roter Kasten würde ihn entwerten.
  warn: {
    background: v("--color-negative-dim"),
    border: `1px solid ${v("--color-negative-border")}`,
    borderRadius: v("--radius-md"),
    padding: "14px 16px",
    marginBottom: 14,
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    lineHeight: 1.7,
  },
  stepRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: "12px 0",
    borderTop: `1px solid ${v("--color-border")}`,
  },
  stepNum: {
    flex: "0 0 auto",
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: v("--color-bg-accent"),
    color: v("--color-accent"),
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
  accent: { color: v("--color-accent"), fontWeight: 600 },
  positive: { color: v("--color-positive"), fontWeight: 600 },
  muted: { color: v("--color-text-muted") },
  link: { color: v("--color-accent"), textDecoration: "none", fontWeight: 600 },
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
    textAlign: "left" as const,
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  thNum: {
    textAlign: "right" as const,
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
  },
  td: {
    fontSize: v("--font-size-body"),
    color: v("--color-text-muted"),
    padding: "10px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    lineHeight: 1.4,
  },
  tdNum: {
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
    textAlign: "right" as const,
    padding: "10px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap" as const,
  },
};

const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;
const pct = (r: number) => `${Math.round(r * 100)} %`;

// Full "gültig ab" date with day, from the config (single source of truth).
function formatFullDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Example subsidy cases ──────────────────────────────────────────────────
// One representative single-family house, computed with the SAME functions the
// calculator and Förder-Check use. The gross investment comes from the heat
// load of a typical detached, partly-renovated 130 m² house; each row runs a
// different owner profile through calcBegSubsidy so the reader sees how the
// three bausteine stack. Never hardcode a subsidy amount here.
const EX_WOHNFLAECHE = 130; // m²
const EX_INSULATION = 1; // teilsaniert (specHeatLoadBestand[1])

interface CaseRow {
  label: string;
  desc: string;
  opts: Parameters<typeof calcBegSubsidy>[3];
  highlight?: boolean;
}

const CASES: CaseRow[] = [
  {
    label: "Vermieter",
    desc: "vermietetes Haus — nur Grundförderung",
    opts: { klimaBonus: false },
  },
  {
    label: "Selbstnutzer, alte Ölheizung",
    desc: "Eigennutzung, Einkommen über der Bonusgrenze",
    opts: { klimaBonus: true },
  },
  {
    label: "Selbstnutzer, mittleres Einkommen",
    desc: `Eigennutzung, zu versteuerndes Einkommen bis ${HP.begEinkommensStaffel[1].maxIncome.toLocaleString("de-DE")} €`,
    opts: { klimaBonus: true, haushaltseinkommen: HP.begEinkommensStaffel[1].maxIncome },
  },
  {
    label: "Familie mit Kind",
    desc: `Eigennutzung, Einkommen 48.000 €, ein Kind — Familienzuschlag zieht in die nächste Stufe`,
    opts: { klimaBonus: true, haushaltseinkommen: 48000, kindImHaushalt: true },
  },
  {
    label: "Selbstnutzer, niedriges Einkommen",
    desc: `Eigennutzung, Einkommen bis ${HP.begEinkommensStaffel[0].maxIncome.toLocaleString("de-DE")} € — höchster Satz`,
    opts: { klimaBonus: true, haushaltseinkommen: HP.begEinkommensStaffel[0].maxIncome },
    highlight: true,
  },
];

export default async function WaermepumpeFoerderungPage() {
  // Was aus der Bundesförderung wirklich geworden ist. Auf dem Server geholt:
  // Die Tabellen liegen hinter dem Dienstschlüssel, und die Seite soll
  // vorgerendert bleiben.
  const kfw = await heizungsfoerderungBund();
  const faqItems = waermepumpeFoerderungFaq();
  // ZWEI Daten, die bis 25.08.2026 verwechselt waren: `HP.validFrom` ist der
  // Stand UNSERER Werte, nicht der Tag, ab dem das KfW-Merkblatt gilt. Die Seite
  // schrieb damit „KfW-Zuschuss 458, gültig ab 27. Juli 2026" — ein
  // Gültigkeitsdatum, das es nicht gibt (das Merkblatt gilt ab dem 21.07.2026).
  // Gefunden vom zweiten Legal-Judge; die Fehlerklasse ist die teuerste des
  // Projekts, eine falsche Zahl, die niemandem auffällt.
  const standDatum = formatFullDate(HP.validFrom);
  // Grundsatz, Klimabonus und Höchstbetrag aus dem Fahrplan der Richtlinie
  // (BEG_FAHRPLAN), nicht aus der Config-Konstante: Alle drei ändern sich zu
  // festen Stichtagen, der Fördersatz für Wärmepumpen halbiert sich Anfang
  // 2027. Die Beispielrechnungen darunter ziehen sich den Stand ohnehin selbst
  // (calcBegSubsidy löst ohne Angabe den heutigen auf) — stünden die Zahlen im
  // Fließtext daneben fest, erklärte der Text ab dem Stichtag eine andere
  // Förderung, als die Tabelle darunter ausrechnet.
  const STUFE = begStufeAm(new Date());
  // Der nächste Stichtag und der übernächste — beide aus dem Fahrplan, damit der
  // Ausblick unten mitwandert, statt beim ersten Wechsel von einer künftigen
  // Änderung im Präsens zu erzählen, die längst eingetreten ist.
  const NAECHSTE = begNaechsteStufe(new Date());
  const NACH_NAECHSTE = NAECHSTE ? begNaechsteStufe(new Date(NAECHSTE.abIso)) : undefined;
  const gueltigAb = formatFullDate(BEG_ANTRAG_STAND.validFrom);
  const verfahrenGeprueft = formatFullDate(BEG_ANTRAG_STAND.geprueftIso);

  // Representative gross investment for a typical detached EFH (shared engine).
  const heizlast = calcHeatLoad("bestand", EX_WOHNFLAECHE, EX_INSULATION, 1);
  const investBrutto = calcInvestBrutto("lwwp", heizlast, false);

  const rows = CASES.map((c) => {
    const beg = calcBegSubsidy("bestand", "lwwp", investBrutto, c.opts);
    return { ...c, rate: beg.rate, amount: beg.amount, rest: investBrutto - beg.amount };
  });

  // Der größte Betrag, den ein Leser auf dieser Seite gesehen hat — also genau
  // das, was er bei falscher Reihenfolge verliert. Aus den gerechneten Zeilen,
  // nicht aus dem Deckel: Der Deckel gilt der Kostenobergrenze, hier steht der
  // Zuschuss zum Beispielfall.
  const maxAmount = Math.max(...rows.map((r) => r.amount));

  const maxZuschuss = Math.round(STUFE.maxCap * HP.begMaxRateLowIncome);
  const staffel = HP.begEinkommensStaffel;

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Ratgeber", href: "/ratgeber" },
            { label: `Wärmepumpen-Förderung ${JAHR}` },
          ]}
          jsonLd
        />

        <h1 style={S.h1}>Wärmepumpen-Förderung {JAHR}: Wie viel Zuschuss gibt es wirklich?</h1>
        <p style={S.subtitle}>
          Der Staat übernimmt beim Heizungstausch einen erheblichen Teil der Kosten — aber
          wie viel genau, hängt davon ab, wer du bist und was du bisher heizt. Hier steht,
          wie sich der Zuschuss zusammensetzt.
        </p>
        <ArticleMeta
          headline={`Wärmepumpen-Förderung ${JAHR}: Wie viel Zuschuss gibt es wirklich?`}
          description="Grundförderung, Klima-Bonus, Einkommens-Bonus: wie sich der BEG-Zuschuss zusammensetzt."
          path="/ratgeber/waermepumpe-foerderung"
          published="2026-07-20"
          modified="2026-08-25"
        />

        {/* ── Kurzantwort ── */}
        <div style={S.hero}>
          <span style={S.label}>Die Kurzantwort</span>
          <strong style={S.strong}>Zwischen {pct(STUFE.grundfoerderung)} und {pct(HP.begMaxRateLowIncome)} der Kosten.</strong>{" "}
          Jeder Heizungstausch im Bestand bekommt die Grundförderung von {pct(STUFE.grundfoerderung)} —
          auch Vermieter. Selbstnutzende Eigentümer können über den Klima-Bonus und einen
          einkommensabhängigen Bonus auf bis zu {pct(HP.begMaxRateLowIncome)} kommen. Gefördert
          werden Kosten bis {eur(STUFE.maxCap)} für die erste Wohnung, der maximale Zuschuss
          liegt damit bei {eur(maxZuschuss)}. Im Neubau gibt es diesen Zuschuss dagegen nicht.
        </div>
        <p style={{ ...S.p, fontSize: v("--font-size-small"), marginBottom: 0 }}>
          Grundlage: KfW-Zuschuss 458 (BEG Einzelmaßnahme), gültig ab {gueltigAb} · unverbindliche
          Näherungswerte, ohne Gewähr — verbindlich ist die Zusage der KfW.
        </p>
        <p style={{ ...S.p, marginTop: 12 }}>
          Bevor du weiterliest, die eine Sache, die den ganzen Zuschuss kosten kann:{" "}
          <a href={`#${BEG_ANTRAG_ANKER}`} style={S.link}>
            Der Antrag muss vor dem ersten verbindlichen Auftrag gestellt sein
          </a>{" "}
          — sonst gibt es nichts, egal wie hoch der Satz wäre.
        </p>

        {/* ── Bestand vs. Neubau ── */}
        <h2 style={S.h2}>Zuerst die wichtigste Weiche: Bestand oder Neubau?</h2>
        <p style={S.p}>
          Der bezuschusste Fall ist der <strong style={S.strong}>Heizungstausch im bestehenden
          Gebäude</strong>. Nur dafür gibt es den prozentualen Zuschuss, um den es auf dieser
          Seite geht. Baust du <strong style={S.strong}>neu</strong>, wird die Wärmepumpe nicht
          direkt bezuschusst — dort läuft die Förderung über zinsgünstige Kredite der KfW im
          Programm „Klimafreundlicher Neubau“, die das ganze Gebäude betreffen, nicht die
          einzelne Heizung. Für den Rest dieser Seite gilt also: bestehendes Haus, alte
          Heizung raus, Wärmepumpe rein.
        </p>

        {/* ── Die drei Bausteine ── */}
        <h2 style={S.h2}>Wie sich der Zuschuss zusammensetzt</h2>
        <p style={S.p}>
          Der Fördersatz der{" "}
          <GlossaryTerm id="beg">BEG</GlossaryTerm>-Heizungsförderung ist kein fester Wert,
          sondern wird aus bis zu drei Bausteinen zusammengesetzt. Alle beziehen sich auf die
          förderfähigen Kosten (gedeckelt bei {eur(STUFE.maxCap)} für die erste Wohnung):
        </p>

        <div style={S.card}>
          <span style={S.accent}>1. Grundförderung — {pct(STUFE.grundfoerderung)}</span>
          <br />
          Bekommt jeder Heizungstausch im Bestand, ohne Bedingungen an Person oder alte
          Heizung. Auch Vermieter erhalten diesen Anteil.
          {/* Der Stichtag gehört AN den Baustein, nicht nur in den Ausblick am
              Seitenende: Wer hier den Satz abliest und danach wegklickt, hat sonst
              eine Zahl mitgenommen, die in wenigen Monaten die Hälfte wert ist.
              Steht ab dem Stichtag der halbierte Satz oben, wird dieser Absatz
              rückblickend zur Erklärung, warum. */}
          {NAECHSTE && NAECHSTE.grundfoerderung < STUFE.grundfoerderung && (
            <>
              {" "}
              <strong style={S.strong}>
                Für Anträge ab {NAECHSTE.bezeichnung} sinkt dieser Anteil auf{" "}
                {pct(NAECHSTE.grundfoerderung)}
              </strong>{" "}
              — allerdings nur für Wärmepumpen; Solarthermie und Holzheizungen behalten ihre{" "}
              {pct(STUFE.grundfoerderung)}. Zum selben Zeitpunkt kommt ein neuer Bonus in
              gleicher Höhe für Wärmepumpen mit Ursprung in der EU dazu, der die Kürzung
              ausgleicht (siehe unten).
            </>
          )}
        </div>
        <div style={S.card}>
          <span style={S.accent}>2. Klima-Geschwindigkeits-Bonus — +{pct(STUFE.klimaBonus)}</span>
          <br />
          Nur für <strong style={S.strong}>selbstnutzende Eigentümer</strong>, die eine noch
          funktionierende alte Heizung ersetzen. Öl-, Kohle-, Gas-Etagen- und
          Nachtspeicherheizungen zählen <strong style={S.strong}>unabhängig vom Alter</strong>.
          Zentrale Gasheizungen und Biomasseheizungen (Holz, Pellets) zählen erst{" "}
          <strong style={S.strong}>ab 20 Jahren</strong> — maßgeblich ist, dass die
          Inbetriebnahme am Tag der Antragstellung mindestens 20 Jahre zurückliegt; das
          Baujahr steht auf dem Typenschild am Kessel. Dieser Bonus sinkt ab dem
          1. Februar 2027 halbjährlich um 4 Prozentpunkte und entfällt bei Anträgen ab
          dem 1. August 2028 ganz.
        </div>
        <div style={S.card}>
          <span style={S.accent}>
            3. Einkommens-Bonus — +{pct(staffel[0].rate)} / +{pct(staffel[1].rate)} / +{pct(staffel[2].rate)}
          </span>
          <br />
          Ebenfalls nur für selbstnutzende Eigentümer, gestaffelt nach dem{" "}
          <strong style={S.strong}>zu versteuernden Haushaltsjahreseinkommen</strong>: bis{" "}
          {eur(staffel[0].maxIncome)} gibt es +{pct(staffel[0].rate)}, bis {eur(staffel[1].maxIncome)}{" "}
          +{pct(staffel[1].rate)}, bis {eur(staffel[2].maxIncome)} +{pct(staffel[2].rate)}. Maßgeblich
          ist das zu versteuernde Einkommen aus dem Steuerbescheid, nicht das Bruttogehalt — es
          liegt meist deutlich darunter.
        </div>
        <p style={S.p}>
          Dazu kommt ein <strong style={S.strong}>Familienzuschlag</strong>: Lebt mindestens
          ein minderjähriges Kind im Haushalt, wird das anzusetzende Einkommen einmalig um{" "}
          {eur(HP.begFamilienzuschlag)} gesenkt — das kann eine höhere Bonusstufe auslösen. Die
          Anzahl der Kinder spielt dabei keine Rolle, es zählt nur ja oder nein.
        </p>
        <p style={S.p}>
          Alle Bausteine zusammen sind <strong style={S.strong}>gedeckelt</strong>: höchstens{" "}
          {pct(HP.begMaxRate)} im Regelfall, {pct(HP.begMaxRateLowIncome)} nur in der untersten
          Einkommensstufe. Selbst wenn die Prozente rechnerisch höher lägen, ist bei diesen
          Werten Schluss.
        </p>

        {/* ── Beispielrechnung ── */}
        <h2 style={S.h2}>Beispiel: dieselbe Wärmepumpe, fünf Haushalte</h2>
        <p style={S.p}>
          Zur Veranschaulichung dieselbe Anlage für alle: ein freistehendes Einfamilienhaus,{" "}
          {EX_WOHNFLAECHE} m², teilsaniert, mit einer Luft-Wärmepumpe. Die Investition liegt
          bei rund {eur(investBrutto)} (aus der Heizlast gerechnet, wie im Rechner). Nur die
          Person und die alte Heizung ändern sich — und damit der Zuschuss:
        </p>
        <div style={{ ...S.card, padding: "6px 10px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Haushalt</th>
                <th style={S.thNum}>Satz</th>
                <th style={S.thNum}>Zuschuss</th>
                <th style={S.thNum}>Eigenanteil</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.label}>
                  <td style={{ ...S.td, borderBottom: i === rows.length - 1 ? "none" : undefined }}>
                    <span style={{ ...S.strong, display: "block" }}>{r.label}</span>
                    <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>{r.desc}</span>
                  </td>
                  <td style={{ ...S.tdNum, borderBottom: i === rows.length - 1 ? "none" : undefined, color: r.highlight ? v("--color-positive") : v("--color-text-primary") }}>
                    {pct(r.rate)}
                  </td>
                  <td style={{ ...S.tdNum, borderBottom: i === rows.length - 1 ? "none" : undefined, color: v("--color-positive"), fontWeight: 700 }}>
                    {eur(r.amount)}
                  </td>
                  <td style={{ ...S.tdNum, borderBottom: i === rows.length - 1 ? "none" : undefined }}>
                    {eur(r.rest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={S.p}>
          Zwei Dinge fallen auf: Der <strong style={S.strong}>Vermieter</strong> bekommt nur die
          Grundförderung — Klima- und Einkommens-Bonus sind an die Selbstnutzung gebunden. Und
          die <strong style={S.strong}>Familie mit Kind</strong> profitiert vom Familienzuschlag:
          Mit 48.000 € Einkommen läge sie eigentlich in der untersten Bonusstufe, durch den
          Abzug von {eur(HP.begFamilienzuschlag)} rutscht sie eine Stufe höher.
        </p>

        {/* ── Antragsreihenfolge ──────────────────────────────────────────────
            Steht bewusst hier: direkt hinter der Tabelle, in der der Leser
            gerade den größten Betrag der Seite gesehen hat, und im Fließtext
            statt im Kleingedruckten. Bis 08/2026 war davon nur ein Halbsatz
            unter dem Rechtshinweis übrig — die teuerste Auskunft der Seite an
            der Stelle, die niemand liest. Der Anker `antrag-reihenfolge` kommt
            aus lib/beg-antrag.ts, damit verweisende Seiten ihn importieren
            können, statt ihn abzutippen. */}
        <h2 id={BEG_ANTRAG_ANKER} style={{ ...S.h2, scrollMarginTop: 80 }}>
          Die Reihenfolge entscheidet — sonst ist der Zuschuss weg
        </h2>
        <div style={S.warn}>
          <strong style={S.strong}>
            Der Zuschuss ist verloren, wenn das Vorhaben vor dem Antrag beginnt.
          </strong>{" "}
          Nicht ein Teil davon — der ganze Betrag, im Beispiel oben bis zu{" "}
          {eur(maxAmount)}. So steht es wörtlich im Merkblatt der KfW:
          „{BEG_VORHABENBEGINN.regelZitat}“ {BEG_VORHABENBEGINN.stichtag} Für eine
          bereits begonnene Maßnahme ist ein nachträglicher Antrag im Verfahren nicht
          vorgesehen.
        </div>
        <p style={S.p}>
          Dann kommt es darauf an, was „beginnen“ heißt — und das ist enger gefasst,
          als die meisten befürchten. <strong style={S.strong}>Als Beginn zählt</strong>{" "}
          {BEG_VORHABENBEGINN.zaehltAlsBeginn.join(" oder ")}.{" "}
          {BEG_VORHABENBEGINN.keineNachtraeglicheBedingung}
        </p>
        <p style={S.p}>
          <strong style={S.strong}>Ausdrücklich nicht als Beginn zählen</strong>{" "}
          {BEG_VORHABENBEGINN.zaehltNicht.join(" sowie ")}. Reden kostet also nichts —
          und das ist die Entwarnung, die die meisten brauchen: Angebote einholen und
          sich beraten lassen ist nicht nur erlaubt, es ist der erste Schritt.
        </p>

        <div style={{ ...S.card, padding: "4px 16px 14px" }}>
          <span style={{ ...S.label, marginTop: 12 }}>So läuft es der Reihe nach</span>
          {BEG_ANTRAG_SCHRITTE.map((s, i) => (
            <div key={s.titel} style={{ ...S.stepRow, borderTop: i === 0 ? "none" : undefined }}>
              <span style={S.stepNum} aria-hidden>{i + 1}</span>
              <div>
                <strong style={{ ...S.strong, display: "block", marginBottom: 2 }}>
                  {s.titel}
                </strong>
                {s.text}
              </div>
            </div>
          ))}
        </div>

        <p style={S.p}>
          <strong style={S.strong}>Und zwischen Antrag und Zusage?</strong>{" "}
          {BEG_VORHABENBEGINN.nachAntragVorZusage} Die KfW selbst nennt in ihrem
          Merkblatt nur den Start nach der Zusage. In der Praxis heißt das: Der
          Vertrag unter Vorbehalt löst keinen Vorhabenbeginn aus und hält dir trotzdem
          den Preis — das Warten auf die Zusage ist der sichere Weg.
        </p>
        {/* Die Verfallsfolge hängt allein an der ÄUSSEREN Frist — Richtlinie
            Nr. 9.5.1 Satz 2 sanktioniert nur die Einreichung „später als sechs
            Monate nach Ablauf des Bewilligungszeitraums". Eine Fassung, die sie
            auf beide Fristen bezog, hätte einem Leser, der früh fertig wird, bis
            zu 30 Monate lang „Geld weg" gemeldet, obwohl sein Anspruch besteht —
            und in genau der Richtung, in der jemand aufgibt und den Zuschuss
            liegen lässt. Gefunden vom zweiten Legal-Judge am 25.08.2026. */}
        <p style={S.p}>
          Nach der Zusage laufen zwei Fristen weiter. Das Vorhaben muss innerhalb von{" "}
          <strong style={S.strong}>{BEG_ANTRAG_FRISTEN.bewilligungMonate} Monaten</strong>{" "}
          ab Zugang der Zusage abgeschlossen sein — als Abschluss gilt das Datum der
          letzten Rechnung. Die Nachweise gehören innerhalb von{" "}
          <strong style={S.strong}>{BEG_ANTRAG_FRISTEN.nachweisNachAbschlussMonate} Monaten</strong>{" "}
          nach diesem Abschluss ins Kundenportal. Die harte Grenze ist die zweite:{" "}
          <strong style={S.strong}>
            {BEG_ANTRAG_FRISTEN.nachweisSpaetestensNachBewilligungMonate} Monate nach
            Ablauf der {BEG_ANTRAG_FRISTEN.bewilligungMonate} Monate
          </strong>{" "}
          — wer erst danach einreicht, verliert den Anspruch auf die Auszahlung, obwohl
          der Zuschuss längst zugesagt war. Das ist der zweite Weg, auf dem das Geld
          verschwindet, und der unauffälligere. Verbindlich ist die erste Frist trotzdem:
          Die Förderrichtlinie schreibt die Einreichung dort vor. Ausdrücklich an die
          zweite geknüpft ist nur der Verlust des Anspruchs.
        </p>
        <p style={S.p}>
          <strong style={S.strong}>Der dritte Weg ist der leiseste.</strong>{" "}
          {BEG_KEINE_AUFSTOCKUNG}
        </p>
        <p style={S.p}>
          <strong style={S.strong}>Selbst einbauen?</strong> {BEG_EIGENLEISTUNG}
        </p>
        <p style={{ ...S.p, fontSize: v("--font-size-small") }}>
          {BEG_ANTRAG_GELTUNGSBEREICH} Das beschreibt das Verfahren, wie die KfW es
          veröffentlicht, und ist keine Rechts- oder Förderberatung. Auf die Zusage
          besteht kein Anspruch — und sie allein ist verbindlich.
          Grundlage ist das KfW-Merkblatt 458, gültig ab {gueltigAb}, zusammen mit der
          BEG-EM-Förderrichtlinie; zuletzt geprüft am {verfahrenGeprueft}.
        </p>

        {/* ── Interaktiver Förder-Check (Embed) ── */}
        <h2 id="foerder-check" style={{ ...S.h2, scrollMarginTop: 80 }}>Deine Förderung selbst ausrechnen</h2>
        <p style={S.p}>
          Beantworte ein paar Fragen — Gebäude, alte Heizung, Einkommen — und der Förder-Check
          führt dich Schritt für Schritt zu deinem BEG-Zuschuss. Er rechnet mit derselben
          geprüften Engine wie die Tabelle oben, ohne Anmeldung:
        </p>
        <AutoHeightIframe
          src="/embed/foerder-check?onsite=1"
          title="BEG-Förder-Check für Wärmepumpen"
          fallbackHeight={520}
        />
        <div style={{ marginTop: 8, fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          <DataSourceNote source={DATA_SOURCES.beg} />
        </div>
        <p style={{ ...S.p, marginTop: 14 }}>
          Für die vollständige Rechnung — inklusive Betriebskosten, Vergleich mit deiner alten
          Gas- oder Ölheizung und der{" "}
          <GlossaryTerm id="amortisation">Amortisation</GlossaryTerm> über 20 Jahre — geht es
          weiter im <a href="#wp-rechner" style={S.link}>Wärmepumpen-Rechner</a>.
        </p>

        {/* ── Wer bekommt viel / wenig ── */}
        <h2 style={S.h2}>Wer bekommt viel — und wer wenig?</h2>
        <ProConLists
          proTitle="Voller Zuschuss wahrscheinlich"
          conTitle="Nur der Grundanteil"
          proItems={[
            { term: "Eigennutzer mit alter Ölheizung", desc: "Öl-, Kohle- und Nachtspeicherheizungen lösen den Klima-Bonus unabhängig vom Alter aus." },
            { term: "Niedriges bis mittleres Einkommen", desc: "Der Einkommens-Bonus greift bis zur obersten Staffelgrenze — hier steckt der größte einzelne Hebel." },
            { term: "Familie knapp über einer Grenze", desc: "Der Familienzuschlag senkt das anzusetzende Einkommen und kann eine Stufe höher heben." },
            { term: "Alte Gasheizung ab 20 Jahren", desc: "Ab dieser Grenze zählt auch die zentrale Gasheizung — Gas-Etagenheizungen sogar unabhängig vom Alter. Baujahr auf dem Typenschild prüfen." },
          ]}
          conItems={[
            { term: "Vermieter", desc: "Klima- und Einkommens-Bonus sind an Selbstnutzung gebunden — es bleibt die Grundförderung." },
            { term: "Höheres Einkommen", desc: "Über der obersten Einkommensgrenze entfällt der Einkommens-Bonus komplett." },
            { term: "Junge zentrale Gas- oder Pelletheizung", desc: "Unter 20 Jahren zählt eine funktionierende zentrale Gas- oder Biomasseheizung nicht für den Klima-Bonus (Gas-Etage ausgenommen)." },
            { term: "Neubau", desc: "Kein prozentualer Zuschuss — dort läuft die Förderung nur über KfW-Kredite fürs ganze Gebäude." },
          ]}
        />

        {/* ── Was daraus wirklich geworden ist ──

             Alles über diesem Abschnitt beschreibt das Regelwerk: welche Sätze
             es gibt, wer welchen Bonus bekommen KANN. Das ist die Auskunft, die
             auch das Merkblatt gibt. Was den Unterschied zu einer Merkblattseite
             macht, ist die Gegenprobe: wie oft das tatsächlich passiert ist.
             Deshalb steht der Block direkt hinter der Regel-Gegenüberstellung
             und nicht am Seitenende — er beantwortet dieselbe Frage noch
             einmal, nur mit gezählten statt möglichen Fällen.

             Fehlt die Datenbank, entfällt er lautlos; die Seite bleibt
             vollständig. */}
        {kfw && (
          <>
            <h2 style={S.h2}>Und wie oft kommt das wirklich vor?</h2>
            <p style={S.p}>
              Die Übersicht darüber sagt, wer welchen Bonus bekommen <em>kann</em>. Der
              Förderreport der KfW sagt, wie oft es tatsächlich passiert ist.
            </p>
            <div style={S.card}>
              <KfwFoerderpraxis daten={kfw} nackt />
            </div>
          </>
        )}

        {/* ── Ehrlicher Hinweis ── */}
        <div style={S.card}>
          <span style={S.label}>Ehrlich gesagt</span>
          Wenn du das Alter deiner zentralen Gas- oder Biomasseheizung nicht kennst, ist der
          Klima-Bonus unsicher — er hängt bei diesen an der 20-Jahre-Grenze. Bei Öl, Kohle,
          Gas-Etagen- und Nachtspeicherheizungen ist er dagegen unabhängig vom Alter sicher.
          Plane einen unsicheren Bonus lieber nicht fest ein, bis du das Baujahr am Typenschild
          oder in den Schornsteinfeger-Unterlagen geprüft hast.
          <br />
          <span style={S.muted}>
            Alle Beträge auf dieser Seite sind unverbindliche Näherungswerte ohne Gewähr und
            ersetzen keine Förderberatung. Verbindlich ist allein die Zusage der
            KfW; wie der Antrag zeitlich zum Auftrag stehen muss, steht oben unter{" "}
            <a href={`#${BEG_ANTRAG_ANKER}`} style={S.link}>
              Die Reihenfolge entscheidet
            </a>
            . Stand und Quelle der Fördersätze findest du auf der{" "}
            <Link href="/datenstand" style={S.link}>Datenstand-Seite</Link>.
          </span>
        </div>

        {/* ── CTA ── */}
        <div style={{ ...S.hero, marginTop: 28 }}>
          <span style={S.label}>Lohnt sich die Wärmepumpe für dich?</span>
          <p style={{ ...S.p, color: v("--color-text-primary"), marginBottom: 14 }}>
            Der Zuschuss ist nur die halbe Rechnung — entscheidend ist, was die Wärmepumpe über
            20 Jahre gegenüber Gas oder Öl spart. Das rechnet der Wärmepumpen-Rechner mit deinen
            Daten durch, ohne Anmeldung.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="#wp-rechner" style={S.ctaButton}>
              Wärmepumpe durchrechnen →
            </a>
            <Link href="/photovoltaik-foerderung" style={S.ctaSecondary}>
              PV-Förderung vor Ort
            </Link>
          </div>
        </div>

        {/* ── Reform-Hinweis ──
             Dieser Absatz nannte bis zum 26.08.2026 nur die Absenkung von Boni und
             Höchstbetrag, und das im Konjunktiv („sollen sinken"). Beides war zu
             schwach: Die mit Abstand größte Änderung — die Halbierung des
             Grundfördersatzes für Wärmepumpen — fehlte ganz, und was in der
             geltenden Richtlinie steht, „soll" nicht, sondern kommt. Ein Leser, der
             hier den Ausblick liest und im Januar wiederkommt, hätte sich die
             veränderten Zahlen sonst nicht erklären können. Alle Werte aus dem
             Fahrplan, kein getippter Prozentsatz. */}
        <h2 style={S.h2}>Was sich {NAECHSTE ? NAECHSTE.bezeichnung : "in den nächsten Jahren"} ändert</h2>
        {NAECHSTE && NAECHSTE.grundfoerderung < STUFE.grundfoerderung ? (
          <>
            <p style={S.p}>
              <strong style={S.strong}>
                Der Grundfördersatz für Wärmepumpen halbiert sich von{" "}
                {pct(STUFE.grundfoerderung)} auf {pct(NAECHSTE.grundfoerderung)}.
              </strong>{" "}
              Das ist beschlossen und steht bereits in der geltenden Förderrichtlinie — anders
              als bei einem Gesetzentwurf muss dafür nichts mehr entschieden werden. Einen
              tagesgenauen Termin nennt sie allerdings nicht, sondern nur das erste Quartal
              2027. Maßgeblich ist, wann der Antrag eingeht, nicht wann eingebaut wird.
            </p>
            <p style={S.p}>
              <strong style={S.strong}>Es ist trotzdem keine Kürzung für alle.</strong> Zum
              selben Zeitpunkt kommt ein neuer Bonus von{" "}
              {pct(BEG_WERTSCHOEPFUNGS_BONUS.satz)} dazu, wenn die Wärmepumpe ihren Ursprung in
              der EU hat — genau so viel, wie die Halbierung wegnimmt. Für ein solches Gerät
              bleibt der Zuschuss also gleich. Wer eines von außerhalb einbaut, bekommt
              dagegen wirklich nur noch die Hälfte des Grundzuschusses.
              {" "}
              <strong style={S.strong}>
                Woran sich der Ursprung entscheidet, legt die Richtlinie allerdings nicht
                selbst fest
              </strong>{" "}
              — sie verweist dafür auf ein gesondertes Infoblatt, das bislang nicht vorliegt.
              Vom Markennamen lässt sich jedenfalls nicht darauf schließen. Wer 2027 baut,
              sollte seinen Fachbetrieb ausdrücklich danach fragen, sobald die Abgrenzung
              veröffentlicht ist. Anders als beim Klima- und beim Einkommens-Bonus spielt es
              hier keine Rolle, ob man selbst im Haus wohnt.
            </p>
            <p style={S.p}>
              Daneben sinken ab {NACH_NAECHSTE ? NACH_NAECHSTE.bezeichnung : "Februar 2027"} in
              halbjährlichen Schritten auch der Klima-Geschwindigkeits-Bonus und der Betrag,
              bis zu dem Kosten überhaupt angerechnet werden. Wer den Heizungstausch ohnehin
              plant, sichert sich mit einem Antrag in diesem Jahr die heutigen Sätze. Das ist
              eine allgemeine Einordnung, keine individuelle Beratung — maßgeblich ist die
              jeweils gültige Förderrichtlinie, und einen Rechtsanspruch auf die Förderung gibt
              es nicht.
            </p>
          </>
        ) : (
          <p style={S.p}>
            Die Boni und der Förderhöchstbetrag sinken in halbjährlichen Schritten weiter. Wer
            den Heizungstausch ohnehin plant, sichert sich mit einem Antrag zu den aktuellen
            Sätzen den heute gültigen Zuschuss. Das ist eine allgemeine Einordnung, keine
            individuelle Beratung — maßgeblich ist die jeweils gültige Förderrichtlinie, und
            einen Rechtsanspruch auf die Förderung gibt es nicht.
          </p>
        )}

        {/* ── FAQ (visible accordion + FAQPage JSON-LD from the same data) ── */}
        <Faq items={faqItems} title="Häufige Fragen zur Wärmepumpen-Förderung" currentPath="/ratgeber/waermepumpe-foerderung" />

        <RelatedLinks
          currentPath="/ratgeber/waermepumpe-foerderung"
          links={[
            { href: "/waermepumpe-rechner", label: "Wärmepumpen-Rechner", desc: "Stromverbrauch, Kosten und Ersparnis gegenüber Gas oder Öl — mit eingerechneter Förderung." },
            { href: "/ratgeber/gasheizung-oder-waermepumpe", label: "Gasheizung oder Wärmepumpe?", desc: "Was sich nach dem Gebäudemodernisierungsgesetz noch rechnet — mit Grüngas-Kostenpfad." },
            { href: "/ratgeber/lohnt-sich-pv-mit-speicher", label: "Lohnt sich PV mit Speicher?", desc: "Die ehrliche Rechnung mit aktuellen Marktpreisen — PV und Wärmepumpe verstärken sich gegenseitig." },
            { href: "/photovoltaik-foerderung", label: "PV-Förderung vor Ort", desc: "Welche Zuschüsse es in deinem Bundesland und deiner Stadt gerade gibt." },
            { href: "/datenstand", label: "Aktuelle Werte & Annahmen" },
            { href: "/glossar", label: "Glossar" },
          ]}
        />
        <p style={{ ...S.p, fontSize: v("--font-size-small"), marginTop: 16 }}>
          Grundlage: KfW-Zuschuss 458 (BEG Einzelmaßnahme), gültig ab {gueltigAb}; unsere Werte auf dem Stand vom {standDatum}. Die
          Fördersätze auf dieser Seite werden direkt aus den geprüften Werten berechnet und
          bleiben so mit dem Rechner konsistent.
        </p>
        {/* Sentinel: sobald sichtbar, blendet sich die Sticky-Leiste aus, damit
            sie den Footer/Rechtstext nicht verdeckt. */}
        <div id="sc-cta-sentinel" style={{ height: 1 }} aria-hidden />
      </div>
      <StickyCta foerderHref="#foerder-check" />
      <WpRechnerModal />
    </div>
  );
}
