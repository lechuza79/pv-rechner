import { describe, expect, it } from "vitest";
import { anschriftSchluessel, besterBeleg, impressumBelegt, maildomain, marke, nameWoerter, registerKandidaten, standVon, suchanfrage, type Registerzeile } from "../windbetreiber";

// Imprint excerpts as fetched on 06.10.2026 — real text, shortened.
const IMPRESSUM = {
  windmanager: "Impressum wpd windmanager GmbH & Co. KG Stephanitorsbollwerk 3 (Haus LUV) 28217 Bremen Tel.: +49 (0)421 – 897660 – 0 Email: windmanager(at)wpd.de Handelsregister: AG Bremen, HRA 23471",
  alterric: "impressum herausgeber: alterric gmbh holzweg 87 26605 aurich deutschland telefon: +49 (0) 4941 936 33 00 e-mail: kontakt@alterric.com vertretungsberechtigte: dr. frank",
  enbw: "Impressum und Anbieterkennzeichnung Name und Anschrift: EnBW Energie Baden-Württemberg AG Durlacher Allee 93 76131 Karlsruhe Standort Konzernzentrale Sitz der Gesellschaft: Karlsruhe Amtsgericht Mannheim HRB 107956",
  mazars: "Impressum Forvis Mazars GmbH & Co. KG Wirtschaftsprüfungsgesellschaft Steuerberatungsgesellschaft Theodor-Stern-Kai 1 60596 Frankfurt am Main",
  northdata: "Impressum North Data GmbH Gerhard-Lenz-Straße 3 82049 Pullach im Isartal Geschäftsführer Dr. Tobias Schrödel Registergericht München HRB 225536",
};

const akteur = (Firmenname: string, Strasse: string, Hausnummer: string, Postleitzahl: string, Ort = "") =>
  ({ Firmenname, Strasse, Hausnummer, Postleitzahl, Ort });

describe("impressumBelegt — calibrated on the five hand-solved cases", () => {
  it("accepts a developer site for a project company at the developer's address (Alterric, 208 companies)", () => {
    const b = impressumBelegt(IMPRESSUM.alterric, akteur("Windpark GmbH ＆ Co. Kisselsheide KG", "Holzweg", "87", "26605"), "alterric.com");
    expect(b?.wie).toBe("anschrift");
  });

  it("accepts an address with an addition between number and postcode (windmanager)", () => {
    const b = impressumBelegt(IMPRESSUM.windmanager, akteur("Windpark Dahme-Zagelsdorf 4 GmbH ＆ Co. KG", "Stephanitorsbollwerk", "3", "28217"), "windmanager.de");
    expect(b?.wie).toBe("anschrift");
  });

  it("accepts a group subsidiary registered elsewhere only by its brand (EnBW)", () => {
    const b = impressumBelegt(IMPRESSUM.enbw, akteur("EnBW Windkraftprojekte GmbH", "Schelmenwasenstraße", "15", "70567"), "enbw.com");
    expect(b?.wie).toBe("marke");
  });

  it("rejects the auditing firm whose mailbox one of 115 Sehestedt companies used (Mazars)", () => {
    expect(impressumBelegt(IMPRESSUM.mazars, akteur("Windpark Freyenstein-Halenbeck GmbH ＆ Co. KG", "Windmühlenberg", "", "24814"), "forvismazars.com")).toBeNull();
  });

  it("rejects a directory: the check reads the IMPRINT of the found domain, and that names the directory", () => {
    // The search hit is northdata's profile page, which does carry the
    // operator's name — that is why the profile page is never what we check.
    const a = akteur("Windpark Freyenstein-Halenbeck GmbH ＆ Co. KG", "Windmühlenberg", "", "24814");
    expect(impressumBelegt(IMPRESSUM.northdata, a, "northdata.de")).toBeNull();
  });

  it("does not let the brand pass without the domain carrying it", () => {
    expect(impressumBelegt(IMPRESSUM.enbw, akteur("EnBW Windkraftprojekte GmbH", "Schelmenwasenstraße", "15", "70567"), "northdata.de")).toBeNull();
  });

  it("does not let a generic first word act as a brand", () => {
    // "Windpark" stands in every second imprint of this market.
    expect(marke("Windpark Kisselsheide GmbH ＆ Co. KG")).toBe("kisselsheide");
    expect(marke("Bürgerwindpark Eider GmbH ＆ Co. KG")).toBe("eider");
    expect(marke("46. WestWind Windpark GmbH ＆ Co. KG")).toBe("westwind");
    expect(marke("WEA III GmbH")).toBeNull();
  });

  it("does not take a postcode alone as the address", () => {
    const anderswo = "Impressum Muster Solar GmbH Hauptstraße 1 26605 Aurich";
    expect(impressumBelegt(anderswo, akteur("Windpark GmbH ＆ Co. Kisselsheide KG", "Holzweg", "87", "26605"), "muster-solar.de")).toBeNull();
  });

  it("does not take the street without its number — a long street has many companies", () => {
    const anderswo = "Impressum Muster Solar GmbH Holzweg 12 26605 Aurich";
    expect(impressumBelegt(anderswo, akteur("Windpark GmbH ＆ Co. Kisselsheide KG", "Holzweg", "87", "26605"), "muster-solar.de")).toBeNull();
  });

  it("does not accept a one-word name — it would match every page that mentions the word", () => {
    const fremd = "Impressum Elektro Meier GmbH Lindenweg 4 49733 Haren. Wir planen Windkraft und Photovoltaik.";
    expect(impressumBelegt(fremd, akteur("Windkraft GmbH", "Am Deich", "2", "26831"), "elektro-meier.de")).toBeNull();
  });

  it("accepts a park with its own site by its full name", () => {
    const eigen = "Impressum Bürgerwindpark Eider GmbH & Co. KG Mittelstraße 2 25779 Hennstedt Geschäftsführung: …";
    expect(impressumBelegt(eigen, akteur("Bürgerwindpark Eider GmbH ＆ Co. KG", "Rathausplatz", "1", "25779"), "bwp-eider.de")?.wie).toBe("name");
  });
});

describe("helpers", () => {
  it("drops the legal form and the register's fullwidth ampersand", () => {
    expect(nameWoerter("Alterric Windpark Essel GmbH ＆ Co. KG")).toEqual(["alterric", "windpark", "essel"]);
    expect(nameWoerter("UG (haftungsbeschränkt) & Co. KG Windkraft Süd")).toEqual(["windkraft", "sued"]);
  });

  it("builds an address key that ignores the spelling of 'Straße'", () => {
    const a = anschriftSchluessel({ Strasse: "Schelmenwasenstraße", Hausnummer: "15", Postleitzahl: "70567" });
    const b = anschriftSchluessel({ Strasse: "Schelmenwasenstr.", Hausnummer: "15", Postleitzahl: "70567" });
    expect(a).toBe(b);
    expect(anschriftSchluessel({ Strasse: "", Postleitzahl: "70567" })).toBeNull();
  });

  it("searches without the legal form — with it the search returned nothing", () => {
    expect(suchanfrage({ Firmenname: "Bürgerwindpark Eider GmbH ＆ Co. KG", Ort: "Hennstedt" })).toBe("buergerwindpark eider Hennstedt");
  });

  it("keeps 'not yet looked at' apart from 'looked, nothing found'", () => {
    const leer = { website_beleg: null, register_email: null, register_telefon: null, gesucht_am: null };
    expect(standVon(leer)).toBe("offen");
    expect(standVon({ ...leer, gesucht_am: "2026-10-06" })).toBe("keine-website");
    expect(standVon({ ...leer, gesucht_am: "2026-10-06", register_telefon: "+49 1" })).toBe("nur-register");
    expect(standVon({ ...leer, website_beleg: "anschrift" })).toBe("website-belegt");
  });
});

describe("candidates from the register", () => {
  const zeile = (mastr_nr: string, name: string, strasse: string, hausnummer: string, plz: string, register_webseite: string | null, register_email: string | null): Registerzeile =>
    ({ mastr_nr, name, strasse, hausnummer, plz, register_webseite, register_email });

  it("never offers a free-mail provider as a website", () => {
    expect(maildomain("hans.meier@gmx.de")).toBeNull();
    expect(maildomain("info@t-online.de")).toBeNull();
    expect(maildomain("marktstammdatenregister@alterric.com")).toBe("alterric.com");
    expect(maildomain(null)).toBeNull();
  });

  it("offers the operator's own website and mailbox first, then what address mates use", () => {
    // Sehestedt: 115 companies at one address, one of them with an auditor's mailbox.
    const eigen = zeile("ABR1", "GREE Damsdorf GmbH ＆ Co. KG", "Windmühlenberg", "", "24814", null, null);
    const nachbar = zeile("ABR2", "Windpark Freyenstein-Halenbeck GmbH ＆ Co. KG", "Windmühlenberg", "", "24814", null, "adem.bilir@mazars.de");
    const fremd = zeile("ABR3", "Anderer Windpark GmbH", "Hauptstraße", "1", "24814", "https://anderer.de", null);
    const nachAnschrift = new Map<string, Registerzeile[]>();
    for (const z of [eigen, nachbar, fremd]) {
      const key = anschriftSchluessel({ Strasse: z.strasse ?? "", Hausnummer: z.hausnummer ?? "", Postleitzahl: z.plz ?? "" })!;
      nachAnschrift.set(key, [...(nachAnschrift.get(key) ?? []), z]);
    }
    // The auditor's domain is offered — as a suggestion only; the imprint decides.
    expect(registerKandidaten(eigen, nachAnschrift)).toEqual([{ domain: "mazars.de", quelle: "anschrift" }]);
    // Another street at the same postcode is not an address mate.
    expect(registerKandidaten(eigen, nachAnschrift).some((c) => c.domain === "anderer.de")).toBe(false);
  });

  it("offers both domains of a project company that names its parent and its manager", () => {
    // windmanager.de as website, wpd.de as mailbox — measured on 13 Görike turbines.
    const z = zeile("ABR9", "Windpark Görike/Söllenthin GmbH ＆ Co. KG", "Stephanitorsbollwerk", "3", "28217", "http://www.windmanager.de/", "tmverwaltung-wm@wpd.de");
    expect(registerKandidaten(z, new Map())).toEqual([
      { domain: "windmanager.de", quelle: "register-webseite" },
      { domain: "wpd.de", quelle: "register-mail" },
    ]);
  });

  it("prefers what the operator told the register over a stronger proof found elsewhere", () => {
    const p = (domain: string, quelle: "register-mail" | "suche", wie: "name" | "anschrift") =>
      ({ ergebnis: "belegt", kandidat: { domain, quelle }, beleg: { wie, textstelle: "" } });
    expect(besterBeleg([p("gefunden.de", "suche", "name"), p("eigen.de", "register-mail", "anschrift")])?.kandidat.domain).toBe("eigen.de");
    expect(besterBeleg([{ ergebnis: "abgelehnt", kandidat: { domain: "x.de", quelle: "suche" as const }, beleg: null }])).toBeNull();
  });
});
