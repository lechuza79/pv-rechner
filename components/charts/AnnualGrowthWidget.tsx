"use client";

import {useState} from "react";
import ZubauChart from "../atlas/ZubauChart";
import {ExportableWidgetFrame} from "../dashboard/ExportableWidgetFrame";
import {ExportOnly} from "../WidgetExport";
import {WIDGETS} from "../../lib/widget-registry";
import {WidgetSetting} from "../dashboard/WidgetSetting";
import {dashboardDate} from "../../lib/dashboard/format";
import "../gemeinde/municipal-data.css";
import "../dashboard/dashboard.css";

export function AnnualGrowth({ years, stand, name, regionId }: { name:string; regionId:string; years: { year: number; count: number }[]; stand: string }) {
  const [range, setRange] = useState("all");
  const end = Number(stand.slice(0, 4));
  return (
    <ExportableWidgetFrame widget={WIDGETS.regionalAnnualGrowth} place={name} stand={dashboardDate(stand)} filename={`solar-check-growth-${regionId}`} data-story-scheme="dark" stateLabel={`${range === "all" ? 2014 : end - Number(range) + 1}–${end}`}
      title="Zubau pro Jahr"
      kind="time-series"
      help={<p>Solaranlagen nach Inbetriebnahmejahr. Das laufende Jahr ist noch nicht vollständig. Registerstand: {dashboardDate(stand)}.</p>}
      settings={
        <WidgetSetting
          label="Zeitraum des Zubaus"
          hideLabel
          value={range}
          onChange={setRange}
          options={[
            { value: "all", label: "Seit 2014" },
            { value: "10", label: "Letzte 10 Jahre" },
            { value: "5", label: "Letzte 5 Jahre" },
          ]}
        />
      }
    >
      <div className="monitor-native-chart">
        <ZubauChart years={years} from={range === "all" ? 2014 : end - Number(range) + 1} asOfYear={end} />
      </div>
      <ExportOnly style={{padding:"0 var(--widget-padding)",fontSize:"var(--font-size-small)"}}>
        <p>Anlagen nach Inbetriebnahmejahr: {years.filter(row=>row.year>=(range==="all"?2014:end-Number(range)+1)&&row.year<=end).map(row=>`${row.year}: ${row.count.toLocaleString("de-DE")}`).join(" · ")}</p>
      </ExportOnly>
    </ExportableWidgetFrame>
  );
}
