import { describe, expect, it } from "vitest";
import { contactCandidates } from "../contact-evidence";
import { assessContacts, contactQuality } from "../contact-quality";
const assess = (html: string, dataset: "kommunen" | "fachbetriebe" | "presse" | "versorger" = "kommunen") => assessContacts(contactCandidates(html, "https://example.de/kontakt", "example.de"), dataset);
describe("contact role evidence", () => {
  it("associates a department heading within one contact card", () => {
    expect(assess('<section><h2>Klimaschutzmanagement</h2><p>Anna Muster</p><p><a href="mailto:anna@example.de">E-Mail</a></p></section>')[0]).toMatchObject({role:"climate-environment", suitability:"role-indicated"});
  });
  it("does not borrow a neighboring person's role or navigation label", () => {
    const html = '<nav>Klimaschutz</nav><main><section><h2>Klimaschutz</h2><p>anna@example.de</p></section><section><h2>Kasse</h2><p>bert@example.de</p></section></main>';
    expect(assess(html).find(c=>c.email==='bert@example.de')?.suitability).toBe('needs-review');
    expect(assess('<nav>Klimaschutz</nav><div><p>bert@example.de</p></div>')[0].suitability).toBe('needs-review');
  });
  it("does not assign one person's title across multiple email addresses", () => {
    expect(assess('<div><h2>Geschäftsführung</h2><p>anna@example.de</p><p>bert@example.de</p></div>', 'fachbetriebe').every(c=>c.suitability==='needs-review')).toBe(true);
  });
  it("recognizes communications without relying on the local part", () => {
    expect(assess('<section><h2>Presse und Marketing</h2><p>anna@example.de</p></section>', 'versorger')[0].suitability).toBe('role-indicated');
  });
  it("separates newsroom, advertising, utility press and network service", () => {
    expect(assess('<p>redaktion@example.de</p>', 'presse')[0].suitability).toBe('role-indicated');
    expect(assess('<p>presse@example.de</p>', 'presse')[0].suitability).toBe('needs-review');
    expect(assess('<section><h2>Anzeigenverkauf</h2><p>anna@example.de</p></section>', 'presse')[0].suitability).toBe('not-target-role');
    expect(assess('<section><h2>Netzanschluss</h2><p>anna@example.de</p></section>', 'versorger')[0].suitability).toBe('not-target-role');
  });
  it("keeps external domains unconfirmed even with an explicit role", () => {
    expect(assess('<p>Klimaschutz <a href="mailto:anna@other.de">Mail</a></p>')[0]).toMatchObject({role:'climate-environment',suitability:'needs-review',attribution:'unconfirmed'});
  });
  it("keeps conflicting responsibility open and rejects privacy", () => {
    expect(assess('<p>Redaktion und Anzeigenverkauf anna@example.de</p>', 'presse')[0].suitability).toBe('needs-review');
    expect(assess('<p>datenschutz@example.de</p>')[0].suitability).toBe('not-target-role');
  });
  it("preserves contradictory roles regardless of HTML order", () => {
    for (const pieces of [
      ['<section>Geschäftsführung anna@example.de</section>', '<section>Datenschutzbeauftragte anna@example.de</section>'],
      ['<section>Datenschutzbeauftragte anna@example.de</section>', '<section>Geschäftsführung anna@example.de</section>'],
    ]) expect(assess(pieces.join(''), 'fachbetriebe')[0].suitability).toBe('needs-review');
  });
  it("does not equate regulatory communication with outreach responsibility", () => {
    expect(assess('<p>Regulierungsmanagement Kommunikation Bundesnetzagentur anna@example.de</p>', 'versorger')[0].suitability).toBe('needs-review');
  });
  it("does not turn a statutory imprint representative into a direct contact", () => {
    const candidates = contactCandidates('<div>Firma GmbH Geschäftsführer Andreas Zender info@example.de</div>', 'https://example.de/impressum/', 'example.de');
    expect(assessContacts(candidates, 'fachbetriebe')[0].suitability).toBe('general-fallback');
  });
  it("never promotes an inferred role to confirmed responsibility", () => {
    const c = contactCandidates('<div>Klimaschutz Anna Müller Telefon 123 Hausmeister Max Schulz max@example.de</div>', 'https://example.de/kontakt', 'example.de');
    expect(contactQuality(c, 'kommunen').responsibilityVerification).toBe('review-required');
  });
  it("does not label supplier communication as public relations", () => {
    expect(assess('<p>Lieferantenmanagement Kommunikation Lieferanten netze@example.de</p>', 'versorger')[0].suitability).toBe('needs-review');
  });
  it("deduplicates emails without turning a generic address into completed research", () => {
    const c = contactCandidates('<p>info@example.de</p>', 'https://example.de', 'example.de');
    const quality = contactQuality([...c,...c], 'kommunen', ['budget-exhausted']);
    expect(quality.contacts).toHaveLength(1);
    expect(quality).toMatchObject({status:'general-only',completeness:'not-proven',deliverability:'not-tested'});
    expect(quality.gaps).toContain('target-role-not-established');
    expect(quality.gaps).toContain('budget-exhausted');
  });
});
