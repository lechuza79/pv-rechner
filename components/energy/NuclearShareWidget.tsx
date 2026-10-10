"use client";
import {WidgetFrame} from '../dashboard/WidgetFrame';
import styles from './NuclearShareWidget.module.css';
import EnergyWidgetFrame from '../energy/EnergyWidgetFrame';

import { useState } from "react";
import {ShareDonut} from "../charts/ShareDonut";
import { useWidgetTheme } from "../../lib/useWidgetTheme";
import { WIDGETS } from "../../lib/widget-registry";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../lib/widget-settings";
import type { StrommixYtd } from "../../lib/strommix-ytd";

// Identität (Titel, Teilen-Ziel, Quellen, nächster Schritt) kommt aus dem
// Register — ein Eintrag speist Fußzeile, Quellen-Kante und Bild-Fuß.
const WIDGET = WIDGETS.strommixAnteil;

// Prozent-Formatierung nach Chart-Konvention: ab 10 % runden, sonst 1 Stelle,
// unter 0,1 % zwei Stellen.
function fmtPct(n: number): string {
  if (n >= 10) return `${Math.round(n)} %`;
  if (n >= 0.1)
    return `${n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}
const twh = (gwh: number) =>
  (gwh / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 });

export default function StrommixAnteilWidget({ ytd, variant="full" }: { ytd: StrommixYtd | null; variant?:"full"|"teaser" }) {
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);

  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  if (!ytd && variant==='teaser')return <WidgetFrame title="Anteil Atomstrom" kind="donut"><p role="status">Daten gerade nicht verfügbar.</p></WidgetFrame>;
  if (!ytd) return <EnergyWidgetFrame settings={settings} widget={WIDGET} place="Deutschland" exportUnit="%" stand="" title={WIDGET.title} kind="donut" filename="solar-check-strommix-kernenergie"><p role="status">Daten gerade nicht verfügbar.</p></EnergyWidgetFrame>;

  const artwork = {
    renewable: {name:'renewables',crop:{width:125,left:-12,top:-2}},
    fossil: {name:'fossil',crop:{width:175,left:-12,top:-22}},
    other: {name:'other',crop:{width:175,left:-5,top:-28}},
    nuclear: {name:'nuclear',crop:{width:135,left:-8,top:-9}},
  };
  const values=ytd.segments.map(s=>{
    const motif=artwork[s.key as keyof typeof artwork];
    return {label:s.label,value:s.share,visual:motif?`/illustrations/energy/mix-${motif.name}.webp`:undefined,visualCrop:motif?.crop};
  });
  const help=<>Jahr bis dato ({ytd.weeks} Wochen): {twh(ytd.nuclearGwh)} TWh importierter Atomstrom von {twh(ytd.totalGwh)} TWh deutscher Erzeugung plus rechnerischem Atomstrom-Import. Andere Stromimporte sind nicht enthalten. Der rechnerische Import ergibt sich aus den Grenzflüssen und dem Kernenergieanteil der Nachbarländer. Seit April 2023 gibt es keine heimische Kernstromerzeugung mehr.</>;
  if(variant==='teaser')return <WidgetFrame title={`Anteil Atomstrom ${ytd.year}`} kind="donut">
    <ShareDonut palette="neutral" showLegend={false} defaultIndex={0} values={[
      {label:'Kernenergie (importiert)',value:ytd.nuclearShare,visual:'/illustrations/energy/mix-nuclear.webp',visualCrop:artwork.nuclear.crop},
      {label:'Sonstige',value:100-ytd.nuclearShare},
    ]} label={`Anteil Atomstrom ${ytd.year}`} formatValue={value=>({value:fmtPct(value).replace(' %',''),unit:'%'})}/>
  </WidgetFrame>;
  return <EnergyWidgetFrame settings={settings} widget={WIDGET} place="Deutschland" exportUnit="%" stand={String(ytd.year)} title={`Deutscher Strommix ${ytd.year}`} help={help} kind="donut" filename="solar-check-strommix-kernenergie" einbetten={settings.embed?{params:{},height:440}:undefined}>
    <div className={styles.chart}><ShareDonut palette="neutral" values={values} label={`Strommix ${ytd.year}`} defaultIndex={ytd.segments.findIndex(s=>s.key==='nuclear')} hideDefaultCard formatValue={value=>({value:fmtPct(value).replace(' %',''),unit:'%'})}/></div>
  </EnergyWidgetFrame>;
}
