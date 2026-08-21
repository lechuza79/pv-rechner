"use client";

import LineChart, { LineSeries } from "../../../components/charts/LineChart";
import AutoHeightIframe from "../../../components/AutoHeightIframe";
import { v } from "../../../lib/theme";
import { DataSourceNote } from "../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../lib/data-sources";
import {
  YEARS_ANTEIL,
  YEARS_ZUBAU,
  WINDSOLAR_SHARE_SERIES,
  CO2_INTENSITY_COMPARE_SERIES,
  PERCAPITA_SERIES,
  YEARS_PERCAPITA,
  ZUBAU_BY_COUNTRY,
} from "../../../lib/country-comparison";

/**
 * Was die Weltkurve wirklich zeigt.
 *
 * Jede Zahl wird aus derselben Reihe gerechnet, die das Chart darüber zeichnet —
 * kein getippter Wert, der beim nächsten Datenlauf still veraltet. Auch die
 * JAHRE werden gesucht statt genannt: Das Rückgangsjahr ist das jüngste mit
 * negativer Veränderung, nicht „2021".
 */
function ZubauEinordnung() {
  const welt = ZUBAU_BY_COUNTRY.find((c) => c.label === "Welt")!;
  const china = ZUBAU_BY_COUNTRY.find((c) => c.label === "China")!;
  const i = YEARS_ZUBAU.length - 1;
  const anteil = Math.round((china.windsolar[i] / welt.windsolar[i]) * 100);

  // Das jüngste Jahr, in dem der weltweite Zubau ZURÜCKGING — dort liegt der
  // einzige Knick nach unten, und er ist die Probe aufs Exempel.
  let rueck = -1;
  for (let n = 1; n <= i; n++) if (welt.windsolar[n] < welt.windsolar[n - 1]) rueck = n;
  const weltDelta = rueck > 0 ? welt.windsolar[rueck] - welt.windsolar[rueck - 1] : 0;
  const chinaDelta = rueck > 0 ? china.windsolar[rueck] - china.windsolar[rueck - 1] : 0;
  // Ohne China: Wäre der Rest der Welt in dem Jahr gewachsen?
  const restWuchs = weltDelta - chinaDelta > 0;
  const gw = (n: number) => `${Math.round(Math.abs(n)).toLocaleString("de-DE")} GW`;

  return (
    <div
      style={{
        fontSize: 13,
        lineHeight: 1.6,
        color: v("--color-text-secondary"),
        marginTop: 12,
        paddingLeft: 48,
      }}
    >
      <strong style={{ color: v("--color-text-primary") }}>
        Die Weltkurve ist zum großen Teil eine chinesische.
      </strong>{" "}
      Von den {gw(welt.windsolar[i])} Wind und Solar, die {YEARS_ZUBAU[i]} weltweit neu ans Netz
      gingen, entfielen {gw(china.windsolar[i])} auf China — {anteil}&nbsp;Prozent.
      {rueck > 0 && (
        <>
          {" "}
          {/* „der jüngste", nicht „der einzige": Die Weltreihe hat zwei
              Rückgänge (2013 und 2021), und der Code sucht ohnehin den
              jüngsten. Eine Behauptung von Einzigartigkeit wäre schon heute
              falsch und würde beim nächsten Datenlauf niemandem auffallen. */}
          Auch der jüngste Rückgang kommt von dort: {YEARS_ZUBAU[rueck]} sank der
          weltweite Zubau um {gw(weltDelta)}, während China allein um {gw(chinaDelta)} zurückfiel
          {restWuchs ? " — der Rest der Welt wuchs in diesem Jahr" : ""}. Dahinter stand kein
          Nachfrageeinbruch, sondern ein vorgezogener Boom: Chinas Förderung lief aus, und die
          Projekte wurden noch ins Vorjahr gezogen. Die Internationale Energieagentur beziffert den
          Rückschlag danach auf 55&nbsp;% weniger Onshore-Wind und 22&nbsp;% weniger
          Freiflächen-Solar gegenüber dem Rekordjahr.
        </>
      )}
    </div>
  );
}

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
          years={YEARS_ANTEIL}
          series={WINDSOLAR_SHARE_SERIES}
          xDomain={[YEARS_ANTEIL[0], YEARS_ANTEIL[YEARS_ANTEIL.length - 1]]}
          height={300}
        />

        <StaticChart
          title="CO₂-Intensität der Stromerzeugung"
          unit="g CO₂/kWh"
          hint="Produktionsbasiert: direkte Emissionen der Erzeugung im Land. Frankreich (Atom) unten, Indien oben."
          years={YEARS_ANTEIL}
          series={CO2_INTENSITY_COMPARE_SERIES}
          xDomain={[YEARS_ANTEIL[0], YEARS_ANTEIL[YEARS_ANTEIL.length - 1]]}
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
            src="/embed/zubau-erneuerbare-atom?onsite=1"
            title="Zubau: Erneuerbare vs. Atomkraft"
            fallbackHeight={420}
          />
        </div>
        <ZubauEinordnung />

        {/* EIGENE Jahresachse: Diese Reihe endet ein Jahr früher als die
            übrigen, weil Ember die Einwohnerzahl aus dem Datensatz genommen
            hat. Gegen die längere Achse gezeichnet läge jeder Wert ein Jahr
            daneben — im Bild nicht zu erkennen. */}
        <StaticChart
          title="Wind- &amp; Solarstrom pro Kopf"
          unit="kWh je Einwohner"
          hint="Bereinigt um die Landesgröße. Dänemark, Australien, Niederlande bauen pro Kopf mehr als Deutschland."
          years={YEARS_PERCAPITA}
          series={PERCAPITA_SERIES}
          xDomain={[YEARS_PERCAPITA[0], YEARS_PERCAPITA[YEARS_PERCAPITA.length - 1]]}
          height={300}
        />
        <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: 4, paddingLeft: 48, lineHeight: 1.45 }}>
          Diese Reihe endet {YEARS_PERCAPITA[YEARS_PERCAPITA.length - 1]}, ein Jahr vor den
          übrigen: Sie braucht die Einwohnerzahl, und die führt der Datensatz seit der
          Umstellung im Juli 2026 nicht mehr mit.
        </div>

        <div style={{ marginTop: 22, paddingTop: 12, borderTop: `1px solid ${v("--color-border")}`, fontSize: 11, lineHeight: 1.6, color: v("--color-text-muted") }}>
          <DataSourceNote source={DATA_SOURCES.ember} />. Bevölkerung für Pro-Kopf aus Embers
          früheren Verbrauchsdaten abgeleitet.
        </div>
      </div>
    </div>
  );
}
