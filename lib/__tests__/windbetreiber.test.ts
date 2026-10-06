import { describe, expect, it } from "vitest";
import { geschwisterWebsite, telefonIn, telefonKern, kernName, vollerNameIn, impressumHerkunft, abrufWiederholen, identifizierend, parkListe, anschriftSchluessel, besterBeleg, beurteilen, funktionsPostfach, ortsWoerterAus, trefferRelevant, zitatName, impressumBelegt, maildomain, marke, nameWoerter, registerKandidaten, standVon, suchanfrage, websiteHerkunft, type Registerzeile, type Kandidatenquelle, type Beleg } from "../windbetreiber";

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

  it("matches a foreign four-digit postcode, but only behind street and number", () => {
    const a = akteur("Hydrovind VI ApS", "Gammel Kirkevej", "16", "9530");
    expect(impressumBelegt("Contact Hydrema Gammel Kirkevej 16 DK-9530 Støvring Denmark", a, "hydrema.com")?.wie).toBe("anschrift");
    expect(impressumBelegt("Contact Hydrema Gammel Kirkevej 18 DK-9530 Støvring Denmark", a, "hydrema.com")).toBeNull();
  });

  it("keeps a trailing direction in the name core (Kattrepel-Nord is not Kattrepel)", () => {
    expect(kernName(nameWoerter("Windpark Kattrepel-Nord GmbH & Co. KG"))).toEqual(["windpark", "kattrepel", "nord"]);
    expect(impressumBelegt("Projekte Windpark Kattrepel Erweiterung II vier Anlagen Denker & Wulf AG Windmühlenberg 24814 Sehestedt", akteur("Windpark Kattrepel-Nord GmbH & Co. KG", "Dorfstraße", "1", "25704"), "denkerwulf.de")).toBeNull();
  });

  it("never takes an ordinal or a city word as the brand (Vierte Volkswind, Green City)", () => {
    expect(marke("Vierte Volkswind GmbH & Co. KG")).toBe("volkswind");
    expect(marke("Fünfte Volkswind GmbH")).toBe("volkswind");
    expect(marke("Dreizehnten Windpark Musterhaus GmbH")).toBe("musterhaus");
    expect(impressumBelegt("Impressum ueber uns ueber Green City e.V. Lindwurmstraße 88 80337 München", akteur("Green City Energy Windpark Sindersdorf GmbH & Co. KG", "Zirkus-Krone-Straße", "10", "80335"), "greencity.de")).toBeNull();
  });

  it("matches a numberless register PLACE to the imprint's numbered one, and a mistyped ű (WEAG, Luymühle)", () => {
    const a = akteur("Eco-Mobilität GmbH", "Luymühle", "", "54347");
    expect(impressumBelegt("Impressum WEAG Future Energies AG Luyműhle 1 54347 Neumagen-Dhron", a, "weag-ag.de")?.wie).toBe("anschrift");
    // A street without a number would match every house on it.
    expect(impressumBelegt("Impressum Muster GmbH Hauptstraße 5 54347 Neumagen-Dhron", akteur("Eco-Mobilität GmbH", "Hauptstraße", "", "54347"), "x.de")).toBeNull();
    expect(impressumBelegt("Impressum Muster GmbH Luymühle 1 54348 Anderswo", a, "x.de")).toBeNull();
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
    expect(marke("PNE WIND Park Kührstedt-Alfstedt A")).toBe("pne");
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

  it("offers an address mate's PROVEN website, found by hand or machine (06.10.2026)", () => {
    const offen = zeile("ABR5", "WP10 GmbH & Co. KG", "Talmühle", "1", "74722", null, null);
    const belegt = { ...zeile("ABR6", "Windpark Altheimer Höhe GmbH & Co. KG", "Talmühle", "1", "74722", null, null), website: "windpark-altheim.de" };
    const key = anschriftSchluessel({ Strasse: "Talmühle", Hausnummer: "1", Postleitzahl: "74722" })!;
    expect(registerKandidaten(offen, new Map([[key, [offen, belegt]]]))).toEqual([{ domain: "windpark-altheim.de", quelle: "anschrift" }]);
  });

  it("offers both domains of a project company that names its parent and its manager", () => {
    // windmanager.de as website, wpd.de as mailbox — measured on 13 Görike turbines.
    const z = zeile("ABR9", "Windpark Görike/Söllenthin GmbH ＆ Co. KG", "Stephanitorsbollwerk", "3", "28217", "http://www.windmanager.de/", "tmverwaltung-wm@wpd.de");
    expect(registerKandidaten(z, new Map())).toEqual([
      { domain: "windmanager.de", quelle: "register-webseite" },
      { domain: "wpd.de", quelle: "register-mail", postfach: "tmverwaltung-wm@wpd.de" },
    ]);
  });

  it("prefers what the operator told the register over a stronger proof found elsewhere", () => {
    const p = (domain: string, quelle: "register-mail" | "suche", wie: "name" | "anschrift") =>
      ({ ergebnis: "belegt", kandidat: { domain, quelle }, beleg: { wie, textstelle: "" } });
    expect(besterBeleg([p("gefunden.de", "suche", "name"), p("eigen.de", "register-mail", "anschrift")])?.kandidat.domain).toBe("eigen.de");
    expect(besterBeleg([{ ergebnis: "abgelehnt", kandidat: { domain: "x.de", quelle: "suche" as const }, beleg: null }])).toBeNull();
  });
});

describe("Fehlerklassen der ersten Stichprobe (06.10.2026)", () => {
  it("normalises 'Straße' on the imprint side too — every '…straße' address failed", () => {
    const imp = "Impressum PNE AG Otto-Hahn-Straße 12 - 16 25813 Husum Vorstand: …";
    expect(impressumBelegt(imp, akteur("PNE WIND Park Kührstedt-Alfstedt A", "Otto-Hahn-Straße", "12-16", "25813"), "pne-ag.com")?.wie).toBe("anschrift");
    const kurz = "Impressum enercity Erneuerbare GmbH Nessestr. 24 26789 Leer";
    expect(impressumBelegt(kurz, akteur("Windpark Sögel III GmbH & Co. KG", "Nessestraße", "24", "26789"), "enercity-erneuerbare.de")?.wie).toBe("anschrift");
  });

  it("accepts a three-letter brand only where the domain starts with it", () => {
    const imp = "Impressum PNE AG Peter-Henlein-Str. 2-4 27472 Cuxhaven";
    const a = akteur("PNE WIND Park Kührstedt-Alfstedt A", "Irgendwo", "1", "99999");
    expect(impressumBelegt(imp, a, "pne-ag.com")?.wie).toBe("marke");
    // "pne" inside another word of a domain is not the brand.
    expect("alpnergie".includes("pne")).toBe(true); // the example must really contain it
    expect(impressumBelegt("Impressum Alpnergie GmbH, Partner der PNE AG", a, "alpnergie.de")).toBeNull();
  });

  it("accepts the website the operator itself declared to the register, if it exists", () => {
    // Bunder Windloopers declared enova.de; ENOVA's imprint names another address.
    const a = akteur("Bunder Windloopers GmbH & Co. KG", "Charlottenpolder", "8", "26831");
    const imp = "Impressum ENOVA Energiesysteme GmbH Steinhausstraße 112 26831 Bunderhee";
    expect(beurteilen(a, "enova.de", "register-webseite", { impressum: imp, startseite: "ENOVA" }).beleg?.wie).toBe("register");
    // A declared PERSONAL mailbox is not enough: one company declared its auditor's.
    expect(beurteilen(a, "mazars.de", "register-mail", { impressum: imp, startseite: "x" }, "adem.bilir@mazars.de").ergebnis).toBe("abgelehnt");
    // A FUNCTION mailbox is the operator's own statement where it is administered.
    expect(beurteilen(a, "wpd.de", "register-mail", { impressum: imp, startseite: "x" }, "tmverwaltung-wm@wpd.de").beleg?.wie).toBe("register");
    expect(beurteilen(a, "wpd.de", "register-mail", { impressum: imp, startseite: "x" }).ergebnis).toBe("abgelehnt");
  });

  it("accepts the register mailbox's domain when the register telephone stands in its own imprint", () => {
    const a = akteur("WPON GmbH & Co. KG", "VOSSKO-Allee", "1", "48346");
    const imp = "Impressum WI Windinvest GmbH Windenergie Am Markt 4 48727 Billerbeck Telefon: 0163 / 537 58 03 E-Mail ok@windinvest.de";
    expect(beurteilen(a, "windinvest.de", "register-mail", { impressum: imp, startseite: "x" }, "ok@windinvest.de", undefined, "+49 163 5375803").beleg?.wie).toBe("telefon");
    // Another number, a mailbox elsewhere, or an adviser's office: nothing.
    expect(beurteilen(a, "windinvest.de", "register-mail", { impressum: imp, startseite: "x" }, "ok@windinvest.de", undefined, "0163 5375804").ergebnis).toBe("abgelehnt");
    expect(beurteilen(a, "windinvest.de", "manuell", { impressum: imp, startseite: "x" }, "ok@andere.de", undefined, "0163 5375803").ergebnis).toBe("abgelehnt");
    const mazars = "Impressum Forvis Mazars GmbH & Co. KG Wirtschaftsprüfungsgesellschaft Steuerberatungsgesellschaft Tel. 040 288010";
    expect(beurteilen(a, "mazars.de", "register-mail", { impressum: mazars, startseite: "x" }, "adem.bilir@mazars.de", undefined, "040 288010").ergebnis).toBe("abgelehnt");
    // The owner's business outside energy is not the operator's website.
    const spedition = "Impressum Tebbe Spedition GmbH Transporte Logistik Tel. 05451 94640";
    expect(beurteilen(a, "tebbe-spedition.de", "register-mail", { impressum: spedition, startseite: "Spedition" }, "m.tebbe@tebbe-spedition.de", undefined, "0545194640").ergebnis).toBe("abgelehnt");
    // A proof by register data never displaces a site that names the operator.
    const p = (domain: string, quelle: Kandidatenquelle, wie: Beleg["wie"]) => ({ ergebnis: "belegt", kandidat: { domain, quelle }, beleg: { wie, textstelle: "" } });
    expect(besterBeleg([p("nttb-gmbh.de", "register-mail", "telefon"), p("dhsv-dithmarschen.de", "anschrift", "name")])?.kandidat.domain).toBe("dhsv-dithmarschen.de");
    expect(marke("Bürgerwindpark Mittelholstein GmbH & Co. KG")).toBeNull();
    // A number too short to identify anyone proves nothing.
    expect(telefonIn("Tel. 1234 56", "123456")).toBe(false);
    expect(telefonKern("+49 (0) 4841-9813")).toBe("48419813");
  });

  it("tells a function mailbox from a person's", () => {
    expect(funktionsPostfach("tmverwaltung-wm@wpd.de")).toBe(true);
    expect(funktionsPostfach("marktstammdatenregister@alterric.com")).toBe(true);
    expect(funktionsPostfach("info@windpark-x.de")).toBe(true);
    expect(funktionsPostfach("beteiligung@uka-gruppe.de")).toBe(true);
    expect(funktionsPostfach("leitwarte@rez-windparks.de")).toBe(true);
    expect(funktionsPostfach("nttb@nttb-gmbh.de")).toBe(true);
    expect(funktionsPostfach("adem.bilir@mazars.de")).toBe(false);
    expect(funktionsPostfach("michael.scholz@enervest.eu")).toBe(false);
    expect(funktionsPostfach("nohme@nttb-gmbh.de")).toBe(false);
    expect(funktionsPostfach("j.mueller@steuerbuero.de")).toBe(false);
    expect(funktionsPostfach(null)).toBe(false);
  });

  it("does not trust a declared website that is now parked or for sale", () => {
    const a = akteur("Windpark Beispiel GmbH & Co. KG", "Weg", "1", "12345");
    expect(beurteilen(a, "pv4ol.de", "register-webseite", { impressum: null, startseite: "Diese Domain kann gekauft werden. Jetzt bei Sedo anfragen." }).ergebnis).toBe("geparkt");
  });

  it("lets a foreign group without an 'Impressum' prove itself by brand on its start page — never by an address there", () => {
    const a = akteur("European Energy Windpark Oyten GmbH & Co. KG", "Stahltwiete", "21a", "22761");
    expect(beurteilen(a, "europeanenergy.com", "anschrift", { impressum: null, startseite: "European Energy is a global pioneer within renewable energy" }).ergebnis).toBe("belegt");
    // A directory start page listing the same address does not count.
    const b = akteur("Windkraft Musterhausen GmbH & Co. KG", "Stahltwiete", "21a", "22761");
    expect(beurteilen(b, "firmen-verzeichnis.de", "suche", { impressum: null, startseite: "Firmen in Stahltwiete 21a 22761 Hamburg" }).ergebnis).toBe("kein-impressum");
  });

  it("calls a link official only when the register led there AND the text confirms it", () => {
    expect(websiteHerkunft("anschrift", "anschrift")).toBe("amtlich");
    expect(websiteHerkunft("register-webseite", "register")).toBe("amtlich");
    expect(websiteHerkunft("register-mail", "marke")).toBe("suche");
    expect(websiteHerkunft("suche", "name")).toBe("suche");
  });
});

describe("search hits worth fetching", () => {
  it("fetches only hits that carry a distinguishing word of the operator", () => {
    // Real hits from the calibration searches.
    expect(trefferRelevant({ url: "https://www.enbw.com/presse/baustart-windpark-steinheim.html", titel: "Baustart für den Windpark Steinheim" }, "EnBW Windkraftprojekte GmbH")).toBe(true);
    expect(trefferRelevant({ url: "https://www.bwe-seminare.de/referenten-siegfried-grochow", titel: "Siegfried Grochow G-VEFK bei Alterric Deutschland GmbH" }, "Bürgerwindpark Eider GmbH ＆ Co. KG")).toBe(false);
    expect(trefferRelevant({ url: "https://www.stepstone.de/jobs/windkraft", titel: "Jobs Windpark Windkraft" }, "Windpark GmbH ＆ Co. Kisselsheide KG")).toBe(false);
    // A directory passes the filter — the imprint stops it later.
    expect(trefferRelevant({ url: "https://www.northdata.de/Windpark%20Werder%20Zinndorf", titel: "Windpark Werder Zinndorf GmbH & Co. KG, Sehestedt" }, "Windpark Werder Zinndorf GmbH ＆ Co. KG")).toBe(true);
  });

  it("finds nothing worth fetching for a name made only of generic words", () => {
    expect(trefferRelevant({ url: "https://windpark.de", titel: "Windpark" }, "Windpark GmbH & Co. KG")).toBe(false);
  });
});

describe("the quoted search name", () => {
  it("cuts at a word, not at letters", () => {
    expect(zitatName("Windpark Cottbuser Halde GmbH ＆ Co. KG")).toBe("Windpark Cottbuser Halde");
    expect(zitatName("BOREAS Energie GmbH")).toBe("BOREAS Energie");
    expect(zitatName("Windkraft Köpnick & Partner oHG")).toBe("Windkraft Köpnick");
  });

  it("keeps the distinguishing part when it stands after the legal form", () => {
    expect(zitatName("Windpark GmbH ＆ Co. Kisselsheide KG")).toBe("Windpark Kisselsheide");
  });
});

describe("a place is never a brand", () => {
  it("does not let a regional adjective prove a newspaper (Thüringer Becken → Thüringer Allgemeine)", () => {
    const a = akteur("Windfeld Thüringer Becken KH 56.1 GmbH & Co. KG", "Irgendwo", "1", "99999");
    expect(impressumBelegt("Impressum Thüringer Allgemeine Verlag GmbH Gottstedter Landstraße 6 99092 Erfurt", a, "thueringer-allgemeine.de")).toBeNull();
  });

  it("does not let a park named after its town prove the town's website", () => {
    const orte = ortsWoerterAus(["Hamburg", "Bad Dürkheim", "Neuhof"]);
    const a = akteur("Hamburg Windkraft GmbH & Co. KG", "Irgendwo", "1", "99999");
    const imp = "Impressum Freie und Hansestadt Hamburg Senatskanzlei Rathausmarkt 1 20095 Hamburg";
    expect(impressumBelegt(imp, a, "hamburg.de")?.wie).toBe("marke"); // without the register words…
    expect(impressumBelegt(imp, a, "hamburg.de", orte)).toBeNull(); // …and with them.
  });

  it("still lets a real brand through", () => {
    const orte = ortsWoerterAus(["Hamburg", "Stuttgart", "Karlsruhe"]);
    const imp = "Impressum EnBW Energie Baden-Württemberg AG Durlacher Allee 93 76131 Karlsruhe";
    expect(impressumBelegt(imp, akteur("EnBW Windkraftprojekte GmbH", "Schelmenwasenstraße", "15", "70567"), "enbw.com", orte)?.wie).toBe("marke");
  });

  it("takes no kind of company for a brand", () => {
    for (const n of ["WKA Musterfeld GmbH", "Stadtwerke Musterstadt GmbH", "Energiepark Nord GmbH", "Bürger Windpark GmbH", "Onshore Wind 2012 GmbH"]) {
      const m = marke(n);
      expect(["wka", "stadtwerke", "energiepark", "buerger", "onshore"]).not.toContain(m);
    }
  });
});

describe("a start page names parks it does not run (06.10.2026)", () => {
  const orte = ortsWoerterAus(["Reher", "Jevenstedt", "Karlum", "Klixbüll"]);
  const reher = akteur("Windpark Reher GmbH & Co. KG", "Irgendwo", "1", "25593");
  const kaatz = "Baubüro Kaatz Leistungsspektrum Über uns Team Aktuelle Projekte Referenzen Windpark Reher Windpark Jevenstedt Bürgerwindpark Karlum Windpark Klixbüll";

  it("does not give a park to the planning office that lists it as a reference", () => {
    expect(beurteilen(reher, "baubuero-kaatz.de", "suche", { impressum: null, startseite: kaatz }, null, orte).ergebnis).not.toBe("belegt");
  });

  it("needs a word that is neither a kind of company nor a place", () => {
    expect(identifizierend("Windpark Reher GmbH & Co. KG", orte)).toBe(false);
    expect(identifizierend("Windpark Kisselsheide GmbH & Co. KG", orte)).toBe(true);
  });

  it("knows a list of parks from a page about one", () => {
    expect(parkListe(kaatz, "Windpark Reher")).toBe(true);
    expect(parkListe("Willkommen beim Bürgerwindpark Kisselsheide. Unser Windpark Kisselsheide liefert Strom.", "Bürgerwindpark Kisselsheide")).toBe(false);
  });

  it("still lets a park's own start page prove it by an identifying name", () => {
    const a = akteur("Bürgerwindpark Kisselsheide GmbH & Co. KG", "Irgendwo", "1", "25593");
    expect(beurteilen(a, "kisselsheide.de", "suche", { impressum: null, startseite: "Willkommen beim Bürgerwindpark Kisselsheide — unser Windpark liefert Strom" }, null, orte).ergebnis).toBe("belegt");
  });
});

describe("a brand needs an energy site", () => {
  it("does not give a wind operator to an aircraft maker of the same name", () => {
    const a = akteur("Cirrus GmbH & Co. KG", "Am Feld", "1", "26831");
    // Real text from the cached page: code with "window", and a turbine jet.
    const imp = "privacy@cirrusaircraft.com const mediaquery = window.matchmedia('(max-width: 992px)'); Terms of use Cirrus Aircraft";
    const start = "the history-making, best-selling turbine jet unlocks your time, productivity and amenities";
    expect(beurteilen(a, "cirrusaircraft.com", "suche", { impressum: imp, startseite: start }).ergebnis).not.toBe("belegt");
  });

  it("still lets an energy company's brand through", () => {
    const a = akteur("EnBW Windkraftprojekte GmbH", "Schelmenwasenstraße", "15", "70567");
    const imp = "Impressum EnBW Energie Baden-Württemberg AG Durlacher Allee 93 76131 Karlsruhe";
    expect(beurteilen(a, "enbw.com", "suche", { impressum: imp, startseite: null }).beleg?.wie).toBe("marke");
  });
});

describe("a failed attempt is no answer about the site (06.10.2026)", () => {
  const jetzt = Date.parse("2026-10-06T20:00:00Z");
  const fehl = (fehler: string, versuche = 1, vor = 2 * 3_600_000) => ({ text: null, startText: null, fehler, abgerufen_am: new Date(jetzt - vor).toISOString(), versuche });
  it("tries a timeout, a server error and an empty answer again", () => {
    for (const f of ["Abruf fehlgeschlagen (UND_ERR_CONNECT_TIMEOUT)", "Seite antwortet mit HTTP 503", "leere Seite", "Abruf fehlgeschlagen (fetch failed)"]) expect(abrufWiederholen(fehl(f), jetzt), f).toBe(true);
  });
  it("keeps an answer about the site", () => {
    for (const f of ["Abruf fehlgeschlagen (ENOTFOUND)", "Seite antwortet mit HTTP 404", "kein Impressum gefunden"]) expect(abrufWiederholen(fehl(f), jetzt), f).toBe(false);
  });
  it("stops after three attempts and waits an hour between them", () => {
    expect(abrufWiederholen(fehl("Seite antwortet mit HTTP 503", 3), jetzt)).toBe(false);
    expect(abrufWiederholen(fehl("Seite antwortet mit HTTP 503", 1, 600_000), jetzt)).toBe(false);
    expect(abrufWiederholen({ ...fehl("Seite antwortet mit HTTP 503"), startText: "Willkommen" }, jetzt)).toBe(false);
  });
});

describe("whose imprint was read (06.10.2026)", () => {
  it("tells the site's own imprint from an alias, a hoster and another organisation", () => {
    expect(impressumHerkunft("https://www.alterric.com/impressum", "alterric.com")).toBe("eigen");
    expect(impressumHerkunft("http://wpx.windpunx.de/impressum/", "windpunx.com")).toBe("alias");
    expect(impressumHerkunft("https://www.inwx.com/en/aboutus/imprint", "wk-nandlstadt.de")).toBe("hoster");
    expect(impressumHerkunft("https://www.cisco.com/c/en/us/about/legal/privacy-full.html", "orsted.com")).toBe("fremd");
  });

  it("a hoster's default page is no website, not even a declared one", () => {
    const a = akteur("Windkraft Nandlstadt GmbH & Co. KG", "Irgendwo", "1", "85405");
    expect(beurteilen(a, "wk-nandlstadt.de", "register-webseite", { impressum: "Impressum InterNetworX Ltd. & Co. KG", startseite: "Hier entsteht eine neue Website", impressumUrl: "https://www.inwx.com/en/aboutus/imprint" }).ergebnis).toBe("geparkt");
  });

  it("another organisation's imprint proves by name or address only, never by a brand", () => {
    const enbw = akteur("EnBW Windkraftprojekte GmbH", "Schelmenwasenstraße", "15", "70567");
    const fremd = { impressum: IMPRESSUM.enbw, startseite: null, impressumUrl: "https://www.cisco.com/legal" };
    expect(beurteilen(enbw, "enbw.com", "suche", fremd).ergebnis).not.toBe("belegt");
    expect(beurteilen(enbw, "enbw.com", "suche", { ...fremd, impressumUrl: "https://www.enbw.com/impressum" }).ergebnis).toBe("belegt");
  });
});

describe("a name outside the provider block (06.10.2026)", () => {
  const orte = ortsWoerterAus(["Reher", "Jevenstedt", "Karlum", "Klixbüll"]);
  it("does not let a reference list in the imprint text prove a park", () => {
    const reher = akteur("Windpark Reher GmbH & Co. KG", "Irgendwo", "1", "25593");
    const imp = "Projekte Windpark Reher Windpark Jevenstedt Bürgerwindpark Karlum Windpark Klixbüll Impressum Angaben gemäß § 5 TMG Baubüro Kaatz GmbH Dorfstraße 3 24797 Breiholz";
    expect(beurteilen(reher, "baubuero-kaatz.de", "suche", { impressum: imp, startseite: null }, null, orte).ergebnis).not.toBe("belegt");
  });
  it("still lets the provider block itself prove the name", () => {
    const a = akteur("Bürgerwindpark Kisselsheide GmbH & Co. KG", "Irgendwo", "1", "25593");
    const imp = "Impressum Angaben gemäß § 5 TMG Bürgerwindpark Kisselsheide GmbH & Co. KG Hauptstraße 1 25593 Reher";
    expect(beurteilen(a, "kisselsheide.de", "suche", { impressum: imp, startseite: null }, null, orte).ergebnis).toBe("belegt");
  });
});

describe("Befunde der ersten Handprüfung (06.10.2026)", () => {
  it("a hyphenated brand of kind-of-company words counts when it is the domain (WIND-projekt)", () => {
    const a = akteur("WIND-projekt Windpark Börgerende 3 GmbH & Co. KG", "Seestraße", "71", "18211");
    const imp = "Impressum WIND-projekt Ingenieur- und Projektentwicklungsgesellschaft mbH Seestraße 71 18211 Börgerende-Rethwisch";
    expect(impressumBelegt(imp.replace("Seestraße 71 18211", "Hauptstraße 1 18055"), a, "wind-projekt.de")?.wie).toBe("marke");
    // Not on a portal whose label happens to be two generic words but no hyphenated word of the name.
    const b = akteur("Windenergie Musterdorf GmbH", "Irgendwo", "1", "99999");
    expect(impressumBelegt("Impressum Windenergie Portal GmbH Berlin", b, "wind-energie.de")).toBeNull();
  });
  it("a register number 0 means no number, and then nothing may stand between street and postcode", () => {
    const a = akteur("Windpark Dahme GmbH & Co. KG", "Windmühlenberg", "0", "24814");
    expect(impressumBelegt("Impressum Denker & Wulf AG Windmühlenberg 24814 Sehestedt", a, "denkerwulf.de")?.wie).toBe("anschrift");
    expect(impressumBelegt("Impressum Andere GmbH Windmühlenberg 12 24814 Sehestedt", a, "andere.de")).toBeNull();
  });
  it("an imprint without any house number matches a register number when street and postcode stand together", () => {
    const a = akteur("Windpark Calau GmbH & Co. KG", "Windmühlenberg", "1", "24814");
    expect(impressumBelegt("Impressum Denker & Wulf AG, Windmühlenberg, 24814 Sehestedt", a, "denkerwulf.de")?.wie).toBe("anschrift");
    // Another house number in the imprint is another house.
    expect(impressumBelegt("Impressum Andere GmbH Windmühlenberg 12, 24814 Sehestedt", a, "andere.de")).toBeNull();
  });
  it("the full name with its legal form identifies, even when its words are places", () => {
    expect(vollerNameIn("Betreiber des Parks ist die Amrum-Offshore West GmbH mit Sitz in Essen", "Amrum-Offshore West GmbH")).toBe(true);
    expect(vollerNameIn("Offshore-Windpark Amrumbank West", "Amrum-Offshore West GmbH")).toBe(false);
    // Another legal form right after the name still names a company (ENERTRAG, UG vs GmbH).
    expect(vollerNameIn("Gesellschafterin ist die Bürgerwind Schönfeld UG & Co KG", "Bürgerwind Schönfeld GmbH & Co. KG")).toBe(true);
    expect(vollerNameIn("Referenzen: Bürgerwind Schönfeld, Windpark Reher", "Bürgerwind Schönfeld GmbH & Co. KG")).toBe(false);
  });
  it("finds a project name without its trailing kind-of-company words and foreign legal form", () => {
    expect(kernName(["borkum", "riffgrund", "2", "offshore", "wind", "farm"])).toEqual(["borkum", "riffgrund", "2"]);
    const a = akteur("Gode Wind 2 P/S", "Am Osthafen", "2", "26506");
    expect(nameWoerter("Gode Wind 2 P/S")).toEqual(["gode", "wind", "2"]);
    const b = akteur("Borkum Riffgrund 2 Offshore Wind Farm GmbH & Co. oHG", "Am Osthafen", "2", "26506");
    expect(impressumBelegt("Unser Offshore-Windpark Borkum Riffgrund 2 liegt 54 km vor der Küste", b, "orsted.de", ortsWoerterAus(["Borkum"]))?.wie).toBe("name");
    // A park name of place and kind only stays unproven.
    const c = akteur("Windpark Reher Wind GmbH", "Irgendwo", "1", "25593");
    expect(impressumBelegt("Referenzen Windpark Reher", c, "kaatz.de", ortsWoerterAus(["Reher"]))).toBeNull();
    void a;
  });
});

describe("a register mailbox named after the operator (06.10.2026)", () => {
  it("counts like a function mailbox", () => {
    expect(funktionsPostfach("krampfer@vossenergy.com", "Windpark Krampfer-Reckenthin die Zweite GmbH & Co. KG")).toBe(true);
    // A person stays a person, even at the same firm.
    expect(funktionsPostfach("adem.bilir@mazars.de", "Windpark Krampfer-Reckenthin GmbH")).toBe(false);
    expect(funktionsPostfach("jahah@orsted.com", "Borkum Riffgrund 3 GmbH & Co. oHG")).toBe(false);
  });
});

describe("house numbers and adviser offices (06.10.2026)", () => {
  it("keeps number ranges and refuses a number that is only the start of another", () => {
    const wkn = akteur("WKN Windkraft Nord GmbH & Co. Windpark Looft KG", "Otto-Hahn-Straße", "12-16", "25813");
    expect(impressumBelegt("Impressum BGZ Fondsverwaltung GmbH Otto-Hahn-Straße 12 - 16 25813 Husum", wkn, "bgz-gmbh.de")?.wie).toBe("anschrift");
    const zwoelf = akteur("Windpark X GmbH", "Otto-Hahn-Straße", "12", "25813");
    expect(impressumBelegt("Impressum BGZ Fondsverwaltung GmbH Otto-Hahn-Straße 12-16 25813 Husum", zwoelf, "bgz-gmbh.de")?.wie).toBe("anschrift");
    const eins = akteur("Windpark Y GmbH", "Otto-Hahn-Straße", "1", "25813");
    expect(impressumBelegt("Impressum BGZ Fondsverwaltung GmbH Otto-Hahn-Straße 12-16 25813 Husum", eins, "bgz-gmbh.de")).toBeNull();
    const buchstabe = akteur("Windpark Z GmbH", "Hauptstraße", "12 a", "25813");
    expect(impressumBelegt("Impressum Muster GmbH Hauptstraße 12a 25813 Husum", buchstabe, "muster.de")?.wie).toBe("anschrift");
  });
  it("an adviser's per-park mailbox in the register proves no website", () => {
    const a = akteur("Windpark Tauberbischofsheim GmbH & Co. KG", "Irgendwo", "1", "99999");
    const imp = "PKF Wulf Gruppe – Wirtschaftsprüfer & Steuerberater springe zum Hauptinhalt Menü Impressum PKF WULF GRUPPE GmbH Löwentorstraße 6 70376 Stuttgart";
    expect(beurteilen(a, "pkf-wulf.de", "register-mail", { impressum: imp, startseite: "PKF Wulf" }, "tauberbischofsheim@pkf-wulf.de").ergebnis).not.toBe("belegt");
  });

  it("an adviser's office proves no address, the operator's own name still does", () => {
    const ewf = akteur("EWF Fünf Vier GmbH & Co. KG", "Am Markt", "5", "25813");
    const imp = "Impressum Angaben gemäß § 5 TMG SHJ Steuerberatungsgesellschaft mbH Am Markt 5 25813 Husum";
    expect(beurteilen(ewf, "shj-husum.de", "anschrift", { impressum: imp, startseite: null }).ergebnis).not.toBe("belegt");
    const eigen = akteur("Steuerberatung Windkraft Müller GmbH", "Am Markt", "5", "25813");
    expect(beurteilen(eigen, "x.de", "anschrift", { impressum: "Impressum Steuerberatung Windkraft Müller GmbH Am Markt 5 25813 Husum", startseite: null }).ergebnis).toBe("belegt");
  });
});

describe("a sibling's proven website (06.10.2026)", () => {
  const settrup = { register_email: "thebing@energy-farming.de", anschrift: "a|1|49584", website: "energy-farming.de", website_beleg: "name" };
  it("takes it when mailbox, address and the mailbox's domain all agree", () => {
    expect(geschwisterWebsite({ register_email: "Thebing@energy-farming.de", anschrift: "a|1|49584" }, [settrup])).toBe("energy-farming.de");
  });
  it("refuses an auditor's shared mailbox, another address, or a chain of siblings", () => {
    expect(geschwisterWebsite({ register_email: "adem.bilir@mazars.de", anschrift: "w||24814" }, [{ register_email: "adem.bilir@mazars.de", anschrift: "w||24814", website: "denkerwulf.de", website_beleg: "anschrift" }])).toBeNull();
    expect(geschwisterWebsite({ register_email: "thebing@energy-farming.de", anschrift: "b|2|49584" }, [settrup])).toBeNull();
    expect(geschwisterWebsite({ register_email: "thebing@energy-farming.de", anschrift: "a|1|49584" }, [{ ...settrup, website_beleg: "geschwister" }])).toBeNull();
  });
});
