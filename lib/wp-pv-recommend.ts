import { recommend, type RecommendInput } from "./recommend";
import { dachErtragKwp } from "./dach-ertrag";
import { NATIONAL_AVG_YIELD } from "./constants";
import type { TiltOrientation } from "./tilt-config";

export type WpPvContext = { personen: number; haustyp: number; wohnflaeche: number; annualKwh: number };
export function wpPvRecommendation(context: WpPvContext, options: { dachart?: number; ausrichtung?: TiltOrientation | null; neigung?: number | null; nutzung?: number; roofM2?: number; ea?: boolean; klima?: boolean } = {}) {
  // Match the known building category to the PV model's roof-area reference.
  const haustyp = context.haustyp === 1 ? 1 : context.haustyp >= 2 ? 0 : context.wohnflaeche > 180 ? 3 : 2;
  const input: RecommendInput = {
    personen: context.personen, haustyp, wp: "ja", wpAnnualKwh: context.annualKwh,
    wpWohnflaeche: context.wohnflaeche, wpHaustyp: context.haustyp,
    dachart: options.dachart ?? 0, nutzung: options.nutzung ?? 1,
    ea: options.ea ? "ja" : "nein", eaKm: 15000, klima: options.klima ? "ja" : "nein",
    customRoofM2: options.roofM2, budgetLimit: null,
    ertragKwp: dachErtragKwp(NATIONAL_AVG_YIELD, options.dachart ?? 0, options.ausrichtung ?? null, options.neigung ?? null),
  };
  return recommend(input);
}
