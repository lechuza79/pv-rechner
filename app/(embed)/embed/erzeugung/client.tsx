"use client";

import { useEffect, useRef, useState } from "react";
import { MastrLiveRadial } from "../../../../components/MastrLiveRadial";
import { parseWidgetThemeQuery } from "../../../../lib/widget-theme";

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
  "--widget-ink",
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
  autoswitchMs = 0,
}: {
  compact?: boolean;
  /** Intervall in Millisekunden für Autoswitch. 0 = aus. */
  autoswitchMs?: number;
}) {
  const [traeger, setTraeger] = useState<Traeger>("gesamt");
  const [installedKwp, setInstalledKwp] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement | null>(null);

  // Autoswitch: wechselt periodisch durch die Energieträger. Pausiert
  // a) solange der Cursor über dem Widget hovert (Desktop)
  // b) 30 s nach manueller Pfeil-Nav oder Touch-Tap (Mobile)
  const lastManualRef = useRef<number>(0);
  const hoveringRef = useRef<boolean>(false);
  useEffect(() => {
    if (autoswitchMs <= 0) return;
    const id = setInterval(() => {
      if (hoveringRef.current) return;
      if (Date.now() - lastManualRef.current < 30_000) return;
      setTraeger((t) => neighbour(t, +1));
    }, autoswitchMs);
    return () => clearInterval(id);
  }, [autoswitchMs]);

  // Static theme via iframe URL params (copy-paste embed code path)
  useEffect(() => {
    const theme = parseWidgetThemeQuery(window.location.search);
    const root = document.documentElement;
    Object.keys(theme).forEach((k) => {
      if (ALLOWED_VARS.indexOf(k) !== -1) root.style.setProperty(k, theme[k]);
    });
  }, []);

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
    <button
      type="button"
      aria-label="Was zeigt dieses Widget?"
      onClick={() => setShowHelp(true)}
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        border: "1px solid var(--color-border)",
        background: "transparent",
        color: "var(--widget-muted)",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
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
  );

  const helpPanel = (
    <div
      ref={helpRef}
      style={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <button
        type="button"
        aria-label="Hilfe schließen"
        onClick={() => setShowHelp(false)}
        style={{
          position: "absolute",
          top: -4,
          right: -4,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: 0,
          background: "transparent",
          color: "var(--widget-muted)",
          fontSize: 18,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
        }}
      >
        ×
      </button>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--widget-fg)",
          paddingRight: 24,
        }}
      >
        Was zeigt das Widget?
      </div>
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--widget-muted)",
          textAlign: "left",
        }}
      >
        {HELP_TEXT}
      </div>
    </div>
  );

  return (
    <div
      // Unsichtbarer Pointer-Event-Wrapper für Autoswitch-Pause bei Hover/Tap.
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hoveringRef.current = true;
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") hoveringRef.current = false;
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") lastManualRef.current = Date.now();
      }}
    >
      <MastrLiveRadial
        energietraeger={traeger}
        installedKwp={installedKwp}
        size={compact ? "compact" : "default"}
        branding
        helpOverlay={showHelp ? helpPanel : null}
        traegerNav={{
          label: TRAEGER_LABEL[traeger],
          onPrev: () => {
            lastManualRef.current = Date.now();
            setTraeger(neighbour(traeger, -1));
          },
          onNext: () => {
            lastManualRef.current = Date.now();
            setTraeger(neighbour(traeger, +1));
          },
          before: "Momentan erzeugt",
          after: helpButton,
        }}
      />
    </div>
  );
}
