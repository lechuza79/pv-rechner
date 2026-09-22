/**
 * Die Parameter, mit denen jemand in den PV-Rechner einsteigt — geteilte
 * Ergebnisse UND Vorbefüllungen aus dem eigenen Bestand (Förderseiten,
 * Klimarechner, Simulation, Empfehlungs-Flow).
 *
 * EIGENES MODUL, obwohl es nur eine Liste ist: Die Middleware entscheidet
 * anhand dieser Namen, ob eine Anfrage am Server gebaut werden muss. Läge die
 * Liste weiterhin nur in `constants.ts`, zöge die Middleware das Theme und
 * alles Weitere in ihr Edge-Bündel; eine zweite, abgetippte Liste wäre der
 * Fehler, gegen den dieses Projekt an einem Dutzend Stellen anschreibt.
 *
 * AB DEM ERSTEN GETEILTEN LINK SIND DIESE NAMEN ÖFFENTLICH und dürfen sich
 * nicht mehr ändern — Namen dürfen dazukommen, nie umbenannt werden.
 */
export const SHARE_KEYS = ["a", "s", "sk", "p", "n", "wp", "ea", "k", "ev", "st", "ei", "eia", "er", "ck", "km", "plz", "flow", "ht", "da", "az", "ng", "bl", "foe", "vb", "kl", "km2", "klr", "klwh", "wf", "wi", "wh", "wht", "sc", "rg", "mk", "mw", "direkt"];

/**
 * Der Einstieg „Anlagengröße schon bekannt": öffnet unter der Rechner-Adresse
 * die Direkteingabe statt des Empfehlungswegs. Ein eigener Name, weil die
 * nackte Adresse seit 21.09.2026 den Empfehlungsweg zeigt und die Direkteingabe
 * sonst keine Adresse hätte, unter der man sie verlinken kann.
 */
export const DIREKT_KEY = "direkt";

/**
 * Die Kürzel, die der EMPFEHLUNGSWEG während der Fragen in die Adresse
 * schreibt. Elf davon heißen genauso wie Kürzel eines geteilten Ergebnisses
 * (Postleitzahl, Wärmepumpe, E-Auto, Ausrichtung …) — und genau das ist der
 * Grund für diese Liste.
 *
 * Seit dem Umzug (21.09.2026) läuft der Empfehlungsweg unter der Rechner-
 * Adresse selbst. Hieße „ein bekanntes Kürzel steht in der Adresse" weiterhin
 * „das ist ein Ergebnis", dann spränge die Seite in dem Moment ins Ergebnis, in
 * dem jemand bei der zweiten Frage „Wärmepumpe: ja" wählt: Der Weg schreibt
 * `wp=ja` in die Adresse, der Server sähe `wp` und schöbe die Anfrage auf die
 * Ergebnisseite.
 *
 * Ein Ergebnis erkennt die Seite deshalb an einem Kürzel, das der
 * Empfehlungsweg NIE schreibt. Jeder echte Ergebnis-Link trägt eines: der
 * Teilen-Knopf immer `a` (Anlagengröße), die Übergabe aus dem Empfehlungsweg
 * immer `s`, `p`, `n` und `flow`, die Förderseiten `foe`, der Klima-Rechner
 * `klwh` und `km2`. Festgehalten in lib/__tests__/rechner-einstieg.test.ts.
 */
export const EMPFEHLUNG_KEYS = [
  "haus", "dach", "flaeche", "az", "personen", "nutzung", "wp", "ea", "km", "kl",
  "wf", "wi", "wh", "wht", "ng", "plz", "ertrag", "view",
] as const;

/**
 * Trägt diese Adresse eine Rechnung im Gepäck?
 *
 * WOFÜR DAS DA IST: Der Rechner unter seiner nackten Adresse ist für alle
 * gleich und darf deshalb aus dem CDN kommen. Sobald aber ein Parameter
 * dabeisteht, muss die Seite am Server gebaut werden — einmal, weil der
 * Rechner den Zustand schon beim ersten Bild braucht (sonst blitzt die
 * Fragestrecke auf, bevor das geteilte Ergebnis einrastet), und einmal wegen
 * des persönlichen Vorschaubildes im Chat.
 *
 * Fremde Parameter (Kampagnen-Kennungen wie `utm_source`) zählen bewusst
 * NICHT: Sie ändern an der Seite nichts, und ein geteilter Werbelink soll den
 * Zwischenspeicher nicht umgehen.
 */
export function traegtRechnung(params: URLSearchParams): boolean {
  const nurEmpfehlung = new Set<string>(EMPFEHLUNG_KEYS);
  return SHARE_KEYS.some((k) => !nurEmpfehlung.has(k) && params.has(k));
}
