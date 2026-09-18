import { calcCurrentPower } from "./simulation";
import { calcHourlyConsumption } from "./consumption";
import { calcHeatDemand, calcJAZ, flowTempForSystem, DEFAULT_WP_BUILDING } from "./heatpump-core";
import { PERSONEN, NUTZUNG, DEGRAD } from "./constants";
import { feedInArchivRates } from "./feedin-archiv";
import preise from "./solar-rueckblick-preise.json";

/**
 * Ten-year solar retrospective (2016–2025) for one reference household.
 *
 * WHAT IT IS: the energy-cost advantage the SAME household would have had
 * with a 10 kWp roof system, hour by hour, against the weather that actually
 * happened at a location. Once without and once with a heat pump — in both
 * cases the household is identical on both sides of the comparison; only the
 * PV system differs.
 *
 * WHAT IT IS NOT: an investment return. No purchase price, grant, finance,
 * maintenance or tax enter. It must never be labelled "Gewinn" (that word is
 * reserved for the 25-year figure of the calculator). It is also not measured
 * live output — the page keeps the two apart.
 *
 * Shared basis (CLAUDE.md, "Geteilte Rechen-Basis"): hourly load from
 * calcHourlyConsumption, PV output from calcCurrentPower, household size from
 * PERSONEN, daytime share from NUTZUNG, degradation DEGRAD, the reference
 * building DEFAULT_WP_BUILDING and the archived 2016 feed-in tariff. No
 * constant of its own except the ten-year window.
 *
 * Deliberate deviation: money comes from the hourly balance, not from the
 * calculator's HTW power law. The retrospective replays real weather hour by
 * hour; the power law has no weather input. Without a battery the hourly
 * balance is the direct quantity.
 *
 * Known approximation, stated on the page: a constant seasonal performance
 * factor (JAZ) for the heat pump instead of a temperature-dependent one.
 */

export const RUECKBLICK_VON = 2016;
export const RUECKBLICK_BIS = 2025;
const JAHRE = RUECKBLICK_BIS - RUECKBLICK_VON + 1;

/** One calendar year of hourly weather, index 0 = 1 Jan 00:00 UTC. */
export interface WetterJahr {
  jahr: number;
  /** Air temperature 2 m, °C. */
  temperaturC: number[];
  /** Irradiance on a south-facing 35° plane, W/m². */
  einstrahlungGeneigtWm2: number[];
}

export interface RueckblickJahr {
  jahr: number;
  /** € advantage of PV, household without heat pump. */
  vorteilOhneWp: number;
  /** € advantage of PV, same household with heat pump. */
  vorteilMitWp: number;
  erzeugungKwh: number;
  eigenverbrauchOhneWpKwh: number;
  eigenverbrauchMitWpKwh: number;
  netzbezugMitWpKwh: number;
  waermeKwh: number;
}

export interface Rueckblick {
  von: number;
  bis: number;
  vorteilOhneWp: number;
  vorteilMitWp: number;
  jahre: RueckblickJahr[];
  annahmen: {
    kwp: number;
    haushaltKwh: number;
    personen: string;
    wohnflaeche: number;
    jaz: number;
    einspeiseEuroKwh: number;
    waermeKwhJahr: number;
    neigung: number;
    ausrichtung: "Süd";
  };
  preisquelle: typeof preise;
}

function stundenImJahr(jahr: number): number {
  return (Date.UTC(jahr + 1, 0, 1) - Date.UTC(jahr, 0, 1)) / 3_600_000;
}

export function solarRueckblick(wetter: WetterJahr[], kwp = 10): Rueckblick {
  if (!Number.isFinite(kwp) || kwp < 0 || kwp > 10) throw new Error("Anlagengröße außerhalb des Modells");
  if (wetter.length !== JAHRE) throw new Error("Es braucht genau zehn Wetterjahre");

  const person = PERSONEN[2];
  const gebaeude = DEFAULT_WP_BUILDING;
  const waerme = calcHeatDemand(gebaeude.situation, gebaeude.wohnflaeche, gebaeude.insulationIdx, person.count);
  const jaz = calcJAZ(gebaeude.wpType, flowTempForSystem(gebaeude.heizsystem));
  const satz = feedInArchivRates("2016-01-01");
  if (!satz) throw new Error("Einspeisesatz 2016 fehlt");
  const einspeisung = satz.teilUnder10 / 100;
  const haushalt = { baseKwh: person.verbrauch, tagQuote: NUTZUNG[1].tagQuote, wpActive: false, eaActive: false };
  const strompreise = preise.series.electricity.values as Record<string, number>;

  let gradSumme = 0;
  let stundenGesamt = 0;
  const zeilen = wetter.map((w, index) => {
    const jahr = RUECKBLICK_VON + index;
    const n = stundenImJahr(jahr);
    if (w.jahr !== jahr) throw new Error(`Wetterjahr ${w.jahr} an Stelle von ${jahr}`);
    if (w.temperaturC.length !== n || w.einstrahlungGeneigtWm2.length !== n) throw new Error(`Wetterjahr ${jahr} unvollständig`);
    let lastSumme = 0;
    const stunden = w.temperaturC.map((temp, i) => {
      const strahlung = w.einstrahlungGeneigtWm2[i];
      if (typeof temp !== "number" || !Number.isFinite(temp) || typeof strahlung !== "number" || !Number.isFinite(strahlung) || strahlung < 0) {
        throw new Error(`Ungültiger Wetterwert ${jahr}, Stunde ${i}`);
      }
      const zeit = new Date(Date.UTC(jahr, 0, 1) + i * 3_600_000);
      const monat = zeit.getUTCMonth();
      const stunde = zeit.getUTCHours();
      const preis = strompreise[`${jahr}-S${monat < 6 ? 1 : 2}`];
      if (!(preis > 0)) throw new Error(`Strompreis ${jahr} fehlt`);
      // Heating degree hours (G20/15), used only to distribute annual heat.
      const grad = temp < 15 ? 20 - temp : 0;
      gradSumme += grad;
      stundenGesamt++;
      const last = calcHourlyConsumption(haushalt, stunde, monat) / 1000;
      lastSumme += last;
      const pv = (calcCurrentPower(kwp, strahlung, temp) / 1000) * Math.pow(1 - DEGRAD, index);
      return { last, pv, grad, preis };
    });
    return { jahr, stunden, lastSumme };
  });
  if (gradSumme <= 0) throw new Error("Heizwetter fehlt");

  const jahre: RueckblickJahr[] = zeilen.map(({ jahr, stunden, lastSumme }) => {
    const r: RueckblickJahr = {
      jahr, vorteilOhneWp: 0, vorteilMitWp: 0, erzeugungKwh: 0,
      eigenverbrauchOhneWpKwh: 0, eigenverbrauchMitWpKwh: 0, netzbezugMitWpKwh: 0, waermeKwh: 0,
    };
    for (const h of stunden) {
      const last = (h.last * person.verbrauch) / lastSumme;
      const bedarf = (waerme.qHeiz * JAHRE * h.grad) / gradSumme + (waerme.qWw * JAHRE) / stundenGesamt;
      const wp = bedarf / jaz;
      const selbstOhne = Math.min(h.pv, last);
      const selbstMit = Math.min(h.pv, last + wp);
      r.vorteilOhneWp += selbstOhne * h.preis + (h.pv - selbstOhne) * einspeisung;
      r.vorteilMitWp += selbstMit * h.preis + (h.pv - selbstMit) * einspeisung;
      r.erzeugungKwh += h.pv;
      r.eigenverbrauchOhneWpKwh += selbstOhne;
      r.eigenverbrauchMitWpKwh += selbstMit;
      r.netzbezugMitWpKwh += last + wp - selbstMit;
      r.waermeKwh += bedarf;
    }
    return r;
  });

  return {
    von: RUECKBLICK_VON,
    bis: RUECKBLICK_BIS,
    vorteilOhneWp: jahre.reduce((s, x) => s + x.vorteilOhneWp, 0),
    vorteilMitWp: jahre.reduce((s, x) => s + x.vorteilMitWp, 0),
    jahre,
    annahmen: {
      kwp,
      haushaltKwh: person.verbrauch,
      personen: person.label,
      wohnflaeche: gebaeude.wohnflaeche,
      jaz,
      einspeiseEuroKwh: einspeisung,
      waermeKwhJahr: waerme.qGes,
      neigung: 35,
      ausrichtung: "Süd",
    },
    preisquelle: preise,
  };
}
