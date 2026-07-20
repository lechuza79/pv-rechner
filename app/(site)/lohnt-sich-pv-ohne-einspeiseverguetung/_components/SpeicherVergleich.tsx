"use client";
import { useState } from "react";
import Link from "next/link";
import { v } from "../../../../lib/theme";
import Chart from "../../photovoltaik-rechner/_components/Chart";
import ScenarioTabs from "../../../../components/ScenarioTabs";

// Amortisation comparison for the EEG guide, ALL in the "ohne Einspeisevergütung"
// mode (the page's premise, einspeisung=0). Top = Strompreis-Szenario tabs (the
// SCENARIOS from constants, +1/+3/+5 %/Jahr — same optics/component as the result
// page). Below = TWO columns side by side, "ohne Speicher" vs "mit Speicher" for
// the same 10 kWp system. The active scenario tab switches BOTH columns at once,
// so the storage effect is read directly, ohne↔mit, in the chosen scenario.
//
// All numbers arrive pre-computed from the server (shared calc base). Each column
// carries one amortization line + tiles per scenario; the client only picks the
// active scenario. Mobile: the two columns stack.

type ScenarioLine = {
  id: string;
  color: string;
  data: { years: { i: number; kum: number }[]; be: { i: number; kum: number } | undefined };
};

export interface ColScenario {
  amortisation: number | null;
  gewinn25: number;
  line: ScenarioLine;
  href: string;
}

export interface VergleichColumn {
  /** Stable key. */
  key: string;
  /** Column heading, e.g. "Ohne Speicher". */
  title: string;
  /** Small caption, e.g. "10 kWp · kein Speicher". */
  sub: string;
  kosten: number;
  /** Per-scenario figures, keyed by scenario id. */
  byScenario: Record<string, ColScenario>;
}

export interface ScenarioTabMeta {
  id: string;
  label: string;
  sub: string;
  explain: string;
}

export default function SpeicherVergleich({
  tabs,
  columns,
}: {
  tabs: ScenarioTabMeta[];
  columns: VergleichColumn[];
}) {
  const [selected, setSelected] = useState<string>(
    tabs.find((t) => t.id === "realistic")?.id ?? tabs[0]?.id ?? "realistic",
  );

  const tileLabel = {
    fontSize: 10,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    fontWeight: 600,
  } as const;
  const tileValue = {
    fontSize: 17,
    fontWeight: 800,
    fontFamily: v("--font-mono"),
    marginTop: 3,
    lineHeight: 1.15,
  } as const;

  return (
    <ScenarioTabs
      tabs={tabs}
      selected={selected}
      onSelect={setSelected}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {columns.map((col) => {
          const sc = col.byScenario[selected] ?? Object.values(col.byScenario)[0];
          return (
            <div
              key={col.key}
              style={{
                background: v("--color-bg"),
                borderRadius: v("--radius-md"),
                border: `1px solid ${v("--color-border")}`,
                padding: 12,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700, color: v("--color-text-primary") }}>{col.title}</div>
              <div style={{ fontSize: 11, color: v("--color-text-muted"), fontFamily: v("--font-mono"), marginTop: 2, marginBottom: 10 }}>
                {col.sub}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={tileLabel}>Amortisation</div>
                  <div style={{ ...tileValue, color: v("--color-accent") }}>
                    {sc.amortisation != null ? `~${sc.amortisation} J` : ">25 J"}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={tileLabel}>Gewinn 25 J</div>
                  <div style={{ ...tileValue, color: sc.gewinn25 >= 0 ? v("--color-positive") : v("--color-negative") }}>
                    {sc.gewinn25 > 0 ? "+" : ""}
                    {sc.gewinn25.toLocaleString("de-DE")} €
                  </div>
                </div>
              </div>

              {/* Single amortization line for the active scenario — no fan. */}
              <Chart scenarios={[sc.line]} kosten={col.kosten} highlightId={sc.line.id} />

              <Link
                href={sc.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                  padding: "8px 14px",
                  borderRadius: v("--radius-md"),
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: v("--color-accent"),
                  color: v("--color-text-on-accent"),
                  textDecoration: "none",
                  alignSelf: "flex-start",
                }}
              >
                Im Rechner öffnen →
              </Link>
            </div>
          );
        })}
      </div>
    </ScenarioTabs>
  );
}
