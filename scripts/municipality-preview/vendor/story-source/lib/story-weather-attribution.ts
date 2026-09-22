import {DATA_SOURCES} from './data-sources';
/** Internal archive identifiers are provenance, never browser navigation links. */
export function storyWeatherAttribution(sourceUrl?:string){
 return sourceUrl?.startsWith('era5-archive:')
  ? {label:DATA_SOURCES.era5Archive.name,url:DATA_SOURCES.era5Archive.url}
  : {label:'Open-Meteo · ERA5',url:'https://open-meteo.com/en/docs/historical-weather-api'};
}
