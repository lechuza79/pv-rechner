/**
 * Antworten auf Aussendungen (Presse und jede künftige Zielgruppe) ihrer Mail
 * zuordnen — rein, ohne Netz, damit die Regeln testbar sind.
 *
 * WARUM (07.10.2026): 138 Pressemitteilungen standen eine Woche im Postfach,
 * ihre Antworten auch — aber der tägliche Rücklauf kannte nur Gemeinden und
 * Förderstellen. Presse-Antworten landeten unter „nicht zuzuordnen", und die
 * Wirkungsmessung musste die Presse auslassen, weil sie sonst „0 Antworten"
 * gemeldet hätte. Schlimmer: Eine Zeitung mit Ortsnamen im Absender hätte die
 * Rückfall-Regel „Ortsname im Absender" einer Gemeinde zugeschlagen.
 *
 * DIE REIHENFOLGE IST DER PUNKT:
 *   1. Die Kennung unserer Mail im Kopf der Antwort (In-Reply-To, References).
 *      Eindeutig, auch wenn die Redaktion von einer anderen Domain antwortet.
 *   2. Bei einer Unzustellbarkeit: unsere Kennung oder die Empfängeradresse im
 *      Text der Meldung — sie kommt vom Mailserver, nicht vom Empfänger.
 *   3. Erst dann die Absender-Domain, und NUR, wenn diese Domain keine
 *      angeschriebene Gemeinde ist: Drei Kreisverwaltungen haben am 30.09.2026
 *      die Pressemitteilung bekommen und bekommen auch Kreis-Briefe; dort
 *      entscheidet allein der Kopf, sonst nimmt die eine Zuordnung der anderen
 *      ihre Antwort weg.
 */
import { ohneZitat, ANTWORT_MAX_ZEICHEN, type Ruecklaufart } from "./outreach-ruecklauf";

export type GesendeteAussendung = {
  id: number;
  zielgruppe: string;
  empfaenger: string;
  domain: string;
  betreff: string;
  message_id: string | null;
  gesendet_am: string | null;
  antwort_art: string | null;
};

export type EingangsMail = {
  von: string;
  betreff: string;
  /** Die vollständige Rohfassung samt Kopf. */
  roh: string;
  art: Ruecklaufart;
  /** Eingangszeitpunkt (ISO). */
  receivedAt: string;
};

const kennung = (s: string) => s.trim().replace(/^<|>$/g, "").toLowerCase();

/** Die Kennungen, auf die eine Mail antwortet — aus dem Kopf, gefaltete Zeilen eingeschlossen. */
export function antwortKennungen(roh: string): string[] {
  const kopf = roh.split(/\r?\n\r?\n/)[0] ?? "";
  const entfaltet = kopf.replace(/\r?\n[ \t]+/g, " ");
  const raus: string[] = [];
  for (const zeile of entfaltet.split(/\r?\n/)) {
    const m = zeile.match(/^(in-reply-to|references):\s*(.*)$/i);
    if (!m) continue;
    for (const id of m[2].match(/<[^>]+>/g) ?? []) raus.push(kennung(id));
  }
  return [...new Set(raus)];
}

const ohnePraefix = (b: string) => b.replace(/^\s*((re|aw|wg|fwd?|antw)\s*:\s*)+/i, "").trim();

/**
 * Welche unserer Aussendungen beantwortet diese Mail? `null`, wenn es keine
 * eindeutige gibt — lieber „nicht zuzuordnen" als die falsche.
 *
 * `gemeindeDomains`: Domains, an die auch ein Gemeinde- oder Kreis-Brief ging.
 */
export function aussendungZuordnen(
  mail: EingangsMail,
  gesendet: GesendeteAussendung[],
  gemeindeDomains: Set<string>,
): GesendeteAussendung | null {
  const versendet = gesendet.filter((g) => g.gesendet_am && g.gesendet_am <= mail.receivedAt);
  // 1. The header names our mail.
  const ids = new Set(antwortKennungen(mail.roh));
  const perKopf = versendet.filter((g) => g.message_id && ids.has(kennung(g.message_id)));
  if (perKopf.length === 1) return perKopf[0];

  const roh = mail.roh.toLowerCase();
  // 2. A bounce comes from the mail server; it quotes our mail, not the recipient's domain.
  if (mail.art === "unzustellbar") {
    const perText = versendet.filter((g) => (g.message_id && roh.includes(kennung(g.message_id))) || roh.includes(g.empfaenger));
    return perText.length === 1 ? perText[0] : null;
  }

  // 3. The sender's domain — only where no municipal letter competes for it.
  const domain = mail.von.split("@")[1]?.toLowerCase() ?? "";
  if (!domain || gemeindeDomains.has(domain)) return null;
  const perDomain = versendet.filter((g) => g.domain === domain);
  if (perDomain.length === 1) return perDomain[0];
  if (perDomain.length > 1) {
    const betreff = ohnePraefix(mail.betreff);
    const passend = perDomain.filter((g) => betreff.includes(ohnePraefix(g.betreff)) || ohnePraefix(g.betreff).includes(betreff));
    if (passend.length === 1) return passend[0];
  }
  return null;
}

/**
 * Welche Rückmeldung zählt, wenn eine Aussendung mehrere bekommt: der
 * Widerspruch vor der Antwort vor der Unzustellbarkeit vor der Urlaubsnotiz.
 * Eine Abwesenheitsnotiz darf eine spätere echte Antwort nicht verdecken, und
 * nichts darf einen Widerspruch wieder aufheben.
 */
export const ANTWORT_RANG: Record<string, number> = {
  widerspruch: 4,
  antwort: 3,
  unzustellbar: 2,
  abwesenheit: 1,
  "unklar-maschinell": 1,
};

export function ersetztBisherige(neu: Ruecklaufart, bisher: string | null): boolean {
  return (ANTWORT_RANG[neu] ?? 0) > (bisher ? ANTWORT_RANG[bisher] ?? 0 : 0);
}

/** Der eigene Text der Antwort, ohne mitzitierte Aussendung, gekürzt. */
export function antwortNotiz(text: string): string {
  return ohneZitat(text).trim().slice(0, ANTWORT_MAX_ZEICHEN);
}
