import { execFileSync } from 'node:child_process';
import { readSupplementalSource } from './contact-source-record';
export type PdfRegion = { sourcePdfDigest: string; observationDigest?: string; page: number; region: [number,number,number,number]; quote: string; email: string; url: string; associationReason?: string };
const normalize = (value: string) => value.replace(/\s+/g,' ').trim();
/** Re-extract the explicitly reviewed region from original PDF bytes; no OCR guess or cached text trust. */
export function pdfRegionSupported(directory: string, organizationId: string, contact: PdfRegion): boolean {
  if (!Number.isInteger(contact.page) || contact.page<1 || contact.page>10000 ||
      !Array.isArray(contact.region) || contact.region.length!==4 || contact.region.some(v=>!Number.isInteger(v)||v<0||v>20000) ||
      contact.region[2]===0 || contact.region[3]===0 || typeof contact.associationReason!=='string' || contact.associationReason.trim().length<40 ||
      contact.quote.length<20 || contact.quote.length>1200) return false;
  const original = readSupplementalSource(directory,organizationId,contact.url,contact.sourcePdfDigest,'pdf',contact.observationDigest);
  if (!original) return false;
  try {
    const [x,y,w,h]=contact.region;
    const text=normalize(execFileSync('pdftotext',['-f',String(contact.page),'-l',String(contact.page),'-r','72','-x',String(x),'-y',String(y),'-W',String(w),'-H',String(h),'-layout','-nopgbrk','-','-'],{input:original,encoding:'utf8',timeout:10000,maxBuffer:1024*1024}));
    const quote=normalize(contact.quote);
    const emails=[...new Set((text.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)??[]).map(x=>x.toLowerCase()))];
    return text.includes(quote) && quote.includes(contact.email) && emails.length===1 && emails[0]===contact.email.toLowerCase();
  } catch { return false; } // Unavailable parser/scan/failed region stays unresolved.
}
