import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  BEG_ANTRAG_ANKER,
  BEG_ANTRAG_FRISTEN,
  BEG_ANTRAG_HREF,
  BEG_ANTRAG_KURZ,
  BEG_ANTRAG_SCHRITTE,
  BEG_ANTRAG_STAND,
  BEG_ANTRAG_GELTUNGSBEREICH,
  BEG_EIGENLEISTUNG,
  BEG_KEINE_AUFSTOCKUNG,
  BEG_VORHABENBEGINN,
} from "../beg-antrag";

/**
 * Realitäts-Anker für die Reihenfolge der BEG-Antragstellung.
 *
 * Beide Quellen am 25.08.2026 im Volltext im Repo gelesen:
 *   docs/quellen/KfW-Merkblatt-458_BEG-Heizungsfoerderung_2026-07.pdf
 *   docs/quellen/BEG-EM-Richtlinie_2026-07-17.pdf
 *
 * Der Test hält drei Sorten fest, jede aus einem konkreten Risiko:
 *   1. den GELTUNGSBEREICH der Ausschlussregel — sie hängt an der
 *      Antragstellung, nicht an der Zusage. Die verbreitete Verschärfung
 *      („nichts kaufen, bevor die KfW bewilligt hat") behauptet einen
 *      Förderausschluss, den die Richtlinie ausdrücklich verneint.
 *   2. die ENTWARNUNG — Planung und Beratung dürfen vorher. Fällt sie weg,
 *      ist der Abschnitt in der anderen Richtung falsch und schreckt vor dem
 *      Schritt ab, der als erster kommen muss.
 *   3. die EINE QUELLE — kein Aufrufer tippt den Satz ein zweites Mal.
 */
const REPO = join(__dirname, "..", "..");
const lies = (p: string) => readFileSync(join(REPO, p), "utf8");

/** Oberflächen, die einen BEG-Betrag zeigen und die Bedingung deshalb nennen müssen. */
const OBERFLAECHEN = [
  "app/(site)/ratgeber/waermepumpe-foerderung/page.tsx",
  "app/(site)/waermepumpe-rechner/waermepumpe.tsx",
  "app/(embed)/embed/foerder-check/client.tsx",
];

describe("BEG-Antragsreihenfolge — Geltungsbereich", () => {
  it("die Ausschlussregel hängt an der ANTRAGSTELLUNG, nicht an der Zusage", () => {
    // Merkblatt 458, S. 6, WÖRTLICH. Die Richtlinie sagt denselben Inhalt in
    // Nr. 9.2.1, aber nicht denselben Satz — „gleichlautend" wäre zu viel
    // behauptet und stand hier bis 25.08.2026 so im Kommentar.
    expect(BEG_VORHABENBEGINN.regelZitat).toBe(
      "Der Vorhabenbeginn vor Antragstellung schließt eine Förderung aus.",
    );
    // Der Stichtags-Satz ist UNSERE Übersetzung der Richtlinie und darf deshalb
    // nicht im Zitat-Feld landen — sonst steht er auf der Seite in
    // Anführungszeichen hinter „So steht es im Merkblatt", wo er nicht steht.
    expect(BEG_VORHABENBEGINN.stichtag).toMatch(/nach der Förderrichtlinie/);
    expect(BEG_VORHABENBEGINN.regelZitat).not.toMatch(/Förderrichtlinie/);

    // Die Verschärfung ist die eigentliche Gefahr: Sie liest sich vorsichtiger
    // und ist falsch. Richtlinie Nr. 9.2.1: „Der Vorhabenbeginn vor Bewilligung
    // beziehungsweise Förderzusage des Antrags ist zulässig …"
    for (const satz of [BEG_VORHABENBEGINN.regelZitat, BEG_ANTRAG_KURZ]) {
      expect(satz).not.toMatch(/vor (der )?(Bewilligung|Zusage|Förderzusage)/i);
      expect(satz).not.toMatch(/bevor .{0,30}(bewilligt|zugesagt)/i);
    }
  });

  it("der Fall zwischen Antrag und Zusage ist als ZULÄSSIG benannt", () => {
    // Ohne diesen Satz wäre die Seite in der schärferen Richtung falsch — und
    // genau diese Richtung fühlt sich beim Schreiben sicher an.
    expect(BEG_VORHABENBEGINN.nachAntragVorZusage).toMatch(/zulässig/);
    // Und die Erlaubnis trägt ihre Herkunft: Sie steht in der Richtlinie, nicht
    // im Merkblatt — das nennt nur den Start nach der Zusage.
    expect(BEG_VORHABENBEGINN.nachAntragVorZusage).toMatch(/Nach der Förderrichtlinie/);
    // Aber nie ohne den Preis dafür: kein Rechtsanspruch.
    expect(BEG_VORHABENBEGINN.nachAntragVorZusage).toMatch(/eigenes Risiko/);
    expect(BEG_VORHABENBEGINN.nachAntragVorZusage).toMatch(/Rechtsanspruch/);
  });

  it("was den Beginn auslöst und was ihn ausdrücklich nicht auslöst, steht beides da", () => {
    const beginn = BEG_VORHABENBEGINN.zaehltAlsBeginn.join(" ");
    // Ein Vertrag ist nur OHNE die Bedingung ein Beginn — ohne dieses „ohne"
    // wäre der bedingte Vertrag aus Schritt 2 selbst der Ausschlussgrund.
    expect(beginn).toMatch(/ohne die aufschiebende oder auflösende Bedingung/);
    expect(beginn).toMatch(/Bauarbeiten/);

    const harmlos = BEG_VORHABENBEGINN.zaehltNicht.join(" ");
    // Richtlinie Nr. 9.2.1: „Planungs- und Beratungsleistungen dürfen vor
    // Antragstellung erbracht werden und führen für sich genommen nicht zur
    // Annahme eines Vorhabenbeginns."
    expect(harmlos).toMatch(/Planungs- und Beratungsleistungen/);
    expect(BEG_VORHABENBEGINN.zaehltNicht.length).toBeGreaterThanOrEqual(2);
  });

  it("der naheliegende Ausweg ist als versperrt benannt", () => {
    // KfW-Produktseite 458, am 25.08.2026 selbst gelesen: die Bedingung
    // nachträglich in einen laufenden Vertrag aufzunehmen, ist nicht zulässig.
    // Ohne diesen Satz liest sich der Abschnitt, als ließe sich ein bereits
    // unterschriebener Vertrag nachbessern.
    expect(BEG_VORHABENBEGINN.keineNachtraeglicheBedingung).toMatch(/nachträglich/);
    expect(BEG_VORHABENBEGINN.keineNachtraeglicheBedingung).toMatch(/nicht zulässig/);
  });
});

describe("BEG-Antragsreihenfolge — die sechs Schritte", () => {
  it("es sind sechs, und der letzte ist die Auszahlung", () => {
    // Merkblatt S. 3 „In 6 Schritten zum Zuschuss". Die Anleitung endet NICHT
    // beim Einbau: Ohne die eigens beantragte Auszahlung kommt kein Geld, und
    // genau dieser Schritt fällt beim Nacherzählen als erster weg.
    expect(BEG_ANTRAG_SCHRITTE).toHaveLength(6);
    expect(BEG_ANTRAG_SCHRITTE[5].titel).toMatch(/Auszahlung/);
  });

  it("die Reihenfolge stimmt: Bestätigung, bedingter Vertrag, Antrag, Zusage", () => {
    expect(BEG_ANTRAG_SCHRITTE[0].text).toMatch(/Bestätigung zum Antrag/);
    // Beide Varianten müssen genannt sein — zugelassen sind aufschiebende UND
    // auflösende Bedingung —, aber variantenneutral beschrieben: Sie wirken
    // gegenläufig, und eine Fassung, die nur die aufschiebende beschreibt, steht
    // für die andere auf dem Kopf (Legal-Judge, 25.08.2026).
    expect(BEG_ANTRAG_SCHRITTE[1].text).toMatch(/aufschiebende oder auflösende Bedingung/);
    expect(BEG_ANTRAG_SCHRITTE[1].text).not.toMatch(/gilt nur, wenn die KfW zusagt/);
    expect(BEG_ANTRAG_SCHRITTE[2].text).toMatch(/Meine KfW/);
    expect(BEG_ANTRAG_SCHRITTE[2].text).toMatch(/458/);
    expect(BEG_ANTRAG_SCHRITTE[3].titel).toMatch(/Zusage/);
    // Der bedingte Vertrag ist Pflicht, nicht Kür: „Bei Antragstellung muss ein
    // Lieferungs- oder Leistungsvertrag vorliegen …" (Richtlinie Nr. 9.2.1).
    expect(BEG_ANTRAG_SCHRITTE[1].text).toMatch(/muss bei Antragstellung vorliegen/);
    // Und Schritt 5/6 dürfen nicht zu einem verschmelzen — die Auszahlung ist
    // ein eigener Antrag, die Bestätigung eine eigene Bedingung dafür.
    expect(BEG_ANTRAG_SCHRITTE[4].titel).toMatch(/bestätigen/i);
  });

  it("jeder Schritt trägt Titel und Text", () => {
    for (const s of BEG_ANTRAG_SCHRITTE) {
      expect(s.titel.length).toBeGreaterThan(3);
      expect(s.text.length).toBeGreaterThan(40);
    }
  });
});

describe("BEG-Antragsreihenfolge — Fristen und Eigenleistung", () => {
  it("Bewilligungszeitraum und Nachweisfristen stehen wie in der Richtlinie", () => {
    // Nr. 9.4.1: 36 Monate ab Zugang der Zusage.
    expect(BEG_ANTRAG_FRISTEN.bewilligungMonate).toBe(36);
    // Nr. 9.5.1: sechs Monate nach Abschluss, spätestens sechs Monate nach
    // Ablauf des Bewilligungszeitraums — danach entfällt der Auszahlungsanspruch.
    expect(BEG_ANTRAG_FRISTEN.nachweisNachAbschlussMonate).toBe(6);
    expect(BEG_ANTRAG_FRISTEN.nachweisSpaetestensNachBewilligungMonate).toBe(6);
  });

  it("die Verfallsfolge hängt an der ÄUSSEREN Frist, nicht an beiden", () => {
    // Richtlinie Nr. 9.5.1 Satz 2 sanktioniert NUR die Einreichung „später als
    // sechs Monate nach Ablauf des Bewilligungszeitraums". Eine Fassung, die den
    // Verfall auf beide Fristen bezog, hätte einem Leser, der früh fertig wird,
    // bis zu 30 Monate lang „Geld weg" gemeldet, obwohl sein Anspruch besteht.
    const src = lies("app/(site)/ratgeber/waermepumpe-foerderung/page.tsx");
    expect(src).toMatch(/harte Grenze ist die zweite/);
    // Und der Fristbeginn ist definiert — sonst rechnet der Leser ab Einbautag.
    expect(src).toMatch(/Datum der\s+letzten Rechnung/);
  });

  it("der Geltungsbereich ist benannt statt die Schritte weichgespült", () => {
    // Adversarialer Prüfer, 25.08.2026: In WEG und Mehrfamilienhäusern kommt ein
    // Zusatzantrag dazu, und dessen Nachweisfrist läuft ab der Auszahlung des
    // Basisantrags. Die Schritte bleiben für den Regelfall scharf, die Ausnahme
    // wird gesagt — eine Anleitung, die für alle Fälle gleichzeitig stimmt,
    // stimmt am Ende für keinen.
    expect(BEG_ANTRAG_GELTUNGSBEREICH).toMatch(/Wohnungseigentümergemeinschaft/);
    expect(BEG_ANTRAG_GELTUNGSBEREICH).toMatch(/zusätzlichen Antrag/);
    // Aber als Möglichkeit, nicht als Pflichtstufe: „In diesem Fall KÖNNEN Sie …
    // einen Zusatzantrag stellen" (Merkblatt S. 7). Ein vermietetes
    // Mehrfamilienhaus hat gar keinen — die Boni hängen an der Selbstnutzung.
    expect(BEG_ANTRAG_GELTUNGSBEREICH).toMatch(/können selbstnutzende Eigentümer/);
    expect(BEG_ANTRAG_GELTUNGSBEREICH).not.toMatch(/kommt ein Zusatzantrag/);
  });

  it("die Höhe steht mit dem Antrag fest — kein Nachlegen", () => {
    // Merkblatt S. 6. Der dritte Verlustweg, und der leiseste: Er kostet keinen
    // ganzen Zuschuss, aber die Differenz, und niemand bemerkt ihn vorher.
    expect(BEG_KEINE_AUFSTOCKUNG).toMatch(/nur einen Antrag/);
    expect(BEG_KEINE_AUFSTOCKUNG).toMatch(/aufstocken/i);
  });

  it("Eigenleistung: nur Material, und nur mit Bestätigung", () => {
    // Merkblatt S. 5. Die Bestätigungspflicht ist der Teil, der gern wegfällt —
    // ohne sie liest sich der Satz wie „Material zählt immer".
    expect(BEG_EIGENLEISTUNG).toMatch(/Materialkosten/);
    expect(BEG_EIGENLEISTUNG).toMatch(/bestätigt/);
  });
});

describe("BEG-Antragsreihenfolge — eine Quelle, kein zweites Tippen", () => {
  it("die Belege liegen im Repo", () => {
    // Wächter-Gate Regel 6: erst beschaffen, dann behaupten.
    expect(existsSync(join(REPO, "docs/quellen/KfW-Merkblatt-458_BEG-Heizungsfoerderung_2026-07.pdf"))).toBe(true);
    expect(existsSync(join(REPO, "docs/quellen/BEG-EM-Richtlinie_2026-07-17.pdf"))).toBe(true);
    expect(BEG_ANTRAG_STAND.geprueftIso >= BEG_ANTRAG_STAND.validFrom).toBe(true);
  });

  it("jede Oberfläche mit BEG-Betrag holt die Bedingung aus dem Modul", () => {
    for (const pfad of OBERFLAECHEN) {
      const src = lies(pfad);
      expect(src, `${pfad} importiert nicht aus lib/beg-antrag`).toMatch(/from ".*lib\/beg-antrag"/);
    }
  });

  it("niemand tippt die Regel ein zweites Mal", () => {
    // Der Wortlaut darf im ganzen Projekt nur an einer Stelle als Zeichenkette
    // stehen — dem Modul. Überall sonst wird er gerendert.
    const zitat = "schließt eine Förderung aus";
    for (const pfad of OBERFLAECHEN) {
      expect(lies(pfad), `${pfad} tippt die Regel ab, statt sie zu rendern`).not.toContain(zitat);
    }
  });

  it("der Ratgeber rendert Anker und Bausteine wirklich", () => {
    // Ein Test auf die Konstante allein genügt nicht (Council-Runbook:
    // „sichtbar geprüft, nicht nur im Quelltext"). Hier die Code-Seite, den
    // Rest prüft e2e/waermepumpe-foerderung.spec.ts im Browser.
    const src = lies("app/(site)/ratgeber/waermepumpe-foerderung/page.tsx");
    expect(src).toMatch(/id=\{BEG_ANTRAG_ANKER\}/);
    expect(src).toMatch(/BEG_ANTRAG_SCHRITTE\.map/);
    expect(src).toMatch(/BEG_VORHABENBEGINN\.regelZitat/);
    expect(src).toMatch(/BEG_VORHABENBEGINN\.nachAntragVorZusage/);
    expect(src).toMatch(/BEG_EIGENLEISTUNG/);
    // Der Stand darf nicht tot im Modul liegen — er ist die Angabe, an der ein
    // Leser erkennt, ob die Verfahrensauskunft noch trägt.
    expect(src).toMatch(/BEG_ANTRAG_STAND\.validFrom/);
    expect(src).toMatch(/BEG_ANTRAG_STAND\.geprueftIso/);
  });

  it("die Seite verwechselt unseren Wertstand nicht mit der Gültigkeit des Merkblatts", () => {
    // Real passiert: „KfW-Zuschuss 458, gültig ab 27. Juli 2026" — das ist der
    // Stand UNSERER Werte (HP.validFrom). Das Merkblatt gilt ab dem 21.07.2026.
    // Ein Gültigkeitsdatum, das es nicht gibt, auf der Seite, die für ehrliche
    // Zahlen bürgt.
    const src = lies("app/(site)/ratgeber/waermepumpe-foerderung/page.tsx");
    expect(src).not.toMatch(/gültig ab \{standDatum\}/);
    expect(src).toMatch(/gültig ab \{gueltigAb\}/);
    expect(BEG_ANTRAG_STAND.validFrom).toBe("2026-07-21");
  });

  it("die Seite sagt nicht an einer Stelle „kein Anspruch auf die Förderung“ und an der anderen das Gegenteil", () => {
    // Der Widerspruch war real und selbst gebaut: Schritt 4 wurde auf „kein
    // Anspruch auf die ZUSAGE" verengt, weil nach Richtlinie Nr. 9.5.1 sehr wohl
    // ein AUSZAHLUNGSanspruch besteht — und im selben Commit stand drei Zeilen
    // unter dem Fristen-Absatz wieder die weite Fassung, die genau das verneint,
    // was der Absatz darüber gerade erklärt hatte. Gefunden erst von der
    // Nachprüfung der Endfassung, nachdem beide Legal-Judges den Entwurf
    // freigegeben hatten.
    const src = lies("app/(site)/ratgeber/waermepumpe-foerderung/page.tsx");
    expect(src).not.toMatch(/Anspruch auf\s+die Förderung gibt es nicht/);
    expect(src).not.toMatch(/Einen Anspruch auf die Förderung gibt es nicht/);
    // Und der Rechenkern sagt dasselbe Wort.
    expect(BEG_ANTRAG_SCHRITTE[3].text).toMatch(/auf die Zusage selbst besteht kein Anspruch/);
    expect(BEG_ANTRAG_SCHRITTE[3].text).not.toMatch(/Bewilligung/);
  });

  it("die KfW-Entscheidung heißt überall Zusage, nicht Bescheid", () => {
    // Richtlinie Nr. 9.4: „Die KfW vergibt Kredite und Zuschüsse auf Grundlage
    // privatrechtlicher Verträge." Die Doppelformel „Zuwendungsbescheid
    // beziehungsweise Zusage" trennt BAFA (Verwaltungsakt) von KfW (Vertrag) —
    // zwei verschiedene Rechtswege, Widerspruch und Anfechtungsklage gibt es nur
    // beim einen. Das Merkblatt 458 kennt „Bescheid" nur im Einkommensteuerbescheid.
    //
    // Geprüft wird projektweit, nicht nur auf der Ratgeberseite: Der Satz stand
    // an VIER Stellen, und eine Korrektur an einer davon hätte die anderen drei
    // stehen lassen — genau die Fehlerklasse, an der sich hier schon einmal eine
    // zurückgenommene Zusage in vier Oberflächen gehalten hat.
    for (const pfad of [
      "app/(site)/ratgeber/waermepumpe-foerderung/page.tsx",
      "app/(embed)/embed/foerder-check/client.tsx",
      "lib/glossary.ts",
      "lib/faq.ts",
    ]) {
      const src = lies(pfad);
      expect(src, `${pfad} nennt die KfW-Förderentscheidung „Bescheid"`).not.toMatch(
        /Zuschussbescheid|Bescheid der KfW/,
      );
    }
  });

  it("die Zuständigkeit im Glossar folgt dem VORGANG, nicht der Gattung „Heizung“", () => {
    // Gemessener Fehlgriff (26.08.2026): „bei der Heizung die Zusage der KfW"
    // war falsch. Nach Richtlinie Nr. 9.1 liegen ZWEI Heizungs-Sachen beim BAFA
    // — das Gebäudenetz (Nr. 5.3 g) und die Heizungsoptimierung (Nr. 5.4), und
    // zu letzterer gehört ausdrücklich „im Fall einer Wärmepumpe auch die
    // Optimierung der Wärmepumpe". Also das Thema dieser Seite selbst.
    // Nur der Heizungs-TAUSCH (Einbau nach 5.3 a–f/j, Netzanschluss 5.3 h/i)
    // liegt ausnahmslos bei der KfW.
    const src = lies("lib/glossary.ts");
    expect(src).not.toMatch(/bei der Heizung die Zusage der KfW/);
    expect(src).toMatch(/beim Heizungstausch die Zusage der KfW/);
    expect(src).toMatch(/Heizungsoptimierung der Bescheid des BAFA/);
  });

  it("der Anker-Link zeigt auf den Ratgeber und trägt den Anker", () => {
    // Verweisende Seiten (Rechner, später die Geräteempfehlung) importieren
    // diesen Pfad. Ein abgetippter Anker bricht stumm.
    expect(BEG_ANTRAG_HREF).toBe(`/ratgeber/waermepumpe-foerderung#${BEG_ANTRAG_ANKER}`);
    expect(existsSync(join(REPO, "app/(site)/ratgeber/waermepumpe-foerderung/page.tsx"))).toBe(true);
  });
});
