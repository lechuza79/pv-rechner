import { NextRequest, NextResponse } from "next/server";
import { getRegionSummary, type Energietraeger } from "../../../../lib/mastr-data";

const VALID_TYPES: Energietraeger[] = ["solar", "wind", "biomasse", "wasser", "speicher"];

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "de";
  const typeParam = req.nextUrl.searchParams.get("type") ?? "solar";

  if (!VALID_TYPES.includes(typeParam as Energietraeger)) {
    return NextResponse.json(
      { error: `Invalid type. Allowed: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const summary = await getRegionSummary(region, typeParam as Energietraeger);
    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
