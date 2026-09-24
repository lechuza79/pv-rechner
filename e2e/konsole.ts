import type { ConsoleMessage } from "@playwright/test";

/**
 * Eine Konsolenmeldung MIT ihrer Herkunft.
 *
 * Der Browser meldet eine fehlgeschlagene Ressource als nackten Satz — „Failed
 * to load resource: the server responded with a status of 404" — OHNE die
 * Adresse. Zwei Folgen, beide gemessen:
 *
 *  - Wer nur den Text filtert, kann ein bekanntes 404 nicht von einem
 *    unbekannten unterscheiden und müsste die ganze Zeile ausnehmen; damit wäre
 *    jedes echte 404 mit weggefiltert (Rundgang, 07.09.2026: ausgenommen wurde
 *    nur die MIME-Meldung, die die Adresse im Text trägt; die 404-Zeile
 *    derselben Datei blieb stehen und erzeugte 296 Fehlschläge aus EINER
 *    Ursache).
 *  - Wer den Text ohne Herkunft ablegt, bekommt ein Urteil, das nicht sagt
 *    worüber. Der nächtliche Flow-Lauf vom 17.09.2026 meldete drei 503er und
 *    war deshalb nicht auszuwerten — dieselbe Lehre wie beim abgebrochenen
 *    Lauf: ein Urteil ohne Gegenstand ist so gut wie keins.
 *
 * Steht EINMAL hier, weil die Lehre den Rundgang schon erreicht hatte und den
 * Flow-Läufer nicht — ein Fix, der nur in einer Datei ankommt, ist keiner.
 */
export function meldungstext(msg: ConsoleMessage): string {
  const herkunft = msg.location()?.url ?? "";
  return herkunft ? `${msg.text()} [${herkunft}]` : msg.text();
}
