import { HAUSTYP_WP, NUTZUNG, PERSONEN, SCENARIOS, YEAR } from './constants';
import { calc, calcEigenverbrauchExakt, calcWeightedFeedIn, vollEinspeisungGesperrt } from './calc';
import { calcEaAnnual, calcExtraConsumption, KLIMA_DEFAULT_M2, type HouseholdProfile } from './consumption';
import { calcWpAnnualElectricity } from './heatpump';
import { klimaSchnellschaetzungKwh } from './aircon';
import { simulateSolarYear, monthlyFromAnnual } from './balkon-sim';
import { BATTERY_ROUNDTRIP } from './pv-sim';
import { einspeiseVerlauf, einspeiseDeckelKw, profilFaktorAus, type EinspeiseRegime } from './einspeise-regime';
import { PREISFORM_MONAT_STUNDE } from './marktwert-config';
import type { FeedInRates } from './feedin-config';
import type { PvConsumerKind, PvConsumerValues } from '../components/PvConsumerFields';

export const PV_CONSUMERS = [
  { kind: 'wp', title: 'Wärmepumpe', illustration: '/shared-nav/illustrations/heatpump-modern-neon.webp' },
  { kind: 'ea', title: 'E-Auto', illustration: '/homepage-study/bev-v1/bev.webp' },
  { kind: 'klima', title: 'Klimaanlage', illustration: '/shared-nav/illustrations/aircon-neon.webp' },
] as const;

export type PvConsumerChanges = Partial<Record<PvConsumerKind, Partial<PvConsumerValues>>>;
export type PvFeedInMode = 'aus' | 'teil' | 'voll';
export interface PvConsumerBasis {
  personen: number;
  baseKwh: number;
  kwp: number;
  storageKwh: number;
  yieldPerKwp: number;
  monthly: number[] | null;
  electricityPrice: number;
  cost: number;
  replacementCost: number;
  scenario: string;
  feedInMode: PvFeedInMode;
  feedInRate: number | null;
  feedInRates: FeedInRates;
  regime: EinspeiseRegime;
  marketRevenue: boolean;
  marketValue: number;
  coolingDegreeDays: number;
}

/** One export profile for the main calculation and consumer previews. */
export function calculatePvMarketProfile(
  basis: Pick<PvConsumerBasis, 'kwp' | 'storageKwh' | 'monthly' | 'yieldPerKwp'>,
  mode: PvFeedInMode,
  profile: HouseholdProfile,
) {
  const monthly = basis.monthly ?? monthlyFromAnnual(basis.yieldPerKwp);
  const sum = monthly.reduce((a, b) => a + b, 0);
  const scaled = sum > 0 ? monthly.map(m => m * basis.yieldPerKwp / sum) : monthly;
  const inputs = {
    moduleKwp: basis.kwp, inverterKw: basis.kwp, monthlyYieldPerKwp: scaled,
    orientation: 'sued_flach',
    household: mode === 'voll' ? { ...profile, baseKwh: 0, wpActive: false, eaActive: false, klimaActive: false } : profile,
    batteryKwh: mode === 'voll' ? 0 : basis.storageKwh,
    roundtrip: BATTERY_ROUNDTRIP, priceShape: PREISFORM_MONAT_STUNDE,
  };
  const uncapped = simulateSolarYear(inputs);
  const capped = simulateSolarYear({ ...inputs, exportCapKw: einspeiseDeckelKw(basis.kwp, 'reform2027') });
  return {
    profilFaktor: profilFaktorAus(capped),
    einspeiseAnteil: uncapped.feedInKwh > 0 ? capped.feedInKwh / uncapped.feedInKwh : 1,
  };
}

export function consumerCoolingKwh(basis: PvConsumerBasis, values: PvConsumerValues) {
  return values.klimaKwh ?? klimaSchnellschaetzungKwh({ rooms: values.klimaRooms, cdh: basis.coolingDegreeDays, stromPrice: basis.electricityPrice });
}

/** Shared household energy inputs for the benefit and basis editor. */
export function consumerEnergy(basis: PvConsumerBasis, draft: PvConsumerValues) {
  const heat = draft.wp === 'nein' ? null : calcWpAnnualElectricity({ situation: 'bestand', wohnflaeche: draft.wpWohnflaeche, insulationIdx: draft.wpInsulation, personen: PERSONEN[basis.personen].count, heizsystem: draft.wpHeizsystem, wpType: 'lwwp', haustypFaktor: HAUSTYP_WP[draft.wpHaustyp].faktor });
  const cooling = draft.klima === 'nein' ? null : consumerCoolingKwh(basis, draft);
  const consumption = basis.baseKwh + calcExtraConsumption(draft.wp, draft.ea, draft.eaKm, draft.klima, KLIMA_DEFAULT_M2, cooling, heat);
  const ev = calcEigenverbrauchExakt({ personenIdx: basis.personen, nutzungIdx: draft.nutzung, speicherKwh: basis.storageKwh, wp: draft.wp, ea: draft.ea, eaKm: draft.eaKm, klima: draft.klima, klimaM2: KLIMA_DEFAULT_M2, klimaKwh: cooling, wpKwh: heat, kwp: basis.kwp, ertragKwp: basis.yieldPerKwp, baseKwh: basis.baseKwh });
  return { heat, cooling, consumption, selfConsumption: ev };
}

/** Same energy and cash-flow models as PVRechner; no UI or network dependencies. */
export function calculatePvConsumerBenefit(basis: PvConsumerBasis, draft: PvConsumerValues): number {
  const { heat, cooling, consumption, selfConsumption: ev } = consumerEnergy(basis, draft);
  const mode = vollEinspeisungGesperrt({ wp: draft.wp, ea: draft.ea, speicherKwh: basis.storageKwh }) && basis.feedInMode === 'voll' ? 'teil' : basis.feedInMode;
  const rates = basis.feedInRates;
  const rate = basis.feedInRate ?? (mode === 'voll' ? calcWeightedFeedIn(basis.kwp, rates.vollUnder10, rates.vollOver10, rates.thresholdKwp) : calcWeightedFeedIn(basis.kwp, rates.teilUnder10, rates.teilOver10, rates.thresholdKwp));
  const profile: HouseholdProfile = { baseKwh: basis.baseKwh, tagQuote: NUTZUNG[draft.nutzung].tagQuote, wpActive: draft.wp !== 'nein', eaActive: draft.ea !== 'nein', klimaActive: draft.klima !== 'nein', klimaM2: KLIMA_DEFAULT_M2, wpAnnualKwh: heat ?? undefined, eaAnnualKwh: draft.ea !== 'nein' ? calcEaAnnual(draft.eaKm) : undefined, klimaAnnualKwh: cooling ?? undefined };
  const market = basis.regime === 'heute' || mode === 'aus' ? null : calculatePvMarketProfile(basis, mode, profile);
  const years = market ? einspeiseVerlauf({ regime: basis.regime, kwp: basis.kwp, inbetriebnahmeJahr: Math.max(2027, YEAR), heuteSatzCt: rate, marktErloes: basis.marketRevenue, profilFaktor: market.profilFaktor, niveauCt: basis.marketValue }) : null;
  const scenario = SCENARIOS.find(item => item.id === basis.scenario) ?? SCENARIOS.find(item => item.id === 'realistic')!;
  return calc({ kwp: basis.kwp, kosten: basis.cost, strompreis: basis.electricityPrice, eigenverbrauch: mode === 'voll' ? 0 : Math.min(ev + scenario.evDelta, 95, consumption / (basis.kwp * basis.yieldPerKwp) * 100), einspeisung: mode === 'aus' ? 0 : rate, stromSteigerung: scenario.strom, ertragKwp: basis.yieldPerKwp, monthly: basis.monthly, batteryReplace: basis.replacementCost, einspeiseModell: market && years ? { satzCtImJahr: (i: number) => years[i - 1]?.satzCt ?? 0, fixkostenImJahr: (i: number) => years[i - 1]?.fixkosten ?? 0, einspeiseAnteil: market.einspeiseAnteil } : undefined }).total;
}

export function consumerPatch(kind: PvConsumerKind, draft: PvConsumerValues): Partial<PvConsumerValues> {
  if (kind === 'wp') return { wp: draft.wp, wpHaustyp: draft.wpHaustyp, wpWohnflaeche: draft.wpWohnflaeche, wpInsulation: draft.wpInsulation, wpHeizsystem: draft.wpHeizsystem };
  if (kind === 'ea') return { ea: draft.ea, eaKm: draft.eaKm };
  return { klima: draft.klima, klimaRooms: draft.klimaRooms, klimaKwh: draft.klimaKwh };
}

export function consumerChangeLabel(changes: PvConsumerChanges, pending: PvConsumerValues): string {
  const names = (removed: boolean) => new Intl.ListFormat('de-DE', { style: 'long', type: 'conjunction' }).format(
    PV_CONSUMERS.filter(item => changes[item.kind] && (pending[item.kind] === 'nein') === removed).map(item => item.kind === 'ea' ? 'Elektroauto' : item.title),
  );
  const added = names(false), removed = names(true);
  return removed ? added ? `durch ${added} sowie den Wegfall von ${removed}` : `durch den Wegfall von ${removed}` : `zusätzlich durch ${added}`;
}
