// Prüft die Solar-Trend-Reihe direkt gegen die Datenbank — unabhängig vom
// Dev-Server (dessen Schriftarten-Nachladen den lokalen Seitenaufbau
// blockieren kann). Zeigt, was der Server-Block der Strommix-Seite rendert.
//
//   node --env-file=.env.local scripts/solar-trend-check.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen");
  process.exit(1);
}
const db = createClient(url, key);

const [gen, inst] = await Promise.all([
  db.from("energy_monthly").select("period, data").eq("metric", "generation_monthly").eq("country", "de").order("period").limit(1000),
  db.from("energy_monthly").select("period, data").eq("metric", "installed_solar_monthly").eq("country", "de").order("period").limit(1000),
]);
if (gen.error) throw gen.error;

const installed = new Map((inst.data ?? []).map((r) => [r.period, r.data?.solar_dc_gw]).filter(([, v]) => typeof v === "number" && v > 0));
const series = (gen.data ?? [])
  .filter((r) => typeof r.data?.solar === "number" && r.data.solar > 0)
  .map((r) => ({ period: r.period, solarGWh: r.data.solar, installedGw: installed.get(r.period) ?? null }));

console.log(`Monate mit Solarerzeugung: ${series.length} (${series[0]?.period} … ${series.at(-1)?.period})`);
console.log(`davon mit installierter Leistung: ${series.filter((s) => s.installedGw).length}`);

const byPeriod = new Map(series.map((s) => [s.period, s]));
const prevOf = (p) => {
  const [y, m] = p.split("-").map(Number);
  return `${y - 1}-${String(m).padStart(2, "0")}`;
};

const rows = [];
for (const s of [...series].reverse()) {
  const prev = byPeriod.get(prevOf(s.period));
  if (!prev) continue;
  const total = Math.round((s.solarGWh / prev.solarGWh - 1) * 100);
  let zubau = null, wetter = null;
  if (s.installedGw && prev.installedGw) {
    zubau = Math.round((s.installedGw / prev.installedGw - 1) * 100);
    wetter = Math.round(((s.solarGWh / s.installedGw) / (prev.solarGWh / prev.installedGw) - 1) * 100);
  }
  rows.push({ period: s.period, cur: s.solarGWh, prev: prev.solarGWh, total, zubau, wetter });
  if (rows.length === 12) break;
}

console.log("\nLetzte 12 Monatsvergleiche (so rendert die Server-Tabelle):");
for (const r of rows) {
  const f = (v) => (v / 1000).toFixed(1).replace(".", ",") + " TWh";
  console.log(
    `  ${r.period}  ${f(r.cur).padStart(9)} vs ${f(r.prev).padStart(9)}  ` +
    `gesamt ${String(r.total).padStart(4)}%  Zubau ${String(r.zubau ?? "—").padStart(4)}%  Wetter ${String(r.wetter ?? "—").padStart(4)}%`,
  );
}

// Multiplikative Probe auf ungerundeten Faktoren — Zubau × Wetter = Gesamt.
let worst = 0;
for (const r of rows) {
  if (r.zubau == null) continue;
  const cur = byPeriod.get(r.period), prev = byPeriod.get(prevOf(r.period));
  const g = cur.solarGWh / prev.solarGWh;
  const z = cur.installedGw / prev.installedGw;
  const w = (cur.solarGWh / cur.installedGw) / (prev.solarGWh / prev.installedGw);
  worst = Math.max(worst, Math.abs(z * w - g));
}
console.log(`\nProbe Zubau × Wetter = Gesamt — größte Abweichung: ${worst.toExponential(2)}`);
