// MaStR region metadata: AGS ↔ ISO-3166-2 ↔ Name.
// AGS (Amtlicher Gemeindeschlüssel) is the primary key — matches the MaStR
// `Gemeindeschluessel` field (Bundesland = first 2 digits, Landkreis = 5 digits).
// ISO codes are the identifiers used in our isellsoap Bundesländer GeoJSON.

import { BUNDESLAENDER_DATEN } from "../public/shared-nav/bundeslaender.js";

export type Bundesland = {
  ags: string;      // 2-digit AGS, e.g. "08"
  iso: string;      // ISO 3166-2, e.g. "DE-BW"
  name: string;
  short: string;
};

export const BUNDESLAENDER: Bundesland[] = BUNDESLAENDER_DATEN;

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
