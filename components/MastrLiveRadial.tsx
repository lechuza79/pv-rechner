"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { v } from "../lib/theme";
import { trimIncompleteTail } from "../lib/chart-utils";
import InfoTooltip from "./InfoTooltip";

type Energietraeger = "solar" | "wind" | "biomasse" | "wasser" | "speicher" | "gesamt";

type GenerationPoint = {
  ts: string;
  solar?: number | null;
  wind_onshore?: number | null;
  wind_offshore?: number | null;
  biomass?: number | null;
  hydro_run_of_river?: number | null;
  hydro_water_reservoir?: number | null;
  [key: string]: number | string | null | undefined;
};

function extractMW(p: GenerationPoint, et: Energietraeger): number | null {
  const n = (x: number | null | undefined) => (typeof x === "number" ? x : null);
  const sum = (...xs: (number | null | undefined)[]) => {
    const nums = xs.map(n).filter((x): x is number => x !== null);
    return nums.length ? nums.reduce((s, x) => s + x, 0) : null;
  };
  switch (et) {
    case "solar":
      return n(p.solar);
    case "wind":
      return sum(p.wind_onshore, p.wind_offshore);
    case "biomasse":
      return n(p.biomass);
    case "wasser":
      return sum(p.hydro_run_of_river, p.hydro_water_reservoir);
    case "gesamt":
      return sum(
        p.solar,
        p.wind_onshore,
        p.wind_offshore,
        p.biomass,
        p.hydro_run_of_river,
        p.hydro_water_reservoir,
      );
    default:
      return null;
  }
}

type Bar = { ts: string; mw: number };

export type SizeVariant = "default" | "compact";

const DIM = {
  default: {
    size: 240,
    innerR: 50,
    outerR: 104,
    minBarR: 2,
    hitStroke: 18,
    barStroke: 2.2,
    barStrokeLatest: 3,
    barStrokeHover: 3.4,
    centerBig: 30,
    centerLabel: 11,
    chevron: 24,
    chevronFont: 18,
    titleFont: 13,
    beforeFont: 12,
  },
  compact: {
    size: 160,
    innerR: 36,
    outerR: 72,
    minBarR: 1.5,
    hitStroke: 14,
    barStroke: 1.6,
    barStrokeLatest: 2.2,
    barStrokeHover: 2.6,
    centerBig: 20,
    centerLabel: 9,
    chevron: 20,
    chevronFont: 15,
    titleFont: 12,
    beforeFont: 11,
  },
} as const;

function chevronBtnStyle(width: number, fontSize: number): React.CSSProperties {
  return {
    width,
    height: width,
    border: "none",
    background: "transparent",
    color: "var(--color-text-secondary)",
    fontSize,
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  };
}

function pointAt(
  cx: number,
  cy: number,
  visualAngleDeg: number,
  r: number,
): [number, number] {
  const rad = ((visualAngleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function visualAngleFromHour(h: number): number {
  return ((h - 12) / 24) * 360;
}

function visualAngleFromTs(ts: string): number {
  const d = new Date(ts);
  const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  return visualAngleFromHour(h);
}

export type TraegerNav = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** Text/JSX shown left of the prev arrow (e.g. "Momentan erzeugt") */
  before?: React.ReactNode;
  /** JSX shown right of the next arrow (e.g. a help button) */
  after?: React.ReactNode;
};

export function MastrLiveRadial({
  energietraeger,
  installedKwp,
  traegerNav,
  size = "default",
  branding = false,
  helpOverlay = null,
}: {
  energietraeger: Energietraeger;
  installedKwp: number | null;
  traegerNav?: TraegerNav;
  size?: SizeVariant;
  /** Renders a small "Powered by Solar-Check.io" footer (for embeds). */
  branding?: boolean;
  /** When set, replaces the chart content with this node (e.g. help screen).
      Container border + padding are preserved so the flip looks like a
      back-side of the same card. */
  helpOverlay?: React.ReactNode;
}) {
  const dim = DIM[size];
  const SIZE = dim.size;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const INNER_R = dim.innerR;
  const OUTER_R = dim.outerR;
  const MIN_BAR_R = dim.minBarR;
  const HIT_STROKE = dim.hitStroke;
  const isCompact = size === "compact";

  // Rohdaten werden NUR durch Fetches geändert, NICHT beim Energieträger-
  // Wechsel. Damit bleibt das Widget beim Tab-Switch sichtbar (kein Blitz),
  // nur die abgeleiteten bars/latest/scaleMaxMw werden neu berechnet.
  const [rawPoints, setRawPoints] = useState<GenerationPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      setLoading(true);
      fetch("/api/energy/generation?hours=24")
        .then((r) => r.json())
        .then((d: { data?: GenerationPoint[] }) => {
          if (cancelled) return;
          setRawPoints(d.data ?? []);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setLoading(false);
        });
    };
    load();
    // Energy-Charts veröffentlicht 15-Min-Intervalle, die API-Route cached
    // s-maxage=300. Wir pollen alle 90 Sekunden — neue Werte kommen damit
    // spätestens 90 s nach Veröffentlichung (in der Praxis aus dem CDN-Cache).
    const id = setInterval(load, 90 * 1000);

    // Page Visibility: beim Zurückwechseln zum Tab sofortiger Refresh,
    // damit der jüngste Wert immer aktuell ist, auch nach langer Inaktivität.
    const onVisible = () => {
      if (typeof document !== "undefined" && !document.hidden) load();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }

    return () => {
      cancelled = true;
      clearInterval(id);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, []);

  // Abgeleitete bars + Skala — synchron pro Render, wechselt sofort beim
  // Energieträger-Tausch ohne Loading-Flash.
  const { bars, scaleMaxMw } = useMemo(() => {
    // Cut the latency tail where weather-dependent carriers (solar/wind) aren't
    // reported yet — otherwise "gesamt" would omit them and read smaller than a
    // single sub-carrier. The generation endpoint already trims this, but we
    // re-apply the shared helper here so the widget is correct even if fed an
    // untrimmed/cached series. Robust across all laggy carriers, not just solar.
    const usable = trimIncompleteTail(rawPoints);
    const seq: Bar[] = [];
    let maxGesamtMw = 0;
    for (const p of usable) {
      const total = extractMW(p, "gesamt");
      if (total !== null && total > maxGesamtMw) maxGesamtMw = total;
      const mw = extractMW(p, energietraeger);
      if (mw === null) continue;
      seq.push({ ts: p.ts, mw });
    }
    return { bars: seq, scaleMaxMw: Math.max(1, maxGesamtMw) };
  }, [rawPoints, energietraeger]);
  const latest: Bar | null = bars.length ? bars[bars.length - 1] : null;

  const [hover, setHover] = useState<Bar | null>(null);
  const [shownMw, setShownMw] = useState<number>(0);
  const shownMwRef = useRef<number>(0);

  // Smooth value transition (RAF-driven easeOutCubic over ~250 ms)
  useEffect(() => {
    if (!latest) return;
    const target = (hover ?? latest).mw;
    const start = shownMwRef.current;

    if (start === 0 && target !== 0) {
      shownMwRef.current = target;
      setShownMw(target);
      return;
    }
    if (Math.abs(start - target) < 0.01) return;

    const startTime = performance.now();
    const duration = 250;
    let rafId = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = start + (target - start) * eased;
      shownMwRef.current = val;
      setShownMw(val);
      if (t < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [hover, latest]);

  if (loading || !latest) return null;

  // Skala identisch über alle Tabs: höchster Gesamt-Wert der letzten 24h.
  // Gesamt füllt den ganzen Bar-Bereich, Solar/Wind/Bio/Wasser entsprechend
  // anteilig.
  const maxMw = scaleMaxMw;

  // Center shows hover ?? latest. Position stays fixed via flex-center; only
  // the value text swaps in place. The number itself is animated via shownMw.
  const display = hover ?? latest;
  const animatedGW = shownMw / 1000;
  const displayPct =
    installedKwp && installedKwp > 0 ? ((display.mw * 1000) / installedKwp) * 100 : null;
  const displayDate = new Date(display.ts);
  const displayClock = displayDate.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const minutesAgo = hover ? null : Math.round((Date.now() - displayDate.getTime()) / 60000);
  const freshness =
    hover || minutesAgo === null || minutesAgo >= 60
      ? `${displayClock} Uhr`
      : minutesAgo < 1
        ? "gerade eben"
        : `vor ${minutesAgo} Min`;

  const accentBars = v("--color-accent");
  const accentLatest = v("--color-highlight");
  const labelColor = "rgba(0,0,0,0.45)";

  // 4 alternating section rings (25/50/75/100% of bar length)
  const sectionRings = [0.25, 0.5, 0.75, 1].map((q, i) => ({
    r: INNER_R + q * (OUTER_R - INNER_R),
    opacity: i % 2 === 0 ? 0.06 : 0.14,
  }));

  const isFlipped = helpOverlay != null;
  const cardStyle: React.CSSProperties = {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 12,
    padding: isCompact ? "12px 20px 14px" : "16px 20px 24px",
    // Compact = Box passt sich dem Inhalt an (hug content); Default
    // bleibt block-Level (volle Container-Breite).
    display: isCompact ? "inline-block" : "block",
  };

  return (
    <div
      style={{
        perspective: "1200px",
        display: isCompact ? "inline-block" : "block",
      }}
    >
      <div
        style={{
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(.4,.0,.2,1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Vorderseite — definiert die Höhe des Flip-Containers.
            Opacity-Fade auf der Halbzeit der Flip-Anim verdeckt das SVG,
            das in manchen Browsern durch backface-visibility durchscheint. */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            opacity: isFlipped ? 0 : 1,
            transition: "opacity 0.12s ease 0.22s",
          }}
        >
          <div style={cardStyle}>
      {traegerNav ? (
        <div
          style={{
            position: "relative",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {/* Zeile 1: ● Momentan erzeugt — primary, fett, mittig */}
          {traegerNav.before !== null && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: dim.beforeFont,
                fontWeight: 600,
                color: v("--color-text-primary"),
                whiteSpace: "nowrap",
              }}
            >
              <span
                aria-hidden="true"
                className="sc-live-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: v("--color-highlight"),
                  // Dezente Outline, damit der Punkt auch bei Highlight-Tokens
                  // sichtbar bleibt, die zum Host-BG zu nah liegen.
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
                }}
              />
              {traegerNav.before ?? "Momentan erzeugt"}
              <span
                style={{
                  fontWeight: 400,
                  color: v("--color-text-secondary"),
                  marginLeft: 4,
                  // Feste Mindestbreite, damit das Widget beim Hover-Wechsel
                  // ("vor 88 Min" → "14:30 Uhr") nicht horizontal springt.
                  display: "inline-block",
                  minWidth: 86,
                  textAlign: "left",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                · {freshness}
              </span>
            </div>
          )}

          {/* Help-Button absolute am rechten Rand der ersten Zeile (nur Default).
              In Compact wandert der Help-Slot in den Container-Footer. */}
          {!isCompact && traegerNav.after && (
            <div style={{ position: "absolute", right: 0, top: 0 }}>
              {traegerNav.after}
            </div>
          )}

          {/* Zeile 2: ‹ Träger › — sekundär, leichter, mittig.
              Gleiche Schriftgröße wie "Momentan erzeugt" für ruhigen Header. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              fontSize: dim.beforeFont,
              color: v("--color-text-secondary"),
              marginTop: traegerNav.before !== null ? 4 : 0,
            }}
          >
            <button
              type="button"
              aria-label="Vorheriger Energieträger"
              onClick={traegerNav.onPrev}
              style={chevronBtnStyle(dim.chevron, dim.chevronFont)}
            >
              ‹
            </button>
            <span style={{ minWidth: isCompact ? 80 : 110, textAlign: "center" }}>
              {traegerNav.label}
            </span>
            <button
              type="button"
              aria-label="Nächster Energieträger"
              onClick={traegerNav.onNext}
              style={chevronBtnStyle(dim.chevron, dim.chevronFont)}
            >
              ›
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: v("--color-text-muted"),
            marginBottom: 4,
          }}
        >
          <span
            aria-hidden="true"
            className="sc-live-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: v("--color-highlight"),
            }}
          />
          Im Moment erzeugt
        </div>
      )}

      <div style={{ position: "relative", width: SIZE, maxWidth: "100%", margin: "0 auto" }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width="100%"
          height="auto"
          style={{ display: "block" }}
          role="img"
          aria-label="24-Stunden-Verlauf"
        >
          <defs>
            <filter
              id="mastr-radial-center-shadow"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="0"
                dy="1.5"
                stdDeviation="2.5"
                floodColor="rgba(0,0,0,0.18)"
              />
            </filter>
          </defs>

          {/* 4 Section-Kreise (25/50/75/100% der Bar-Länge), alternierende Deckkraft */}
          {sectionRings.map((s) => (
            <circle
              key={s.r}
              cx={CX}
              cy={CY}
              r={s.r}
              fill="none"
              stroke="rgba(0,0,0,1)"
              strokeOpacity={s.opacity}
              strokeWidth={1}
            />
          ))}

          {/* Bars: visible stroke + invisible wider hit-area for easier hover.
              <g key={energietraeger}> erzwingt Re-Mount der Bars bei Tab-
              Wechsel — die sc-bar-grow-Stagger-Animation läuft dann erneut.
              Das Widget selbst (Container, Header, Center-Kreis) bleibt
              gemountet (kein Blitz), weil rawPoints entkoppelt sind. */}
          <g key={energietraeger}>
            {bars.map((b, i) => {
              const va = visualAngleFromTs(b.ts);
              const ratio = Math.min(1, b.mw / maxMw);
              const len = ratio > 0 ? MIN_BAR_R + (OUTER_R - INNER_R - MIN_BAR_R) * ratio : 0;
              const [x1, y1] = pointAt(CX, CY, va, INNER_R);
              const [x2, y2] = pointAt(CX, CY, va, INNER_R + len);
              const [hx2, hy2] = pointAt(CX, CY, va, OUTER_R);
              const isLatest = i === bars.length - 1 && b.mw > 0;
              const isHover = hover?.ts === b.ts;
              return (
                <g
                  key={b.ts}
                  onPointerEnter={() => setHover(b)}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "mouse") {
                      setHover((h) => (h?.ts === b.ts ? null : h));
                    }
                  }}
                  onPointerDown={() => setHover(b)}
                  style={{ cursor: "pointer", touchAction: "manipulation" }}
                >
                  {/* Outline-Line bei aktiven/jüngsten Bars — sorgt dafür,
                      dass die Highlight-Bar auch bei zarten Highlight-Tokens
                      auf hellen Hintergründen sichtbar bleibt. */}
                  {(isHover || isLatest) && ratio > 0 && (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="rgba(0,0,0,0.10)"
                      strokeWidth={
                        (isHover ? dim.barStrokeHover : dim.barStrokeLatest) + 2
                      }
                      strokeLinecap="round"
                      pointerEvents="none"
                      style={{
                        animation: "sc-bar-grow 0.35s ease-out backwards",
                        animationDelay: `${i * 6}ms`,
                        transition:
                          "x2 0.4s cubic-bezier(.4,.0,.2,1), y2 0.4s cubic-bezier(.4,.0,.2,1)",
                      }}
                    />
                  )}
                  {/* Line immer gerendert (kein conditional mount), damit
                      x2/y2-Transition zwischen Energieträgern smooth läuft.
                      Bei ratio=0 (Solar nachts) wird sie via opacity 0
                      unsichtbar — bleibt aber als Element bestehen. */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isHover || isLatest ? accentLatest : accentBars}
                    strokeWidth={
                      isHover
                        ? dim.barStrokeHover
                        : isLatest
                          ? dim.barStrokeLatest
                          : dim.barStroke
                    }
                    strokeLinecap="round"
                    opacity={ratio > 0 ? (isHover || isLatest ? 1 : 0.85) : 0}
                    style={{
                      // Stagger-Aufbau beim Energieträger-Wechsel (via Re-Mount
                      // durch das parent <g key={energietraeger}>). Bei 90s-
                      // Refresh ohne Wechsel: keine Animation, nur Transition
                      // auf den Geometrie-Attributen für smooth Werte-Updates.
                      animation: "sc-bar-grow 0.35s ease-out backwards",
                      animationDelay: `${i * 6}ms`,
                      transition:
                        "x2 0.4s cubic-bezier(.4,.0,.2,1), y2 0.4s cubic-bezier(.4,.0,.2,1), opacity 0.3s ease, stroke 0.2s ease, stroke-width 0.15s ease",
                    }}
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={hx2}
                    y2={hy2}
                    stroke="transparent"
                    strokeWidth={HIT_STROKE}
                    strokeLinecap="butt"
                    pointerEvents="stroke"
                  />
                </g>
              );
            })}
          </g>

          {/* Hintergrund-Kreis ÜBER den Bars mit Drop-Shadow.
              Schneidet die Bar-Caps unten leicht an und wirft Schatten nach
              außen — gibt visuelle Tiefe. Fill folgt dem Theme-Hintergrund. */}
          <circle
            cx={CX}
            cy={CY}
            r={INNER_R}
            fill="var(--color-bg)"
            filter="url(#mastr-radial-center-shadow)"
          />
        </svg>

        {/* Zentrum: Wert (Position bleibt fest, Inhalt swappt bei Hover) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: dim.centerBig,
              fontWeight: 700,
              color: v("--color-text-primary"),
              fontVariantNumeric: "tabular-nums",
              fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
              letterSpacing: -0.3,
              lineHeight: 1,
            }}
          >
            {animatedGW.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
          <div
            style={{
              fontSize: dim.centerLabel,
              color: labelColor,
              marginTop: 3,
              letterSpacing: 0.5,
            }}
          >
            GW
          </div>
        </div>
      </div>

      {/* Compact: Help-Slot unten rechts (kein Auslastung-Footer in Compact).
          Bei branding wandert der ?-Slot in den Branding-Footer (gleiche Zeile
          wie "Powered by", damit nichts doppelt unten steht). */}
      {isCompact && traegerNav?.after && !branding && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 6,
          }}
        >
          {traegerNav.after}
        </div>
      )}

      {/* Auslastung-Zeile (folgt dem aktuellen oder dem Hover-Wert) — nur in Default-Größe */}
      {!isCompact && displayPct !== null && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: `1px solid ${v("--color-border")}`,
            fontSize: 12,
            color: v("--color-text-secondary"),
            fontVariantNumeric: "tabular-nums",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Auslastung
            <InfoTooltip ariaLabel="Was bedeutet Auslastung?" size={14}>
              Anteil der gerade produzierten Leistung an der gesamten installierten
              Leistung. Bei Solar tagsüber typisch 20–50 %, nachts 0 %.
            </InfoTooltip>
          </span>
          <span style={{ color: v("--color-text-primary"), fontWeight: 600 }}>
            {displayPct.toFixed(0)}%
          </span>
        </div>
      )}

      {branding && (
        <div
          style={{
            marginTop: 10,
            fontSize: 10,
            color: v("--color-text-muted"),
            letterSpacing: 0.2,
            display: "flex",
            // Default: Powered by zentriert. Compact: links + Help rechts.
            justifyContent: isCompact ? "space-between" : "center",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>
            Powered by{" "}
            <a
              href="https://solar-check.io"
              target="_blank"
              rel="noopener"
              style={{
                color: v("--color-accent"),
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              solar-check.io
            </a>
          </span>
          {isCompact && traegerNav?.after && <span>{traegerNav.after}</span>}
        </div>
      )}
          </div>
        </div>

        {/* Rückseite — overlay über Vorderseite, gleiche Maße.
            Opacity-Fade gegengleich zur Vorderseite. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            opacity: isFlipped ? 1 : 0,
            transition: "opacity 0.12s ease 0.22s",
          }}
        >
          <div style={{ ...cardStyle, height: "100%" }}>{helpOverlay}</div>
        </div>
      </div>
    </div>
  );
}
