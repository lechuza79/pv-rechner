import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { TRUST_SIGNALS } from "../trust-signals";
import { DATA_SOURCES } from "../data-sources";
import { PRUEFSTAND } from "../pruefstand";

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

    // Der Detailtext ist das, was im Modal hinter der Zusage steht. Ohne ihn
    // öffnet der Punkt ein Fenster, das nichts erklärt — dann ist der Klick eine
    // Enttäuschung und die Zusage bleibt eine Behauptung.
    it("jeder Punkt wird im Modal ausgeführt", () => {
      for (const s of TRUST_SIGNALS) {
        expect(s.detail.trim().length, `"${s.titel}" ohne Ausführung`).toBeGreaterThan(80);
        expect(s.detail.endsWith("."), `"${s.titel}": Ausführung endet nicht als Satz`).toBe(true);
      }
    });
  });

  // Die Hervorhebung wird per Textsuche gesetzt (components/TrustBar → MitBetonung).
  // Trifft sie nicht, verschwindet sie stumm: Der Satz steht dann unbetont da,
  // niemandem fällt es auf, und die Absicht ist weg.
  describe("Hervorhebung", () => {
    it("kommt wörtlich im Satz vor", () => {
      for (const s of TRUST_SIGNALS) {
        if (!s.betont) continue;
        expect(s.text, `"${s.betont}" steht nicht in "${s.titel}"`).toContain(s.betont);
      }
    });

    it("hebt höchstens eine Stelle je Punkt hervor", () => {
      for (const s of TRUST_SIGNALS) {
        if (!s.betont) continue;
        const treffer = s.text.split(s.betont).length - 1;
        expect(treffer, `"${s.betont}" kommt in "${s.titel}" mehrfach vor`).toBe(1);
      }
    });
  });

  // Externe Belege sind der Teil, den ein Leser selbst nachprüfen kann. Ein
  // toter oder unsicherer Link wäre schlimmer als keiner: Er sieht aus wie ein
  // Nachweis und ist keiner.
  describe("Externe Belege", () => {
    it("sind über HTTPS erreichbar und tragen eine Beschriftung", () => {
      for (const s of TRUST_SIGNALS) {
        if (!s.belegUrl) continue;
        expect(s.belegUrl, `"${s.titel}": Beleg nicht über HTTPS`).toMatch(/^https:\/\//);
        expect(s.belegLabel?.trim().length ?? 0, `"${s.titel}": Beleg ohne Beschriftung`)
          .toBeGreaterThan(3);
      }
    });

    it("verlinken nicht auf uns selbst", () => {
      for (const s of TRUST_SIGNALS) {
        if (!s.belegUrl) continue;
        expect(s.belegUrl, `"${s.titel}": eigener Link als externer Beleg ausgegeben`).not.toContain(
          "solar-check.io",
        );
      }
    });
  });

  // Wer namentlich genannt wird, muss auch eine unserer Quellen sein — und die
  // Nennung darf nicht abschließend klingen.
  //
  // Der Satz zählte bis zum Audit am 17.08.2026 drei Institutionen auf, als wäre
  // das die Liste. Die Leiste steht aber auch unter dem Wärmepumpen- und dem
  // Klimarechner, deren Zahlen von Verbraucherzentrale, KfW, dena, test.de und
  // ADAC stammen — dort war die Aufzählung schlicht falsch. Dazu kam ein
  // Etikettenfehler: "amtlich" über einem privaten Forschungsinstitut.
  describe("Genannte Quellen decken sich mit dem Datenquellen-Register", () => {
    const quellenPunkt = TRUST_SIGNALS.find((s) => s.icon === "quote");
    const alleNamen = Object.values(DATA_SOURCES)
      .map((q) => q.name)
      .join(" | ");

    it("der Quellen-Punkt existiert", () => {
      expect(quellenPunkt).toBeDefined();
    });

    it("jede namentlich genannte Stelle ist eine unserer Quellen", () => {
      // Großgeschriebene Eigennamen aus dem Satz ziehen, Satzanfang ignorieren.
      const genannt = (quellenPunkt!.text.match(/(?<!^)(?<![.:]\s)\b[A-ZÄÖÜ][a-zäöüß]{3,}/g) ?? [])
        .filter((w) => !["Woher", "Zahl", "Forschung"].includes(w));
      for (const name of genannt) {
        expect(alleNamen, `"${name}" wird beworben, steht aber nicht im Quellen-Register`).toContain(
          name,
        );
      }
    });

    it("nennt kein Etikett, das nicht für alle Genannten stimmt", () => {
      // "amtlich" trug den Fehler: Fraunhofer ISE ist eine private
      // Forschungsorganisation, und die Klima-/WP-Quellen sind es erst recht.
      expect(`${quellenPunkt!.titel} ${quellenPunkt!.text}`.toLowerCase()).not.toMatch(
        /amtlich|behördlich|staatlich/,
      );
    });
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
    // "regelmäßig" ist seit dem 18.08.2026 ERLAUBT und belegt: PRUEFSTAND führt
    // je Größe den zuständigen Wächter, seinen Rhythmus und die Frist, und
    // `npm run stand:faellig` meldet, wenn einer stillsteht. Das Modal zeigt
    // dieselbe Liste. Verboten bleiben die Wörter, die einen KONKRETEN Takt oder
    // einen Zustand behaupten — die Wächter laufen nur, wenn der Rechner des
    // Betreibers an ist (09.–13.08.2026 lief fünf Tage keiner).
    it("behauptet keinen konkreten Takt und keinen Zustand", () => {
      for (const wort of ["täglich", "stündlich", "immer aktuell", "stets aktuell", "lückenlos"]) {
        expect(
          alleTexte.toLowerCase(),
          `"${wort}" behauptet mehr, als die Wächter-Läufe hergeben`,
        ).not.toContain(wort);
      }
    });

    // Und wo "regelmäßig" steht, muss es die Liste geben, die es belegt.
    it("der Prüf-Punkt ist durch den Prüfstand gedeckt", () => {
      const pruefPunkt = TRUST_SIGNALS.find((s) => s.text.toLowerCase().includes("regelmäßig"));
      if (!pruefPunkt) return; // kein Anspruch erhoben, nichts zu belegen
      expect(PRUEFSTAND.length, "kein Prüfstand — dann ist 'regelmäßig' unbelegt").toBeGreaterThan(
        3,
      );
      for (const e of PRUEFSTAND) {
        expect(e.rhythmus.trim().length, `"${e.was}" ohne Rhythmus`).toBeGreaterThan(3);
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
    // Die Liste hieß bis zum Audit am 17.08.2026 "niemals / immer / 100 % /
    // garantiert / zu keiner Zeit" — und traf damit KEINES der beiden absoluten
    // Wörter, die tatsächlich dastanden ("Alle Annahmen", "jeder Wert"). Eine
    // Schranke, die nur Wörter verbietet, die ohnehin niemand schreibt, ist
    // schlimmer als keine: Sie läuft grün und erzeugt Sicherheit.
    //
    // "kein" fehlt hier bewusst: "kein Konto, kein Verkaufskontakt" ist eine
    // Verneinung über unser eigenes Verhalten, die wir belegen können — anders
    // als eine Allaussage über Daten, für die wir nicht einstehen können.
    it.each([
      "alle ",
      "jeder wert",
      "jede annahme",
      "sämtliche",
      "vollständig offen",
      "niemals",
      "immer",
      "100 %",
      "garantiert",
      "zu keiner Zeit",
    ])("'%s' kommt nicht vor", (wort) => {
      for (const s of TRUST_SIGNALS) {
        expect(
          `${s.titel} ${s.text}`.toLowerCase(),
          `"${s.titel}" macht eine Allaussage — die Seite dahinter muss sie halten können`,
        ).not.toContain(wort.toLowerCase());
      }
    });

    // Der Satz, der im Audit als schwerster Befund fiel: Er stand auf jeder
    // Seite und war ausgerechnet auf der Seite falsch, auf die er verlinkt.
    // Die Formulierung wanderte über drei Fassungen ("alle Werte" → "alle
    // Annahmen" → …), deshalb wird hier auf das Muster geprüft, nicht auf den
    // Wortlaut.
    it("behauptet keine vollständige Offenlegung", () => {
      for (const s of TRUST_SIGNALS) {
        expect(
          `${s.titel} ${s.text}`.toLowerCase(),
          `"${s.titel}" verspricht Vollständigkeit — /datenstand hält Modell-Datensätze zurück`,
        ).not.toMatch(/(alle|jede[rs]?|sämtliche)\s+\w*\s*(werte?|annahmen|zahlen)/);
      }
    });

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
