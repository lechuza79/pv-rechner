/**
 * Where does a slow page build spend its time? A stopwatch per read, reported
 * to the runtime log only when the whole build was slow.
 *
 * WHY (07.10.2026): The health check measured the first district page after a
 * fresh deploy at 3.9 / 4.3 / 6.2 / 5.4 s in four of forty runs, while the same
 * pages build in 0.7–2.5 s otherwise. The package read was measured and ruled
 * out (0.2–0.4 s); everything else was guesswork, and the Atlas has been
 * "looked at" many times on guesswork. A one-off outlier cannot be reproduced
 * on demand — so the page records its own breakdown, and the next outlier names
 * its cause in the log under ATLAS_AUFBAU_MARKE.
 *
 * Pure bookkeeping: the clock comes from outside, nothing here awaits a read.
 */

export const ATLAS_AUFBAU_MARKE = "[atlas-aufbau]";
/** Below this a build is normal; logging every build would only add noise. */
export const LANGSAM_AB_MS = 2500;

export type AufbauUhr = { start: number; schritte: { name: string; ms: number; fehler?: true }[] };

export function neueUhr(jetzt: number): AufbauUhr {
  return { start: jetzt, schritte: [] };
}

/**
 * Notes when a read settles, measured from the page start. The read itself is
 * untouched — the caller keeps using the original promise. A rejection is
 * recorded and swallowed here, so this never adds an unhandled rejection.
 */
export function messe(uhr: AufbauUhr, name: string, p: Promise<unknown>, jetzt: () => number = Date.now): void {
  p.then(
    () => { uhr.schritte.push({ name, ms: jetzt() - uhr.start }); },
    () => { uhr.schritte.push({ name, ms: jetzt() - uhr.start, fehler: true }); },
  );
}

/** One log line for a slow build, slowest step first; null for a normal one. */
export function aufbauBericht(uhr: AufbauUhr, seite: string, endeMs: number): string | null {
  const gesamt = endeMs - uhr.start;
  if (gesamt < LANGSAM_AB_MS) return null;
  const schritte = [...uhr.schritte].sort((a, b) => b.ms - a.ms);
  return `${ATLAS_AUFBAU_MARKE} ${JSON.stringify({ seite, gesamtMs: gesamt, schritte })}`;
}
