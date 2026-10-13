import { createElement } from "react";
import artwork from "./FundingProgramParts.module.css";
import foundation from "./social/atlas-foundations.module.css";
import ExampleCard, { ExampleAmount, ExampleSize } from "./ExampleCard";
import MetricValue from "./MetricValue";
import { ActionLink } from "./ActionButton";
import Script from "next/script";
import "../public/design-system/feature-card.css";
import { v, stageDefaults } from "../lib/theme";
import StatusBadge from "./StatusBadge";
import InfoTooltip from "./InfoTooltip";
import {
  FUNDING_STATUS_LABEL, FUNDING_STATUS_NOTE, bedingungenFuer, saetzeFuer,
  type FundingProgram, type FundingStatus, type FundingCondition, type FundingTechnik,
} from "../lib/funding-programs";
import type { FundingCaseExample, FundingExample } from "../lib/funding-examples";

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

// Shared, data-bound building blocks for rendering a funding program. Used by
// the overview, the Bundesland page, the city page and the result modal so the
// program-data markup (status, rates, conditions) lives in ONE place — change
// it here, not in four files. Page-specific framing (CTAs, eligibility badges,
// combinable links, containers) stays in each caller.

// Wortlaut der Status-Bezeichnungen: umgezogen nach lib/funding-programs.ts
// (18.08.2026), damit auch der Verlaufs-Vergleich sie benutzen kann, ohne eine
// React-Komponente in die Schreibseite zu ziehen. Re-Export, damit die
// bisherigen Aufrufer unverändert bleiben — EINE Quelle, zwei Türen.
export { FUNDING_STATUS_LABEL, FUNDING_STATUS_NOTE };

/**
 * Einheiten, die eine Erklärung brauchen — als „?" hinter der Einheit.
 *
 * „Prozentpunkte" ist der Fall, für den es das gibt: +5 Prozentpunkte auf 20 %
 * ergibt 25 %, nicht 21 %. Der Unterschied sind bei 17.000 € Investition rund
 * 680 € — die Einheit deshalb NICHT zu „%" zu vereinfachen, sondern zu
 * erklären, ist die einzige Fassung, die stimmt UND verstanden wird.
 */
const EINHEIT_ERKLAERT: Record<string, string> = {
  Prozentpunkte:
    "Prozentpunkte werden auf den Fördersatz aufgeschlagen, nicht vom Betrag abgezogen: " +
    "5 Prozentpunkte auf 20 % ergeben 25 % — nicht 21 %.",
};

export function fundingStatusColor(status: FundingStatus): string {
  // Text + border of the status badge on a white card — use the AA-contrast green
  // text token (not the bright brand green, which fails contrast as text).
  return status === "aktiv" ? v("--color-positive") : v("--color-text-muted");
}

export function FundingStatusBadge({ status, compact = false }: { status: FundingStatus; compact?: boolean }) {
  if (compact) return <StatusBadge tone={status === "aktiv" ? "positive" : status === "ausgeschoepft" || status === "eingestellt" ? "negative" : "neutral"} pulse={status === "aktiv"}>{FUNDING_STATUS_LABEL[status]}</StatusBadge>;
  const c = fundingStatusColor(status);
  // „aktiv" ist eine positive Aussage und wird auch so gesetzt: gefüllt in der
  // Positiv-Farbe des Systems statt als blasser Umriss. Die übrigen Zustände
  // (ausgeschöpft, pausiert, eingestellt) behalten den Umriss — sie sind
  // Einschränkungen und sollen nicht wie eine Auszeichnung wirken.
  const positiv = status === "aktiv";
  return (
    <span
      style={{
        fontSize: "var(--font-size-small)",
        fontWeight: 700,
        color: positiv ? v("--color-positive-text") : c,
        background: positiv ? v("--color-chart-positive-bg") : "transparent",
        border: `1px solid ${positiv ? "transparent" : c}`,
        borderRadius: 999,
        padding: "5px 14px",
        whiteSpace: "nowrap",
      }}
    >
      {FUNDING_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * Einen Fördersatz in Zahl, Einheit und Zusatz zerlegen.
 *
 * Dieselbe Staffelung wie bei den Kacheln im Atlas: Der Zahlenwert trägt die
 * Zeile, die Einheit steht kleiner daneben, eine Bedingung darunter noch
 * kleiner und ruhiger. „20 % (30 % als Solar-Gründach)" als ein Stück in der
 * Zahlen-Schrift ließ die Einheit so laut schreien wie den Betrag.
 *
 * DIE KLAMMER MUSS NICHT AM ENDE STEHEN (26.08.2026). Hier stand
 * `.replace(/\)$/, "")` — das entfernt die schließende Klammer nur, wenn sie
 * das letzte Zeichen ist. Steht hinter ihr noch etwas, blieb sie mitten im Text
 * stehen: Niddas Höchstbetrag erschien als „1.500 € Anlage + Speicher),
 * Mini-PV max. 200 €", mit einer Klammer, die nirgends aufgeht. Es war kein
 * Einzelfall — fünf Programme im Katalog tragen eine Klammer, und jedes hätte
 * denselben Rest hinter sich haben können.
 *
 * ALS EIGENE FUNKTION, nicht inline in der Zeile: Die Zerlegung ist Logik mit
 * Randfällen und stand mitten im JSX, wo kein Test sie erreichte. Genau deshalb
 * fiel der Klammerfehler auch nicht auf, sondern erst beim Ansehen der fertigen
 * Seite.
 */
export function zerlegeSatz(value: string): {
  zahl: string;
  einheit: string | null;
  zusatz: string | null;
  kurzeEinheit: boolean;
} {
  const auf = value.indexOf(" (");
  const zu = auf > 0 ? value.indexOf(")", auf) : -1;
  const ohneZusatz = auf > 0 ? value.slice(0, auf) : value;
  // Was hinter der schließenden Klammer steht, gehört zum Zusatz — nur ohne die
  // Klammerzeichen selbst.
  const zusatz =
    auf > 0 ? (zu > 0 ? `${value.slice(auf + 2, zu)}${value.slice(zu + 1)}` : value.slice(auf + 2)) : null;
  const m = ohneZusatz.match(/^([+−-]?[\d.,]+(?:\s*[–-]\s*[\d.,]+)?)\s*(.*)$/);
  const zahl = m ? m[1] : ohneZusatz;
  let einheit = m && m[2] ? m[2] : null;
  let zusatz2 = zusatz;

  // DER DECKEL IST KEINE EINHEIT (26.08.2026).
  //
  // 88 von 201 Sätzen im Katalog tragen ihren Höchstbetrag im selben String:
  // „100 €/kWp, max. 1.000 €". Alles davon landete in der Einheit, die damit
  // zu lang für die Zeile wurde und unter die Zahl rutschte — übrig blieb oben
  // eine nackte „100". Bei „50 % der Kosten, max. 200 €" war es schlimmer: Dort
  // stand als Wert „50" ohne Prozentzeichen, also eine Zahl, der man nicht
  // ansieht, ob Euro oder Prozent gemeint sind. Genau die Fehlerklasse, gegen
  // die im Projekt die Regel „Zahl und Einheit gehören zusammen" steht.
  const deckel = einheit?.match(/^(.*?),\s*(max\..*)$/);
  if (deckel) {
    einheit = deckel[1] || null;
    zusatz2 = zusatz2 ? `${deckel[2]}, ${zusatz2}` : deckel[2];
  }

  // DAS SYMBOL GEHÖRT AN DIE ZAHL, DIE ERLÄUTERUNG NICHT.
  //
  // „50 % der Kosten" ließ nach dem Deckel-Schnitt immer noch „50" allein oben
  // stehen, weil „% der Kosten" als ausgeschriebene Einheit gilt. Eine 50 ohne
  // Prozentzeichen ist aber keine schwächere Angabe, sondern eine andere: Man
  // sieht ihr nicht an, ob Euro oder Prozent gemeint sind. Getrennt wird
  // deshalb am ersten Leerzeichen nach dem Symbol — „%" trägt die Zeile,
  // „der Kosten" steht als Erläuterung darunter.
  // Kurzzeichen ohne Symbol zählen mit: „85 ct je Watt Wechselrichterleistung"
  // ließ sonst eine blanke 85 stehen. „Prozentpunkte" bleibt unberührt — es
  // steht ohne Erläuterung dahinter und ist selbst das ganze Wort.
  const symbolTeil = einheit?.match(/^([%€$£][^\s]*|ct|kW[hp]?|MWh?|W)\s+(.+)$/);
  if (symbolTeil) {
    einheit = symbolTeil[1];
    zusatz2 = zusatz2 ? `${symbolTeil[2]}, ${zusatz2}` : symbolTeil[2];
  }

  // Kurzzeichen bleiben in der Zeile, ausgeschriebene Einheiten rutschen
  // darunter — sonst wird die Zeile vom Wort statt von der Zahl geführt.
  //
  // Gemessen an der LÄNGE ging das schief: „€/kWp" und „€/kWh" sind fünf
  // Zeichen und damit nach der alten Regel (≤ 3) ausgeschriebene Wörter, obwohl
  // sie genau das Gegenteil sind. Maßgeblich ist deshalb die Form: ein
  // Kurzzeichen enthält ein Symbol und kein Leerzeichen; „Prozentpunkte" und
  // „% der Kosten" bleiben damit unten, wo sie hingehören.
  const kurzeEinheit = !!einheit && !einheit.includes(" ") && /^(?:[%€$£][^\s]*|ct|kW[hp]?|MWh?|W)$/.test(einheit);
  return { zahl, einheit, zusatz: zusatz2, kurzeEinheit };
}

/** The "label … value" rate rows. `bordered` adds the divider used in detail
 *  views (modal, city page); list views (overview, Bundesland) leave it off. */
export function FundingRates({
  rates,
  bordered = false,
  columns = 1,
  stacked = false,
  tiles = false,
  headerTiles = false,
  label,
  technik,
}: {
  rates: FundingProgram["rates"];
  bordered?: boolean;
  stacked?: boolean;
  tiles?: boolean;
  headerTiles?: boolean;
  /** Nur die Sätze dieser Technik zeigen — ohne Angabe alle. */
  technik?: FundingTechnik;
  /** Überschrift über der Liste — damit die Sätze neben den Bedingungen
   *  genauso beschriftet sind wie diese und nicht als namenlose Tabelle
   *  danebenstehen. */
  label?: string;
  /** Zweispaltig auf breiten Bildschirmen — die Sätze sind kurze
   *  Beschriftung-Wert-Paare und lassen als einspaltige Liste viel Weißraum
   *  neben sich stehen. Unter 420 px bleibt es einspaltig, sonst bricht der
   *  Wert von seiner Beschriftung weg. */
  columns?: 1 | 2;
}) {
  return (
    <div>
      {headerTiles && <Script src="/illustrations-motion/solar-illustrations.js" strategy="afterInteractive" />}
      {label && (
        <div style={{ fontSize: "var(--font-size-caption)", fontWeight: 700, color: v("--color-text-secondary"), marginBottom: 12 }}>{label}</div>
      )}
    <div
      style={
        columns === 2
          ? { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: headerTiles ? 20 : bordered ? 8 : 4, columnGap: 20 }
          : { display: "flex", flexDirection: "column", gap: bordered ? 8 : 4 }
      }
    >
      {saetzeFuer(rates, technik).map((r) => {
        const { zahl, einheit, zusatz, kurzeEinheit } = zerlegeSatz(r.value);
        const capacity = tiles ? r.label.match(/\s*\((bis [^)]*kWp)\)\s*$/) : null;
        const rateTitle = capacity ? r.label.slice(0, capacity.index) : r.label;
        const buildingMotif = /Mieterstrom|gemeinschaftlich/i.test(rateTitle) ? "tenant-solar" : /Fassade/i.test(rateTitle) ? "facade-pv" : null;
        return (
          <div
            key={r.label}
            className={headerTiles ? foundation.foundation : undefined}
            data-story-scheme={headerTiles ? "dark" : undefined}
            style={{
              // flexWrap: Passt der Wert nicht mehr neben die Beschriftung (schmale
              // Spalte, langes Label), rutscht er darunter statt über den Rand —
              // dritter Fund des Überlauf-Tests (05.09.2026, 14 px bei „120 €/kWp").
              display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: stacked ? 6 : 16, paddingTop: 4,
              ...(stacked ? { flexDirection: "column" as const, alignItems: "flex-start" } : {}),
              ...(tiles ? { background: headerTiles ? stageDefaults(0)["--color-bg-accent"] : v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: 16, justifyContent: "flex-start", minWidth: 0 } : {}),
              fontSize: "var(--font-size-body)",
              ...(bordered ? { borderBottom: `1px solid ${v("--color-border")}`, paddingBottom: 12 } : {}),
            }}
          >
            <div style={headerTiles ? {width:"calc(100% + 32px)",boxSizing:"border-box",margin:"-16px -16px 8px",padding:16,borderRadius:"var(--radius-md) var(--radius-md) 0 0",background:"var(--color-bg-muted)",minHeight:"10em",position:"relative",isolation:"isolate",overflow:"hidden"} : undefined}>{headerTiles && (buildingMotif || /Dach.PV/i.test(rateTitle)) && <span aria-hidden="true" className={artwork.background}>{buildingMotif ? <>
              {/* Complete approved compositions include all three splash layers. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/illustrations-motion/funding-buildings-v2/${buildingMotif}-mono-dark.svg`} alt="" />
            </> : createElement("img", {src:"/illustrations-motion/funding-buildings-v2/house.webp", alt:"", width:600, height:600, fetchPriority:"high", style:{position:"absolute",width:"100%",height:"auto",right:0,bottom:-28}})}</span>}<span style={{ color: tiles ? v("--color-text-primary") : v("--color-text-secondary"), fontWeight: tiles ? 700 : 400, ...(headerTiles ? {display:"block",lineHeight:1.2} : {}) }}>{rateTitle}</span>{capacity && <div style={{fontSize:v("--font-size-small"),color:v("--color-text-secondary"),marginTop:8,...(headerTiles ? {borderTop:"1px solid color-mix(in srgb, currentColor 20%, transparent)",paddingTop:8} : {})}}>{capacity[1]}</div>}</div>
            {/* Zahl und Einheit bleiben zusammen (nowrap) — ein SATZ als Wert
                („Betrag nur in der Richtlinie, Jahrestopf 4.000 €") darf das
                nicht erben: Er lief auf Telefonbreite 160 px über den Rand,
                gefunden vom Überlauf-Test am 05.09.2026. Ohne Einheit ist der
                Wert Fließtext und bricht um. */}
            {/* Der Wert-Kasten darf IMMER schrumpfen: Als starres Flex-Kind nahm
                er die Breite seiner längsten Zeile — und ein Zusatz wie „für
                Leistung über 8 kWp — höchstens …" ist als Fließtext gedacht,
                wurde aber nie umgebrochen (zweiter Fund des Überlauf-Tests,
                481 px). Zusammen bleiben nur Zahl und kurze Einheit, und die
                schützt das nowrap darunter. */}
            <span style={{ textAlign: stacked ? "left" : "right", flexShrink: 1, minWidth: 0 }}>
              <span style={{ whiteSpace: einheit ? "nowrap" : "normal", overflowWrap: "anywhere" }}>
                <span style={{ fontFamily: v("--font-mono"), fontWeight: headerTiles ? 900 : 700, ...(tiles ? {fontSize:headerTiles ? "calc(var(--font-size-h1) * 1.15)" : v("--font-size-h1")} : {}), ...(headerTiles ? {color:"var(--atlas-action)"} : {}) }}>{zahl}</span>
                {einheit && kurzeEinheit && (
                  <span style={{ fontSize: "var(--font-size-small)", color: v("--color-text-secondary"), fontWeight: 400, marginLeft: 4 }}>
                    {einheit}
                  </span>
                )}
              </span>
              {einheit && !kurzeEinheit && (
                <span style={{ display: "block", fontSize: headerTiles ? "var(--font-size-small)" : "var(--font-size-caption)", color: v("--color-text-muted"), fontWeight: 400, marginTop: 2 }}>
                  {einheit}
                  {/* Fester Platz für das „?": Der Knopf kommt erst mit der
                      Hydration dazu — ohne reservierte Breite schob er die
                      Einheit beim Erscheinen zur Seite. */}
                  {EINHEIT_ERKLAERT[einheit] && (
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, verticalAlign: "middle", marginLeft: 3 }}>
                      <InfoTooltip title="Prozentpunkte" size={12} ariaLabel={`Was bedeutet ${einheit}?`}>{EINHEIT_ERKLAERT[einheit]}</InfoTooltip>
                    </span>
                  )}
                </span>
              )}
              {zusatz && (
                <span style={{ display: "block", fontSize: headerTiles ? "var(--font-size-small)" : "var(--font-size-caption)", color: v("--color-text-muted"), fontWeight: 400, marginTop: 2 }}>
                  {tiles && !headerTiles ? <strong>{zusatz}</strong> : zusatz}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
    </div>
  );
}

/** The three example-system cards (5 / 10 / 15 kWp) with Investition, optional
 *  Förderung, Amortisation and 25-year Rendite. Shared by the city and the
 *  Bundesland page so the lead block stays identical. */
export function FundingCaseCards({ cases, calculatorHref }: { cases: FundingCaseExample[]; calculatorHref: string }) {
  return <><div style={{display:"grid",gap:24}}>{cases.map(item => <ExampleCard key={item.motif}
    title={item.title} motif={item.motif}
    illustration={<span className={artwork.caseIllustration} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/illustrations-motion/funding-buildings-v2/${item.motif}.${item.motif === "house" ? "webp" : "svg"}`} alt="" width={180} height={130} loading="lazy" decoding="async" />
    </span>}
    headerContent={<ExampleAmount amount={nf(item.grant)} period="einmaliger Zuschuss" />}>
    <div className={artwork.exampleResult}>
      <p>{item.description.split(/(\d+(?:[.,]\d+)*)/).map((part, index) => index % 2 ? <strong key={index}>{part}</strong> : part)}</p>
      {item.result && <><div><p>Überschuss nach <strong>25</strong> Jahren</p><div className={artwork.resultAmount}><MetricValue value={item.result.total} /><InfoTooltip title="Überschuss nach 25 Jahren" ariaLabel="Wie wird der Überschuss berechnet?">Eingesparte Stromkosten und Einspeisevergütung abzüglich {nf(item.result.netto)} € Investition nach Zuschuss. Modellrechnung {item.result.spKwh ? `mit ${item.result.spKwh} kWh Speicher einschließlich Speicherersatz` : "ohne Speicher"}, keine Ertragsgarantie.</InfoTooltip></div></div><ActionLink href={calculatorHref}>Rechner starten</ActionLink></>}
    </div>
  </ExampleCard>)}</div><Script src="/illustrations-motion/solar-illustrations.js" strategy="afterInteractive" /></>;
}

export function ExampleCards({ examples, illustrated = false, comparison = false }: { examples: FundingExample[]; illustrated?: boolean; comparison?: boolean }) {
  if (illustrated && comparison) return <>
    <div style={{display:"grid",gap:24}}>{examples.map((ex,index) => <ExampleCard key={ex.kwp}
      title={<><ExampleSize value={ex.kwp} unit="kWp" /> {ex.spKwh > 0 ? `mit ${ex.spKwh} kWh Speicher` : "ohne Speicher"}</>}
      motif={`pv-modules-${["small","medium","large"][Math.min(index,2)]}`}
      headerContent={ex.foerderung > 0 ? <ExampleAmount amount={nf(ex.foerderung)} period="einmaliger Zuschuss" /> : <p>Ohne angesetzten Zuschuss</p>}>
      <div className={artwork.exampleResult}>
        <MetricValue value={ex.total} />
        <p>Modellierter Überschuss nach 25 Jahren: eingesparte Stromkosten und Einspeisevergütung abzüglich der Investition nach Zuschuss und gegebenenfalls Speicherersatz.</p>
      </div>
    </ExampleCard>)}</div>
    <Script src="/illustrations-motion/solar-illustrations.js" strategy="afterInteractive" />
    <Script src="/illustrations-neon/solar-neon.js" strategy="afterInteractive" />
  </>;
  if (illustrated) return <>
    <div className="sc-feature-list" style={{ display: "grid", gap: 24 }}>{examples.map((ex, index) => <ExampleCard key={ex.kwp} title={<><ExampleSize value={ex.kwp} unit="kWp" /> {ex.spKwh > 0 ? `mit ${ex.spKwh} kWh Speicher` : "ohne Speicher"}</>} motif={`pv-modules-${["small", "medium", "large"][Math.min(index, 2)]}`}>
      {ex.foerderung > 0 && <p><strong>Zuschuss im Beispiel</strong><br /><MetricValue value={ex.foerderung} /></p>}
      <p>Investition ohne Zuschuss: {nf(ex.brutto)} €<br />
        {ex.foerderung > 0 && <><strong>Verbleibende Investition: {nf(ex.netto)} €</strong><br /></>}
        Amortisation{ex.foerderung > 0 ? " mit Zuschuss" : ""}: {ex.amort !== null ? `${ex.amort} Jahre` : "über 25 Jahre"}
        {ex.foerderung > 0 && <><br />Ohne Zuschuss: {ex.withoutFunding.amort !== null ? `${ex.withoutFunding.amort} Jahre` : "über 25 Jahre"}</>}
      </p>
      {ex.foerderung > 0 && <p>Gewinn ohne Zuschuss über 25 Jahre: {nf(ex.withoutFunding.total)} €</p>}
      {ex.foerderung > 0 ? <p>Modelliertes Ergebnis mit Zuschuss über 25 Jahre: <strong>{nf(ex.total)} €</strong></p> : ex.total > 0 ? <ExampleAmount amount={nf(ex.total)} period="Modelliertes Ergebnis über 25 Jahre" /> : <p>{nf(ex.total)} € Ergebnis über 25 Jahre</p>}
    </ExampleCard>)}</div>
    <Script src="/illustrations-motion/solar-illustrations.js" strategy="afterInteractive" />
    <Script src="/illustrations-neon/solar-neon.js" strategy="afterInteractive" />
  </>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {examples.map((ex) => (
        <div key={ex.kwp} style={{ background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: "16px 18px" }}>
          <div style={{ fontSize: v("--font-size-lead"), fontWeight: 800 }}>{ex.kwp} kWp</div>
          <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginBottom: 12 }}>
            {ex.spKwh > 0 ? `mit ${ex.spKwh} kWh Speicher` : "ohne Speicher"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: v("--font-size-small") }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: v("--color-text-secondary") }}>Investition</span>
              <span style={{ fontFamily: v("--font-mono") }}>{nf(ex.brutto)} €</span>
            </div>
            {ex.foerderung > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: v("--color-text-secondary") }}>Förderung</span>
                <span style={{ fontFamily: v("--font-mono"), color: v("--color-positive-text"), fontWeight: 700 }}>− {nf(ex.foerderung)} €</span>
              </div>
            )}
            {ex.foerderung > 0 && <p>Verbleibende Investition: {nf(ex.netto)} €<br />
              Ohne Zuschuss: {ex.withoutFunding.amort !== null ? `${ex.withoutFunding.amort} Jahre` : "über 25 Jahre"} Amortisation; {nf(ex.withoutFunding.total)} € Gewinn über 25 Jahre.
            </p>}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${v("--color-border")}`, paddingTop: 6 }}>
              <span style={{ color: v("--color-text-secondary") }}>Amortisation</span>
              <span style={{ fontFamily: v("--font-mono"), fontWeight: 700 }}>{ex.amort !== null ? `${ex.amort} Jahre` : "> 25 J."}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: v("--color-text-secondary") }}>Gewinn 25 J.</span>
              <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: ex.total > 0 ? v("--color-positive-text") : v("--color-negative-text") }}>{ex.total > 0 ? "+" : ""}{nf(ex.total)} €</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** "Bedingungen" heading + bullet list. Renders nothing when empty. */
export function FundingConditions({
  conditions,
  eligibility,
  technik,
  zeigeErste,
  label = "Bedingungen",
}: {
  conditions: FundingCondition[];
  label?: string;
  /** Wer antragsberechtigt ist — wird als ERSTE Bedingung in die Liste
   *  gesetzt, nicht als Abzeichen darüber. „Privat" und „Gewerblich" sind
   *  Bedingungen wie jede andere auch: Sie sagen, wer in Frage kommt. Als
   *  Pillen über der Liste standen sie als Etikett da, das zu nichts gehörte. */
  eligibility?: FundingProgram["eligibility"];
  /** Nur die Bedingungen dieser Technik zeigen — ohne Angabe alle. */
  technik?: FundingTechnik;
  /**
   * So viele Bedingungen offen zeigen, den Rest hinter einem Knopf.
   *
   * Ohne Angabe stehen alle da — der Fall der Übersicht und des Ergebnis-
   * Fensters, wo die Liste ohnehin kurz ist. Auf der Stadtseite stehen
   * Bedingungen und Konditionen NEBENEINANDER und werden im Raster gleich hoch:
   * Neun Bedingungen neben drei Konditionen ziehen die ganze Karte auf die
   * dreifache Höhe, und rechts steht Weißraum.
   *
   * ALLE BLEIBEN IM HTML, auch die eingeklappten — das ist der Unterschied
   * zwischen Kürzen und Verstecken. Wer ohne JavaScript liest oder die Seite
   * druckt, bekommt die vollständige Liste; nur die Darstellung klappt sie zu.
   */
  zeigeErste?: number;
}) {
  const wer =
    eligibility && eligibility.length > 0
      ? eligibility.length === 2
        ? "Für Privatpersonen und Gewerbe"
        : eligibility[0] === "privat"
          ? "Nur für Privatpersonen"
          : "Nur für Gewerbe"
      : null;
  const texte = bedingungenFuer(conditions, technik);
  const alle = wer ? [wer, ...texte] : texte;
  if (alle.length === 0) return null;
  const kuerzbar = typeof zeigeErste === "number" && alle.length > zeigeErste + 1;
  // EIN Block, kein Fragment: Als Fragment waren Überschrift und Liste zwei
  // Geschwister — in einem Raster landeten sie in zwei verschiedenen Spalten,
  // die Überschrift links und die Bedingungen rechts daneben.
  return (
    <div>
      {label && <div style={{ fontSize: "var(--font-size-caption)", fontWeight: 700, color: v("--color-text-secondary"), marginBottom: 12 }}>{label}</div>}
      {/* Die Kürzung läuft über CSS, nicht über eine kürzere Liste: Ein
          `<details>` hält den ganzen Inhalt im HTML, auch zugeklappt. Wer die
          Seite ohne JavaScript liest, druckt oder durchsucht, findet alles —
          nur zusammengeklappt. Eine im JavaScript abgeschnittene Liste wäre
          dagegen für Suchmaschinen und Vorlesegeräte schlicht weg. */}
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: "var(--font-size-body)", lineHeight: 1.6, color: v("--color-text-secondary") }}>
        {(kuerzbar ? alle.slice(0, zeigeErste) : alle).map((c) => <li key={c} style={{ marginBottom: 4 }}>{c}</li>)}
      </ul>
      {kuerzbar && (
        <details style={{ marginTop: 6 }}>
          <summary
            style={{
              cursor: "pointer",
              listStyle: "none",
              fontSize: "var(--font-size-caption)",
              fontWeight: 700,
              color: v("--color-accent"),
              padding: "4px 0",
            }}
          >
            {/* Die Zahl gehört in den Knopf: „mehr anzeigen" verschweigt, ob
                noch eine Zeile kommt oder sieben. */}
            {alle.length - zeigeErste!} weitere Bedingungen anzeigen
          </summary>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20, fontSize: "var(--font-size-body)", lineHeight: 1.6, color: v("--color-text-secondary") }}>
            {alle.slice(zeigeErste).map((c) => <li key={c} style={{ marginBottom: 4 }}>{c}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * Der Gesamt-Höchstbetrag beschreibt in aller Regel die Dachanlage.
 *
 * Bei Nidda stand er als „1.500 € (Dachanlage + Speicher)" auch unter dem
 * Balkonkraftwerk und behauptete dort einen Deckel, der siebeneinhalbmal über
 * dem echten liegt (200 €). Ein Betrag am falschen Ort ist schlimmer als keiner:
 * Er sieht aus wie eine Auskunft.
 *
 * Ungefiltert wird er weiter gezeigt — dort steht er neben allen Sätzen und ist
 * durch seinen eigenen Zusatz („Dachanlage + Speicher") eindeutig.
 *
 * Hier und nicht im Aufrufer, weil zwei Oberflächen dieselbe Frage stellen: die
 * Stadtseite über ihren Technik-Filter und das Detail-Fenster im Rechner. Zwei
 * Fassungen dieser Regel liefen binnen einer Woche auseinander.
 */
export function istDachSicht(technik: FundingTechnik | undefined): boolean {
  return technik === undefined || technik === "pv" || technik === "waermepumpe";
}
