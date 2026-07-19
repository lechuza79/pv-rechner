"use client";

import { useEffect, useMemo, useState } from "react";
import { v } from "../lib/theme";
import { calcCurrentPower } from "../lib/simulation";
import { MastrLiveRadial } from "./MastrLiveRadial";
import GemeindeWidgetShell from "./atlas/GemeindeWidgetShell";
import { DATA_SOURCES } from "../lib/data-sources";

// Landes-Variante des einbettbaren Solarleistungs-Widgets (analog zur Gemeinde-
// Version in components/atlas, gleiche Shell + chromelose MastrLiveRadial). Es
// gibt keine echten Erzeugungsdaten je Bundesland — daher aus dem heutigen
// Wetter an einem repräsentativen Landes-Mittelpunkt (Open-Meteo via
// /api/weather) × installierter Leistung (NOCT-Modell) geschätzt und klar als
// „simuliert" beschriftet. Einheit GW statt MW, weil der Landes-Bestand
// GW-Größenordnung hat. Struktur bewusst identisch zur Gemeinde-Variante, damit
// beide beim Zusammenführen der Branches zu einer Komponente werden.

type Weather = {
  current: { time: string };
  hourly: { time: string[]; irradiance: number[]; temperature: number[] };
};

export default function RegionSolarLive({
  lat,
  lon,
  totalKwp,
  name,
  liveUrl,
  showSource = true,
  showEmbed = true,
  branding = false,
}: {
  lat: number;
  lon: number;
  totalKwp: number;
  name: string;
  liveUrl: string;
  showSource?: boolean;
  showEmbed?: boolean;
  branding?: boolean;
}) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("weather"))))
      .then((d: Weather) => !cancelled && setWeather(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  const { bars, highlightTs } = useMemo(() => {
    if (!weather) return { bars: [] as { ts: string; mw: number }[], highlightTs: undefined };
    const H = weather.hourly;
    const n = Math.min(24, H.time.length);
    // Stundenwerte linear auf Viertelstunden interpolieren → 96 Balken, gleiche
    // Dichte wie der bundesweite 15-Minuten-Feed auf der Startseite.
    const b: { ts: string; mw: number }[] = [];
    for (let i = 0; i < n; i++) {
      const hasNext = i + 1 < n;
      const lerp = (a: number, c: number, f: number) => a * (1 - f) + c * f;
      for (let q = 0; q < 4; q++) {
        const f = q / 4;
        const irr = hasNext ? lerp(H.irradiance[i] ?? 0, H.irradiance[i + 1] ?? 0, f) : H.irradiance[i] ?? 0;
        const temp = hasNext ? lerp(H.temperature[i] ?? 15, H.temperature[i + 1] ?? 15, f) : H.temperature[i] ?? 15;
        // calcCurrentPower liefert Watt → MW = W / 1.000.000 (das Radial rechnet MW→GW).
        const watts = calcCurrentPower(totalKwp, irr, temp);
        const ts = `${H.time[i].slice(0, 13)}:${String(q * 15).padStart(2, "0")}`;
        b.push({ ts, mw: watts / 1_000_000 });
      }
    }
    const cur = weather.current.time; // "YYYY-MM-DDTHH:MM"
    const qMin = String(Math.floor((parseInt(cur.slice(14, 16) || "0", 10)) / 15) * 15).padStart(2, "0");
    const ht = `${cur.slice(0, 13)}:${qMin}`;
    return { bars: b, highlightTs: ht };
  }, [weather, totalKwp]);

  const stand = weather ? `${weather.current.time.slice(11, 16)} Uhr` : null;
  const subline =
    "Simuliert aus dem heutigen Wetter — kein Messwert" + (stand ? ` · Stand ${stand}` : "");

  const shareText = `Solarleistung in ${name}: was der Bestand heute liefert (simuliert) – Solar Check`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <GemeindeWidgetShell
      title={`Solarleistung heute in ${name}`}
      subline={subline}
      sources={[DATA_SOURCES.openMeteo, DATA_SOURCES.mastr]}
      shareText={shareText}
      shareUrl={liveUrl}
      filename={`solar-check-solarleistung-${slug}.png`}
      embedHash="gemeinde-solarleistung"
      showSource={showSource}
      // Vertikales Quellen-Label endet über der Auslastungs-Zeile des Radials,
      // statt bis zum Boden durchzulaufen.
      sourceBottomInset={44}
      showEmbed={showEmbed}
      branding={branding}
    >
      {failed ? (
        <p style={S.msg}>Wetterdaten für die Simulation gerade nicht verfügbar.</p>
      ) : !weather ? (
        <p style={S.msg}>Simulation lädt …</p>
      ) : (
        <div style={{ width: "100%", maxWidth: 300 }}>
          <MastrLiveRadial
            bare
            energietraeger="solar"
            installedKwp={totalKwp}
            unit="GW"
            injected={bars}
            highlightTs={highlightTs}
          />
        </div>
      )}
    </GemeindeWidgetShell>
  );
}

const S: Record<string, React.CSSProperties> = {
  msg: { fontSize: 13, color: v("--color-text-muted"), textAlign: "center", padding: "40px 0" },
};
