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
export const SHARE_KEYS = ["a", "s", "sk", "p", "n", "wp", "ea", "k", "ev", "st", "ei", "eia", "er", "ck", "km", "plz", "flow", "ht", "da", "az", "ng", "bl", "foe", "vb", "kl", "km2", "klr", "klwh", "wf", "wi", "wh", "wht", "sc", "rg", "mk", "mw"];

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
  return SHARE_KEYS.some((k) => params.has(k));
}
