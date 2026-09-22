// ─── Hinweise auf Veröffentlichungen: was ist neu, was ist schon angesehen ────
//
// WARUM ES DAS GIBT (22.09.2026): Die Frage „welche angeschriebene Gemeinde hat
// veröffentlicht?" wurde dreimal beantwortet und jedes Mal fehlte etwas. Nicht
// weil die Quellen fehlten, sondern weil jemand sie von Hand zusammensuchen
// musste: Besucherherkunft, Verweis-Verzeichnis, Suche je Gemeinde-Domain und
// Websuche liegen in vier Befehlen. Am 22.09. standen zwei Hinweise (Berkenthin
// über eine Regionalzeitung, Riedstadt über die Stadtseite) schon in der
// Besucherstatistik — als „noch nicht eingeordnet", und liegen gelassen.
//
// Deshalb laufen die Quellen wöchentlich von selbst und legen NUR NEUE Hinweise
// ab. „Neu" heißt: Die Fundstelle (Adresse oder Absender-Domain) steht noch
// nirgends in der Notiz der Gemeinde. Wer einen Hinweis angesehen hat, trägt
// das Ergebnis in die Notiz ein — belegt ODER verworfen — und damit ist er
// erledigt. Eine eigene Tabelle „gesichtet" wäre eine zweite Wahrheit neben der
// Notiz, und genau dort steht schon, was wir über eine Gemeinde wissen.
//
// Ein Hinweis ist KEIN Beleg. Er sagt, wo nachzusehen ist; ob dort die Gemeinde
// veröffentlicht hat, entscheidet erst das Lesen der Seite.

export type Hinweis = {
  /** Gemeindename, wie er in der Ausgabe steht. */
  gemeinde: string;
  /** Adresse oder Absender-Domain — daran wird „schon angesehen" erkannt. */
  fundstelle: string;
  /** Woher der Hinweis kommt, in Worten („Besucher über …", „Websuche"). */
  quelle: string;
};

/** Domain ohne Schema, `www.` und Pfad, klein geschrieben. */
export function domainVon(fundstelle: string): string {
  return fundstelle
    .replace(/^https?:\/\//i, "")
    .split(/[/?#]/)[0]
    .replace(/^www\./i, "")
    .toLowerCase();
}

/**
 * Steht die Fundstelle schon in der Notiz?
 *
 * Bei einer ADRESSE zählt die Adresse selbst, nicht die Domain: Auf derselben
 * Zeitung kann nächste Woche ein zweiter Artikel stehen, und der ist neu. Bei
 * einer bloßen DOMAIN (Besucherherkunft kennt keinen Pfad) genügt die Domain.
 * Facebook meldet sich unter mehreren Hostnamen (m., l., lm.); die zählen als
 * eine Fundstelle, sonst käme derselbe Beitrag viermal zurück.
 */
export function schonVermerkt(fundstelle: string, notiz: string | null): boolean {
  if (!notiz) return false;
  const n = notiz.toLowerCase();
  const istAdresse = /^https?:\/\//i.test(fundstelle) && /\/[^/]/.test(fundstelle.replace(/^https?:\/\/[^/]+/, ""));
  if (istAdresse) {
    const ohneSchema = fundstelle.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
    if (n.includes(ohneSchema)) return true;
    // Facebook schreibt denselben Beitrag mal mit, mal ohne lesbares Stück
    // im Pfad; stabil ist nur die lange Beitragsnummer am Ende. Nur lange
    // Nummern zählen — eine kurze („/news/7358") kommt auch anderswo vor.
    const nummer = ohneSchema.match(/\/(\d{10,})(?:[/?#]|$)/)?.[1];
    return nummer ? n.includes(nummer) : false;
  }
  const d = domainVon(fundstelle).replace(/^(m|l|lm)\.(?=facebook\.com$)/, "");
  if (n.includes(d)) return true;
  // Soziale Netze stehen in älteren Vermerken nur mit Namen („über Facebook").
  // Bewusst NUR dort: Bei einer Gemeinde-Domain wäre der Name ohne Endung
  // („heringen") auch in jedem Betreff enthalten und hielte jeden neuen
  // Hinweis von ihrer Website für längst bekannt.
  const netz = SOZIALE_NETZE[d];
  return netz ? n.includes(netz) : false;
}

const SOZIALE_NETZE: Record<string, string> = {
  "facebook.com": "facebook",
  "linkedin.com": "linkedin",
  "instagram.com": "instagram",
};

/** Nur die Hinweise, die noch nirgends vermerkt sind; je Gemeinde und Fundstelle einmal. */
export function neueHinweise(
  hinweise: Hinweis[],
  notizJeGemeinde: ReadonlyMap<string, string | null>,
): Hinweis[] {
  const gesehen = new Set<string>();
  const neu: Hinweis[] = [];
  for (const h of hinweise) {
    const schluessel = `${h.gemeinde}|${h.fundstelle.toLowerCase()}`;
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);
    if (schonVermerkt(h.fundstelle, notizJeGemeinde.get(h.gemeinde) ?? null)) continue;
    neu.push(h);
  }
  return neu;
}

/**
 * Der Bericht für die Ablage. Er wird IMMER abgelegt, auch leer: Ein
 * wöchentlicher Lauf, der nur bei Funden meldet, ist von einem ausgefallenen
 * nicht zu unterscheiden.
 */
export function hinweisBericht(neu: Hinweis[], quelle: string): { done: string[]; details: string } {
  if (!neu.length) {
    return { done: [`${quelle}: keine neuen Hinweise auf Veröffentlichungen`], details: "" };
  }
  return {
    done: [`${quelle}: ${neu.length} ${neu.length === 1 ? "neuer Hinweis" : "neue Hinweise"} — ansehen und in der Notiz der Gemeinde vermerken`],
    details: neu.map((h) => `${h.gemeinde} — ${h.fundstelle} (${h.quelle})`).join("\n"),
  };
}
