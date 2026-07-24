"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GemeindePotentialBlock from "./GemeindePotential";
import { computeGemeindePotential, type GemeindePotential } from "../../lib/gemeinde-potential";
import { IconArrowRight } from "../Icons";
import { v, space, pad } from "../../lib/theme";

// Client-nachgeladener „Was das für Sie bedeutet"-Block. Nur der Standort-Ertrag
// (PVGIS) blockierte sonst den Server-Render der Gemeinde-Seite (~6,7 s), obwohl
// er ausschließlich diese drei Beispielrechnungen speist. Der Rest der Seite
// (alle Bestandszahlen) steht jetzt sofort; dieser Block holt den Ertrag über
// /api/pvgis (CDN-gecacht) und rechnet mit DERSELBEN puren Funktion wie zuvor die
// Seite (computeGemeindePotential) — gleiche Eingaben, gleiche Zahlen. Während des
// Ladens rendert der Block schon (Label/Layout/Links stehen), nur die Zahlen sind
// LoadingDots (p === null) — Preloader-Konvention wie in den MaStR-Hero-Kacheln.

type PvgisResponse = { annual: number; monthly: number[] | null };

export default function GemeindePotentialClient({
  plz,
  lat,
  lon,
}: {
  plz: string | null;
  lat: number | null;
  lon: number | null;
}) {
  const [potential, setPotential] = useState<GemeindePotential | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Dieselben Parameter, die die Seite früher server-seitig an getPvgisYield
    // gab: echte Koordinaten wenn vorhanden, sonst PLZ-Präfix → Bundesland-
    // Fallback (identisch zur alten Server-Logik, die Route ist NaN-sicher).
    const params = new URLSearchParams();
    if (lat != null && Number.isFinite(lat)) params.set("lat", String(lat));
    if (lon != null && Number.isFinite(lon)) params.set("lon", String(lon));
    if (plz) params.set("plzPrefix", plz.slice(0, 2));
    fetch(`/api/pvgis?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("pvgis"))))
      .then((d: PvgisResponse) => {
        if (cancelled) return;
        setPotential(computeGemeindePotential({ annual: d.annual, monthly: d.monthly }));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [plz, lat, lon]);

  // /api/pvgis liefert praktisch immer 200 (eigener Fallback), ein Fehler kommt
  // höchstens vom Rate-Limit. Dann keine ewig laufenden Punkte, sondern der Weg
  // zum Rechner bleibt erhalten — wie im „kein Standort"-Fall der Seite.
  if (failed) {
    return (
      <div style={S.section}>
        <Link href={`/photovoltaik-rechner${plz ? `?plz=${plz}&a=2` : "?a=2"}`} style={S.cta}>
          Rentabilität einer PV-Anlage berechnen <IconArrowRight size={14} />
        </Link>
      </div>
    );
  }

  // p === null → Block rendert Layout + Links sofort, Zahlen als LoadingDots.
  return <GemeindePotentialBlock plz={plz} p={potential} />;
}

const S: Record<string, React.CSSProperties> = {
  section: { marginBottom: space.huge },
  cta: {
    display: "inline-flex",
    alignItems: "center",
    gap: space.sm,
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    padding: pad("lg", "xl"),
    borderRadius: v("--radius-md"),
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
  },
};
