import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NACHWEIS_JAHRE, UNBESTAETIGT_MAX_TAGE } from "../gemeinde-abo";
import { aboBestaetigungsMail } from "../abo-mail";

// Die Datenschutzerklärung ist eine ZUSAGE, keine Bestandsaufnahme — und die
// gefährlichsten Falschaussagen des Projekts standen genau dort („keine
// Nutzer-Accounts, keine Cookies", während es beides gab).
//
// Dieser Test hält die veröffentlichten Sätze über das Abo gegen den Code, der
// sie einlösen muss. Er prüft auf die AUSSAGE per Muster, nicht auf den
// Wortlaut: Eine frühere Fassung eines solchen Tests verbot „alle Werte, mit
// denen wir rechnen", während die Seite „alle Annahmen" sagte — ein Wort
// daneben, Test grün, Falschaussage auf jeder Seite.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/**
 * Fließtext im JSX bricht um, wo Prettier es für richtig hält.
 *
 * Ein Test, der einen Satz als EINE Zeile sucht, prüft damit die Formatierung
 * und nicht die Aussage — er wird bei einem Prettier-Lauf rot und lässt eine
 * echte Änderung durch, sobald sie den Umbruch mitverschiebt. Deshalb wird der
 * Text vor dem Vergleich auf einfache Leerzeichen normalisiert.
 */
const fliessend = (s: string) => s.replace(/\s+/g, " ");

describe("Was die Datenschutzerklärung über das Abo zusagt", () => {
  const dse = fliessend(lies("app/(site)/datenschutz/page.tsx"));

  /**
   * NUR der Abo-Abschnitt.
   *
   * Gegen das ganze Dokument geprüft, ist jede Aussage über das Abo wertlos,
   * sobald dieselben Wörter woanders vorkommen — und sie kommen vor: Die
   * Rechtsgrundlage für berechtigte Interessen steht mehrfach in der Erklärung,
   * für ganz andere Verarbeitungen. In der Gegenprobe ließ sich die
   * Rechtsgrundlage aus dem Abo-Abschnitt löschen, ohne dass der Test rot
   * wurde. Er belegte eine Aussage mit dem Text einer fremden.
   */
  const abschnitt = (() => {
    const von = dse.indexOf("16. Meldungen zu einer Gemeinde");
    if (von < 0) throw new Error("Abschnitt 16 nicht gefunden");
    const bis = dse.indexOf("<h2", von + 10);
    return dse.slice(von, bis > 0 ? bis : undefined);
  })();

  it("hat überhaupt einen Abschnitt dazu", () => {
    // Das Kontaktformular stand einen Tag nach seinem Livegang mit keinem Wort
    // in der Erklärung. Dieselbe Lücke soll hier nicht entstehen.
    expect(abschnitt).toMatch(/Meldungen zu einer Gemeinde/);
  });

  it("nennt das Bestätigungsverfahren und die Einwilligung als Grundlage", () => {
    expect(abschnitt).toMatch(/Bestätigungsverfahren/);
    expect(abschnitt).toMatch(/Art\.\s*6\s*Abs\.\s*1\s*lit\.\s*a\s*DSGVO/);
  });

  it("sagt die Löschung nicht bestätigter Eintragungen zu — und der Code kann sie", () => {
    expect(abschnitt).toMatch(/Klickst du nicht, wird die Eintragung gelöscht/);
    // Ohne eine endliche Frist im Code wäre der Satz eine Absichtserklärung.
    expect(UNBESTAETIGT_MAX_TAGE).toBeGreaterThan(0);
    expect(UNBESTAETIGT_MAX_TAGE).toBeLessThanOrEqual(30);
  });

  it("nennt die Nachweisfrist so, wie der Code sie rechnet", () => {
    // ZWÖLF MONATE AB ABMELDUNG WAR ZWEIMAL FALSCH (Council 01.09.2026): das
    // falsche Ereignis (der Anspruch entsteht mit der Mail, nicht mit der
    // Abmeldung — § 31 Abs. 3 S. 1 OWiG, § 199 Abs. 1 BGB) und die zu kurze
    // Länge (drei Jahre nach DSK-Orientierungshilfe Ziff. 3.7, die die
    // Nachweisfähigkeit ausdrücklich auch nach dem Widerruf verlangt).
    expect(abschnitt).toMatch(/31\. Dezember des dritten Jahres/);
    expect(abschnitt).toMatch(/zuletzt geschrieben/);
    expect(NACHWEIS_JAHRE).toBe(3);

    // Und die widerlegten Fassungen dürfen nicht zurückkommen — samt der
    // Sperrlisten-Begründung, die in einem einwilligungsbasierten Verteiler
    // keine tragfähige Grundlage hat (DSK Ziff. 5.1).
    expect(abschnitt).not.toMatch(/nach zwölf Monaten wird der Eintrag entfernt/);
    expect(abschnitt).not.toMatch(/nicht versehentlich wieder auf die Liste/);
  });

  it("nennt die andere Rechtsgrundlage für den Nachweis", () => {
    // DSK Ziff. 3.7, wörtlich: „Rechtsgrundlage ist insoweit gerade nicht
    // Art. 6 Abs. 1 lit. a DS-GVO." Fehlt der Satz, liest sich die
    // fortgesetzte Aufbewahrung als Teil der Einwilligung — und die ist
    // widerrufen.
    expect(abschnitt).toMatch(/nicht mehr deine Einwilligung/);
    expect(abschnitt).toMatch(/Art\. 6 Abs\. 1 lit\. c/);
    expect(abschnitt).toMatch(/Art\. 17 Abs\. 3/);
  });

  it("beschreibt die IP-Verarbeitung so, wie sie stattfindet", () => {
    // DIESER TEST PRÜFTE DIE FALSCHE STELLE (Legal-Judge, 01.09.2026). Er sah
    // nach, ob eine IP in die DATENBANK geschrieben wird — sie wird es nicht.
    // Widerlegt wurde die veröffentlichte Zusage aber vom ARBEITSSPEICHER: Die
    // Ratenbegrenzung hält die volle Adresse eine Stunde lang als Schlüssel in
    // einer Map, und Halten im Arbeitsspeicher ist Speicherung nach Art. 4
    // Nr. 2 DSGVO. Der Test war grün, der Satz „deine IP-Adresse speichern wir
    // dabei nicht" stand falsch auf der Seite.
    //
    // Die Erklärung beschreibt dieselbe Mechanik drei Abschnitte höher für das
    // Kontaktformular völlig richtig — es fehlte nur hier.
    const ablage = lies("lib/gemeinde-abo.ts");
    const anmelden = lies("app/api/abo/anmelden/route.ts");

    // Weiterhin richtig und weiterhin geprüft: nichts davon in die Ablage.
    expect(ablage).not.toMatch(/\bip\b\s*:/i);
    expect(anmelden).not.toMatch(/insert\([^)]*\bip\b/i);

    // NEU und der Kern: Liest die Route eine Herkunft, MUSS die Erklärung die
    // Zwischenspeicherung nennen — samt Rechtsgrundlage und Widerspruchsweg,
    // denn sie läuft auf berechtigtem Interesse, nicht auf der Einwilligung.
    const liestHerkunft = /x-real-ip|x-forwarded-for/.test(anmelden);
    if (liestHerkunft) {
      expect(abschnitt).toMatch(/IP-Adresse speichern wir nicht am Abo/);
      expect(abschnitt).toMatch(/kurzzeitig im\s+Arbeitsspeicher/);
      expect(abschnitt).toMatch(/Art\.\s*6\s*Abs\.\s*1\s*lit\.\s*f\s*DSGVO/);
      expect(abschnitt).toMatch(/Art\.\s*21\s*DSGVO/);
    }
    // Und die widerlegte Fassung darf nicht zurückkommen.
    expect(abschnitt).not.toMatch(/IP-Adresse speichern wir dabei nicht/);
  });

  it("zählt die Angaben nicht ab", () => {
    // „genau zwei Angaben" stand über einer Tabelle mit zwölf Spalten, von
    // denen die Erklärung vier in den nächsten Absätzen selbst nachreicht — der
    // Satz widersprach sich also innerhalb desselben Abschnitts. Dieselbe
    // Fehlerklasse wie „in zwei Fällen" (es waren vier): Eine abgezählte
    // Aufzählung wird beim nächsten Feld still falsch.
    expect(abschnitt).not.toMatch(
      /genau (zwei|drei|vier|zwölf) Angaben|alle (zwei|drei|vier) Angaben/,
    );
  });

  it("nennt jede Spalte, die die Tabelle wirklich führt", () => {
    // DER ABGLEICH, DER DEN FEHLER OBEN GEFANGEN HÄTTE. Er liest die
    // Spaltennamen aus der Tabellendefinition statt aus einer zweiten Liste —
    // eine zweite Liste würde beim nächsten Feld vergessen.
    //
    // Wer eine Spalte ergänzt, trägt sie hier ein: entweder mit dem Wortlaut,
    // der sie in der Erklärung nennt, oder mit einem Grund, warum sie dort
    // nichts zu suchen hat.
    const setup = lies("app/api/abo/setup/route.ts");
    const bereich = setup.slice(
      setup.indexOf("CREATE TABLE IF NOT EXISTS public.gemeinde_abos"),
      setup.indexOf("CREATE UNIQUE INDEX"),
    );
    const spalten = new Set<string>();
    for (const m of bereich.matchAll(/^\s*([a-z_]+)\s+(text|timestamptz|boolean|uuid|text\[\])/gm)) {
      spalten.add(m[1]);
    }
    for (const m of setup.matchAll(/ADD COLUMN IF NOT EXISTS\s+([a-z_]+)/g)) {
      spalten.add(m[1]);
    }
    expect(spalten.size).toBeGreaterThan(8); // sonst hat der Test nichts gelesen

    // Was die Erklärung nennen MUSS, und woran man es erkennt.
    const genannt: Record<string, RegExp> = {
      email: /E-Mail-Adresse/,
      region_id: /den <strong>Ort<\/strong>/,
      erstellt_am: /Zeitpunkte deiner Eintragung/,
      bestaetigt_am: /deiner\s+Bestätigung/,
      abgemeldet_am: /einer etwaigen Abmeldung/,
      letzte_mail_am: /zuletzt versendeten\s+Meldung/,
      quelle: /auf welcher Seite du dich eingetragen/,
      ueber_brief: /über ein Anschreiben an die Gemeinde/,
      techniken: /für welche Techniken du dich interessierst/,
      aus_verwaltung: /für die Stadt- oder Gemeindeverwaltung arbeitest/,
      einwilligung_version: /Fassung des Textes<\/strong>, den du/,
      versand_beleg: /Bestätigungsmail angenommen/,
    };
    // Technische Felder ohne eigenen Aussagegehalt — mit ausgeschriebenem Grund.
    const ohneAussage: Record<string, string> = {
      id: "Zufallskennung der Zeile, sagt über die Person nichts aus",
      status: "Zustand des Abos selbst (ausstehend/bestätigt/abgemeldet), im Text als Verfahren beschrieben",
    };

    for (const spalte of spalten) {
      if (spalte in ohneAussage) continue;
      const muster = genannt[spalte];
      expect(
        muster,
        `Die Tabelle führt „${spalte}", der Test kennt die Spalte nicht. Trag sie ein — mit dem Wortlaut, der sie in der Datenschutzerklärung nennt, oder mit einem Grund in der Ausnahmeliste.`,
      ).toBeDefined();
      expect(abschnitt, `Spalte „${spalte}" wird im Abo-Abschnitt der Datenschutzerklärung nicht genannt`).toMatch(muster!);
    }
  });

  it("sagt zu, dass keine Zählpixel in den Mails stecken — und es steckt keiner drin", () => {
    expect(dse).toMatch(/<strong>keine Zählpixel<\/strong>/);
    const mail = lies("lib/abo-mail.ts");

    // EIN ZÄHLPIXEL IST NICHT „EIN BILD", SONDERN EIN BILD MIT KENNUNG.
    // Die erste Fassung verbot jedes <img> — das war einfach zu prüfen und
    // eine Stufe zu grob: Mit dem Logo im Kopf wurde sie rot, obwohl sich an
    // der Zusage nichts geändert hatte. Was die Zusage wirklich trägt: Keine
    // Bildadresse darf etwas enthalten, das einen Empfänger unterscheidet.
    const bilder = [...mail.matchAll(/<img\s[^>]*src="([^"]*)"/gi)].map((m) => m[1]);
    expect(bilder.length).toBeGreaterThan(0); // sonst prüft der Test nichts
    for (const src of bilder) {
      // Keine eingesetzten Werte in der Adresse — ein Platzhalter wäre der Weg,
      // auf dem eine Kennung hineinkäme.
      expect(src.replace("${SITE}", "")).not.toMatch(/\$\{/);
      expect(src).not.toMatch(/\?/); // kein Abfrageteil, in dem eine Kennung stünde
    }
  });

  it("nennt die Herkunftsangabe, die wir am Abo speichern", () => {
    // Seit 31.08.2026 merken wir uns, WO jemand sich eingetragen hat (Atlas-
    // oder Förderseite) und ob der Aufruf über ein Anschreiben kam. Das sind
    // zwei zusätzliche Angaben an einer E-Mail-Adresse — und was wir speichern,
    // steht in der Erklärung, sonst ist sie unvollständig.
    expect(dse).toMatch(/auf welcher Seite du dich eingetragen hast/);
    expect(dse).toMatch(/über ein Anschreiben an die Gemeinde/);
  });

  it("nennt die Technik-Auswahl des Förder-Abos", () => {
    expect(dse).toMatch(/für welche Techniken du dich interessierst/);
    // Und den Zweck: Sie dient der Auswahl der Meldungen, nicht der Auswertung.
    expect(dse).toMatch(/keine Meldungen zu schicken, die dich nicht betreffen/);
  });

  it("verspricht die Abmeldung mit einem Klick ohne Anmeldung", () => {
    expect(dse).toMatch(/jederzeit abmelden/);
    expect(dse).toMatch(/ohne Anmeldung/);
  });
});

describe("Was die Bestätigungsmail zusagt", () => {
  const mail = aboBestaetigungsMail({
    ortName: "Musterdorf",
    bestaetigenUrl: "https://solar-check.io/abo/bestaetigen?t=x.1.y",
  });

  it("sagt, dass ohne Klick nichts passiert — und dass die Eintragung verfällt", () => {
    expect(mail.html).toMatch(/Ohne diesen Klick verschicken wir nichts/);
    expect(mail.html).toMatch(/von selbst gelöscht/);
  });

  it("nennt die Gültigkeitsdauer des Links", () => {
    expect(mail.html).toMatch(/48 Stunden/);
  });
});
