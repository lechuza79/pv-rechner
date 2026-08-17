import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import robots from "../../app/robots";

// Der Nutzungsvorbehalt steht an ZWEI Stellen, die zusammengehören: die
// Crawler-Sperre in app/robots.ts und die maschinenlesbare Erklärung in
// public/.well-known/tdmrep.json. Fällt eine weg oder driften sie auseinander,
// bleibt ein Vorbehalt zurück, der nur noch nach Schutz aussieht.
//
// Der teuerste Fehler wäre aber ein anderer: versehentlich einen Crawler zu
// sperren, der uns ZITIERT. Das kostet still Reichweite — niemand merkt es,
// weil nichts kaputtgeht, es kommen nur weniger Leute. Genau davor schützt der
// erste Block.

const REPO = join(__dirname, "..", "..");

// Crawler, die eine Seite holen, WEIL jemand gefragt hat, und uns in der Antwort
// nennen. Sie sind der Kanal, über den dieses Projekt gefunden wird.
const ZITIERENDE = [
  "Googlebot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Bingbot",
];

function alleRules() {
  const r = robots().rules;
  return Array.isArray(r) ? r : [r];
}

function gesperrteAgenten(): string[] {
  return alleRules()
    .filter((rule) => rule.disallow === "/" || (Array.isArray(rule.disallow) && rule.disallow.includes("/")))
    .flatMap((rule) => (Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent ?? ""]));
}

describe("Nutzungsvorbehalt", () => {
  describe("Zitierende Crawler bleiben offen", () => {
    const gesperrt = gesperrteAgenten();

    it.each(ZITIERENDE)("%s ist nicht gesperrt", (name) => {
      expect(
        gesperrt,
        `${name} zitiert uns — eine Sperre kostet Reichweite, ohne etwas zu schützen`,
      ).not.toContain(name);
    });

    // Die Namen unterscheiden sich teils nur durch ein Suffix (ClaudeBot vs.
    // Claude-User, GPTBot vs. ChatGPT-User). Ein Eintrag, der bloß ein Präfix
    // ist, würde deshalb mehr treffen als gemeint.
    it("keine Sperre trifft einen Zitierenden als Präfix", () => {
      for (const g of gesperrt) {
        for (const z of ZITIERENDE) {
          expect(
            z === g || !z.startsWith(g),
            `Sperre "${g}" greift auf den zitierenden "${z}" über`,
          ).toBe(true);
        }
      }
    });

    it("die Seite bleibt für alle übrigen offen", () => {
      const allgemein = alleRules().find((r) => r.userAgent === "*");
      expect(allgemein?.allow).toBe("/");
    });
  });

  describe("Trainingssammler sind benannt", () => {
    const gesperrt = gesperrteAgenten();

    it.each(["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"])(
      "%s ist gesperrt",
      (name) => {
        expect(gesperrt).toContain(name);
      },
    );
  });

  // Ohne die maschinenlesbare Erklärung ist die Sperre in robots.txt allein ein
  // schwächerer Beleg für einen erklärten Vorbehalt.
  describe("Maschinenlesbare Erklärung", () => {
    const roh = readFileSync(join(REPO, "public", ".well-known", "tdmrep.json"), "utf8");
    const eintraege = JSON.parse(roh) as { location: string; "tdm-reservation": number; "tdm-policy"?: string }[];

    it("erklärt den Vorbehalt für die ganze Seite", () => {
      const wurzel = eintraege.find((e) => e.location === "/");
      expect(wurzel).toBeDefined();
      expect(wurzel!["tdm-reservation"]).toBe(1);
    });

    // Der Vorbehalt gilt pauschal, die Lizenzseite nimmt Darstellungen davon
    // wieder aus. Ohne diesen Verweis stünde ein pauschales Nein neben einem
    // CC-BY-Angebot — zwei Aussagen, die einander widersprechen.
    it("verweist auf die Seite mit den Bedingungen", () => {
      const wurzel = eintraege.find((e) => e.location === "/")!;
      expect(wurzel["tdm-policy"]).toContain("/lizenz");
    });
  });
});
