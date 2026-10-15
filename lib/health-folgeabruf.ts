/**
 * What a municipality page loads AFTER its HTML, measured cold.
 *
 * WHY (07.10.2026): The health check timed the page itself (0.4–1.2 s) and
 * missed that the ranking podium waited 3.6–4.1 s for its list: the list route
 * loaded all ~11,000 towns on every fresh instance. The page looked fast in
 * every report while visitors watched an empty podium. A first visit is the
 * page AND what it fetches next; both are measured now.
 *
 * Pure: the caller fetches, these functions only read and judge.
 */

const RANGLISTE = /\/api\/gemeinde\/rangliste\?schluessel=[^"'&\\\s<]+/g;

/**
 * The ranking lists a page's HTML names, Kreis lists first: one per district,
 * so a probe on a town in a not-yet-visited district is a genuinely fresh
 * request (the national and state lists are shared and usually cached).
 */
export function ranglistenAdressen(html: string): string[] {
  const alle = [...new Set(html.match(RANGLISTE) ?? [])];
  // The separator arrives encoded (%3A) or plain; split on both instead of
  // decoding, which throws on a malformed address.
  const scope = (u: string) => (u.split("schluessel=")[1] ?? "").split(/%3A|:/i)[1] ?? "";
  return alle.sort((a, b) => (scope(b).length === 5 ? 1 : 0) - (scope(a).length === 5 ? 1 : 0));
}

/** Seconds above which the follow-up keeps a visitor waiting. Same limits as a page. */
export const FOLGEABRUF_GRENZEN = { warn: 2.0, fail: 4.0 } as const;

export type FolgeabrufMessung = { url: string; status: number; seconds: number; cache: string };

/** The finding for the slowest follow-up, or null when all were quick (or none was measured). */
export function folgeabrufBefund(messungen: FolgeabrufMessung[]): { stufe: "gelb" | "rot"; text: string } | null {
  const gemessen = messungen.filter((m) => m.status === 200);
  if (!gemessen.length) return null;
  const langsamste = gemessen.reduce((a, b) => (b.seconds > a.seconds ? b : a));
  if (langsamste.seconds < FOLGEABRUF_GRENZEN.warn) return null;
  const stufe = langsamste.seconds >= FOLGEABRUF_GRENZEN.fail ? "rot" : "gelb";
  return {
    stufe,
    text:
      `Die Rangliste einer Gemeindeseite kam beim ersten Abruf erst nach ${langsamste.seconds.toFixed(2)} s ` +
      `(${langsamste.url}, Cache ${langsamste.cache || "unbekannt"}). Die Seite selbst ist dann längst da, ` +
      `das Podest bleibt leer. Ursache am 07.10.2026: die Route lud alle Gemeinden statt der des Kreises.`,
  };
}
