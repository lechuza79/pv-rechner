import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Resolves a 5-digit PLZ to its municipality codes (AGS). The 933 KB lookup
// table lives server-side only — clients get just the handful of candidates
// for their PLZ, then compute matching funding programs locally (pure data).
//
// PLZ → AGS mapping is effectively static (boundary changes are rare), so the
// response is cached aggressively at the edge.

type PlzEntry = { ort: string; ags: string; kreis: string; land: string };

let cache: Record<string, PlzEntry[]> | null = null;

async function loadTable(): Promise<Record<string, PlzEntry[]>> {
  if (cache) return cache;
  const file = path.join(process.cwd(), "public", "plz-ags.json");
  cache = JSON.parse(await fs.readFile(file, "utf-8")) as Record<string, PlzEntry[]>;
  return cache;
}

export async function GET(req: NextRequest) {
  const plz = req.nextUrl.searchParams.get("plz") ?? "";
  if (!/^\d{5}$/.test(plz)) {
    return NextResponse.json({ error: "invalid plz" }, { status: 400 });
  }
  let candidates: { ort: string; ags: string }[] = [];
  try {
    const table = await loadTable();
    candidates = (table[plz] ?? []).map((e) => ({ ort: e.ort, ags: e.ags }));
  } catch {
    return NextResponse.json({ plz, candidates: [] }, { status: 200 });
  }
  return NextResponse.json(
    { plz, candidates },
    { headers: { "Cache-Control": "public, s-maxage=31536000, immutable" } },
  );
}
