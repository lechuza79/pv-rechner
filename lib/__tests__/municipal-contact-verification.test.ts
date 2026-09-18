import { expect, it } from "vitest";
import { contactCandidates } from "../contact-evidence";
import { municipalPageText, verifyMunicipalContacts, type MunicipalSource } from "../municipal-contact-verification";
const url="https://stadt.de/kontakt";
function source(html:string):MunicipalSource{return {url,finalUrl:url,observedAt:"2026-09-15",status:"read",error:null,htmlDigest:"digest",...municipalPageText(html),candidates:contactCandidates(html,url,"stadt.de")};}
function check(html:string,email="person@stadt.de") {return verifyMunicipalContacts({name:"Musterstadt",website:"https://stadt.de",emails:[email],asOf:"2026-09-15",sources:[source(html)]})[0];}
it("requires an explicit role on an exclusive contact card, not the mailbox name",()=>{
 expect(check('<title>Stadt Musterstadt</title><p><a href="mailto:klimaschutz@stadt.de">klimaschutz@stadt.de</a></p>',"klimaschutz@stadt.de").status).toBe("needs-review");
 expect(check('<title>Stadt Musterstadt</title><div>Klimaschutzmanagerin Frau Muster <a href="mailto:person@stadt.de">person@stadt.de</a></div>').status).toBe("source-supported");
});
it("does not borrow another persons responsibility or accept a different municipality",()=>{
 expect(check('<title>Stadt Musterstadt</title><section><div>Pressestelle <a href="mailto:presse@stadt.de">presse@stadt.de</a></div><div>Person <a href="mailto:person@stadt.de">person@stadt.de</a></div></section>').status).toBe("needs-review");
 expect(check('<title>Stadt Anderswo</title><div>Pressestelle <a href="mailto:person@stadt.de">person@stadt.de</a></div>').status).toBe("needs-review");
});
it("holds old projects, event-only mailboxes and recorded source conflicts",()=>{
 expect(check('<title>Stadt Musterstadt</title><div>Klimaschutzmanagerin Projekt 2019–2021 <a href="mailto:person@stadt.de">person@stadt.de</a></div>').status).toBe("needs-review");
 expect(check('<title>Stadt Musterstadt</title><div>Pressestelle Anmeldung Veranstaltung <a href="mailto:person@stadt.de">person@stadt.de</a></div>').status).toBe("needs-review");
 const s=source('<title>Stadt Musterstadt</title><div>Pressestelle <a href="mailto:person@stadt.de">person@stadt.de</a></div>');
 expect(verifyMunicipalContacts({name:"Musterstadt",website:"stadt.de",emails:["person@stadt.de"],asOf:"2026-09-15",sources:[s],heldEmails:["person@stadt.de"]})[0].status).toBe("needs-review");
});
it("keeps blocked evidence unknown and an outside publisher unconfirmed",()=>{
 const s=source('<title>Stadt Musterstadt</title><div>Pressestelle <a href="mailto:person@stadt.de">person@stadt.de</a></div>');
 s.finalUrl="https://fremd.de/kontakt";
 expect(verifyMunicipalContacts({name:"Musterstadt",website:"stadt.de",emails:["person@stadt.de"],asOf:"2026-09-15",sources:[s]})[0].status).toBe("needs-review");
 s.status="blocked";s.candidates=[];
 expect(verifyMunicipalContacts({name:"Musterstadt",website:"stadt.de",emails:["person@stadt.de"],asOf:"2026-09-15",sources:[s]})[0].reasons).toContain("unread-sources-no-negative-conclusion");
});
it("recognizes bulletin work without seniority and preserves fallback contacts",()=>{
 expect(check('<title>Stadt Musterstadt</title><div>Assistenz: Betreuung der Homepage <a href="mailto:person@stadt.de">person@stadt.de</a></div>').status).toBe("source-supported");
 expect(check('<title>Stadt Musterstadt</title><div>Gemeindeverwaltung Musterstadt <a href="mailto:person@stadt.de">person@stadt.de</a></div>').status).toBe("published-fallback");
});

it("preserves the boundary between document title and heading",()=>{
 expect(check('<title>Kontakt / Musterstadt</title><h1>Kontakt</h1><div>Pressestelle <a href="mailto:person@stadt.de">person@stadt.de</a></div>').status).toBe("source-supported");
});
