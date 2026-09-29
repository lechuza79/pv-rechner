import { describe, expect, it } from 'vitest';
import { calculatePvConsumerBenefit, consumerChangeLabel, consumerPatch, type PvConsumerBasis } from '../pv-consumer-model';
import { feedInRatesFor } from '../feedin-config';
import { PERSONEN } from '../constants';
import type { PvConsumerValues } from '../../components/PvConsumerFields';

const values: PvConsumerValues = {
  nutzung: 1, wp: 'nein', ea: 'nein', eaKm: 15000, klima: 'nein', klimaRooms: 2, klimaKwh: null,
  wpHaustyp: 0, wpWohnflaeche: 140, wpInsulation: 1, wpHeizsystem: 'hk_neu',
};
const basis: PvConsumerBasis = {
  personen: 2, baseKwh: PERSONEN[2].verbrauch, kwp: 10, storageKwh: 0,
  yieldPerKwp: 1000, monthly: null, electricityPrice: 0.312,
  cost: 14160, replacementCost: 0, scenario: 'realistic',
  feedInMode: 'teil', feedInRate: null, feedInRates: feedInRatesFor('2026-09-01'),
  regime: 'heute', marketRevenue: true, marketValue: 5, coolingDegreeDays: 500,
};

describe('shared consumer calculation', () => {
  it.each(['wp', 'ea', 'klima'] as const)('%s retains its benefit after remove and restore', kind => {
    const selected = { ...values, [kind]: 'geplant' };
    const selectedTotal = calculatePvConsumerBenefit(basis, selected);
    const removed = { ...selected, [kind]: 'nein' };
    const removedTotal = calculatePvConsumerBenefit(basis, removed);
    expect(selectedTotal - removedTotal).toBeGreaterThan(0);
    const restored = { ...removed, ...consumerPatch(kind, selected) };
    expect(calculatePvConsumerBenefit(basis, restored)).toBe(selectedTotal);
  });

  it('recalculates shared solar availability instead of adding independent savings', () => {
    const total = (patch: Partial<PvConsumerValues>) => calculatePvConsumerBenefit(basis, { ...values, ...patch });
    const baseline = total({});
    const combined = total({ wp: 'geplant', ea: 'geplant', klima: 'geplant' }) - baseline;
    const independent = total({ wp: 'geplant' }) + total({ ea: 'geplant' }) + total({ klima: 'geplant' }) - 3 * baseline;
    expect(combined).toBeGreaterThan(0);
    expect(combined).toBeLessThan(independent);
  });

  it.each(['heute', 'reform2027'] as const)('uses partial export when adding an EV to full export under %s', regime => {
    const withCar = { ...values, ea: 'geplant' };
    expect(calculatePvConsumerBenefit({ ...basis, regime, feedInMode: 'voll' }, withCar))
      .toBe(calculatePvConsumerBenefit({ ...basis, regime, feedInMode: 'teil' }, withCar));
  });

  it('describes both adding and removing without calling the net change an addition', () => {
    expect(consumerChangeLabel({ wp: { wp: 'nein' }, ea: { ea: 'geplant' } }, { ...values, ea: 'geplant' }))
      .toBe('durch Elektroauto sowie den Wegfall von Wärmepumpe');
    expect(consumerChangeLabel({ ea: { ea: 'geplant' } }, { ...values, ea: 'geplant' }))
      .toBe('zusätzlich durch Elektroauto');
  });
});
