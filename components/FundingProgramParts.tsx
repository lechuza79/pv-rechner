import { v } from "../lib/theme";
import type { FundingProgram, FundingStatus } from "../lib/funding-programs";

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
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: c, border: `1px solid ${c}`, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>
      {FUNDING_STATUS_LABEL[status]}
    </span>
  );
}

/** The "label … value" rate rows. `bordered` adds the divider used in detail
 *  views (modal, city page); list views (overview, Bundesland) leave it off. */
export function FundingRates({ rates, bordered = false }: { rates: FundingProgram["rates"]; bordered?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: bordered ? 8 : 4 }}>
      {rates.map((r) => (
        <div
          key={r.label}
          style={{
            display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13,
            ...(bordered ? { borderBottom: `1px solid ${v("--color-border")}`, paddingBottom: 8 } : {}),
          }}
        >
          <span style={{ color: v("--color-text-secondary") }}>{r.label}</span>
          <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, textAlign: "right" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** "Bedingungen" heading + bullet list. Renders nothing when empty. */
export function FundingConditions({ conditions }: { conditions: string[] }) {
  if (conditions.length === 0) return null;
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, color: v("--color-text-secondary"), marginBottom: 6 }}>Bedingungen</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: v("--color-text-secondary") }}>
        {conditions.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </>
  );
}
