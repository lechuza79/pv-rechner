// ─── Traffic-Bericht: wo kommt Verkehr an, was bewegt sich, wo liegt Potenzial ─
//
// WHY (26.09.2026): Reddit had become our largest source after search engines
// (170+ visitors a month on the calculators) and nobody had looked — the only
// visitor analysis was the outreach one, restricted to municipality pages.
// This module holds the pure decisions; the script fetches and prints.
//
// Everything here is a HINT for a person, not a conclusion: a page that grows
// is worth a look; whether to sharpen it or write more is a judgement.

export type Zeile = { schluessel: string; besucher: number };

export type Bewegung = { schluessel: string; jetzt: number; vorher: number; delta: number };

/**
 * Largest movers between two equal windows. Small numbers are noise: a page
 * going from 1 to 3 visitors is +200 % and means nothing, so a change counts
 * only from `minDelta` visitors in absolute terms.
 */
export function bewegungen(jetzt: Zeile[], vorher: Zeile[], minDelta = 5): { steigt: Bewegung[]; faellt: Bewegung[] } {
  const v = new Map(vorher.filter((z) => z.schluessel !== "Others").map((z) => [z.schluessel, z.besucher]));
  const j = new Map(jetzt.filter((z) => z.schluessel !== "Others").map((z) => [z.schluessel, z.besucher]));
  const alle = new Set([...v.keys(), ...j.keys()]);
  const liste: Bewegung[] = [...alle].map((k) => {
    const a = j.get(k) ?? 0;
    const b = v.get(k) ?? 0;
    return { schluessel: k, jetzt: a, vorher: b, delta: a - b };
  });
  return {
    steigt: liste.filter((x) => x.delta >= minDelta).sort((a, b) => b.delta - a.delta),
    faellt: liste.filter((x) => x.delta <= -minDelta).sort((a, b) => a.delta - b.delta),
  };
}

export type Suchanfrage = { query: string; page: string; impressions: number; clicks: number; position: number };

export type Chance = Suchanfrage & { art: "nachschaerfen" | "neuer-inhalt" };

/**
 * Search queries worth work.
 *
 * - "nachschaerfen": we already rank on page 1–3 (position 4–30) with real
 *   impressions but few clicks — the page exists, it needs to answer better.
 * - "neuer-inhalt": the ranking page does not fit the query (a municipality
 *   page answering a how-to question) — a dedicated page could take it.
 *   Detected only coarsely: the query asks something ("wie", "lohnt", "was",
 *   "welche", "?") and lands on an atlas or funding page.
 *
 * Position 1–3 is left out: that page already wins, nothing to gain there.
 */
export function chancen(anfragen: Suchanfrage[], minImpressionen = 20): Chance[] {
  const frage = /(^|\s)(wie|was|welche|welcher|lohnt|warum|wann|wieviel|wie viel|kosten|berechnen)(\s|$)|\?/i;
  const raus: Chance[] = [];
  for (const a of anfragen) {
    if (a.impressions < minImpressionen) continue;
    if (a.position < 4 || a.position > 30) continue;
    const pfad = a.page.replace(/^https?:\/\/[^/]+/, "");
    const ortsseite = /^\/(solar-atlas|photovoltaik-foerderung)\//.test(pfad);
    raus.push({ ...a, art: ortsseite && frage.test(a.query) ? "neuer-inhalt" : "nachschaerfen" });
  }
  return raus.sort((a, b) => b.impressions - a.impressions);
}
