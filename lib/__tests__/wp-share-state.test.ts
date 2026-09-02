import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WP_STANDARD,
  istGeteilterLink,
  wpAusParametern,
  wpZuParametern,
  type WpZustand,
} from "../wp-share-state";

const ROOT = join(__dirname, "..", "..");

/**
 * Der Teilen-Link des Wärmepumpen-Rechners.
 *
 * Ein geteilter Link hat genau eine Aufgabe, und wenn er sie verfehlt, merkt es
 * niemand: Beim Empfänger muss DIESELBE Rechnung stehen wie beim Absender. Eine
 * verlorene Angabe erzeugt keine Fehlerseite, sondern eine andere Zahl unter
 * derselben Überschrift.
 */

/** Ein Zustand, in dem JEDE Angabe vom Standard abweicht. */
const ALLES_ANDERS: WpZustand = {
  situation: "neubau",
  wohnflaeche: 185,
  haustyp: "reihenmitte",
  daemmung: 2,
  personen: 3,
  heizsystem: "hk_alt",
  wpType: "swwp",
  brennstoff: "oel_neu",
  heizkoerperTausch: true,
  szenario: "optimistic",
  weg: "saniert",
  selbstnutzer: false,
  altheizung: "oel_kohle",
  einkommen: "bis30",
  kindImHaushalt: true,
  euUrsprung: true,
  begStand: "naechste",
  foerderungAn: false,
  plz: "71032",
  pvStatus: "vorhanden",
  pvKwp: 14,
  pvSpeicher: 6,
  gaspreis: 0.14,
  strompreis: 0.27,
  jaz: 3.9,
  investition: 31500,
  heizwaerme: 17000,
  heizlast: 9.4,
  fossilInvest: 0,
};

describe("Hin und zurück", () => {
  it("überlebt jede einzelne Angabe", () => {
    // Der Test, der zählt. Fällt eine Angabe aus der Adresse, rechnet der
    // Empfänger etwas anderes — und beide sehen eine plausible Zahl.
    expect(wpAusParametern(wpZuParametern(ALLES_ANDERS))).toEqual(ALLES_ANDERS);
  });

  it("auch der Ausgangszustand kommt unverändert zurück", () => {
    expect(wpAusParametern(wpZuParametern(WP_STANDARD))).toEqual(WP_STANDARD);
  });

  it("ein leerer Link ergibt den Ausgangszustand", () => {
    expect(wpAusParametern(new URLSearchParams())).toEqual(WP_STANDARD);
  });
});

describe("Der Link bleibt lesbar", () => {
  it("der Ausgangszustand erzeugt gar keine Parameter", () => {
    expect(wpZuParametern(WP_STANDARD).toString()).toBe("");
  });

  it("nur die geänderte Angabe steht drin", () => {
    const p = wpZuParametern({ ...WP_STANDARD, wpType: "swwp" });
    expect([...p.keys()]).toEqual(["wp"]);
  });
});

describe("Der Förderstand muss mit", () => {
  /**
   * Er ist der einzige Schalter, der die Zahl ändert, ohne am Gebäude etwas zu
   * ändern. Wer eine Rechnung nach den Sätzen des nächsten Stichtags teilt und
   * ihn nicht mitschickt, schickt eine Zahl, die beim Empfänger anders
   * herauskommt — dieselbe Regel, aus der beim PV-Rechner das Vergütungsregime
   * in den Link kam. Die Projektanleitung verlangt das ausdrücklich für den
   * Fall, dass dieser Link je nachgerüstet wird.
   */
  it("steht im Link, sobald er nicht der heutige ist", () => {
    const p = wpZuParametern({ ...WP_STANDARD, begStand: "naechste" });
    expect(p.get("bs")).toBe("naechste");
  });

  it("und kommt als solcher wieder heraus", () => {
    expect(wpAusParametern(new URLSearchParams("bs=naechste")).begStand).toBe("naechste");
  });

  it("dasselbe gilt für die Angaben, an denen die Förderhöhe hängt", () => {
    // Selbstnutzung, alte Heizung, Einkommen, Familienzuschlag und der
    // EU-Ursprung des Geräts ändern den Fördersatz — jede fehlende davon
    // verschiebt den Betrag beim Empfänger.
    const p = wpZuParametern({
      ...WP_STANDARD,
      selbstnutzer: false,
      altheizung: "oel_kohle",
      einkommen: "bis30",
      kindImHaushalt: true,
      euUrsprung: true,
    });
    expect([...p.keys()].sort()).toEqual(["ah", "ek", "eu", "ki", "sn"]);
  });
});

describe("Was aus einem fremden Link kommt, wird geprüft", () => {
  it("Unsinn fällt auf den Ausgangszustand zurück, statt die Seite zu zerlegen", () => {
    const z = wpAusParametern(new URLSearchParams("si=quatsch&hz=blah&wp=xyz&ek=viel"));
    expect(z.situation).toBe(WP_STANDARD.situation);
    expect(z.heizsystem).toBe(WP_STANDARD.heizsystem);
    expect(z.wpType).toBe(WP_STANDARD.wpType);
    expect(z.einkommen).toBe(WP_STANDARD.einkommen);
  });

  it("eine Postleitzahl muss fünf Ziffern haben", () => {
    // Sonst landet der Inhalt eines fremden Links ungeprüft in einer Abfrage.
    expect(wpAusParametern(new URLSearchParams("plz=71032")).plz).toBe("71032");
    expect(wpAusParametern(new URLSearchParams("plz=abc")).plz).toBe("");
    expect(wpAusParametern(new URLSearchParams("plz=7103")).plz).toBe("");
  });

  it("die Wohnfläche bleibt in den Grenzen, die auch die Eingabe zieht", () => {
    expect(wpAusParametern(new URLSearchParams("fl=99999")).wohnflaeche).toBe(1000);
    expect(wpAusParametern(new URLSearchParams("fl=1")).wohnflaeche).toBe(30);
  });

  it("eine Listennummer kann nicht aus ihrer Liste laufen", () => {
    expect(wpAusParametern(new URLSearchParams("da=99")).daemmung).toBe(3);
    expect(wpAusParametern(new URLSearchParams("pe=-5")).personen).toBe(0);
  });
});

describe("Erkennen, dass überhaupt ein Link vorliegt", () => {
  it("unterscheidet einen geteilten Link von einem gewöhnlichen Aufruf", () => {
    expect(istGeteilterLink(new URLSearchParams())).toBe(false);
    // Fremde Parameter — etwa aus einer Werbe-Kennung — sind kein geteiltes
    // Ergebnis und dürfen den Rechner nicht ins Ergebnis springen lassen.
    expect(istGeteilterLink(new URLSearchParams("utm_source=mail"))).toBe(false);
    expect(istGeteilterLink(new URLSearchParams("wp=swwp"))).toBe(true);
  });
});

describe("Der Rechner benutzt wirklich diese eine Quelle", () => {
  const rechner = readFileSync(join(ROOT, "app", "(site)", "waermepumpe-rechner", "waermepumpe.tsx"), "utf8");

  it("baut den Link nicht von Hand zusammen", () => {
    // Eine zweite Zusammensetzung wäre die Fassung, die beim nächsten neuen
    // Feld vergessen wird — und dann trägt der Link es nicht mehr.
    expect(rechner).toMatch(/wpZuParametern\(/);
    expect(rechner).not.toMatch(/new URLSearchParams\(\)[\s\S]{0,200}\.set\("si"/);
  });

  it("liest die Adresse genau einmal", () => {
    // Ein Effekt, der die Adresse dauernd beobachtet, überschriebe die Eingaben
    // des Nutzers bei jeder Adressänderung.
    expect(rechner).toMatch(/linkGelesen\.current/);
  });

  it("baut den Link auf die Adresse des RECHNERS, nicht auf die der Seite", () => {
    // Der Rechner wohnt auch in einem Fenster auf dem Förder-Ratgeber. Über den
    // Pfad des Fensters gebaut, zeigte der Link dorthin — der Empfänger landete
    // auf einem Artikel mit einer Query, die dort niemand liest. Genau dieser
    // Fehler ist dem PV-Rechner schon einmal passiert.
    expect(rechner).toMatch(/origin\}\/waermepumpe-rechner/);
    expect(rechner).not.toMatch(/origin\}\$\{window\.location\.pathname\}/);
  });

  it("leert die Adresse beim Neu-Berechnen", () => {
    // Sonst holt ein Neuladen die gerade verworfene Rechnung zurück.
    expect(rechner).toMatch(/setStep\(0\);[\s\S]{0,300}history\.replaceState/);
  });
});
