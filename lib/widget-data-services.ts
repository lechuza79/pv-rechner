/** Public read services used by widget families, not by individual variants. */
export const WIDGET_DATA_SERVICES: Record<string, readonly string[]> = {
  '/api/energy/generation': ['country', 'hours', 'start', 'end', 'trim'],
  '/api/energy/nuclear-import': ['hours', 'start', 'end'],
  '/api/strommix-regional': [],
  '/api/energy/physical-flows': [],
  '/api/energy/import-mix': [],
  '/api/energy/trade': ['period', 'year', 'month'],
  '/api/gemeinde/solartag': ['ags', 'plz'],
  '/api/landkreis/solartag': ['ags'],
  '/api/region/solartag': ['ags'],
  '/api/weather': ['lat', 'lon'],
  '/api/pvgis': ['lat', 'lon', 'plzPrefix'],
  '/api/prices': [],
  '/api/feedin': [],
  '/api/mastr/summary': ['region', 'type', 'segment'],
  '/api/mastr/choropleth': ['parent', 'type', 'segment'],
  '/api/atlas/search': ['q', 'level'],
  '/api/widgets/reference-data': [],
  '/api/windraeder-vorschau/microcharts': ['gemeinde','kreis','tour','stop'],
  '/api/windraeder-vorschau/wind': ['gemeinde'],
};

export function liveWidgetDataUrl(endpoint: string): URL {
  const url = new URL(endpoint, 'https://solar-check.io');
  const parameters = WIDGET_DATA_SERVICES[url.pathname];
  if (url.origin !== 'https://solar-check.io' || url.username || url.password || !parameters || url.hash) {
    throw new Error('Unsupported preview data service');
  }
  for (const key of url.searchParams.keys()) {
    if (!parameters.includes(key) || url.searchParams.getAll(key).length !== 1) {
      throw new Error('Unsupported preview data parameter');
    }
  }
  url.searchParams.sort();
  return url;
}

/** Reject service failures before they can replace a good snapshot. */
export function validateLiveWidgetData(url: URL, value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || 'error' in value) {
    throw new Error('Invalid live data response');
  }
  const data = value as Record<string, unknown>;
  const rows = data.data as Record<string, unknown>[] | undefined;
  const invalid = () => { throw new Error('Invalid live data response'); };
  switch (url.pathname) {
    case '/api/energy/generation':
    case '/api/energy/nuclear-import': {
      const key = url.pathname.endsWith('/generation') ? 'solar' : 'nuclear_gw';
      if (!Array.isArray(rows) || !rows.length || rows.some(row => !row || typeof row.ts !== 'string' || !Number.isFinite(row[key]))) invalid();
      if (key === 'solar' && data.country !== (url.searchParams.get('country') ?? 'de')) invalid();
      break;
    }
    case '/api/energy/trade':
      if (!Array.isArray(data.days) || !data.days.length || typeof data.asOf !== 'string' || !data.totals) invalid();
      break;
    case '/api/gemeinde/solartag':
    case '/api/landkreis/solartag':
    case '/api/region/solartag':
      if (!Array.isArray(data.points) || !data.points.length) invalid();
      break;
    case '/api/weather':
      if (data.source === 'error' || !data.current || !data.hourly) invalid();
      break;
    case '/api/atlas/search':
      if (!Array.isArray(data.hits)) invalid();
      break;
    case '/api/widgets/reference-data': {
      const bundle = data as unknown as import('./widget-reference-data').WidgetReferenceData;
      if (bundle.version !== 1 || !bundle.capacity?.years?.length || !bundle.capacity.source?.dataAsOf
        || !bundle.worldElectricity?.rows?.length || !bundle.worldElectricity.retrieved) invalid();
      if (!bundle.feedIn?.years?.length || !bundle.feedIn.source?.source
        || bundle.feedIn.years.some(row => !Number.isFinite(row.year) || !row.bars.length
          || row.bars.some(value => value !== null && !Number.isFinite(value)))) invalid();
      for (const code of ['WELT', 'CHN', 'USA', 'FRA', 'IND', 'DEU']) {
        const country = bundle.capacity.countries?.find(row => row.code === code);
        if (!country || country.windsolar.length !== bundle.capacity.years.length
          || country.nuclear.length !== bundle.capacity.years.length
          || [...country.windsolar, ...country.nuclear].some(value => !Number.isFinite(value))) invalid();
      }
      for (const series of [bundle.countryMix, bundle.countryPerCapita]) {
        if (!series?.countries?.length || !series.history?.length) invalid();
        if (series.history.some(frame => !Number.isFinite(frame.year) || series.countries.some(country => {
          const row = frame.rows.find(row => row.id === country.id);
          return !row || !Number.isFinite(row.value) || !row.segments.length || row.segments.some(value => !Number.isFinite(value));
        }))) invalid();
      }
      if (bundle.worldElectricity.rows.some(row => ![row.year, row.wind, row.solar, row.nuclear].every(Number.isFinite))) invalid();
      break;
    }
    default:
      if (!Object.keys(data).length) invalid();
  }
  return data;
}
