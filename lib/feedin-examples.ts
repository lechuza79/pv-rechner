import { calcEigenverbrauchExakt, calcWeightedFeedIn } from "./calc";
import { NATIONAL_AVG_YIELD, PERSONEN } from "./constants";
import { feedInRatesFor, feedInRatesForCommissioning } from "./feedin-config";

export const FEEDIN_EXAMPLE_HOUSEHOLD = PERSONEN[2].verbrauch;
export function feedinExamples(dateIso: string, electricityPrice: number) {
  const rates = feedInRatesForCommissioning(dateIso) ?? feedInRatesFor(dateIso);
  return [5, 10, 15].map(kwp => {
    const selfUsePercent = calcEigenverbrauchExakt({ personenIdx: 2, nutzungIdx: 1,
      speicherKwh: 0, wp: "nein", ea: "nein", eaKm: 15000, kwp,
      ertragKwp: NATIONAL_AVG_YIELD });
    const generation = kwp * NATIONAL_AVG_YIELD;
    const rate = calcWeightedFeedIn(kwp, rates.teilUnder10, rates.teilOver10, rates.thresholdKwp);
    const selfUse = generation * selfUsePercent / 100;
    return { kwp, generation, rate, selfUsePercent, selfUse,
      feedIn: (generation - selfUse) * rate / 100,
      saving: selfUse * electricityPrice };
  });
}
