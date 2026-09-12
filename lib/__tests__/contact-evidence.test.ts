import { describe, it, expect } from "vitest";
import { contactCandidates, observedFields, chooseOwnedMailbox, confirmedContactPage } from "../contact-evidence";
import { personenAus } from "../personen-fund";
import { fetchContactPage } from "../../scripts/lib/contact-fetch";
import { readMail } from "../../scripts/lib/read-mail";
import { ordneEin } from "../outreach-ruecklauf";

describe("contact evidence counterexamples", () => {
  it("rejects a navigation-only contact hit and accepts an actual contact destination", () => {
    expect(confirmedContactPage('<title>Startseite</title><nav>Kontakt</nav><footer><a href="mailto:info@ort.de">Mail</a></footer>')).toBe(false);
    expect(confirmedContactPage('<title>Kontakt</title><h1>404 nicht gefunden</h1><a href="mailto:info@ort.de">Mail</a>')).toBe(false);
    expect(confirmedContactPage('<main><h1>Kontakt</h1><p><a href="mailto:info@ort.de">Rathaus</a></p></main>')).toBe(true);
  });
  it("keeps every address with a source and does not attribute foreign organizations", () => {
    const rows = contactCandidates('<p>Rathaus <a href="mailto:info@ort.de">Mail</a></p><p>Agentur <a href="mailto:info@agentur.de">Mail</a></p>', 'https://ort.de/kontakt', 'ort.de');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({email:'info@ort.de', relation:'same-domain', sourceUrl:'https://ort.de/kontakt'});
    expect(rows[1]).toMatchObject({email:'info@agentur.de', relation:'unconfirmed'});
  });
  it("does not choose foreign, lookalike or privacy addresses", () => {
    expect(chooseOwnedMailbox(['info@agentur.de','info@betrieb-agentur.de'], 'betrieb.de')).toBeNull();
    expect(chooseOwnedMailbox(['datenschutz@betrieb.de','info@betrieb.de'], 'betrieb.de')).toBe('info@betrieb.de');
  });
  it("does not confirm a different organization after a redirect", async () => {
    const response = new Response('<p>info@parking.de</p>', { headers: { 'content-type': 'text/html' } });
    Object.defineProperty(response, 'url', {value:'https://parking.de/'});
    const r = await fetchContactPage('https://ort.de/', {fetcher:async()=>response});
    expect(r.observation.candidates[0].relation).toBe('unconfirmed');
  });
  it("preserves old facts on empty observations", () => {
    expect({...{email:'info@ort.de', notes:'keep'}, ...observedFields({email:null, notes:undefined})}).toEqual({email:'info@ort.de',notes:'keep'});
  });
  it("finds the same person with reversed fields and a mailto-only address", () => {
    for (const html of ['<div>Anna Müller Geschäftsführerin anna.mueller@ort.de</div>', '<div>anna.mueller@ort.de Anna Müller Geschäftsführerin</div>', '<div>Anna Müller Geschäftsführerin <a href="mailto:anna.mueller@ort.de">Mail</a></div>']) {
      expect(personenAus(html)).toEqual(expect.arrayContaining([expect.objectContaining({name:'Anna Müller',mail:'anna.mueller@ort.de'})]));
    }
    expect(personenAus('<div><p>Anna Müller</p><p>Max Meyer max.meyer@ort.de</p></div>').some(p=>p.name==='Anna Müller')).toBe(false);
  });
  it("distinguishes blocked responses, failures and actual pages", async () => {
    for (const status of [403,429,503]) {
      const r = await fetchContactPage('https://ort.de', {fetcher:async()=>new Response('',{status})});
      expect(r.html).toBeNull(); expect(r.observation.status).toBe(status===503?'failed':'blocked');
    }
    const r = await fetchContactPage('https://ort.de', {fetcher:async()=>new Response('<title>Just a moment</title>',{headers:{'content-type':'text/html'}})});
    expect(r.observation.status).toBe('blocked');
  });
  it("decodes base64 replies and quoted-printable automatic messages", async () => {
    const base = 'From: rathaus@ort.de\r\nSubject: Antwort\r\nContent-Type: text/plain; charset=utf-8\r\n';
    const answer = await readMail(base+'Content-Transfer-Encoding: base64\r\n\r\n'+Buffer.from('Vielen Dank, wir veröffentlichen die Meldung.').toString('base64'));
    expect(answer.text).toContain('veröffentlichen'); expect(ordneEin(answer)).toBe('antwort');
    const auto = await readMail(base+'Content-Transfer-Encoding: quoted-printable\r\n\r\nBitte antworten Sie nicht auf diese E-Mail');
    expect(ordneEin(auto)).not.toBe('antwort');
  });
});
