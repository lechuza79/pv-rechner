"use client";

import { Fragment, useMemo, useState } from "react";
import { v, pad, space } from "../../lib/theme";

// Die Tabelle des internen Bereichs — eine Quelle für Aussehen, Sortierung und
// aufklappbare Zeilen.
//
// WARUM SIE ENTSTANDEN IST (27.08.2026): Es gab zwei handgebaute Kopien
// derselben Tabelle (Kommunen-Cockpit, Versorger-Liste), und sie waren schon
// auseinandergelaufen — Innenabstand sm/md gegen xs/sm, Buchstabenabstand 0,05
// gegen 0,06 em, Inhalt oben gegen mittig ausgerichtet. Keine dieser
// Abweichungen war eine Entscheidung; sie sind beim Kopieren entstanden. Bei
// einer dritten Kopie wäre das Muster endgültig verloren gewesen.
//
// Übernommen ist die großzügigere der beiden Fassungen (die des Cockpits):
// Zellen mit mehrzeiligem Inhalt wirken in der engen Variante gedrängt, und der
// Inhalt richtet sich oben aus, weil sonst in einer Zeile mit langem Text alle
// Nachbarzellen in der Mitte schweben.
//
// NICHT umgestellt sind die beiden Bestandstabellen. Das ist Absicht: Jede
// Rundung ist eine sichtbare Änderung und gehört einzeln abgenommen — dieselbe
// Regel wie bei der Abstands-Skala. Wer eine davon anfasst, zieht sie hierher.

export interface Spalte<T> {
  /** Stabiler Schlüssel, auch der Sortier-Schlüssel. */
  key: string;
  kopf: string;
  /** Was in der Zelle steht. */
  zelle: (zeile: T) => React.ReactNode;
  /**
   * Wonach sortiert wird. Fehlt sie, ist die Spalte nicht sortierbar — richtig
   * für alles, dessen Reihenfolge keine Aussage trägt.
   */
  sortWert?: (zeile: T) => string | number;
  /** Zahlen rechtsbündig, damit Größenordnungen untereinander lesbar sind. */
  rechts?: boolean;
  /** Bricht der Inhalt um? Standard ist einzeilig. */
  umbruch?: boolean;
}

export const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: v("--color-text-muted"),
  padding: pad("sm", "md"),
  background: v("--color-bg-muted"),
  whiteSpace: "nowrap",
};

export const tdStyle: React.CSSProperties = {
  padding: pad("sm", "md"),
  verticalAlign: "top",
};

type Richtung = "auf" | "ab";

/**
 * Vergleich für die Sortierung. Zahlen numerisch, Text nach deutschen Regeln
 * (sonst steht „Ökostrom“ hinter „Zubau“).
 */
function vergleiche(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "de");
}

export function DatenTabelle<T>({
  zeilen,
  spalten,
  schluessel,
  detail,
  startSortierung,
  leerText = "Nichts vorhanden.",
  minBreite = 720,
}: {
  zeilen: T[];
  spalten: Spalte<T>[];
  /** Eindeutiger Schlüssel je Zeile — nicht der Index, sonst springt der Aufklappzustand beim Sortieren. */
  schluessel: (zeile: T) => string;
  /** Inhalt der aufgeklappten Zeile. Fehlt er, ist die Tabelle nicht aufklappbar. */
  detail?: (zeile: T) => React.ReactNode;
  startSortierung?: { key: string; richtung: Richtung };
  leerText?: string;
  minBreite?: number;
}) {
  const [sortierung, setSortierung] = useState<{ key: string; richtung: Richtung } | null>(
    startSortierung ?? null,
  );
  const [offen, setOffen] = useState<Set<string>>(new Set());

  const sortiert = useMemo(() => {
    if (!sortierung) return zeilen;
    const spalte = spalten.find((s) => s.key === sortierung.key);
    if (!spalte?.sortWert) return zeilen;
    const faktor = sortierung.richtung === "auf" ? 1 : -1;
    // Kopie, damit die übergebene Liste unangetastet bleibt.
    return [...zeilen].sort((a, b) => faktor * vergleiche(spalte.sortWert!(a), spalte.sortWert!(b)));
  }, [zeilen, spalten, sortierung]);

  function sortieren(key: string) {
    setSortierung((s) =>
      s?.key === key ? { key, richtung: s.richtung === "auf" ? "ab" : "auf" } : { key, richtung: "auf" },
    );
  }

  function umschalten(k: string) {
    setOffen((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  const spaltenZahl = spalten.length + (detail ? 1 : 0);

  return (
    <div
      style={{
        overflowX: "auto",
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-md"),
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: minBreite }}>
        <thead>
          <tr>
            {detail && <th style={{ ...thStyle, width: 24 }} aria-hidden />}
            {spalten.map((s) => {
              const aktiv = sortierung?.key === s.key;
              const sortierbar = !!s.sortWert;
              return (
                <th
                  key={s.key}
                  style={{
                    ...thStyle,
                    textAlign: s.rechts ? "right" : "left",
                    cursor: sortierbar ? "pointer" : "default",
                    userSelect: "none",
                    color: aktiv ? v("--color-text-secondary") : thStyle.color,
                  }}
                  onClick={sortierbar ? () => sortieren(s.key) : undefined}
                  aria-sort={
                    aktiv ? (sortierung!.richtung === "auf" ? "ascending" : "descending") : undefined
                  }
                >
                  {s.kopf}
                  {sortierbar && (
                    <span aria-hidden style={{ marginLeft: 4, opacity: aktiv ? 1 : 0.35 }}>
                      {aktiv ? (sortierung!.richtung === "auf" ? "▲" : "▼") : "▲"}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortiert.map((zeile) => {
            const k = schluessel(zeile);
            const auf = offen.has(k);
            return (
              <Fragment key={k}>
                <tr
                  onClick={detail ? () => umschalten(k) : undefined}
                  style={{
                    cursor: detail ? "pointer" : "default",
                    borderTop: `1px solid ${v("--color-border-muted")}`,
                  }}
                  aria-expanded={detail ? auf : undefined}
                >
                  {detail && (
                    <td style={{ ...tdStyle, color: v("--color-text-muted"), width: 24 }}>
                      <span
                        aria-hidden
                        style={{
                          display: "inline-block",
                          transform: auf ? "rotate(90deg)" : "none",
                          transition: "transform 120ms",
                        }}
                      >
                        ›
                      </span>
                    </td>
                  )}
                  {spalten.map((s) => (
                    <td
                      key={s.key}
                      style={{
                        ...tdStyle,
                        textAlign: s.rechts ? "right" : "left",
                        whiteSpace: s.umbruch ? "normal" : "nowrap",
                        fontVariantNumeric: s.rechts ? "tabular-nums" : undefined,
                      }}
                    >
                      {s.zelle(zeile)}
                    </td>
                  ))}
                </tr>
                {detail && auf && (
                  <tr>
                    <td />
                    <td colSpan={spaltenZahl - 1} style={{ ...tdStyle, whiteSpace: "normal" }}>
                      {detail(zeile)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {zeilen.length === 0 && (
            <tr>
              <td
                colSpan={spaltenZahl}
                style={{
                  ...tdStyle,
                  textAlign: "center",
                  color: v("--color-text-muted"),
                  padding: space.xl,
                }}
              >
                {leerText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
