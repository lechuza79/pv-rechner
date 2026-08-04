"use client";
import { useState } from "react";
import Link from "next/link";
import { iconSizes, space, v } from "../../../lib/theme";
import { IconArrowRight } from "../../../components/Icons";
import {
  TILT_ORIENTATIONS,
  TILT_TABLE,
  tiltPct,
  type TiltOrientation,
} from "../../../lib/tilt-config";

const ANGLE_OPTIONS = TILT_TABLE.map((r) => r.angle);

/** Interactive quick check: pick orientation + tilt, read the share of the
 *  optimal yield. Reads the same table the page prints — no second data set. */
export default function TiltCheck() {
  const [orientation, setOrientation] = useState<TiltOrientation>("sued");
  const [angle, setAngle] = useState(35);
  const pct = tiltPct(orientation, angle);

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: v("--radius-md"),
    border: `1px solid ${active ? v("--color-accent") : v("--color-border")}`,
    background: active ? v("--color-bg-accent") : v("--color-bg"),
    color: active ? v("--color-accent") : v("--color-text-secondary"),
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <div style={{ border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: `${space.xl}px`, background: v("--color-bg") }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-secondary"), marginBottom: space.md }}>
        Ausrichtung deines Dachs
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg }}>
        {TILT_ORIENTATIONS.map((o) => (
          <button key={o.key} type="button" style={chip(o.key === orientation)} onClick={() => setOrientation(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-secondary"), marginBottom: space.md }}>
        Dachneigung
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg }}>
        {ANGLE_OPTIONS.map((a) => (
          <button key={a} type="button" style={chip(a === angle)} onClick={() => setAngle(a)}>
            {a}°
          </button>
        ))}
      </div>
      <div style={{ background: v("--color-bg-muted"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: `${space.lg}px ${space.xl}px`, marginBottom: space.lg }}>
        <span style={{ fontFamily: v("--font-mono"), fontSize: 28, fontWeight: 700, color: v("--color-text-primary") }}>
          {pct}
        </span>
        <span style={{ fontSize: 14, color: v("--color-text-secondary"), marginLeft: 4 }}>
          % des optimalen Ertrags
        </span>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary"), marginTop: 4 }}>
          {pct >= 95
            ? "Dein Dach liegt praktisch im Optimum — die Ausrichtung ist kein Thema mehr."
            : pct >= 80
            ? "Ein guter Wert: Der Unterschied zum perfekten Dach ist kleiner, als er sich anfühlt."
            : pct >= 60
            ? "Machbar, aber mit spürbarem Abschlag — ob es sich rechnet, entscheidet die Gesamtrechnung."
            : "Deutlicher Abschlag — falls es andere Dachflächen gibt, gehören die zuerst belegt."}
        </div>
      </div>
      <Link
        href="/pv-simulation"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: v("--radius-md"), fontSize: 14, fontWeight: 700, background: v("--color-accent"), color: v("--color-text-on-accent"), textDecoration: "none" }}
      >
        Live-Ertrag an deinem Standort ansehen <IconArrowRight size={iconSizes.sm} />
      </Link>
    </div>
  );
}
