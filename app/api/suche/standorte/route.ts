import { NextRequest, NextResponse } from "next/server";
import { suche } from "../../../../lib/suche";
import { getChildren, getRegionById } from "../../../../lib/atlas";
import { gemeindeGeo } from "../../../../lib/atlas-geo";
import { rateLimit } from "../../../../lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "suche");
  if (limited) return limited;
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const county = request.nextUrl.searchParams.get("kreis");
  try {
    if (county) {
      if (!/^\d{5}$/.test(county)) return NextResponse.json({ error: "Invalid county" }, { status: 400 });
      const region = await getRegionById(county);
      if (!region || region.level !== "landkreis") return NextResponse.json({ hits: [] });
      const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const children = (await getChildren(region)).filter(child => fold(child.name).includes(fold(q))).sort((a, b) => a.name.localeCompare(b.name, "de")).slice(0, 12);
      const hits = await Promise.all(children.map(async child => ({ ags: child.region_id, name: child.name, context: region.name, plz: (await gemeindeGeo(child.region_id))?.plz ?? "", kind: "Gemeinde" })));
      return NextResponse.json({ hits });
    }
    const result = await suche(q);
    if (result.orteNichtVerfuegbar) return NextResponse.json({ error: "Place search unavailable" }, { status: 503 });
    return NextResponse.json({ hits: result.orte.filter(place => place.ags.length >= 5).map(place => ({
      ags: place.ags, name: place.name, kind: place.gattung, context: place.kontext,
      plz: place.links.map(link => new URL(link.href, request.url).searchParams.get("plz")).find(value => /^\d{5}$/.test(value ?? "")) ?? "",
    })) });
  } catch { return NextResponse.json({ error: "Place search unavailable" }, { status: 503 }); }
}
