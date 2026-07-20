"use client";

import { useEffect, useMemo, useState } from "react";
import { v } from "../../lib/theme";
import { calcCurrentPower } from "../../lib/simulation";
import { MastrLiveRadial } from "../MastrLiveRadial";
import GemeindeWidgetShell from "./GemeindeWidgetShell";
import { DATA_SOURCES } from "../../lib/data-sources";

// Einbettbares Widget: standortgenaue Simulation der Solarleistung des Gemeinde-
// Bestands, gerendert im echten Live-Radial (MastrLiveRadial, chromeless in der
// geteilten Widget-Hülle). Nur die Datenquelle ist anders als beim bundesweiten
// Feed: das heutige Wetter am Standort (Open-Meteo, via /api/weather) ×
// installierte Leistung (NOCT-Modell). Es gibt keine echten Erzeugungsdaten je
// Gemeinde — daher simuliert, klar so beschriftet. Steht auf der Atlas-Seite UND
// unter /embed/gemeinde-solarleistung.

type Weather = {
  current: { time: string };
  hourly: { time: string[]; irradiance: number[]; temperature: number[] };
  // /api/weather liefert bei Open-Meteo-Ausfall HTTP 200 mit source:"error" und
  // leeren Reihen — daher NICHT über r.ok erkennbar, muss am Body geprüft werden.
  source?: "open-meteo" | "error";
};

export default function GemeindeSolarLive({
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
  /** Web-Quellenzeile zeigen. Embed: an. Atlas-Seite: aus (globaler Seitenfuß). */
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
      .then((d: Weather) => {
        if (cancelled) return;
        // Ausfall wird als 200 + source:"error" + leere Reihen signalisiert.
        if (d.source === "error" || !d.hourly?.time?.length) setFailed(true);
        else setWeather(d);
      })
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
    // Dichte wie der bundesweite 15-Minuten-Feed auf der Startseite. Einstrahlung
    // ist innerhalb einer Stunde glatt genug, dass die Interpolation trägt.
    const b: { ts: string; mw: number }[] = [];
    for (let i = 0; i < n; i++) {
      const hasNext = i + 1 < n;
      const lerp = (a: number, c: number, f: number) => a * (1 - f) + c * f;
      for (let q = 0; q < 4; q++) {
        const f = q / 4;
        const irr = hasNext ? lerp(H.irradiance[i] ?? 0, H.irradiance[i + 1] ?? 0, f) : H.irradiance[i] ?? 0;
        const temp = hasNext ? lerp(H.temperature[i] ?? 15, H.temperature[i + 1] ?? 15, f) : H.temperature[i] ?? 15;
        // calcCurrentPower liefert Watt → MW = W / 1.000.000.
        const watts = calcCurrentPower(totalKwp, irr, temp);
        const ts = `${H.time[i].slice(0, 13)}:${String(q * 15).padStart(2, "0")}`;
        b.push({ ts, mw: watts / 1_000_000 });
      }
    }
    // Aktuelle Viertelstunde als „jetzt"-Balken.
    const cur = weather.current.time; // "YYYY-MM-DDTHH:MM"
    const qMin = String(Math.floor((parseInt(cur.slice(14, 16) || "0", 10)) / 15) * 15).padStart(2, "0");
    const ht = `${cur.slice(0, 13)}:${qMin}`;
    return { bars: b, highlightTs: ht };
  }, [weather, totalKwp]);

  // „Stand HH:MM Uhr" in die Subline — der grüne Live-Punkt entfällt bewusst,
  // weil eine Simulation kein Live-Messwert ist.
  const stand = weather ? `${weather.current.time.slice(11, 16)} Uhr` : null;
  const subline =
    "Simuliert aus dem heutigen Wetter am Standort — kein Messwert" + (stand ? ` · Stand ${stand}` : "");

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
            unit="MW"
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
