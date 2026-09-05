"use client";
import { useEffect, useState } from "react";
import { v, iconSizes } from "../../../../../lib/theme";
import { IconCheck } from "../../../../../components/Icons";
import { fristStand } from "../../../../../lib/balkon-anmeldung";

const datum = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

/** Heute als ISO-Tag in lokaler Zeit — NICHT über toISOString(), das rechnet in
 *  UTC und liefert abends in Deutschland schon den Folgetag. */
function heuteIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Fristen-Check: Inbetriebnahmedatum rein, Stichtag raus.
 *
 * Das Datum kommt bewusst erst beim ersten Rendern im Browser (Zustand leer),
 * damit die Seite statisch bleibt und kein Server/Client-Unterschied entsteht.
 *
 * DIE OBERGRENZE DES EINGABEFELDES GEHOERT ZUR SELBEN REGEL — und hielt sie bis
 * zum 27.08.2026 als einzige nicht ein. `max` wurde beim Vorrendern mitgeschrieben
 * und stand danach als Datum des BUILDS im ausgelieferten HTML: gemessen an dem
 * Tag auf der Produktion `max="2026-08-26"`, waehrend heute der 27. war. Die Seite
 * ist ein reines Vorrendern (`x-vercel-cache: PRERENDER`), das Datum entfernt sich
 * also pro Tag ohne Auslieferung um einen weiteren Tag von der Wirklichkeit — und
 * wer sein Balkonkraftwerk gestern angeschlossen hat, kann genau das nicht
 * eintragen. Der Datumswaehler nimmt den Tag schlicht nicht an.
 *
 * Zusaetzlich meldete React beim Hydrieren einen Attributunterschied und brach
 * damit den Rundgang auf `main` (CI-Lauf vom 26.08.2026, 22:47 UTC).
 *
 * Deshalb: Die Obergrenze entsteht erst NACH dem ersten Rendern im Browser. Der
 * Server liefert das Feld ohne Obergrenze aus, der Browser traegt sie nach. Der
 * Wert wird dabei nicht eingefroren, sondern bei jedem Rendern neu bestimmt —
 * eine Seite, die ueber Mitternacht offen bleibt, bekommt sonst die Grenze von
 * gestern. Aus demselben Grund rechnet der Fristenstand weiterhin direkt mit
 * `heuteIso()`.
 *
 * Der Waechter dagegen ist der Rundgang (`e2e/rundgang.spec.ts`): Er faellt bei
 * jedem Hydrierungs-Unterschied durch, hat genau diesen gefunden und braucht
 * keine zweite Absicherung.
 */
export default function Fristencheck() {
  const [eingabe, setEingabe] = useState("");
  const [imBrowser, setImBrowser] = useState(false);
  useEffect(() => setImBrowser(true), []);
  const stand = eingabe ? fristStand(eingabe, heuteIso()) : null;

  const farbe = !stand
    ? v("--color-text-muted")
    : stand.ueberfaellig
      ? v("--color-negative")
      : stand.tageUebrig <= 7
        ? v("--color-accent")
        : v("--color-positive");

  return (
    <div style={{
      background: v("--color-bg-accent"),
      border: `1px solid ${v("--color-border-accent")}`,
      borderRadius: v("--radius-lg"),
      padding: "18px 20px",
      marginBottom: 20,
    }}>
      <label htmlFor="inbetriebnahme" style={{
        display: "block",
        fontSize: v("--font-size-caption"),
        fontWeight: 700,
        color: v("--color-text-muted"),
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 8,
      }}>
        Seit wann liefert dein Balkonkraftwerk Strom?
      </label>
      <input
        id="inbetriebnahme"
        type="date"
        value={eingabe}
        max={imBrowser ? heuteIso() : undefined}
        onChange={e => setEingabe(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 14px",
          fontSize: v("--font-size-body"),
          fontFamily: v("--font-mono"),
          borderRadius: v("--radius-md"),
          border: `2px solid ${v("--color-border")}`,
          background: v("--color-bg-muted"),
          color: v("--color-text-primary"),
          outline: "none",
        }}
      />

      {stand ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary"), lineHeight: 1.6 }}>
            Deine Frist endet am{" "}
            <strong style={{ color: v("--color-text-primary"), fontFamily: v("--font-mono") }}>
              {datum(stand.endeIso)}
            </strong>
            .
          </div>
          <div style={{ marginTop: 8, fontSize: v("--font-size-body"), fontWeight: 700, color: farbe, lineHeight: 1.5 }}>
            {stand.ueberfaellig ? (
              <>Die Frist ist seit {Math.abs(stand.tageUebrig)}{" "}
                {Math.abs(stand.tageUebrig) === 1 ? "Tag" : "Tagen"} abgelaufen.</>
            ) : stand.tageUebrig === 0 ? (
              <>Heute ist der letzte Tag — die Frist läuft erst mit Ablauf des Tages ab.</>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconCheck size={iconSizes.sm} />
                Noch {stand.tageUebrig} {stand.tageUebrig === 1 ? "Tag" : "Tage"} Zeit.
              </span>
            )}
          </div>
          <div style={{ marginTop: 10, fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 }}>
            {stand.ueberfaellig
              ? "Eine verspätete Registrierung ist trotzdem besser als keine — nachholen lässt sie sich jederzeit. Was eine Fristversäumnis rechtlich bedeutet, steht im nächsten Abschnitt."
              : "Gerechnet ab dem Tag der ersten Stromerzeugung, nicht ab Kauf oder Lieferung."}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12, fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 }}>
          Ein Monat ab Inbetriebnahme — das ist aber nicht schlicht „plus 30 Tage“.
          Trag das Datum ein, dann rechnen wir den Stichtag nach den gesetzlichen
          Fristenregeln aus.
        </div>
      )}
    </div>
  );
}
