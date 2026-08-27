// Textvorlagen mit Platzhaltern.
//
// Der Betreiber soll frei formulieren können, ohne je eine Zahl anfassen zu
// können. Deshalb steht im bearbeitbaren Text kein Wert, sondern ein Name:
// „In den {stadtAnzahl} Städten kommen {stadtQuote} auf 1.000 Einwohner."
// Die Werte setzt die Berechnung ein.
//
// Zwei Fehler, die das verhindert:
//  · Eine Zahl von Hand ändern und damit gegen die eigene Berechnung schreiben.
//  · Eine Zahl stehen lassen, die beim nächsten Datenstand nicht mehr stimmt —
//    genau das ist der Grund, warum dieses Projekt Posts rechnet statt tippt.
//
// Und einen dritten, der sonst still bliebe: Ein Platzhalter, den es nicht
// gibt, wird beim Speichern gemeldet. Ohne diese Prüfung stünde später
// „{stadtquote}" im Beitrag, und gemerkt hätte es niemand.

/** Ein Platzhalter samt Erklärung — die Erklärung erscheint im Editor. */
export type PlatzhalterInfo = { name: string; wert: string; erklaerung: string };

const MUSTER = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

/** Alle Platzhalter, die in einer Vorlage vorkommen. */
export function platzhalterIn(vorlage: string): string[] {
  return [...new Set([...vorlage.matchAll(MUSTER)].map((m) => m[1]))];
}

export type VorlagenBefund = {
  /** Platzhalter in der Vorlage, für die es keinen Wert gibt. */
  unbekannt: string[];
  /** Werte, die in der Vorlage nicht vorkommen. Kein Fehler, nur ein Hinweis:
   *  Wer eine Zahl aus dem Text nimmt, verliert sie stillschweigend. */
  ungenutzt: string[];
};

export function pruefeVorlage(vorlage: string, werte: Record<string, string>): VorlagenBefund {
  const benutzt = platzhalterIn(vorlage);
  return {
    unbekannt: benutzt.filter((p) => !(p in werte)),
    ungenutzt: Object.keys(werte).filter((k) => !benutzt.includes(k)),
  };
}

/**
 * Setzt die Werte ein.
 *
 * Ein unbekannter Platzhalter bleibt SICHTBAR stehen, statt zu verschwinden:
 * Ein Loch im Text fällt beim Lesen auf, eine stillschweigend geschluckte
 * Klammer nicht — und die stünde dann im Feed.
 */
export function fuelle(vorlage: string, werte: Record<string, string>): string {
  return vorlage.replace(MUSTER, (ganz, name: string) => werte[name] ?? ganz);
}

/**
 * Die Zeile hält die redaktionelle Fassung einer Story: Text UND Farbschema.
 *
 * `vorlage` ist bewusst NULL-fähig — eine Story kann ein eigenes Farbschema
 * tragen und trotzdem den eingebauten Text benutzen. Mit NOT NULL müsste
 * „Text zurücksetzen" die ganze Zeile löschen und nähme das Farbschema mit,
 * das damit nichts zu tun hat.
 */
export const SOCIAL_VORLAGEN_DDL = `
  CREATE TABLE IF NOT EXISTS social_vorlagen (
    post_id text PRIMARY KEY,
    vorlage text,
    geaendert_am timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE social_vorlagen ADD COLUMN IF NOT EXISTS stil text;
  ALTER TABLE social_vorlagen ALTER COLUMN vorlage DROP NOT NULL;
  ALTER TABLE social_vorlagen ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON social_vorlagen FROM PUBLIC;
  REVOKE ALL ON social_vorlagen FROM anon;
  REVOKE ALL ON social_vorlagen FROM authenticated;
`;
