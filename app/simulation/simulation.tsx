"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "../../components/Logo";
import { v } from "../../lib/theme";
import {
  WeatherData,
  HourlyForecast,
  simulateAll,
  calcHourlyProduction,
  calcDailyEstimate,
  SIM_CONFIGS,
  HourlyPoint,
} from "../../lib/simulation";

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LiveSimulation() {
  const searchParams = useSearchParams();
  const initialPlz = searchParams.get("plz") || "";
  const [plz, setPlz] = useState(initialPlz);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hourly, setHourly] = useState<HourlyForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedKwp, setSelectedKwp] = useState(10);

  // PLZ lookup + weather fetch
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data.source === "error") {
        setError("Wetterdaten konnten nicht geladen werden.");
        return;
      }
      setWeather(data.current);
      setHourly(data.hourly);
      setError(null);
      setLastUpdate(new Date());
    } catch {
      setError("Verbindungsfehler. Versuche es in ein paar Minuten nochmal.");
    }
  }, []);

  const handlePlz = useCallback(async (value: string) => {
    setPlz(value);
    if (!/^\d{5}$/.test(value)) return;
    setLoading(true);
    setError(null);
    try {
      const plzRes = await fetch("/plz.json");
      const plzData: Record<string, [number, number]> = await plzRes.json();
      const c = plzData[value];
      if (!c) { setError("PLZ nicht gefunden."); setLoading(false); return; }
      setCoords(c);
      await fetchWeather(c[0], c[1]);
    } catch {
      setError("Fehler beim Laden der Standortdaten.");
    }
    setLoading(false);
  }, [fetchWeather]);

  // Auto-fetch on initial PLZ from URL
  useEffect(() => { if (initialPlz && /^\d{5}$/.test(initialPlz)) handlePlz(initialPlz); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 15 min
  useEffect(() => {
    if (!coords) return;
    const interval = setInterval(() => fetchWeather(coords[0], coords[1]), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [coords, fetchWeather]);

  // Derived data
  const results = useMemo(() => weather ? simulateAll(weather) : [], [weather]);
  const hourlyPoints = useMemo(() =>
    hourly && selectedKwp ? calcHourlyProduction(selectedKwp, hourly) : [],
    [hourly, selectedKwp]
  );
  const dailyEstimate = useMemo(() =>
    hourly && selectedKwp ? calcDailyEstimate(selectedKwp, hourly) : 0,
    [hourly, selectedKwp]
  );

  return (
    <div style={{ background: v('--color-bg'), fontFamily: v('--font-text'), color: v('--color-text-primary'), minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: v('--page-max-width'), margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 20 }}>
          <Link href="/" style={{ display: "flex", justifyContent: "center", marginBottom: 10, textDecoration: "none" }}>
            <Logo height={28} />
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: v('--color-text-primary'), lineHeight: 1.2 }}>
            Live Simulation
          </h1>
          <p style={{ fontSize: 13, color: v('--color-text-muted'), marginTop: 6, lineHeight: 1.5 }}>
            Was produziert eine PV-Anlage an deinem Standort gerade?
          </p>
        </div>

        {/* PLZ Input */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="PLZ eingeben (z.B. 80331)"
              value={plz}
              onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 5); handlePlz(v); }}
              style={{
                width: "100%", padding: "14px 16px", fontSize: 16, fontFamily: v('--font-mono'),
                borderRadius: v('--radius-md'), border: `2px solid ${v('--color-border')}`,
                background: v('--color-bg-muted'), color: v('--color-text-primary'),
                outline: "none", textAlign: "center", letterSpacing: "0.1em",
              }}
            />
            {loading && (
              <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: v('--color-text-muted') }}>
                Laden...
              </div>
            )}
          </div>
          {lastUpdate && (
            <div style={{ fontSize: 11, color: v('--color-text-faint'), textAlign: "center", marginTop: 6 }}>
              Aktualisiert {lastUpdate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: v('--radius-md'), background: v('--color-negative-dim'), border: `1px solid ${v('--color-negative-border')}`, fontSize: 13, color: v('--color-negative'), marginBottom: 16, textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Weather Card */}
        {weather && !error && (
          <div className="fu" style={{ background: v('--color-bg-accent'), borderRadius: v('--radius-md'), padding: "16px 20px", marginBottom: 16, border: `1px solid ${v('--color-border-accent')}` }}>
            {weather.isDay ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <WeatherStat label="Einstrahlung" value={`${Math.round(weather.irradiance)}`} unit="W/m²" />
                <WeatherStat label="Temperatur" value={`${Math.round(weather.temperature)}`} unit="°C" />
                <WeatherStat label="Bewölkung" value={`${Math.round(weather.cloudCover)}`} unit="%" />
              </div>
            ) : (
              <div style={{ textAlign: "center", fontSize: 14, color: v('--color-text-secondary'), lineHeight: 1.6 }}>
                Aktuell keine Sonneneinstrahlung.<br />
                <span style={{ fontSize: 12, color: v('--color-text-muted') }}>Der Tagesverlauf zeigt die heutigen Werte.</span>
              </div>
            )}
          </div>
        )}

        {/* Grid */}
        {weather && !error && weather.isDay && (
          <div className="fu" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {results.map(r => (
              <button
                key={r.kwp}
                onClick={() => setSelectedKwp(r.kwp)}
                style={{
                  padding: "14px 10px", borderRadius: v('--radius-md'), cursor: "pointer",
                  background: selectedKwp === r.kwp ? v('--color-accent-dim') : v('--color-bg'),
                  border: `2px solid ${selectedKwp === r.kwp ? v('--color-accent') : v('--color-border')}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: v('--color-text-secondary'), marginBottom: 6 }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: v('--font-mono'), color: v('--color-accent'), letterSpacing: "-0.02em" }}>
                  {r.currentKw.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  <span style={{ fontSize: 13, fontWeight: 500, color: v('--color-text-muted'), marginLeft: 3 }}>kW</span>
                </div>
                {/* Capacity bar */}
                <div style={{ height: 4, borderRadius: 2, background: v('--color-border'), marginTop: 8, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2, width: `${Math.min(r.capacityPercent, 100)}%`,
                    background: r.capacityPercent >= 50 ? v('--color-positive') : r.capacityPercent >= 20 ? v('--color-accent') : v('--color-text-muted'),
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 4 }}>
                  {r.capacityPercent}% Auslastung
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Daily Chart */}
        {hourlyPoints.length > 0 && weather && !error && (
          <div className="fu" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: v('--color-text-primary') }}>
                Tagesverlauf · {selectedKwp} kWp
              </div>
              <div style={{ fontSize: 12, fontFamily: v('--font-mono'), color: v('--color-accent'), fontWeight: 600 }}>
                ~{dailyEstimate.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kWh
              </div>
            </div>
            <DailyChart points={hourlyPoints} kwp={selectedKwp} />
          </div>
        )}

        {/* CTA */}
        {weather && !error && (
          <div className="fu" style={{ marginBottom: 24 }}>
            <Link
              href={`/rechner?a=${SIM_CONFIGS.findIndex(c => c.kwp === selectedKwp)}`}
              style={{
                display: "block", textAlign: "center", padding: "14px 20px",
                borderRadius: v('--radius-md'), background: v('--color-accent'),
                color: v('--color-text-on-accent'), fontSize: 14, fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {selectedKwp} kWp vollständig berechnen →
            </Link>
          </div>
        )}

        {/* Disclaimer */}
        {weather && !error && (
          <div style={{ fontSize: 11, color: v('--color-text-faint'), textAlign: "center", lineHeight: 1.5, marginBottom: 24 }}>
            Geschätzte Leistung für ein südausgerichtetes Dach ohne Verschattung.<br />
            Wetterdaten via Open-Meteo (DWD, NOAA). Aktualisierung alle 15 Min.
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "16px 0" }}>
          <Link href="/" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Startseite</Link>
          <Link href="/methodik" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Methodik</Link>
          <Link href="/impressum" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 11, color: v('--color-text-faint'), textDecoration: "none" }}>Datenschutz</Link>
        </div>
      </div>
    </div>
  );
}

// ─── WeatherStat ────────────────────────────────────────────────────────────

function WeatherStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: v('--font-mono'), fontWeight: 700, fontSize: 18, color: v('--color-text-primary') }}>
        {value}
        <span style={{ fontSize: 11, fontWeight: 500, color: v('--color-text-secondary'), marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
  );
}

// ─── DailyChart (SVG) ───────────────────────────────────────────────────────

function DailyChart({ points, kwp }: { points: HourlyPoint[]; kwp: number }) {
  const W = 640, H = 200;
  const P = { t: 16, r: 12, b: 28, l: 42 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;

  // Filter to daylight hours (5–21)
  const dayPoints = points.filter(p => p.hour >= 5 && p.hour <= 21);
  if (dayPoints.length === 0) return null;

  const maxKw = Math.max(kwp, ...dayPoints.map(p => p.kw));
  const yMax = Math.ceil(maxKw);
  const yR = yMax || 1;

  const x = (hour: number) => P.l + ((hour - 5) / 16) * cW;
  const y = (kw: number) => P.t + cH - (kw / yR) * cH;

  // Area + line path
  const linePoints = dayPoints.map(p => `${x(p.hour)},${y(p.kw)}`).join(" ");
  const areaPath = `M${x(dayPoints[0].hour)},${y(0)} ` +
    dayPoints.map(p => `L${x(p.hour)},${y(p.kw)}`).join(" ") +
    ` L${x(dayPoints[dayPoints.length - 1].hour)},${y(0)} Z`;

  // Current hour marker
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Y-axis ticks
  const tStep = yMax <= 4 ? 1 : yMax <= 10 ? 2 : 5;
  const yTicks = [];
  for (let val = 0; val <= yMax; val += tStep) yTicks.push(val);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Grid */}
      {yTicks.map(val => (
        <g key={val}>
          <line x1={P.l} x2={W - P.r} y1={y(val)} y2={y(val)} stroke="var(--color-chart-grid)" strokeWidth={0.5} />
          <text x={P.l - 8} y={y(val)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
            {val}
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {[6, 9, 12, 15, 18, 21].map(h => (
        <text key={h} x={x(h)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
          {h}h
        </text>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="var(--color-accent)" opacity={0.08} />

      {/* Line */}
      <polyline points={linePoints} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* "Now" marker */}
      {currentHour >= 5 && currentHour <= 21 && (
        <>
          <line x1={x(currentHour)} x2={x(currentHour)} y1={P.t} y2={P.t + cH} stroke="var(--color-text-muted)" strokeWidth={1} strokeDasharray="4,3" />
          <text x={x(currentHour)} y={P.t - 4} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
            Jetzt
          </text>
        </>
      )}

      {/* kW label */}
      <text x={P.l - 8} y={8} textAnchor="end" fontSize={9} fill="var(--color-text-faint)" fontFamily="var(--font-mono)">
        kW
      </text>
    </svg>
  );
}
