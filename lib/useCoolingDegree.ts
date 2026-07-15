"use client";
// Geteilter Kühlgradstunden-Abruf (PLZ → /api/cooling-degree). Genutzt vom
// Klimaanlagen-Rechner UND vom Klima-Detail-Modal im PV-Rechner, damit beide
// dieselben Standort-Wetterdaten (Ø letzte 5 Sommer / letzter Sommer /
// Projektion) und dieselbe Fallback-Logik verwenden — eine Quelle, kein Drift.
import { useState, useCallback } from "react";
import { DEFAULT_AIRCON_CONFIG as CFG } from "./aircon-config";

export type CdhMode = "avg5" | "lastSummer" | "projection";
export type CdhModes = { avg5: number; lastSummer: number; projection: number };
export type CdhSource = "fallback" | "open-meteo" | "cache";
export type HeatwaveInfo = { maxTemp: number; hotDays: number; active: boolean } | null;

/** Bundesweiter Fallback-Satz aus der Config (ohne Standort). */
export function nationalCdhSet(): CdhModes {
  return {
    avg5: CFG.cdhNational,
    lastSummer: Math.round(CFG.cdhNational * CFG.lastSummerFactor),
    projection: Math.round(CFG.cdhNational * CFG.projectionFactor),
  };
}

export function useCoolingDegree() {
  const [cdhSet, setCdhSet] = useState<CdhModes>(nationalCdhSet);
  const [source, setSource] = useState<CdhSource>("fallback");
  const [heatwave, setHeatwave] = useState<HeatwaveInfo>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const fetchForPlz = useCallback(async (plz: string) => {
    if (!/^\d{5}$/.test(plz)) return;
    setLoading(true);
    try {
      const plzRes = await fetch("/plz.json");
      const plzData: Record<string, [number, number]> = await plzRes.json();
      const coords = plzData[plz];
      const prefix = plz.slice(0, 2);
      const qs = coords
        ? `lat=${coords[0]}&lon=${coords[1]}&plzPrefix=${prefix}`
        : `plzPrefix=${prefix}`;
      const res = await fetch(`/api/cooling-degree?${qs}`);
      const data = await res.json();
      if (typeof data.avg5 === "number") {
        setCdhSet({ avg5: data.avg5, lastSummer: data.lastSummer, projection: data.projection });
        setSource(data.source);
      }
      setHeatwave(data.heatwave ?? null);
      setConfirmed(true);
    } catch { /* Fallback-Satz bleibt bestehen */ }
    setLoading(false);
  }, []);

  return { cdhSet, source, heatwave, loading, confirmed, setConfirmed, fetchForPlz };
}
