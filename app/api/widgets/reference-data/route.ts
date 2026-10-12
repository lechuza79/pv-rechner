import {getWidgetReferenceData} from '../../../../lib/widget-reference-data';
import {livePreviewResponse} from '../../../../lib/preview-data';

export const dynamic = 'force-dynamic';

/** Public observations shared by the historical widget families. */
export async function GET(request: Request) {
  const live = await livePreviewResponse(request);
  if (live) return live;
  return Response.json(getWidgetReferenceData(), {
    headers: {'Cache-Control': 'public, max-age=300, s-maxage=3600'},
  });
}
