// Partner reference price for the balcony calculator's start sets.
//
// The calculator starts with fixed set prices (DEFAULT_BALKON_CONFIG.sets).
// Until 15.10.2026 they were researched by hand once a quarter and a watcher
// could only propose a change above 30 % — so a real 30–40 % market drop sat
// in an e-mail instead of the calculator, while the partner catalogue right
// below the result already showed the lower prices.
//
// The rule here makes the start price derivable: for each set, the partner's
// deliverable variant WITH balcony mount and WITHOUT storage whose module power
// is closest to the set's, rounded to 10 €. It is taken over automatically only
// when an independent market range (researched by the watcher, see
// scripts/balkon-verify.md) contains it — two sources that agree replace the
// jump limit, one source alone never does. A partner price outside the market
// range stays a proposal: a sale or a catalogue error must not move every
// result.

import type { BalkonSet, BalkonSetId } from "./balkon-config";
import type { ShopAngebot } from "./shop-solakon";

/** Size class of an offer, by module power — the same cut the calculator uses
 *  when a visitor picks a partner set. */
export function setKlasse(moduleWp: number): BalkonSetId {
  return moduleWp <= 600 ? "single" : moduleWp <= 1200 ? "duo" : "max";
}

/** Mounting segment of a partner variant ("Balkon / ohne Speicher / 5m"). */
function halterung(variante: string): string {
  return variante.split("/")[0]?.trim().toLowerCase() ?? "";
}

export interface PartnerReferenz {
  setId: BalkonSetId;
  angebot: ShopAngebot;
  /** Partner price rounded to 10 € — the candidate start price. */
  preis: number;
}

export function partnerSetReferenz(
  angebote: ShopAngebot[],
  sets: BalkonSet[],
): Record<BalkonSetId, PartnerReferenz | null> {
  const passend = angebote.filter(a =>
    a.lieferbar && a.speicherKwh === 0 && halterung(a.variante) === "balkon" && a.preis > 0,
  );
  const result = { single: null, duo: null, max: null } as Record<BalkonSetId, PartnerReferenz | null>;
  for (const set of sets) {
    const kandidaten = passend
      .filter(a => setKlasse(a.moduleWp) === set.id)
      .sort((a, b) =>
        Math.abs(a.moduleWp - set.moduleWp) - Math.abs(b.moduleWp - set.moduleWp) || a.preis - b.preis,
      );
    const best = kandidaten[0];
    if (best) result[set.id] = { setId: set.id, angebot: best, preis: Math.round(best.preis / 10) * 10 };
  }
  return result;
}

export type AbgleichUrteil =
  /** Partner price inside the market range and different from the stored one → take it over. */
  | "uebernehmen"
  /** Partner price inside the market range and equal to the stored one. */
  | "bestaetigt"
  /** Partner price outside the market range → proposal, never automatic. */
  | "widerspruch"
  /** No partner set in this class → market research alone, normal gate rules. */
  | "ohne-partner";

export function marktAbgleich(
  hinterlegt: number,
  partner: PartnerReferenz | null,
  markt: { min: number; max: number } | null,
): { urteil: AbgleichUrteil; neu: number } {
  if (!partner) return { urteil: "ohne-partner", neu: hinterlegt };
  if (!markt || partner.preis < markt.min || partner.preis > markt.max) return { urteil: "widerspruch", neu: hinterlegt };
  return partner.preis === hinterlegt ? { urteil: "bestaetigt", neu: hinterlegt } : { urteil: "uebernehmen", neu: partner.preis };
}
