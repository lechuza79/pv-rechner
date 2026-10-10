import {verlaufJahre} from '../app/(site)/einspeiseverguetung-tabelle/VerlaufsChart';
import {FEEDIN_HISTORY_META} from './feedin-history';
import countryMix from '../data/country-electricity-mix-race.json';
import countryPerCapita from '../data/country-electricity-per-capita-race.json';
import worldElectricity from '../data/world-electricity-race.json';
import {ZUBAU_BY_COUNTRY, YEARS_ZUBAU, COUNTRY_COMPARE_META} from './country-comparison';

/** One published payload for the existing historical observations. No renderers. */
export function getWidgetReferenceData(now = new Date()) {
  return {
  version: 1,
  feedIn: {years: verlaufJahre(now), source: FEEDIN_HISTORY_META},
  countryMix,
  countryPerCapita,
  worldElectricity,
  capacity: {countries: ZUBAU_BY_COUNTRY, years: YEARS_ZUBAU, source: COUNTRY_COMPARE_META},
  };
}
export type WidgetReferenceData = ReturnType<typeof getWidgetReferenceData>;
