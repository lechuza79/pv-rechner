// Solar-Trend: Monats-Solarerzeugung gegen den Vorjahresmonat, zerlegt in
// Zubau (installierte Leistung) und Wetter (Ertrag je kWp). Pure Funktionen —
// dieselbe Rechnung speist den serverseitig gerenderten SEO-Block der
// Strommix-Seite UND die blätterbare Karte im Client. Zwei Rechenwege wären
// zwei Wahrheiten (siehe „Geteilte Rechen-Basis" in der CLAUDE.md).
//
// Zerlegung: Erzeugung = installierte Leistung × Ertrag je kWp, also
// (1 + gesamt) = (1 + zubau) × (1 + wetter). Die beiden Komponenten
// multiplizieren sich — sie addieren sich NICHT zum Gesamteffekt.

export interface SolarMonat {
  /** "YYYY-MM" */
  period: string;
  solarGWh: number;
  /** Installierte Solarleistung (DC) in GWp — null, wenn die Reihe den Monat nicht kennt. */
  installedGw: number | null;
}

export interface SolarTrendVergleich {
  year: number;
  /** 0-basiert (Date-Konvention). */
  month0: number;
  curGWh: number;
  prevGWh: number;
  totalPct: number;
  /** Zerlegung nur, wenn beide Leistungswerte vorliegen. */
  zerlegung: {
    zubauPct: number;
    wetterPct: number;
    curGw: number;
    prevGw: number;
    /** Monats-Ertrag je kWp (kWh/kWp): GWh ÷ GWp kürzt sich genau dahin. */
    curYield: number;
    prevYield: number;
  } | null;
}

export function periodOf(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

export function monatsName(month0: number): string {
  return new Date(2000, month0, 1).toLocaleString("de-DE", { month: "long" });
}

/** Jüngster Monat der Reihe, der einen Vorjahresmonat zum Vergleichen hat. */
export function latestComparableMonth(series: SolarMonat[]): { year: number; month0: number } | null {
  const byPeriod = new Map(series.map((s) => [s.period, s]));
  for (let i = series.length - 1; i >= 0; i--) {
    const [y, m] = series[i].period.split("-").map(Number);
    if (byPeriod.has(periodOf(y - 1, m - 1))) return { year: y, month0: m - 1 };
  }
  return null;
}

/** Ältester vergleichbarer Monat (untere Blätter-Grenze). */
export function earliestComparableMonth(series: SolarMonat[]): { year: number; month0: number } | null {
  const byPeriod = new Map(series.map((s) => [s.period, s]));
  for (const s of series) {
    const [y, m] = s.period.split("-").map(Number);
    if (byPeriod.has(periodOf(y - 1, m - 1))) return { year: y, month0: m - 1 };
  }
  return null;
}

/** Vergleich eines Monats mit dem Vorjahresmonat — null, wenn einer fehlt. */
export function solarTrendVergleich(series: SolarMonat[], year: number, month0: number): SolarTrendVergleich | null {
  const byPeriod = new Map(series.map((s) => [s.period, s]));
  const cur = byPeriod.get(periodOf(year, month0));
  const prev = byPeriod.get(periodOf(year - 1, month0));
  if (!cur || !prev || cur.solarGWh <= 0 || prev.solarGWh <= 0) return null;

  const totalPct = Math.round((cur.solarGWh / prev.solarGWh - 1) * 100);
  const zerlegung =
    cur.installedGw && prev.installedGw
      ? {
          zubauPct: Math.round((cur.installedGw / prev.installedGw - 1) * 100),
          wetterPct: Math.round(((cur.solarGWh / cur.installedGw) / (prev.solarGWh / prev.installedGw) - 1) * 100),
          curGw: cur.installedGw,
          prevGw: prev.installedGw,
          curYield: cur.solarGWh / cur.installedGw,
          prevYield: prev.solarGWh / prev.installedGw,
        }
      : null;

  return { year, month0, curGWh: cur.solarGWh, prevGWh: prev.solarGWh, totalPct, zerlegung };
}

/** Die letzten `count` Vergleiche, jüngster zuerst — für die Trend-Tabelle. */
export function letzteVergleiche(series: SolarMonat[], count: number): SolarTrendVergleich[] {
  const latest = latestComparableMonth(series);
  if (!latest) return [];
  const out: SolarTrendVergleich[] = [];
  let val = latest.year * 12 + latest.month0;
  while (out.length < count && val >= 2016 * 12) {
    const v = solarTrendVergleich(series, Math.floor(val / 12), val % 12);
    if (v) out.push(v);
    val--;
  }
  return out;
}
