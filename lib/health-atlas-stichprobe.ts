import { ATLAS_WURZEL } from "./atlas-wurzel";

/** Which Atlas paths a health-check run may probe.
 *
 *  A kreisfreie Stadt sits at Kreis level but has exactly ONE Gemeinde beneath
 *  it — itself. The Atlas page redirects such a Kreis address to that single
 *  leaf (307), because a ranking of one row says nothing. That redirect is
 *  correct product behaviour, so a probe that reads it as an HTTP failure is a
 *  broken measuring device, not a broken site: measured 19.09.2026, the cold
 *  probe drew Würzburg (Kreis 09663, Gemeinde 09663000, same slug) and
 *  escalated "Atlas-Seite antwortet mit 307" while the page was healthy.
 *
 *  The exclusion asks the SAME question the page asks — "does this Kreis have
 *  more than one child?" — instead of guessing from the key format. A second
 *  rule ("Gemeinde key is Kreis key plus 000") would be a second truth that can
 *  drift away from the redirect it is meant to predict.
 *
 *  The leaf page stays a valid probe either way: only the Kreis address
 *  redirects, the Gemeinde address below it answers with 200.
 */
/** So lose getippt, wie die Datenbankantwort wirklich ist: Ein fehlendes Feld
 *  und ein leeres Feld sind hier dasselbe, und beides wird unten geprüft. */
export type RegionZeile = { slug?: string | null; parent_region_id?: string | null };

/** Ist dieser Kreis eine kreisfreie Stadt? Entschieden an der Zahl der Gemeinden
 *  unter ihm, abgefragt mit `limit=2` — zwei Zeilen genügen als Beweis.
 *
 *  EIGENE FUNKTION, WEIL DIE SCHWELLE SONST UNGEPRÜFT IM SKRIPT STEHT: beim
 *  Bauen am 20.09.2026 blieb der Wächter grün, als die Bedingung versuchsweise
 *  von „genau eins" auf „null" verdreht wurde — die Prüfung wäre damit
 *  wirkungslos gewesen UND hätte sich bei jeder Störung selbst abgeschaltet,
 *  ohne dass irgendetwas rot geworden wäre.
 *
 *  Null Zeilen heißen NICHT „kreisfrei", sondern „nicht feststellbar" (Abruf
 *  gescheitert, Zeitlimit, Datenlücke). Dann wird nicht ausgeschlossen: ein
 *  Fehlalarm ist billiger als eine Prüfung, die bei Störungen stumm ausfällt. */
/** Does this Land belong to the published Atlas? Only a Land directly below the
 *  root the page walks from has pages; a Swiss canton (parent `ch`) does not.
 *  Measured 07.10.2026: after the Swiss import the random draw picked Tenniken
 *  (Basel-Landschaft) and escalated "Atlas-Seite antwortet mit 404" for a page
 *  that is deliberately unpublished. A missing parent counts as NOT published —
 *  a probe that cannot be placed under the root is not a probe of a real page. */
export function landIstVeroeffentlicht(land: RegionZeile | undefined): boolean {
  return land?.parent_region_id === ATLAS_WURZEL;
}

/** The same question as a PostgREST fragment for a Gemeinde row: Gemeinde →
 *  Kreis → Land → root. Every published Gemeinde sits exactly three levels below
 *  the root (a kreisfreie Stadt too: its Gemeinde hangs below its Kreis row).
 *  Measured 07.10.2026: 10,749 Gemeinden with the filter, 12,859 without — the
 *  difference is exactly the 2,110 Swiss ones. */
export const UNTER_ATLAS_WURZEL = {
  select: "k:parent_region_id!inner(l:parent_region_id!inner(parent_region_id))",
  filter: `k.l.parent_region_id=eq.${ATLAS_WURZEL}`,
} as const;

export function istKreisfreieStadt(gemeindenDarunter: number): boolean {
  return gemeindenDarunter === 1;
}

export function atlasStichprobenPfade(input: {
  gemeinden: RegionZeile[];
  kreisById: Map<string, RegionZeile>;
  landById: Map<string, RegionZeile>;
  /** Kreis ids with exactly one Gemeinde beneath them — kreisfreie Städte. */
  einzelkind: Set<string>;
}): { gemeinde: string[]; kreis: string[] } {
  const gemeinde: string[] = [];
  const kreis = new Set<string>();

  for (const g of input.gemeinden) {
    const kreisId = g.parent_region_id ?? "";
    const k = input.kreisById.get(kreisId);
    const l = k ? input.landById.get(k.parent_region_id ?? "") : undefined;
    if (!k?.slug || !l?.slug) continue;
    if (!landIstVeroeffentlicht(l)) continue;

    if (g.slug) gemeinde.push(`/solar-atlas/${l.slug}/${k.slug}/${g.slug}`);
    if (!input.einzelkind.has(kreisId)) kreis.add(`/solar-atlas/${l.slug}/${k.slug}`);
  }

  return { gemeinde, kreis: Array.from(kreis) };
}
