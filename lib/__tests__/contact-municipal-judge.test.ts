import { describe, expect, it } from "vitest";
import { contactCandidates } from "../contact-evidence";
import { applyAdministration, consolidate, headingContext, judgeEvidence, selectAndCompare, type Municipality } from "../contact-municipal-judge";
import { parseGv100 } from "../gemeindeverband";
import { decodeLegacyTypo3Mailto, decodeRot13Address, deobfuscatePublishedMail, repairGluedAddress } from "../mail-deobfuscation";

const asOf = "2026-09-17T10:00:00Z";
const town = (website: string, extra: Partial<Municipality> = {}): Municipality => ({ ags: "01000000", name: "Town", website, ...extra });

function judgePage(html: string, url: string, m: Municipality, titles = new Map<string, string>()) {
  const context = headingContext(html);
  const evidence = contactCandidates(html, url, new URL(m.website!).hostname).map(c =>
    judgeEvidence(c, context.headings.get(c.email) ?? [], { url, digest: "d", valid: true }, m, asOf));
  titles.set(url, context.title);
  return consolidate(applyAdministration(evidence, titles, m));
}
const channelsOf = (mailboxes: ReturnType<typeof consolidate>, email: string) => mailboxes.find(x => x.email === email)?.channels ?? [];

describe("Municipal judgement: real positives the first review rejected", () => {
  it("accepts a department card on the own site without the literal 'Stadt X' (Itzehoe)", () => {
    const html = `<main><p>Frau Morgenstern Umweltabteilung - Klimaschutzmanagement, Wärmeplanung 04821 603-296 <a href="mailto:klimaschutz@itzehoe.de">klimaschutz@itzehoe.de</a></p></main>`;
    expect(channelsOf(judgePage(html, "https://www.itzehoe.de/rathaus/umwelt", town("https://www.itzehoe.de/")), "klimaschutz@itzehoe.de")).toEqual(["energy"]);
  });
  it("accepts a press spokesperson of a 'Landeshauptstadt' (Kiel)", () => {
    const html = `<main><div><p>Pressesprecherin der Landeshauptstadt Kiel, Kerstin Graupner Presse- und Öffentlichkeitsarbeit 0431 901-2406 <a href="mailto:presse@kiel.de">presse@kiel.de</a></p></div></main>`;
    expect(channelsOf(judgePage(html, "https://www.kiel.de/de/politik_verwaltung/service/x", town("https://www.kiel.de/")), "presse@kiel.de")).toEqual(["press"]);
  });
  it("reads the department heading above a personal address (Wolfsburg)", () => {
    const html = `<main><h2>Kontakt für Presse und Medien</h2><div><p><a href="mailto:kommunikation@stadt.wolfsburg.de">E-Mail an das Team</a></p></div></main>`;
    expect(channelsOf(judgePage(html, "https://www.wolfsburg.de/rathaus/pressekontakt", town("https://www.wolfsburg.de/")), "kommunikation@stadt.wolfsburg.de")).toEqual(["press"]);
  });
  it("accepts the institutional mail domain of the own site (Haan: haan.de / stadt-haan.de)", () => {
    const html = `<main><h2>Pressearbeit</h2><p>Kontakt: <a href="mailto:presse@stadt-haan.de">Presse@stadt-haan.de</a></p></main>`;
    expect(channelsOf(judgePage(html, "https://www.haan.de/Stadt-Rathaus/Pressestelle", town("https://www.haan.de/")), "presse@stadt-haan.de")).toEqual(["press"]);
  });
  it("accepts the official administration's site and mailbox for a member municipality (Nordpfälzer Land)", () => {
    const m = town("http://www.ruppertsecken.de", { verband: { ags: "07333065", name: "Ruppertsecken", population: 336, verbandKey: "073335305", verbandName: "Nordpfälzer Land", verbandType: "53", verbandMembers: 36 } });
    const html = `<html><head><title>Ansprechpartner | VG Nordpfälzerland</title></head><body><main><h2>Klimaschutzmanagement</h2><p>Herr Muster <a href="mailto:k.muster@vg-nl.de">k.muster@vg-nl.de</a></p><p><a href="mailto:a@vg-nl.de">a@vg-nl.de</a> <a href="mailto:b@vg-nl.de">b@vg-nl.de</a></p></main></body></html>`;
    const mailboxes = judgePage(html, "https://www.xn--nordpflzerland-bib.de/ansprechpartner/", m);
    const found = mailboxes.find(x => x.email === "k.muster@vg-nl.de")!;
    expect(found.channels).toEqual(["energy"]);
    expect(found.scope).toBe("shared-administration:Nordpfälzer Land");
  });
});

describe("Municipal judgement: real false positives found while piloting", () => {
  it("does not give a department heading to a block naming another unit (Wildeshausen, Bauhof)", () => {
    const html = `<main><h2>Klimaschutz</h2><p>Für technische Notfälle steht der Städtische Bauhof unter Tel. 04431-4311 oder <a href="mailto:bauhof@wildeshausen.de">bauhof@wildeshausen.de</a> zur Verfügung.</p></main>`;
    expect(channelsOf(judgePage(html, "https://www.wildeshausen.de/buergerservice/klimaschutz/", town("https://www.wildeshausen.de/")), "bauhof@wildeshausen.de")).toEqual([]);
  });
  it("never turns a general town hall mailbox into a press contact (Telgte, Köln)", () => {
    const html = `<main><h2>Presse Abwasserbetrieb</h2><p>Baßfeld 4-6 Telefon 02504 130 <a href="mailto:rathaus@telgte.de">rathaus@telgte.de</a> Kontakt Impressum Datenschutz</p></main>`;
    expect(channelsOf(judgePage(html, "https://www.telgte.de/rathaus/presse/", town("https://www.telgte.de/")), "rathaus@telgte.de")).toEqual([]);
  });
  it("ignores headings on news and event pages", () => {
    const html = `<main><h2>Pressestelle</h2><div><article><p><a href="mailto:m.muster@town.de">m.muster@town.de</a></p></article></div></main>`;
    expect(channelsOf(judgePage(html, "https://www.town.de/rathaus/pressestelle", town("https://www.town.de/")), "m.muster@town.de")).toEqual(["press"]);
    expect(channelsOf(judgePage(html, "https://www.town.de/aktuelles/meldung", town("https://www.town.de/")), "m.muster@town.de")).toEqual([]);
  });
  it("does not take a role from a list of sibling departments (Dreieich)", () => {
    const html = `<main><p>Infrastruktur und Umwelt Telefon 06103 601-479 E-Mail <a href="mailto:k.nauhardt@dreieich.de">k.nauhardt@dreieich.de</a> Zugehörige Abteilungen Umwelt- und Energiemanagement</p></main>`;
    expect(channelsOf(judgePage(html, "https://www.dreieich.de/abteilungen/infrastruktur", town("https://www.dreieich.de/")), "k.nauhardt@dreieich.de")).toEqual([]);
  });
  it("rejects a foreign site even with a perfect role card", () => {
    const html = `<main><p>Klimaschutzmanagerin <a href="mailto:x@town.de">x@town.de</a></p></main>`;
    expect(channelsOf(judgePage(html, "https://www.portal.example/town", town("https://www.town.de/")), "x@town.de")).toEqual([]);
  });
});

describe("Published address encodings", () => {
  it("decodes legacy TYPO3 link encryption (Frankenhardt)", () => {
    expect(decodeLegacyTypo3Mailto("ocknvq%2CkphqBhtcpmgpjctfv0fg")).toBe("mailto:info@frankenhardt.de");
    const html = `<p><a href="javascript:linkTo_UnCryptMailto(%27ocknvq%2CkphqBhtcpmgpjctfv0fg%27);">info(at)frankenhardt.de</a></p>`;
    expect(contactCandidates(html, "https://www.frankenhardt.de/", "frankenhardt.de").map(c => c.email)).toContain("info@frankenhardt.de");
  });
  it("decodes the ROT13 attribute and text scheme exactly once (Rettenbach/Offingen)", () => {
    expect(decodeRot13Address("xnffr[at]bssvatra.qr")).toBe("kasse@offingen.de");
    const html = deobfuscatePublishedMail(`<a href="javascript:;" data-enc-email="xnffr[at]bssvatra.qr" class="mail-link">x</a>`);
    expect(html).toContain('href="mailto:kasse@offingen.de"');
    expect(html).not.toContain("xnffr@bssvatra.qr");
  });
  it("leaves undecodable values untouched", () => {
    expect(decodeLegacyTypo3Mailto("%%%")).toBeNull();
    expect(decodeRot13Address("kein[at]adresse")).toBeNull();
  });
  it("repairs a glued label only when the repaired address is on the page (Kirchheimbolanden)", () => {
    const page = `<span>e-mail</span><a href="mailto:maximilian.eberle@kirchheimbolanden.de">maximilian.eberle@kirchheimbolanden.de</a>`;
    expect(repairGluedAddress("e-mailmaximilian.eberle@kirchheimbolanden.de", page)).toBe("maximilian.eberle@kirchheimbolanden.de");
    expect(repairGluedAddress("mailbox@town.de", "mailbox@town.de")).toBe("mailbox@town.de");
    expect(repairGluedAddress("emailservice@town.de", "service@other.de")).toBe("emailservice@town.de");
  });
});

describe("Official administrative association (GV100AD)", () => {
  it("reads membership per character position, including names with umlauts", () => {
    const pad = (s: string, n: number) => s.padEnd(n, " ");
    const verband = pad("50" + "20260831" + "07333" + "   " + "5305" + pad("Nordpfälzer Land", 50) + pad("Rockenhausen", 50) + "53", 220);
    const member = (code: string, name: string, pop: string) =>
      pad("60" + "20260831" + "07333" + code + "5305" + pad(name, 50) + pad("", 50) + "64" + "    " + "00000000500" + pop, 220);
    const data = parseGv100([verband, member("065", "Ruppertsecken", "00000000336"), member("066", "Nachbarort", "00000000100")].join("\r\n"));
    expect(data.get("07333065")).toMatchObject({ verbandName: "Nordpfälzer Land", verbandType: "53", verbandMembers: 2, population: 336 });
  });
});

describe("Old/new comparison", () => {
  const box = (email: string, extra: Partial<ReturnType<typeof consolidate>[number]> = {}) =>
    ({ email, strong: false, channels: [], general: /^info@|^rathaus@/.test(email), confirmedOnSite: true, unsuitable: false, scope: "municipality", proof: null, reasons: [], ...extra });
  it("an unprovable general mailbox never blocks a proven improvement (Flensburg)", () => {
    const r = selectAndCompare([box("stadtverwaltung@flensburg.de", { confirmedOnSite: false }), box("klimaschutz@flensburg.de", { channels: ["energy"] })], ["stadtverwaltung@flensburg.de"]);
    expect(r.verdict).toBe("better");
    expect(r.baselineStatus[0].status).toBe("not-attributable");
  });
  it("keeps a confirmed old contact as fallback next to new role contacts", () => {
    const r = selectAndCompare([box("info@town.de"), box("presse@town.de", { channels: ["press"] })], ["info@town.de"]);
    expect(r.selected).toEqual(["presse@town.de", "info@town.de"]);
    expect(r.outcome).toBe("one-channel");
  });
  it("never drops a proven old role contact, even when two newer ones exist", () => {
    const r = selectAndCompare([box("a.a@town.de", { channels: ["press"] }), box("presse@town.de", { channels: ["press"] }), box("pressestelle@town.de", { channels: ["press"] })], ["a.a@town.de"]);
    expect(r.selected).toContain("a.a@town.de");
    expect(r.verdict).toBe("equivalent");
  });
  it("names an unconfirmed old contact instead of calling it equivalent", () => {
    expect(selectAndCompare([box("rathaus@town.de")], ["alt@town.de"]).verdict).toBe("unresolved");
    expect(selectAndCompare([], []).reason).toBe("no contact in checked sources");
  });
});

describe("vCard directory entries", () => {
  it("turns a published vCard into one exclusive role card (Varel)", async () => {
    const { vcardToHtml } = await import("../mail-deobfuscation");
    const html = vcardToHtml("BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Anna Logemann\r\nORG:Stadt Varel;Sachgebiet Planung und Umwelt\r\nTITLE:Klimaschutzmanagerin\r\nEMAIL;TYPE=INTERNET:klimaschutz@varel.de\r\nEND:VCARD")!;
    expect(channelsOf(judgePage(html, "https://www.varel.de/x.vcf", town("https://www.varel.de/")), "klimaschutz@varel.de")).toEqual(["energy"]);
    expect(vcardToHtml("BEGIN:VCARD\r\nFN:Ohne Adresse\r\nEND:VCARD")).toBeNull();
  });
});

describe("Findings from the fresh sample", () => {
  it("does not treat a county or region publishing on the town portal as the town (Hannover)", () => {
    const html = `<main><p>Christian von Eichborn Pressesprecher <a href="mailto:c.eichborn@hannover-stadt.de">c.eichborn@hannover-stadt.de</a></p><p>Philipp Westphal Pressesprecher <a href="mailto:p.westphal@region-hannover.de">p.westphal@region-hannover.de</a></p><p><a href="mailto:a@region-hannover.de">a@region-hannover.de</a> <a href="mailto:b@region-hannover.de">b@region-hannover.de</a></p></main>`;
    const boxes = judgePage(html, "https://www.hannover.de/presse", town("https://www.hannover.de/"));
    expect(channelsOf(boxes, "c.eichborn@hannover-stadt.de")).toEqual(["press"]);
    expect(channelsOf(boxes, "p.westphal@region-hannover.de")).toEqual([]);
  });
  it("recognises 'Klimamanagement' (Paderborn) and symbol-encoded addresses (Kerpen)", () => {
    const html = `<main><p>Amt für Umweltschutz und Grünflächen Klimamanagement Telefon 88-0 Mail: <a href="mailto:klima@paderborn.de">klima@paderborn.de</a></p></main>`;
    expect(channelsOf(judgePage(html, "https://www.paderborn.de/klima", town("https://www.paderborn.de/")), "klima@paderborn.de")).toEqual(["energy"]);
    expect(deobfuscatePublishedMail(`<a href="mailto:presse%E2%9A%B9stadt-kerpen%E2%97%A6de">presse⚹stadt-kerpen◦de</a>`)).toBe(`<a href="mailto:presse@stadt-kerpen.de">presse@stadt-kerpen.de</a>`);
  });
  it("keeps the town hall mailbox usable next to agency credits in the imprint (Wipperfürth)", () => {
    const html = `<main><p>Hansestadt Wipperfürth Marktplatz 1 <a href="mailto:info@wipperfuerth.de">info@wipperfuerth.de</a> Webdesign: Agentur X</p></main>`;
    expect(judgePage(html, "https://www.wipperfuerth.de/impressum", town("https://www.wipperfuerth.de/")).find(x => x.email === "info@wipperfuerth.de")!.unsuitable).toBe(false);
  });
  it("prefers the person whose own title is the role (Bad Waldsee)", () => {
    const box = (email: string, strong: boolean) => ({ email, strong, channels: ["press" as const], general: false, confirmedOnSite: true, unsuitable: false, scope: "municipality", proof: null, reasons: [] });
    expect(selectAndCompare([box("i.sonntag@bad-waldsee.de", false), box("n.hauff@bad-waldsee.de", false), box("c.liebmann@bad-waldsee.de", true)], []).press[0]).toBe("c.liebmann@bad-waldsee.de");
  });
});
