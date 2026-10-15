import { fundingZaehlt, foerdertTechnik, saetzeFuer, type FundingProgram } from "./funding-programs";

/** One programme ceiling, never the sum of mutually exclusive grants. */
export function fundingPromotion(program: FundingProgram | undefined, today?: string) {
  if (!program || !foerdertTechnik(program, "pv") || !fundingZaehlt(program, today)) return null;
  const rates = saetzeFuer(program.rates, "pv");
  if (rates.some(rate => /Darlehen|Kredit/i.test(`${rate.label} ${rate.value}`))) return null;
  const ceilings = rates.flatMap(rate => {
    const match = rate.value.match(/max\.\s*([\d.]+(?:,\d+)?)\s*€/i);
    return match ? [Number(match[1].replaceAll(".", "").replace(",", "."))] : [];
  }).filter(value => Number.isFinite(value) && value > 0);
  if (!ceilings.length) return null;
  const maximum = Math.max(...ceilings);
  return { maximum, text: `Bis zu ${maximum.toLocaleString("de-DE")} € Förderung` };
}

/** Shared wording for the page heading and its social preview. */
export function fundingPromotionTitle(city: string, program: FundingProgram | undefined, today?: string) {
  const promotion = fundingPromotion(program, today);
  return `${promotion ? `Bis zu ${promotion.maximum.toLocaleString("de-DE")} € ` : ""}Photovoltaik-Förderung in ${city}`;
}
