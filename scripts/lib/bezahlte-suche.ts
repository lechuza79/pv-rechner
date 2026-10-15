/**
 * The one door to a paid web search (DataForSEO SERP) from a collection run.
 *
 * Decided twice and broken twice: on 28.09.2026 for the municipalities, on
 * 06.10.2026 for the wind operators — "the search service is for backlink
 * evaluation, not for a bulk run". Both times a run searched anyway, because
 * the decision lived in a comment and a flag nobody had to type. Mass research
 * is done by Claude itself (web search, the built-in browser, parallel agents).
 *
 * A run that fetches a SERP endpoint calls `bezahlteSucheFreigabe()` right
 * before the request (lib/__tests__/bezahlte-suche-sperre.test.ts checks every
 * such fetch). It throws unless the person typed the flag below in this very
 * command — and no unattended script (scripts/nacht-*.sh) may carry it.
 */
export const BEZAHLTE_SUCHE_FLAG = "--bezahlte-suche-freigegeben";

export class BezahlteSucheGesperrt extends Error {}

export function bezahlteSucheFreigabe(argv: string[] = process.argv): void {
  if (argv.includes(BEZAHLTE_SUCHE_FLAG)) return;
  throw new BezahlteSucheGesperrt(
    `Bezahlte Websuche gesperrt (Entscheidungen 28.09. und 06.10.2026). Recherche macht Claude selbst — ` +
    `nur wer sie für genau diesen Lauf ausdrücklich will, gibt ${BEZAHLTE_SUCHE_FLAG} mit.`,
  );
}
