import { DEFAULT_HEATPUMP_CONFIG } from "./heatpump-config";

const nf = (n: number) => n.toLocaleString("de-DE");
const STAFFEL = DEFAULT_HEATPUMP_CONFIG.begEinkommensStaffel;

/** Förderstufen teilen sich Widget und Wärmepumpen-Ergebnis. */
export const BEG_EINKOMMEN_OPTIONS: { key: string; label: string; sub: string; income?: number }[] = [
  ...STAFFEL.map((tier) => ({
    key: `t${tier.maxIncome}`,
    label: `bis ${nf(tier.maxIncome)} €`,
    sub: `Einkommens-Bonus +${Math.round(tier.rate * 100)} %`,
    income: tier.maxIncome,
  })),
  {
    key: `t${STAFFEL[STAFFEL.length - 1].maxIncome + DEFAULT_HEATPUMP_CONFIG.begFamilienzuschlag}`,
    label: `bis ${nf(STAFFEL[STAFFEL.length - 1].maxIncome + DEFAULT_HEATPUMP_CONFIG.begFamilienzuschlag)} €`,
    sub: "Einkommens-Bonus nur mit Familienzuschlag möglich",
    income: STAFFEL[STAFFEL.length - 1].maxIncome + DEFAULT_HEATPUMP_CONFIG.begFamilienzuschlag,
  },
  { key: "none", label: `über ${nf(STAFFEL[STAFFEL.length - 1].maxIncome + DEFAULT_HEATPUMP_CONFIG.begFamilienzuschlag)} €`, sub: "kein Einkommens-Bonus" },
] as const;

export const begIncomeFor = (key: string): number | undefined =>
  BEG_EINKOMMEN_OPTIONS.find((option) => option.key === key)?.income;

/** Unconfirmed personal details never add a bonus to the initial estimate. */
export function confirmedBegBonuses(confirmed: boolean, selfUsed: boolean, heatingEligible: boolean, ageUnknown: boolean, income: number | undefined, child: boolean) {
  return {
    klimaBonus: confirmed && selfUsed && heatingEligible && !ageUnknown,
    haushaltseinkommen: confirmed && selfUsed ? income : undefined,
    kindImHaushalt: confirmed && selfUsed && child,
  };
}
