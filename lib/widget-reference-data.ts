import countryMix from '../data/country-electricity-mix-race.json';
import countryPerCapita from '../data/country-electricity-per-capita-race.json';
import worldElectricity from '../data/world-electricity-race.json';
import {ZUBAU_BY_COUNTRY, YEARS_ZUBAU, COUNTRY_COMPARE_META} from './country-comparison';

/** One published payload for the existing historical observations. No renderers. */
export const widgetReferenceData = {
  version: 1,
  countryMix,
  countryPerCapita,
  worldElectricity,
  capacity: {countries: ZUBAU_BY_COUNTRY, years: YEARS_ZUBAU, source: COUNTRY_COMPARE_META},
};
export type WidgetReferenceData = typeof widgetReferenceData;
