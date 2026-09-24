import { recordSupplementalSource } from './lib/contact-source-record';

/** Capture one explicitly selected original source; never send mail or modify recipients. */
async function main() {
  const args = new Map(process.argv.slice(2).map(arg => { const i=arg.indexOf('='); return [arg.slice(0,i),arg.slice(i+1)]; }));
  const directory=args.get('--directory'), organizationId=args.get('--organization'), url=args.get('--url');
  if (!directory || !organizationId || !url || !/^https?:$/.test(new URL(url).protocol)) throw new Error('Provide --directory, --organization and --url');
  const response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'solar-check.io contact-research/1.0'}});
  const bytes=Buffer.from(await response.arrayBuffer());
  const contentType=response.headers.get('content-type')??'';
  const sourceKind=bytes.subarray(0,5).toString()==='%PDF-'?'original-http-pdf':/html/i.test(contentType)?'original-http-html':null;
  if (!sourceKind) throw new Error(`Unsupported source type: ${contentType}`);
  const saved=recordSupplementalSource(directory,organizationId,bytes,{url,finalUrl:response.url,observedAt:new Date().toISOString(),sourceKind,httpStatus:response.status});
  console.log(JSON.stringify({...saved,sourceKind,httpStatus:response.status,finalUrl:response.url}));
  if (!response.ok) process.exitCode=1;
}
main().catch(error=>{console.error(String(error));process.exitCode=1;});
