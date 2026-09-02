import type { CookieOptions } from "@supabase/ssr";
import { entschluesseltOderRoh } from "./uri-sicher";

// ─── Die Anmeldung endet mit dem Browser — BLOCKER ───────────────────────────
//
// GEMESSEN am 02.09.2026 an einer echten Anmeldung über unsere eigene Route:
// Das Sitzungs-Cookie kam mit `Max-Age 34560000`, also **400 Tagen**. Das ist
// die fest verdrahtete Voreinstellung von `@supabase/ssr` (0.9.0,
// `DEFAULT_COOKIE_OPTIONS`) — und sie lässt sich über `cookieOptions` NICHT
// ändern: Der Baustein setzt `maxAge` nach dem Übernehmen eigener Angaben
// wieder auf seinen eigenen Wert zurück (`cookies.js`, `setCookieOptions`).
// Die einzige Stelle, an der wir eingreifen können, ist unsere eigene
// Schreibfunktion. Deshalb geht JEDE davon durch diese Datei.
//
// WARUM ÜBERHAUPT: Die Website ist ausdrücklich ohne Anmeldung benutzbar, und
// die Datenschutzerklärung nennt das Anmelde-Cookie „technisch notwendig"
// (§ 25 Abs. 2 Nr. 2 TDDDG) — ohne Einwilligung, ohne Cookie-Banner. Ein
// Anmelde-Cookie, das über das Schließen des Browsers hinaus bestehen bleibt,
// trägt diese Einordnung nicht: Die Artikel-29-Gruppe stellt in ihrer
// Stellungnahme 04/2012 (WP194, Abschnitt 3.2) ausdrücklich nur
// Authentifizierungs-Cookies „für die Dauer einer Sitzung" frei und nennt
// persistente Anmelde-Cookies als nicht erfasst. Am 02.09.2026 von zwei
// Legal-Judges im Original geprüft; der zweite hatte den Auftrag, den ersten
// zu widerlegen, und hat diesen Punkt bestätigt.
//
// DIE ANGENEHMERE ALTERNATIVE WÄRE EIN HÄKCHEN „angemeldet bleiben" — WP194
// nennt genau das als sauberen Weg. Sie ist bewusst NICHT gebaut: Das Häkchen
// heilt die Ausnahme nicht, es ersetzt sie durch eine Einwilligung nach § 25
// Abs. 1 TDDDG, und die zieht Nachweis, Widerruf und Dokumentation nach sich.
// Diese Seite hat heute keine einzige Einwilligung; die erste dafür
// einzuführen, dass man einen Rechner-Bookmark nicht neu anmelden muss, wäre
// der teurere Tausch. Wer es später doch will, baut es HIER ein.
//
// WAS DAS FÜR NUTZER HEISST: Wer den Browser schließt, meldet sich beim
// nächsten Mal neu an. Für ein Werkzeug, das man zweimal im Jahr benutzt, ist
// das vertretbar — und es steht so in der Datenschutzerklärung.

/**
 * Wie lange der Prüfschlüssel für einen Link aus einer Mail gilt: 24 Stunden,
 * so lange wie der Link selbst.
 */
const PRUEFSCHLUESSEL_SEKUNDEN = 24 * 60 * 60;

/**
 * Nimmt einem Cookie seine Lebensdauer: Es endet, wenn der Browser schließt.
 *
 * ZWEI AUSNAHMEN, beide notwendig:
 *
 * 1. Eine LÖSCHUNG bleibt unangetastet. Der Baustein löscht ein Cookie, indem
 *    er es mit `maxAge: 0` überschreibt — nähme man ihm das, bliebe ein
 *    abgemeldeter Nutzer angemeldet, und das wäre die gefährlichere Richtung.
 *
 * 2. Der PRÜFSCHLÜSSEL für Links aus einer Mail behält eine Lebensdauer, und
 *    zwar 24 Stunden. Er ist kein Anmeldenachweis, sondern ein einmaliges
 *    Geheimnis, das den Anmeldevorgang gegen das Abfangen des Rückkehr-Codes
 *    schützt. Als reines Sitzungs-Cookie ginge er beim Schließen des Browsers
 *    verloren — und genau das ist der Normalfall bei einer Mail: Wer sein
 *    Passwort zurücksetzt, fordert den Link am Rechner an, macht den Browser
 *    zu und öffnet die Mail später. Der Link führte dann ins Leere, ohne dass
 *    irgendetwas kaputt aussähe. Beim Weg über Google fällt der Unterschied
 *    nicht auf (dort kommt man binnen Sekunden zurück), bei der Mail schon.
 *    24 Stunden, weil der Link selbst nicht länger gilt.
 */
export function nurFuerDieSitzung(name: string, options: CookieOptions): CookieOptions {
  if (options.maxAge === 0) return options;
  if (name.includes("code-verifier")) {
    const { expires: _expires, ...rest } = options;
    return { ...rest, maxAge: PRUEFSCHLUESSEL_SEKUNDEN };
  }
  const { maxAge: _maxAge, expires: _expires2, ...rest } = options;
  return rest;
}

/**
 * Anmelde-Cookies im Browser lesen und schreiben.
 *
 * Ersetzt die eingebaute Fassung von `@supabase/ssr` — die schreibt sonst die
 * 400 Tage bei JEDER Auffrischung des Zugangs neu, also stündlich, und macht
 * damit jede serverseitige Korrektur wieder zunichte.
 */
export const browserCookies = {
  getAll() {
    if (typeof document === "undefined") return [];
    return document.cookie
      .split(";")
      .map((teil) => teil.trim())
      .filter(Boolean)
      .map((teil) => {
        const i = teil.indexOf("=");
        const name = i < 0 ? teil : teil.slice(0, i);
        const wert = i < 0 ? "" : teil.slice(i + 1);
        // Ein fremdes Cookie mit kaputter Kodierung darf hier nicht werfen:
        // Diese Funktion liest ALLE Cookies, und eine Ausnahme hier würde
        // die Anmeldung im ganzen Tab abreißen.
        return { name: entschluesseltOderRoh(name), value: entschluesseltOderRoh(wert) };
      });
  },
  setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
    if (typeof document === "undefined") return;
    for (const { name, value, options } of cookies) {
      document.cookie = serialisiere(name, value, nurFuerDieSitzung(name, options));
    }
  },
};

/** Cookie-Zeile bauen. Bewusst eng: nur die Angaben, die wir wirklich setzen. */
function serialisiere(name: string, value: string, options: CookieOptions): string {
  const teile = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  teile.push(`Path=${options.path ?? "/"}`);
  if (options.domain) teile.push(`Domain=${options.domain}`);
  if (options.maxAge !== undefined) teile.push(`Max-Age=${options.maxAge}`);
  if (options.sameSite) teile.push(`SameSite=${String(options.sameSite)}`);
  // Über HTTPS gehört das Anmelde-Cookie nicht im Klartext übers Netz. Lokal
  // (http://localhost) würde `Secure` es gar nicht erst setzen lassen.
  if (typeof location !== "undefined" && location.protocol === "https:") teile.push("Secure");
  return teile.join("; ");
}
