'use client';
import { useMemo, useState } from 'react';
import PvConsumerSection from './PvConsumerSection';
import { requiredConsumerFields, type PvConsumerValues } from './PvConsumerFields';
import PvPlantFields, { type PvPlantValues } from './PvPlantFields';
import ResultSettings from './ResultSettings';
import { NATIONAL_AVG_YIELD, YEARS } from '../lib/constants';
import { DEFAULT_WP_BUILDING } from '../lib/heatpump';
import { DEFAULT_AIRCON_CONFIG } from '../lib/aircon-config';
import { estimateCost, batteryReplaceCost } from '../lib/calc';
import { usePrices } from '../lib/prices';
import { useFeedInRates } from '../lib/feedin';
import { consumerEnergy, type PvConsumerBasis } from '../lib/pv-consumer-model';
import { MARKTWERT_NIVEAU_CT } from '../lib/marktwert-config';
import { ERTRAG_OPTIMUM_MIN, ERTRAG_OPTIMUM_MAX } from '../lib/dach-ertrag';

const DEFAULT_CONSUMERS: PvConsumerValues = {
  nutzung: 1, wp: 'geplant', ea: 'nein', eaKm: 15000, klima: 'nein', klimaRooms: 2, klimaKwh: null,
  wpHaustyp: 0, wpWohnflaeche: DEFAULT_WP_BUILDING.wohnflaeche,
  wpInsulation: DEFAULT_WP_BUILDING.insulationIdx, wpHeizsystem: DEFAULT_WP_BUILDING.heizsystem,
};

/** A standalone article example; does not load the calculator, account or funding flow. */
export default function PvConsumerExample({ initialConsumers, initialSystem, heading }: {
  initialConsumers?: Partial<PvConsumerValues>;
  initialSystem?: Partial<Omit<PvPlantValues, 'ev'>>;
  heading?: string;
}) {
  const prices = usePrices();
  const feedInRates = useFeedInRates();
  const [values] = useState<PvConsumerValues>(() => ({ ...DEFAULT_CONSUMERS, ...initialConsumers }));
  const [system, setSystem] = useState(() => ({ kwp: 10, spKwh: 0, verbrauch: 3800, ertrag: NATIONAL_AVG_YIELD, ...initialSystem }));
  const [manualEv, setManualEv] = useState<number | null>(null);
  const basis: PvConsumerBasis = useMemo(() => ({
    personen: 2, baseKwh: system.verbrauch, kwp: system.kwp, storageKwh: system.spKwh,
    yieldPerKwp: system.ertrag, monthly: null, electricityPrice: system.strom ?? prices.electricityPrice,
    cost: system.invest ?? estimateCost(system.kwp, system.spKwh, prices),
    replacementCost: batteryReplaceCost(system.spKwh, prices), scenario: 'realistic',
    feedInMode: 'teil', feedInRate: null, feedInRates, regime: 'heute', marketRevenue: true,
    marketValue: MARKTWERT_NIVEAU_CT, coolingDegreeDays: DEFAULT_AIRCON_CONFIG.cdhNational,
  }), [system, prices, feedInRates]);
  const plant: PvPlantValues = { ...system, strom: basis.electricityPrice, invest: basis.cost, ev: manualEv ?? Math.round(consumerEnergy(basis, values).selfConsumption) };
  const answered = useMemo(() => new Set(requiredConsumerFields(values)), [values]);
  const continueInCalculator = (pending: PvConsumerValues) => {
    const params = new URLSearchParams({ direkt: '1', eingabe: '1', a: '4', ck: String(system.kwp), sk: String(system.spKwh),
      p: '2', n: String(pending.nutzung), vb: String(system.verbrauch), er: String(system.ertrag), st: String(basis.electricityPrice),
      k: String(basis.cost), wp: pending.wp, ea: pending.ea, km: String(pending.eaKm), kl: pending.klima,
      klr: String(pending.klimaRooms), wf: String(pending.wpWohnflaeche), wi: String(pending.wpInsulation),
      wh: pending.wpHeizsystem, wht: String(pending.wpHaustyp),
    });
    if (pending.klimaKwh !== null) params.set('klwh', String(pending.klimaKwh));
    // Editing a consumer retires an override, exactly as applying it in the calculator does.
    if (manualEv !== null && Object.keys(values).every(key => pending[key as keyof PvConsumerValues] === values[key as keyof PvConsumerValues])) params.set('ev', String(manualEv));
    window.location.assign(`/photovoltaik-rechner?${params}`);
  };
  return <PvConsumerSection variant="editorial" values={values} basis={basis} answered={answered} heading={heading}
    manualSelfConsumption={manualEv !== null} onContinue={continueInCalculator}
    note={<p>Die Beispielrechnung betrachtet {YEARS} Jahre. Sie setzt 20 Jahre feste Einspeisevergütung voraus; eine kürzere Restlaufzeit bei Altanlagen ist hier nicht abgebildet.</p>}
    settings={<ResultSettings embedded title="Deine Anlage & Rechengrundlagen"
      summary={`Rechengrundlage: ${system.kwp.toLocaleString('de-DE')} kWp · ${system.verbrauch.toLocaleString('de-DE')} kWh Haushaltsstrom/Jahr · ${system.spKwh.toLocaleString('de-DE')} kWh Speicher`}
      values={plant} onApply={next => {
        const hardwareChanged = next.kwp !== system.kwp || next.spKwh !== system.spKwh;
        setSystem({ ...next, invest: next.invest !== plant.invest ? next.invest : hardwareChanged ? undefined : system.invest });
        if (next.ev !== plant.ev) setManualEv(next.ev);
        else if (hardwareChanged || next.verbrauch !== plant.verbrauch) setManualEv(null);
      }}>
      {(draft, update) => <PvPlantFields values={draft} update={update} ertragMin={ERTRAG_OPTIMUM_MIN} ertragMax={ERTRAG_OPTIMUM_MAX} />}
    </ResultSettings>} />;
}
