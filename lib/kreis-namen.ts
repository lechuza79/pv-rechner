import "server-only";
import kreiseGeo from "../public/geo/de-landkreise.geo.json";
import { BUNDESLAENDER } from "./mastr-regions";

/**
 * Kreisschlüssel → Kreisname und Bundesland.
 *
 * Aus derselben amtlichen Geometrie (BKG VG250), aus der auch die Ortssuche ihre
 * 400 Kreise nimmt — NICHT aus einer zweiten, getippten Liste. Ein
 * fünfstelliger Kreisschlüssel ist eine Zahl ohne Aussehen: Vertippt bleibt er
 * gültig und zeigt auf einen anderen Kreis, ohne dass irgendetwas auffällt.
 *
 * NUR AUF DEM SERVER — `server-only` erzwingt das. Die Datei enthält die
 * vollständigen Umrisse aller 400 Kreise; im Browser-Bundle wären das 173 kB
 * für zwei Textfelder je Zeile. Gemessen am 28.08.2026: Die Ansicht sprang von
 * 4 auf 177 kB, weil dieses Modul aus einer Client-Komponente importiert wurde.
 * Die Auflösung gehört deshalb an die Schnittstelle, das Rendern darf überall
 * passieren — dieselbe Trennung wie bei der Stand-Zeile der Rechner.
 */

interface KreisEintrag {
  id: string;
  name: string;
  kind: string;
  bl: string;
}

const geo = kreiseGeo as unknown as { features: { properties: KreisEintrag }[] };

const NACH_ID = new Map<string, KreisEintrag>(
  geo.features.map((f) => [f.properties.id, f.properties]),
);

const LAND_NAME = new Map(BUNDESLAENDER.map((b) => [b.ags, b.name]));
const LAND_KURZ = new Map(BUNDESLAENDER.map((b) => [b.ags, b.short]));

export interface KreisAuskunft {
  /** „Fulda" oder „Flensburg" — ohne den Zusatz „Landkreis". */
  name: string;
  /** „Landkreis" oder „Kreisfreie Stadt". */
  art: string;
  bundesland: string;
  bundeslandKurz: string;
}

export function kreisAuskunft(kreisId: string | null): KreisAuskunft | null {
  if (!kreisId) return null;
  const k = NACH_ID.get(kreisId);
  if (!k) return null;
  return {
    name: k.name,
    art: k.kind,
    bundesland: LAND_NAME.get(k.bl) ?? k.bl,
    bundeslandKurz: LAND_KURZ.get(k.bl) ?? k.bl,
  };
}
