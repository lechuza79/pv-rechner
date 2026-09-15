import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { recordSupplementalSource, readSupplementalSource } from '../../scripts/lib/contact-source-record';
import { reviewContactSupported } from '../../scripts/lib/municipal-review-evidence';
vi.mock('node:child_process',()=>({execFileSync:vi.fn()}));
let root: string;
beforeEach(()=>{root=mkdtempSync(join(tmpdir(),'contact-original-'));vi.mocked(execFileSync).mockReset();});
afterEach(()=>rmSync(root,{recursive:true,force:true}));
const observation={url:'https://ort.de/a',finalUrl:'https://ort.de/a',observedAt:'2026-09-15T10:00:00Z',sourceKind:'original-http-html' as const};
it('keeps each URL/time observation without overwriting identical content provenance',()=>{
 const bytes=Buffer.from('<p>Original</p>');
 const a=recordSupplementalSource(root,'123',bytes,observation);
 const other={...observation,url:'https://ort.de/b',finalUrl:'https://ort.de/b',observedAt:'2026-09-16T10:00:00Z'};
 const b=recordSupplementalSource(root,'123',bytes,other);
 expect(a.sourceDigest).toBe(b.sourceDigest);expect(a.observationDigest).not.toBe(b.observationDigest);
 expect(recordSupplementalSource(root,'123',bytes,observation)).toEqual(a);
 expect(readSupplementalSource(root,'123',observation.finalUrl,a.sourceDigest,'html',a.observationDigest)).toEqual(bytes);
 expect(readSupplementalSource(root,'123',other.finalUrl,b.sourceDigest,'html',b.observationDigest)).toEqual(bytes);
 expect(readSupplementalSource(root,'123',other.finalUrl,a.sourceDigest,'html',a.observationDigest)).toBe(null);
});
it('rejects tampered observation records and cross-organization evidence',()=>{
 const a=recordSupplementalSource(root,'123',Buffer.from('<p>Original</p>'),observation);
 expect(readSupplementalSource(root,'456',observation.finalUrl,a.sourceDigest,'html',a.observationDigest)).toBe(null);
 const path=join(root,'supplemental','123','observations',a.observationDigest+'.json');
 writeFileSync(path,readFileSync(path,'utf8').replace('10:00','11:00'));
 expect(readSupplementalSource(root,'123',observation.finalUrl,a.sourceDigest,'html',a.observationDigest)).toBe(null);
});
it('refuses to replace modified content and rejects mislabeled PDF bytes',()=>{
 const a=recordSupplementalSource(root,'123',Buffer.from('<p>Original</p>'),observation);
 writeFileSync(join(root,'supplemental','123',a.sourceDigest+'.html'),'changed');
 expect(()=>recordSupplementalSource(root,'123',Buffer.from('<p>Original</p>'),observation)).toThrow();
 expect(()=>recordSupplementalSource(root,'123',Buffer.from('<html>Not PDF</html>'),{...observation,sourceKind:'original-http-pdf'})).toThrow();
});
function pdfContact(){
 const r=recordSupplementalSource(root,'123',Buffer.from('%PDF-1.4 test bytes'),{...observation,sourceKind:'original-http-pdf'});
 return {email:'anna@ort.de',url:observation.finalUrl,quote:'Klimaschutz Anna Beispiel anna@ort.de',sourcePdfDigest:r.sourceDigest,observationDigest:r.observationDigest,evidenceKind:'pdf-region' as const,page:1,region:[10,20,300,40] as [number,number,number,number],associationReason:'The reviewer read the named climate contact and address in this exact original table row.'};
}
it('validates the explicit PDF row from original bytes, not supplied extracted text',()=>{
 const c=pdfContact();vi.mocked(execFileSync).mockReturnValue(c.quote);
 expect(reviewContactSupported(root,'123',[],c)).toBe(true);
 expect(vi.mocked(execFileSync).mock.calls[0][1]).toContain('-x');
 expect(reviewContactSupported(root,'123',[],{...c,quote:'Invented person anna@ort.de'})).toBe(false);
 vi.mocked(execFileSync).mockReturnValue(c.quote+' another@ort.de');
 expect(reviewContactSupported(root,'123',[],c)).toBe(false);
});
it('leaves missing parser, unreadable scans, wrong rows and modified PDFs unresolved',()=>{
 const c=pdfContact();vi.mocked(execFileSync).mockImplementation(()=>{throw new Error('parser missing');});
 expect(reviewContactSupported(root,'123',[],c)).toBe(false);
 vi.mocked(execFileSync).mockReturnValue('');expect(reviewContactSupported(root,'123',[],c)).toBe(false);
 vi.mocked(execFileSync).mockReturnValue(c.quote);expect(reviewContactSupported(root,'123',[],{...c,page:0})).toBe(false);
 writeFileSync(join(root,'supplemental','123',c.sourcePdfDigest+'.pdf'),'%PDF- altered');
 expect(reviewContactSupported(root,'123',[],c)).toBe(false);
});
