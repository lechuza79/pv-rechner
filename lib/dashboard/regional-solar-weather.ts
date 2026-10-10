import type {SolarWeatherSource} from "../../components/charts/CurrentPowerWidget";

/** Adapt the prepared regional endpoint to the existing live-power widget. */
export function regionalSolarWeatherSource(regionId: string, endpoint?:string): SolarWeatherSource {
  const scope = /^\d{8}$/.test(regionId) ? "gemeinde" : /^(0[1-9]|1[0-6]|de)$/.test(regionId) ? "region" : "landkreis";
  return {load: async () => {
    const response = await fetch(endpoint??`/api/${scope}/solartag?ags=${encodeURIComponent(regionId)}`);
    if (!response.ok) throw new Error("Regional daily solar curve unavailable");
    return response.json();
  }};
}
