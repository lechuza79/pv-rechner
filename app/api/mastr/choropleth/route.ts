import { NextRequest, NextResponse } from "next/server";
import { getChoroplethData, type Energietraeger } from "../../../../lib/mastr-data";

const VALID_TYPES: Energietraeger[] = ["solar", "wind", "biomasse", "wasser", "speicher"];

export async function GET(req: NextRequest) {
  const parent = req.nextUrl.searchParams.get("parent") ?? "de";
  const typeParam = req.nextUrl.searchParams.get("type") ?? "solar";

  if (!VALID_TYPES.includes(typeParam as Energietraeger)) {
    return NextResponse.json(
      { error: `Invalid type. Allowed: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const { data, source, data_as_of } = await getChoroplethData(parent, typeParam as Energietraeger);
    return NextResponse.json(
      { parent, type: typeParam, source, data_as_of, data },
      {
        headers: {
          // Aggregates change quarterly at most
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
