"use client";

import LineChart, { LineSeries } from "../../../components/charts/LineChart";
import AutoHeightIframe from "../../../components/AutoHeightIframe";
import { v } from "../../../lib/theme";
import { DataSourceNote } from "../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../lib/data-sources";
import {
  YEARS_2000_2024,
  WINDSOLAR_SHARE_SERIES,
  CO2_INTENSITY_COMPARE_SERIES,
  PERCAPITA_SERIES,
} from "../../../lib/country-comparison";

function ChartHead({ title, unit, hint }: { title: string; unit: string; hint?: string }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: v("--color-text-primary") }}>{title}</span>
        <span style={{ fontSize: 12, color: v("--color-text-muted") }}>in {unit}</span>
      </div>
      {hint && (
        <div style={{ fontSize: 12.5, color: v("--color-text-secondary"), marginBottom: 4, lineHeight: 1.45 }}>
          {hint}
        </div>
      )}
    </>
  );
}

// Statischer Vergleichschart (mehrere Länder, keine Interaktion).
function StaticChart({
  title,
  unit,
  hint,
  years,
  series,
  xDomain,
  height,
}: {
  title: string;
  unit: string;
  hint?: string;
  years: number[];
  series: LineSeries[];
  xDomain: [number, number];
  height: number;
}) {
  return (
    <div style={{ marginTop: 26 }}>
      <ChartHead title={title} unit={unit} hint={hint} />
      <LineChart years={years} series={series} unit={unit} xDomain={xDomain} height={height} />
    </div>
  );
}

export default function LaendervergleichClient() {
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
          Energiewende im Ländervergleich
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", color: v("--color-text-primary") }}>
          Geht Deutschland einen Sonderweg?
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: v("--color-text-secondary"), margin: "0 0 2px" }}>
          Datenexploration zum Stromsektor — was wir haben, um das Vorurteil
          einzuordnen.
        </p>

        <StaticChart
          title="Anteil Wind &amp; Solar an der Stromerzeugung"
          unit="%"
          hint="Vorsicht: Anteile lassen Deutschland wie einen Ausreißer wirken — Absolutwerte erzählen mehr."
          years={YEARS_2000_2024}
          series={WINDSOLAR_SHARE_SERIES}
          xDomain={[2000, 2024]}
          height={300}
        />

        <StaticChart
          title="CO₂-Intensität der Stromerzeugung"
          unit="g CO₂/kWh"
          hint="Produktionsbasiert: direkte Emissionen der Erzeugung im Land. Frankreich (Atom) unten, Indien oben."
          years={YEARS_2000_2024}
          series={CO2_INTENSITY_COMPARE_SERIES}
          xDomain={[2000, 2024]}
          height={280}
        />
        <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: 4, paddingLeft: 48, lineHeight: 1.45 }}>
          Hinweis: produktionsbasierte Werte (Ember). Frankreichs Wert liegt
          dadurch etwas höher als die verbrauchs-/lebenszyklusbasierten Zahlen des
          Netzbetreibers RTE (~20–30&nbsp;g/kWh) — dieselbe Größenordnung, andere
          Methodik.
        </div>

        <div style={{ marginTop: 26 }}>
          <AutoHeightIframe
            src="/embed/zubau-erneuerbare-atom"
            title="Zubau: Erneuerbare vs. Atomkraft"
            fallbackHeight={420}
          />
        </div>

        <StaticChart
          title="Wind- &amp; Solarstrom pro Kopf"
          unit="kWh je Einwohner"
          hint="Bereinigt um die Landesgröße. Dänemark, Australien, Niederlande bauen pro Kopf mehr als Deutschland."
          years={YEARS_2000_2024}
          series={PERCAPITA_SERIES}
          xDomain={[2000, 2024]}
          height={300}
        />

        <div style={{ marginTop: 22, paddingTop: 12, borderTop: `1px solid ${v("--color-border")}`, fontSize: 11, lineHeight: 1.6, color: v("--color-text-muted") }}>
          <DataSourceNote source={DATA_SOURCES.ember} />. Bevölkerung für Pro-Kopf aus Embers Verbrauchsdaten abgeleitet.
        </div>
      </div>
    </div>
  );
}
