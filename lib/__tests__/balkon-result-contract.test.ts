import { describe, it, expect } from 'vitest';
import { heuteInBerlin } from '../zeit';
import { calcBalkon } from '../balkon';
import { balkonRace } from '../balkon-race';
import { DEFAULT_BALKON_CONFIG as CFG } from '../balkon-config';
import { balkonFunding } from '../balkon-funding';
import { angebotBegruendung, besteAngebote, bewerteAngebot, configFuerAngebot, empfiehlAngebot } from '../shop-angebot';
import { FUNDING_PROGRAMS } from '../funding-programs';
import { readBalkonHardware, writeBalkonHardware } from '../balkon-share';
import type { ShopAngebot } from '../shop-solakon';

const basis = { orientationId: 'sued_flach' as const, presenceId: 'teils' as const, haushaltKwh: 2800, specificYield: 950, stromPrice: .31, horizonYears: 10 as const };
const offer = (storage: number, price: number): ShopAngebot => ({ id: `offer-${storage}`, haendler: 'solakon', haendlerName: 'Solakon', produkt: 'onPower', moduleWp: 2000, inverterW: 800, speicherKwh: storage, preis: price, streichpreis: null, lieferbar: true, url: 'https://example.test/set', bildUrl: null, variante: 'Test' });
const today = heuteInBerlin();
// Use the real programme rules with a controlled fresh evidence date.
const funding = { programs: [{ ...FUNDING_PROGRAMS['landkreis-oldenburg-steckersolar'], lastVerified: today, pageSeenAt: today, changedSinceIso: undefined, endetIso: '2099-12-31' }], enabled: true };

describe('BKW result, funding, package and chart contract', () => {
  for (const horizonYears of [10, 20] as const) it(`same net investment and balance in ${horizonYears} years`, () => {
    const hardware = offer(6.33, 1800);
    const context = { ...basis, horizonYears, additionalCosts: 125 };
    const rated = bewerteAngebot(hardware, context, CFG, funding);
    const grant = balkonFunding(hardware, hardware.preis, funding);
    const main = calcBalkon({ ...context, setId: 'duo', storageId: 'small', invest: grant.investment }, configFuerAngebot(hardware));
    expect(main).toEqual(rated.ergebnis);
    expect(main.invest).toBe(1800 - rated.fundingEuro + 125);
    expect(rated.fundingEuro).toBe(250);
    expect(main.annualCosts.grid).toHaveLength(horizonYears);
    const chart = balkonRace(main, 2026);
    expect(chart.years).toBe(horizonYears);
    expect(chart.grid[chart.days] - chart.balcony[chart.days]).toBe(main.lifetimeSaving);
    const noBattery = calcBalkon({ ...context, setId: 'duo', storageId: 'none' }, configFuerAngebot(hardware));
    for (let y = CFG.storageLifeYears; y < horizonYears; y++) expect(main.annualCosts.balcony[y]).toBeCloseTo(noBattery.annualCosts.balcony[y], 7);
  });
  it('a storage-only grant can reverse the ranking and is never paid to the battery-free set', () => {
    const plain = offer(0, 400);
    const battery = offer(4.22, 1000);
    const zero = bewerteAngebot(battery, basis).ergebnis.lifetimeSaving - bewerteAngebot(plain, basis).ergebnis.lifetimeSaving;
    battery.preis += zero + 100; // Deliberately 100 euros worse before the grant.
    expect(besteAngebote([plain, battery], basis)[0].angebot.id).toBe(plain.id);
    const ranked = besteAngebote([plain, battery], basis, CFG, funding);
    expect(ranked[0].angebot.id).toBe(battery.id);
    expect(ranked.find(x => x.angebot.id === plain.id)!.fundingEuro).toBe(0);
    expect(besteAngebote([plain, battery], basis, CFG, { ...funding, enabled: false })[0].angebot.id).toBe(plain.id);
    expect(ranked[0].storageComparison?.additionalInvestment).toBeCloseTo(ranked[0].ergebnis.invest - ranked[1].ergebnis.invest);
  });
  it('does not deduct grants with expired evidence', () => {
    const stale = { ...funding, programs: funding.programs.map(p => ({ ...p, lastVerified: '2000-01-01', pageSeenAt: '2000-01-01' })) };
    expect(bewerteAngebot(offer(4.22, 1500), basis, CFG, stale).fundingEuro).toBe(0);
  });
  it('does not invent storage payback without a comparable package', () => {
    expect(besteAngebote([offer(6.33, 1500)], basis)[0].storageComparison).toBeNull();
  });
  it('retains a cheap battery-free alternative', () => {
    const packages = [offer(0, 400), offer(2.11, 600), offer(4.22, 700), offer(6.33, 800)];
    const recommended = empfiehlAngebot(packages, basis)!;
    expect([recommended.beste, ...recommended.alternativen].some(x => x.angebot.speicherKwh === 0)).toBe(true);
  });
  it('activates pre-inverter charging only for known shop hardware and preserves it in shares', () => {
    const a = offer(10.55, 2000);
    const dcConfig = configFuerAngebot(a);
    const legacyConfig = configFuerAngebot({ moduleWp: 2000, inverterW: 800, speicherKwh: 10.55, preis: 2000 });
    expect(dcConfig.storage[1].batteryCoupling).toBe('dc');
    expect(dcConfig.storage[1].usableBatteryKwh).toBeCloseTo(10.55 * .85);
    expect(legacyConfig.storage[1].batteryCoupling).toBeUndefined();
    const input = { ...basis, setId: 'duo' as const, storageId: 'small' as const };
    expect(calcBalkon(input, dcConfig).selfUsedKwh).toBeGreaterThan(calcBalkon(input, legacyConfig).selfUsedKwh);
  });
  it('extra costs count once and shade reduces generation before storage', () => {
    const a = offer(4.22, 1500);
    const base = bewerteAngebot(a, basis);
    const extra = bewerteAngebot(a, { ...basis, additionalCosts: 150 });
    expect(extra.ergebnis.lifetimeSaving).toBe(base.ergebnis.lifetimeSaving - 150);
    expect(extra.ergebnis.selfUsedKwh).toBe(base.ergebnis.selfUsedKwh);
    const dark = bewerteAngebot(a, { ...basis, shadingLossPercent: 100 });
    expect(dark.ergebnis.savingPerYear).toBe(0);
    expect(dark.ergebnis.lifetimeSaving).toBe(-1500);
  });
});

describe('shared package snapshot', () => {
  it('retains the actual large battery and entire package price', () => {
    const a = offer(10.55, 3129.99);
    const decoded = readBalkonHardware(new URLSearchParams(writeBalkonHardware(a)))!;
    expect(decoded).toEqual({ moduleWp: 2000, inverterW: 800, speicherKwh: 10.55, preis: 3129.99, batteryCoupling: "dc", haendler: "solakon" });
    expect(calcBalkon({ ...basis, setId: 'duo', storageId: 'small' }, configFuerAngebot(decoded))).toEqual(bewerteAngebot(a, basis).ergebnis);
  });
  for (const [key, value] of [['speicherKwh', 'NaN'], ['preis', '-100'], ['inverterW', '100000'], ['moduleWp', '']]) it(`rejects invalid ${key}`, () => {
    const query = new URLSearchParams(writeBalkonHardware(offer(4.22, 1500)));
    query.set(key, value);
    expect(readBalkonHardware(query)).toBeNull();
  });
});


describe('offer explanations stay within the comparison evidence', () => {
  const ranked = besteAngebote([offer(0, 400), offer(4.22, 1000)], basis);
  it('explains the actual winner and battery benefit within the partner selection', () => {
    const text = angebotBegruendung(ranked[0], ranked, 10)!;
    expect(text).toContain('lohnt sich der Speicher');
    expect(text).toContain('mehr, als er zusätzlich kostet');
    expect(text).toContain('4 Modulen');
    expect(text).not.toContain('kWp');
    expect(text).not.toContain('kWh');
  });
  it('only explains a size advantage when different sizes were actually compared', () => {
    const compared = besteAngebote([offer(0, 400), { ...offer(0, 250), id: 'small-panels', moduleWp: 1000 }], basis);
    expect(angebotBegruendung(compared[0], compared, 10)).toContain('unter den verglichenen Größen');
    expect(angebotBegruendung(ranked[0], ranked, 10)).not.toContain('unter den verglichenen Größen');
  });
  it('does not call a manual selection or custom price the winner', () => {
    expect(angebotBegruendung(ranked[1], ranked, 10)).not.toContain('am meisten');
    expect(angebotBegruendung(ranked[0], ranked, 10, true)).toContain('deinem eigenen Preis');
    expect(angebotBegruendung(ranked[0], ranked, 10, true)).not.toContain('am meisten');
  });
  it('does not imply a comparison with only one offer or promise savings on a loss', () => {
    expect(angebotBegruendung(ranked[0], [ranked[0]], 10)).toContain('fehlen weitere');
    const losing = ranked.map(entry => ({ ...entry, ergebnis: { ...entry.ergebnis, lifetimeSaving: -100 } }));
    expect(angebotBegruendung(losing[0], losing, 10)).toContain('kein berechneter Vorteil');
  });
});
