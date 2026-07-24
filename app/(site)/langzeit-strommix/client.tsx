"use client";

import LineChart, { LineSeries } from "../../../components/charts/LineChart";
import { v } from "../../../lib/theme";
import { DATA_SOURCES } from "../../../lib/data-sources";
import {
  STROMMIX_HISTORY_META,
  STROMMIX_HISTORY_YEARS,
  STROMMIX_HISTORY_SERIES,
  CO2_INTENSITY_META,
  CO2_INTENSITY_YEARS,
  CO2_INTENSITY_VALUES,
  CO2_ABSOLUTE_VALUES,
  PRICE_META,
  PRICE_YEARS,
  PRICE_HOUSEHOLD,
  PRICE_INDUSTRY,
} from "../../../lib/strommix-history";

// Gemeinsame Zeitachse für alle drei Charts, damit sie exakt untereinander fluchten.
const X_DOMAIN: [number, number] = [1990, 2025];

const co2Series: LineSeries[] = [
  {
    key: "co2",
    label: "CO₂/kWh",
    colorToken: "--color-negative",
    values: CO2_INTENSITY_VALUES,
  },
];

const co2AbsSeries: LineSeries[] = [
  {
    key: "co2abs",
    label: "Mio. t",
    colorToken: "--color-energy-lignite",
    values: CO2_ABSOLUTE_VALUES,
  },
];

const priceSeries: LineSeries[] = [
  {
    key: "household",
    label: "Haushalt",
    colorToken: "--color-accent",
    values: PRICE_HOUSEHOLD,
  },
  {
    key: "industry",
    label: "Industrie",
    colorToken: "--color-accent-dark",
    values: PRICE_INDUSTRY,
  },
];

function ChartBlock({
  title,
  unit,
  children,
}: {
  title: string;
  unit: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: v("--color-text-primary") }}>
          {title}
        </span>
        <span style={{ fontSize: 12, color: v("--color-text-muted") }}>in {unit}</span>
      </div>
      {children}
    </div>
  );
}

export default function LangzeitStrommixClient() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div
        style={{
          background: v("--color-bg"),
          border: `1px solid ${v("--color-border")}`,
          borderRadius: 14,
          padding: "22px 20px 18px",
        }}
      >
        <div style={{ marginBottom: 4, fontSize: 12, color: v("--color-text-muted"), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Stromerzeugung Deutschland
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", color: v("--color-text-primary") }}>
          Der deutsche Strommix 1990–2025 im Zusammenhang
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: v("--color-text-secondary"), margin: "0 0 4px" }}>
          Drei Blickwinkel auf dieselbe Zeitachse: Woraus der Strom erzeugt wird,
          wie sauber jede Kilowattstunde ist, und was sie kostet.
        </p>

        <ChartBlock title="Bruttostromerzeugung nach Energieträgern" unit="TWh">
          <LineChart
            years={STROMMIX_HISTORY_YEARS}
            series={STROMMIX_HISTORY_SERIES}
            unit={STROMMIX_HISTORY_META.unit}
            xDomain={X_DOMAIN}
            height={360}
          />
        </ChartBlock>

        <ChartBlock title="CO₂-Emissionen der Stromerzeugung" unit="Mio. t CO₂">
          <LineChart
            years={CO2_INTENSITY_YEARS}
            series={co2AbsSeries}
            unit="Mio. t"
            xDomain={X_DOMAIN}
            height={190}
          />
        </ChartBlock>

        <ChartBlock title="CO₂-Intensität des Strommix" unit="g CO₂/kWh">
          <LineChart
            years={CO2_INTENSITY_YEARS}
            series={co2Series}
            unit={CO2_INTENSITY_META.unit}
            xDomain={X_DOMAIN}
            height={190}
          />
        </ChartBlock>

        <ChartBlock title="Strompreis (Haushalt & Industrie)" unit="ct/kWh">
          <LineChart
            years={PRICE_YEARS}
            series={priceSeries}
            unit={PRICE_META.unit}
            xDomain={X_DOMAIN}
            height={190}
          />
          <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: 2, paddingLeft: 48 }}>
            Preise erst ab 2007 — davor kein vergleichbarer, offen lizenzierter Datensatz (Markt bis 1998 reguliert).
          </div>
        </ChartBlock>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${v("--color-border")}`, fontSize: 11, lineHeight: 1.6, color: v("--color-text-muted") }}>
          <div>
            <strong>Mix &amp; CO₂:</strong>{" "}
            <a href={DATA_SOURCES.uba.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-text-secondary") }}>
              {DATA_SOURCES.uba.name}
            </a>
            , {DATA_SOURCES.uba.license} ({DATA_SOURCES.uba.note}).
          </div>
          <div>
            <strong>Preise:</strong>{" "}
            <a href={DATA_SOURCES.eurostat.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-text-secondary") }}>
              {DATA_SOURCES.eurostat.name}
            </a>
            , {DATA_SOURCES.eurostat.license}.
          </div>
        </div>
      </div>
    </div>
  );
}
