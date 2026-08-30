import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  atlasIsIndexable,
  atlasLevelReleased,
  atlasOrtEinzelfreigabe,
  GEMEINDE_MIN_ANLAGEN,
} from "../atlas-index";
import { freigegebeneOrte, planBefunde, RELEASE_PLAN, type Schub } from "../release-plan";

/**
 * Ein Ort, der uns nach dem Outreach öffentlich verlinkt, wird indexierbar —
 * ohne dass seine Ebene aufmacht.
 *
 * Der Anlass steht an `atlasOrtEinzelfreigabe`: Heringen (Werra) hat unsere
 * Gemeindeseite in einer eigenen Meldung verlinkt, und die Seite stand auf
 * `noindex, nofollow`. Das `nofollow` ließ die Empfehlung ins Leere laufen.
 *
 * Die Tests hier sichern BEIDE Richtungen. Die zweite ist die wichtigere: Die
 * Einzelfreigabe darf kein Weg sein, über den die Gemeinde-Ebene stillschweigend
 * aufgeht — dort gibt es nach der Messung vom 29.08.2026 keine Nachfrage.
 */

const HERINGEN = "06632009"; // Heringen (Werra), Hessen, Landkreis Hersfeld-Rotenburg
const NICHT_FREIGEGEBEN = "06632001"; // Nachbargemeinde im selben Landkreis
const VIELE_ANLAGEN = 778; // Heringens echter Bestand laut eigener Meldung

describe("Einzelfreigabe einer Atlas-Gemeinde", () => {
  it("macht den freigegebenen Ort indexierbar, obwohl die Ebene gesperrt ist", () => {
    expect(atlasLevelReleased("gemeinde")).toBe(false);
    expect(atlasOrtEinzelfreigabe(HERINGEN)).toBe(true);
    expect(atlasIsIndexable("gemeinde", VIELE_ANLAGEN, HERINGEN)).toBe(true);
  });

  it("lässt jede andere Gemeinde gesperrt", () => {
    expect(atlasOrtEinzelfreigabe(NICHT_FREIGEGEBEN)).toBe(false);
    expect(atlasIsIndexable("gemeinde", VIELE_ANLAGEN, NICHT_FREIGEGEBEN)).toBe(false);
  });

  it("öffnet die EBENE nicht — die Gegenrichtung, auf die es ankommt", () => {
    // Wer hier rot wird, hat die Gemeinde-Ebene freigeschaltet. Das ist eine
    // Entscheidung mit Freigabe-Nachweis (lib/atlas-index → FREIGABE_NACHWEIS),
    // keine Nebenwirkung einer Einzelfreigabe.
    expect(atlasLevelReleased("gemeinde")).toBe(false);
    expect(atlasIsIndexable("gemeinde", VIELE_ANLAGEN)).toBe(false);
  });

  it("hält die Thin-Schwelle auch bei Einzelfreigabe", () => {
    // Ein Verweis macht eine dünne Seite nicht wertvoller — er bringt ihr nur
    // Publikum. Die Schwelle gilt deshalb unverändert.
    expect(atlasIsIndexable("gemeinde", GEMEINDE_MIN_ANLAGEN - 1, HERINGEN)).toBe(false);
    expect(atlasIsIndexable("gemeinde", GEMEINDE_MIN_ANLAGEN, HERINGEN)).toBe(true);
  });

  it("verhält sich ohne Gemeindeschlüssel wie zuvor", () => {
    expect(atlasIsIndexable("bundesland")).toBe(true);
    expect(atlasIsIndexable("landkreis")).toBe(false);
    expect(atlasIsIndexable("gemeinde", VIELE_ANLAGEN)).toBe(false);
  });

  it("führt den freigegebenen Ort in der Liste für die Sitemap", () => {
    // Ohne diesen Eintrag wäre die Seite indexierbar, stünde aber in keiner
    // Sitemap — halb freigegeben.
    expect(freigegebeneOrte("atlas-gemeinde")).toContain(HERINGEN);
  });
});

describe("Beleg-Schub: die Auflagen, die ihn vom Rollout trennen", () => {
  const basis: Schub = {
    id: "test",
    gattung: "atlas-gemeinde",
    datum: "2026-08-29",
    status: "live",
    zweck: "beleg",
    orte: [HERINGEN],
    begruendung: "Test",
    nachweis: {
      gemessenAm: "2026-08-29",
      nachfrage: "Nein, und das ist hier kein Ausschlussgrund.",
      kannibalisierung: "Keine.",
      beleg: "docs/seo/befund-2026-08-29-ema-energiewelt-ortsseiten.md",
    },
  };

  const regeln = (s: Schub) => planBefunde([s]).map((b) => b.regel);

  it("lässt den sauberen Fall durch", () => {
    expect(regeln(basis)).toEqual([]);
  });

  it("schlägt an, wenn ein Beleg-Schub mehr als einen Ort trägt", () => {
    // Das ist die eigentliche Sperre: Mit mehreren Orten wäre `zweck: "beleg"`
    // ein Etikett, mit dem sich ein Massen-Rollout an der Staffelung vorbeischreibt.
    expect(regeln({ ...basis, orte: [HERINGEN, NICHT_FREIGEGEBEN] })).toContain("beleg-schub-zu-gross");
  });

  it("schlägt an, wenn der Nachweis fehlt", () => {
    expect(regeln({ ...basis, nachweis: null })).toContain("beleg-schub-ohne-nachweis");
  });

  it("schlägt an, wenn der Nachweis keine fehlende Nachfrage feststellt", () => {
    // Besteht Nachfrage, ist es ein Sichtbarkeits-Schub und wird gestaffelt —
    // sonst wäre die Ausnahme von der Abstandsregel unbegründet.
    expect(
      regeln({
        ...basis,
        nachweis: { ...basis.nachweis!, nachfrage: "Ja, 320 Suchen im Monat." },
      }),
    ).toContain("beleg-schub-ohne-nachfrage-befund");
  });

  it("nimmt Beleg-Schübe aus der Abstandsregel — aber nur sie", () => {
    // Verschiedene Orte, sonst greift die eigene Regel gegen zwei Schübe für
    // denselben Ort und der Test misst etwas anderes als er behauptet.
    const zweiterBeleg: Schub = { ...basis, id: "test2", datum: "2026-08-31", orte: [NICHT_FREIGEGEBEN] };
    expect(planBefunde([basis, zweiterBeleg]).map((b) => b.regel)).toEqual([]);

    // Derselbe Abstand zwischen zwei Sichtbarkeits-Schüben bleibt ein Befund.
    const sicht1: Schub = { ...basis, id: "s1", zweck: undefined };
    const sicht2: Schub = { ...basis, id: "s2", datum: "2026-08-31", orte: [NICHT_FREIGEGEBEN], zweck: undefined };
    expect(planBefunde([sicht1, sicht2]).map((b) => b.regel)).toContain("schuebe-zu-dicht");
  });
});

/**
 * Der zweite Weg zur Freigabe: ein Ort, der uns nach dem Outreach nachweislich
 * verlinkt hat. Er läuft OHNE Sitzung, weil dabei nichts geschätzt wird.
 *
 * Prüfbar ist hier nur die Verdrahtung — ob die Datenbank die richtigen Orte
 * liefert, entscheidet sich zur Laufzeit. Genau diese Verdrahtung ist aber die
 * Stelle, die beim nächsten Umbau still verschwindet: Sie ist im Diff
 * unauffällig, im Browser unsichtbar, und ihr Fehlen fällt erst auf, wenn wieder
 * eine Gemeinde ins Leere verlinkt.
 */
describe("Automatische Freigabe verlinkender Gemeinden", () => {
  const gemeindeSeite = readFileSync(
    resolve(__dirname, "../../app/(site)/solar-atlas/[bundesland]/[kreis]/[gemeinde]/page.tsx"),
    "utf8",
  );
  const sitemap = readFileSync(resolve(__dirname, "../../app/sitemap.ts"), "utf8");

  /**
   * Die Zeile, die den robots-Eintrag der FERTIGEN Seite setzt.
   *
   * Nicht die erste Fundstelle nehmen: Weiter oben steht der Abbruch für eine
   * unbekannte Adresse (`atlasRobots(false)`), und der trägt den Zustand
   * naturgemäß nicht. Die erste Fassung dieses Tests prüfte genau diese Zeile
   * und war rot, obwohl der Code stimmte.
   */
  const echteRobotsZeile = () =>
    gemeindeSeite
      .split("\n")
      .find((z) => z.includes("robots: atlasRobots") && !z.includes("atlasRobots(false)"));

  it("ist in der Gemeindeseite verdrahtet", () => {
    expect(gemeindeSeite).toContain("verlinkendeGemeinden");
  });

  it("wirkt auf die Index-Freigabe, nicht nur auf das Laden der Zahlen", () => {
    // Die Zeile, die den robots-Eintrag setzt, muss den Einzelfreigabe-Zustand
    // benutzen. Hinge sie allein an der Ebene, wäre der Mechanismus wirkungslos
    // und trotzdem grün.
    const robotsZeile = echteRobotsZeile();
    expect(robotsZeile, "Zeile mit robots: atlasRobots nicht gefunden").toBeTruthy();
    expect(robotsZeile).toContain("einzeln");
  });

  it("hält auch auf diesem Weg die Thin-Schwelle", () => {
    const robotsZeile = echteRobotsZeile();
    expect(robotsZeile).toContain("GEMEINDE_MIN_ANLAGEN");
  });

  it("nimmt die Orte in die Sitemap auf", () => {
    // Eine indexierbare Seite, die in keiner Sitemap steht, ist halb freigegeben.
    expect(sitemap).toContain("verlinkendeGemeinden");
  });

  it("hängt am VERSAND, nicht am Nachweis einer Veröffentlichung", () => {
    // Der Unterschied ist am 29.08.2026 gemessen worden: Wallertheim verlinkte
    // uns in seiner Dorf-App, und weder Verweis-Verzeichnis noch Herkunftsspalte
    // wussten davon (der Link trägt `rel="noreferrer"`). Eine Freigabe, die auf
    // den Nachweis wartet, wartet dort für immer.
    const quelle = readFileSync(resolve(__dirname, "../atlas-outreach-freigabe.ts"), "utf8");
    expect(quelle).toContain("contacted_at");
    expect(quelle, "Der Status „veroeffentlicht“ darf nicht mehr die Bedingung sein").not.toMatch(
      /eq\(\s*["']outreach_status["']\s*,\s*["']veroeffentlicht["']/,
    );
  });

  it("nimmt Orte mit eigener Förderseite aus", () => {
    // Sonst stünden zwei eigene Seiten auf denselben Ortsanfragen — und die
    // Förderseite steht dort teils vorn.
    const quelle = readFileSync(resolve(__dirname, "../atlas-outreach-freigabe.ts"), "utf8");
    expect(quelle).toContain("ATLAS_CITIES");
  });

  it("schließt gesperrte Gemeinden aus", () => {
    // Wer widersprochen hat, bekommt keine Seite freigeschaltet, auch wenn der
    // Brief einmal raus war.
    const quelle = readFileSync(resolve(__dirname, "../atlas-outreach-freigabe.ts"), "utf8");
    expect(quelle).toContain("gesperrt");
  });
});

describe("Der Plan bleibt in sich schlüssig", () => {
  it("hat für jeden Beleg-Schub genau einen Ort", () => {
    for (const s of RELEASE_PLAN.filter((x) => x.zweck === "beleg")) {
      expect(s.orte, `${s.id}`).toHaveLength(1);
    }
  });
});
