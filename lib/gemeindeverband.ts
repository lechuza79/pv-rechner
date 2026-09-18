/**
 * Official administrative association per municipality, read from the Destatis
 * Gemeindeverzeichnis (GV100AD, record types 50 and 60).
 *
 * The file is padded per CHARACTER, not per byte (verified 17.09.2026 against
 * names with umlauts), so positions are string indices of the decoded text.
 * Layout: docs of the dataset, "Datensatzbeschreibung_GV100AD".
 */
export type Gemeindeverband = {
  ags: string;
  name: string;
  population: number | null;
  verbandKey: string;
  verbandName: string | null;
  /** Textkennzeichen: 50 verbandsfrei, 51 Amt, 52 Samtgemeinde, 53 Verbandsgemeinde, 54 VGem, 55 Kirchspielslandgemeinde, 56 Verwaltungsverband, 57 VG Trägermodell, 58 erfüllende Gemeinde */
  verbandType: string | null;
  verbandMembers: number;
};

export function parseGv100(text: string): Map<string, Gemeindeverband> {
  const verbaende = new Map<string, { name: string; type: string }>();
  const rows: Omit<Gemeindeverband, "verbandName" | "verbandType" | "verbandMembers">[] = [];
  for (const line of text.split(/\r?\n/)) {
    const kind = line.slice(0, 2);
    if (kind === "50") {
      verbaende.set(line.slice(10, 15) + line.slice(18, 22), { name: line.slice(22, 72).trim(), type: line.slice(122, 124).trim() });
    } else if (kind === "60") {
      const population = line.slice(139, 150).trim();
      rows.push({
        ags: line.slice(10, 15) + line.slice(15, 18),
        name: line.slice(22, 72).trim(),
        population: /^\d+$/.test(population) ? Number(population) : null,
        verbandKey: line.slice(10, 15) + line.slice(18, 22),
      });
    }
  }
  const members = new Map<string, number>();
  for (const row of rows) members.set(row.verbandKey, (members.get(row.verbandKey) ?? 0) + 1);
  return new Map(rows.map(row => {
    const verband = verbaende.get(row.verbandKey);
    return [row.ags, { ...row, verbandName: verband?.name ?? null, verbandType: verband?.type ?? null, verbandMembers: members.get(row.verbandKey) ?? 1 }];
  }));
}

/** A shared administration exists only when the official association has more than one member. */
export function hasSharedAdministration(v: Gemeindeverband | undefined): boolean {
  return !!v && v.verbandMembers > 1 && !!v.verbandName;
}
