import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { TRUST_SIGNALS } from "../trust-signals";
import { DATA_SOURCES } from "../data-sources";

// Die Vertrauens-Leiste steht unter JEDER Seite. Jede Aussage darin ist damit
// eine Werbeaussage auf der gesamten Site gleichzeitig (§ 5 UWG) — und keine
// davon ist im Browser als falsch erkennbar. Genau die Klasse, die der Betreiber
// nicht abnehmen kann. Deshalb hier der Mechanismus statt der Rückfrage.

const REPO = join(__dirname, "..", "..");

describe("Vertrauens-Leiste", () => {
  describe("Belegpflicht", () => {
    it("jeder Punkt nennt, wo er nachprüfbar ist", () => {
      for (const s of TRUST_SIGNALS) {
        expect(s.beleg.trim().length, `"${s.titel}" ohne Beleg`).toBeGreaterThan(10);
      }
    });

    it("jeder Punkt führt auf eine Seite, die es gibt", () => {
      for (const s of TRUST_SIGNALS) {
        const seite = join(REPO, "app", "(site)", s.href.replace(/^\//, ""), "page.tsx");
        expect(existsSync(seite), `${s.href} existiert nicht (Punkt "${s.titel}")`).toBe(true);
      }
    });

    it("die Texte sind ganze Sätze", () => {
      for (const s of TRUST_SIGNALS) {
        expect(s.text.endsWith("."), `"${s.titel}" endet nicht als Satz`).toBe(true);
      }
    });
  });

  // Die drei Institutionen im Quellen-Punkt sind namentlich beworben. Wird eine
  // Datenquelle ausgetauscht, muss der Satz mitwandern — sonst wirbt der Footer
  // mit einer Herkunft, die es nicht mehr gibt.
  describe("Genannte Quellen decken sich mit dem Datenquellen-Register", () => {
    const quellenPunkt = TRUST_SIGNALS.find((s) => s.icon === "quote");
    const alleNamen = Object.values(DATA_SOURCES)
      .map((q) => q.name)
      .join(" | ");

    it("der Quellen-Punkt existiert", () => {
      expect(quellenPunkt).toBeDefined();
    });

    it.each(["Bundesnetzagentur", "Fraunhofer ISE", "Kommission"])(
      "%s steht im Register",
      (name) => {
        expect(quellenPunkt!.text).toContain(name === "Kommission" ? "Kommission" : name);
        expect(alleNamen, `${name} ist keine unserer Datenquellen mehr`).toContain(name);
      },
    );
  });

  // Der Punkt wird IMMER gezeigt, sobald ein Stand vorliegt — auch ein alter
  // Die Leiste trug zwischenzeitlich EIN Prüfdatum für alles, gezogen aus dem
  // jüngsten Wächter-Lauf. Das ist raus: Wir prüfen in verschiedenen Takten
  // (Rechtsstände täglich, Marktpreise monatlich, CO₂-Preis jährlich), und ein
  // gemeinsames Datum behauptet den schnellsten Takt für den langsamsten Wert.
  // Der Test hält das fest, weil ein Datum an dieser Stelle jederzeit wieder
  // verlockend aussieht — es wirkt konkret und ist trotzdem falsch.
  describe("Kein gemeinsames Prüfdatum", () => {
    const alleTexte = TRUST_SIGNALS.map((s) => `${s.titel} ${s.text}`).join(" ");

    it("nennt kein Datum", () => {
      expect(alleTexte).not.toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/);
      expect(alleTexte).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it.each(["zuletzt am", "stand vom", "geprüft am"])(
      "kündigt mit '%s' keines an",
      (wendung) => {
        expect(alleTexte.toLowerCase()).not.toContain(wendung);
      },
    );

    // Dieselbe Begründung von der anderen Seite: Ohne Datum darf erst recht kein
    // Takt behauptet werden. Die Wächter laufen nur, wenn der Rechner des
    // Betreibers an ist — vom 09. bis 13.08.2026 lief fünf Tage keiner.
    it("behauptet keine Regelmäßigkeit", () => {
      for (const wort of ["laufend", "täglich", "regelmäßig", "fortlaufend", "ständig"]) {
        expect(
          alleTexte.toLowerCase(),
          `"${wort}" behauptet einen Takt, den niemand garantieren kann`,
        ).not.toContain(wort);
      }
    });

    // Der vierte Punkt verweist statt dessen auf die Seite, die je Größe einen
    // eigenen Stand führt. Fällt dieser Verweis weg, ist die Aussage heimatlos.
    it("verweist auf die Seite mit den einzelnen Ständen", () => {
      expect(TRUST_SIGNALS.some((s) => s.href === "/datenstand")).toBe(true);
    });
  });

  // Absolute Aussagen sind der Klassiker für Irreführung (§ 5 UWG) und müssten
  // einzeln gegen die Datenschutzerklärung geprüft werden. Solange keine drin
  // steht, kann diese Prüfung auch niemand vergessen.
  describe("Keine absoluten Aussagen", () => {
    it.each(["niemals", "immer", "100 %", "garantiert", "zu keiner Zeit"])(
      "'%s' kommt nicht vor",
      (wort) => {
        for (const s of TRUST_SIGNALS) {
          expect(`${s.titel} ${s.text}`.toLowerCase()).not.toContain(wort.toLowerCase());
        }
      },
    );

    // "Die Berechnung läuft in deinem Browser" ist wörtlich die Aussage der
    // Datenschutzerklärung. Ändert sich der Datenfluss, muss der Footer mit.
    it("die Browser-Aussage deckt sich mit der Datenschutzerklärung", () => {
      const punkt = TRUST_SIGNALS.find((s) => s.icon === "lock");
      expect(punkt!.text).toContain("Browser");
      const erklaerung = readFileSync(
        join(REPO, "app", "(site)", "datenschutz", "page.tsx"),
        "utf8",
      );
      expect(erklaerung).toContain("Berechnung läuft in deinem Browser");
    });
  });
});
