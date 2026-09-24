/**
 * Live weather at a place: the DWD ICON-D2 model for the sky, DWD radar for
 * precipitation.
 *
 * Each element comes from the best source that exists for it right now. The
 * model gives clouds, temperature and wind for this moment and this spot; the
 * radar MEASURES precipitation every five minutes at one kilometre, and it wins
 * wherever it saw the place. Rain is the most visible and the most local part
 * of the scene, and the one a forecast gets wrong most often at a given spot.
 *
 * Pure: every input is handed in, nothing is fetched here.
 */
import type { ModelWeather } from './icon-d2';

export type Condition = 'clear' | 'partly' | 'cloudy' | 'overcast' | 'fog' | 'rain' | 'sleet' | 'snow' | 'thunder';
export type PrecipitationKind = 'none' | 'rain' | 'sleet' | 'snow';

export type WeatherNow = {
  time: string;
  condition: Condition;
  /** WMO interpretation code, consistent with `condition`. */
  weatherCode: number | null;
  cloudCover: number | null;
  cloudCoverLow: number | null;
  cloudCoverMid: number | null;
  cloudCoverHigh: number | null;
  temperature: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  /** mm per hour. */
  precipitationRate: number | null;
  precipitationKind: PrecipitationKind;
  shortwaveRadiation: number | null;
  sources: {
    sky: { kind: 'model'; model: 'DWD ICON-D2'; runInit: string; validAt: string } | null;
    precipitation: { kind: 'radar'; product: 'RADOLAN RY'; measuredAt: string } | { kind: 'model' } | null;
  };
  /** What was changed against the raw model, so nothing is adjusted silently. */
  corrections: string[];
};

/** Below this the radar reading is noise, not weather (mm/h). */
export const RAIN_THRESHOLD = 0.1;
/** A radar image older than this no longer describes "now". */
export const RADAR_MAX_AGE_MINUTES = 20;
/** Cloud cover implied by measured precipitation. */
const RAINING_CLOUD_COVER = 80;

const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const FREEZING_CODES = new Set([56, 57, 66, 67]);
const THUNDER_CODES = new Set([95, 96, 99]);
const FOG_CODES = new Set([45, 48]);

/**
 * Rain or snow for measured precipitation. The radar sees water, not its
 * phase: the model's own category decides when it has one, otherwise the
 * temperature — at or below 0 °C snow, from 2 °C rain, between the two sleet.
 */
export function precipitationKind(model: ModelWeather | null): Exclude<PrecipitationKind, 'none'> {
  const code = model?.weatherCode ?? null;
  if (code !== null && SNOW_CODES.has(code)) return 'snow';
  if (code !== null && FREEZING_CODES.has(code)) return 'sleet';
  const temperature = model?.temperature ?? null;
  if (temperature === null) return 'rain';
  if (temperature <= 0) return 'snow';
  if (temperature < 2) return 'sleet';
  return 'rain';
}

/** WMO code for measured precipitation, by kind and intensity (AMS thresholds 2.5/7.6 mm/h). */
function precipitationCode(kind: Exclude<PrecipitationKind, 'none'>, rate: number) {
  const step = rate < 2.5 ? 0 : rate < 7.6 ? 1 : 2;
  if (kind === 'snow') return [71, 73, 75][step];
  if (kind === 'sleet') return [66, 67, 67][step];
  return [61, 63, 65][step];
}

function skyCondition(cloudCover: number | null, code: number | null): Condition {
  if (code !== null && FOG_CODES.has(code)) return 'fog';
  if (cloudCover === null) return 'cloudy';
  if (cloudCover < 20) return 'clear';
  if (cloudCover < 60) return 'partly';
  if (cloudCover < 90) return 'cloudy';
  return 'overcast';
}

export function combineWeather(input: {
  now: Date;
  model: ModelWeather | null;
  /** Radar amount converted to mm/h; null where the radar did not see the place. */
  radarRate: number | null;
  radarMeasuredAt: Date | null;
}): WeatherNow {
  const { now, model, radarRate, radarMeasuredAt } = input;
  const corrections: string[] = [];
  const radarFresh =
    radarRate !== null && radarMeasuredAt !== null && (now.getTime() - radarMeasuredAt.getTime()) / 60000 <= RADAR_MAX_AGE_MINUTES;

  let rate: number | null;
  let precipitationSource: WeatherNow['sources']['precipitation'];
  if (radarFresh) {
    rate = radarRate;
    precipitationSource = { kind: 'radar', product: 'RADOLAN RY', measuredAt: radarMeasuredAt!.toISOString() };
  } else if (model?.precipitation !== null && model?.precipitation !== undefined) {
    rate = model.precipitation;
    precipitationSource = { kind: 'model' };
  } else {
    rate = null;
    precipitationSource = null;
  }
  const falling = rate !== null && rate >= RAIN_THRESHOLD;
  const kind: PrecipitationKind = falling ? precipitationKind(model) : 'none';

  let cloudCover = model?.cloudCover ?? null;
  if (falling && radarFresh && (cloudCover === null || cloudCover < RAINING_CLOUD_COVER)) {
    corrections.push(`Bewölkung auf mindestens ${RAINING_CLOUD_COVER} % gehoben: Radar misst Niederschlag`);
    cloudCover = RAINING_CLOUD_COVER;
  }

  let weatherCode = model?.weatherCode ?? null;
  const modelSaysThunder = weatherCode !== null && THUNDER_CODES.has(weatherCode);
  const modelSaysPrecipitation = weatherCode !== null && weatherCode >= 51;
  let condition: Condition;
  if (falling) {
    if (modelSaysThunder) {
      condition = 'thunder';
    } else {
      condition = kind === 'none' ? 'rain' : kind;
      const code = precipitationCode(kind as Exclude<PrecipitationKind, 'none'>, rate!);
      if (radarFresh && weatherCode !== code && !(modelSaysPrecipitation && sameFamily(weatherCode!, code))) {
        corrections.push('Wetterlage nach Radar: Niederschlag gemessen');
        weatherCode = code;
      }
    }
  } else {
    condition = skyCondition(cloudCover, weatherCode);
    if (radarFresh && modelSaysPrecipitation) {
      // The model rains here, the radar sees a dry sky: trust the measurement.
      corrections.push('Wetterlage nach Radar: kein Niederschlag gemessen');
      weatherCode = cloudCover !== null && cloudCover >= 90 ? 3 : cloudCover !== null && cloudCover >= 60 ? 2 : 1;
    }
  }

  return {
    time: now.toISOString(),
    condition,
    weatherCode,
    cloudCover: cloudCover === null ? null : Math.round(cloudCover),
    cloudCoverLow: roundOrNull(model?.cloudCoverLow),
    cloudCoverMid: roundOrNull(model?.cloudCoverMid),
    cloudCoverHigh: roundOrNull(model?.cloudCoverHigh),
    temperature: model?.temperature === null || model?.temperature === undefined ? null : Math.round(model.temperature * 10) / 10,
    windSpeed: model?.windSpeed === null || model?.windSpeed === undefined ? null : Math.round(model.windSpeed * 10) / 10,
    windDirection: roundOrNull(model?.windDirection),
    precipitationRate: rate === null ? null : Math.round(rate * 10) / 10,
    precipitationKind: kind,
    shortwaveRadiation: roundOrNull(model?.shortwaveRadiation),
    sources: {
      sky: model ? { kind: 'model', model: 'DWD ICON-D2', runInit: model.runInit, validAt: model.validAt } : null,
      precipitation: precipitationSource,
    },
    corrections,
  };
}

/** Drizzle, rain and showers are one family, snow another. */
function sameFamily(a: number, b: number) {
  const family = (code: number) => (SNOW_CODES.has(code) ? 'snow' : FREEZING_CODES.has(code) ? 'sleet' : 'rain');
  return family(a) === family(b);
}
function roundOrNull(value: number | null | undefined) {
  return value === null || value === undefined ? null : Math.round(value);
}
