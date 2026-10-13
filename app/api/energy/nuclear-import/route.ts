import {NextRequest, NextResponse} from 'next/server';
import {livePreviewResponse} from '../../../../lib/preview-data';
import {rateLimit} from '../../../../lib/rate-limit';
import {readNuclearImport} from '../../../../lib/nuclear-import-data';
import {NuclearImportDataError} from '../../../../lib/nuclear-import';

export async function GET(req: NextRequest) {
  const live = await livePreviewResponse(req);
  if (live) return live;
  const limited = rateLimit(req, 'energy-nuclear-import');
  if (limited) return limited;
  try {
    const {payload, maxAge} = await readNuclearImport(req.nextUrl.searchParams);
    return NextResponse.json(payload, {headers: {
      'Cache-Control': payload.stale ? 'public, s-maxage=60' : `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      ...(payload.stale ? {'X-Data-Stale': 'true'} : {}),
    }});
  } catch (error) {
    if (!(error instanceof NuclearImportDataError)) console.error('Nuclear import fetch error:', error);
    return NextResponse.json({data: [], avg_gw: 0, avg_share_pct: 0, source: 'error', license: ''}, {status: 502});
  }
}
