// Fingerabdruck einer Amtsseite — geteilt zwischen dem Seiten-Wächter
// (scripts/funding-watch.ts) und der Abruf-Route (/api/funding/fetch).
//
// MUSS eine Quelle bleiben: Der Wächter vergleicht Fingerabdrücke, die mal er
// selbst und mal die Route erzeugt hat. Zwei Kopien dieser Normalisierung, die
// minimal auseinanderlaufen, würden bei jedem Wechsel des Abrufwegs eine
// Änderung melden, die es nie gab — und niemand käme darauf, dass nicht die
// Stadt, sondern unser eigener Code die Meldung erzeugt.

import { createHash } from "node:crypto";

/**
 * Sichtbarer Text, so weit normalisiert, dass nur echte Inhaltsänderungen
 * zählen. Bewusst grob: Ein zu feiner Abdruck schlägt bei jedem Deploy der Stadt
 * an, wird dann ignoriert — und so stirbt ein Wächter.
 */
export function fingerprintOf(html: string): string {
  const roh = html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    // Zeichenverweise fallen weg — benannte (&auml;), dezimale (&#105;) UND
    // hexadezimale (&#x0069;). Die Hex-Form ist dieselbe HTML-Notation wie die
    // dezimale, stand hier aber bis zum 22.08.2026 nicht, und das war kein
    // Schönheitsfehler: Aus `&#x0066;` wird nach dem Entfernen der Sonderzeichen
    // das Token `x0066` — genau fünf Zeichen lang und damit ÜBER der Schwelle,
    // die den Buchstabensalat unten aussortiert.
    //
    // WARUM DAS ZÄHLT (22.08.2026, gemessen): Kommunale Redaktionssysteme
    // (TYPO3) verschlüsseln ihre Kontaktadresse als Spamschutz bei jedem Aufruf
    // neu — und wählen dabei je Zeichen zufällig die dezimale oder die
    // hexadezimale Schreibweise. gudensberg.de liefert für dieselbe Adresse
    // `info@stadt-gudensberg.de` einmal `&#x0073;` und einmal `&#115;`. Die
    // dezimalen verschwanden, die hexadezimalen blieben als `x00NN` stehen —
    // also wechselte der Abdruck bei zwei Abrufen im Abstand von Sekunden.
    // Nachgemessen an acht Amtsseiten: sieben instabil, eine stabil.
    //
    // Wirkung: Der Seiten-Wächter meldete für 24 AKTIVE Programme „Amtsseite hat
    // sich geändert" und startete je die 14-Tage-Nachprüffrist; am 05.09.2026
    // wären sie geschlossen und lautlos aus der Rechnung gefallen. Dieselbe
    // Fehlerklasse wie am 18.08.2026 (Fassungswechsel) und am 17.08.2026
    // (würzburg.de) — nur diesmal nicht im Filter, sondern eine Stufe davor.
    .replace(/&[a-z]+;|&#\d+;|&#x[0-9a-f]+;/gi, " ")
    .toLowerCase();

  // Der Abdruck entsteht aus ZAHLEN und LANGEN WÖRTERN, nicht aus jedem Zeichen.
  //
  // WARUM (17.08.2026, gemessen): wuerzburg.de zerlegt seine Kontaktadresse als
  // Spamschutz bei JEDEM Aufruf neu in Buchstabenfragmente ("i rder a t w e z g
  // e" / "l m e a t e u ."). Ein zeichengenauer Abdruck meldet dort jeden Tag
  // eine Änderung, die keine ist — und ein Wächter, der täglich Alarm schlägt,
  // wird weggesehen; schlimmer noch, unter der 14-Tage-Regel würde das Programm
  // dauerhaft aus der Rechnung fallen.
  //
  // Beträge und Fristen überleben: Sie enthalten Ziffern. Fachwörter überleben:
  // sie sind lang. Was verschwindet, sind Füllwörter und Buchstabensalat — also
  // genau das, was sich ändert, ohne dass sich etwas ändert.
  const zeichen = 5;
  const tokens = roh
    .split(/[^0-9a-zäöüß€%]+/)
    .filter((t) => t.length >= zeichen || /[0-9€%]/.test(t));

  // SORTIERT, nicht in Dokumentreihenfolge — der Abdruck fragt nach dem INHALT,
  // nicht nach seiner Anordnung.
  //
  // WARUM (26.08.2026, gemessen): herbrechtingen.de liefert bei acht Abrufen
  // hintereinander DREI verschiedene Abdrücke — und der Vergleich der Token
  // beider Fassungen ist in beide Richtungen LEER. Es fehlt kein Wort und es
  // kommt keines hinzu; die Seite ordnet dieselben Bausteine nur anders an.
  // In Dokumentreihenfolge gehasht ist das jedes Mal ein anderer Abdruck.
  //
  // Dasselbe eine Ebene langsamer bei Seiten, die ihre Fassung nachts neu
  // erzeugen: Lohfelden, Memmingen, Feucht, Weinheim und Karlsruhe lieferten am
  // 26.08.2026 von diesem Rechner, aus unserer Produktion und aus dem Nachtlauf
  // denselben Abdruck — und wurden trotzdem an fünf von sechs Tagen als
  // „geändert" gemeldet. Innerhalb eines Tages stabil, über Nacht ein anderer:
  // genau das Bild einer zwischengespeicherten Seite, die beim nächtlichen
  // Neuaufbau anders sortiert.
  //
  // Wirkung der alten Fassung: 45 der 109 Programme trugen binnen sechs Tagen
  // eine Änderungsmeldung, 22 davon an drei oder mehr Tagen. Ein Teil der
  // aktiven Programme stand dadurch unter der 14-Tage-Nachprüffrist und wäre
  // lautlos aus jeder Rechnung gefallen — für eine Änderung, die nie
  // stattgefunden hat. Dieselbe Fehlerklasse wie am 17., 18. und 22.08.2026, nur
  // nicht im Filter und nicht eine Stufe davor, sondern im Hash.
  //
  // WIE VIELE ES SIND, ZÄHLT MAN NICHT AN `page_changed_at` AB. Die erste
  // Messung dieses Laufs tat das und kam auf 27 von 75 — zu hoch. Die Uhr in
  // `fundingBelegAktuell` läuft nur bei einer Änderung, die NEUER ist als unsere
  // letzte inhaltliche Prüfung; eine Meldung, die vor `lastVerified` liegt, ist
  // längst beantwortet. Nach den zehn Quellenprüfungen dieses Laufs waren es
  // 13 aktive Programme, alle mit 13 bis 14 Tagen Luft.
  //
  // WAS DAMIT NICHT MEHR AUFFÄLLT — und warum das richtig so ist: eine Seite,
  // die exakt dieselben Wörter in anderer Reihenfolge zeigt. Ein Betrag, eine
  // Frist, eine Bedingung, ein gestrichenes Programm ändern immer den Bestand
  // der Token, nie bloß deren Anordnung. Der Abdruck beantwortet weiterhin die
  // Frage, für die es ihn gibt: Steht auf dieser Seite noch dasselbe?
  return createHash("sha256").update([...tokens].sort().join(" ")).digest("hex");
}

/**
 * Fassung des Verfahrens oben. **Hochzählen, sobald `fingerprintOf` etwas anders
 * verdichtet** — jede Änderung dort erzeugt für dieselbe unveränderte Seite einen
 * anderen Abdruck.
 *
 * WARUM DAS NÖTIG IST (gemessen am 18./19.08.2026): Am 18.08. bekam
 * `fingerprintOf` den Token-Filter gegen die verwürfelten Kontaktadressen. Für
 * jede Seite fiel damit ein anderer Abdruck an als am Vortag — der Wächter
 * verbuchte das für **15 Programme an einem Tag** als „Amtsseite hat sich
 * geändert", startete die Nachprüf-Frist und hätte sie am 02.09.2026 geschlossen
 * aus der Rechnung fallen lassen. Fünfzehn Städte, die alle am selben Tag ihre
 * Seite ändern, gibt es nicht; geändert hatten wir uns.
 *
 * Das ist dieselbe Fehlerklasse, gegen die es die Herkunfts-Kennzeichnung schon
 * gab, nur eine Ebene höher: Nicht der Abrufweg wechselte, sondern das Verfahren.
 * Beides beantwortet dieselbe Frage — **halten wir hier überhaupt zwei
 * vergleichbare Dinge nebeneinander?** — und beides gehört deshalb in denselben
 * Schlüssel. Ein Wächter, der eine eigene Änderung als fremde meldet, ist
 * schlimmer als einer, der schweigt: Er erzeugt Arbeit, die niemand braucht, und
 * nimmt nebenbei Förderungen weg, die es gibt.
 *
 * FASSUNG 3 (22.08.2026): `fingerprintOf` entfernt jetzt auch hexadezimale
 * Zeichenverweise. Für jede Seite fällt damit ein anderer Abdruck an als vorher —
 * genau der Grund, aus dem es dieses Feld gibt. Ohne das Hochzählen hätte der
 * nächste Lauf die Reparatur selbst als 109 fremde Änderungen verbucht.
 *
 * FASSUNG 4 (26.08.2026): `fingerprintOf` hasht die Token jetzt sortiert statt in
 * Dokumentreihenfolge. Wieder fällt für jede Seite ein anderer Abdruck an als
 * vorher — und wieder ist das Hochzählen der Unterschied zwischen „einmal nicht
 * vergleichbar" und „109 fremde Änderungen". Der nächste Lauf weist die Seiten
 * deshalb als **nicht vergleichbar** aus (kein Fehlversuch, keine Nachprüffrist)
 * und legt am Tag darauf wieder los.
 */
export const FINGERPRINT_VERSION = 4;

/** Kennzeichnet, auf welchem Weg der Abdruck entstand. Nur Gleiches vergleichen. */
export type Abrufweg = "live" | "archiv";

/** `live-v3:a1b2…` — Abrufweg UND Verfahrensfassung vor dem Abdruck. */
export function markiert(weg: Abrufweg, fp: string): string {
  return `${weg}-v${FINGERPRINT_VERSION}:${fp}`;
}

/** Der Schlüssel vor dem Doppelpunkt: Abrufweg plus Fassung. */
function schluesselVon(m: string | null): string | null {
  const k = m?.split(":")[0];
  return k ? k : null;
}

export function wegVon(m: string | null): Abrufweg | null {
  const w = schluesselVon(m)?.replace(/-v\d+$/, "");
  return w === "live" || w === "archiv" ? w : null;
}

/**
 * Dürfen diese beiden Abdrücke überhaupt gegeneinander gehalten werden?
 *
 * Nein, sobald Abrufweg oder Verfahrensfassung auseinandergehen — dann ist ein
 * Unterschied unsere Sache, nicht die der Stadt. Ein alter Abdruck ohne
 * Fassungskennung (vor dem 19.08.2026 geschrieben) ist aus demselben Grund nicht
 * vergleichbar: Er stammt aus Fassung 1.
 */
export function vergleichbar(alt: string | null, neu: string): boolean {
  if (!alt) return false;
  return schluesselVon(alt) === schluesselVon(neu);
}

/** Warum zwei Abdrücke nicht vergleichbar sind — für die Protokollzeile, damit
 *  dort nicht „Abrufweg gewechselt" steht, wo sich unser Verfahren geändert hat. */
export function unterschiedsGrund(alt: string, neu: string): string {
  const wegAlt = wegVon(alt), wegNeu = wegVon(neu);
  if (wegAlt !== wegNeu) return `Abrufweg gewechselt (${wegAlt ?? "unbekannt"} → ${wegNeu ?? "unbekannt"})`;
  return "unser Abdruck-Verfahren hat sich geändert — kein Hinweis auf die Amtsseite";
}
