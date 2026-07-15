import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { rateLimit } from "../../../../lib/rate-limit";
import { getRegionById } from "../../../../lib/atlas";

// PLZ → Gemeinde. Resolves a postcode to the Solar-Atlas page for that place, so
// the client can remember one home Gemeinde without shipping the 933 KB lookup
// table to every browser.
//
// A postcode is not personal data on its own, and it never leaves our server:
// the client sends it here and gets back a region. Nothing is logged, nothing is
// forwarded (Legal-Checkliste Punkt 3 — no PLZ in analytics events either).

type PlzEntry = { ort: string; ags: string; kreis: string; land: string };

let plzCache: Record<string, PlzEntry[]> | null = null;

async function loadPlz(): Promise<Record<string, PlzEntry[]>> {
  if (plzCache) return plzCache;
  const file = path.join(process.cwd(), "public", "plz-ags.json");
  plzCache = JSON.parse(await fs.readFile(file, "utf-8")) as Record<string, PlzEntry[]>;
  return plzCache;
}

export type GemeindeHit = {
  region_id: string;
  name: string;
  /** Full atlas path, ready to link. */
  path: string;
  kreisName: string;
  bundeslandName: string;
};

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "atlas-gemeinde");
  if (limited) return limited;

  const plz = (req.nextUrl.searchParams.get("plz") ?? "").trim();
  if (!/^\d{5}$/.test(plz)) {
    return NextResponse.json({ error: "PLZ muss fünfstellig sein" }, { status: 400 });
  }

  const table = await loadPlz();
  const entries = table[plz];
  if (!entries?.length) {
    return NextResponse.json({ error: "Diese Postleitzahl kennen wir nicht" }, { status: 404 });
  }

  // A postcode can span several Gemeinden. Resolve each to its atlas page and let
  // the client pick — silently taking the first would put a user in the wrong
  // place without telling them.
  const hits: GemeindeHit[] = [];
  for (const e of entries) {
    const gemeinde = await getRegionById(e.ags);
    if (!gemeinde?.slug || !gemeinde.parent_region_id) continue;
    const kreis = await getRegionById(gemeinde.parent_region_id);
    const bl = kreis?.parent_region_id ? await getRegionById(kreis.parent_region_id) : null;
    if (!kreis?.slug || !bl?.slug) continue;
    hits.push({
      region_id: gemeinde.region_id,
      name: gemeinde.name,
      path: `/solar-atlas/${bl.slug}/${kreis.slug}/${gemeinde.slug}`,
      kreisName: kreis.name,
      bundeslandName: bl.name,
    });
  }

  if (hits.length === 0) {
    return NextResponse.json({ error: "Zu dieser Postleitzahl haben wir keine Gemeinde" }, { status: 404 });
  }

  return NextResponse.json(
    { plz, hits },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
