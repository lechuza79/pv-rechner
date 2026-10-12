import {previewDataStatus,usesLivePreviewData} from '../../../lib/preview-data';
export function GET(){
  if(!usesLivePreviewData())return new Response(null,{status:404});
  return Response.json(previewDataStatus(),{headers:{'Cache-Control':'no-store'}});
}
