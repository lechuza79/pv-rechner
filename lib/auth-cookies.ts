import type { CookieOptions } from "@supabase/ssr";
import { entschluesseltOderRoh } from "./uri-sicher";
import { BLEIBEN_TAGE } from "./auth-einwilligung";

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
// DIE EINE AUSNAHME IST DAS HÄKCHEN „Angemeldet bleiben" (Betreiber,
// 02.09.2026) — WP194 nennt an derselben Stelle genau diese Checkbox als
// sauberen Weg. Es heilt die Ausnahme nicht, es ERSETZT sie durch eine
// Einwilligung nach § 25 Abs. 1 TDDDG, und die zieht Nachweis, Widerruf und
// Dokumentation nach sich; das alles steht in `lib/auth-einwilligung.ts`.
//
// WAS DAS FÜR NUTZER HEISST: Ohne Häkchen meldet sich beim nächsten Mal neu
// an, wer den Browser schließt. Mit Häkchen bleibt die Anmeldung 90 Tage ab
// dem letzten Besuch — und der Nachweis der Einwilligung gleitet dabei MIT
// (siehe `browserCookies.setAll`), sonst überlebte die Anmeldung ihre eigene
// Einwilligung um bis zu 90 Tage.

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
export function nurFuerDieSitzung(
  name: string,
  options: CookieOptions,
  /**
   * Hat der Nutzer „Angemeldet bleiben" angehakt? Dann darf das Anmelde-Cookie
   * leben — aber nur, weil er es ausdrücklich wollte, und nur so lange, wie im
   * Einwilligungstext steht.
   */
  bleiben = false,
): CookieOptions {
  if (options.maxAge === 0) return options;
  if (name.includes("code-verifier")) {
    const { expires: _expires, ...rest } = options;
    return { ...rest, maxAge: PRUEFSCHLUESSEL_SEKUNDEN };
  }
  const { maxAge: _maxAge, expires: _expires2, ...rest } = options;
  if (bleiben) return { ...rest, maxAge: BLEIBEN_TAGE * 24 * 60 * 60 };
  return rest;
}

/** Der Merker: steht er, hat jemand „Angemeldet bleiben" angehakt. */
export const BLEIBEN_COOKIE = "sc-angemeldet-bleiben";

/**
 * Liest den Merker aus einer Cookie-Zeile (Server) oder aus dem Browser.
 *
 * Der Merker muss an BEIDEN Enden lesbar sein: Der Server setzt das
 * Anmelde-Cookie beim Anmelden, der Browser schreibt es stündlich beim
 * Auffrischen des Zugangs neu. Läse nur eine Seite ihn, verlöre die Anmeldung
 * ihre Lebensdauer bei der ersten Auffrischung wieder — und niemandem fiele
 * auf, warum man nach einer Stunde ausgeloggt ist.
 */
export function bleibenGewuenscht(cookieZeile: string | null | undefined): boolean {
  return bleibenFassungAus(cookieZeile) !== null;
}

/**
 * Welche FASSUNG des Einwilligungstextes steht im Merker — oder null.
 *
 * Der Wert wird gebraucht, nicht nur das Ja/Nein: Beim Auffrischen wird der
 * Merker mit derselben Fassung erneuert, unter der die Einwilligung erteilt
 * wurde. Auf die heutige umzuschreiben hieße, eine Zustimmung umzudatieren.
 */
export function bleibenFassungAus(cookieZeile: string | null | undefined): string | null {
  const zeile = cookieZeile ?? (typeof document !== "undefined" ? document.cookie : "");
  for (const teil of zeile.split(";")) {
    const t = teil.trim();
    if (!t.startsWith(`${BLEIBEN_COOKIE}=`)) continue;
    const wert = t.slice(BLEIBEN_COOKIE.length + 1);
    return bleibenGilt(wert) ? wert : null;
  }
  return null;
}

/**
 * Gilt ein Merker?
 *
 * NUR MIT INHALT — und das ist kein Detail: Ein Löschversuch kann ein Cookie
 * mit LEEREM Wert hinterlassen statt es zu entfernen. Wer „vorhanden" mit
 * „gesetzt" verwechselt, hält den Rest eines zurückgenommenen Häkchens für
 * eine erteilte Einwilligung — und verlängert das Anmelde-Cookie gegen den
 * ausdrücklichen Willen des Nutzers. Beim Bauen genau so gemessen.
 *
 * Der Inhalt ist die Fassung des Textes, dem zugestimmt wurde. Eine hier
 * unbekannte Fassung gilt trotzdem: Sie ist eine ÄLTERE, unter der die
 * Einwilligung wirksam erteilt wurde.
 */
export function bleibenGilt(wert: string | undefined | null): boolean {
  return typeof wert === "string" && wert.trim().length > 0;
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
    const fassung = bleibenFassungAus(null);
    for (const { name, value, options } of cookies) {
      document.cookie = serialisiere(name, value, nurFuerDieSitzung(name, options, !!fassung));
    }
    // ─── Der Nachweis muss MITGLEITEN — BLOCKER ─────────────────────────────
    //
    // Der Zugang wird stündlich aufgefrischt, und dabei bekommt das
    // Anmelde-Cookie jedes Mal wieder die volle Laufzeit. Der Merker dagegen
    // entstand einmal beim Anmelden. Ohne diese Zeilen laufen beide
    // auseinander: Wer an Tag 89 zuletzt da war, trägt ein Anmelde-Cookie bis
    // Tag 179 — und ab Tag 90 gibt es keinen Nachweis mehr für eine
    // Einwilligung, auf die sich die Verarbeitung noch stützt. Der Nutzer wäre
    // zwei Monate länger angemeldet, als ihm zugesagt wurde.
    //
    // Deshalb: bei jeder Auffrischung mitschreiben. Damit heißt „bis zu 90
    // Tage" das, was der Text sagt — 90 Tage nach dem letzten Besuch.
    //
    // GRENZE DER PRÜFUNG: Dass diese Zeile läuft, hält ein Test fest (viermal
    // absichtlich kaputtgemacht und rot gesehen). Das Mitgleiten NACH einem
    // echten stündlichen Auffrischen ist im Browser nicht in Sekunden
    // nachstellbar — dafür müsste eine Stunde vergehen. Wer hier etwas ändert,
    // weiß das.
    //
    // DIE FASSUNG BLEIBT DIE ALTE. Sie auf die heutige umzuschreiben würde eine
    // Einwilligung umdatieren, die unter einem anderen Wortlaut erteilt wurde —
    // und damit genau den Nachweis zerstören, um den es hier geht.
    if (fassung) document.cookie = serialisiere(BLEIBEN_COOKIE, fassung, { path: "/", sameSite: "lax", maxAge: BLEIBEN_TAGE * 24 * 60 * 60 });
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
