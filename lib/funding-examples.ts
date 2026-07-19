import { calc, calcEigenverbrauch, estimateCost, calcWeightedFeedIn } from "./calc";
import { DEFAULT_FEED_IN } from "./feedin-config";
import { fundingAmount, type FundingProgram } from "./funding-programs";

// Shared example-calculation model for the funding landing pages. The city page
// and the Bundesland page both lead with three typical systems (5 / 10 / 15 kWp)
// so the visitor sees concrete economics before the program details. Keeping the
// math in one place means both pages rest on the same assumptions as the rechner
// (single source of truth: calc, calcEigenverbrauch, estimateCost).

export type FundingExample = {
  kwp: number;
  spKwh: number;
  brutto: number;
  foerderung: number;
  /** True if a concrete € amount could be derived; false for free-text-only programs. */
  foerderComputable: boolean;
  netto: number;
  amort: number | null;
  total: number;
};

const EXAMPLE_CONFIGS = [
  { kwp: 5, spKwh: 0 },
  { kwp: 10, spKwh: 5 },
  { kwp: 15, spKwh: 10 },
];

/**
 * Build the three example systems for a regional yield. Pass a funding program
 * to subtract its grant (city page); omit it for a yield-only view (Bundesland
 * page, where the grant varies by municipality).
 *
 * Static assumptions on purpose (Strompreis 0,34 €/kWh, DEFAULT_PRICES via
 * estimateCost): these pages are statically generated, so no live prices — the
 * numbers are illustrative and the CTA leads into the rechner with live values.
 */
export function buildFundingExamples(yieldKwhKwp: number, f?: FundingProgram): FundingExample[] {
  return EXAMPLE_CONFIGS.map(({ kwp, spKwh }) => {
    const ev = calcEigenverbrauch({
      personenIdx: 2, nutzungIdx: 1, speicherKwh: spKwh,
      wp: "nein", ea: "nein", eaKm: 15000, kwp, ertragKwp: yieldKwhKwp,
    });
    const brutto = estimateCost(kwp, spKwh);
    const einspeisung = calcWeightedFeedIn(kwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10);
    // Shared funding math (single source of truth, also used by the rechner).
    const fa = fundingAmount(f, kwp, spKwh, brutto);
    const foerderComputable = fa.computable;
    // Only subtract when the program currently accepts applications.
    const foerderung = fa.active ? fa.total : 0;
    const netto = Math.max(0, brutto - foerderung);
    const result = calc({
      kwp, kosten: netto, strompreis: 0.34, eigenverbrauch: ev,
      einspeisung, stromSteigerung: 0.03, ertragKwp: yieldKwhKwp, monthly: null,
    });
    return { kwp, spKwh, brutto, foerderung, foerderComputable, netto, amort: result.be ? result.be.i : null, total: result.total };
  });
}
