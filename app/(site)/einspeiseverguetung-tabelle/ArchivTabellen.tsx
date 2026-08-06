"use client";

// Transponierte Nachschlage-Tabelle des BNetzA-Archivs (2012–2022): Jahre als
// Spalten, Monate als Zeilen, über jeder Jahresspalte die 12 Monatsbalken als
// Mini-Chart (gemeinsame Skala) — Balken und Werte derselben Spalte zeigen
// dieselben Daten. Entwurf des Betreibers vom 04.08.2026: die ersten Monate
// als Teaser, der Rest klappt auf. ALLE Zeilen sind server-gerendert im DOM
// (SEO), eingeklappt nur per display:none versteckt — dasselbe Prinzip wie
// die Erklärtexte der Ereignis-Timeline.
import { useState } from "react";
import { topRoundedRect } from "../../../components/charts/ZubauTimelineChart";
import { FEED_IN_ARCHIV } from "../../../lib/feedin-archiv";
import { v } from "../../../lib/theme";
import { MONAT_KURZ } from "./VerlaufsChart";

const ct = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2 });

/** Teaser-Zeilen (Jan–Apr): jede Jahresspalte zeigt mindestens einen echten
 *  Wert (das Archiv beginnt im April 2012). */
const TEASER_MONATE = 4;

// Gemeinsame Balken-Skala über beide Größenklassen (größter Archivwert),
// damit die Mini-Charts der Jahresspalten untereinander vergleichbar sind.
const ARCHIV_MAX = Math.max(...FEED_IN_ARCHIV.map((r) => r.u10));

function archivMatrix(field: "u10" | "u40"): { year: number; months: (number | null)[] }[] {
  const byYear = new Map<number, (number | null)[]>();
  for (const row of FEED_IN_ARCHIV) {
    const y = Number(row.ym.slice(0, 4));
    const m = Number(row.ym.slice(5, 7));
    if (!byYear.has(y)) byYear.set(y, Array(12).fill(null));
    byYear.get(y)![m - 1] = row[field];
  }
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, months]) => ({ year, months }));
}

/** Mini-Balkenchart einer Jahresspalte — Haus-Stil (oben abgerundet). */
function JahresBalken({ months }: { months: (number | null)[] }) {
  const W = 46;
  const H = 34;
  const slot = W / 12;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" style={{ display: "block", margin: "4px auto 0" }}>
      {months.map((val, i) => {
        if (val == null) return null;
        const h = Math.max((val / ARCHIV_MAX) * (H - 2), 1);
        return (
          <path
            key={i}
            d={topRoundedRect(i * slot + 0.4, H - h, slot - 0.8, h, 1)}
            fill={v("--color-accent")}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

const T = {
  th: {
    textAlign: "center" as const,
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap" as const,
  },
  thLeft: {
    textAlign: "left" as const,
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap" as const,
    verticalAlign: "bottom" as const,
  },
  td: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    lineHeight: 1.4,
    whiteSpace: "nowrap" as const,
  },
  tdNum: {
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-small"),
    textAlign: "center" as const,
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap" as const,
  },
};

export default function ArchivTabelle({ field }: { field: "u10" | "u40" }) {
  const [offen, setOffen] = useState(false);
  const jahre = archivMatrix(field);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 680 }}>
          <thead>
            <tr>
              <th style={T.thLeft}>Monat</th>
              {jahre.map((j) => (
                <th key={j.year} style={T.th}>
                  {j.year}
                  <JahresBalken months={j.months} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONAT_KURZ.map((monat, mi) => (
              <tr key={monat} style={mi >= TEASER_MONATE && !offen ? { display: "none" } : undefined}>
                <td style={T.td}>{monat}</td>
                {jahre.map((j) => {
                  const val = j.months[mi];
                  return (
                    <td key={j.year} style={{ ...T.tdNum, color: val == null ? v("--color-text-muted") : v("--color-text-primary") }}>
                      {val == null ? "—" : ct(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        style={{
          marginTop: 6,
          padding: "7px 14px",
          borderRadius: v("--radius-md"),
          border: `1px solid ${v("--color-border")}`,
          background: v("--color-bg"),
          color: v("--color-accent"),
          fontSize: v("--font-size-small"),
          fontWeight: 600,
          fontFamily: v("--font-text"),
          cursor: "pointer",
        }}
      >
        {offen ? "Weniger anzeigen" : `Alle Monate anzeigen (${MONAT_KURZ[TEASER_MONATE]}–${MONAT_KURZ[11]})`}
      </button>
    </div>
  );
}
