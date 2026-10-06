import { describe, expect, it } from "vitest";
import { deflateRawSync, gzipSync } from "node:zlib";
import { beurteile, entpacke, istAuffaellig, istDmarcBericht, leseBericht } from "../dmarc-bericht";

const zeile = (ip: string, n: number, dkim: string, spf: string, disp = "none") => `
  <record><row><source_ip>${ip}</source_ip><count>${n}</count>
    <policy_evaluated><disposition>${disp}</disposition><dkim>${dkim}</dkim><spf>${spf}</spf></policy_evaluated></row>
    <identifiers><header_from>solar-check.io</header_from></identifiers></record>`;

const xml = (zeilen: string, org = "google.com") => `<?xml version="1.0"?><feedback>
  <report_metadata><org_name>${org}</org_name><date_range><begin>1790640000</begin><end>1790726399</end></date_range></report_metadata>
  <policy_published><domain>solar-check.io</domain><p>none</p></policy_published>${zeilen}</feedback>`;

/** Minimal single-file zip, the form Google and Microsoft send. */
function zip(name: string, inhalt: string): Buffer {
  const daten = deflateRawSync(Buffer.from(inhalt));
  const kopf = Buffer.alloc(30);
  kopf.writeUInt32LE(0x04034b50, 0);
  kopf.writeUInt16LE(8, 8);
  kopf.writeUInt32LE(daten.length, 18);
  kopf.writeUInt32LE(inhalt.length, 22);
  kopf.writeUInt16LE(name.length, 26);
  return Buffer.concat([kopf, Buffer.from(name), daten]);
}

describe("DMARC-Berichte", () => {
  const x = xml(zeile("85.13.142.192", 40, "pass", "pass") + zeile("1.2.3.4", 2, "fail", "fail"));

  it("entpackt xml, gz und zip gleich", () => {
    expect(entpacke("r.xml", Buffer.from(x))).toBe(x);
    expect(entpacke("r.xml.gz", gzipSync(x))).toBe(x);
    expect(entpacke("google.com!solar-check.io!1!2.zip", zip("r.xml", x))).toBe(x);
    expect(entpacke("r.pdf", Buffer.from(x))).toBeNull();
  });

  it("liest Domain, Zeitraum, Absender und Zeilen", () => {
    const b = leseBericht(x)!;
    expect(b.domain).toBe("solar-check.io");
    expect(b.absender).toBe("google.com");
    expect(b.beginn).toBe("2026-09-29");
    expect(b.zeilen).toHaveLength(2);
    expect(b.zeilen[0]).toMatchObject({ ip: "85.13.142.192", anzahl: 40, dkim: "pass" });
  });

  it("zählt eine Mail als bestanden, wenn EINE ausgerichtete Prüfung besteht", () => {
    const u = beurteile([leseBericht(xml(zeile("a", 5, "pass", "fail") + zeile("b", 5, "fail", "pass")))!])[0];
    expect(u.durchgefallen).toBe(0);
  });

  it("wertet vereinzelte Fremde als Hintergrund, nicht als Befund", () => {
    const u = beurteile([leseBericht(x)!])[0];
    expect(u).toMatchObject({ mails: 42, durchgefallen: 2 });
    expect(istAuffaellig(u)).toBe(false);
  });

  it("schlägt an, wenn ein nennenswerter Anteil durchfällt — über alle Berichte eines Tages", () => {
    const a = leseBericht(xml(zeile("85.13.142.192", 20, "pass", "pass")))!;
    const b = leseBericht(xml(zeile("85.13.142.192", 10, "fail", "fail", "reject"), "web.de"))!;
    const u = beurteile([a, b])[0];
    expect(u).toMatchObject({ mails: 30, durchgefallen: 10, abgewiesen: 10 });
    expect(u.quellen[0]).toMatchObject({ ip: "85.13.142.192", anzahl: 10, absender: ["web.de"] });
    expect(istAuffaellig(u)).toBe(true);
  });

  it("erkennt Berichte am Betreff der großen Anbieter", () => {
    expect(istDmarcBericht("Report domain: life-is-a-binge.com Submitter: google.com Report-ID: 1")).toBe(true);
    expect(istDmarcBericht("Report Domain: solar-check.io Submitter: web.de Report-ID: x")).toBe(true);
    expect(istDmarcBericht("AW: Pressemitteilung")).toBe(false);
  });
});
