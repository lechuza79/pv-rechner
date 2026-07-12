import { NextRequest, NextResponse } from "next/server";
import { getRegionSummary, type Energietraeger, type SegmentFilter } from "../../../../lib/mastr-data";

const VALID_TYPES: Energietraeger[] = ["solar", "wind", "biomasse", "wasser", "speicher", "gesamt"];
const VALID_SEGMENTS: SegmentFilter[] = ["alle", "privat_dach", "gewerbe_dach", "freiflaeche"];

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "de";
  const typeParam = req.nextUrl.searchParams.get("type") ?? "solar";
  const segmentParam = req.nextUrl.searchParams.get("segment") ?? "alle";

  if (!VALID_TYPES.includes(typeParam as Energietraeger)) {
    return NextResponse.json({ error: `Invalid type. Allowed: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!VALID_SEGMENTS.includes(segmentParam as SegmentFilter)) {
    return NextResponse.json({ error: `Invalid segment. Allowed: ${VALID_SEGMENTS.join(", ")}` }, { status: 400 });
  }

  try {
    const summary = await getRegionSummary(
      region,
      typeParam as Energietraeger,
      segmentParam as SegmentFilter,
    );
    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[mastr/summary] failed:", (err as Error).message);
    return NextResponse.json({ error: "Daten konnten nicht geladen werden" }, { status: 400 });
  }
}
