"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { IconArrowRight, IconCheck } from "./Icons";
import { useChartExport } from "../lib/useChartExport";
import { useSharedPlz } from "../lib/location";
import ChartExportBar from "./ChartExportBar";
import ChartActionBar from "./ChartActionBar";
import { PoweredBy, DataSourceNote } from "./PoweredBy";
import { DATA_SOURCES, sourceLabel } from "../lib/data-sources";
import { v, tokens } from "../lib/theme";
import { PERSONEN, NUTZUNG } from "../lib/constants";
import {
  WeatherData,
  HourlyForecast,
  HouseholdProfile,
  simulateAll,
  calcHourlyProduction,
  calcDailyEstimate,
  SIM_CONFIGS,
  HourlyPoint,
} from "../lib/simulation";
import { EA_DEFAULT_KM, calcEaAnnual, calcKlimaAnnual, KLIMA_DEFAULT_M2 } from "../lib/consumption";
import { calcWpAnnualElectricity, DEFAULT_WP_BUILDING } from "../lib/heatpump";

const SITE_URL = "https://solar-check.io";

// Shared body of the live PV simulation. Rendered both by the public
// /pv-simulation page (with the site header + chart export) and by the
// embeddable widget at /embed/simulation (themed via --widget-* tokens,
// without export, with an absolute CTA + attribution link). Single source
// of truth so the two never drift apart.
export default function SimulationPanel({
  embed = false,
  initialPlz = "",
  showExport = !embed,
  showCta = true,
  embedButton = true,
  branding = false,
}: {
  embed?: boolean;
  initialPlz?: string;
  showExport?: boolean;
  showCta?: boolean;
  /** Embed only: show the "Einbetten" action (hidden on the gallery via embed=0). */
  embedButton?: boolean;
  /** Embed only: show the "Powered by solar-check.io" footer. */
  branding?: boolean;
}) {
  const [plz, setPlz] = useState(initialPlz);
  // One location across all calculators. Inside embeds this resolves to the
  // in-memory store, so the widget stays free of browser storage.
  useSharedPlz(plz, setPlz);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hourly, setHourly] = useState<HourlyForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedKwp, setSelectedKwp] = useState(10);

  // Household profile
  const [personenIdx, setPersonenIdx] = useState(1); // Default: 2 Personen
  const [nutzungIdx, setNutzungIdx] = useState(1);   // Default: Teils zuhause
  const [wpActive, setWpActive] = useState(false);
  const [eaActive, setEaActive] = useState(false);
  const [klimaActive, setKlimaActive] = useState(false);

  // WP-Jahresstrom aus der exakten Methode (Standard-Gebäude + Personenzahl) —
  // dieselbe Physik wie PV-/WP-Rechner, statt der alten Pauschale.
  const wpAnnualKwh = useMemo(
    () => calcWpAnnualElectricity({ ...DEFAULT_WP_BUILDING, personen: PERSONEN[personenIdx].count }),
    [personenIdx],
  );

  const household = useMemo<HouseholdProfile>(() => ({
    baseKwh: PERSONEN[personenIdx].verbrauch,
    tagQuote: NUTZUNG[nutzungIdx].tagQuote,
    wpActive,
    eaActive,
    klimaActive,
    klimaM2: KLIMA_DEFAULT_M2,
    wpAnnualKwh,
  }), [personenIdx, nutzungIdx, wpActive, eaActive, klimaActive, wpAnnualKwh]);

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

  const submitPlz = useCallback(async (value?: string) => {
    const code = value ?? plz;
    if (!/^\d{5}$/.test(code)) {
      setError("Bitte eine 5-stellige Postleitzahl eingeben.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plzRes = await fetch("/plz.json");
      const plzData: Record<string, [number, number]> = await plzRes.json();
      const c = plzData[code];
      if (!c) { setError("PLZ nicht gefunden."); setLoading(false); return; }
      setCoords(c);
      await fetchWeather(c[0], c[1]);
    } catch {
      setError("Fehler beim Laden der Standortdaten.");
    }
    setLoading(false);
  }, [fetchWeather, plz]);

  // Auto-fetch on initial PLZ (from URL on the site, from ?plz= on the embed)
  useEffect(() => { if (initialPlz && /^\d{5}$/.test(initialPlz)) submitPlz(initialPlz); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh only when the user returns to the tab and data is older than 30 min.
  // Avoids burning Vercel function invocations on background tabs left open for hours.
  useEffect(() => {
    if (!coords) return;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (lastUpdate && Date.now() - lastUpdate.getTime() < 30 * 60 * 1000) return;
      fetchWeather(coords[0], coords[1]);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [coords, fetchWeather, lastUpdate]);

  // Derived data
  const results = useMemo(() => weather ? simulateAll(weather, household) : [], [weather, household]);
  const hourlyPoints = useMemo(() =>
    hourly && selectedKwp ? calcHourlyProduction(selectedKwp, hourly, household) : [],
    [hourly, selectedKwp, household]
  );
  const dailyEstimate = useMemo(() =>
    hourly && selectedKwp ? calcDailyEstimate(selectedKwp, hourly) : 0,
    [hourly, selectedKwp]
  );

  const hasConsumption = hourlyPoints.length > 0 && hourlyPoints.some(p => p.consumptionKw > 0);
  // Share the exact current view: deep-link to the live page with the entered PLZ.
  const shareUrl = `${SITE_URL}/pv-simulation${/^\d{5}$/.test(plz) ? `?plz=${plz}` : ""}`;
  const shareText = `Live PV-Simulation: ${selectedKwp} kWp erzeugt heute ~${dailyEstimate.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kWh – Solar Check`;
  const simChartExport = useChartExport({
    context: {
      title: `Tagesverlauf · ${selectedKwp} kWp`,
      subtitle: plz ? `PLZ ${plz}` : undefined,
      stats: hourlyPoints.length > 0 ? [
        { label: "Anlagengröße", value: `${selectedKwp}`, unit: "kWp" },
        { label: "Tagesertrag", value: `~${dailyEstimate.toLocaleString("de-DE", { minimumFractionDigits: 1 })}`, unit: "kWh" },
      ] : undefined,
      legend: [
        { color: tokens['--color-accent'], label: "Erzeugung" },
        ...(hasConsumption ? [
          { color: tokens['--color-negative'], label: "Verbrauch" },
          { color: tokens['--color-positive'], label: "Eigenverbrauch" },
        ] : []),
      ],
      source: sourceLabel(DATA_SOURCES.openMeteo),
    },
    filename: `solar-check-simulation-${selectedKwp}kwp.png`,
    shareText,
    shareUrl,
  });

  const ctaIdx = SIM_CONFIGS.findIndex(c => c.kwp === selectedKwp);
  // Carry the entered PLZ into the full calculator so the user does not have to
  // type it again — the calculator reads ?plz= and auto-loads the location yield.
  const ctaHref = `/photovoltaik-rechner?a=${ctaIdx}${/^\d{5}$/.test(plz) ? `&plz=${plz}` : ""}`;
  const ctaStyle: React.CSSProperties = {
    display: "block", textAlign: "center", padding: "14px 20px",
    borderRadius: v('--radius-md'), background: v('--color-accent'),
    color: v('--color-text-on-accent'), fontSize: 14, fontWeight: 700,
    textDecoration: "none",
  };
  const ctaInner = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
      {selectedKwp} kWp vollständig berechnen <IconArrowRight size={14} />
    </span>
  );

  return (
    <>
      {/* PLZ Input */}
      <div style={{ marginBottom: 20 }}>
        <form onSubmit={e => { e.preventDefault(); submitPlz(); }} style={{ position: "relative" }}>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Postleitzahl eingeben"
            placeholder="PLZ eingeben (z.B. 80331)"
            value={plz}
            onChange={e => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
            style={{
              width: "100%", padding: "14px 16px", paddingRight: 56, fontSize: 16, fontFamily: v('--font-mono'),
              borderRadius: v('--radius-md'), border: `2px solid ${v('--color-border')}`,
              background: v('--color-bg-muted'), color: v('--color-text-primary'),
              outline: "none", textAlign: "center", letterSpacing: "0.1em",
            }}
          />
          {loading ? (
            <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: v('--color-text-muted') }}>
              Laden...
            </div>
          ) : plz.length === 5 && (
            <button type="submit" aria-label="Anzeigen" style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              width: 38, height: 38, borderRadius: v('--radius-sm'),
              background: v('--color-accent'), color: v('--color-text-on-accent'),
              border: "none", cursor: "pointer", fontSize: 16, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconArrowRight size={18} />
            </button>
          )}
        </form>
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

      {/* Household Profile */}
      {weather && !error && (
        <div className="fu" style={{ marginBottom: 16, padding: "14px 16px", borderRadius: v('--radius-md'), border: `1px solid ${v('--color-border')}`, background: v('--color-bg') }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: v('--color-text-muted'), textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Dein Haushalt
          </div>
          {/* Personen */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {PERSONEN.map((p, i) => (
              <button key={i} onClick={() => setPersonenIdx(i)} style={{
                flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 600, borderRadius: v('--radius-sm'), cursor: "pointer",
                background: personenIdx === i ? v('--color-accent') : v('--color-bg-muted'),
                color: personenIdx === i ? v('--color-text-on-accent') : v('--color-text-secondary'),
                border: personenIdx === i ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
              }}>
                {p.label} Pers.
              </button>
            ))}
          </div>
          {/* Nutzung */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {NUTZUNG.map((n, i) => (
              <button key={i} onClick={() => setNutzungIdx(i)} style={{
                flex: 1, padding: "6px 2px", fontSize: 10, fontWeight: 600, borderRadius: v('--radius-sm'), cursor: "pointer",
                background: nutzungIdx === i ? v('--color-accent') : v('--color-bg-muted'),
                color: nutzungIdx === i ? v('--color-text-on-accent') : v('--color-text-secondary'),
                border: nutzungIdx === i ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
                lineHeight: 1.2,
              }}>
                {n.label}
              </button>
            ))}
          </div>
          {/* WP + E-Auto */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setWpActive(!wpActive)} style={{
              flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600, borderRadius: v('--radius-sm'), cursor: "pointer",
              background: wpActive ? v('--color-accent') : v('--color-bg-muted'),
              color: wpActive ? v('--color-text-on-accent') : v('--color-text-secondary'),
              border: wpActive ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Wärmepumpe {wpActive ? <IconCheck size={12} /> : ""}</span>
            </button>
            <button onClick={() => setEaActive(!eaActive)} style={{
              flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600, borderRadius: v('--radius-sm'), cursor: "pointer",
              background: eaActive ? v('--color-accent') : v('--color-bg-muted'),
              color: eaActive ? v('--color-text-on-accent') : v('--color-text-secondary'),
              border: eaActive ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>E-Auto {eaActive ? <IconCheck size={12} /> : ""}</span>
            </button>
            <button onClick={() => setKlimaActive(!klimaActive)} style={{
              flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600, borderRadius: v('--radius-sm'), cursor: "pointer",
              background: klimaActive ? v('--color-accent') : v('--color-bg-muted'),
              color: klimaActive ? v('--color-text-on-accent') : v('--color-text-secondary'),
              border: klimaActive ? `1px solid ${v('--color-accent')}` : `1px solid ${v('--color-border')}`,
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Klimaanlage {klimaActive ? <IconCheck size={12} /> : ""}</span>
            </button>
          </div>
          <div style={{ fontSize: 11, color: v('--color-text-faint'), marginTop: 8, textAlign: "center" }}>
            Jahresverbrauch: ~{Math.round(household.baseKwh + (wpActive ? wpAnnualKwh : 0) + (eaActive ? calcEaAnnual(EA_DEFAULT_KM) : 0) + (klimaActive ? calcKlimaAnnual(KLIMA_DEFAULT_M2) : 0)).toLocaleString("de-DE")} kWh
          </div>
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
                // Opaque accent tint (not the translucent --color-accent-dim) so the
                // selected card sits consistently on the widget bg, incl. dark themes
                // and any parent background behind a transparent embed body.
                background: selectedKwp === r.kwp ? v('--color-bg-accent') : v('--color-bg'),
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
              {/* Self-use bar: green = self-consumed, gray = surplus */}
              <div style={{ height: 4, borderRadius: 2, background: v('--color-border'), marginTop: 8, overflow: "hidden", display: "flex" }}>
                {r.currentWatts > 0 && (
                  <>
                    <div style={{
                      height: "100%", width: `${r.selfUsePercent}%`,
                      background: v('--color-positive'),
                      transition: "width 0.3s ease",
                    }} />
                    <div style={{
                      height: "100%", width: `${100 - r.selfUsePercent}%`,
                      background: v('--color-accent-light'),
                      opacity: 0.4,
                      transition: "width 0.3s ease",
                    }} />
                  </>
                )}
              </div>
              <div style={{ fontSize: 11, color: v('--color-text-muted'), marginTop: 4 }}>
                <span style={{ color: v('--color-positive'), fontWeight: 600 }}>{r.selfUsePercent}%</span> Eigenverbrauch
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Daily Chart */}
      {hourlyPoints.length > 0 && weather && !error && (
        <div className="fu" style={{ marginBottom: 20 }}>
          <div ref={simChartExport.chartRef}>
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
          {showExport && (
            <ChartExportBar
              onDownload={simChartExport.downloadPng}
              onShare={simChartExport.sharePng}
              onWhatsApp={simChartExport.shareWhatsApp}
              onTwitter={simChartExport.shareTwitter}
              isExporting={simChartExport.isExporting}
              canNativeShare={simChartExport.canNativeShare}
            />
          )}
        </div>
      )}

      {/* CTA */}
      {showCta && weather && !error && (
        <div className="fu" style={{ marginBottom: 24 }}>
          {embed ? (
            <a href={`${SITE_URL}${ctaHref}`} target="_blank" rel="noopener" style={ctaStyle}>
              {ctaInner}
            </a>
          ) : (
            <Link href={ctaHref} style={ctaStyle}>
              {ctaInner}
            </Link>
          )}
        </div>
      )}

      {/* Disclaimer */}
      {weather && !error && (
        <div style={{ fontSize: 11, color: v('--color-text-faint'), textAlign: "center", lineHeight: 1.5, marginBottom: embed ? 14 : 24 }}>
          Geschätzte Leistung für ein südausgerichtetes Dach ohne Verschattung.<br />
          <DataSourceNote source={DATA_SOURCES.openMeteo} /> · Aktualisierung alle 15 Min.
        </div>
      )}

      {/* Embed action bar + branding footer (share the current view / PLZ). */}
      {embed && weather && !error && (
        <div>
          <div style={{ height: 1, background: v('--color-border'), marginBottom: 10 }} />
          <div
            style={{
              fontSize: 10.5,
              color: v('--color-text-muted'),
              display: "flex",
              justifyContent: branding ? "space-between" : "flex-start",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ChartActionBar
              variant="bar"
              size={30}
              onDownload={simChartExport.downloadPng}
              onCopyLink={() => navigator.clipboard?.writeText(`${shareText}\n${shareUrl}`).catch(() => {})}
              onWhatsApp={simChartExport.shareWhatsApp}
              onTwitter={simChartExport.shareTwitter}
              onShareImage={simChartExport.sharePng}
              onEmbed={embedButton ? () => window.open("/energie-widgets#simulation", "_blank", "noopener") : undefined}
              isExporting={simChartExport.isExporting}
              canNativeShare={simChartExport.canNativeShare}
            />
            {branding && <PoweredBy />}
          </div>
        </div>
      )}
    </>
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
  const W = 640, H = 220;
  const P = { t: 16, r: 12, b: 40, l: 42 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;

  // Filter to daylight hours (5–21)
  const dayPoints = points.filter(p => p.hour >= 5 && p.hour <= 21);
  if (dayPoints.length === 0) return null;

  const hasConsumption = dayPoints.some(p => p.consumptionKw > 0);
  const maxKw = Math.max(kwp, ...dayPoints.map(p => p.kw), ...dayPoints.map(p => p.consumptionKw));
  const yMax = Math.ceil(maxKw) || 1;

  const x = (hour: number) => P.l + ((hour - 5) / 16) * cW;
  const y = (kw: number) => P.t + cH - (kw / yMax) * cH;

  // Production area + line
  const prodLine = dayPoints.map(p => `${x(p.hour)},${y(p.kw)}`).join(" ");
  const prodArea = `M${x(dayPoints[0].hour)},${y(0)} ` +
    dayPoints.map(p => `L${x(p.hour)},${y(p.kw)}`).join(" ") +
    ` L${x(dayPoints[dayPoints.length - 1].hour)},${y(0)} Z`;

  // Self-use area (min of production and consumption)
  const selfUseArea = hasConsumption
    ? `M${x(dayPoints[0].hour)},${y(0)} ` +
      dayPoints.map(p => `L${x(p.hour)},${y(p.selfUseKw)}`).join(" ") +
      ` L${x(dayPoints[dayPoints.length - 1].hour)},${y(0)} Z`
    : null;

  // Consumption line
  const consLine = hasConsumption
    ? dayPoints.map(p => `${x(p.hour)},${y(p.consumptionKw)}`).join(" ")
    : null;

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
        <text key={h} x={x(h)} y={H - 20} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)" fontFamily="var(--font-mono)">
          {h}h
        </text>
      ))}

      {/* Production area (light blue) */}
      <path d={prodArea} fill="var(--color-accent)" opacity={0.06} />

      {/* Self-use area (green, overlaps production area) */}
      {selfUseArea && <path d={selfUseArea} fill="var(--color-positive)" opacity={0.15} />}

      {/* Production line */}
      <polyline points={prodLine} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Consumption line (dashed) */}
      {consLine && <polyline points={consLine} fill="none" stroke="var(--color-negative)" strokeWidth={1.5} strokeDasharray="6,4" strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />}

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

      {/* Legend */}
      {hasConsumption && (
        <g transform={`translate(${P.l}, ${H - 6})`}>
          <line x1={0} x2={16} y1={0} y2={0} stroke="var(--color-accent)" strokeWidth={2} />
          <text x={20} y={0} dominantBaseline="middle" fontSize={9} fill="var(--color-text-muted)">Erzeugung</text>
          <line x1={90} x2={106} y1={0} y2={0} stroke="var(--color-negative)" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.7} />
          <text x={110} y={0} dominantBaseline="middle" fontSize={9} fill="var(--color-text-muted)">Verbrauch</text>
          <rect x={195} y={-4} width={10} height={8} rx={1} fill="var(--color-positive)" opacity={0.3} />
          <text x={209} y={0} dominantBaseline="middle" fontSize={9} fill="var(--color-text-muted)">Eigenverbrauch</text>
        </g>
      )}
    </svg>
  );
}
