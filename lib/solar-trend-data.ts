// Server-Lesepfad der Solar-Trend-Reihe: monatliche Solarerzeugung +
// installierte Leistung aus `energy_monthly` (befüllt vom wöchentlichen
// Backfill-Cron). Gecacht via unstable_cache, damit die Strommix-Seite
// ISR-gerendert bleibt und die Datenbank nicht pro Besucher liest.

import { unstable_cache } from "next/cache";
import { supabase } from "./supabase-server";
import type { SolarMonat } from "./solar-trend";

async function readSolarMonthlySeries(): Promise<SolarMonat[]> {
  if (!supabase) return [];

  const [gen, inst] = await Promise.all([
    supabase
      .from("energy_monthly")
      .select("period, data")
      .eq("metric", "generation_monthly")
      .eq("country", "de")
      .order("period", { ascending: true })
      .limit(1000),
    supabase
      .from("energy_monthly")
      .select("period, data")
      .eq("metric", "installed_solar_monthly")
      .eq("country", "de")
      .order("period", { ascending: true })
      .limit(1000),
  ]);
  if (gen.error || !gen.data) return [];

  const installedByPeriod = new Map<string, number>();
  for (const row of inst.data ?? []) {
    const gw = (row.data as Record<string, unknown>)?.solar_dc_gw;
    if (typeof gw === "number" && gw > 0) installedByPeriod.set(row.period as string, gw);
  }

  const series: SolarMonat[] = [];
  for (const row of gen.data) {
    const solar = (row.data as Record<string, unknown>)?.solar;
    if (typeof solar !== "number" || solar <= 0) continue;
    series.push({
      period: row.period as string,
      solarGWh: solar,
      installedGw: installedByPeriod.get(row.period as string) ?? null,
    });
  }
  return series;
}

/** Monats-Reihe für den Solar-Trend, 6h-gecacht (Tag: energy-monthly). */
export const getSolarMonthlySeries = unstable_cache(readSolarMonthlySeries, ["solar-monthly-series"], {
  revalidate: 21600,
  tags: ["energy-monthly"],
});
