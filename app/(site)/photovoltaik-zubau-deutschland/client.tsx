"use client";

import { useState } from "react";
import ZubauTimelineChart from "../../../components/charts/ZubauTimelineChart";
import EventTimeline from "../../../components/charts/EventTimeline";
import ChartExportBar from "../../../components/ChartExportBar";
import { useChartExport } from "../../../lib/useChartExport";
import { v, tokens } from "../../../lib/theme";
import type { NationalSolarSeries } from "../../../lib/mastr-data";
import { FEEDIN_HISTORY_YEARS, FEEDIN_HISTORY_VALUES, FEEDIN_HISTORY_META } from "../../../lib/feedin-history";
import { PRICE_YEARS, PRICE_HOUSEHOLD, PRICE_META } from "../../../lib/strommix-history";
import { DATA_SOURCES, sourceLabel } from "../../../lib/data-sources";

// Kuratierte politische Weichenstellungen (historische Fakten). Reihenfolge =
// Nummerierung im Chart. 2027 ist Ausblick und liegt außerhalb der Datenachse —
// steht deshalb nur im Text, nicht als Chart-Marker.
const MARKERS: { year: number; label: string; text: string }[] = [
  {
    year: 2000,
    label: "EEG-Start",
    text: "Das Erneuerbare-Energien-Gesetz garantiert erstmals eine feste Vergütung über 20 Jahre. Damit wird eine kleine Dachanlage überhaupt erst kalkulierbar.",
  },
  {
    year: 2004,
    label: "EEG-Novelle",
    text: "Die Vergütung steigt auf ihren Höchststand von über 57 ct/kWh. Der erste große Zubau-Boom beginnt — Einspeisen allein trägt die Anlage.",
  },
  {
    year: 2012,
    label: "Vergütungskürzung",
    text: "Drastische Kürzungen und der Wechsel auf monatliche Degression. Der Satz fällt unter den Haushaltsstrompreis — Einspeisen lohnt weniger als der selbst genutzte Strom, der Kleindach-Zubau bricht ein.",
  },
  {
    year: 2023,
    label: "Nullsteuer",
    text: "0 % Mehrwertsteuer auf Kauf und Montage von PV-Anlagen. Zusammen mit den nach 2022 stark gestiegenen Strompreisen wird der Eigenverbrauch so lukrativ, dass der Zubau explodiert — obwohl die Vergütung niedrig bleibt.",
  },
  {
    year: 2024,
    label: "Solarpaket I",
    text: "Das Solarpaket I und das Balkonkraftwerk-Privileg vereinfachen Anmeldung und Betrieb. Steckersolar wird zur privilegierten Maßnahme — der Zubau bleibt auf Rekordniveau.",
  },
];

/** Werte einer Jahresreihe auf die Zielachse legen (null wo keine Zahl). */
function alignToYears(targetYears: number[], srcYears: number[], srcValues: number[]): (number | null)[] {
  const map = new Map<number, number>();
  srcYears.forEach((y, i) => map.set(y, srcValues[i]));
  return targetYears.map((y) => (map.has(y) ? (map.get(y) as number) : null));
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, color: v("--color-text-muted"), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {children}
    </span>
  );
}

export default function ZubauDeutschlandClient({ series }: { series: NationalSolarSeries | null }) {
  const [activeEvent, setActiveEvent] = useState(0);
  // Chart-Export (Teilen/Download): Titel, Legende, Quelle + Branding werden im
  // exportierten Bild rekomponiert — auch wenn die Legende auf der Seite fehlt.
  const chartExport = useChartExport({
    context: {
      title: "Photovoltaik-Zubau in Deutschland",
      subtitle: "Zubau pro Jahr, Einspeisevergütung & Strompreis seit 2000",
      legend: [
        { color: tokens["--color-accent"], label: "Zubau pro Jahr (GW)" },
        { color: tokens["--color-positive"], label: "Einspeisevergütung (ct/kWh)" },
        { color: tokens["--color-text-secondary"], label: "Haushaltsstrompreis (ct/kWh)" },
      ],
      source: "MaStR (Bundesnetzagentur) · BNetzA/SFV · Eurostat",
    },
    filename: "solar-check-pv-zubau-deutschland",
    shareText:
      "Wie Förderung den Solarausbau in Deutschland geformt hat – Zubau, Einspeisevergütung & Strompreis seit 2000",
  });
  const card: React.CSSProperties = {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 14,
    padding: "22px 20px 18px",
  };

  if (!series || series.points.length === 0) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={card}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: v("--color-text-primary") }}>
            Photovoltaik-Zubau in Deutschland
          </h1>
          <p style={{ fontSize: 14, color: v("--color-text-secondary"), margin: 0 }}>
            Die Zubaudaten sind gerade nicht abrufbar. Bitte lade die Seite in einem Moment neu.
          </p>
        </div>
      </div>
    );
  }

  const years = series.points.map((p) => p.year);
  const additionsGw = series.points.map((p) => p.kwp / 1e6);
  const partial = series.points.map((p) => p.partial);
  const feedIn = alignToYears(years, FEEDIN_HISTORY_YEARS, FEEDIN_HISTORY_VALUES);
  const price = alignToYears(years, PRICE_YEARS, PRICE_HOUSEHOLD);

  const asOf = series.data_as_of;
  const boomPeak = Math.max(...series.points.filter((p) => !p.partial).map((p) => p.kwp / 1e6));

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Kopf + Hauptchart */}
      <div style={card}>
        <div style={{ marginBottom: 4 }}>
          <Label>Datenstory · Solar in Deutschland</Label>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: v("--color-text-primary") }}>
          Wie Förderung den Solarausbau geformt hat
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: v("--color-text-secondary"), margin: "0 0 6px" }}>
          Der jährliche Photovoltaik-Zubau in Deutschland folgt keiner geraden Linie, sondern den
          politischen Weichenstellungen. Die Balken zeigen, wie viel Leistung Jahr für Jahr dazukam;
          die beiden Linien zeigen, warum: die sinkende Einspeisevergütung und der steigende Strompreis.
        </p>

        <div ref={chartExport.chartRef} style={{ marginTop: 12 }}>
          <ZubauTimelineChart
            years={years}
            additionsGw={additionsGw}
            partial={partial}
            feedIn={feedIn}
            price={price}
            height={430}
          />
        </div>

        {/* Synchrone Ereignis-Timeline (ersetzt den früheren Textblock) */}
        <div style={{ marginTop: 6 }}>
          <EventTimeline
            events={MARKERS}
            active={activeEvent}
            onChange={setActiveEvent}
            startYear={years[0]}
            endYear={years[years.length - 1]}
          />
        </div>

        {/* Teilen / Download (Bild mit Titel, Legende, Quelle & Branding) */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <ChartExportBar
            onDownload={chartExport.downloadPng}
            onShare={chartExport.sharePng}
            onWhatsApp={chartExport.shareWhatsApp}
            onTwitter={chartExport.shareTwitter}
            isExporting={chartExport.isExporting}
            canNativeShare={chartExport.canNativeShare}
          />
        </div>
      </div>

      {/* Die Story in zwei Absätzen */}
      <div style={{ padding: "0 2px" }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px", color: v("--color-text-primary") }}>
          Zwei Booms, ein Wendepunkt
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 10px" }}>
          Der <strong>erste Boom</strong> (rund 2009–2012) lief über die Einspeisevergütung: Wer eine
          Anlage aufs Dach setzte, bekam für jede eingespeiste Kilowattstunde ein Vielfaches dessen, was
          Strom damals kostete. Als die Vergütung 2012 drastisch gekürzt wurde und unter den
          Haushaltsstrompreis fiel, kippte die Logik — und der Zubau brach über Jahre ein.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: v("--color-text-secondary"), margin: 0 }}>
          Der <strong>zweite Boom</strong> (ab 2022) hat einen anderen Motor: nicht mehr das Einspeisen,
          sondern der <strong>Eigenverbrauch</strong>. Als die Strompreise 2022 sprunghaft stiegen, wurde
          jede selbst genutzte Kilowattstunde bares Geld wert. Die Nullsteuer 2023 nahm zusätzlich die
          Anschaffungshürde. Ergebnis: Rekord-Zubau bei gleichzeitig niedriger Vergütung — der Beweis,
          dass heute der Strompreis die Anlage trägt, nicht mehr die Förderung. Der Höchststand liegt bei
          über {boomPeak.toLocaleString("de-DE", { maximumFractionDigits: 0 })} GW in einem einzigen Jahr.
        </p>
      </div>

      {/* Ausblick 2027 (liegt außerhalb der Chart-Achse, daher als Notiz) */}
      <div style={{ padding: "0 2px" }}>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: v("--color-text-secondary") }}>
          <strong style={{ color: v("--color-text-primary") }}>Ausblick 2027:</strong> Ein Referentenentwurf
          sieht eine EEG-Reform für Neuanlagen ab 2027 vor. Für heute installierte Anlagen gilt Bestandsschutz —
          die 20-jährige Vergütungsgarantie bleibt.
        </div>
      </div>

      {/* Förder-Überblick (verlinkt, nicht nachgebaut) */}
      <div style={{ padding: "0 2px" }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px", color: v("--color-text-primary") }}>
          Und die regionale Förderung?
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 12px" }}>
          Die großen Wellen kommen aus der Bundespolitik — Einspeisevergütung, Mehrwertsteuer, Strompreis.
          Länder und Kommunen fördern zusätzlich, aber diese Programme sind zu klein, um die bundesweite
          Kurve sichtbar zu bewegen. Sie lohnen sich für die einzelne Anlage trotzdem. Welche Programme es
          in deiner Region gibt, findest du hier:
        </p>
        <a
          href="/photovoltaik-foerderung"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: v("--color-accent"),
            color: v("--color-text-on-accent"),
            fontSize: 14,
            fontWeight: 700,
            padding: "10px 16px",
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          Förderprogramme nach Region →
        </a>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: v("--color-text-secondary"), margin: "14px 0 0" }}>
          Du überlegst, ob sich eine Anlage für dich rechnet?{" "}
          <a href="/photovoltaik-rechner" style={{ color: v("--color-accent"), fontWeight: 600 }}>
            Zum PV-Rechner
          </a>
          .
        </p>
      </div>

      {/* Quellen + Unverbindlichkeit */}
      <div style={{ fontSize: 11.5, lineHeight: 1.7, color: v("--color-text-muted"), padding: "0 4px" }}>
        <div>
          <strong>Zubau:</strong>{" "}
          <a href={DATA_SOURCES.mastr.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-text-secondary") }}>
            {sourceLabel(DATA_SOURCES.mastr)}
          </a>
          , Meldestand {asOf}.
        </div>
        <div>
          <strong>Einspeisevergütung:</strong>{" "}
          <a href={FEEDIN_HISTORY_META.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-text-secondary") }}>
            {sourceLabel(DATA_SOURCES.eegVerguetung)}
          </a>
          .
        </div>
        <div>
          <strong>Strompreis:</strong>{" "}
          <a href={PRICE_META.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-text-secondary") }}>
            Eurostat
          </a>
          , {PRICE_META.license} (Haushalt, Jahresmittel, ab 2007).
        </div>
        <div style={{ marginTop: 6 }}>
          Alle Angaben ohne Gewähr. Die Vergütungssätze sind gesetzliche EEG-Werte; verbindlich ist die
          jeweilige amtliche Quelle. Historische Jahressätze sind Jahresanfangs-Werte (ab April 2012 sank
          die Vergütung unterjährig).
        </div>
      </div>
    </div>
  );
}
