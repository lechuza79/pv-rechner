// Prüfstufe vor der Veröffentlichung: reiner Teil.
//
// Zwei Prüfungen je Beitrag, und sie hängen NICHT am Beitrag, sondern an seinem
// TEXT. Das ist der ganze Trick: Wer eine Formulierung ändert, nachdem geprüft
// wurde, hat eine Freigabe für eine Fassung, die es nicht mehr gibt. Der
// Fingerabdruck macht das sichtbar, statt es zu hoffen.
//
// Dieselbe Systematik wie beim Förder-Beleg: Nicht das Datum entscheidet, ob
// eine Prüfung noch gilt, sondern ob sie sich auf das bezieht, was wir gerade
// veröffentlichen wollen.

export type PruefArt = "zahlen" | "recht";

export type Pruefung = {
  post_id: string;
  /** Wofür die Prüfung galt. Ändert sich der Text, verfällt sie. */
  text_fingerabdruck: string;
  art: PruefArt;
  bestanden: boolean;
  /** Was geprüft wurde und was dabei herauskam. Erscheint in der Vorschau. */
  befund: string;
  geprueft_am: string;
};

export const SOCIAL_PRUEFUNG_DDL = `
  CREATE TABLE IF NOT EXISTS social_pruefungen (
    post_id text NOT NULL,
    text_fingerabdruck text NOT NULL,
    art text NOT NULL CHECK (art IN ('zahlen', 'recht')),
    bestanden boolean NOT NULL,
    befund text NOT NULL DEFAULT '',
    geprueft_am timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, art, text_fingerabdruck)
  );
  ALTER TABLE social_pruefungen ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON social_pruefungen FROM PUBLIC;
  REVOKE ALL ON social_pruefungen FROM anon;
  REVOKE ALL ON social_pruefungen FROM authenticated;
`;

/** Beide Prüfungen müssen vorliegen. Eine reicht nicht. */
export const NOETIGE_PRUEFUNGEN: PruefArt[] = ["zahlen", "recht"];

/**
 * Fingerabdruck des Beitragstexts.
 *
 * Bewusst über den NORMALISIERTEN Text: Ein zusätzlicher Zeilenumbruch oder ein
 * doppeltes Leerzeichen ist keine inhaltliche Änderung und soll keine Prüfung
 * entwerten — sonst wird die Sperre zur Schikane und irgendwann umgangen. Jede
 * Änderung an Wörtern oder Zahlen dagegen erzeugt einen neuen Abdruck.
 */
export function textAbdruck(text: string): string {
  const norm = text.replace(/\s+/g, " ").trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < norm.length; i++) {
    h ^= norm.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + ":" + norm.length;
}

export type PruefUrteil = { ok: true } | { ok: false; grund: string };

/**
 * Darf dieser Text raus? Beide Prüfungen müssen für GENAU diesen Text
 * vorliegen und bestanden sein.
 */
export function urteil(text: string, vorhandene: Pruefung[]): PruefUrteil {
  const abdruck = textAbdruck(text);
  const passend = vorhandene.filter((p) => p.text_fingerabdruck === abdruck);

  const fehlend = NOETIGE_PRUEFUNGEN.filter((art) => !passend.some((p) => p.art === art));
  if (fehlend.length) {
    // Der Unterschied ist wichtig für die Meldung: Eine Prüfung, die es für
    // eine ÄLTERE Fassung gab, ist etwas anderes als gar keine.
    const veraltet = fehlend.filter((art) => vorhandene.some((p) => p.art === art));
    return {
      ok: false,
      grund: veraltet.length
        ? `Der Text wurde nach der Prüfung geändert. Erneut prüfen: ${veraltet.join(", ")}.`
        : `Noch nicht geprüft: ${fehlend.join(", ")}.`,
    };
  }

  const durchgefallen = passend.filter((p) => !p.bestanden);
  if (durchgefallen.length) {
    return {
      ok: false,
      grund: `Prüfung nicht bestanden (${durchgefallen.map((p) => p.art).join(", ")}): ${durchgefallen
        .map((p) => p.befund)
        .filter(Boolean)
        .join(" · ")}`,
    };
  }

  return { ok: true };
}
