"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingDots } from "../../../../components/LoadingDots";
import {
  WidgetFooter,
  WidgetSourceEdge,
  useShareOnlyActions,
} from "../../../../components/WidgetExport";
import { WIDGETS, WIDGET_MAX_WIDTH_COMPACT } from "../../../../lib/widget-registry";
import { useGenerationMix } from "../../../../lib/energy";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../../../lib/widget-settings";
import {
  GENERATION_STACK_KEYS,
  RENEWABLE_KEYS,
  calcPeriodStats,
  formatTime,
  trimIncompleteTail,
} from "../../../../lib/chart-utils";

// EE-Ampel: a compact traffic-light widget answering one question — is the
// German grid mostly renewable RIGHT NOW? Green = good moment to run big
// loads (EV charging, laundry), red = mostly fossil generation.
//
// Data: the existing generation-mix infrastructure (/api/energy/generation via
// useGenerationMix), same as /strommix-deutschland. The current share is read
// off the latest COMPLETE data point (trimIncompleteTail — the newest ~1h of
// Energy-Charts points can miss solar/wind), the 24h mean comes from the
// shared calcPeriodStats. No own data source, no own aggregation.

// Identität (Titel, Teilen-Ziel, Quellen, nächster Schritt) kommt aus dem
// Register — ein Eintrag speist Fußzeile, Quellen-Kante und Zitat.
const WIDGET = WIDGETS.eeAmpel;

// Traffic-light semantics. Fixed semantic colours (green/amber/red) — per
// widget convention these must NEVER follow the host theme.
// Thresholds are anchored at the German renewables share of generation, which
// has averaged roughly 55–60 % across recent years (visible in our own
// /strommix-deutschland dashboard, Energy-Charts data): green = clearly above
// the typical mean, red = clearly below, yellow in between.
const LEVELS = {
  green: {
    color: "#00D950",
    label: "Grün",
    text: "Guter Zeitpunkt – der Strom kommt gerade überwiegend aus erneuerbaren Quellen.",
  },
  yellow: {
    color: "#F5A623",
    label: "Gelb",
    text: "Mittelfeld – der Strommix ist gerade gemischt.",
  },
  red: {
    color: "#EF4444",
    label: "Rot",
    text: "Ungünstiger Zeitpunkt – gerade ist viel fossiler Strom im Netz.",
  },
} as const;

type Level = keyof typeof LEVELS;

function levelForShare(pct: number): Level {
  if (pct >= 65) return "green";
  if (pct >= 40) return "yellow";
  return "red";
}

const REFRESH_MS = 15 * 60 * 1000; // match the live-simulation refresh cadence

export default function EeAmpelWidget() {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  // Kein Bild-Export: die Ampel hat kein aufnehmbares Chart (`exportable: false`
  // im Register). Teilen-Text und -Ziel kommen trotzdem aus dem Register.
  const actions = useShareOnlyActions(WIDGET);

  const { data: genData, error, refetch } = useGenerationMix("de", 24);

  // Keep the light current on long-lived embeds.
  useEffect(() => {
    const id = setInterval(refetch, REFRESH_MS);
    return () => clearInterval(id);
  }, [refetch]);

  // Current EE share = renewables / total generation at the latest complete
  // data point (shared key lists — same categorisation as every mix chart).
  const current = useMemo(() => {
    const trimmed = trimIncompleteTail(genData.data);
    if (!trimmed.length) return null;
    const last = trimmed[trimmed.length - 1];
    let total = 0;
    let renewable = 0;
    for (const key of GENERATION_STACK_KEYS) {
      const val = last[key];
      if (typeof val === "number" && val > 0) {
        total += val;
        if (RENEWABLE_KEYS.includes(key)) renewable += val;
      }
    }
    if (total <= 0) return null;
    return { pct: (renewable / total) * 100, ts: last.ts };
  }, [genData.data]);

  // 24h mean for context, via the shared aggregation.
  const stats = useMemo(
    () => calcPeriodStats(genData.data, genData.resolution),
    [genData.data, genData.resolution],
  );

  const level: Level | null = current ? levelForShare(current.pct) : null;

  return (
    <div
      style={{
        position: "relative",
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: 16,
        paddingRight: 22,
        maxWidth: WIDGET_MAX_WIDTH_COMPACT,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Quelle vertikal an der rechten Kante (geteilter Baustein), nie als
          horizontaler Block. Auf einer eigenen Seite kreditiert die Seite. */}
      <WidgetSourceEdge widget={WIDGET} visible={!settings.onsite} />
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.2, marginBottom: 12 }}>
        EE-Ampel · Strommix Deutschland
      </div>

      {error && !current ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <TrafficLight active={level} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                color: level ? LEVELS[level].color : "var(--widget-fg)",
              }}
            >
              {current ? `${Math.round(current.pct)} %` : <LoadingDots />}
            </div>
            <div style={{ fontSize: 11, color: "var(--widget-muted)", marginTop: 2 }}>
              Anteil Erneuerbare gerade
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.45, marginTop: 8 }}>
              {level ? LEVELS[level].text : "Die aktuellen Erzeugungsdaten werden geladen."}
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--color-text-muted)", paddingTop: 10 }}>
        {current && stats
          ? `Ø letzte 24 Std: ${Math.round(stats.eeSharePct)} % · Stand ${formatTime(current.ts, "time")} Uhr`
          : ""}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2 }} />
        {/* Fußzeile aus dem geteilten Baustein: nächster Schritt, Aktionen
            (inkl. „Zitieren"), Marke. Klein → ⋯-Menü statt Knopfreihe. */}
        <WidgetFooter
          widget={WIDGET}
          chartExport={actions}
          share={settings.share}
          branding={settings.branding}
          showEmbed={settings.embed}
          onsite={settings.onsite}
          compact
        />
      </div>
    </div>
  );
}

/** Vertical three-lamp traffic light; only the active lamp is lit. */
function TrafficLight({ active }: { active: Level | null }) {
  const order: Level[] = ["red", "yellow", "green"];
  return (
    <div
      aria-label={active ? `Ampel: ${LEVELS[active].label}` : "Ampel lädt"}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
        padding: "9px 8px",
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-muted)",
        flexShrink: 0,
      }}
    >
      {order.map((l) => {
        const lit = l === active;
        return (
          <span
            key={l}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: LEVELS[l].color,
              opacity: lit ? 1 : 0.15,
              boxShadow: lit ? `0 0 8px ${LEVELS[l].color}66` : "none",
              transition: "opacity 0.3s ease",
            }}
          />
        );
      })}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 12, color: "var(--widget-muted)" }}>
        Die Daten sind gerade nicht verfügbar.
      </span>
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: "5px 12px",
          fontSize: 11,
          fontWeight: 600,
          background: "var(--widget-accent)",
          color: "var(--widget-accent-fg)",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Erneut versuchen
      </button>
    </div>
  );
}
