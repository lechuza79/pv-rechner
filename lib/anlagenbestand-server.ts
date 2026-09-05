import "server-only";

// Lädt den bundesweiten Solarbestand für die Bestandsseite und ihr Widget.
//
// Drei Lesevorgänge, alle über den vorberechneten Rollup und alle gemeinsam
// einen Tag lang gehalten: Der Bestand ändert sich nur, wenn der monatliche
// Registerauszug neu eingelesen wird.
//
// EINE QUELLE FÜR DIE STÜCKZAHLEN. Der Bundesbestand kommt aus derselben
// Auswertung wie die Länderzeilen (`mastr_region_series` bzw. `mastr_children`
// über denselben Rollup) — gemessen am 26.08.2026 summieren sich die sechzehn
// Länderzeilen zeichengenau auf die Bundeszahl. Die Award-Tabelle wäre die
// naheliegende Alternative gewesen und ist die falsche: Sie filtert auf bewohnte
// Gemeinden mit Slug und verfehlt den Bund um rund 1.500 Anlagen. Das fällt in
// gerundeten Zahlen nicht auf und wäre damit genau der stille Widerspruch, den
// eine Seite mit zwei Quellen für dieselbe Größe produziert.

import { unstable_cache } from "next/cache";
import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";
import { getNationalSolarStock, loadChildren } from "./mastr-data";
import { bundeslandByAgs } from "./mastr-regions";
import { BESTAND_SEGMENT_TEXT, type Anlagenbestand, type BestandLandZeile } from "./anlagenbestand";

/** Einwohner je Bundesland — aus dem amtlichen Verzeichnis, nicht aus dem Register. */
async function ladeEinwohner(): Promise<Map<string, number>> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { data, error } = await withDbTimeout(
    supabase.from("mastr_regions").select("region_id,population").eq("level", "bundesland"),
    "anlagenbestand: einwohner",
    DB_SOFT_READ_TIMEOUT_MS,
  );
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as { region_id: string; population: number }[]).map((r) => [r.region_id, r.population]));
}

async function ladeLaender(): Promise<BestandLandZeile[]> {
  const [zeilen, einwohner] = await Promise.all([loadChildren("de", "bundesland", "solar"), ladeEinwohner()]);
  const proLand = new Map<string, { anlagen: number; kwp: number; balkon: number }>();
  for (const r of zeilen) {
    const e = proLand.get(r.region_id) ?? { anlagen: 0, kwp: 0, balkon: 0 };
    e.anlagen += r.count;
    e.kwp += r.kwp;
    if (r.segment === "steckersolar") e.balkon += r.count;
    proLand.set(r.region_id, e);
  }
  return [...proLand.entries()]
    .map(([ags, e]) => ({
      ags,
      // Der Name kommt aus der Stammdaten-Liste, nicht aus der Datenbank: Er
      // steht in Überschriften und darf nicht ausfallen, wenn ein Read hakt.
      name: bundeslandByAgs(ags)?.name ?? ags,
      einwohner: einwohner.get(ags) ?? 0,
      ...e,
    }))
    .filter((l) => l.einwohner > 0);
}

async function rechne(): Promise<Anlagenbestand> {
  const [bund, laender] = await Promise.all([getNationalSolarStock(), ladeLaender()]);

  return {
    standIso: bund.data_as_of,
    stichtagJahr: bund.stichtagJahr,
    gesamt: {
      anzahl: bund.gesamt.anzahl,
      kwp: bund.gesamt.kwp,
      anzahlStichtag: bund.stichtagGesamt.anzahl,
      kwpStichtag: bund.stichtagGesamt.kwp,
    },
    segmente: bund.segmente.map((s) => ({
      segment: s.segment,
      ...BESTAND_SEGMENT_TEXT[s.segment],
      anzahl: s.anzahl,
      kwp: s.kwp,
      anzahlStichtag: s.stichtag.anzahl,
      kwpStichtag: s.stichtag.kwp,
    })),
    laender,
  };
}

export const anlagenbestand = unstable_cache(rechne, ["anlagenbestand-de"], {
  revalidate: 86_400,
  tags: ["anlagenbestand"],
});
