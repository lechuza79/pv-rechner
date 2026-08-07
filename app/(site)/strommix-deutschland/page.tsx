import type { Metadata } from "next";
import { Suspense } from "react";
import { v, space } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { strommixFaq } from "../../../lib/faq";
import { formatGWhCompare, energyUnit } from "../../../lib/chart-utils";
import { getSolarMonthlySeries } from "../../../lib/solar-trend-data";
import { letzteVergleiche, monatsName, type SolarTrendVergleich } from "../../../lib/solar-trend";
import Faq from "../../../components/Faq";
import RelatedLinks from "../../../components/RelatedLinks";
import EnergieClient from "./client";

// ISR: Der Solar-Trend-Block liest die Monats-Reihe aus der Datenbank; die
// Seite bleibt über den CDN-Cache statisch ausgeliefert und erneuert sich
// viermal am Tag (die Reihe wächst ohnehin nur monatlich).
export const revalidate = 21600;

export const metadata: Metadata = pageMetadata({
  path: "/strommix-deutschland",
  title: "Strommix Deutschland aktuell – Live: Solar, Wind, Kohle | Solar Check",
  description:
    "Der deutsche Strommix live und aktuell: wie viel Solar, Wind, Kohle und Gas gerade im Netz sind — heute, im Monat und im Jahresvergleich. Daten: Fraunhofer ISE.",
  ogImageTitle: "Deutschlands Strommix — live",
  ogImageSubtitle: "Solar, Wind, Gas, Kohle in Echtzeit. Quelle: Fraunhofer ISE.",
  keywords: [
    "Strommix Deutschland",
    "Strommix Deutschland aktuell",
    "Strommix Deutschland live",
    "Stromerzeugung Deutschland aktuell",
    "Erneuerbare Energien Anteil",
  ],
});

// Reading-flow styles for the explainer below the interactive chart.
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
function SolarTrendChronik({ vergleiche }: { vergleiche: SolarTrendVergleich[] }) {
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
    </section>
  );
}

export default async function EnergiePage() {
  const solarSeries = await getSolarMonthlySeries();
  const vergleiche = letzteVergleiche(solarSeries, 12);

  return (
    <div
      style={{
        background: v("--color-bg"),
        fontFamily: v("--font-text"),
        color: v("--color-text-primary"),
        minHeight: "100vh",
        padding: "0 16px 20px",
      }}
    >
      <Suspense fallback={null}>
        <EnergieClient solarSeries={solarSeries} />
      </Suspense>

      {/* Server-rendered explainer + FAQ: the SEO substance under the live tool. */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <SolarTrendChronik vergleiche={vergleiche} />

        <section>
          <h2 style={S.h2}>So liest du den Strommix</h2>
          <p style={S.p}>
            Die Grafik zeigt die öffentliche Nettostromerzeugung in Deutschland —
            also allen Strom, der ins öffentliche Netz eingespeist wird —
            aufgeschlüsselt nach Energieträgern und in 15-Minuten-Schritten
            aktualisiert. Grün ist erneuerbar (Wind, Solar, Wasser, Biomasse),
            Grau ist fossil (Kohle, Gas, Öl).
          </p>
          <p style={S.p}>
            Der Tagesrhythmus ist gut erkennbar: Solarstrom baut sich am Vormittag
            auf, erreicht mittags seine Spitze und fällt zum Abend wieder auf
            null. Wind kennt dagegen keinen festen Rhythmus — er liefert mal
            tagelang viel, mal fast nichts. Nachts und bei Flaute schließen
            steuerbare Kraftwerke, Importe und zunehmend große Batteriespeicher
            die Lücke.
          </p>
          <p style={S.p}>
            Übers Jahr gesehen ergänzen sich Sonne und Wind: Solar liefert den
            Großteil seines Ertrags im Sommerhalbjahr, Wind ist in den
            Wintermonaten am stärksten. Genau deshalb lohnt der Blick auf ganze
            Jahre über die Zeitraum-Auswahl oben — einzelne Tage sagen wenig
            über das System.
          </p>
        </section>

        <Faq
          items={strommixFaq()}
          title="Häufige Fragen zum Strommix"
          currentPath="/strommix-deutschland"
        />

        <RelatedLinks
          currentPath="/strommix-deutschland"
          links={[
            {
              href: "/atomstrom-import",
              label: "Wie viel Atomstrom importiert Deutschland?",
              desc: "Die Auswertung zeigt, welcher Teil der Stromimporte rechnerisch aus Kernkraft stammt.",
            },
            {
              href: "/photovoltaik-zubau-deutschland",
              label: "PV-Zubau in Deutschland",
              desc: "Wie schnell die installierte Solarleistung wächst — und was das für den Strommix bedeutet.",
            },
            {
              href: "/pv-simulation",
              label: "PV-Live-Simulation",
              desc: "Was eine eigene Solaranlage an deinem Standort gerade jetzt erzeugen würde.",
            },
          ]}
        />
      </div>
    </div>
  );
}
