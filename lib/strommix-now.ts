import type {DonutSegment} from '../components/charts/DonutChart';
import type {GenerationDataPoint} from './energy';
import {ENERGY_COLORS_HEX,ENERGY_LABELS,GENERATION_STACK_KEYS,RENEWABLE_KEYS,FOSSIL_KEYS,CATEGORY_COLORS} from './chart-utils';

/** Kleinträger unter dieser Schwelle wandern in „Sonstige" — sonst zerfasert
 *  der Ring in Haarlinien, die niemand zuordnen kann. */
const MIN_SHARE_PCT = 1.5;

/**
 * Diese Träger stehen IMMER einzeln, auch bei winzigem Anteil.
 *
 * Grund: Dass Wind gerade fast nichts liefert, ist die interessanteste
 * Aussage des Augenblicks — nicht Rauschen. Beim ersten Bau verschwanden
 * 0,65 GW Wind bei 61 GW Gesamtleistung in „Sonstige", und die Flaute war
 * aus dem Bild verschwunden. Ein Träger, der normalerweise groß ist, muss
 * auch klein sichtbar bleiben; sonst zeigt der Ring nur, was ohnehin läuft.
 */
const IMMER_ZEIGEN = new Set(["Solar", "Wind", "Braunkohle", "Steinkohle", "Erdgas", "Biomasse", "Wasserkraft", "Kernenergie"]);

/** Anzeige-Name im Donut. Onshore und Offshore sind derselbe Energieträger an
 *  verschiedenen Orten — im Ring interessiert „wie viel Wind", nicht wo er
 *  steht. Dieselbe Zusammenfassung macht die Wasserkraft schon über ihre
 *  gemeinsamen Labels. */
function donutLabel(key: string): string {
  if (key === "wind_onshore" || key === "wind_offshore") return "Wind";
  return ENERGY_LABELS[key] ?? key;
}

export interface JetztWerte {
  segments: DonutSegment[];
  totalMw: number;
  eeSharePct: number;
  ts: string;
}

/** Letzten vollständigen Punkt einer Erzeugungsreihe in Donut-Segmente
 *  übersetzen. Exportiert, damit die Rechnung testbar bleibt. */
export function jetztAusReihe(data: GenerationDataPoint[]): JetztWerte | null {
  if (data.length === 0) return null;
  const last = data[data.length - 1];

  const einzeln: { key: string; mw: number }[] = [];
  let total = 0;
  let renewable = 0;
  for (const key of GENERATION_STACK_KEYS) {
    const val = last[key];
    if (typeof val === "number" && val > 0) {
      einzeln.push({ key, mw: val });
      total += val;
      if (RENEWABLE_KEYS.includes(key)) renewable += val;
    }
  }
  if (total <= 0) return null;

  // Gleiche Träger (Wasserkraft steht in drei Schlüsseln) unter ihrem Namen
  // zusammenfassen — drei „Wasserkraft"-Segmente wären eine Scheingenauigkeit.
  const proLabel = new Map<string, { label: string; color: string; mw: number }>();
  for (const e of einzeln) {
    const label = donutLabel(e.key);
    const cur = proLabel.get(label);
    if (cur) cur.mw += e.mw;
    else proLabel.set(label, { label, color: ENERGY_COLORS_HEX[e.key] ?? CATEGORY_COLORS.other, mw: e.mw });
  }

  const gross: DonutSegment[] = [];
  let restMw = 0;
  for (const [label, s] of proLabel) {
    if (IMMER_ZEIGEN.has(label) || (s.mw / total) * 100 >= MIN_SHARE_PCT) {
      gross.push({ key: label, label, color: s.color, value: s.mw });
    } else {
      restMw += s.mw;
    }
  }
  gross.sort((a, b) => b.value - a.value);
  if (restMw > 0) {
    gross.push({ key: "rest", label: "Sonstige", color: CATEGORY_COLORS.other, value: restMw });
  }

  return {
    segments: gross,
    totalMw: total,
    eeSharePct: (renewable / total) * 100,
    ts: String(last.ts),
  };
}


/** Preserve every carrier when navigating from broad categories to details. */
export function strommixGroups(data:GenerationDataPoint[]) {
 const point=data.at(-1);
 if(!point)return [];
 const groups=['Erneuerbare','Fossile','Sonstige','Kernenergie'].map(label=>({label,value:0,children:[] as {label:string;value:number}[]}));
 for(const key of GENERATION_STACK_KEYS){
  const value=point[key];if(typeof value!=='number'||value<=0)continue;
  const group=groups[RENEWABLE_KEYS.includes(key)?0:FOSSIL_KEYS.includes(key)?1:key==='nuclear'?3:2];
  const label=ENERGY_LABELS[key]??key;
  const existing=group.children.find(row=>row.label===label);
  if(existing)existing.value+=value;else group.children.push({label,value});
  group.value+=value;
 }
 return groups.filter(group=>group.value>0);
}
