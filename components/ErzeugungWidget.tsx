"use client";
import {useWidgetResource} from "./dashboard/WidgetData";


import { useEffect, useMemo, useRef, useState } from "react";
import { MastrLiveRadial } from "./MastrLiveRadial";
import { useWidgetTheme } from "../lib/useWidgetTheme";
import { DATA_SOURCES } from "../lib/data-sources";
import { WIDGETS, WIDGET_MAX_WIDTH_COMPACT } from "../lib/widget-registry";
import {ExportableWidgetFrame} from './dashboard/ExportableWidgetFrame';
import {Auswahl} from './Auswahl';
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../lib/widget-settings";
import {WidgetPresentationProvider, useWidgetPresentation} from "./dashboard/WidgetPresentationContext";

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
  const presentation = useWidgetPresentation();
  const [traeger, setTraeger] = useState<Traeger>("gesamt");
  const {data:capacity}=useWidgetResource<{total_kwp?:number}>(`/api/mastr/summary?region=de&type=${traeger}&segment=alle`,{});
  const installedKwp=capacity.total_kwp??null;
  const [gw, setGw] = useState<number | null>(null);
  const [settings, setSettings] = useState<WidgetSettings>(
    onsite ? { ...WIDGET_SETTINGS_DEFAULTS, onsite: true } : WIDGET_SETTINGS_DEFAULTS,
  );

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

  return <WidgetPresentationProvider appearance={{...presentation,sharing:settings.share ? presentation.sharing : 'off'}}><div style={{width:'100%',maxWidth:WIDGET_MAX_WIDTH_COMPACT,margin:'0 auto'}}
    onPointerEnter={e=>{if(e.pointerType==='mouse')hoveringRef.current=true;}}
    onPointerLeave={e=>{if(e.pointerType==='mouse')hoveringRef.current=false;}}
    onPointerDown={e=>{if(e.pointerType!=='mouse')lastManualRef.current=Date.now();}}>
    <ExportableWidgetFrame widget={widget} title="Erneuerbare im Tagesverlauf" kind="radial"
      place="Deutschland" stand={highlightTs ?? ''} filename={`solar-check-erzeugung-${traeger}`}
      stateLabel={`${TRAEGER_LABEL[traeger]}${gwLabel}`} sourceVisible={!onsite && !settings.onsite}
      help={HELP_TEXT} exportNote={HELP_TEXT} exportScope="Letzte 24 Stunden" exportUnit="GW"
      exportBranding={settings.branding} einbetten={settings.embed ? {params:{},height:540} : undefined} settingsPlacement="below-title"
      settings={<Auswahl titel={TRAEGER_LABEL[traeger]} aktiv={traeger} breite={200} suchbar={false} umlaufend
        eintraege={TRAEGER_ORDER.map(t=>({schluessel:t,name:TRAEGER_LABEL[t]}))}
        onWahl={t=>{lastManualRef.current=Date.now();setTraeger(t as Traeger);}}/>}>
      <div className="sc-widget-inset"><MastrLiveRadial bare secondaryBars fuelltBreite energietraeger={traeger} installedKwp={installedKwp}
        highlightTs={highlightTs} size={compact?'compact':'default'} onValue={setGw}/></div>
    </ExportableWidgetFrame>
  </div></WidgetPresentationProvider>;
}
