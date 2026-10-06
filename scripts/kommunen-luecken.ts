/**
 * Gaps in the districts we already wrote to: every town there without a letter,
 * with its reason, and the district administration itself.
 *
 *   npm run kommunen:luecken                     summary per state, send day = tomorrow
 *   npm run kommunen:luecken -- --tag=2026-10-20 holiday check for another day
 *   npm run kommunen:luecken -- --liste=<datei>  one line per gap (CSV)
 *
 * Reads only; reasons come from lib/kommunen-luecken.ts.
 */
import { loadEnvConfig } from "@next/env";
import { writeFileSync } from "node:fs";

loadEnvConfig(process.cwd());

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("Supabase-Zugang fehlt");
const kopf = { apikey: key, Authorization: `Bearer ${key}` };

type Zeile = {
  region_id: string;
  outreach_status: string;
  kampagne: string | null;
  contacted_at: string | null;
  notes: string | null;
  rollen_email: string | null;
  rollen_email_quelle: string | null;
  presse_email: string | null;
  klima_email: string | null;
  presse_kontakt_email: string | null;
  verwaltung_domain: string | null;
  website: string | null;
  mastr_regions: { name: string; population: number | null } | null;
};

async function alleZeilen(): Promise<Zeile[]> {
  const out: Zeile[] = [];
  const felder =
    "region_id,outreach_status,kampagne,contacted_at,notes,rollen_email,rollen_email_quelle,presse_email,klima_email,presse_kontakt_email,verwaltung_domain,website,mastr_regions(name,population)";
  for (let o = 0; ; o += 1000) {
    const r = await fetch(`${url}/rest/v1/kommunen_kontakt?select=${felder}&order=region_id`, {
      headers: { ...kopf, Range: `${o}-${o + 999}` },
    });
    if (!r.ok) throw new Error(`kommunen_kontakt: HTTP ${r.status}`);
    const d = (await r.json()) as Zeile[];
    out.push(...d);
    if (d.length < 1000) return out;
  }
}

function morgen(heute: string): string {
  const d = new Date(`${heute}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const { lueckeVon, LUECKEN_GRUENDE } = await import("../lib/kommunen-luecken");
  const { buildHookIndex } = await import("../lib/awards-server");
  const { DEFAULT_HOOK_SETTINGS } = await import("../lib/award-hook");
  const { windgemeinde } = await import("../lib/windgemeinden");
  const { aktuellerGemeindeschluessel } = await import("../lib/ags-nachfolger");
  const { versandfenster } = await import("../lib/schulferien");
  const { heuteInBerlin } = await import("../lib/zeit");
  const { domainOf } = await import("../lib/kommunen-profil");
  const { BUNDESLAENDER } = await import("../lib/mastr-regions");

  const tag = arg("tag") ?? morgen(heuteInBerlin());
  const zeilen = await alleZeilen();
  const gemeinden = zeilen.filter((z) => z.region_id.length === 8);
  const kreisZeile = new Map(zeilen.filter((z) => z.region_id.length === 5).map((z) => [z.region_id, z]));

  // A district counts as written when at least one of its towns got a letter.
  const angeschrieben = new Set(gemeinden.filter((z) => z.contacted_at).map((z) => z.region_id.slice(0, 5)));
  const index = await buildHookIndex(DEFAULT_HOOK_SETTINGS);
  const hook = new Map(index.rows.map((r) => [r.regionId, r.kind as string]));

  // Holidays that START within ten days (up to the end of next week) block the send too (operator rule): a
  // letter read on the last day before the break is a letter nobody acts on.
  const ferienMemo = new Map<string, { frei: boolean; grund?: string; wiederFrei?: string | null }>();
  const ferienFenster = (ags: string) => {
    const bl = ags.slice(0, 2);
    const hit = ferienMemo.get(bl);
    if (hit) return hit;
    let f: { frei: boolean; grund?: string; wiederFrei?: string | null } = versandfenster(bl, tag);
    if (f.frei) {
      let d = tag;
      for (let i = 0; i < 10; i++) {
        d = morgen(d);
        const v = versandfenster(bl, d);
        if (!v.frei && /Schulferien/.test(v.grund ?? "")) {
          f = { frei: false, grund: `${v.grund}, beginnt ${d}`, wiederFrei: v.wiederFrei };
          break;
        }
      }
    }
    ferienMemo.set(bl, f);
    return f;
  };

  type Fund = { z: Zeile; grund: keyof typeof LUECKEN_GRUENDE; detail: string | null };
  const funde: Fund[] = [];
  for (const z of gemeinden) {
    if (!angeschrieben.has(z.region_id.slice(0, 5))) continue;
    const l = lueckeVon(
      { ...z, name: z.mastr_regions?.name ?? z.region_id },
      {
        aufgeloest: aktuellerGemeindeschluessel(z.region_id) !== z.region_id,
        hookKind: hook.get(z.region_id) ?? null,
        windgemeinde: windgemeinde(z.region_id),
        ferien: ferienFenster(z.region_id),
      },
    );
    if (l) funde.push({ z, ...l });
  }

  // One letter per shared administration: the others wait for the next batch.
  const verbundGesehen = new Set<string>();
  for (const f of funde.filter((x) => x.grund === "bereit")) {
    const v = f.z.verwaltung_domain ?? domainOf(f.z.website ?? "") ?? null;
    if (!v) continue;
    if (verbundGesehen.has(v)) f.detail = `gleiche Verwaltung (${v}) wie ein anderer Kandidat; ${f.detail ?? ""}`;
    else verbundGesehen.add(v);
  }

  const blName = (bl: string) => BUNDESLAENDER.find((b) => b.ags === bl)?.name ?? bl;
  const gruende = Object.keys(LUECKEN_GRUENDE) as (keyof typeof LUECKEN_GRUENDE)[];
  console.log(`Lücken in angeschriebenen Kreisen · Versandtag ${tag} · ${angeschrieben.size} Kreise, ${funde.length} Gemeinden ohne Brief\n`);
  const zaehl = (fs: Fund[]) => gruende.map((g) => [g, fs.filter((f) => f.grund === g).length] as const).filter(([, n]) => n);
  for (const [g, n] of zaehl(funde)) console.log(`  ${String(n).padStart(5)}  ${LUECKEN_GRUENDE[g]}`);
  console.log("");
  const laender = [...new Set(funde.map((f) => f.z.region_id.slice(0, 2)))].sort();
  for (const bl of laender) {
    const fs = funde.filter((f) => f.z.region_id.startsWith(bl));
    const kreise = [...angeschrieben].filter((k) => k.startsWith(bl));
    const kreisBrief = kreise.filter((k) => kreisZeile.get(k)?.contacted_at).length;
    console.log(
      `${blName(bl)} · ${kreise.length} Kreise, Kreisverwaltung angeschrieben: ${kreisBrief} · ` +
        zaehl(fs).map(([g, n]) => `${n} ${g}`).join(", "),
    );
  }

  const datei = arg("liste");
  if (datei) {
    const csv = ["region_id;gemeinde;kreis;grund;detail"];
    for (const f of funde) {
      const kreis = kreisZeile.get(f.z.region_id.slice(0, 5))?.mastr_regions?.name ?? f.z.region_id.slice(0, 5);
      csv.push([f.z.region_id, f.z.mastr_regions?.name ?? "", kreis, f.grund, (f.detail ?? "").replaceAll(";", ",")].join(";"));
    }
    writeFileSync(datei, csv.join("\n") + "\n");
    console.log(`\nListe: ${datei}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
