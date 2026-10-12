"use client";
import EnergyWidgetFrame from '../energy/EnergyWidgetFrame';
import {WidgetPresetButtons} from '../dashboard/WidgetControls';
import {WidgetSetting} from '../dashboard/WidgetSetting';

import { useEffect, useState } from "react";
import StackedAreaChart from "../charts/StackedAreaChart";
import StackedBarChart from "../charts/StackedBarChart";
import {
  ExportBox,
} from "../WidgetExport";
import { WIDGETS } from "../../lib/widget-registry";
import { useGenerationMix, useNuclearImport } from "../../lib/energy";
import { useWidgetTheme } from "../../lib/useWidgetTheme";
import { v } from "../../lib/theme";
// Das Ende eines Datenbereichs ist ein deutscher Kalendertag — mit der Weltzeit
// fehlten zwischen 00:00 und 02:00 die letzten Stunden (lib/zeit.ts).
import { heuteInBerlin } from "../../lib/zeit";
import {
  WIDGET_SETTINGS_DEFAULTS,
  WidgetSettings,
  WidgetRange,
} from "../../lib/widget-settings";

// Identity (title, share target, sources, next step) comes from the register —
// one entry feeds the page footer, the source edge and the image footer alike.
const WIDGET = WIDGETS.strommix;

function rangeToTab(range: WidgetRange): TabState {
  if (range === "24h") return { id: "24h" };
  if (range === "30d") return { id: "30d" };
  if (range === "year") return { id: "year", year: new Date().getFullYear() };
  return { id: "7d" };
}

function tabLabel(tab: TabState): string {
  if (tab.id === "24h") return "Die letzten 24 Stunden";
  if (tab.id === "7d") return "Die letzten 7 Tage";
  if (tab.id === "30d") return "Die letzten 30 Tage";
  return `Jahr ${tab.year}`;
}
// ─── Time range definitions ─────────────────────────────────────────────────
type TabState =
  | { id: "24h" }
  | { id: "7d" }
  | { id: "30d" }
  | { id: "year"; year: number };

function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 2015; y--) years.push(y);
  return years;
}

function getYearRange(year: number): { start: string; end: string } {
  const currentYear = new Date().getFullYear();
  const end =
    year === currentYear
      ? heuteInBerlin()
      : `${year}-12-31`;
  return { start: `${year}-01-01`, end };
}

function tabHours(tab: TabState): number {
  if (tab.id === "24h") return 24;
  if (tab.id === "7d") return 168;
  if (tab.id === "30d") return 720;
  return 8760;
}

function tabDateRange(tab: TabState): { start: string; end: string } | undefined {
  if (tab.id === "year") return getYearRange(tab.year);
  return undefined;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function StrommixWidget() {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  const [tab, setTab] = useState<TabState>({ id: "7d" });

  // Theme + functional settings (URL params + same-origin postMessage) via the
  // shared hook. Range changes also drive the active tab.
  useWidgetTheme({
    onSettings: (partial) => {
      setSettings((prev) => ({ ...prev, ...partial }));
      if (partial.range) setTab(rangeToTab(partial.range));
    },
  });

  const [dataAsOf, setDataAsOf] = useState<string>();
  const years=getAvailableYears();
  const selected=tab.id==='year'?String(tab.year):tab.id;
  return <EnergyWidgetFrame settings={settings} widget={WIDGET} place="Deutschland" stand={dataAsOf ?? ""} exportUnit={tab.id==='24h'||tab.id==='7d'?'GW':'Strommenge'} title={WIDGET.title} kind="time-series" filename="solar-check-strommix" stateLabel={tabLabel(tab)} einbetten={settings.embed?{params:{range:tab.id},height:520}:undefined}>
    {settings.switchable&&<div data-energy-controls data-sc-export-ignore="">
      <WidgetPresetButtons label="Zeitraum" value={tab.id} options={[{value:'24h',label:'24 Std'},{value:'7d',label:'7 Tage'},{value:'30d',label:'30 Tage'}]} onChange={value=>setTab({id:value as '24h'|'7d'|'30d'})}/>
      <WidgetSetting hideLabel stepper label="Jahr" value={tab.id==='year'?selected:''} onChange={value=>setTab({id:'year',year:Number(value)})} options={[...(tab.id==='year'?[]:[{value:'',label:'Jahr'}]),...years.map(year=>({value:String(year),label:String(year)}))]}/>
    </div>}
    <span data-sc-export-only="block" style={{display:"none"}}>Kernenergie inkl. Import</span>
    <div data-energy-plot><ExportBox><ChartArea key={selected} tab={tab} onDataAsOf={setDataAsOf}/></ExportBox></div>
  </EnergyWidgetFrame>;
}

// ─── Chart Area ─────────────────────────────────────────────────────────────
function ChartArea({ tab, onDataAsOf }: { tab: TabState; onDataAsOf:(date:string|undefined)=>void }) {
  const hours = tabHours(tab);
  const dateRange = tabDateRange(tab);
  const { data: genData, error, refetch } = useGenerationMix(
    "de",
    hours,
    dateRange,
  );
  const { data: nuclearData } = useNuclearImport(hours, dateRange);
  useEffect(() => {onDataAsOf(genData.data.at(-1)?.ts);}, [genData.data, onDataAsOf]);

  // 24h / 7d → smooth area, 30d / year → stacked bars
  const useArea = tab.id === "24h" || tab.id === "7d";
  const barMode: "30d" | "ytd" = tab.id === "30d" ? "30d" : "ytd";

  return (
    <div data-widget-loading={!error && genData.data.length === 0} style={{ flex: 1, marginTop: 14, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 220, position: "relative" }}>
        {error && genData.data.length === 0 && (
          <CenteredMessage
            text="Daten gerade nicht verfügbar."
            action={{ label: "Erneut versuchen", onClick: refetch }}
          />
        )}
        {!error && genData.data.length === 0 && (
          <CenteredMessage text="Lade Daten…" />
        )}
        {genData.data.length > 0 && useArea && (
          <StackedAreaChart
            data={genData.data}
            xFormat={tab.id === "24h" ? "time" : "date"}
            height={220}
            nuclearOverlay={nuclearData.data}
            compact
          />
        )}
        {genData.data.length > 0 && !useArea && (
          <StackedBarChart
            data={genData.data}
            mode={barMode}
            preAggregated={genData.resolution === "weekly"}
            height={220}
            nuclearOverlay={nuclearData.data}
            compact
          />
        )}
      </div>
    </div>
  );
}

// ─── Reusable bits ──────────────────────────────────────────────────────────
function CenteredMessage({
  text,
  action,
}: {
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
        color: "var(--widget-muted)",
        fontSize: v("--font-size-small"),
      }}
    >
      <span>{text}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            padding: "5px 12px",
            fontSize: v("--font-size-caption"),
            fontWeight: 600,
            background: "var(--widget-accent)",
            color: "var(--widget-accent-fg)",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
