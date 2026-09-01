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

  // Was die Leiste über Datenflüsse sagt, muss zu dem passen, was der Rechner
  // tatsächlich sendet.
  //
  // Am 18.08.2026 stand im Modal: "Anlagengröße, Verbrauch und Ergebnis bleiben
  // bei dir." Gemessen ging bei jedem Ergebnis ein anonymes Ereignis mit genau
  // diesen Werten an die Reichweitenmessung — und die Datenschutzerklärung, auf
  // die derselbe Punkt verlinkt, beschrieb das korrekt. Die Leiste sagte das
  // Gegenteil, auf jeder Seite der Site.
  //
  // Der bestehende Test konnte das nicht sehen: Er prüfte `detail` nur auf Länge
  // und Schlusspunkt, und die Datenschutz-Prüfung suchte lediglich eine
  // Zeichenkette. Dieser Block liest stattdessen die Ereignis-Eigenschaften aus
  // dem Rechner und hält sie gegen den Text.
  describe("Aussagen über Datenflüsse", () => {
    const datenPunkt = TRUST_SIGNALS.find((s) => s.icon === "lock")!;
    const rechner = readFileSync(
      join(REPO, "app", "(site)", "photovoltaik-rechner", "rechner.tsx"),
      "utf8",
    );

    it("behauptet nichts als rein lokal, was als Ereignis rausgeht", () => {
      // Seit 27.08.2026 tragen Ereignisse GAR KEINE Eigenschaften mehr — daran
      // hängt die Einwilligungsfreiheit der Messung
      // (docs/lehren/reichweitenmessung-einwilligung-2026-08.md). Damit kann
      // dieser Widerspruch nicht mehr entstehen, und der Test prüft die
      // Voraussetzung dafür statt den Einzelfall: Wenn wieder Werte mitgehen,
      // wird er rot und der Satz der Leiste gehört erneut geprüft.
      const mitEigenschaften = [
        ...rechner.matchAll(/trackEvent\(\s*[^)]*,/g),
      ];
      expect(
        mitEigenschaften.map((m) => m[0]),
        "Ein Ereignis trägt wieder Eigenschaften — Aussage der Vertrauens-Leiste neu prüfen",
      ).toEqual([]);

      // Und die Leiste darf weiterhin nicht behaupten, Rechenwerte blieben auf
      // dem Gerät, solange irgendein Ereignis den Browser verlässt.
      const behauptetLokal =
        /bleib(en|t) bei dir|verlassen? (dein|Ihr) Gerät nicht|nur auf deinem Gerät/i.test(
          datenPunkt.detail,
        );
      const nenntRechenwerte = /Anlagen|Speicher/.test(datenPunkt.detail);
      expect(behauptetLokal && nenntRechenwerte).toBe(false);
    });

    it("sagt kein 'nur' über das, was den Browser verlässt", () => {
      // Die Postleitzahl geht außer an Ertrag und Wetter auch an die
      // Förderabfrage und die Sonnenanzeige — ein "nur" davor ist falsch.
      expect(
        datenPunkt.detail,
        "'nur' vor der Aufzählung gesendeter Daten — die Liste ist erfahrungsgemäß unvollständig",
      ).not.toMatch(/geht nur|nur, was/);
    });

    // Der Punkt verlinkt auf die Datenschutzerklärung. Sagt die etwas über
    // erfasste Eckdaten, darf die Leiste das nicht verschweigen.
    it("verschweigt nicht, was die Datenschutzerklärung einräumt", () => {
      const erklaerung = readFileSync(
        join(REPO, "app", "(site)", "datenschutz", "page.tsx"),
        "utf8",
      );
      if (!/Anlagen- oder Speichergröße/.test(erklaerung)) return;
      expect(
        datenPunkt.detail,
        "die Erklärung nennt erfasste Eckdaten, die Leiste erwähnt sie nicht",
      ).toMatch(/Reichweitenmessung|anonym/);
    });
  });

  // Die Quellen-Links werden per Textsuche im Satz platziert. Trifft ein Begriff
  // nicht, fällt der Link stumm aus: Der Name steht dann unverlinkt da, niemandem
  // fällt es auf, und die Nachprüfbarkeit ist weg — dieselbe Falle wie bei der
  // Hervorhebung.
  describe("Quellen-Links im Satz", () => {
    const mitLinks = TRUST_SIGNALS.filter((s) => s.links?.length);

    it("jeder Begriff kommt wörtlich im Satz vor", () => {
      for (const s of mitLinks) {
        for (const l of s.links!) {
          expect(s.text, `"${l.begriff}" steht nicht in "${s.titel}"`).toContain(l.begriff);
        }
      }
    });

    // Deckungsgleich ist erlaubt und der Regelfall: Der Name der Quelle ist
    // zugleich das hervorgehobene Wort, der Renderer legt dann beides auf ein
    // Element. Verboten ist die TEILWEISE Überschneidung — daraus würde ein
    // Element im Element, also nicht bedienbar und kein gültiges Markup. Der
    // Renderer verwirft so etwas still; dieser Test macht es sichtbar.
    it("überschneidet sich mit der Hervorhebung höchstens vollständig", () => {
      for (const s of mitLinks) {
        if (!s.betont) continue;
        const bStart = s.text.indexOf(s.betont);
        const bEnde = bStart + s.betont.length;
        for (const l of s.links!) {
          const lStart = s.text.indexOf(l.begriff);
          const lEnde = lStart + l.begriff.length;
          const beruehrt = lStart < bEnde && lEnde > bStart;
          const deckungsgleich = lStart === bStart && lEnde === bEnde;
          expect(
            beruehrt && !deckungsgleich,
            `"${l.begriff}" und die Hervorhebung "${s.betont}" überlappen teilweise in "${s.titel}" — das ergäbe ein Element im Element`,
          ).toBe(false);
        }
      }
    });

    // Die URLs stammen aus lib/data-sources.ts. Wird eine Quelle dort
    // ausgetauscht, muss der Link mitwandern — hier fällt es auf.
    it("zeigt auf eine Adresse aus dem Quellen-Register", () => {
      const registerUrls = Object.values(DATA_SOURCES)
        .map((q) => q.url)
        .filter(Boolean) as string[];
      const quellenPunkt = TRUST_SIGNALS.find((s) => s.icon === "quote");
      for (const l of quellenPunkt?.links ?? []) {
        expect(
          registerUrls,
          `"${l.begriff}" verlinkt auf eine Adresse, die im Quellen-Register nicht vorkommt`,
        ).toContain(l.url);
      }
    });

    it("führt aus dem Haus heraus und über HTTPS", () => {
      for (const s of mitLinks) {
        for (const l of s.links!) {
          expect(l.url, `"${l.begriff}": kein HTTPS`).toMatch(/^https:\/\//);
          expect(l.url, `"${l.begriff}": zeigt auf uns selbst`).not.toContain("solar-check.io");
        }
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

    // Muster statt Wortliste: Die Regel verbietet die AUSSAGE „hier steht ein
    // Prüfdatum", nicht drei Formulierungen davon. Eine Liste aus „zuletzt am /
    // stand vom / geprüft am" ließ „zuletzt geprüft", „Stand: …" und
    // „aktualisiert am" durch — dieselbe Fehlerklasse, wegen der diese Datei
    // überhaupt auf Muster prüft (ein Wort daneben, Test grün, Falschaussage live).
    it("kündigt kein Prüfdatum an", () => {
      expect(alleTexte.toLowerCase()).not.toMatch(
        /\b(zuletzt|stand|geprüft|aktualisiert|erhoben|nachgesehen)\s*[:,]?\s*(am|vom|seit)\b/,
      );
    });

    // Dieselbe Begründung von der anderen Seite: Ohne Datum darf erst recht kein
    // Takt behauptet werden. Die Wächter laufen nur, wenn der Rechner des
    // Betreibers an ist — vom 09. bis 13.08.2026 lief fünf Tage keiner.
    // "regelmäßig" ist seit dem 18.08.2026 ERLAUBT und belegt: PRUEFSTAND führt
    // je Größe den zuständigen Wächter, seinen Rhythmus und die Frist, und
    // `npm run stand:faellig` meldet, wenn einer stillsteht. Das Modal zeigt
    // dieselbe Liste. Verboten bleiben die Wörter, die einen KONKRETEN Takt oder
    // einen Zustand behaupten — die Wächter laufen nur, wenn der Rechner des
    // Betreibers an ist (09.–13.08.2026 lief fünf Tage keiner).
    // Muster statt Wortliste, aus demselben Grund: „täglich" zu verbieten und
    // „jeden Tag" durchzulassen sichert nichts ab.
    it("behauptet keinen konkreten Takt", () => {
      const takt =
        /\b(täglich|stündlich|wöchentlich|monatlich|jede[nr]?\s+(tag|stunde|woche|minute)|rund um die uhr|24\s*\/\s*7|lückenlos|in echtzeit|permanent|ununterbrochen|durchgehend)\b/;
      const treffer = alleTexte.toLowerCase().match(takt);
      expect(
        treffer?.[0] ?? null,
        `behauptet einen Takt, den die Wächter-Läufe nicht hergeben (sie laufen nur, wenn der Rechner des Betreibers an ist)`,
      ).toBeNull();
    });

    // "Immer aktuell" ist als ÜBERSCHRIFT gewollt (Betreiber-Vorgabe
    // 18.08.2026) — aber nur zusammen mit dem Satz darunter, der sagt, was wir
    // dafür tun. Allein wäre die Überschrift eine Zustandsbehauptung über jeden
    // Wert zu jedem Zeitpunkt; die Wächter laufen jedoch nur, wenn der Rechner
    // des Betreibers an ist (09.–13.08.2026 lief fünf Tage keiner).
    //
    // Der Test hält deshalb die PAARUNG fest, nicht das Wort. Wer die
    // Überschrift behält und den Satz umschreibt, bekommt Rot.
    it("ein Aktualitäts-Versprechen im Titel wird vom Satz eingelöst", () => {
      const versprechen = TRUST_SIGNALS.filter((s) =>
        /aktuell|immer|stets/i.test(s.titel),
      );
      for (const s of versprechen) {
        expect(
          s.text.toLowerCase(),
          `"${s.titel}" verspricht Aktualität, ohne zu sagen, was wir dafür tun`,
        ).toMatch(/prüfen|geprüft|nachgeprüft/);
        expect(
          s.text.toLowerCase(),
          `"${s.titel}" nennt keine Einschränkung — ohne "regelmäßig" o. Ä. ist es eine Zustandsbehauptung`,
        ).toMatch(/regelmäßig|laufend/);
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
    // EIN Muster statt einer Wortliste. Eine Liste fängt nur die Beugungen, an
    // die jemand beim Schreiben des Tests gedacht hat: "alle " ließ "alles"
    // durch, "sämtliche" ließ "sämtlicher" durch. Die Regel verbietet die
    // ALLAUSSAGE, nicht ihre Schreibweisen.
    //
    // "immer" fehlt bewusst: "Immer aktuell" ist als Titel gewollt und wird vom
    // Paarungs-Test oben schärfer abgesichert — er verlangt die Einlösung im
    // Satz darunter.
    // "kein" fehlt ebenso bewusst: "kein Konto, kein Verkaufskontakt" ist eine
    // Verneinung über unser eigenes Verhalten, die wir belegen können — anders
    // als eine Allaussage über Daten, für die wir nicht einstehen können.
    it("macht keine Allaussage", () => {
      const allaussage =
        /\b(alle[nrsm]?|alles|jede[nrsm]?|sämtliche[nrsm]?|ausnahmslos|restlos|durchweg|vollständig|lückenlos|niemals|garantiert|zu keiner zeit|100\s*%)\b/;
      for (const s of TRUST_SIGNALS) {
        const treffer = `${s.titel} ${s.text}`.toLowerCase().match(allaussage);
        expect(
          treffer?.[0] ?? null,
          `"${s.titel}" macht eine Allaussage — die Seite dahinter muss sie halten können`,
        ).toBeNull();
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

    // DIE GEGENRICHTUNG — sie hat gefehlt, und genau dort ist der Fehler
    // passiert (29.08.2026).
    //
    // Alle Prüfungen oben fragen: Verschweigt die Leiste etwas? Keine fragte:
    // Behauptet sie etwas, das es nicht gibt. Seit dem 27.08.2026 nimmt
    // `trackEvent` keine Begleitangaben mehr entgegen — die
    // Einwilligungsfreiheit der ganzen Messung hängt daran. Die Leiste kündigte
    // trotzdem weiter an, wir zählten mit, "welche Anlagen- und Speichergröße
    // gewählt wurde". Auf jeder Seite, als Werbeaussage nach § 5 UWG.
    //
    // Geprüft wird gegen die SIGNATUR im Code, nicht gegen eine Wortliste: Nimmt
    // die Zählfunktion nur einen Namen, darf die Leiste keine Erhebung von
    // Werten ankündigen. Wer die Signatur eines Tages wieder erweitert, bekommt
    // die Formulierung damit automatisch wieder frei.
    it("kündigt keine Erhebung an, die die Zählfunktion gar nicht kann", () => {
      const analytics = readFileSync(join(REPO, "lib", "analytics.ts"), "utf8");
      const signatur = analytics.match(/export function trackEvent\(([^)]*)\)/);
      expect(signatur, "trackEvent nicht gefunden — Test anpassen").toBeTruthy();
      const nimmtNurNamen = !signatur![1].includes(",");
      if (!nimmtNurNamen) return; // Signatur erweitert: Ankündigung wieder erlaubt.

      for (const s of TRUST_SIGNALS) {
        const text = `${s.titel} ${s.text} ${s.detail ?? ""}`.toLowerCase();
        expect(
          text,
          `"${s.titel}" kündigt an, WELCHE Angaben mitgezählt werden — die Zählfunktion nimmt aber nur einen Namen`,
        ).not.toMatch(/(zählen|erfassen|messen|übermitteln)\s+wir[^.]{0,60}\bwelche\b/);
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
