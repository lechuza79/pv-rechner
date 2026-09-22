// MaStR region metadata: AGS ↔ ISO-3166-2 ↔ Name.
// AGS (Amtlicher Gemeindeschlüssel) is the primary key — matches the MaStR
// `Gemeindeschluessel` field (Bundesland = first 2 digits, Landkreis = 5 digits).
// ISO codes are the identifiers used in our isellsoap Bundesländer GeoJSON.

export type Bundesland = {
  ags: string;      // 2-digit AGS, e.g. "08"
  iso: string;      // ISO 3166-2, e.g. "DE-BW"
  name: string;
  short: string;
};

export const BUNDESLAENDER: Bundesland[] = [
  { ags: "01", iso: "DE-SH", name: "Schleswig-Holstein", short: "SH" },
  { ags: "02", iso: "DE-HH", name: "Hamburg", short: "HH" },
  { ags: "03", iso: "DE-NI", name: "Niedersachsen", short: "NI" },
  { ags: "04", iso: "DE-HB", name: "Bremen", short: "HB" },
  { ags: "05", iso: "DE-NW", name: "Nordrhein-Westfalen", short: "NW" },
  { ags: "06", iso: "DE-HE", name: "Hessen", short: "HE" },
  { ags: "07", iso: "DE-RP", name: "Rheinland-Pfalz", short: "RP" },
  { ags: "08", iso: "DE-BW", name: "Baden-Württemberg", short: "BW" },
  { ags: "09", iso: "DE-BY", name: "Bayern", short: "BY" },
  { ags: "10", iso: "DE-SL", name: "Saarland", short: "SL" },
  { ags: "11", iso: "DE-BE", name: "Berlin", short: "BE" },
  { ags: "12", iso: "DE-BB", name: "Brandenburg", short: "BB" },
  { ags: "13", iso: "DE-MV", name: "Mecklenburg-Vorpommern", short: "MV" },
  { ags: "14", iso: "DE-SN", name: "Sachsen", short: "SN" },
  { ags: "15", iso: "DE-ST", name: "Sachsen-Anhalt", short: "ST" },
  { ags: "16", iso: "DE-TH", name: "Thüringen", short: "TH" },
];

const BY_ISO = new Map(BUNDESLAENDER.map((b) => [b.iso, b]));
const BY_AGS = new Map(BUNDESLAENDER.map((b) => [b.ags, b]));

export function bundeslandByIso(iso: string): Bundesland | undefined {
  return BY_ISO.get(iso);
}

export function bundeslandByAgs(ags: string): Bundesland | undefined {
  return BY_AGS.get(ags);
}

export function isoToAgs(iso: string): string | undefined {
  return BY_ISO.get(iso)?.ags;
}
