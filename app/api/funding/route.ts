import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getFundingPrograms } from "../../../lib/funding-data";
import { matchFundingForAgs, type FundingProgram } from "../../../lib/funding-programs";
import { rateLimit } from "../../../lib/rate-limit";

// Resolves funding for the rechner. The 933 KB PLZ→AGS table and the program
// dataset both live server-side; the client gets only the matched programs.
//
// ?plz=XXXXX → { plz, candidates: [{ ort, ags, programs }] }
//   one entry per municipality sharing the PLZ (client disambiguates)
// ?foe=<id>  → { foe, ags, programs }  pre-arm a specific program (e.g. from a
//   city/funding page link)

type PlzEntry = { ort: string; ags: string; kreis: string; land: string };

let plzCache: Record<string, PlzEntry[]> | null = null;

async function loadTable(): Promise<Record<string, PlzEntry[]>> {
  if (plzCache) return plzCache;
  const file = path.join(process.cwd(), "public", "plz-ags.json");
  plzCache = JSON.parse(await fs.readFile(file, "utf-8")) as Record<string, PlzEntry[]>;
  return plzCache;
}

const headers = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "funding");
  if (limited) return limited;

  const plz = req.nextUrl.searchParams.get("plz") ?? "";
  const foe = req.nextUrl.searchParams.get("foe") ?? "";
  const all = await getFundingPrograms();

  // Pre-arm a specific program by id.
  if (foe) {
    const program = all.find((p) => p.id === foe);
    if (!program) return NextResponse.json({ foe, ags: null, programs: [] }, { status: 200, headers });
    const ags = program.agsCode ?? "";
    const programs = ags ? matchFundingForAgs(all, ags) : [program];
    return NextResponse.json({ foe, ags, programs }, { headers });
  }

  if (!/^\d{5}$/.test(plz)) {
    return NextResponse.json({ error: "invalid plz" }, { status: 400 });
  }
  let candidates: { ort: string; ags: string; programs: FundingProgram[] }[] = [];
  try {
    const table = await loadTable();
    candidates = (table[plz] ?? []).map((e) => ({ ort: e.ort, ags: e.ags, programs: matchFundingForAgs(all, e.ags) }));
  } catch {
    return NextResponse.json({ plz, candidates: [] }, { status: 200 });
  }
  return NextResponse.json({ plz, candidates }, { headers });
}
