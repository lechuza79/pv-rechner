// ─── Retention of factual questions to funding bodies (funding_anfragen) ────
//
// THIS IS A PUBLISHED PROMISE, NOT A SETTING. The privacy policy (section 15,
// „Sachfragen an Förderstellen") says: at the latest three years after the
// answer — or after sending, if no answer came — we delete the recipient
// address and the mail texts and keep only that and when we asked.
//
// Pure on purpose: the selection rule is tested here, the nightly cleanup
// (lib/funding-anfragen-loeschen.ts, called from /api/abo/aufraeumen) runs the
// same rule against the database.

/** Years after the answer (or the sending) until the texts are removed. */
export const ANFRAGE_TEXT_JAHRE = 3;

export type AnfrageZeile = {
  gesendet_am: string;
  antwort_am: string | null;
  empfaenger: string | null;
  text: string | null;
  antwort_notiz: string | null;
};

/**
 * Cut-off instant: everything whose reference date lies before it is due.
 * Calendar years in UTC, so a leap day does not shift the promise.
 */
export function anfrageLoeschGrenze(jetztMs: number): string {
  const d = new Date(jetztMs);
  d.setUTCFullYear(d.getUTCFullYear() - ANFRAGE_TEXT_JAHRE);
  return d.toISOString();
}

/** Date the three years run from: the answer, otherwise the sending. */
export function anfrageBezugsdatum(z: Pick<AnfrageZeile, "gesendet_am" | "antwort_am">): string {
  return z.antwort_am ?? z.gesendet_am;
}

/** Has this row still something to delete? Already cleared rows are not due. */
export function anfrageHatTexte(z: Pick<AnfrageZeile, "empfaenger" | "text" | "antwort_notiz">): boolean {
  return Boolean(z.empfaenger) || Boolean(z.text) || z.antwort_notiz !== null;
}

/** Is the row due for clearing at `jetztMs`? */
export function anfrageLoeschfaellig(z: AnfrageZeile, jetztMs: number): boolean {
  if (!anfrageHatTexte(z)) return false;
  return Date.parse(anfrageBezugsdatum(z)) < Date.parse(anfrageLoeschGrenze(jetztMs));
}
