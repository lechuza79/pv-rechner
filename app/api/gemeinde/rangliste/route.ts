import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { loadAwardStats, loadElternSlugs } from "../../../../lib/awards-server";
import { rankingKategorien, rankingRows } from "../../../../lib/atlas-ranking";
import { anzeigeOrtsname } from "../../../../lib/atlas-orte";
import { RANKING_FELDER } from "../../../../lib/ranking-felder";

/**
 * One full ranking list for the municipality page, fetched when a visitor
 * opens a saved ranking (public/gemeinde/rangliste.js).
 *
 * The prototype shipped every list with the page — 3.7 MB for one town. The
 * key is the one stored in the town's package (`<category>:<scope>:<field>`,
 * see lib/story-ranking-atlas.ts); the rows come from the same live Atlas
 * stats and the same rankingRows() as the public ranking pages, so a list
 * here can never disagree with /solar-atlas/ranking.
 *
 * Public and read-only: it returns what the ranking pages already show.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "gemeinde-rangliste");
  if (limited) return limited;
  const key = req.nextUrl.searchParams.get("schluessel") ?? "";
  const [kategorieKey, scope, feldSlug] = key.split(":");
  const kategorie = rankingKategorien().find((k) => k.key === kategorieKey);
  const feld = feldSlug === "all" ? null : RANKING_FELDER.find((f) => f.slug === feldSlug);
  if (!kategorie || !scope || !/^(de|\d{2}|\d{5})$/.test(scope) || (feldSlug !== "all" && !feld)) {
    return NextResponse.json({ error: "Rangliste unbekannt" }, { status: 400 });
  }
  try {
    const [stats, elternSlugs] = await Promise.all([loadAwardStats(), loadElternSlugs()]);
    // Jede Zeile führt auf ihre eigene Ortsseite — die Liste ist sonst eine
    // Sackgasse aus zehn bis hundert Ortsnamen, die man nur lesen kann.
    // Dieselbe Bauweise wie in lib/atlas-nachbarn.ts: Land- und Kreis-Slug aus
    // einem Verzeichnis, der Ortsteil steht am Bestandssatz.
    const slugVon = new Map(stats.map((g) => [g.regionId, g.slug ?? null]));
    const href = (regionId: string) => {
      const land = elternSlugs[regionId.slice(0, 2)];
      const kreis = elternSlugs[regionId.slice(0, 5)];
      const slug = slugVon.get(regionId);
      return land && kreis && slug ? `/solar-atlas/${land}/${kreis}/${slug}` : null;
    };
    const rows = rankingRows(stats, kategorie, scope === "de" ? null : scope, feld ?? null, true).map((r) => ({
      id: r.regionId,
      // Wie auf der Ortsseite: ohne die sorbische Zweitform, sonst füllt ein
      // einziger Name die halbe Tabellenbreite.
      name: anzeigeOrtsname(r.name),
      rank: r.platz,
      value: r.wert,
      change: r.veraenderung,
      href: href(r.regionId),
    }));
    return NextResponse.json(rows, {
      // Lists change with the monthly Atlas run; a day at the edge is plenty.
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    console.error("[gemeinde/rangliste] failed:", (err as Error).message);
    return NextResponse.json({ error: "Rangliste konnte nicht geladen werden" }, { status: 500 });
  }
}
