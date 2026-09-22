import { describe, expect, it } from "vitest";
import { contactCandidates } from "../contact-evidence";
import { applyScope, consolidate, headingContext, judgeEvidence, selectAndCompare, type Rollenwerk, type ScopeRegeln } from "../kontakt-suche";

// Ein anderer Bestand als die Gemeinden: ein Handwerksbetrieb, gesucht wird der
// Vertrieb. Nichts an der Maschine ändert sich, nur dieses Werk.
const BETRIEB: Rollenwerk = {
  rollen: [{ kanal: "vertrieb", text: /vertrieb|verkauf|kundenberatung/iu, heading: /^(?:vertrieb|verkauf)$/iu }],
  eigenerTitel: /leit(?:ung|er\w*)|berater\w*|vertriebsleit\w*/iu,
  ausgeschlossen: /webdesign|agentur für/iu,
  fremdeEinheit: /lager|werkstatt|buchhaltung/iu,
  allgemein: /^(info|kontakt|office|mail)$/i,
  starkesPostfach: /vertrieb|verkauf/i,
};
const SCOPE: ScopeRegeln = { fremdeBehoerde: /kammer|innung/, eigenbetrieb: /shop|akademie/, namensvarianten: /gmbh|ag/ };
const asOf = "2026-09-20T10:00:00Z";

function pruefe(html: string, url: string, website: string, scope: ScopeRegeln = SCOPE) {
  const context = headingContext(html);
  const org = { id: "b1", name: "Muster Solar", website };
  const evidence = contactCandidates(html, url, new URL(website).hostname).map(c =>
    judgeEvidence(c, context.headings.get(c.email) ?? [], { url, digest: "d", valid: true }, org, asOf, BETRIEB));
  return consolidate(applyScope(evidence, new Map([[url, context.title]]), org, null, scope), BETRIEB);
}

describe("Kontaktsuche für einen anderen Bestand", () => {
  it("nimmt eine verwandte Firmendomain nur, wenn der Bestand es erlaubt", () => {
    const html = `<main><h1>Impressum</h1><p>Christian Spatz Bedachungen <a href="mailto:info@christian-spatz-bedachungen.de">info@christian-spatz-bedachungen.de</a></p></main>`;
    const url = "https://www.spatz-bedachungen.com/impressum/";
    const ohne = pruefe(html, url, "https://www.spatz-bedachungen.com/");
    expect(ohne.find(b => b.email === "info@christian-spatz-bedachungen.de")?.reasons).toContain("mailbox-foreign-domain");
    const mit = pruefe(html, url, "https://www.spatz-bedachungen.com/", { ...SCOPE, verwandteDomain: (d, o) => d.includes(o.split(".")[0]) });
    expect(mit.find(b => b.email === "info@christian-spatz-bedachungen.de")?.reasons).not.toContain("mailbox-foreign-domain");
  });
  it("nimmt ein Gratis-Postfach aus dem eigenen Impressum nur, wenn der Bestand es erlaubt", () => {
    const html = `<main><h1>Impressum</h1><p>Inhaber Alex Muster <a href="mailto:alex.muster@web.de">alex.muster@web.de</a></p></main>`;
    const url = "https://www.muster-solar.de/impressum/";
    const ohne = pruefe(html, url, "https://www.muster-solar.de/");
    expect(ohne.find(b => b.email === "alex.muster@web.de")?.reasons).toContain("mailbox-foreign-domain");
    const mit = pruefe(html, url, "https://www.muster-solar.de/", { ...SCOPE, gratisPostfachAuf: p => /impressum/.test(p) });
    expect(mit.find(b => b.email === "alex.muster@web.de")?.reasons).not.toContain("mailbox-foreign-domain");
    // Nur Gratis-Anbieter: eine Behörde im selben Impressum bleibt fremd.
    const behoerde = `<main><h1>Impressum</h1><p>Schlichtungsstelle Energie <a href="mailto:info@schlichtungsstelle-energie.de">info@schlichtungsstelle-energie.de</a></p></main>`;
    const b = pruefe(behoerde, url, "https://www.muster-solar.de/", { ...SCOPE, gratisPostfachAuf: p => /impressum/.test(p) });
    expect(b.find(x => x.email === "info@schlichtungsstelle-energie.de")?.reasons).toContain("mailbox-foreign-domain");
    // Auf einer beliebigen anderen Seite bleibt die fremde Domain fremd.
    const blog = pruefe(html, "https://www.muster-solar.de/blog/tipps", "https://www.muster-solar.de/", { ...SCOPE, gratisPostfachAuf: p => /impressum/.test(p) });
    expect(blog.find(b => b.email === "alex.muster@web.de")?.reasons).toContain("mailbox-foreign-domain");
  });

  it("belegt die konfigurierte Rolle und lässt alles andere liegen", () => {
    const html = `<main><p>Max Muster Vertriebsleiter <a href="mailto:m.muster@muster-solar.de">m.muster@muster-solar.de</a></p>
      <p>Anna Muster Buchhaltung <a href="mailto:a.muster@muster-solar.de">a.muster@muster-solar.de</a></p>
      <p><a href="mailto:info@muster-solar.de">info@muster-solar.de</a></p></main>`;
    const boxen = pruefe(html, "https://www.muster-solar.de/kontakt", "https://www.muster-solar.de/");
    expect(boxen.find(b => b.email === "m.muster@muster-solar.de")?.channels).toEqual(["vertrieb"]);
    expect(boxen.find(b => b.email === "a.muster@muster-solar.de")?.channels).toEqual([]);
    // Ein allgemeines Postfach bekommt nie eine Rolle, bleibt aber als Rückfall bestehen.
    expect(boxen.find(b => b.email === "info@muster-solar.de")?.general).toBe(true);
  });

  it("nimmt die Rolle aus der Überschrift, aber nicht bei einer fremden Einheit", () => {
    const mit = pruefe(`<main><h2>Vertrieb</h2><p>Max Muster <a href="mailto:max@muster-solar.de">max@muster-solar.de</a></p></main>`, "https://www.muster-solar.de/team", "https://www.muster-solar.de/");
    expect(mit[0].channels).toEqual(["vertrieb"]);
    const ohne = pruefe(`<main><h2>Vertrieb</h2><p>Max Muster Lager <a href="mailto:max@muster-solar.de">max@muster-solar.de</a></p></main>`, "https://www.muster-solar.de/team", "https://www.muster-solar.de/");
    expect(ohne[0].channels).toEqual([]);
  });

  it("vergleicht mit dem bisher bekannten Kontakt und verliert ihn nicht", () => {
    const boxen = pruefe(`<main><p>Max Muster Vertriebsleiter <a href="mailto:m.muster@muster-solar.de">m.muster@muster-solar.de</a></p><p><a href="mailto:info@muster-solar.de">info@muster-solar.de</a></p></main>`, "https://www.muster-solar.de/kontakt", "https://www.muster-solar.de/");
    const v = selectAndCompare(boxen, ["info@muster-solar.de"], BETRIEB);
    expect(v.proKanal.get("vertrieb")).toEqual(["m.muster@muster-solar.de"]);
    expect(v.selected).toContain("info@muster-solar.de");
    expect(v.verdict).toBe("better");
    expect(v.outcome).toBe("all-channels");
  });

  it("nennt einen Bestand ohne Fund ungeklärt statt ihn stillschweigend zu leeren", () => {
    const boxen = pruefe(`<main><p>Werkstatt <a href="mailto:werkstatt@muster-solar.de">werkstatt@muster-solar.de</a></p></main>`, "https://www.muster-solar.de/kontakt", "https://www.muster-solar.de/");
    const v = selectAndCompare(boxen, ["alt@muster-solar.de"], BETRIEB);
    expect(v.verdict).toBe("unresolved");
    expect(v.outcome).toBe("unresolved");
  });
});
