"use client";

/**
 * „Gerade jetzt" — Momentaufnahme des Strommix als Donut, gebaut aus dem
 * LETZTEN Punkt derselben Zeitreihe, die der Verlaufs-Chart daneben zeichnet.
 *
 * Warum aus denselben Daten und nicht aus einem eigenen Abruf: Zwei Abrufe
 * hätten zwei Stände, und dann widersprechen sich Donut und Kurve genau in dem
 * Moment, in dem jemand hinsieht. Ein Datensatz, ein Stand — die Synchronität
 * ist damit keine Absprache, sondern Bauart.
 *
 * Der Aufrufer reicht bereits GETRIMMTE Daten herein (die API schneidet den
 * unvollständigen Schwanz ab, in dem Solar/Wind noch nicht gemeldet sind).
 * Andernfalls zeigte der Donut eine Viertelstunde, in der Solar strukturell
 * fehlt — mittags eine grob falsche Aussage.
 */

import { useMemo, useState } from "react";
import DonutChart, { type DonutSegment } from "./DonutChart";
import {
  ENERGY_COLORS_HEX, ENERGY_LABELS, GENERATION_STACK_KEYS, RENEWABLE_KEYS,
  CATEGORY_COLORS, formatMWIn, powerUnit, anteilZahl,
} from "../../lib/chart-utils";
import type { GenerationDataPoint } from "../../lib/energy";
import { v } from "../../lib/theme";

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

export default function JetztDonut({ data, size = 168 }: { data: GenerationDataPoint[]; size?: number }) {
  const werte = useMemo(() => jetztAusReihe(data), [data]);
  const [aktiv, setAktiv] = useState<string | null>(null);
  if (!werte) return null;

  const gezeigt = werte.segments.find((s) => s.key === aktiv) ?? null;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <DonutChart segments={werte.segments} size={size} activeKey={aktiv} onActive={setAktiv}>
        {/* Die Mitte trägt den Wert des berührten Segments — sonst den
            Erneuerbaren-Anteil. Damit ersetzt der Ring seine eigene Legende:
            eine dauerhafte Liste mit zehn Zeilen erschlägt die Karte, und
            gefragt ist ohnehin immer nur ein Träger auf einmal.
            „gerade" gehört AN die Zahl: Die Kachelreihe oben zeigt den
            Mittelwert über den gewählten Zeitraum — mittags stehen dort 63 %
            und hier 88 %, beides richtig, aber ohne den Zusatz liest sich
            eine der beiden Zahlen als Fehler. */}
        <div style={{ textAlign: "center", lineHeight: 1.15, padding: "0 12px" }}>
          {gezeigt ? (
            <>
              <div style={{ fontFamily: v("--font-mono"), fontWeight: 800, fontSize: v("--font-size-display-sm"), color: v("--color-text-primary") }}>
                {anteilZahl((gezeigt.value / werte.totalMw) * 100)}
                <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginLeft: 2 }}>%</span>
              </div>
              <div style={{ fontSize: v("--font-size-micro"), color: v("--color-text-secondary"), marginTop: 2, fontWeight: 600 }}>
                {gezeigt.label}
              </div>
              <div style={{ fontSize: v("--font-size-micro"), color: v("--color-text-muted"), marginTop: 1, fontFamily: v("--font-mono") }}>
                {formatMWIn(gezeigt.value, powerUnit(werte.totalMw))}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: v("--font-mono"), fontWeight: 800, fontSize: v("--font-size-display-sm"), color: v("--color-text-primary") }}>
                {Math.round(werte.eeSharePct)}
                <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginLeft: 2 }}>%</span>
              </div>
              <div style={{ fontSize: v("--font-size-micro"), color: v("--color-text-muted"), marginTop: 2 }}>erneuerbar<br />gerade</div>
            </>
          )}
        </div>
      </DonutChart>
    </div>
  );
}
