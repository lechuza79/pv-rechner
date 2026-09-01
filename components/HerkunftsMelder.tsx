"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "../lib/analytics";
import { istHerkunftsAufruf } from "../lib/brief-herkunft";

// ─── Kam dieser Aufruf aus einem Outreach-Brief? ─────────────────────────────
//
// Warum wir das selbst zählen und nicht Vercel fragen: Die Auswertung nach
// Kampagnen-Parametern ist dort ein Zusatzpaket (10 $/Monat auf Pro, Stand
// 27.08.2026); ohne es fasst Vercel Seiten „by the page url (without query
// parameters)" zusammen, der Parameter liefe also ins Leere. Ein eigenes
// Ereignis kostet nichts und misst dasselbe. Herleitung und Rechtslage der
// Kennung selbst: `lib/brief-herkunft.ts`.
//
// KEIN `useSearchParams` — bewusst. Der Hook zwingt die umgebende Route unter
// eine Suspense-Grenze und kann statisch ausgelieferte Seiten dynamisch machen;
// dieser Melder sitzt im Layout und träfe damit JEDE (site)-Seite. Gelesen wird
// stattdessen die Adresse im Effekt, also erst im Browser und ohne Einfluss auf
// das Rendern.
//
// EINMAL JE VOLLLADUNG. Bei einer Weiternavigation innerhalb der Seite bleibt
// das Layout montiert, der Effekt läuft also nicht erneut — genau richtig, denn
// gezählt wird der Eintritt, nicht das Stöbern danach. Der Merker fängt
// zusätzlich den doppelten Effektlauf im Entwicklungsmodus ab.
//
// WAS NICHT GEMELDET WIRD: keine Domain, kein Pfad, keine Kennung. Nur, ob der
// Aufruf mit oder ohne Verweis kam — das ist die einzige Unterscheidung, auf
// die es ankommt, und sie beschreibt keinen Besucher:
//   * ohne Verweis  → jemand hat in der Mail selbst geklickt
//   * mit Verweis   → die Gemeinde hat die Meldung veröffentlicht, jemand kam
//                     über ihre Website
// WELCHE Gemeinde das war, steht ohnehin in der gewöhnlichen Verweis-Liste;
// sie hier zu wiederholen brächte nichts und machte aus einer Herkunftszählung
// eine Besucher-Messung (dieselbe Grenze wie in `embed-herkunft-core.ts`).
export function HerkunftsMelder() {
  const gemeldet = useRef(false);

  useEffect(() => {
    if (gemeldet.current) return;
    gemeldet.current = true;
    if (!istHerkunftsAufruf(window.location.search)) return;

    // ERST MELDEN, WENN DIE MESSUNG BEREIT IST — nachgemessen, nicht vermutet.
    //
    // Dieser Effekt läuft VOR der Initialisierung von Vercel Web Analytics
    // (im Protokoll steht der Effekt vor „Debug mode is enabled"). Ein Aufruf
    // zu diesem Zeitpunkt ist still weg: Er landet nicht einmal in der
    // Warteschlange, die das Skript beim Start abarbeitet — gemessen am
    // 27.08.2026, das Ereignis fehlte, während ein von Hand ausgelöstes
    // erschien. Das ist die unangenehme Sorte Fehler: kein Absturz, keine
    // Meldung, nur eine Zahl, die dauerhaft null bleibt.
    //
    // Alle anderen Ereignisse des Projekts hängen an einer Nutzeraktion und
    // haben dieses Problem nicht — dieses ist das einzige, das beim Laden
    // feuert.
    //
    // Wir warten deshalb, statt eine Verzögerung zu raten. Nach fünf Sekunden
    // ohne Messbibliothek geben wir auf: Dann ist sie geblockt oder abgeschaltet,
    // und weiter zu warten hieße, einen Zeitgeber für immer laufen zu lassen.
    const bereit = () =>
      typeof (window as { va?: unknown }).va === "function";
    // ZWEI NAMEN STATT EINER EIGENSCHAFT: Ereignisse tragen im Projekt keine
    // Eigenschaften mehr — daran hängt die Einwilligungsfreiheit der Messung
    // (Begründung in `lib/analytics.ts`). „direkt" heißt: ohne Verweis, also
    // in der Mail selbst geklickt. „verweis" heißt: die Gemeinde hat unsere
    // Meldung veröffentlicht und jemand kam über ihre Website.
    const melde = () =>
      trackEvent(document.referrer ? "brief_aufruf_verweis" : "brief_aufruf_direkt");

    if (bereit()) {
      melde();
      return;
    }
    let versuche = 0;
    const timer = window.setInterval(() => {
      if (bereit()) {
        window.clearInterval(timer);
        melde();
      } else if (++versuche > 25) {
        window.clearInterval(timer);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
