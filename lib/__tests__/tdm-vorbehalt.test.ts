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
  // Die drei standen bis zum Audit am 17.08.2026 in der Sperrliste, weil sie
  // Training bedienen. Sie bedienen aber nicht NUR das: Google-Extended steuert
  // auch das Grounding in Gemini — also das Nachschlagen zur Antwortzeit, den
  // Zitierfall selbst. Meta nennt neben dem Training ausdrücklich das
  // Indexieren für Produkte, Diffbot baut einen Wissensgraphen mit Quellen.
  "Google-Extended",
  "Meta-ExternalAgent",
  "Diffbot",
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

    // Google-Extended steht hier bewusst NICHT mehr: Es bedient auch das
    // Grounding in Gemini und gehört damit zu den Zitierenden (siehe oben).
    it.each(["GPTBot", "ClaudeBot", "CCBot", "Bytespider"])("%s ist gesperrt", (name) => {
      expect(gesperrt).toContain(name);
    });
  });

  // Der Vorbehalt gilt für die GANZE Seite — und das ist eine Korrektur.
  //
  // Zwischenzeitlich war er nach Pfad gestaffelt: Wurzel ausdrücklich frei
  // (`"/" → 0`), nur `/api/` vorbehalten. Der Gedanke war, das CC-BY-Material
  // nicht abzuschrecken. Gemessen war es aber schlechter als jede Alternative:
  //
  //   1. Der geschützte Bestand liegt gar nicht unter /api/. Die Förderprogramme
  //      werden als HTML unter /photovoltaik-foerderung/… ausgeliefert. Der
  //      Vorbehalt saß also neben der Tür.
  //   2. `0` ist kein Schweigen, sondern eine ausdrückliche Erklärung, dass NICHT
  //      vorbehalten wird. Für alles außerhalb von /api/ stand dort damit ein
  //      maschinenlesbares Ja — schlechter als gar keine Datei.
  //
  // Warum die pauschale Erklärung kein Widerspruch zur freien Lizenz ist: CC BY
  // erlaubt jede Nutzung, verlangt dafür aber die Namensnennung. Ein Modell, das
  // Inhalte einliest und später ohne Quelle wiedergibt, erfüllt diese Bedingung
  // nicht — es braucht also die gesetzliche Schranke, und die nehmen wir ihm.
  // Deckungsgleich mit robots.txt, die dieselben Sammler für die ganze Domain
  // aussperrt. Auseinanderlaufen dürfen die beiden nie.
  describe("Maschinenlesbarer Vorbehalt", () => {
    const roh = readFileSync(join(REPO, "public", ".well-known", "tdmrep.json"), "utf8");
    const eintraege = JSON.parse(roh) as { location: string; "tdm-reservation": number; "tdm-policy"?: string }[];

    it("gilt für die ganze Seite", () => {
      const wurzel = eintraege.find((e) => e.location === "/");
      expect(wurzel).toBeDefined();
      expect(wurzel!["tdm-reservation"]).toBe(1);
    });

    // Ein `0` irgendwo wäre eine ausdrückliche Freigabe an dieser Stelle. Wer
    // künftig einen Pfad ausnehmen will, muss zuerst hier begründen, warum das
    // besser ist als Schweigen.
    it("erklärt nirgends ausdrücklich das Gegenteil", () => {
      for (const e of eintraege) {
        expect(
          e["tdm-reservation"],
          `"${e.location}" gibt Text und Data Mining ausdrücklich frei`,
        ).toBe(1);
      }
    });

    it("nennt die Seite mit den Bedingungen", () => {
      expect(eintraege.find((e) => e.location === "/")!["tdm-policy"]).toContain("/lizenz");
    });
  });
});
