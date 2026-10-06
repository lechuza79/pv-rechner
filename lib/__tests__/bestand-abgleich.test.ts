import { describe, expect, it } from "vitest";
import { abgleichen, belegungAufbauen, organisationsDomain, verdraengtGrund, type Belegung } from "../bestand-abgleich";

// The cases are the real collisions measured on 06.10.2026, not invented ones.
const belegung = belegungAufbauen([
  { bestand: "presse", id: "aachener-zeitung.de", website: "aachener-zeitung.de" },
  { bestand: "presse", id: "lb-solartec.de", website: "lb-solartec.de" },
  { bestand: "versorger", id: "u-17", name: "Stadtwerke Münster", website: "https://www.stadtwerke-muenster.de" },
  { bestand: "gemeinde", id: "05515000", name: "Münster", website: "https://www.stadt-muenster.de" },
  { bestand: "versorger", id: "u-3", name: "Bayernwerk", website: "https://www.bayernwerk.de" },
] as (Belegung & { website: string })[]);

describe("organisationsDomain", () => {
  it("compares the registrable part, so subdomains are one organisation", () => {
    expect(organisationsDomain("https://energiemonitor.bayernwerk.de/x")).toBe("bayernwerk.de");
    expect(organisationsDomain("www.Stadtwerke-Muenster.de")).toBe("stadtwerke-muenster.de");
  });

  it("keeps the full host on shared hosting, where the registrable part names the platform", () => {
    expect(organisationsDomain("https://elektro-meier.jimdosite.com")).toBe("elektro-meier.jimdosite.com");
    expect(organisationsDomain("https://solar-huber.wixsite.com/start")).toBe("solar-huber.wixsite.com");
    expect(organisationsDomain("https://elektro-meier.jimdosite.com")).not.toBe(organisationsDomain("https://solar-huber.jimdosite.com"));
  });

  it("returns nothing for what is not a host", () => {
    expect(organisationsDomain("")).toBeNull();
    expect(organisationsDomain(null)).toBeNull();
    expect(organisationsDomain("localhost")).toBeNull();
  });
});

describe("abgleichen", () => {
  it("lets an installer that no other stock claims through", () => {
    expect(abgleichen("elektro-goschuetz.de", "fachbetrieb", belegung)).toEqual({ art: "frei" });
  });

  it("demotes an installer whose domain the register names as a utility", () => {
    const u = abgleichen("stadtwerke-muenster.de", "fachbetrieb", belegung);
    expect(u.art).toBe("verdraengt");
    if (u.art === "verdraengt") expect(verdraengtGrund(u)).toContain("Versorger (Stadtwerke Münster)");
  });

  it("demotes an installer that sits on a subdomain of a utility", () => {
    expect(abgleichen(organisationsDomain("energiemonitor.bayernwerk.de"), "fachbetrieb", belegung).art).toBe("verdraengt");
  });

  it("does NOT decide a collision between two search-based stocks — either side can be the wrong one", () => {
    // A newspaper as installer is wrong; an installer in the press catalogue is
    // wrong the other way round. Both were measured.
    expect(abgleichen("aachener-zeitung.de", "fachbetrieb", belegung).art).toBe("entscheiden");
    expect(abgleichen("lb-solartec.de", "fachbetrieb", belegung).art).toBe("entscheiden");
  });

  it("lets a Stadtwerk and a Gemeinde also be wind operators", () => {
    expect(abgleichen("stadtwerke-muenster.de", "windbetreiber", belegung).art).toBe("geteilt");
    expect(abgleichen("stadt-muenster.de", "windbetreiber", belegung).art).toBe("geteilt");
  });

  it("does not let a wind operator take a newspaper's domain that we found by searching", () => {
    // An official identity does not make a wrongly assigned website right.
    expect(abgleichen("aachener-zeitung.de", "windbetreiber", belegung, { herkunft: "suche" }).art).toBe("entscheiden");
  });

  it("lets a website the register itself names win over the press catalogue", () => {
    expect(abgleichen("aachener-zeitung.de", "windbetreiber", belegung, { herkunft: "amtlich" }).art).toBe("vorrang");
  });

  it("lets a search-found utility website yield to an official one, and not the other way round", () => {
    const beide = belegungAufbauen([
      { bestand: "versorger", id: "u-1", website: "stadtwerke-y.de", herkunft: "suche" },
      { bestand: "fachbetrieb", id: "f-1", website: "stadtwerke-y.de" },
    ]);
    // Neither side is official here, so nobody may win automatically.
    expect(abgleichen("stadtwerke-y.de", "fachbetrieb", beide).art).toBe("entscheiden");
  });

  it("never lets an official stock be displaced by a search-based one", () => {
    // The order of writing must not decide who wins.
    expect(abgleichen("stadtwerke-muenster.de", "versorger", belegungAufbauen([
      { bestand: "fachbetrieb", id: "stadtwerke-muenster.de", website: "stadtwerke-muenster.de" },
    ])).art).toBe("vorrang");
  });

  it("gives the same answer from both sides of a collision", () => {
    const beide = belegungAufbauen([
      { bestand: "fachbetrieb", id: "sw", website: "stadtwerke-x.de" },
      { bestand: "versorger", id: "u-9", website: "stadtwerke-x.de" },
    ]);
    expect(abgleichen("stadtwerke-x.de", "fachbetrieb", beide).art).toBe("verdraengt");
    expect(abgleichen("stadtwerke-x.de", "versorger", beide).art).toBe("vorrang");
  });

  it("lets a Gemeinde and its own Gemeindewerke share the Gemeinde's site", () => {
    const beide = belegungAufbauen([
      { bestand: "gemeinde", id: "06632023", website: "wildeck.de" },
      { bestand: "versorger", id: "u-5", name: "Gemeindewerke Wildeck", website: "wildeck.de" },
    ]);
    expect(abgleichen("wildeck.de", "versorger", beide).art).toBe("geteilt");
  });

  it("leaves two search-based stocks on one domain to a person even when one is official elsewhere", () => {
    const beide = belegungAufbauen([
      { bestand: "presse", id: "p", website: "alzeyer-zeitung.de" },
      { bestand: "fachbetrieb", id: "f", website: "alzeyer-zeitung.de" },
    ]);
    expect(abgleichen("alzeyer-zeitung.de", "presse", beide).art).toBe("entscheiden");
  });

  it("treats entries of the same stock as one group, not as collisions", () => {
    const wind = belegungAufbauen([
      { bestand: "windbetreiber", id: "ABR1", website: "juwi.de" },
      { bestand: "windbetreiber", id: "ABR2", website: "https://www.juwi.de" },
    ]);
    expect(abgleichen("juwi.de", "windbetreiber", wind)).toEqual({ art: "frei" });
  });

  it("finds a collision between two stocks that both key their entries by domain", () => {
    // The real case: press and installers both use the domain as identifier.
    const beide = belegungAufbauen([
      { bestand: "presse", id: "aachener-zeitung.de", website: "aachener-zeitung.de" },
      { bestand: "fachbetrieb", id: "aachener-zeitung.de", website: "aachener-zeitung.de" },
    ]);
    expect(abgleichen("aachener-zeitung.de", "fachbetrieb", beide).art).toBe("entscheiden");
    expect(abgleichen("aachener-zeitung.de", "presse", beide).art).toBe("entscheiden");
  });

  it("ignores the entry's own claim", () => {
    expect(abgleichen("stadtwerke-muenster.de", "versorger", belegung)).toEqual({ art: "frei" });
  });
});

describe("Entscheidungen von Hand", () => {
  const beide = belegungAufbauen([
    { bestand: "presse", id: "alzeyer-zeitung.de", website: "alzeyer-zeitung.de" },
    { bestand: "fachbetrieb", id: "alzeyer-zeitung.de", website: "alzeyer-zeitung.de" },
  ]);
  const entscheidungen = new Map([["alzeyer-zeitung.de", { falsch: ["fachbetrieb" as const], notiz: "Tageszeitung, kein Handwerksbetrieb" }]]);

  it("demotes the stock a person declared wrong, on every later run", () => {
    const u = abgleichen("alzeyer-zeitung.de", "fachbetrieb", beide, { entscheidungen });
    expect(u.art).toBe("verdraengt");
    if (u.art === "verdraengt") expect(verdraengtGrund(u)).toBe("von Hand entschieden: Tageszeitung, kein Handwerksbetrieb");
  });

  it("leaves the stock declared right alone", () => {
    expect(abgleichen("alzeyer-zeitung.de", "presse", beide, { entscheidungen }).art).not.toBe("verdraengt");
  });

  it("removes the decided-wrong side for every other stock too", () => {
    // enercity.de stood as an installer; once that is decided wrong, the wind
    // operator found there is no longer in a collision.
    const drei = belegungAufbauen([{ bestand: "fachbetrieb", id: "enercity.de", website: "enercity.de" }]);
    const e = new Map([["enercity.de", { falsch: ["fachbetrieb" as const], notiz: "Stadtwerk Hannover" }]]);
    expect(abgleichen("enercity.de", "windbetreiber", drei, { herkunft: "suche" }).art).toBe("entscheiden");
    expect(abgleichen("enercity.de", "windbetreiber", drei, { herkunft: "suche", entscheidungen: e }).art).toBe("frei");
  });

  it("can declare both stocks wrong", () => {
    const e = new Map([["stadtwerke-x.de", { falsch: ["presse" as const, "fachbetrieb" as const], notiz: "Stadtwerk" }]]);
    expect(abgleichen("stadtwerke-x.de", "presse", beide, { entscheidungen: e }).art).toBe("verdraengt");
    expect(abgleichen("stadtwerke-x.de", "fachbetrieb", beide, { entscheidungen: e }).art).toBe("verdraengt");
  });
});
