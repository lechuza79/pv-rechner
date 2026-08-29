"use client";

import { Fragment, useMemo, useState } from "react";
import { v, pad, space } from "../../lib/theme";
import { SortPfeil } from "../SortPfeil";

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
//
// MEHRFACHSORTIERUNG (28.08.2026): Klick setzt die Spalte als einzige
// Sortierung, erneuter Klick dreht die Richtung, Umschalt-Klick hängt eine
// weitere Spalte an. Die Rangfolge steht als kleine Ziffer am Pfeil — ohne sie
// ist eine zweistufige Sortierung nicht von einer einstufigen zu unterscheiden,
// und niemand versteht, warum die Zeilen so liegen, wie sie liegen.

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
export interface SortStufe {
  key: string;
  richtung: Richtung;
}

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
  startSortierung?: SortStufe[];
  leerText?: string;
  minBreite?: number;
}) {
  const [sortierung, setSortierung] = useState<SortStufe[]>(startSortierung ?? []);
  const [offen, setOffen] = useState<Set<string>>(new Set());

  const sortiert = useMemo(() => {
    if (sortierung.length === 0) return zeilen;
    const stufen = sortierung
      .map((s) => ({ stufe: s, spalte: spalten.find((sp) => sp.key === s.key) }))
      .filter((x): x is { stufe: SortStufe; spalte: Spalte<T> } => !!x.spalte?.sortWert);
    if (stufen.length === 0) return zeilen;
    // Kopie, damit die übergebene Liste unangetastet bleibt.
    return [...zeilen].sort((a, b) => {
      for (const { stufe, spalte } of stufen) {
        const d = vergleiche(spalte.sortWert!(a), spalte.sortWert!(b));
        if (d !== 0) return stufe.richtung === "auf" ? d : -d;
      }
      return 0;
    });
  }, [zeilen, spalten, sortierung]);

  function sortieren(key: string, dazu: boolean) {
    setSortierung((alt) => {
      const treffer = alt.find((s) => s.key === key);
      // Umschalt-Klick: Spalte anhängen oder ihre Richtung drehen, die übrigen
      // Stufen bleiben stehen.
      if (dazu) {
        if (!treffer) return [...alt, { key, richtung: "auf" }];
        return alt.map((s) =>
          s.key === key ? { key, richtung: s.richtung === "auf" ? "ab" : "auf" } : s,
        );
      }
      // Normaler Klick: nur diese Spalte. War sie schon die einzige, dreht die
      // Richtung — sonst wäre ein zweiter Klick wirkungslos.
      if (treffer && alt.length === 1) {
        return [{ key, richtung: treffer.richtung === "auf" ? "ab" : "auf" }];
      }
      return [{ key, richtung: "auf" }];
    });
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
      {/* Basis-Schriftgröße statt der 13 px, die aus den Bestandstabellen
          übernommen waren. Die Tabelle ist hier der Inhalt der Seite und
          nicht eine Beilage darunter — dann liest sie sich auch in der
          Größe des Fließtexts. Die Kopfzeile bleibt klein und in
          Versalien, sie ist Beschriftung. */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: v("--font-size-body"),
          minWidth: minBreite,
        }}
      >
        <thead>
          <tr>
            {detail && <th style={{ ...thStyle, width: 24 }} aria-hidden />}
            {spalten.map((s) => {
              const stufe = sortierung.find((x) => x.key === s.key);
              const rang = sortierung.findIndex((x) => x.key === s.key);
              const sortierbar = !!s.sortWert;
              return (
                <th
                  key={s.key}
                  style={{
                    ...thStyle,
                    textAlign: s.rechts ? "right" : "left",
                    cursor: sortierbar ? "pointer" : "default",
                    userSelect: "none",
                    color: stufe ? v("--color-text-secondary") : thStyle.color,
                  }}
                  onClick={sortierbar ? (e) => sortieren(s.key, e.shiftKey) : undefined}
                  title={sortierbar ? "Klick sortiert · Umschalt-Klick sortiert zusätzlich" : undefined}
                  aria-sort={stufe ? (stufe.richtung === "auf" ? "ascending" : "descending") : undefined}
                >
                  {s.kopf}
                  {sortierbar && <SortPfeil an={!!stufe} auf={stufe?.richtung === "auf"} />}
                  {/* Die Ziffer erscheint erst ab der zweiten Stufe: Bei einer
                      einzigen Sortierung wäre eine „1“ nur Lärm. */}
                  {stufe && sortierung.length > 1 && (
                    <span
                      style={{
                        fontSize: 9,
                        marginLeft: 1,
                        verticalAlign: "super",
                        color: v("--color-text-muted"),
                      }}
                    >
                      {rang + 1}
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
