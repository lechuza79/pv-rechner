import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HERKUNFT_PARAM,
  HERKUNFT_WERT,
  istHerkunftsAufruf,
  mitHerkunft,
} from "../brief-herkunft";

const quelle = (datei: string) =>
  readFileSync(join(process.cwd(), datei), "utf8");

describe("Herkunftskennung der Outreach-Briefe", () => {
  // Die tragende Bedingung der rechtlichen Bewertung (zwei Legal-Judges,
  // 27.08.2026): Der Wert ist in jedem Brief derselbe. Ein Wert je Empfänger
  // wäre ein Pseudonym — wir halten die Versandliste, also ist die Zuordnung
  // für uns möglich. Weil je Gemeinde genau eine Mail hinausgeht, ist der
  // Ortsname die Ausprägung, die sich am harmlosesten anhört und es am
  // wenigsten ist.
  describe("der Wert ist statisch", () => {
    it("enthält weder Ziffern noch Trennzeichen, an denen etwas Variables hinge", () => {
      expect(HERKUNFT_WERT).toMatch(/^[a-z]+$/);
    });

    it("ist ein einzelner Begriff und keine Vorlage", () => {
      expect(HERKUNFT_WERT).not.toContain("{");
      expect(HERKUNFT_WERT).not.toContain("$");
    });

    it("wird nirgends im Briefcode aus einem Ortsnamen zusammengesetzt", () => {
      const code = quelle("lib/brief-herkunft.ts") + quelle("lib/kommunen-brief.ts");
      // Eine Zeile, die den Parameternamen mit einer Zeichenketten-Vorlage
      // verbindet, ist der einzige Weg, wie ein variabler Wert entstünde.
      const vorlage = new RegExp(`${HERKUNFT_PARAM}=\\$\\{`);
      expect(
        vorlage.test(code),
        `${HERKUNFT_PARAM} wird aus einer Vorlage gebaut — damit wäre der Wert je Empfänger verschieden`,
      ).toBe(false);
    });
  });

  describe("mitHerkunft", () => {
    it("setzt den Parameter VOR den Anker", () => {
      // Hinter dem Anker wäre er kein Parameter mehr, sondern Teil des Ankers:
      // still wirkungslos und im Diff unauffällig.
      expect(mitHerkunft("https://solar-check.io/a/b#balkon")).toBe(
        `https://solar-check.io/a/b?${HERKUNFT_PARAM}=${HERKUNFT_WERT}#balkon`,
      );
    });

    it("hängt an eine Adresse mit vorhandener Abfrage mit & an", () => {
      expect(mitHerkunft("https://solar-check.io/a?x=1")).toBe(
        `https://solar-check.io/a?x=1&${HERKUNFT_PARAM}=${HERKUNFT_WERT}`,
      );
    });

    it("kommt auch ohne Anker aus", () => {
      expect(mitHerkunft("https://solar-check.io/a")).toBe(
        `https://solar-check.io/a?${HERKUNFT_PARAM}=${HERKUNFT_WERT}`,
      );
    });

    it("hängt nicht zweimal an", () => {
      const einmal = mitHerkunft("https://solar-check.io/a#c");
      expect(mitHerkunft(einmal)).toBe(einmal);
    });
  });

  describe("istHerkunftsAufruf", () => {
    it("erkennt den eigenen Aufruf", () => {
      expect(istHerkunftsAufruf(`?${HERKUNFT_PARAM}=${HERKUNFT_WERT}`)).toBe(true);
      expect(istHerkunftsAufruf(`?a=1&${HERKUNFT_PARAM}=${HERKUNFT_WERT}&b=2`)).toBe(true);
    });

    it("hält einen fremden Wert desselben Parameters nicht dafür", () => {
      expect(istHerkunftsAufruf(`?${HERKUNFT_PARAM}=newsletter`)).toBe(false);
    });

    it("kommt mit leerer und unsinniger Abfrage zurecht", () => {
      expect(istHerkunftsAufruf("")).toBe(false);
      expect(istHerkunftsAufruf("?%%%")).toBe(false);
    });
  });

  describe("welche Links die Kennung tragen", () => {
    const brief = quelle("lib/kommunen-brief.ts");

    it("die Gemeindeseite und die Rangliste tragen sie", () => {
      // Beide stehen im Brief bzw. in der zur Veröffentlichung gedachten
      // Meldung — dort ist ein Aufruf wirklich eine Folge des Anschreibens.
      const treffer = brief.match(/mitHerkunft\(/g) ?? [];
      expect(treffer.length).toBe(2);
    });

    it("die Widget-Adresse trägt sie NICHT", () => {
      // Sie landet im Einbettungscode auf der Website der Gemeinde. Dort wäre
      // sie kein Brief-Klick mehr, sondern dauerhaft jeder Aufruf des
      // eingebauten Widgets — die Zählung würde etwas anderes messen, als sie
      // behauptet.
      const zeile = brief
        .split("\n")
        .find((z) => z.includes("widgetUrl:") && z.includes("embed/gemeinde-solar"));
      expect(zeile, "widgetUrl-Zeile nicht gefunden — umbenannt?").toBeDefined();
      expect(zeile).not.toContain("mitHerkunft");
    });
  });

  describe("die Datenschutzerklärung behauptet keine Anonymität", () => {
    // Der Gegenprüfer (27.08.2026) hat gemessen, dass die Zuordnung nicht am
    // Parameter hängt, sondern an der gemeindespezifischen Zieladresse: Wer
    // nach der Kennung filtert und dann auf die aufgerufene Seite sieht, liest
    // ab, aus welcher Gemeinde geklickt wurde. Das darf dort nicht
    // wegformuliert werden.
    const text = quelle("app/(site)/datenschutz/page.tsx");

    it("nennt den Zusatz an unseren eigenen Links", () => {
      expect(text).toMatch(/fester Zusatz an der Adresse/);
    });

    it("sagt, dass sich die Gemeinde daraus ablesen lässt", () => {
      expect(text).toMatch(/aus welcher Gemeinde/);
    });

    it("nennt Rechtsgrundlage und Widerspruchsrecht dazu", () => {
      const absatz = text.slice(
        text.indexOf("fester Zusatz an der Adresse"),
        text.indexOf("fester Zusatz an der Adresse") + 1400,
      );
      expect(absatz).toMatch(/Art\. 6 Abs\. 1 lit\. f/);
      expect(absatz).toMatch(/widersprechen/);
    });
  });
});
