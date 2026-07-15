"use client";

import { useState } from "react";
import { v } from "../../lib/theme";

export type MetricMode = "gesamt" | "dach";

export type MetricView = {
  /** Watt per inhabitant. */
  value: number | null;
  rank: number | null;
  of: number;
  /** Comparison bars: this region against its parents. */
  vergleich: { label: string; value: number | null }[];
};

/**
 * Hero figure with a switch between both per-capita metrics.
 *
 * Both are shown because both are true. The total is the honest state of play;
 * the roof-only figure separates what a Gemeinde and its residents did on their
 * own buildings from how much open land happened to be available. A dense
 * commuter town has no fields to build on, and ranking it against a village with
 * a solar park on that basis would say nothing about either.
 */
export default function MetricToggle({
  gesamt,
  dach,
  regionName,
  ownHasFreiflaeche,
}: {
  gesamt: MetricView;
  dach: MetricView;
  regionName: string;
  /**
   * Whether this region has open-field plants of its own. Note this does NOT
   * gate the switch: a Gemeinde without a single solar park still needs the
   * roof-only view, because the Kreis and Land it is measured against are full
   * of them. Höchberg is the case in point — no open field at all, and 48th of
   * 52 on the total figure purely because its neighbours have fields and it has
   * houses. Hiding the switch there would hide it exactly where it matters.
   */
  ownHasFreiflaeche: boolean;
}) {
  const [mode, setMode] = useState<MetricMode>("gesamt");
  const view = mode === "gesamt" ? gesamt : dach;
  const max = Math.max(1, ...view.vergleich.map((c) => c.value ?? 0), view.value ?? 0);

  return (
    <div style={S.card}>
      <div style={S.switchRow}>
        {(["gesamt", "dach"] as MetricMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              ...S.switchBtn,
              background: mode === m ? v("--color-accent") : "transparent",
              color: mode === m ? v("--color-text-on-accent") : v("--color-text-secondary"),
            }}
          >
            {m === "gesamt" ? "Alle Anlagen" : "Nur Dachanlagen"}
          </button>
        ))}
      </div>

      <div style={S.heroRow}>
        <div>
          <div style={S.heroValue}>
            {view.value === null ? "—" : view.value.toLocaleString("de-DE")}
            <span style={S.heroUnit}> W</span>
          </div>
          <div style={S.heroLabel}>
            {mode === "gesamt" ? "Solarleistung" : "Dach-Solarleistung"} je Einwohner
          </div>
        </div>
        {view.rank !== null && (
          <div style={S.rankBox}>
            <div style={S.rankValue}>
              {view.rank}
              <span style={S.rankOf}> von {view.of}</span>
            </div>
            <div style={S.heroLabel}>im Landkreis</div>
          </div>
        )}
      </div>

      <div style={S.bars}>
        {view.vergleich.map((c) => (
          <div key={c.label}>
            <div style={S.barHead}>
              <span>{c.label}</span>
              <span style={S.barVal}>{c.value === null ? "—" : `${c.value.toLocaleString("de-DE")} W`}</span>
            </div>
            <div style={S.barTrack}>
              <div
                style={{
                  ...S.barFill,
                  width: `${Math.max(2, Math.round(((c.value ?? 0) / max) * 100))}%`,
                  background: c.label.startsWith("→") ? v("--color-accent") : v("--color-accent-light"),
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/*
        Strictly factual, no causal claim. It is tempting to write "X lies behind
        because the others have open fields" — but that is often simply false.
        Höchberg has no open field at all and still ranks 48th of 52 with them
        removed: a dense commuter town has less roof per inhabitant than a village
        of farmsteads. Explaining away a gap the data does not explain would be
        exactly the kind of spin that makes a page useless to the Gemeinde reading it.
      */}
      {mode === "gesamt" ? (
        <p style={S.note}>
          {ownHasFreiflaeche
            ? `Dieser Wert enthält Freiflächenanlagen. Wo viel Fläche zur Verfügung steht, fällt er
               entsprechend hoch aus. Die zweite Ansicht rechnet sie überall heraus.`
            : `${regionName} hat keine Freiflächenanlagen — dieser Wert stammt vollständig von
               Dächern. Die Vergleichswerte von Landkreis, Land und Bund enthalten welche; die
               zweite Ansicht rechnet sie überall heraus.`}
        </p>
      ) : (
        <p style={S.note}>
          Nur Anlagen auf Gebäuden, Freiflächen sind überall herausgerechnet. Das vergleicht, was
          auf Dächern gebaut wurde — unabhängig davon, wie viel Acker daneben liegt.
        </p>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    background: v("--color-bg-accent"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-lg"),
    padding: "18px 20px",
    marginBottom: 28,
  },
  switchRow: {
    display: "inline-flex",
    gap: 2,
    padding: 3,
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 999,
    marginBottom: 16,
  },
  switchBtn: {
    border: "none",
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  heroRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 },
  heroValue: { fontFamily: v("--font-mono"), fontSize: 40, fontWeight: 700, lineHeight: 1, color: v("--color-accent") },
  heroUnit: { fontSize: 20, fontWeight: 400, color: v("--color-text-secondary") },
  heroLabel: { fontSize: 12, color: v("--color-text-secondary"), marginTop: 6 },
  rankBox: { textAlign: "right" },
  rankValue: { fontFamily: v("--font-mono"), fontSize: 26, fontWeight: 700, lineHeight: 1 },
  rankOf: { fontSize: 13, fontWeight: 400, color: v("--color-text-secondary") },
  bars: { display: "flex", flexDirection: "column", gap: 9 },
  barHead: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 },
  barVal: { fontFamily: v("--font-mono"), color: v("--color-text-secondary") },
  barTrack: { height: 8, background: v("--color-bg"), borderRadius: 4 },
  barFill: { height: "100%", borderRadius: 4 },
  note: { fontSize: 11, lineHeight: 1.6, color: v("--color-text-muted"), margin: "14px 0 0" },
};
