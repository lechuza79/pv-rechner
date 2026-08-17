import { v } from "../lib/theme";
import type { FundingProgram, FundingStatus } from "../lib/funding-programs";
import type { FundingExample } from "../lib/funding-examples";

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

// Shared, data-bound building blocks for rendering a funding program. Used by
// the overview, the Bundesland page, the city page and the result modal so the
// program-data markup (status, rates, conditions) lives in ONE place — change
// it here, not in four files. Page-specific framing (CTAs, eligibility badges,
// combinable links, containers) stays in each caller.

export const FUNDING_STATUS_LABEL: Record<FundingStatus, string> = {
  aktiv: "aktiv", ausgeschoepft: "ausgeschöpft", pausiert: "pausiert", eingestellt: "eingestellt", unsicher: "Status unklar",
};

/** Short status phrase for inline prose on city/archive pages — reads naturally
 *  after "… ist {phrase}" / "… — {phrase}". Keeps the wording in one place so
 *  the city page, the example note and any future caller stay consistent. */
export const FUNDING_STATUS_NOTE: Record<FundingStatus, string> = {
  aktiv: "nimmt aktuell Anträge an",
  ausgeschoepft: "aktuell ausgeschöpft (Fördertopf leer)",
  pausiert: "aktuell pausiert (keine neuen Anträge)",
  eingestellt: "eingestellt (wird nicht mehr angeboten)",
  unsicher: "Status unklar",
};

export function fundingStatusColor(status: FundingStatus): string {
  // Text + border of the status badge on a white card — use the AA-contrast green
  // text token (not the bright brand green, which fails contrast as text).
  return status === "aktiv" ? v("--color-positive") : v("--color-text-muted");
}

export function FundingStatusBadge({ status }: { status: FundingStatus }) {
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

/** The "label … value" rate rows. `bordered` adds the divider used in detail
 *  views (modal, city page); list views (overview, Bundesland) leave it off. */
export function FundingRates({
  rates,
  bordered = false,
  columns = 1,
  label,
}: {
  rates: FundingProgram["rates"];
  bordered?: boolean;
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
      {label && (
        <div style={{ fontSize: "var(--font-size-caption)", fontWeight: 700, color: v("--color-text-secondary"), marginBottom: 12 }}>{label}</div>
      )}
    <div
      style={
        columns === 2
          ? { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: bordered ? 14 : 8, columnGap: 20 }
          : { display: "flex", flexDirection: "column", gap: bordered ? 14 : 8 }
      }
    >
      {rates.map((r) => {
        // Wert und Zusatz trennen: „20 % (30 % als Solar-Gründach)" ist ein
        // Betrag mit einer Bedingung daran. Zusammen in einer Zeile wuchs der
        // Zusatz dem Wert davon und brach über zwei Zeilen um. Wie bei den
        // Kacheln im Atlas: Der Wert trägt die Zeile, das Beiwerk steht kleiner
        // und ruhiger darunter.
        const auf = r.value.indexOf(" (");
        const wert = auf > 0 ? r.value.slice(0, auf) : r.value;
        const zusatz = auf > 0 ? r.value.slice(auf + 2).replace(/\)$/, "") : null;
        return (
          <div
            key={r.label}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16,
              fontSize: "var(--font-size-body)",
              ...(bordered ? { borderBottom: `1px solid ${v("--color-border")}`, paddingBottom: 14 } : {}),
            }}
          >
            <span style={{ color: v("--color-text-secondary") }}>{r.label}</span>
            <span style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={{ display: "block", fontFamily: v("--font-mono"), fontWeight: 700, whiteSpace: "nowrap" }}>{wert}</span>
              {zusatz && (
                <span style={{ display: "block", fontSize: "var(--font-size-caption)", color: v("--color-text-muted"), fontWeight: 400, marginTop: 2 }}>
                  {zusatz}
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
export function ExampleCards({ examples }: { examples: FundingExample[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {examples.map((ex) => (
        <div key={ex.kwp} style={{ background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: "16px 18px" }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{ex.kwp} kWp</div>
          <div style={{ fontSize: 12, color: v("--color-text-muted"), marginBottom: 12 }}>
            {ex.spKwh > 0 ? `mit ${ex.spKwh} kWh Speicher` : "ohne Speicher"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: v("--color-text-secondary") }}>Investition</span>
              <span style={{ fontFamily: v("--font-mono") }}>{nf(ex.brutto)} €</span>
            </div>
            {ex.foerderung > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: v("--color-text-secondary") }}>Förderung</span>
                <span style={{ fontFamily: v("--font-mono"), color: v("--color-positive"), fontWeight: 700 }}>− {nf(ex.foerderung)} €</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${v("--color-border")}`, paddingTop: 6 }}>
              <span style={{ color: v("--color-text-secondary") }}>Amortisation</span>
              <span style={{ fontFamily: v("--font-mono"), fontWeight: 700 }}>{ex.amort !== null ? `${ex.amort} Jahre` : "> 25 J."}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: v("--color-text-secondary") }}>Rendite 25 J.</span>
              <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: ex.total > 0 ? v("--color-positive") : v("--color-negative") }}>{ex.total > 0 ? "+" : ""}{nf(ex.total)} €</span>
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
}: {
  conditions: string[];
  /** Wer antragsberechtigt ist — wird als ERSTE Bedingung in die Liste
   *  gesetzt, nicht als Abzeichen darüber. „Privat" und „Gewerblich" sind
   *  Bedingungen wie jede andere auch: Sie sagen, wer in Frage kommt. Als
   *  Pillen über der Liste standen sie als Etikett da, das zu nichts gehörte. */
  eligibility?: FundingProgram["eligibility"];
}) {
  const wer =
    eligibility && eligibility.length > 0
      ? eligibility.length === 2
        ? "Für Privatpersonen und Gewerbe"
        : eligibility[0] === "privat"
          ? "Nur für Privatpersonen"
          : "Nur für Gewerbe"
      : null;
  const alle = wer ? [wer, ...conditions] : conditions;
  if (alle.length === 0) return null;
  // EIN Block, kein Fragment: Als Fragment waren Überschrift und Liste zwei
  // Geschwister — in einem Raster landeten sie in zwei verschiedenen Spalten,
  // die Überschrift links und die Bedingungen rechts daneben.
  return (
    <div>
      <div style={{ fontSize: "var(--font-size-caption)", fontWeight: 700, color: v("--color-text-secondary"), marginBottom: 12 }}>Bedingungen</div>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: "var(--font-size-body)", lineHeight: 1.6, color: v("--color-text-secondary") }}>
        {alle.map((c) => <li key={c} style={{ marginBottom: 10 }}>{c}</li>)}
      </ul>
    </div>
  );
}
