// Wer hat sich nach unserem Brief eingetragen — und war es jemand aus dem Rathaus?
//
// WOZU: Der Outreach kannte bisher zwei Signale, und beide sind schwach. Eine
// Antwort misst Höflichkeit; eine Veröffentlichung ist das eigentliche Ziel,
// taucht aber erst Tage bis Wochen später in einem Verweis-Verzeichnis auf.
// Eine Eintragung ins Abo ist das dritte, und für eine ANGESCHRIEBENE Gemeinde
// ist sie das aussagekräftigste: Der Brief verlinkt genau die Seite, auf der
// die Eintragung sitzt.
//
// DIE UNTERSCHEIDUNG IST DER PUNKT. Trägt sich ein Bürger ein, ist das
// Reichweite. Trägt sich jemand aus der Verwaltung ein, hat unser Brief die
// Stelle erreicht, die über eine Veröffentlichung entscheidet — auch dann,
// wenn niemand geantwortet hat.
//
// GEMESSEN WIRD DIE ADRESSE, NICHT DIE PERSON. Als Verwaltung zählt, wessen
// Adresse auf der Domain der Gemeinde liegt oder auf der Domain der Gemeinde,
// die sie mitverwaltet. Beides steht bereits in der Kontakt-Tabelle und ist
// dort belegt, nicht geraten. Daraus folgt die Grenze, die jede Auswertung
// mitlesen muss: Wer aus dem Rathaus privat abonniert, zählt als Bürger. Die
// Zahl ist also eine UNTERGRENZE — dieselbe Sorte Untergrenze wie bei den
// Veröffentlichungen, wo eine Meldung ohne Link nicht mitzählt.
//
// KEINE ADRESSEN NACH DRAUSSEN. Dieses Modul gibt Zahlen zurück, nie die
// Eintragungen selbst. Der Kreis derer, die diese Adressen sehen, soll klein
// bleiben; fürs Cockpit ist die Zahl die ganze Auskunft.

/** Eine Eintragung, so weit sie hier gebraucht wird. */
export type AboZeile = {
  region_id: string;
  email: string;
  /** ausstehend | bestaetigt | abgemeldet */
  status: string;
  /** Kam die Person über unseren Brief? Nullable — Altzeilen tragen nichts. */
  ueber_brief?: boolean | null;
};

/** Was wir über die Gemeinde wissen, um „aus der Verwaltung" zu erkennen. */
export type GemeindeDomains = {
  region_id: string;
  website: string | null;
  verwaltung_domain: string | null;
};

export type AboSpiegel = {
  /** Bestätigte Eintragungen. Nur diese bekommen je eine Mail. */
  bestaetigt: number;
  /** Davon von einer Verwaltungs-Adresse. Untergrenze, siehe oben. */
  ausVerwaltung: number;
  /** Eingetragen, aber noch nicht bestätigt. Zählt für nichts — steht hier,
   *  damit „niemand hat abonniert" nicht mit „noch keiner hat bestätigt"
   *  verwechselt wird. */
  ausstehend: number;
  /** Bestätigte, die über den Brief kamen (soweit erfasst). */
  ueberBrief: number;
};

export const LEERER_SPIEGEL: AboSpiegel = {
  bestaetigt: 0,
  ausVerwaltung: 0,
  ausstehend: 0,
  ueberBrief: 0,
};

/** Domain ohne Schema, Pfad und www — beide Seiten müssen gleich normalisiert
 *  werden, sonst vergleicht man „www.engen.de" mit „engen.de". */
export function domainAus(wert: string | null | undefined): string {
  if (!wert) return "";
  const roh = wert.includes("@") ? wert.split("@").pop()! : wert.replace(/^https?:\/\//i, "").split("/")[0];
  return roh.replace(/^www\./i, "").trim().toLowerCase();
}

/**
 * Gehört diese Adresse zur Verwaltung dieser Gemeinde?
 *
 * Zwei Treffer zählen: die eigene Domain der Gemeinde und die Domain der
 * Gemeinde, die sie mitverwaltet. Unterdomains zählen mit („rathaus.engen.de"),
 * denn große Verwaltungen trennen ihre Bereiche so.
 */
export function istVerwaltungsAdresse(email: string, g: GemeindeDomains | undefined): boolean {
  if (!g) return false;
  const dom = domainAus(email);
  if (!dom) return false;
  for (const kandidat of [domainAus(g.website), domainAus(g.verwaltung_domain)]) {
    if (!kandidat) continue;
    if (dom === kandidat || dom.endsWith(`.${kandidat}`)) return true;
  }
  return false;
}

/**
 * Eintragungen je Gemeinde zusammenzählen.
 *
 * Reine Funktion: Die Aufrufer holen beide Bestände selbst und reichen sie
 * herein. So ist die Zählregel testbar, ohne eine Datenbank zu brauchen — und
 * es gibt sie nur einmal, auch wenn später eine zweite Ansicht sie braucht.
 */
export function zaehleAbos(abos: AboZeile[], gemeinden: GemeindeDomains[]): Map<string, AboSpiegel> {
  const domains = new Map(gemeinden.map((g) => [g.region_id, g]));
  const out = new Map<string, AboSpiegel>();
  for (const a of abos) {
    const s = out.get(a.region_id) ?? { ...LEERER_SPIEGEL };
    if (a.status === "ausstehend") {
      s.ausstehend++;
    } else if (a.status === "bestaetigt") {
      s.bestaetigt++;
      if (istVerwaltungsAdresse(a.email, domains.get(a.region_id))) s.ausVerwaltung++;
      if (a.ueber_brief === true) s.ueberBrief++;
    }
    // „abgemeldet" zählt nirgends mit: Wer sich austrägt, ist kein Signal für
    // Reichweite, und ihn weiter mitzuzählen behauptete eine Leserschaft, die
    // es nicht gibt.
    out.set(a.region_id, s);
  }
  return out;
}

/**
 * Ein Satz für die Cockpit-Zeile — oder nichts.
 *
 * NICHTS ist der Normalfall und ausdrücklich gewollt: Eine Zeile „0
 * Eintragungen" unter 11.000 Gemeinden ist Lärm, der die wenigen echten Funde
 * verdeckt.
 */
export function aboSatz(s: AboSpiegel | null | undefined): string | null {
  if (!s || (!s.bestaetigt && !s.ausstehend)) return null;
  if (!s.bestaetigt) {
    return s.ausstehend === 1 ? "1 Eintragung, noch nicht bestätigt" : `${s.ausstehend} Eintragungen, noch nicht bestätigt`;
  }
  const kopf = s.bestaetigt === 1 ? "1 Abo" : `${s.bestaetigt} Abos`;
  if (!s.ausVerwaltung) return kopf;
  return s.ausVerwaltung === 1 ? `${kopf}, davon 1 aus der Verwaltung` : `${kopf}, davon ${s.ausVerwaltung} aus der Verwaltung`;
}
