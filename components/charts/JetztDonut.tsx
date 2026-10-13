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
import DonutChart from "./DonutChart";
import {
  formatMWIn, powerUnit, anteilZahl,
} from "../../lib/chart-utils";
import type { GenerationDataPoint } from "../../lib/energy";
import { v } from "../../lib/theme";

import {jetztAusReihe} from '../../lib/strommix-now';
export {jetztAusReihe} from '../../lib/strommix-now';
export type {JetztWerte} from '../../lib/strommix-now';

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
