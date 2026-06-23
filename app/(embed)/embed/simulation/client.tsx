"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { v } from "../../../../lib/theme";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { WeatherData, simulateAll } from "../../../../lib/simulation";

const DEFAULT_PLZ = "10115";

// Simple live-yield widget: enter a postal code, see what a PV system of each
// standard size is producing right now (no household / self-use overlay — that
// lives in the full /pv-simulation page).
export default function SimulationWidget() {
  useWidgetTheme();

  const [plz, setPlz] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);

  const submitPlz = useCallback(async (value: string) => {
    if (!/^\d{5}$/.test(value)) return;
    setLoading(true);
    setError(null);
    try {
      const plzData: Record<string, [number, number]> = await (await fetch("/plz.json")).json();
      const c = plzData[value];
      if (!c) {
        setError("PLZ nicht gefunden.");
        setLoading(false);
        return;
      }
      const data = await (await fetch(`/api/weather?lat=${c[0]}&lon=${c[1]}`)).json();
      if (data.source === "error") {
        setError("Wetterdaten sind gerade nicht verfügbar.");
        setLoading(false);
        return;
      }
      setWeather(data.current);
      setUpdated(new Date());
    } catch {
      setError("Verbindungsfehler. Bitte später erneut versuchen.");
    }
    setLoading(false);
  }, []);

  // Preset from ?plz= (so publishers can hardcode their location), else default.
  useEffect(() => {
    const urlPlz = new URLSearchParams(window.location.search).get("plz") || "";
    const initial = /^\d{5}$/.test(urlPlz) ? urlPlz : DEFAULT_PLZ;
    setPlz(initial);
    submitPlz(initial);
  }, [submitPlz]);

  const results = useMemo(() => (weather ? simulateAll(weather, null) : []), [weather]);

  return (
    <div style={S.card}>
      <div style={S.head}>
        <span style={S.title}>PV-Ertrag jetzt</span>
        {updated && (
          <span style={S.updated}>
            {updated.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
          </span>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitPlz(plz);
        }}
        style={S.form}
      >
        <input
          value={plz}
          onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
          inputMode="numeric"
          placeholder="PLZ eingeben"
          aria-label="Postleitzahl"
          style={S.input}
        />
        <button type="submit" style={S.btn} disabled={loading}>
          {loading ? "…" : "Anzeigen"}
        </button>
      </form>

      {error && <div style={S.error}>{error}</div>}

      {weather && !error && (
        weather.isDay ? (
          <>
            <div style={S.wx}>
              <span>Einstrahlung {Math.round(weather.irradiance)} W/m²</span>
              <span>{Math.round(weather.temperature)} °C</span>
            </div>
            <div style={S.grid}>
              {results.map((r) => (
                <div key={r.kwp} style={S.cell}>
                  <div style={S.cellLabel}>{r.label}</div>
                  <div style={S.cellVal}>
                    {r.currentKw.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    <span style={S.unit}> kW</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={S.night}>Aktuell keine Sonneneinstrahlung an diesem Standort.</div>
        )
      )}

      <a href="https://solar-check.io/pv-simulation" target="_blank" rel="noopener" style={S.footer}>
        solar-check.io
      </a>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    background: "var(--widget-bg)",
    color: "var(--widget-fg)",
    borderRadius: "var(--widget-border-radius)",
    fontFamily: "var(--widget-font-family)",
    padding: 20,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  head: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 700 },
  updated: { fontSize: 11, color: "var(--widget-muted)" },
  form: { display: "flex", gap: 8, marginBottom: 14 },
  input: {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    fontSize: 14,
    fontFamily: "inherit",
    color: "var(--widget-fg)",
    background: "transparent",
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 8,
  },
  btn: {
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    color: "var(--widget-accent-fg)",
    background: "var(--widget-accent)",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
  },
  error: { fontSize: 13, color: "var(--widget-muted)", padding: "8px 0" },
  wx: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12.5,
    color: "var(--widget-muted)",
    marginBottom: 12,
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  cell: {
    padding: "12px 10px",
    borderRadius: 10,
    border: `1px solid ${v("--color-border")}`,
    textAlign: "center",
  },
  cellLabel: { fontSize: 12, fontWeight: 600, color: "var(--widget-muted)", marginBottom: 4 },
  cellVal: { fontSize: 22, fontWeight: 700, color: "var(--widget-accent)", letterSpacing: "-0.02em" },
  unit: { fontSize: 12, fontWeight: 500, color: "var(--widget-muted)" },
  night: {
    fontSize: 13,
    color: "var(--widget-muted)",
    textAlign: "center",
    padding: "20px 0",
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--widget-accent)",
    textDecoration: "none",
    textAlign: "center",
  },
};
