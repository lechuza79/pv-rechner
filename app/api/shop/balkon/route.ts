import { NextResponse } from 'next/server';
import { readBkwCatalog } from '../../../../lib/bkw-katalog-db';

/** Scheduled import owns merchant access; preserve the original fetch date in the response. */
export async function GET() {
  try {
    return NextResponse.json(await readBkwCatalog(), {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ fehler: 'Angebote sind vorübergehend nicht verfügbar.' }, {
      status: 502, headers: { 'Cache-Control': 'public, s-maxage=60' },
    });
  }
}
