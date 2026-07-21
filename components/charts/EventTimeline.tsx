"use client";

/**
 * Interaktive Ereignis-Timeline, horizontal fluchtend zum ZubauTimelineChart
 * darüber (gleiche Plot-Ränder + gleiche ±0,5-Jahres-Domäne). Ein Ereignis ist
 * aktiv und wird darunter erläutert; per Tippen, Wischen oder ←/→ blätterbar.
 * ALLE Erläuterungen liegen im DOM (nur die aktive ist sichtbar) — der Inhalt
 * bleibt für Suchmaschinen vollständig lesbar.
 */

import { useRef } from "react";
import { v } from "../../lib/theme";
import { PLOT_MARGIN } from "./ZubauTimelineChart";

export interface TimelineEvent {
  year: number;
  label: string;
  text: string;
  /** Wer die Entscheidung getroffen hat (regierende Koalition + Ressort), neutral. */
  government?: string;
  /** true = geplant/noch nicht beschlossen (Ausblick) — Dot hohl statt gefüllt. */
  planned?: boolean;
}

interface Props {
  events: TimelineEvent[];
  active: number;
  onChange: (i: number) => void;
  /** Erstes/letztes Jahr der Chart-Achse — für die exakte Ausrichtung. */
  startYear: number;
  endYear: number;
}

export default function EventTimeline({ events, active, onChange, startYear, endYear }: Props) {
  const touchX = useRef<number | null>(null);
  const domainStart = startYear - 0.5;
  const domainEnd = endYear + 0.5;
  const pos = (year: number) => ((year - domainStart) / (domainEnd - domainStart)) * 100;

  // Pale blue = wie der ausgegraute 2026-Balken (Akzent Richtung Hintergrund
  // gemischt). Für geplante Ausblicks-Marken + die Linie zu ihnen.
  const PALE = "color-mix(in srgb, var(--color-accent) 32%, var(--color-bg))";
  const plannedIdx = events.findIndex((e) => e.planned);
  const lastRealIdx = plannedIdx === -1 ? events.length - 1 : Math.max(0, plannedIdx - 1);
  const progressIdx = Math.min(active, lastRealIdx);

  const go = (dir: number) => {
    const n = active + dir;
    if (n >= 0 && n < events.length) onChange(n);
  };

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    flexShrink: 0,
    width: 32,
    height: 32,
    padding: 0,
    boxSizing: "border-box",
    borderRadius: "50%",
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    color: disabled ? v("--color-text-muted") : v("--color-accent"),
    fontSize: 18,
    lineHeight: 1,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  });

  return (
    <div>
      {/* Track — Ränder = Chart-Plot-Ränder, damit die Punkte unter den Balken sitzen.
         Die Verbindungslinie beginnt am ersten Punkt (nicht am linken Rand). */}
      <div style={{ position: "relative", paddingLeft: PLOT_MARGIN.left, paddingRight: PLOT_MARGIN.right }}>
        <div role="tablist" aria-label="Weichenstellungen im Solarausbau" style={{ position: "relative", height: 30 }}>
          {/* Graue Grundlinie bis zum letzten echten Ereignis */}
          <div
            style={{
              position: "absolute",
              left: `${pos(events[0].year)}%`,
              width: `${pos(events[lastRealIdx].year) - pos(events[0].year)}%`,
              top: 14,
              height: 2,
              background: v("--color-border"),
            }}
          />
          {/* Pale-blaue Linie zum geplanten Ausblick (wie der 2026-Balken) */}
          {plannedIdx !== -1 && (
            <div
              style={{
                position: "absolute",
                left: `${pos(events[lastRealIdx].year)}%`,
                width: `${pos(events[events.length - 1].year) - pos(events[lastRealIdx].year)}%`,
                top: 14,
                height: 2,
                background: PALE,
              }}
            />
          )}
          {/* Akzent-Fortschritt bis zum aktiven Ereignis (gedeckelt am letzten echten) */}
          <div
            style={{
              position: "absolute",
              left: `${pos(events[0].year)}%`,
              width: `${pos(events[progressIdx].year) - pos(events[0].year)}%`,
              top: 14,
              height: 2,
              background: v("--color-accent"),
              transition: "width .25s ease, left .25s ease",
            }}
          />
          {events.map((e, i) => {
            const isActive = i === active;
            const isPlanned = !!e.planned;
            const d = isActive ? 24 : 15;
            return (
              <button
                key={e.year}
                role="tab"
                aria-selected={isActive}
                aria-controls={`ev-panel-${i}`}
                id={`ev-tab-${i}`}
                onClick={() => onChange(i)}
                title={`${e.year} · ${e.label}`}
                style={{
                  position: "absolute",
                  left: `${pos(e.year)}%`,
                  top: 15 - d / 2,
                  transform: "translateX(-50%)",
                  width: d,
                  height: d,
                  padding: 0,
                  boxSizing: "border-box",
                  borderRadius: "50%",
                  border: `2px solid ${v("--color-bg")}`,
                  cursor: "pointer",
                  background: isPlanned ? PALE : v("--color-accent"),
                  color: v("--color-bg"),
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: v("--font-text"),
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isActive ? `0 2px 6px rgba(19,101,234,0.35)` : "none",
                  transition: "all .2s ease",
                  zIndex: isActive ? 2 : 1,
                }}
              >
                {isActive ? i + 1 : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Erläuterung — alle Panels im DOM, nur das aktive sichtbar */}
      <div
        tabIndex={0}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (dx < -40) go(1);
          else if (dx > 40) go(-1);
          touchX.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(-1);
          }
        }}
        style={{
          marginTop: 12,
          outline: "none",
          paddingLeft: PLOT_MARGIN.left,
          paddingRight: PLOT_MARGIN.right,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => go(-1)} disabled={active === 0} aria-label="Vorheriges Ereignis" style={navBtn(active === 0)}>
            ‹
          </button>
          <div style={{ flex: 1, minHeight: 92 }}>
            {events.map((e, i) => (
              <div key={e.year} id={`ev-panel-${i}`} role="tabpanel" aria-labelledby={`ev-tab-${i}`} hidden={i !== active}>
                <div style={{ fontSize: 15, fontWeight: 800, color: v("--color-text-primary"), marginBottom: 3 }}>
                  <span style={{ fontFamily: v("--font-mono"), color: v("--color-accent") }}>{e.year}</span>
                  {"  ·  "}
                  {e.label}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: v("--color-text-secondary") }}>{e.text}</div>
                {e.government && (
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: v("--color-text-muted"), marginTop: 6 }}>
                    <strong style={{ fontWeight: 700 }}>Regierung:</strong> {e.government}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => go(1)}
            disabled={active === events.length - 1}
            aria-label="Nächstes Ereignis"
            style={navBtn(active === events.length - 1)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
