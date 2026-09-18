import { expect, it } from 'vitest';
import { contactCandidates } from '../contact-evidence';
import { assessContacts } from '../contact-quality';
import { verifyMunicipalContacts } from '../municipal-contact-verification';
import { reviewContactSupported } from '../../scripts/lib/municipal-review-evidence';
import { recordSupplementalSource } from '../../scripts/lib/contact-source-record';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = 'https://ort.de/kontakt';
const html = '<h1>Gemeinde Ort</h1><p>Pressestelle <a href="mailto:presse@ort.de">presse@orrt.de</a></p><p>Pressestelle presse@ort.de</p>';
it('preserves both published addresses and flags their link-label disagreement', () => {
  const candidates = contactCandidates(html, url, 'ort.de');
  expect(candidates.map(c => c.email).sort()).toEqual(['presse@orrt.de', 'presse@ort.de']);
  for (const c of candidates) expect(c.sourceConflicts).toEqual([{ kind: 'mail-link-label-mismatch', linked: 'presse@ort.de', displayed: 'presse@orrt.de' }]);
});
it('quarantines conflicting evidence across all contact datasets and municipal checks', () => {
  const candidates = contactCandidates(html, url, 'ort.de');
  for (const dataset of ['kommunen', 'presse', 'fachbetriebe', 'versorger'] as const) {
    for (const c of assessContacts(candidates, dataset)) {
      expect(c.suitability).toBe('needs-review');
      expect(c.reviewReasons).toContain('mail-link-label-mismatch');
    }
  }
  const sources = [{url, finalUrl:url, observedAt:'2026-09-16T00:00:00Z', status:'read', htmlDigest:'original', pageIdentity:'Gemeinde Ort', bodyText:'', candidates, error:null}];
  expect(verifyMunicipalContacts({name:'Ort',website:url,emails:['presse@ort.de'],sources,asOf:'2026-09-16'})[0].status).toBe('needs-review');
  expect(reviewContactSupported('/unused','123',sources,{email:'presse@ort.de',url,quote:'Pressestelle presse@ort.de'})).toBe(false);
});
it('accepts matching obfuscated labels, case differences and subject parameters', () => {
  const clean = '<p>Pressestelle <a href="mailto:PRESSE%40ort.de?subject=Other%40example.org">presse (at) ort.de</a></p><p><a href="mailto:info@ort.de">Kontakt aufnehmen</a></p>';
  expect(contactCandidates(clean,url,'ort.de').every(c=>!c.sourceConflicts?.length)).toBe(true);
});
it('does not contaminate another address in the same page', () => {
  const candidates = contactCandidates(html+'<p>Klimaschutzmanagement <a href="mailto:klima@ort.de">klima@ort.de</a></p>',url,'ort.de');
  expect(candidates.find(c=>c.email==='klima@ort.de')?.sourceConflicts).toBeUndefined();
  expect(assessContacts(candidates,'kommunen').find(c=>c.email==='klima@ort.de')?.suitability).toBe('role-indicated');
});
it('requires an independent unambiguous original instead of bypassing a conflicting source through separate review', () => {
  const root=mkdtempSync(join(tmpdir(),'contact-conflict-'));
  try {
    const observation={url,finalUrl:url,observedAt:'2026-09-16T00:00:00Z',sourceKind:'original-http-html' as const};
    const bad=recordSupplementalSource(root,'123',Buffer.from(html),observation);
    const goodUrl='https://ort.de/impressum';
    const good=recordSupplementalSource(root,'123',Buffer.from('<h1>Gemeinde Ort</h1><p>Redaktionell verantwortlich ist die Pressestelle.</p><p>presse@ort.de</p>'),{...observation,url:goodUrl,finalUrl:goodUrl});
    const contact={email:'presse@ort.de',url,quote:'presse@ort.de',sourceHtmlDigest:bad.sourceDigest,observationDigest:bad.observationDigest,evidenceKind:'separately-reviewed' as const,roleSource:{url:goodUrl,sourceHtmlDigest:good.sourceDigest,observationDigest:good.observationDigest,quote:'Redaktionell verantwortlich ist die Pressestelle.'},associationReason:'The source identifies the editorial office and its published mailbox, independently reviewed.'};
    expect(reviewContactSupported(root,'123',[],contact)).toBe(false);
    expect(reviewContactSupported(root,'123',[],{...contact,url:goodUrl,sourceHtmlDigest:good.sourceDigest,observationDigest:good.observationDigest})).toBe(true);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
