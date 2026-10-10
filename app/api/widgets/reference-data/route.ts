import {widgetReferenceData} from '../../../../lib/widget-reference-data';

/** Public observations shared by the historical widget families. */
export async function GET() {
  return Response.json(widgetReferenceData, {
    headers: {'Cache-Control': 'public, max-age=300, s-maxage=3600'},
  });
}
