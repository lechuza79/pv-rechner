/**
 * Location and live weather for the homepage sky.
 *
 * Weather comes from our own DWD-based endpoint (`/api/weather-now`), never
 * from a third party in the browser. Every field may be missing; missing is
 * reported as missing — the stage then shows only the time of day.
 *
 * Without a saved postcode the sky follows an EXAMPLE location, and the
 * reading names it as an example. A national average under a city name would
 * be a false statement about that city.
 */

export type HeroOrt = { plz: string | null; name: string; lat: number; lon: number };

export type HeroWetter = {
  wolkenProzent: number;
  windKmh: number;
  windRichtung: number;
  regenMmH: number;
  wetterCode: number;
  beschreibung: string;
  /** Source times, as the weather session's legal review requires. */
  stand: string | null;
  /** Credit line, passed through unchanged. */
  quelle: string | null;
};

export const BEISPIEL_PLZ = "34117";
export const BEISPIEL_NAME = "Kassel (Beispielort)";

type WeatherNow = {
  weather?: {
    condition?: string | null;
    weatherCode?: number | null;
    cloudCover?: number | null;
    temperature?: number | null;
    windSpeed?: number | null;
    windDirection?: number | null;
    precipitationRate?: number | null;
    sources?: {
      sky?: { validAt?: string } | null;
      precipitation?: { kind: "radar"; measuredAt?: string } | { kind: "model" } | null;
    };
  };
  attribution?: string;
};

const BEDINGUNG: Record<string, string> = {
  clear: "klar",
  partly: "leicht bewölkt",
  cloudy: "bewölkt",
  overcast: "bedeckt",
  fog: "Nebel",
  rain: "Regen",
  sleet: "Schneeregen",
  snow: "Schnee",
  thunder: "Gewitter",
};

const zahl = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

function uhrzeit(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
}

/** Pure mapping, exported for tests: never turns a missing value into zero weather. */
export function wetterAus(json: WeatherNow): HeroWetter | null {
  const w = json.weather;
  // Clouds are the one field the sky cannot do without; without them we say
  // "not available" instead of drawing a clear sky that nobody measured.
  if (!w || !zahl(w.cloudCover)) return null;
  const teile: string[] = [];
  if (zahl(w.temperature)) teile.push(`${Math.round(w.temperature).toLocaleString("de-DE")} °C`);
  if (w.condition && BEDINGUNG[w.condition]) teile.push(BEDINGUNG[w.condition]);
  if (zahl(w.windSpeed)) teile.push(`Wind ${Math.round(w.windSpeed * 3.6).toLocaleString("de-DE")} km/h`);
  const himmel = uhrzeit(w.sources?.sky?.validAt);
  const radar = w.sources?.precipitation?.kind === "radar" ? uhrzeit(w.sources.precipitation.measuredAt) : null;
  const stand = [himmel && `Wettermodell für ${himmel} Uhr (berechnet)`, radar && `Niederschlag vom Radar, ${radar} Uhr`]
    .filter(Boolean)
    .join(" · ");
  return {
    wolkenProzent: w.cloudCover,
    windKmh: zahl(w.windSpeed) ? w.windSpeed * 3.6 : 0,
    windRichtung: zahl(w.windDirection) ? w.windDirection : 270,
    regenMmH: zahl(w.precipitationRate) ? w.precipitationRate : 0,
    wetterCode: zahl(w.weatherCode) ? w.weatherCode : 0,
    beschreibung: teile.join(" · "),
    stand: stand || null,
    quelle: json.attribution ?? null,
  };
}

export async function heroWetter(plz: string | null): Promise<{ ort: HeroOrt | null; wetter: HeroWetter | null }> {
  const ziel = plz ?? BEISPIEL_PLZ;
  const [ortAntwort, wetterAntwort] = await Promise.all([
    fetch(`/api/ort?plz=${ziel}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(`/api/weather-now?plz=${ziel}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const ort: HeroOrt | null = ortAntwort
    ? { plz: plz ? ziel : null, name: plz ? `PLZ ${ziel}` : BEISPIEL_NAME, lat: ortAntwort.lat, lon: ortAntwort.lon }
    : null;
  return { ort, wetter: wetterAntwort ? wetterAus(wetterAntwort) : null };
}
