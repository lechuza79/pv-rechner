/** Select a started batch with open towns; the editorial plan takes priority. */
export function waehleRedaktionsSchub(
  staende: readonly { schluessel: string; abIso: string; offen: number }[],
  geplant: string,
  heuteIso: string,
): string | null {
  const verfuegbar = staende.filter((s) => s.abIso <= heuteIso && s.offen > 0);
  const vorgabe = verfuegbar.find((s) => s.schluessel === geplant);
  if (vorgabe) return vorgabe.schluessel;
  // Preserve the existing fallback among eligible batches only.
  return [...verfuegbar].sort((a, b) => b.offen - a.offen)[0]?.schluessel ?? null;
}
