import "server-only";

// Zahlenbasis der Social-Posts, einmal aus dem Anlagenregister gerechnet.
//
// Die Abfrage geht über alle rund 10.700 bewohnten Gemeinden — teuer genug, um
// sie nicht bei jedem Aufruf zu fahren, und harmlos genug, um sie einen Tag lang
// zu halten: Der Bestand wird ohnehin nur einmal im Monat neu eingelesen.
//
// Der Lesepfad läuft über das kurze Budget mit Rückfall: Kommt die Datenbank
// nicht, zeigt die Vorschau eine Meldung statt zu hängen. Ein Redaktionstisch,
// der wartet, bis eine Function stirbt, ist schlimmer als einer, der sagt, dass
// er gerade nichts weiß.

import { unstable_cache } from "next/cache";
import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";
import type { SocialKennzahlen } from "./social-posts";

/** Ab wann eine Gemeinde als Stadt zählt. Runde Schwelle, im Text genannt. */
const STADT_AB = 100_000;
/** Bis wohin als kleine Gemeinde. Dazwischen bleibt bewusst eine Lücke. */
const LAND_UNTER = 20_000;

type AwardZeile = {
  region_id: string;
  population: number;
  balkon_count: number | null;
  balkon_count_ly: number | null;
  privat_dach_kwp: string | number | null;
  solar_kwp: string | number | null;
  solar_kwp_ly: string | number | null;
};

const zahl = (v: string | number | null | undefined) => (v == null ? 0 : Number(v) || 0);

/**
 * Holt alle Gemeindezeilen. Supabase liefert ohne Bereichsangabe stumm nur
 * 1.000 Zeilen — deshalb blockweise, mit Abbruch am Ende. Wer das vergisst,
 * rechnet Bundeswerte aus einem Zehntel des Landes und merkt es nicht.
 */
async function ladeGemeinden(): Promise<AwardZeile[]> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const spalten = "region_id,population,balkon_count,balkon_count_ly,privat_dach_kwp,solar_kwp,solar_kwp_ly";
  const alle: AwardZeile[] = [];
  const schritt = 1000;
  for (let von = 0; ; von += schritt) {
    const { data, error } = await withDbTimeout(
      supabase.from("mastr_gemeinde_award").select(spalten).range(von, von + schritt - 1),
      "social-kennzahlen: gemeinden",
      DB_SOFT_READ_TIMEOUT_MS,
    );
    if (error) throw new Error(error.message);
    const zeilen = (data ?? []) as unknown as AwardZeile[];
    alle.push(...zeilen);
    if (zeilen.length < schritt) break;
  }
  return alle;
}

async function ladeNamen(): Promise<Map<string, string>> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { data, error } = await withDbTimeout(
    supabase.from("mastr_regions").select("region_id,name").eq("level", "bundesland"),
    "social-kennzahlen: laendernamen",
    DB_SOFT_READ_TIMEOUT_MS,
  );
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as { region_id: string; name: string }[]).map((r) => [r.region_id, r.name]));
}

async function ladeStand(): Promise<string> {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  const { data } = await withDbTimeout(
    supabase.from("mastr_meta").select("imported_at").eq("id", 1).maybeSingle(),
    "social-kennzahlen: datenstand",
    DB_SOFT_READ_TIMEOUT_MS,
  );
  return (data as { imported_at?: string } | null)?.imported_at ?? new Date().toISOString();
}

async function rechne(): Promise<SocialKennzahlen> {
  const [zeilen, namen, standIso] = await Promise.all([ladeGemeinden(), ladeNamen(), ladeStand()]);

  // Nur bewohnte Gemeinden mit achtstelligem Schlüssel. Kreis- und
  // Landeszeilen stünden sonst zusätzlich im Nenner und verdoppelten Einwohner.
  const gem = zeilen.filter((r) => r.region_id.length === 8 && r.population > 0);

  const je1000 = (menge: AwardZeile[]) => {
    const ew = menge.reduce((s, r) => s + r.population, 0);
    const c = menge.reduce((s, r) => s + (r.balkon_count ?? 0), 0);
    return ew ? (c / ew) * 1000 : 0;
  };

  const stadt = gem.filter((r) => r.population >= STADT_AB);
  const land = gem.filter((r) => r.population < LAND_UNTER);

  const proLand = new Map<string, { ew: number; balkon: number; pv: number }>();
  for (const r of gem) {
    const k = r.region_id.slice(0, 2);
    const e = proLand.get(k) ?? { ew: 0, balkon: 0, pv: 0 };
    e.ew += r.population;
    e.balkon += r.balkon_count ?? 0;
    e.pv += zahl(r.privat_dach_kwp);
    proLand.set(k, e);
  }

  return {
    standIso,
    stadtLand: {
      stadtAb: STADT_AB,
      landUnter: LAND_UNTER,
      stadtAnzahl: stadt.length,
      landAnzahl: land.length,
      stadtJeTausend: je1000(stadt),
      landJeTausend: je1000(land),
    },
    wachstum: {
      balkonJetzt: gem.reduce((s, r) => s + (r.balkon_count ?? 0), 0),
      balkonVorJahr: gem.reduce((s, r) => s + (r.balkon_count_ly ?? 0), 0),
      solarKwpJetzt: gem.reduce((s, r) => s + zahl(r.solar_kwp), 0),
      solarKwpVorJahr: gem.reduce((s, r) => s + zahl(r.solar_kwp_ly), 0),
    },
    laender: [...proLand.entries()]
      .map(([ags, e]) => ({
        name: namen.get(ags) ?? ags,
        balkonJeTausend: e.ew ? (e.balkon / e.ew) * 1000 : 0,
        wpProKopf: e.ew ? (e.pv * 1000) / e.ew : 0,
      }))
      .sort((a, b) => b.balkonJeTausend - a.balkonJeTausend),
  };
}

export const socialKennzahlen = unstable_cache(rechne, ["social-kennzahlen"], {
  revalidate: 86_400,
  tags: ["social-kennzahlen"],
});
