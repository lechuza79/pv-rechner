import { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../components/Breadcrumb";
import ProConLists from "../../../components/ProConLists";
import Faq from "../../../components/Faq";
import AutoHeightIframe from "../../../components/AutoHeightIframe";
import { waermepumpeFoerderungFaq } from "../../../lib/faq";
import { v } from "../../../lib/theme";
import { calcBegSubsidy, calcInvestBrutto, calcHeatLoad } from "../../../lib/heatpump";
import { DEFAULT_HEATPUMP_CONFIG as HP } from "../../../lib/heatpump-config";
import { pageMetadata } from "../../../lib/seo";

// Figures on this page come live from the same BEG engine the calculator and
// the Förder-Check widget use (calcBegSubsidy + the geprüfte config, KfW
// Merkblatt 458). If a number here ever differs from the tool, that's a bug,
// not a rounding choice. ISR keeps the render-time date fresh without a rebuild.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    path: "/waermepumpe-foerderung-2026",
    title: "Wärmepumpen-Förderung 2026: Wie viel Zuschuss gibt es wirklich?",
    description:
      "Grundförderung, Klima-Bonus, Einkommens-Bonus: Wie sich der BEG-Zuschuss für den Heizungstausch zusammensetzt — mit live gerechneten Beispielfällen nach KfW Merkblatt 458 und dem Förder-Check zum selbst Durchrechnen. Ohne Anmeldung.",
    ogImageTitle: "Wärmepumpen-Förderung 2026",
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
  wrap: { maxWidth: v("--content-max-width"), margin: "0 auto", paddingTop: 60 },
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

export default function WaermepumpeFoerderungPage() {
  const faqItems = waermepumpeFoerderungFaq();
  const standDatum = formatFullDate(HP.validFrom);

  // Representative gross investment for a typical detached EFH (shared engine).
  const heizlast = calcHeatLoad("bestand", EX_WOHNFLAECHE, EX_INSULATION, 1);
  const investBrutto = calcInvestBrutto("lwwp", heizlast, false);

  const rows = CASES.map((c) => {
    const beg = calcBegSubsidy("bestand", "lwwp", investBrutto, c.opts);
    return { ...c, rate: beg.rate, amount: beg.amount, rest: investBrutto - beg.amount };
  });

  const maxZuschuss = Math.round(HP.begMaxCap * HP.begMaxRateLowIncome);
  const staffel = HP.begEinkommensStaffel;

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Ratgeber", href: "/ratgeber" },
            { label: "Wärmepumpen-Förderung 2026" },
          ]}
          jsonLd
        />

        <h1 style={S.h1}>Wärmepumpen-Förderung 2026: Wie viel Zuschuss gibt es wirklich?</h1>
        <p style={S.subtitle}>
          Der Staat übernimmt beim Heizungstausch einen erheblichen Teil der Kosten — aber
          wie viel genau, hängt davon ab, wer du bist und was du bisher heizt. Hier steht,
          wie sich der Zuschuss zusammensetzt, mit Beispielrechnungen aus derselben Engine
          wie unser Wärmepumpen-Rechner.
        </p>

        {/* ── Kurzantwort ── */}
        <div style={S.hero}>
          <span style={S.label}>Die Kurzantwort</span>
          <strong style={S.strong}>Zwischen {pct(HP.begGrundfoerderung)} und {pct(HP.begMaxRateLowIncome)} der Kosten.</strong>{" "}
          Jeder Heizungstausch im Bestand bekommt die Grundförderung von {pct(HP.begGrundfoerderung)} —
          auch Vermieter. Selbstnutzende Eigentümer können über den Klima-Bonus und einen
          einkommensabhängigen Bonus auf bis zu {pct(HP.begMaxRateLowIncome)} kommen. Gefördert
          werden Kosten bis {eur(HP.begMaxCap)} für die erste Wohnung, der maximale Zuschuss
          liegt damit bei {eur(maxZuschuss)}. Im Neubau gibt es diesen Zuschuss dagegen nicht.
        </div>
        <p style={{ ...S.p, fontSize: v("--font-size-small"), marginBottom: 0 }}>
          Grundlage: KfW-Zuschuss 458 (BEG Einzelmaßnahme), gültig ab {standDatum} · unverbindliche
          Näherungswerte, ohne Gewähr — verbindlich ist der Zuschussbescheid der KfW.
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
          Der Fördersatz ist kein fester Wert, sondern wird aus bis zu drei Bausteinen
          zusammengesetzt. Alle beziehen sich auf die förderfähigen Kosten (gedeckelt bei{" "}
          {eur(HP.begMaxCap)} für die erste Wohnung):
        </p>

        <div style={S.card}>
          <span style={S.accent}>1. Grundförderung — {pct(HP.begGrundfoerderung)}</span>
          <br />
          Bekommt jeder Heizungstausch im Bestand, ohne Bedingungen an Person oder alte
          Heizung. Auch Vermieter erhalten diesen Anteil.
        </div>
        <div style={S.card}>
          <span style={S.accent}>2. Klima-Geschwindigkeits-Bonus — +{pct(HP.begKlimaBonus)}</span>
          <br />
          Nur für <strong style={S.strong}>selbstnutzende Eigentümer</strong>, die eine noch
          funktionierende fossile Heizung ersetzen. Öl-, Kohle- und Nachtspeicherheizungen
          zählen <strong style={S.strong}>unabhängig vom Alter</strong>. Gas-, Holz- und
          Pelletheizungen zählen erst <strong style={S.strong}>ab 20 Jahren</strong> — das
          Baujahr steht auf dem Typenschild am Kessel. Dieser Bonus soll ab dem 1. Februar 2027
          schrittweise sinken.
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

        {/* ── Interaktiver Förder-Check (Embed) ── */}
        <h2 style={S.h2}>Deine Förderung selbst ausrechnen</h2>
        <p style={S.p}>
          Trag deine eigenen Werte ein — Kosten, alte Heizung, Einkommen — und der Förder-Check
          zeigt dir sofort den Zuschuss. Er rechnet mit derselben geprüften Engine wie die
          Tabelle oben, ohne Anmeldung:
        </p>
        <AutoHeightIframe
          src="/embed/foerder-check"
          title="BEG-Förder-Check für Wärmepumpen"
          fallbackHeight={520}
        />
        <p style={{ ...S.p, marginTop: 14 }}>
          Für die vollständige Rechnung — inklusive Betriebskosten, Vergleich mit deiner alten
          Gas- oder Ölheizung und der Amortisation über 20 Jahre — geht es weiter im{" "}
          <Link href="/waermepumpe-rechner" style={S.link}>Wärmepumpen-Rechner</Link>.
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
            { term: "Alte Gasheizung ab 20 Jahren", desc: "Ab dieser Grenze zählt auch die Gasheizung für den Klima-Bonus — Baujahr auf dem Typenschild prüfen." },
          ]}
          conItems={[
            { term: "Vermieter", desc: "Klima- und Einkommens-Bonus sind an Selbstnutzung gebunden — es bleibt die Grundförderung." },
            { term: "Höheres Einkommen", desc: "Über der obersten Einkommensgrenze entfällt der Einkommens-Bonus komplett." },
            { term: "Junge Gas- oder Pelletheizung", desc: "Unter 20 Jahren zählt eine funktionierende Gas-/Biomasseheizung nicht für den Klima-Bonus." },
            { term: "Neubau", desc: "Kein prozentualer Zuschuss — dort läuft die Förderung nur über KfW-Kredite fürs ganze Gebäude." },
          ]}
        />

        {/* ── Ehrlicher Hinweis ── */}
        <div style={S.card}>
          <span style={S.label}>Ehrlich gesagt</span>
          Wenn du das Alter deiner Gas- oder Biomasseheizung nicht kennst, ist der Klima-Bonus
          unsicher — er hängt an der 20-Jahre-Grenze. Bei Öl, Kohle und Nachtspeicher ist er
          dagegen sicher. Plane einen unsicheren Bonus lieber nicht fest ein, bis du das
          Baujahr am Typenschild oder in den Schornsteinfeger-Unterlagen geprüft hast.
          <br />
          <span style={S.muted}>
            Alle Beträge auf dieser Seite sind unverbindliche Näherungswerte ohne Gewähr und
            ersetzen keine Förderberatung. Verbindlich ist allein der Zuschussbescheid der
            KfW; die Antragstellung läuft vor Auftragsvergabe über das KfW-Zuschussportal. Die
            Fördersätze findest du mit Stand und Quelle auf der{" "}
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
            <Link href="/waermepumpe-rechner" style={S.ctaButton}>
              Wärmepumpe durchrechnen →
            </Link>
            <Link href="/photovoltaik-foerderung" style={S.ctaSecondary}>
              PV-Förderung vor Ort
            </Link>
          </div>
        </div>

        {/* ── Reform-Hinweis ── */}
        <p style={{ ...S.p, marginTop: 20 }}>
          <strong style={S.strong}>Ausblick:</strong> Die Boni sollen ab dem 1. Februar 2027
          schrittweise sinken, ebenso der Förderhöchstbetrag. Wer den Heizungstausch ohnehin
          plant, sichert sich mit einem Antrag zu den aktuellen Sätzen den heute gültigen
          Zuschuss. Das ist eine allgemeine Einordnung, keine individuelle Beratung —
          maßgeblich ist die jeweils gültige KfW-Richtlinie.
        </p>

        {/* ── FAQ (visible accordion + FAQPage JSON-LD from the same data) ── */}
        <Faq items={faqItems} title="Häufige Fragen zur Wärmepumpen-Förderung" currentPath="/waermepumpe-foerderung-2026" />

        <p style={{ ...S.p, fontSize: v("--font-size-small") }}>
          Verwandte Seiten: <Link href="/waermepumpe-rechner" style={S.link}>Wärmepumpen-Rechner</Link> ·{" "}
          <Link href="/lohnt-sich-pv-mit-speicher" style={S.link}>Lohnt sich PV mit Speicher?</Link> ·{" "}
          <Link href="/photovoltaik-foerderung" style={S.link}>PV-Förderung vor Ort</Link> ·{" "}
          <Link href="/datenstand" style={S.link}>Aktuelle Werte &amp; Annahmen</Link> ·{" "}
          <Link href="/glossar" style={S.link}>Glossar</Link>
        </p>
        <p style={{ ...S.p, fontSize: v("--font-size-small"), marginTop: 16 }}>
          Grundlage: KfW-Zuschuss 458 (BEG Einzelmaßnahme), Stand {standDatum}. Die
          Fördersätze auf dieser Seite werden direkt aus den geprüften Werten berechnet und
          bleiben so mit dem Rechner konsistent.
        </p>
      </div>
    </div>
  );
}
