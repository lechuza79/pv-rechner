import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { TRUST_SIGNALS, pruefSignal, trustSignals, formatPruefdatum } from "../trust-signals";
import { DATA_SOURCES } from "../data-sources";

// Die Vertrauens-Leiste steht unter JEDER Seite. Jede Aussage darin ist damit
// eine Werbeaussage auf der gesamten Site gleichzeitig (§ 5 UWG) — und keine
// davon ist im Browser als falsch erkennbar. Genau die Klasse, die der Betreiber
// nicht abnehmen kann. Deshalb hier der Mechanismus statt der Rückfrage.

const REPO = join(__dirname, "..", "..");
const JETZT = new Date("2026-08-17T12:00:00Z");

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
  // (Vorgabe des Betreibers, 17.08.2026). Tragfähig ist das, weil die
  // Regelmäßigkeits-Behauptung aus dem Titel raus ist: Ein Stand-Datum ist bei
  // jedem Alter wahr, "laufend geprüft" wäre es nicht. Genau diese Trennung
  // hält der folgende Block fest.
  describe("Prüf-Punkt zeigt jeden Stand", () => {
    const vorTagen = (n: number) =>
      new Date(JETZT.getTime() - n * 86_400_000).toISOString();

    it("zeigt eine frische Prüfung", () => {
      const s = pruefSignal(vorTagen(1));
      expect(s).not.toBeNull();
      expect(s!.text).toContain("16.08.2026");
    });

    it.each([14, 30, 200])("zeigt auch einen %s Tage alten Stand", (tage) => {
      const s = pruefSignal(vorTagen(tage));
      expect(s, `Stand nach ${tage} Tagen darf nicht verschwinden`).not.toBeNull();
    });

    // Ohne diesen Test käme "laufend" bei der nächsten Textänderung zurück und
    // würde eine Regelmäßigkeit behaupten, die niemand garantieren kann: Die
    // Wächter laufen nur, wenn der Rechner des Betreibers an ist (09.–13.08.2026
    // lief fünf Tage keiner). Das Datum darf altern, der Satz darüber nicht lügen.
    it("behauptet keine Regelmäßigkeit", () => {
      const s = pruefSignal(vorTagen(200))!;
      const satz = `${s.titel} ${s.text}`.toLowerCase();
      for (const wort of ["laufend", "täglich", "regelmäßig", "fortlaufend", "ständig"]) {
        expect(satz, `"${wort}" behauptet einen Takt, den es nicht gibt`).not.toContain(wort);
      }
    });

    it("erfindet ohne Protokoll kein Datum", () => {
      expect(pruefSignal(null)).toBeNull();
      expect(pruefSignal("")).toBeNull();
      expect(pruefSignal("keine-zeit")).toBeNull();
    });

    it("hängt sich an die dauerhaften Punkte an", () => {
      expect(trustSignals(vorTagen(1))).toHaveLength(TRUST_SIGNALS.length + 1);
      expect(trustSignals(null)).toHaveLength(TRUST_SIGNALS.length);
    });
  });

  // Ein um einen Tag verschobenes Prüfdatum wäre genau der stille Fehler, gegen
  // den dieser Punkt existiert: Server (UTC) und Browser (Europe/Berlin) dürfen
  // nicht zwei verschiedene Daten anzeigen.
  describe("Datum ist zeitzonenfest", () => {
    it("nimmt den Kalendertag aus dem ISO-String", () => {
      expect(formatPruefdatum("2026-08-17T23:30:00Z")).toBe("17.08.2026");
      expect(formatPruefdatum("2026-01-01T00:15:00+02:00")).toBe("01.01.2026");
    });

    it("gibt bei Unbrauchbarem null zurück", () => {
      expect(formatPruefdatum("17.08.2026")).toBeNull();
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
