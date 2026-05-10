"use client";

import { useEffect, useRef, useState } from "react";
import { MastrLiveRadial } from "../../../../components/MastrLiveRadial";

// ─── Configuration ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://sebastianschaeder.de",
  "https://www.sebastianschaeder.de",
  "https://solar-check.io",
  "https://www.solar-check.io",
  "http://localhost:4321",
  "http://localhost:4322",
  "http://localhost:3041",
  "http://localhost:3000",
];

const ALLOWED_VARS = [
  "--widget-bg",
  "--widget-fg",
  "--widget-muted",
  "--widget-accent",
  "--widget-accent-fg",
  "--widget-highlight",
  "--widget-border-radius",
  "--widget-font-family",
];

type Traeger = "gesamt" | "solar" | "wind" | "biomasse" | "wasser";

const TRAEGER_ORDER: Traeger[] = ["gesamt", "solar", "wind", "biomasse", "wasser"];

const TRAEGER_LABEL: Record<Traeger, string> = {
  gesamt: "Erneuerbare Gesamt",
  solar: "Solar",
  wind: "Wind",
  biomasse: "Biomasse",
  wasser: "Wasser",
};

const HELP_TEXT =
  "Aktuelle Stromerzeugung in Deutschland nach Energieträger. Der Außenring zeigt den 24-Stunden-Verlauf nach Tageszeit (12 Uhr oben, 18 rechts, 0 unten, 6 links). Die Mitte zeigt den jüngsten Wert. Live-Daten von Energy-Charts (Fraunhofer ISE), aktualisiert alle 15 Minuten mit ~60 Min Lag.";

function neighbour(t: Traeger, step: -1 | 1): Traeger {
  const idx = TRAEGER_ORDER.indexOf(t);
  const next = (idx + step + TRAEGER_ORDER.length) % TRAEGER_ORDER.length;
  return TRAEGER_ORDER[next];
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function ErzeugungWidget({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [traeger, setTraeger] = useState<Traeger>("gesamt");
  const [installedKwp, setInstalledKwp] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement | null>(null);

  // postMessage theme override
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (ALLOWED_ORIGINS.indexOf(event.origin) === -1) return;
      const payload = event.data as { type?: unknown; vars?: unknown } | undefined;
      if (!payload || payload.type !== "widget:theme") return;

      const vars =
        payload.vars && typeof payload.vars === "object"
          ? (payload.vars as Record<string, unknown>)
          : {};
      const root = document.documentElement;

      if (Object.keys(vars).length === 0) {
        ALLOWED_VARS.forEach((k) => root.style.removeProperty(k));
        return;
      }

      Object.keys(vars).forEach((k) => {
        const val = vars[k];
        if (ALLOWED_VARS.indexOf(k) !== -1 && typeof val === "string") {
          root.style.setProperty(k, val);
        }
      });
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Click-outside to close help tooltip on touch devices
  useEffect(() => {
    if (!showHelp) return;
    function close(e: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setShowHelp(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showHelp]);

  // Fetch installed capacity for the selected traeger
  useEffect(() => {
    let cancelled = false;
    setInstalledKwp(null);
    fetch(`/api/mastr/summary?region=de&type=${traeger}&segment=alle`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setInstalledKwp(typeof d?.total_kwp === "number" ? d.total_kwp : null);
      })
      .catch(() => {
        if (!cancelled) setInstalledKwp(null);
      });
    return () => {
      cancelled = true;
    };
  }, [traeger]);

  const helpButton = (
    <div ref={helpRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Was zeigt dieses Widget?"
        aria-expanded={showHelp}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setShowHelp(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setShowHelp(false);
        }}
        onClick={() => setShowHelp(!showHelp)}
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "1px solid var(--color-border)",
          background: "transparent",
          color: "var(--widget-muted)",
          fontSize: 11,
          fontWeight: 600,
          cursor: "help",
          userSelect: "none",
          lineHeight: 1,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
        }}
      >
        ?
      </button>
      {showHelp && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 240,
            background: "var(--widget-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            fontSize: 11,
            lineHeight: 1.4,
            color: "var(--widget-fg)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
            zIndex: 20,
            fontWeight: 400,
            textAlign: "left",
          }}
        >
          {HELP_TEXT}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: compact ? 12 : 20,
        boxSizing: "border-box",
      }}
    >
      <MastrLiveRadial
        energietraeger={traeger}
        installedKwp={installedKwp}
        size={compact ? "compact" : "default"}
        traegerNav={{
          label: TRAEGER_LABEL[traeger],
          onPrev: () => setTraeger(neighbour(traeger, -1)),
          onNext: () => setTraeger(neighbour(traeger, +1)),
          before: "Momentan erzeugt",
          after: helpButton,
        }}
      />
    </div>
  );
}
