import {describe,expect,it} from 'vitest';
import {contactCandidates} from '../contact-evidence';
const filler='Published administrative responsibility. '.repeat(18);
const card=(email:string,role:string)=>`<div><div><h2>Employee</h2><div><div><a href="mailto:${email}">Email</a></div><h3>Office</h3><p>Town hall</p><h3>Duties</h3><p>${filler}${role}</p></div></div></div>`;
const extract=(html:string)=>contactCandidates(html,'https://example.de/contacts','example.de').find(c=>c.email==='first@example.de')!;
describe('long independently bounded contact cards',()=>{
 it('keeps duties within a repeated single-person card',()=>{
  const c=extract(`<main><div>${card('first@example.de','Presse- und Informationswesen')}${card('second@example.de','Payroll')}</div></main>`);
  expect([c.roleEvidence,...(c.additionalRoleEvidence??[])].some(e=>e?.text.includes('Presse- und Informationswesen'))).toBe(true);
 });
 it('never borrows the neighboring employee role',()=>{
  const c=extract(`<main><div>${card('first@example.de','Payroll')}${card('second@example.de','Presse- und Informationswesen')}</div></main>`);
  expect(JSON.stringify([c.roleEvidence,c.additionalRoleEvidence])).not.toContain('Presse- und Informationswesen');
 });
 it('does not treat a long single-address page as a contact card',()=>{
  const c=extract(`<main><div><a href="mailto:first@example.de">Email</a><p>${filler}Presse- und Informationswesen</p></div></main>`);
  expect(c.roleEvidence?.text??'').not.toContain('Presse- und Informationswesen');
 });
 it('does not borrow a neighboring heading around a short shared-contact block',()=>{
  const c=extract(`<div><h2>Presse- und Informationswesen</h2><div><a href="mailto:second@example.de">Email</a></div><div><a href="mailto:first@example.de">Email</a></div></div>`);
  expect(JSON.stringify([c.roleEvidence,c.additionalRoleEvidence])).not.toContain('Presse- und Informationswesen');
 });
 it('does not promote repeated event articles into personnel cards',()=>{
  const news=(email:string,title:string)=>`<div><h2>${title}</h2><p>${filler}Klimaschutz</p><p>Registration: <a href="mailto:${email}">Email</a></p></div>`;
  const c=extract(`<main>${news('first@example.de','Community walk')}${news('second@example.de','Photo competition')}</main>`);
  expect(JSON.stringify([c.roleEvidence,c.additionalRoleEvidence])).not.toContain('Klimaschutz');
 });
});
