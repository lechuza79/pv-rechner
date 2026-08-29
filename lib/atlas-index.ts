import type { Metadata } from "next";
import { releaseFreigegeben } from "./release-plan";

// Gestufte Index-Freischaltung des Solar-Atlas (Plan: docs/atlas-index-wellen.md).
// Solange eine Ebene hier nicht freigeschaltet ist, bleibt sie noindex (Pilot) und
// steht nicht in der Sitemap. So kippen wir nicht ~11.000 dünne Seiten auf einmal
// in den Index. Ausrollen = diese Datei ändern + deployen.

export type AtlasLevel = "de" | "bundesland" | "landkreis" | "gemeinde";

// Stand: Welle 0a (Deutschland + Bundesländer). Welle 0b (Landkreise) war am
// 27.07.2026 rund zwei Stunden frei und ist am selben Abend auf Entscheidung des
// Betreibers zurückgenommen worden.
//
// Die Freigabekriterien waren erfüllt (Wellen-Monitor: Self-Check 17/17 grün,
// alle 17 Seiten mit Impressions). Zurückgenommen wurde aus einem anderen Grund,
// der VOR der Freischaltung nicht geprüft worden war: Eine Kreisseite verlinkt
// rund 52 Gemeindeseiten. Mit `landkreis: true` wird aus 400 indexierten Seiten
// ein Einstieg in ~11.000 noindex-Gemeindeseiten, die Google alle einmal abrufen
// muss, um das noindex zu sehen. Genau diese gleichzeitigen Kaltrender waren am
// selben Tag die Ursache von 0,7 % Serverfehlern (siehe STAMMDATEN_TTL in
// lib/atlas.ts).
//
// VOR einem erneuten Anlauf zu klären — nicht einfach wieder auf true setzen:
//   1. Kaltrender der Gemeindeseiten mit Abstand unter der 8-s-Notbremse
//      (gemessen 27.07.: 2,3–8,0 s — der Ausreißer stand exakt auf der Kante).
//      ERLEDIGT, nachgemessen 17.08.2026: Gemeinden kalt 0,5/1,2/1,8 s,
//      Kreisseiten kalt 0,5/0,5/1,6 s (nur `x-vercel-cache: MISS` gewertet),
//      Atlas-Abfragen 111–133 ms, 6,2 s Luft bis zur Notbremse. Der Abstand kam
//      vom Präfix-Literal in lib/mastr-region-sql.ts und vom Rollup, nicht von
//      der Wellen-Rücknahme. (03.08.2026 lag es bei 0,4–0,9 s.)
//      Die Messung altert: vor dem Flip erneut messen, nicht diese Zeile zitieren.
//   2. Aufwärm-Crawl vor der Freischaltung, nicht danach.
//      `npm run atlas:warm` deckt beide Ebenen ab (ATLAS_WARM_LEVELS default
//      "gemeinde,landkreis"), muss aber einmal DURCHGELAUFEN sein, bevor geflippt
//      wird — sonst zahlt Googlebot die Kaltrender, die der Crawl abfangen soll.
//   3. Kreisseiten in den Gesundheitscheck aufnehmen (er zog nur Gemeinden,
//      die neu indexierte Ebene wäre sonst unbeobachtet gewesen).
//      ERLEDIGT 17.08.2026: scripts/health-check.ts misst je Lauf zwei
//      Kreisseiten kalt mit (COLD_KREIS_SAMPLES), eigene Zeile im Bericht,
//      dieselbe Schwelle wie die Gemeinden. Die Kreispfade fallen aus derselben
//      Zufallsabfrage ab und kosten keinen zusätzlichen Datenbank-Read.
//
// Der Sitemap-Zweig für Kreise ist inzwischen da (app/sitemap.ts, hängt an
// atlasLevelReleased) — beim ersten Anlauf fehlte er und die Welle wäre halb
// wirkungslos gewesen. Nach einem Flip trotzdem nachsehen statt annehmen.
//
// ABER — und das ist seit dem 18.08.2026 der eigentliche Grund, warum `landkreis`
// hier auf false steht: Die drei Auflagen oben sind inzwischen alle erfüllt, und
// die Welle wird TROTZDEM nicht freigeschaltet. Nicht wegen des Risikos, sondern
// weil auf dieser Ebene niemand sucht. Gemessen (docs/seo/befund-2026-08-18-atlas-wellen.md):
//   - Ein Wettbewerber mit demselben Produkt (wieistmeinsolar.de) hat 139
//     Platzierungen, davon 6 echte Ortstreffer in den Top 10 — und nur EINE der
//     139 auf einem Suchbegriff mit dem Wort „Kreis". 123 liegen auf Ortsseiten.
//   - Suchvolumen „photovoltaik landkreis würzburg": 10/Monat. Für Hameln-Pyrmont,
//     Fulda und Bautzen nicht einmal messbar. „photovoltaik münchen": 320.
//   - Unsere eigene Kreisseite Hameln-Pyrmont, die durch die zwei Stunden am
//     27.07. im Index hing, brachte 58 Einblendungen — die fünf benannten Anfragen
//     dahinter sind ausnahmslos ORTSanfragen („solaranlage hameln"), keine einzige
//     Kreisanfrage. Und 0 Klicks.
// Die Kreisebene ist damit kein eigenes Suchziel, sondern der Umschlagplatz zur
// Ortsebene. Der nächste sinnvolle Schritt ist Welle 1 (Gemeinden, oberhalb der
// Thin-Schwelle) mit Ortsname im Titel — nicht 0b. Wer 0b trotzdem flippen will,
// braucht eine neue Messung, die diese hier widerlegt, nicht nur grüne Auflagen.
const RELEASED: Record<AtlasLevel, boolean> = {
  de: true,
  bundesland: true,
  landkreis: false,
  gemeinde: false,
};

/**
 * Der Nachweis, ohne den keine Ebene live geht — erzwungen von
 * lib/__tests__/atlas-freigabe-nachweis.test.ts.
 *
 * WARUM ES DAS GIBT (18.08.2026): Zweimal an einem Tag stand eine Freigabe kurz
 * vor dem Livegang, für die alle Prüfungen grün waren — und beide Male fehlte
 * dieselbe Prüfung. Am Morgen empfahl der Wellen-Monitor die Kreisebene, weil
 * Technik und Indexierung grün waren; niemand hatte gefragt, ob dort überhaupt
 * gesucht wird (Antwort: nein). Am Abend zeigte ein adversarialer Prüfer, dass
 * unsere Förder-Stadtseiten längst auf den Ortsanfragen stehen, auf die die
 * Gemeindeseiten zielen — die Ortswelle hätte die eigene Kollision freigeschaltet.
 *
 * Ein Merksatz in einem Runbook hätte beides nicht verhindert: Der Wellen-Monitor
 * HATTE ein Runbook, und die Freigabekriterien darin waren erfüllt. Deshalb hängt
 * der Nachweis jetzt an derselben Datei wie der Schalter — wer `RELEASED` umlegt,
 * ohne hier zu belegen, dass beide Fragen beantwortet sind, bekommt einen roten
 * Test, keinen guten Rat.
 *
 * `null` heißt: nicht erbracht. Für `de` und `bundesland` steht der ehrliche
 * Vermerk, dass sie vor Einführung dieser Regel live gingen — sie rückwirkend als
 * geprüft auszuweisen wäre genau die Sorte erfundenes Prüfdatum, gegen die dieses
 * Projekt an anderer Stelle schon einmal antreten musste.
 */
export type FreigabeNachweis = {
  /** Tag, an dem BEIDE Fragen unten beantwortet wurden (ISO). */
  gemessenAm: string;
  /** Wird auf dieser Ebene überhaupt gesucht? Zahl + Quelle, kein Adjektiv. */
  nachfrage: string;
  /** Steht auf denselben Anfragen schon eine andere eigene Seitenfamilie? */
  kannibalisierung: string;
  /** Wo die Messung nachlesbar ist. */
  beleg: string;
};

export const FREIGABE_NACHWEIS: Record<AtlasLevel, FreigabeNachweis | null> = {
  // Vor Einführung der Regel freigeschaltet (Welle 0a, Juli 2026). Bewusst kein
  // nachträglich erfundener Nachweis — siehe Kommentar oben.
  de: null,
  bundesland: null,
  landkreis: {
    gemessenAm: "2026-08-18",
    nachfrage:
      "Nein. Suchvolumen 'photovoltaik landkreis würzburg' 10/Monat, für Hameln-Pyrmont, " +
      "Fulda und Bautzen nicht messbar. Beim Wettbewerber wieistmeinsolar.de trägt 1 von " +
      "139 Platzierungen das Wort 'Kreis'.",
    kannibalisierung:
      "Nicht relevant, solange die Ebene gesperrt bleibt — die Kreisseiten sind der Weg " +
      "zur Ortsebene, kein eigenes Suchziel.",
    beleg: "docs/seo/befund-2026-08-18-atlas-wellen.md",
  },
  // OFFEN (bis 12/2026): Vor Welle 1 zu erbringen. Die Nachfrage ist belegt
  // (Ortsanfragen tragen das Volumen), die Kannibalisierung NICHT: 33 von 108
  // sichtbaren Förder-Anfragen tragen kein Geld-Wort, bei drei Anfragen steht die
  // Förderseite auf einem reinen Bestands-Wort besser als die Atlasseite. Das ist
  // je Ort der geplanten Charge zu messen, nicht pauschal.
  gemeinde: null,
};

/** Darf diese Ebene live gehen? Antwortet mit dem Grund, nicht nur mit ja/nein. */
export function freigabeMoeglich(level: AtlasLevel): { ok: boolean; grund: string } {
  const n = FREIGABE_NACHWEIS[level];
  if (!n) {
    return {
      ok: false,
      grund:
        `Für die Ebene „${level}" liegt kein Freigabe-Nachweis vor. Vor dem Livegang zu ` +
        "beantworten: Wird auf dieser Ebene gesucht (Suchvolumen + Wettbewerbs-Gegenprobe)? " +
        "Und steht auf denselben Anfragen schon eine andere eigene Seitenfamilie " +
        "(Förderseiten)? Beides in FREIGABE_NACHWEIS eintragen.",
    };
  }
  return { ok: true, grund: `Nachweis vom ${n.gemessenAm}: ${n.nachfrage}` };
}

// Thin-Schwelle: Gemeinden unter dieser Anlagenzahl bleiben noindex — ohne
// nennenswerten Bestand hat die Seite keinen Eigenwert (Doorway-/Thin-Risiko).
export const GEMEINDE_MIN_ANLAGEN = 10;

export function atlasLevelReleased(level: AtlasLevel): boolean {
  return RELEASED[level];
}

/**
 * Ein EINZELNER Ort kann freigegeben sein, auch wenn seine Ebene gesperrt ist.
 *
 * WOZU (29.08.2026): Die Stadt Heringen (Werra) hat nach unserer Outreach-Mail
 * eine eigene Meldung veröffentlicht und darin unsere Gemeindeseite verlinkt —
 * der erste redaktionelle Verweis, den dieses Projekt je bekommen hat. Die Seite
 * stand dabei auf `noindex, nofollow`. Das `nofollow` ist der teure Teil: Es
 * hindert die Empfehlung daran, in die Seiten weiterzufließen, für die sie
 * gedacht war, und macht damit genau den Ertrag zunichte, den der Outreach
 * erzeugt. Eine Seite zu sperren, auf die eine Gemeinde öffentlich verweist, ist
 * der einzige Zustand, der sich nicht begründen lässt.
 *
 * WARUM NICHT DIE GANZE EBENE: Die Messung vom 18./29.08.2026 gilt unverändert —
 * unterhalb der Mittelstadt gibt es keine Nachfrage, und ein Wettbewerber mit
 * 5.230 indexierten Ortsseiten holt daraus neun Platzierungen, keine auf Seite 1.
 * `RELEASED.gemeinde` bleibt deshalb `false`.
 *
 * WARUM NICHT AUTOMATISCH aus der Rückläufer-Datenbank: Das wäre die Automatik,
 * gegen die der Releaseplan gebaut wurde — eine Seite ginge live, weil ein
 * Datenbankfeld kippt, ohne dass jemand hingesehen hat. Der Eintrag bleibt eine
 * Entscheidung im Plan; `npm run kommunen:veroeffentlicht` meldet die Kandidaten.
 *
 * Dieselbe Bauform wie der Nidda-Fall bei den Förderseiten: ZWECK IST DER BELEG,
 * NICHT DIE SICHTBARKEIT. Wer daraus ableitet, Ortsseiten ließen sich wieder
 * pauschal freischalten, hat die Begründung nicht gelesen.
 */
export function atlasOrtEinzelfreigabe(ags: string, heute: Date = new Date()): boolean {
  return releaseFreigegeben("atlas-gemeinde", ags, heute);
}

/**
 * Ist eine konkrete Atlas-Seite indexierbar?
 *
 * Für Gemeinden gilt zusätzlich die Anlagen-Schwelle — und zwar AUCH bei
 * Einzelfreigabe: Ein Ort ohne nennenswerten Bestand hätte auch mit Verweis
 * keinen Eigenwert, und eine dünne Seite zu indexieren, weil jemand auf sie
 * zeigt, wäre das Doorway-Risiko mit zusätzlichem Publikum.
 */
export function atlasIsIndexable(level: AtlasLevel, anlagen?: number, ags?: string): boolean {
  const frei = RELEASED[level] || (level === "gemeinde" && !!ags && atlasOrtEinzelfreigabe(ags));
  if (!frei) return false;
  if (level === "gemeinde") return (anlagen ?? 0) >= GEMEINDE_MIN_ANLAGEN;
  return true;
}

/** robots-Feld für Next-Metadata: indexierbar → explizit index/follow (überschreibt
 *  den Pilot-Default), sonst noindex/nofollow. */
export function atlasRobots(indexable: boolean): Metadata["robots"] {
  return indexable ? { index: true, follow: true } : { index: false, follow: false };
}
