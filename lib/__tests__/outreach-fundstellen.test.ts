import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { moeglicheVeroeffentlichung, nenntUns, normiereUrl, offeneFunde, verlinktUns } from "../outreach-fundstellen";
import { liegtImBezug } from "../kommunen-veroeffentlichung";

describe("Erwähnung von uns erkennen", () => {
  it("findet unsere Domain", () => {
    expect(nenntUns("Mehr Zahlen unter solar-check.io/solar-atlas")).toBe(true);
  });
  it("findet die Nennung ohne Domain, wie Radio 90,1 sie schrieb", () => {
    expect(nenntUns("Das zeigt eine Auswertung von Solar Check auf Grundlage von Daten aus dem Marktstammdatenregister.")).toBe(true);
  });
  it("hält die gleichnamige Energieberatung NICHT für uns (Bad Münder, 07.10.2026)", () => {
    expect(nenntUns("Bei den Angeboten Mach dein Haus fit!, Heizungsvisite und Solar-Check nimmt ein Team von Energieberatern Ihre Immobilie unter die Lupe.")).toBe(false);
  });
  it("erkennt einen Link auf uns", () => {
    expect(verlinktUns('<a href="https://solar-check.io/solar-atlas/x">mehr</a>')).toBe(true);
    expect(verlinktUns("solar-check.io im Fließtext")).toBe(false);
  });
});

describe("Backlink-Index filtern", () => {
  const bekannt = new Set(["nachrichten-kl.de"]);
  it("nimmt Verweise auf eine Ortsseite oder einen Ratgeber", () => {
    expect(moeglicheVeroeffentlichung("https://solar-check.io/solar-atlas/nrw/moers", "radiokw.de", bekannt)).toBe(true);
    expect(moeglicheVeroeffentlichung("https://solar-check.io/ratgeber/x", "gude.news", bekannt)).toBe(true);
  });
  it("nimmt alles von einer angeschriebenen Domain, auch auf die Startseite", () => {
    expect(moeglicheVeroeffentlichung("https://solar-check.io/", "nachrichten-kl.de", bekannt)).toBe(true);
  });
  it("lässt Linkfarmen auf die Startseite weg", () => {
    expect(moeglicheVeroeffentlichung("https://solar-check.io/", "top5casino.online", bekannt)).toBe(false);
  });
});

describe("offen ist, was nirgends eingetragen ist", () => {
  it("vergleicht ohne Schema, www, Abfrageteil und Schrägstrich", () => {
    expect(normiereUrl("https://www.x.de/a/?utm=1")).toBe(normiereUrl("http://x.de/a"));
  });
  it("lässt eingetragene und verworfene Adressen weg und meldet jede nur einmal", () => {
    const f = (url: string) => ({ quelle: "website" as const, url, mitLink: true });
    const offen = offeneFunde([f("https://a.de/1"), f("https://www.a.de/1/"), f("https://b.de/2"), f("https://c.de/3")], ["https://b.de/2"]);
    expect(offen.map((o) => o.url)).toEqual(["https://a.de/1", "https://c.de/3"]);
  });
});

describe("Ort einer Aussendung zuordnen", () => {
  it("Gemeinde im genannten Kreis und Kreis zur genannten Gemeinde", () => {
    expect(liegtImBezug("05170024", ["05170"])).toBe(true);
    expect(liegtImBezug("07335", ["07335000"])).toBe(true);
    expect(liegtImBezug("05116000", ["05170"])).toBe(false);
  });
});

describe("die Auswertung fragt diese Quelle", () => {
  it("ist im Auswertungslauf eingebaut und bestimmt das Urteil", () => {
    const quelltext = readFileSync("scripts/kommunen-auswertung.ts", "utf8");
    expect(quelltext).toMatch(/outreach:fundstellen/);
    expect(quelltext).toMatch(/VOLLSTÄNDIG/);
  });
});

describe("Anrisse neben dem Artikel", () => {
  it("lässt Startseite und Nachrichtenliste weg, wenn der Artikel bekannt ist (homburg1.de)", async () => {
    const { ohneUebersichten } = await import("../outreach-fundstellen");
    const f = (url: string) => ({ quelle: "website" as const, url, mitLink: false });
    const funde = [f("https://homburg1.de/"), f("https://homburg1.de/nachrichten/"), f("https://andere.de/"), f("https://lebendiges-neuwied.de/News-topic-Kreis-Neuwied-5.html")];
    const rest = ohneUebersichten(funde, ["https://homburg1.de/blieskastel-fuehrt-saarland-bei-privater-solarleistung-an-264043/", "https://www.lebendiges-neuwied.de/News-Asbach-und-Linz-am-Rhein-beim-Solarausbau-vorn-item-8922.html"]);
    expect(rest.map((r) => r.url)).toEqual(["https://andere.de/"]);
  });
});

describe("nicht lesbare Websites", () => {
  it("verhindern das Urteil VOLLSTÄNDIG", () => {
    const quelltext = readFileSync("scripts/kommunen-auswertung.ts", "utf8");
    expect(quelltext).toMatch(/NICHT_LESBAR=/);
    expect(quelltext).toMatch(/!kaputt && !offen && !ungelesen/);
    expect(readFileSync("scripts/outreach-fundstellen.ts", "utf8")).toMatch(/unerreichbar\.length \? 2 : 0/);
  });
});
