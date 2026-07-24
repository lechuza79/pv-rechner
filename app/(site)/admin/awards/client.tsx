"use client";

import { v, space, pad } from "../../../../lib/theme";
import { fmtPvLeistung, fmtWattProKopf } from "../../../../lib/atlas-format";
import type { MetricFormat } from "../../../../lib/awards";

export type AwardRow = {
  regionId: string;
  name: string;
  blShort: string;
  value: number;
  population: number;
  rank: number;
};

export type CategoryView = {
  key: string;
  label: string;
  merit: string;
  format: MetricFormat;
  perCapita: boolean;
  minPopulation: boolean;
  hasData: boolean;
  eligibleTotal: number;
  deTop: AwardRow[];
  blWinners: AwardRow[];
};

export type AwardsPayload = {
  minPop: number;
  totalGemeinden: number;
  categories: CategoryView[];
};

function formatValue(value: number, format: MetricFormat): string {
  switch (format) {
    case "wattProKopf":
      return fmtWattProKopf(value);
    case "pvLeistung":
      return fmtPvLeistung(value);
    case "count":
      return `${Math.round(value).toLocaleString("de-DE")} Anlagen`;
    case "countPer1000":
      return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} je 1.000 Ew.`;
  }
}

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

export default function AwardsClient({ payload }: { payload: AwardsPayload }) {
  const { minPop, totalGemeinden, categories } = payload;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.xl }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: v("--color-text-primary"), margin: 0 }}>
          Kommunen-Solar-Awards
        </h1>
        <p style={{ fontSize: 14, color: v("--color-text-secondary"), marginTop: space.xs, maxWidth: 640, lineHeight: 1.5 }}>
          Backend-Prototyp zum Festzurren: die Sieger je Kategorie, gerechnet aus{" "}
          {nf(totalGemeinden)} bewohnten Gemeinden. Noch keine Darstellung nach außen — hier
          prüfen wir, ob die Kategorien glaubwürdige Gemeinden nach oben spülen und wo die
          Einwohner-Schwelle sitzen muss.
        </p>
      </header>

      {/* Stellknopf: Einwohner-Schwelle für die Pro-Kopf-Kategorien. */}
      <form
        method="get"
        action="/admin/awards"
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: space.md,
          flexWrap: "wrap",
          background: v("--color-bg-muted"),
          border: `1px solid ${v("--color-border")}`,
          borderRadius: v("--radius-md"),
          padding: pad("md", "lg"),
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: v("--color-text-muted") }}>
            Einwohner-Schwelle (Pro-Kopf-Kategorien)
          </span>
          <input
            type="number"
            name="minPop"
            defaultValue={minPop}
            min={0}
            step={500}
            style={{
              width: 160,
              fontSize: 15,
              fontFamily: v("--font-mono"),
              padding: pad("sm", "md"),
              background: v("--color-bg"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-sm"),
              color: v("--color-text-primary"),
            }}
          />
        </label>
        <button
          type="submit"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: v("--color-text-on-accent"),
            background: v("--color-accent"),
            border: "none",
            borderRadius: v("--radius-sm"),
            padding: pad("sm", "lg"),
            cursor: "pointer",
          }}
        >
          Neu berechnen
        </button>
        <span style={{ fontSize: 13, color: v("--color-text-secondary"), alignSelf: "center" }}>
          Aktuell: Gemeinden ab <strong>{nf(minPop)}</strong> Einwohnern kommen in die
          Pro-Kopf-Wertung.
        </span>
      </form>

      {categories.map((cat) => (
        <CategoryCard key={cat.key} cat={cat} />
      ))}
    </div>
  );
}

function CategoryCard({ cat }: { cat: CategoryView }) {
  const winner = cat.deTop[0];

  return (
    <section
      style={{
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-lg"),
        padding: pad("lg", "lg"),
        display: "flex",
        flexDirection: "column",
        gap: space.md,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: space.sm, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: v("--color-text-primary"), margin: 0 }}>
            {cat.label}
          </h2>
          <span style={{ fontSize: 12, color: v("--color-text-muted") }}>
            {cat.perCapita ? "pro Kopf" : "absolut"}
            {cat.minPopulation ? " · mit Einwohner-Schwelle" : ""}
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: v("--color-text-secondary"), marginTop: space.xs, maxWidth: 640, lineHeight: 1.5 }}>
          {cat.merit}
        </p>
      </div>

      {!cat.hasData ? (
        <div
          style={{
            fontSize: 13.5,
            color: v("--color-text-secondary"),
            background: v("--color-bg-muted"),
            border: `1px dashed ${v("--color-border")}`,
            borderRadius: v("--radius-md"),
            padding: pad("md", "md"),
          }}
        >
          Datengrundlage folgt: Balkon- und Zubau-Zahlen liegen nur im großen Rohkorn und
          brauchen eine schmale Erweiterung des Gemeinde-Rollups (analog zur Dachleistung).
          Das ist der nächste Schritt — die Mechanik dieser Kategorie steht bereits.
        </div>
      ) : (
        <>
          {winner && (
            <div
              style={{
                background: v("--color-accent-dim"),
                border: `1px solid ${v("--color-border")}`,
                borderRadius: v("--radius-md"),
                padding: pad("md", "lg"),
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: space.md,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: v("--color-text-muted") }}>
                  Bundesweiter Sieger
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: v("--color-text-primary"), marginTop: 2 }}>
                  {winner.name} <span style={{ fontSize: 13, fontWeight: 600, color: v("--color-text-muted") }}>({winner.blShort})</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: v("--font-mono"), color: v("--color-accent") }}>
                  {formatValue(winner.value, cat.format)}
                </div>
                <div style={{ fontSize: 12, color: v("--color-text-muted") }}>{nf(winner.population)} Einwohner</div>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: space.lg }}>
            <RankList title={`Top 10 bundesweit`} rows={cat.deTop} format={cat.format} showBl />
            <RankList
              title="Sieger je Bundesland"
              rows={cat.blWinners}
              format={cat.format}
              showBl
              rankFromField
            />
          </div>

          <div style={{ fontSize: 12, color: v("--color-text-muted") }}>
            {nf(cat.eligibleTotal)} Gemeinden wertbar in dieser Kategorie.
          </div>
        </>
      )}
    </section>
  );
}

function RankList({
  title,
  rows,
  format,
  showBl,
  rankFromField,
}: {
  title: string;
  rows: AwardRow[];
  format: MetricFormat;
  showBl?: boolean;
  rankFromField?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: v("--color-text-muted"), marginBottom: space.sm }}>
        {title}
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {rows.map((r, i) => (
          <li
            key={r.regionId}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: space.sm,
              padding: pad("xs", "sm"),
              borderRadius: v("--radius-sm"),
              background: i === 0 && !rankFromField ? v("--color-bg-muted") : "transparent",
              fontSize: 13.5,
            }}
          >
            <span style={{ color: v("--color-text-primary"), minWidth: 0 }}>
              <span style={{ color: v("--color-text-muted"), fontFamily: v("--font-mono"), marginRight: space.xs }}>
                {rankFromField ? `${r.blShort}` : `${i + 1}.`}
              </span>
              {r.name}
              {showBl && !rankFromField ? (
                <span style={{ color: v("--color-text-muted"), fontSize: 12 }}> ({r.blShort})</span>
              ) : null}
            </span>
            <span style={{ fontFamily: v("--font-mono"), color: v("--color-text-secondary"), whiteSpace: "nowrap" }}>
              {formatValue(r.value, format)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
