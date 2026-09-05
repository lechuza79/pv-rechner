"use client";

import { useEffect, useRef, useState } from "react";
import { v, space, pad } from "../../lib/theme";
import { IconChevronDown, IconChevronLeft, IconChevronRight } from "../Icons";
import InfoTooltip from "../InfoTooltip";

// Die Steuerleiste des Kalenders: Überschrift · ‹ [Monat ▾] › · Heute · Stand
// · [Wochen ▾] — alles in EINER Zeile.
//
// Die Überschrift steht IN der Leiste, nicht darüber. Zwei Zeilen für eine Sache
// kosteten hier zweimal Bauhöhe, ohne etwas zu trennen: Die Überschrift sagt,
// was das ist, die Leiste, welchen Ausschnitt man sieht.
//
// SIE KOMMT ALS TEXT, nicht als fertiges Element. Ein von der Server-Seite
// durchgereichter Knoten wird über die Client-Grenze als Liste serialisiert —
// React verlangt dann Schlüssel für Kinder, die im Quelltext gar keine Liste
// sind, und meldet das bei jedem Aufbau in der Konsole. Text und Hilfesatz
// hereinzureichen und das Element hier zu bauen, umgeht das nicht nur, es ist
// auch die kleinere Schnittstelle.
//
// ZWEI SCHRITTWEITEN, und das ist Absicht. Die Pfeile schieben um EINE Woche —
// das ist der Schritt, in dem hier wirklich gearbeitet wird, und nur bei ihm
// trägt die Bewegung eine Aussage (oben eine raus, unten eine rein). Das
// Dropdown springt um Monate, weil „im Dezember nachsehen" niemand mit zwölf
// Klicks erledigen will. Beides in einen Pfeil zu legen hieße, sich für eine der
// beiden Arbeitsweisen zu entscheiden.
//
// DIE LEISTE IST EIN BLOCK, nicht drei einzelne Knöpfe: Pfeil, Monat, Pfeil
// teilen sich Kanten — dasselbe Muster wie der Länderwähler im Zubau-Widget.
// Ein zusammenhängender Block liest sich als EIN Bedienelement für eine Sache.

export type NavMonat = { schluessel: string; name: string; index: number };

export function KalenderNav({
  ueberschrift,
  hilfe,
  hilfeLabel,
  hinweis,
  titel,
  monate,
  aktiverMonat,
  wochenzahl,
  wochenzahlen,
  amAnfang,
  amEnde,
  aufHeute,
  istHeuteFenster,
  onSchritt,
  onMonat,
  onWochenzahl,
}: {
  /** Die Überschrift des Blocks — steht in derselben Zeile wie die Steuerung. */
  ueberschrift: string;
  /** Was hinter dem Fragezeichen daneben steht. */
  hilfe?: string;
  hilfeLabel?: string;
  /** Der Stand in einem Halbsatz („3 gedeckt, 9 offen"). */
  hinweis?: string;
  /** Was das Fenster gerade zeigt — ein Monat oder eine Spanne. */
  titel: string;
  monate: NavMonat[];
  aktiverMonat: string;
  wochenzahl: number;
  wochenzahlen: number[];
  amAnfang: boolean;
  amEnde: boolean;
  aufHeute: () => void;
  /** Steht das Fenster schon auf heute? Dann ist der Rücksprung kein Angebot. */
  istHeuteFenster: boolean;
  onSchritt: (richtung: -1 | 1) => void;
  onMonat: (index: number) => void;
  onWochenzahl: (n: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: space.sm,
        flexWrap: "wrap",
        marginBottom: space.md,
      }}
    >
      <h2
        style={{
          fontSize: v("--font-size-h3"),
          margin: 0,
          marginRight: space.xs,
          display: "flex",
          alignItems: "center",
          gap: space.xs,
        }}
      >
        {ueberschrift}
        {hilfe && (
          <InfoTooltip ariaLabel={hilfeLabel ?? ueberschrift} exportNote={false}>
            {hilfe}
          </InfoTooltip>
        )}
      </h2>

      <div style={{ display: "flex", alignItems: "stretch" }}>
        <Kante
          seite="links"
          aus={amAnfang}
          label="Eine Woche zurück"
          onClick={() => onSchritt(-1)}
        >
          <IconChevronLeft size={14} />
        </Kante>
        <Auswahl
          titel={titel}
          breite={150}
          eintraege={monate.map((m) => ({ schluessel: m.schluessel, name: m.name }))}
          aktiv={aktiverMonat}
          onWahl={(schluessel) => {
            const m = monate.find((x) => x.schluessel === schluessel);
            if (m) onMonat(m.index);
          }}
        />
        <Kante seite="rechts" aus={amEnde} label="Eine Woche vor" onClick={() => onSchritt(1)}>
          <IconChevronRight size={14} />
        </Kante>
      </div>

      {/* „Heute" verschwindet, wenn man schon dort steht. Ein Knopf, der nichts
          tut, ist kein Angebot, sondern eine Frage an den Nutzer, warum er
          nichts tut. */}
      {!istHeuteFenster && (
        <button
          type="button"
          onClick={aufHeute}
          style={{
            ...knopf,
            borderRadius: v("--radius-sm"),
            padding: pad("xs", "md"),
          }}
        >
          Heute
        </button>
      )}

      {hinweis && (
        <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
          {hinweis}
        </span>
      )}

      <div style={{ marginLeft: "auto" }}>
        <Auswahl
          titel={`${wochenzahl} Wochen`}
          breite={104}
          rund
          eintraege={wochenzahlen.map((n) => ({ schluessel: String(n), name: `${n} Wochen` }))}
          aktiv={String(wochenzahl)}
          onWahl={(s) => onWochenzahl(Number(s))}
        />
      </div>
    </div>
  );
}

const knopf = {
  fontSize: v("--font-size-small"),
  fontWeight: 600,
  border: `1px solid ${v("--color-border")}`,
  background: "transparent",
  color: v("--color-text-secondary"),
  cursor: "pointer",
  fontFamily: "inherit",
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

function Kante({
  seite,
  aus,
  label,
  onClick,
  children,
}: {
  seite: "links" | "rechts";
  aus: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aus ? undefined : onClick}
      disabled={aus}
      aria-label={label}
      style={{
        ...knopf,
        padding: pad("xs", "sm"),
        borderRadius:
          seite === "links"
            ? `${v("--radius-sm")} 0 0 ${v("--radius-sm")}`
            : `0 ${v("--radius-sm")} ${v("--radius-sm")} 0`,
        [seite === "links" ? "borderRight" : "borderLeft"]: "none",
        opacity: aus ? 0.35 : 1,
        cursor: aus ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/**
 * Ein kleines Klappmenü.
 *
 * Zweimal in derselben Leiste gebraucht (Monat, Wochenzahl) und deshalb einmal
 * geschrieben. Kein projektweiter Baustein: Es gibt bisher keinen zweiten Ort,
 * der ihn bräuchte, und eine Abstraktion mit einem Anwendungsfall ist im Projekt
 * ausdrücklich unerwünscht. Zieht ein dritter Ort nach, wandert er nach oben.
 */
function Auswahl({
  titel,
  eintraege,
  aktiv,
  onWahl,
  breite,
  rund,
}: {
  titel: string;
  eintraege: { schluessel: string; name: string }[];
  aktiv: string;
  onWahl: (schluessel: string) => void;
  breite: number;
  rund?: boolean;
}) {
  const [offen, setOffen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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

  return (
    <div ref={ref} style={{ position: "relative", display: "flex" }}>
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        style={{
          ...knopf,
          borderRadius: rund ? v("--radius-sm") : 0,
          padding: pad("xs", "sm"),
          gap: space.xs,
          minWidth: breite,
          justifyContent: "space-between",
        }}
      >
        <span>{titel}</span>
        <IconChevronDown size={12} />
      </button>
      {offen && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            background: v("--color-bg"),
            border: `1px solid ${v("--color-border")}`,
            borderRadius: v("--radius-sm"),
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            zIndex: 20,
            padding: `${space.xxs}px 0`,
            // Über ein Jahr Monate passen nicht auf den Schirm.
            maxHeight: 260,
            overflowY: "auto",
            minWidth: breite + 24,
          }}
        >
          {eintraege.map((e) => (
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
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: pad("xs", "md"),
                border: "none",
                background: e.schluessel === aktiv ? v("--color-bg-accent") : "transparent",
                color: e.schluessel === aktiv ? v("--color-accent") : v("--color-text-primary"),
                fontSize: v("--font-size-small"),
                fontWeight: e.schluessel === aktiv ? 600 : 400,
                fontFamily: "inherit",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {e.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
