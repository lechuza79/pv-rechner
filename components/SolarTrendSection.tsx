import { Suspense } from "react";
import { v, space } from "../lib/theme";
import { formatGWhCompare, energyUnit } from "../lib/chart-utils";
import { monatsName, type SolarTrendVergleich } from "../lib/solar-trend";
import SolarTrendCard from "./SolarTrendCard";
import type { SolarMonat } from "../lib/solar-trend";
import { WIDGETS } from "../lib/widget-registry";
import { DataSourceNote } from "./PoweredBy";

// Server-gerenderter Solar-Trend: blätterbare Karte plus crawlbare Tabelle der
// letzten zwölf Monate. Beide rechnen über lib/solar-trend, also aus einer
// Quelle. Absichtsgerecht auf der PV-Zubau-Seite („wie schnell wächst Solar
// wirklich — und was davon ist nur Wetter?"), NICHT auf der Strommix-Seite:
// dort sucht niemand einen Solar-Jahresvergleich (Herleitung in
// docs/seo/strommix-intent-2026-08.md).

const S = {
  h2: {
    fontSize: 17,
    fontWeight: 800 as const,
    letterSpacing: "-0.01em",
    margin: `${space.xxl}px 0 ${space.md}px`,
  },
  p: {
    fontSize: 14,
    lineHeight: 1.7,
    color: v("--color-text-secondary"),
    margin: `0 0 ${space.md}px`,
  },
};

// Vorzeichen-Prozent mit echtem Minus — für die Trend-Tabelle.
const signPct = (p: number) => `${p >= 0 ? "+" : "−"}${Math.abs(p)} %`;

/** Server-gerenderte Monats-Chronik: derselbe Vergleich, den die Karte oben
 *  interaktiv zeigt, als crawlbare Tabelle der letzten zwölf Monate. Die
 *  Zahlen kommen aus denselben Funktionen wie die Karte — eine Quelle. */
export default function SolarTrendSection({
  vergleiche, series,
}: {
  vergleiche: SolarTrendVergleich[];
  series: SolarMonat[];
}) {
  if (vergleiche.length === 0) return null;
  const unit = energyUnit(Math.max(...vergleiche.map((x) => x.curGWh)));
  const neuester = vergleiche[0];
  const th = {
    textAlign: "right" as const,
    padding: "6px 8px",
    fontSize: 10,
    fontWeight: 600,
    color: v("--color-text-muted"),
    whiteSpace: "nowrap" as const,
  };
  const td = {
    textAlign: "right" as const,
    padding: "6px 8px",
    fontSize: 12,
    fontFamily: v("--font-mono"),
    color: v("--color-text-secondary"),
    whiteSpace: "nowrap" as const,
    borderTop: `1px solid ${v("--color-border")}`,
  };
  return (
    <section>
      <h2 style={S.h2}>Solarstrom im Monatsvergleich</h2>
      {/* Die Karte liest den gewählten Monat aus der Adresse. Ohne diese
          Grenze müsste JEDE einbettende Seite daran denken — mit ihr kann der
          Baustein überall stehen. Der Platzhalter hält die Höhe frei. */}
      {series.length > 0 && (
        <Suspense fallback={<div style={{ minHeight: 132, marginBottom: 20 }} />}>
          <SolarTrendCard series={series} />
        </Suspense>
      )}
      <p style={S.p}>
        Im {monatsName(neuester.month0)} {neuester.year} lieferten Deutschlands Solaranlagen{" "}
        {formatGWhCompare(neuester.curGWh, unit)} Strom — {signPct(neuester.totalPct).replace("+", "")}{" "}
        {neuester.totalPct >= 0 ? "mehr" : "weniger"} als im selben Monat des Vorjahres{
          neuester.zerlegung
          ? `. Davon gehen ${signPct(neuester.zerlegung.zubauPct)} auf neu gebaute Anlagen zurück und ${signPct(neuester.zerlegung.wetterPct)} auf das Wetter, also den Sonnenertrag je installiertem Kilowatt.`
          : "."}{" "}
        Die Tabelle zeigt die letzten zwölf Monate; oben an der Karte lässt sich jeder Monat seit 2016
        einzeln aufrufen. Zubau- und Wetter-Effekt multiplizieren sich zum Gesamtunterschied.
      </p>
      <div style={{ overflowX: "auto", border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md") }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>Monat</th>
              <th style={th}>Solarstrom</th>
              <th style={th}>Vorjahr</th>
              <th style={th}>Veränderung</th>
              <th style={th}>davon Zubau</th>
              <th style={th}>davon Wetter</th>
            </tr>
          </thead>
          <tbody>
            {vergleiche.map((x) => (
              <tr key={`${x.year}-${x.month0}`}>
                <td style={{ ...td, textAlign: "left", fontFamily: v("--font-text") }}>
                  {monatsName(x.month0)} {x.year}
                </td>
                <td style={{ ...td, color: v("--color-text-primary"), fontWeight: 700 }}>{formatGWhCompare(x.curGWh, unit)}</td>
                <td style={td}>{formatGWhCompare(x.prevGWh, unit)}</td>
                <td style={{ ...td, color: x.totalPct >= 0 ? v("--color-positive") : v("--color-negative") }}>
                  {signPct(x.totalPct)}
                </td>
                <td style={td}>{x.zerlegung ? signPct(x.zerlegung.zubauPct) : "—"}</td>
                <td style={td}>{x.zerlegung ? signPct(x.zerlegung.wetterPct) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Lizenzpflicht (CC BY 4.0): Der Abschnitt bringt eine eigene Quelle mit,
          die die einbettende Seite NICHT trägt — die Zubau-Seite zitiert MaStR,
          EEG und Eurostat, dieser Block dagegen Energy-Charts. */}
      <div style={{ marginTop: space.sm, fontSize: 11, color: v("--color-text-faint"), lineHeight: 1.6 }}>
        <DataSourceNote source={WIDGETS.solarTrend.sources} />
      </div>
    </section>
  );
}

