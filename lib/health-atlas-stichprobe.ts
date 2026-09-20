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

    if (g.slug) gemeinde.push(`/solar-atlas/${l.slug}/${k.slug}/${g.slug}`);
    if (!input.einzelkind.has(kreisId)) kreis.add(`/solar-atlas/${l.slug}/${k.slug}`);
  }

  return { gemeinde, kreis: Array.from(kreis) };
}
