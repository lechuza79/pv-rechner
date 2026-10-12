import type {SolarWeatherSource} from "../../components/charts/CurrentPowerWidget";

const pending = new Map<string, ReturnType<SolarWeatherSource['load']>>();

/** Adapt the prepared regional endpoint; a failed request must not leave an endless spinner. */
export function regionalSolarWeatherSource(regionId: string, endpoint?:string): SolarWeatherSource {
  const scope = /^\d{8}$/.test(regionId) ? "gemeinde" : /^(0[1-9]|1[0-6]|de)$/.test(regionId) ? "region" : "landkreis";
  const url = endpoint??`/api/${scope}/solartag?ags=${encodeURIComponent(regionId)}`;
  return {endpoint:url,load: () => {
    const existing = pending.get(url);
    if (existing) return existing;
    const request = (async () => {
      const response = await fetch(url, {signal: AbortSignal.timeout(20_000)});
      if (!response.ok) throw new Error("Regional daily solar curve unavailable");
      return response.json();
    })();
    pending.set(url, request);
    void request.finally(() => pending.delete(url)).catch(() => {});
    return request;
  }};
}
