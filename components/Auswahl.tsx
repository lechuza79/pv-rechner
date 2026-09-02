"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { v, space, pad } from "../lib/theme";
import { IconChevronDown, IconChevronLeft, IconChevronRight } from "./Icons";

// Das Multitool des Projekts: ‹ [gewählter Wert ▾] › — Pfeile zum Durchsteppen,
// Menü zum Springen.
//
// ZWEI SCHRITTWEITEN, UND DAS IST DER PUNKT. Die Pfeile gehen einen Eintrag
// weiter — das ist die Bewegung, in der man vergleicht („und wie sieht der
// nächste aus?"). Das Menü springt irgendwohin, weil „zeig mir Dezember"
// niemand mit zwölf Klicks erledigen will. Beides in ein Bedienelement zu
// legen hieße, sich für eine der beiden Arbeitsweisen zu entscheiden.
//
// DIE PFEILE SIND OPTIONAL und hängen an der Länge: Vier Stände steppt man
// durch, zweihundert Kommunen nicht — dort wäre der Pfeil ein Versprechen, das
// man nie einlöst. Deshalb erscheinen sie von selbst nur, wo die Liste kurz
// genug ist.
//
// Vier Fassungen davon stehen im Repo verstreut (Länderwähler im Zubau-Widget,
// Zeitraum im Strommix als Embed und als Seite, Monatswähler im Kalender). Der
// Kalender benutzt seit dem 02.09.2026 diesen Baustein; die drei übrigen sind
// öffentlich sichtbar und ziehen in einem eigenen Schritt nach.
//
// Eine zweite Fassung ist ein Fehler, kein Duplikat — dieselbe Systematik wie
// bei den Einheiten-Formattern: Zwei Bedienelemente für dieselbe Sache laufen
// binnen einer Woche in Maßen und Tastaturbedienung auseinander.
//
// DIE SUCHE IST OPTIONAL und richtet sich nach der Länge der Liste, nicht nach
// Geschmack: Zwölf Monate sucht niemand, zweihundert Gemeinden schon. Sie
// erscheint deshalb ab einer Schwelle von selbst — wer sie erzwingen oder
// unterdrücken will, sagt es.
//
// KEIN `<select>`: Das lässt sich nicht durchsuchen und nicht mit Zählern
// beschriften, und es sieht auf jedem Betriebssystem anders aus.

export type AuswahlEintrag = {
  schluessel: string;
  name: string;
  /** Optionaler Zähler rechts — sagt, wie viel hinter der Wahl steckt. */
  zahl?: number;
};

/** Ab dieser Länge lohnt eine Suche im Menü. */
const SUCHE_AB = 12;
/** Bis zu dieser Länge lohnt das Durchsteppen mit Pfeilen. */
const PFEILE_BIS = 24;

export function Auswahl({
  titel,
  eintraege,
  aktiv,
  onWahl,
  breite = 160,
  suchbar,
  suchPlatzhalter = "suchen",
  eckenLinks = true,
  eckenRechts = true,
  hoechstens = 80,
  pfeile,
}: {
  /** Was auf dem Knopf steht — der gewählte Wert, nicht der Name des Filters. */
  titel: string;
  eintraege: AuswahlEintrag[];
  aktiv: string;
  onWahl: (schluessel: string) => void;
  breite?: number;
  /** Erzwingt oder unterdrückt die Suche; ohne Angabe entscheidet die Länge. */
  suchbar?: boolean;
  suchPlatzhalter?: string;
  /** Für Knopfgruppen, die sich Kanten teilen. */
  eckenLinks?: boolean;
  eckenRechts?: boolean;
  /** Wie viele Treffer die Liste höchstens zeigt. */
  hoechstens?: number;
  /**
   * Pfeile zum Durchsteppen. Ohne Angabe entscheidet die Länge der Liste — bei
   * zweihundert Einträgen ist ein Pfeil ein Versprechen, das niemand einlöst.
   */
  pfeile?: boolean;
}) {
  const [offen, setOffen] = useState(false);
  const [suche, setSuche] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const mitSuche = suchbar ?? eintraege.length >= SUCHE_AB;

  useEffect(() => {
    if (!offen) return;
    const zu = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOffen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOffen(false);
    };
    document.addEventListener("mousedown", zu);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", zu);
      document.removeEventListener("keydown", escape);
    };
  }, [offen]);

  // Beim Schließen zurücksetzen: Ein Menü, das beim nächsten Öffnen noch die
  // alte Suche zeigt, sieht leer aus, obwohl es voll ist.
  useEffect(() => {
    if (!offen) setSuche("");
  }, [offen]);

  const treffer = useMemo(() => {
    const s = suche.trim().toLowerCase();
    const liste = s ? eintraege.filter((e) => e.name.toLowerCase().includes(s)) : eintraege;
    return liste.slice(0, hoechstens);
  }, [eintraege, suche, hoechstens]);

  const ecke = v("--radius-sm");
  const mitPfeilen = pfeile ?? eintraege.length <= PFEILE_BIS;
  const stelle = eintraege.findIndex((e) => e.schluessel === aktiv);
  // Am Rand angekommen bleibt der Pfeil stehen, statt umzulaufen: Ein Wähler,
  // der von hinten nach vorn springt, verliert die Stelle, an der man war.
  const schritt = (um: number) => {
    const ziel = stelle + um;
    if (ziel < 0 || ziel >= eintraege.length) return;
    onWahl(eintraege[ziel].schluessel);
  };

  const kante: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    font: "inherit",
    padding: pad("xs", "xs"),
    background: v("--color-bg"),
    color: v("--color-text-muted"),
    border: `1px solid ${v("--color-border")}`,
    cursor: "pointer",
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "flex" }}>
      {mitPfeilen && (
        <button
          type="button"
          onClick={() => schritt(-1)}
          disabled={stelle <= 0}
          aria-label="Vorheriger Eintrag"
          style={{
            ...kante,
            borderRight: "none",
            borderTopLeftRadius: eckenLinks ? ecke : 0,
            borderBottomLeftRadius: eckenLinks ? ecke : 0,
            opacity: stelle <= 0 ? 0.4 : 1,
            cursor: stelle <= 0 ? "default" : "pointer",
          }}
        >
          <IconChevronLeft size={12} />
        </button>
      )}
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.xs,
          minWidth: breite,
          font: "inherit",
          fontSize: 13,
          padding: pad("xs", "sm"),
          background: v("--color-bg"),
          color: v("--color-text-primary"),
          border: `1px solid ${v("--color-border")}`,
          borderTopLeftRadius: eckenLinks && !mitPfeilen ? ecke : 0,
          borderBottomLeftRadius: eckenLinks && !mitPfeilen ? ecke : 0,
          borderTopRightRadius: eckenRechts && !mitPfeilen ? ecke : 0,
          borderBottomRightRadius: eckenRechts && !mitPfeilen ? ecke : 0,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {titel}
        </span>
        <IconChevronDown size={12} />
      </button>
      {mitPfeilen && (
        <button
          type="button"
          onClick={() => schritt(1)}
          disabled={stelle < 0 || stelle >= eintraege.length - 1}
          aria-label="Nächster Eintrag"
          style={{
            ...kante,
            borderLeft: "none",
            borderTopRightRadius: eckenRechts ? ecke : 0,
            borderBottomRightRadius: eckenRechts ? ecke : 0,
            opacity: stelle < 0 || stelle >= eintraege.length - 1 ? 0.4 : 1,
            cursor: stelle < 0 || stelle >= eintraege.length - 1 ? "default" : "pointer",
          }}
        >
          <IconChevronRight size={12} />
        </button>
      )}

      {offen && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: v("--color-bg"),
            border: `1px solid ${v("--color-border")}`,
            borderRadius: ecke,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            zIndex: 20,
            padding: mitSuche ? 0 : `${space.xxs}px 0`,
            maxHeight: 300,
            overflowY: "auto",
            minWidth: Math.max(breite + 24, 200),
          }}
        >
          {mitSuche && (
            <input
              autoFocus
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder={suchPlatzhalter}
              aria-label={suchPlatzhalter}
              style={{
                width: "100%",
                boxSizing: "border-box",
                font: "inherit",
                fontSize: 13,
                padding: pad("xs", "sm"),
                border: "none",
                borderBottom: `1px solid ${v("--color-border")}`,
                background: "transparent",
                color: v("--color-text-primary"),
                position: "sticky",
                top: 0,
              }}
            />
          )}
          {treffer.map((e) => (
            <button
              key={e.schluessel}
              type="button"
              role="option"
              aria-selected={e.schluessel === aktiv}
              onClick={() => {
                onWahl(e.schluessel);
                setOffen(false);
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: space.sm,
                width: "100%",
                textAlign: "left",
                padding: pad("xs", "md"),
                border: "none",
                background: e.schluessel === aktiv ? v("--color-bg-accent") : "transparent",
                color: e.schluessel === aktiv ? v("--color-accent") : v("--color-text-primary"),
                fontSize: 13,
                fontWeight: e.schluessel === aktiv ? 600 : 400,
                fontFamily: "inherit",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <span>{e.name}</span>
              {e.zahl !== undefined && (
                <span style={{ color: v("--color-text-muted") }}>{e.zahl}</span>
              )}
            </button>
          ))}
          {treffer.length === 0 && (
            <p
              style={{
                margin: 0,
                padding: pad("sm", "md"),
                fontSize: 13,
                color: v("--color-text-muted"),
              }}
            >
              Nichts gefunden.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
