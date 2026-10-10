/**
 * Pages that someone outside links to must answer with the RIGHT page.
 *
 * WHY (28.09.2026): A change rendered the atlas pages of every municipality
 * with a proven publication at build time. The build was green, the pages were
 * fast — and every one of them answered 404, because municipality pages are
 * served by a different route. Seven press mails linking to exactly these
 * pages went out in the same minutes; the operator noticed by chance. None of
 * our checks looked at these pages: the health check draws RANDOM
 * municipalities, and a random page is almost never a linked one.
 *
 * So the health check now opens every linked page (each municipality with a
 * publication, and its district) and checks status AND content: a page can
 * answer 200 and still show the 404 text.
 */

export type VerlinkteSeite = { pfad: string; name: string };

/** Paths of the linked pages, from rows of the region registry. Pure. */
export function verlinktePfade(
  gemeindeIds: string[],
  regionen: { region_id: string; slug: string | null; name: string }[],
): VerlinkteSeite[] {
  const nach = new Map(regionen.map((r) => [r.region_id, r]));
  const out = new Map<string, VerlinkteSeite>();
  for (const id of [...new Set(gemeindeIds)].sort()) {
    // A publication can belong to a district itself (five digits, e.g. a
    // newspaper linking the district page): then there is no municipality
    // below it, and treating the district as one built a path that never existed.
    const istKreis = id.length === 5;
    const g = istKreis ? undefined : nach.get(id);
    const k = nach.get(id.slice(0, 5));
    const l = nach.get(id.slice(0, 2));
    if ((!istKreis && !g?.slug) || !k?.slug || !l?.slug) continue;
    const kreis = `/solar-atlas/${l.slug}/${k.slug}`;
    if (g?.slug) out.set(`${kreis}/${g.slug}`, { pfad: `${kreis}/${g.slug}`, name: g.name });
    out.set(kreis, { pfad: kreis, name: k.name });
  }
  return [...out.values()];
}

/**
 * Verdict on one fetched page. A district of a single town (kreisfreie Stadt)
 * forwards permanently to that town's page — a redirect is fine there.
 * Returns null when the page is fine, otherwise the reason.
 */
export function verlinkteSeiteBefund(status: number, html: string, name: string): string | null {
  if (status === 301 || status === 308) return null;
  if (status !== 200) return `HTTP ${status || "keine Antwort"}`;
  // Only the visible part: every page carries the 404 component unrendered in
  // its React payload (the not-found boundary), which is not an error.
  const sichtbar = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  if (/Diese Seite gibt es nicht/.test(sichtbar)) return "HTTP 200, aber mit dem Text der Fehlerseite";
  const titel = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const kern = name.replace(/^(Landkreis|Kreis|Stadt)\s+/, "").replace(/\s*\(.*\)$/, "");
  if (!titel.includes(kern)) return `Seitentitel nennt „${kern}" nicht (${titel.slice(0, 60) || "kein Titel"})`;
  return null;
}

/**
 * A page named in a letter must be indexable once the letter is out.
 *
 * WHY (06.10.2026): The rule "a town's page goes live when its letter goes
 * out" existed since 01.09.2026 — and was never measured. On 06.10.2026 all 95
 * pages of that day's batch still said "noindex" hours after the send, because
 * the list of written-to towns sat in a 24-hour cache. Nobody noticed until
 * the operator asked. The send now releases the pages itself and checks
 * every page it linked with this function; it ends red if one stays closed.
 *
 * Returns null when the page may be indexed, otherwise the reason.
 */
export function indexierbarBefund(status: number, html: string): string | null {
  if (status === 301 || status === 308) return null;
  if (status !== 200) return `HTTP ${status || "keine Antwort"}`;
  const robots = [...html.matchAll(/<meta[^>]+name=["']robots["'][^>]*>/gi)].map((m) => m[0]);
  if (robots.some((tag) => /noindex/i.test(tag))) return "steht noch auf „nicht indexieren“";
  return null;
}
