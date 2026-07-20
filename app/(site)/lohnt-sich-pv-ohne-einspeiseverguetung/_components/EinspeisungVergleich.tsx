"use client";
import { useState } from "react";
import Link from "next/link";
import { v } from "../../../../lib/theme";
import Chart from "../../photovoltaik-rechner/_components/Chart";

// Two-state comparison for the EEG guide: "Mit Einspeisevergütung" (today) vs.
// "Ohne Einspeisevergütung" (planned from 2027), both for ONE typical system
// with storage. Tab optics mirror the result page's ScenarioTabs (role=tablist,
// aria-selected, accent-dim active background, accent bottom border) so the two
// controls feel like the same product.
//
// All numbers arrive pre-computed from the server (same shared calc base as the
// calculator). The single amortization line is the realistic scenario only — no
// three-scenario fan (per user feedback the fan read as too complex here).

type ScenarioLine = {
  id: string;
  color: string;
  data: { years: { i: number; kum: number }[]; be: { i: number; kum: number } | undefined };
};

export interface VergleichView {
  /** Tab identity + labels. */
  id: "mit" | "ohne";
  tabLabel: string;
  tabSub: string;
  /** Sentence shown under the tiles for the active state. */
  explain: string;
  /** Result-style tiles. */
  amortisation: number | null;
  gewinn25: number;
  /** Realistic-scenario amortization line for the chart. */
  line: ScenarioLine;
  kosten: number;
  /** Deep link that opens this exact state in the calculator. */
  href: string;
}

export default function EinspeisungVergleich({ views }: { views: VergleichView[] }) {
  const [selected, setSelected] = useState<string>(views[0]?.id ?? "mit");
  const active = views.find((view) => view.id === selected) ?? views[0];
  if (!active) return null;

  const tileWrap = {
    background: v("--color-bg"),
    borderRadius: v("--radius-md"),
    padding: "11px 12px",
    border: `1px solid ${v("--color-border")}`,
  } as const;
  const tileLabel = {
    fontSize: 10.5,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    fontWeight: 600,
  } as const;
  const tileValue = {
    fontSize: 19,
    fontWeight: 800,
    fontFamily: v("--font-mono"),
    marginTop: 4,
    lineHeight: 1.15,
  } as const;

  return (
    <div
      style={{
        background: v("--color-bg"),
        borderRadius: v("--radius-lg"),
        border: `1px solid ${v("--color-border")}`,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* Tab switcher */}
      <div style={{ display: "flex" }} role="tablist" aria-label="Einspeisevergütung">
        {views.map((view) => {
          const on = view.id === active.id;
          return (
            <button
              key={view.id}
              role="tab"
              aria-selected={on}
              onClick={() => setSelected(view.id)}
              style={{
                flex: 1,
                padding: "11px 8px",
                cursor: "pointer",
                textAlign: "center",
                background: on ? v("--color-accent-dim") : "transparent",
                border: "none",
                borderBottom: `2px solid ${on ? v("--color-accent") : v("--color-border")}`,
                transition: "background .15s, border-color .15s",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: on ? v("--color-accent") : v("--color-text-muted"),
                  lineHeight: 1.25,
                }}
              >
                {view.tabLabel}
              </div>
              <div style={{ fontSize: 10.5, color: v("--color-text-muted"), fontFamily: v("--font-mono"), marginTop: 3 }}>
                {view.tabSub}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active state body */}
      <div style={{ padding: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div style={tileWrap}>
            <div style={tileLabel}>Amortisation</div>
            <div style={{ ...tileValue, color: v("--color-accent") }}>
              {active.amortisation != null ? `~${active.amortisation} Jahre` : ">25 Jahre"}
            </div>
          </div>
          <div style={tileWrap}>
            <div style={tileLabel}>Gewinn nach 25 Jahren</div>
            <div style={{ ...tileValue, color: active.gewinn25 >= 0 ? v("--color-positive") : v("--color-negative") }}>
              {active.gewinn25 > 0 ? "+" : ""}
              {active.gewinn25.toLocaleString("de-DE")} €
            </div>
          </div>
        </div>

        {/* Single realistic amortization line — no fan. */}
        <Chart scenarios={[active.line]} kosten={active.kosten} highlightId={active.line.id} />

        <div style={{ fontSize: 12, color: v("--color-text-secondary"), lineHeight: 1.6, marginTop: 12 }}>
          {active.explain}
        </div>

        <Link
          href={active.href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 14,
            padding: "9px 16px",
            borderRadius: v("--radius-md"),
            fontSize: 13,
            fontWeight: 700,
            background: v("--color-accent"),
            color: v("--color-text-on-accent"),
            textDecoration: "none",
          }}
        >
          Im Rechner öffnen →
        </Link>
      </div>
    </div>
  );
}
