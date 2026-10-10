import {getWidgetReferenceData} from '../../../../lib/widget-reference-data';

export const dynamic = 'force-dynamic';

/** Public observations shared by the historical widget families. */
export async function GET() {
  return Response.json(getWidgetReferenceData(), {
    headers: {'Cache-Control': 'public, max-age=300, s-maxage=3600'},
  });
}
