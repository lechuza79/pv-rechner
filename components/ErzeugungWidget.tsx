"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MastrLiveRadial } from "./MastrLiveRadial";
import { useWidgetTheme } from "../lib/useWidgetTheme";
import { DATA_SOURCES } from "../lib/data-sources";
import { WIDGETS, WIDGET_MAX_WIDTH_COMPACT } from "../lib/widget-registry";
import {
  ExportNotesProvider,
  WidgetExportFooter,
  WidgetFooter,
  WidgetSourceEdge,
} from "./WidgetExport";
import { useChartExport } from "../lib/useChartExport";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../lib/widget-settings";
import { v } from "../lib/theme";

// Identität (Titel, Teilen-Ziel, Quellen, nächster Schritt) kommt aus dem
// Register — ein Eintrag speist Fußzeile, Quellen-Kante und Bild-Fuß.
const WIDGET = WIDGETS.erzeugung;

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
  "Erneuerbare Stromerzeugung in Deutschland. Der Außenring ist ein 24-Stunden-Ziffernblatt (Mittag oben, Mitternacht unten) — jeder Wert steht an seiner Uhrzeit. Die jüngsten Balken, für die Solar noch nicht gemeldet ist, sind blasser blau (nur die übrigen Erneuerbaren); im Solar-Modus bleiben sie leer. Live-Daten von Energy-Charts (Fraunhofer ISE), ~1 h Lag, Solar ~2 h.";

function neighbour(t: Traeger, step: -1 | 1): Traeger {
  const idx = TRAEGER_ORDER.indexOf(t);
  const next = (idx + step + TRAEGER_ORDER.length) % TRAEGER_ORDER.length;
  return TRAEGER_ORDER[next];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ErzeugungWidget({
  compact = false,
  autoswitchMs = 0,
  onsite = false,
  highlightTs,
  nackt = false,
}: {
  compact?: boolean;
  /** Intervall in Millisekunden für Autoswitch. 0 = aus. */
  autoswitchMs?: number;
  /**
   * Direkt auf einer eigenen Seite gerendert (statt als iframe unter
   * `?onsite=1`). Dann trägt die Seite Quelle und Marke, das Widget nicht.
   * Nötig, weil `onsite` sonst nur aus der Adresse käme — und die gehört auf
   * einer eigenen Seite dem Seiteninhalt, nicht dem Widget.
   */
  onsite?: boolean;
  /** Welcher Balken „jetzt" ist. Gesetzt, wenn daneben etwas anderes denselben
   *  Moment zeigt (der Mix-Donut auf der Strommix-Seite). */
  highlightTs?: string;
  /**
   * Ausschnitt auf einer eigenen Seite: keine Fußzeile. Die Widget-Konvention
   * sieht CTA, Aktionen und Marke für den EMBED vor — auf unserer Seite ist der
   * nächste Schritt genau diese Seite, und Quelle wie Marke stehen ohnehin im
   * Seitenfuß. Ein Knopf, der auf das Hier zeigt, ist Lärm.
   */
  nackt?: boolean;
}) {
  const [traeger, setTraeger] = useState<Traeger>("gesamt");
  const [installedKwp, setInstalledKwp] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [gw, setGw] = useState<number | null>(null);
  const [settings, setSettings] = useState<WidgetSettings>(
    onsite ? { ...WIDGET_SETTINGS_DEFAULTS, onsite: true } : WIDGET_SETTINGS_DEFAULTS,
  );
  const helpRef = useRef<HTMLDivElement | null>(null);

  // Die kompakte Fassung zeigt die Auslastungs-Zeile nicht — und nur die
  // braucht die installierte Leistung aus dem Anlagenregister. Deshalb nennt
  // sie auch nur die Quelle, die dort wirklich zu sehen ist.
  const widget = useMemo(
    () => (compact ? { ...WIDGET, sources: [DATA_SOURCES.energyCharts] } : WIDGET),
    [compact],
  );

  const gwLabel =
    gw != null
      ? ` · ${gw.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GW`
      : "";
  const chartExport = useChartExport({
    context: {
      title: WIDGET.title,
      subtitle: `${TRAEGER_LABEL[traeger]}${gwLabel}`,
    },
    filename: `solar-check-erzeugung-${traeger}.png`,
    shareText: WIDGET.shareText,
    shareUrl: WIDGET.shareUrl,
    mode: "node",
  });

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

  // Theme + funktionale Schalter (share, branding, embed, onsite) über den
  // geteilten Haken — URL-Parameter und postMessage wirken damit gleich.
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

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

  // Was der Ring farblich unterscheidet, erklärt auf der Seite der Hover — im
  // Bild gibt es keinen. Ohne diese Legende sind blaue und grüne Striche dort
  // nicht auseinanderzuhalten.
  const exportFooter = (
    <WidgetExportFooter
      widget={widget}
      branding={settings.branding}
      legend={[
        { color: v("--color-accent"), label: "Erzeugung je Stunde", shape: "line" },
        { color: v("--color-highlight"), label: "Jüngster gemeldeter Wert", shape: "line" },
      ]}
      note={HELP_TEXT}
    />
  );

  return (
    // Sammelt die Texte hinter den „?" (hier: Auslastung) für den Bild-Fuß.
    <ExportNotesProvider>
    <div
      ref={chartExport.chartRef}
      // Der Ring wird durch mehr Breite nicht größer — ohne Grenze steht er
      // im Bild verloren in einer leeren Fläche. Die kompakte Fassung umschließt
      // ihre Karte, damit die Quellen-Kante direkt daneben sitzt statt weit
      // rechts im Leeren.
      // Kein eigenes rechtes Padding: die Quellen-Kante legt sich damit auf das
      // rechte Innenpolster der Karte und steht INNERHALB des weißen Kastens,
      // nicht daneben auf der Fläche des Einbettenden.
      style={{
        position: "relative",
        maxWidth: WIDGET_MAX_WIDTH_COMPACT,
        // `fit-content` schrumpft die Karte im Embed auf ihren Inhalt — richtig
        // in einem iframe, das sich der Karte anpasst. In einer Spalte neben
        // einer zweiten Karte macht es sie schmaler als ihre Nachbarin, obwohl
        // beide dieselbe Spaltenbreite haben. `nackt` = Einbettung auf eigener
        // Seite: dort die Spalte füllen.
        width: compact && !nackt ? "fit-content" : "100%",
        margin: "0 auto",
      }}
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
        // Auf eigener Seite steht die Karte in einer Spalte und muss sie füllen;
        // im iframe darf sie weiter auf ihren Inhalt schrumpfen.
        fuelltBreite={nackt}
        energietraeger={traeger}
        installedKwp={installedKwp}
        highlightTs={highlightTs}
        size={compact ? "compact" : "default"}
        // Fußzeile INNERHALB der Karte, damit sie auf dem Kartenhintergrund sitzt.
        footer={nackt ? null : (
          <WidgetFooter
            widget={widget}
            chartExport={chartExport}
            share={settings.share}
            branding={settings.branding}
            showEmbed={settings.embed}
            onsite={settings.onsite}
            compact={compact}
            narrow={compact}
          />
        )}
        exportFooter={exportFooter}
        onValue={setGw}
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
          before: "Letzte 24 Stunden",
          after: helpButton,
        }}
      />
      {/* Quelle vertikal an der rechten Kante (geteilter Baustein). Auf einer
          eigenen Seite (onsite) kreditiert die Seite zentral.
          Steht NACH der Karte: die Karte bringt für ihre Umklapp-Animation eine
          Transformation mit und damit einen eigenen Malkontext — davor gesetzt
          verschwände die Kante lautlos hinter dem weißen Kasten. */}
      <WidgetSourceEdge widget={widget} visible={!settings.onsite} />
    </div>
    </ExportNotesProvider>
  );
}
