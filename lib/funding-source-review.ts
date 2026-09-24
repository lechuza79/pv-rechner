export type ReviewSource = {
  region_id: string;
  url: string;
  gelesen_am: string | null;
  gelesen_ergebnis: string | null;
  gelesen_notiz: string | null;
  seite_geaendert_am: string | null;
};

/**
 * Das Urteil für eine Adresse, die es nicht mehr gibt — und das EINZIGE, das
 * der `--tot`-Weg schreiben darf.
 *
 * WARUM EIN EIGENES WORT (20.09.2026): Der `--tot`-Weg entstand am selben Tag
 * und hatte kein Urteil, das er schreiben durfte — sein eigenes
 * Anwendungsbeispiel nannte `--ergebnis "Adresse entfernt"`, und genau das
 * weist die Sperre eine Zeile weiter oben ab. GEMESSEN an diesem Tag: 211
 * Zeilen tragen `entfernt: true`, und sie zerfallen in genau die zwei
 * Behelfe, die dabei herauskommen — 141 mit einem Freitext-Urteil, das sie im
 * Vorrat stehen lässt, als wäre nie jemand da gewesen, und 70 mit
 * „keine-foerderung", das mehr behauptet als gemessen ist.
 *
 * UND DESHALB NICHT „keine-foerderung": Das ist eine Aussage über die
 * GEMEINDE, und die haben wir nicht gelesen — bei einer 404 gibt es nichts zu
 * lesen. 59 der 141 toten Adressen sind Kontakt-Weiterleitungen von Ämtern
 * (`…/contact/index/link`), die nie eine Förderseite waren; ihnen „diese
 * Gemeinde fördert nicht" anzuheften wäre dieselbe Umdeutung fremder Urteile,
 * gegen die die Tabelle in `funding-altergebnis` steht.
 *
 * Das Wort sagt deshalb nur, was gemessen ist: diese QUELLE ist weg. Über die
 * Gemeinde sagt es nichts, und ihr Erledigt-Stand hängt ohnehin am Screening-
 * Urteil, nicht hieran.
 */
export const QUELLE_ENTFERNT = "quelle-entfernt";

// Explicit completed outcomes; free text and unresolved decisions stay in the queue.
//
// EXPORTIERT, DAMIT DAS ABHAKEN DIESELBE LISTE BENUTZT WIE DAS FILTERN.
// Solange nur der Filter sie kannte, konnte ein Lauf ein Ergebnis schreiben,
// das die Zeile im Vorrat ließ — gemessen am 20.09.2026 bei 625 von 2.375
// gelesenen Zeilen. Zwei Listen für dieselbe Frage sind hier gar nicht nötig:
// Es ist eine, und das Werkzeug weist jetzt alles andere ab.
export const ABSCHLIESSENDE_ERGEBNISSE = new Set([
  "aufgenommen", "vorhanden", "keine-foerderung", "ausgelaufen",
  "fachlich geprüft: addable", "fachlich geprüft: existing",
  "fachlich geprüft: no-program", "fachlich geprüft: closed",
  QUELLE_ENTFERNT,
]);

const completed = ABSCHLIESSENDE_ERGEBNISSE;

export function pendingFundingSources<T extends ReviewSource>(rows: T[]): T[] {
  return rows.filter((row) => {
    if (!row.gelesen_am || !completed.has((row.gelesen_ergebnis ?? "").trim().toLowerCase())) return true;
    if (!row.seite_geaendert_am) return false;
    let reviewedAt: string | undefined;
    try { reviewedAt = JSON.parse(row.gelesen_notiz ?? "{}").reviewed_at; } catch { /* Legacy plain-text notes. */ }
    // Legacy dates lack intra-day ordering: conservatively reopen same-day changes once.
    if (!reviewedAt) return row.seite_geaendert_am.slice(0, 10) >= row.gelesen_am;
    const changed = Date.parse(row.seite_geaendert_am);
    const reviewed = Date.parse(reviewedAt);
    return !Number.isFinite(changed) || !Number.isFinite(reviewed) || changed > reviewed;
  });
}

/** Share reading work, never infer shared eligibility or municipal completion. */
export function groupedPendingFundingSources<T extends ReviewSource>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of pendingFundingSources(rows)) {
    groups.set(row.url, [...(groups.get(row.url) ?? []), row]);
  }
  return [...groups].map(([url, sources]) => ({ url, associations: sources.length, sources }))
    .sort((a, b) => b.associations - a.associations || a.url.localeCompare(b.url));
}

/**
 * Passt das Urteil zu der Messung, mit der es geschrieben wird?
 *
 * BEIDE RICHTUNGEN, und die zweite ist die wichtigere. Dass eine tote Adresse
 * kein anderes Urteil tragen darf, verhindert die Über-Behauptung („diese
 * Gemeinde fördert nicht", gestützt auf eine 404). Dass `quelle-entfernt`
 * NUR mit einer Messung geschrieben werden darf, verhindert die Umkehrung:
 * sonst wäre das Wort ein Freifahrtschein, mit dem sich jede unbequeme Zeile
 * ohne Beleg aus dem Vorrat nehmen ließe — und der Vorrat sänke dann genau so,
 * wie er bei ehrlicher Arbeit sinkt.
 *
 * Als eigene Funktion, nicht als zwei Zeilen im Aufrufer: Eine Bedingung, die
 * nur in der Reihenfolge des Skripts lebt, ist nicht prüfbar.
 */
export function urteilPasstZurMessung(ergebnis: string, gemessenTot: boolean): string | null {
  const wort = ergebnis.trim().toLowerCase();
  if (gemessenTot && wort !== QUELLE_ENTFERNT) {
    return `Eine Adresse, die mit 404/410 antwortet, trägt nur „${QUELLE_ENTFERNT}" — „${ergebnis}" wäre eine Aussage über die Gemeinde, und gelesen wurde nichts.`;
  }
  if (!gemessenTot && wort === QUELLE_ENTFERNT) {
    return `„${QUELLE_ENTFERNT}" setzt die Messung voraus, dass die Adresse weg ist — ohne --tot ist es eine Behauptung.`;
  }
  return null;
}
