import { describe, it, expect } from "vitest";
import { THEMEN } from "../presse-extrakt";
import { GESCHICHTEN, STAENDE, KONTAKTARTEN, istStand } from "../presse-stand";
import {
  SPALTEN,
  alsCsv,
  katalogZeile,
  mediumName,
  zeilenPrioritaet,
  adressenNachDomain,
  eignungEffektiv,
  gattungEffektiv,
  gattungText,
  type MediumZeile,
  type KontaktZeile,
  adressatVon,
} from "../presse-katalog";

const medium: MediumZeile = {
  domain: "beispiel.de",
  saat_name: "Beispiel-Magazin",
  saat_typ: "Print",
  saat_schwerpunkt: "photovoltaik",
  saat_gebiet: "bundesweit",
  gruppe: null,
  paket: 1,
  notiz: null,
  titel: "Beispiel-Magazin",
  medientyp: ["Print", "Online"],
  themen: [{ name: "photovoltaik", treffer: 12 }],
  geschichten: ["Solarzubau und Rankings"],
  reichweite: null,
  ist_medium: "medium",
  medium_grund: "",
  formular_url: null,
  prioritaet: "A",
  aufhaenger: "Redaktion: Zubau je Gemeinde",
  hinweis: null,
  profil_at: "2026-09-03T10:00:00.000Z",
  fehler: null,
};

const kontakt: KontaktZeile = {
  domain: "beispiel.de",
  schluessel: "name:erika mustermann",
  name: "Erika Mustermann",
  funktion: "Chefredakteurin",
  rang: 100,
  mail: "erika.mustermann@beispiel.de",
  mail_art: "person",
  formular_url: null,
  quelle_url: "https://beispiel.de/impressum",
  seitenart: "impressum",
  anker: "funktion",
  fundstelle: "Chefredaktion: Erika Mustermann",
  geprueft_am: "2026-09-03",
};

describe("Katalog-Zeile", () => {
  it("hat für jede Spalte genau einen Wert", () => {
    // Ohne diese Gegenprobe verschiebt eine neue Spalte still jeden Wert
    // dahinter um eins — die Datei sieht dabei völlig normal aus.
    const zeile = katalogZeile(medium, kontakt, new Map());
    expect(zeile).toHaveLength(SPALTEN.length);
  });

  it("erzeugt eine Kopfzeile und eine Zeile je Kontakt", () => {
    const csv = alsCsv([medium], [kontakt]);
    const zeilen = csv.split("\n");
    expect(zeilen[0]).toBe(SPALTEN.join(","));
    expect(zeilen).toHaveLength(2);
    expect(zeilen[1]).toContain("erika.mustermann@beispiel.de");
  });

  it("gibt ein Medium ohne Kontakt trotzdem aus", () => {
    // „Kein Kontakt gefunden" ist ein Befund und muss sichtbar bleiben —
    // sonst ist „nichts gefunden" nicht von „nicht angesehen" zu unterscheiden.
    const csv = alsCsv([medium], []);
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain("kein Kontakt gefunden");
  });

  it("stuft eine Auslandsredaktion in der ZEILE zurück, nicht das Medium", () => {
    const auslaendisch = { ...kontakt, funktion: "Editor, Australia" };
    expect(zeilenPrioritaet("A", auslaendisch)).toBe("C");
    expect(zeilenPrioritaet("A", kontakt)).toBe("A");
  });

  it("stuft eine Verlagsgeschäftsführung zurück", () => {
    expect(zeilenPrioritaet("A", { ...kontakt, funktion: "Geschäftsführer", rang: 20 })).toBe("B");
  });

  it("nimmt den Namen aus der Saat, wenn der Seitentitel etwas anderes meint", () => {
    // GEMESSEN: energiezukunft.eu trägt als Titel „EWS Schönau", den Namen
    // seines Herausgebers. Wahr, und im Verteiler unbrauchbar.
    const fremd = { ...medium, titel: "EWS Schönau", saat_name: "energiezukunft", domain: "energiezukunft.eu" };
    expect(mediumName(fremd)).toBe("energiezukunft");
    expect(mediumName(medium)).toBe("Beispiel-Magazin");
  });

  it("merkt sich, wo dieselbe Adresse unter mehreren Adressen steht", () => {
    const zweit = { ...kontakt, domain: "beispiel.com" };
    const karte = adressenNachDomain([kontakt, zweit]);
    expect(karte.get(kontakt.mail as string)).toEqual(["beispiel.de", "beispiel.com"]);
  });
});

describe("Art des Mediums", () => {
  it("lässt die Handentscheidung die Messung schlagen", () => {
    // Die Messung sieht EINE Startseite an EINEM Tag. Sie trennt die klaren
    // Fälle, aber ein Fachtitel, der an diesem Tag über etwas anderes schreibt,
    // fällt durch — gemessen an energate, pv Europe und der SBZ.
    const gemessen = { ...medium, gattung: "publikum", gattung_hand: null };
    expect(gattungEffektiv(gemessen)).toBe("publikum");
    expect(gattungEffektiv({ ...gemessen, gattung_hand: "fach" })).toBe("fach");
  });

  it("schreibt dran, dass von Hand entschieden wurde", () => {
    // Ohne den Vermerk wäre eine Handentscheidung von einer Messung nicht zu
    // unterscheiden — dieselbe Regel wie bei jedem anderen Feld des Katalogs.
    expect(gattungText({ ...medium, gattung: "publikum", gattung_hand: "fach" })).toContain(
      "von Hand",
    );
    expect(gattungText({ ...medium, gattung: "fach", gattung_hand: null })).toBe("Fachmedium");
  });
});

describe("Eignungsurteil", () => {
  it("führt Grund und Belegseite als eigene Spalten", () => {
    // Ein Urteil, das niemand nachlesen kann, ist eine Behauptung. Beim ersten
    // Durchgang hat genau das Nachlesen sechs von 32 Urteilen gedreht — darunter
    // solarbranche.de, das als Marktplatz eingestuft war und im Impressum eine
    // eigene Redaktion ausweist.
    expect(SPALTEN).toContain("eignung");
    expect(SPALTEN).toContain("eignung_grund");
    expect(SPALTEN).toContain("eignung_beleg");
  });

  it("gibt Urteil, Grund und Beleg in der Zeile aus", () => {
    const beurteilt = {
      ...medium,
      eignung: "vorgemerkt",
      eignung_grund: "Fachmagazin mit eigener Redaktion",
      eignung_beleg: "https://beispiel.de/team",
    };
    const zeile = katalogZeile(beurteilt, kontakt, new Map());
    expect(zeile).toHaveLength(SPALTEN.length);
    expect(zeile[SPALTEN.indexOf("eignung")]).toBe("vorgemerkt");
    expect(zeile[SPALTEN.indexOf("eignung_beleg")]).toBe("https://beispiel.de/team");
  });

  it("lässt die Handentscheidung die Messung schlagen und schreibt es dran", () => {
    // Seit der Lauf das Urteil selbst ermittelt, muss sichtbar bleiben, wer es
    // gefällt hat — sonst ist eine Korrektur von einer Messung nicht zu
    // unterscheiden, und niemand weiß, was ein neuer Lauf überschreiben darf.
    const gemessen = { ...medium, eignung: "ungeeignet", eignung_hand: null };
    expect(eignungEffektiv(gemessen)).toBe("ungeeignet");
    const korrigiert = { ...gemessen, eignung_hand: "vorgemerkt" };
    expect(eignungEffektiv(korrigiert)).toBe("vorgemerkt");
    const zeile = katalogZeile(korrigiert, kontakt, new Map());
    expect(zeile[SPALTEN.indexOf("eignung")]).toBe("vorgemerkt (von Hand)");
  });

  it("lässt ein unbeurteiltes Medium leer statt „offen“ zu behaupten", () => {
    // „offen“ in einer Exportspalte liest sich wie ein Befund; leer sagt, dass
    // niemand hingesehen hat.
    const zeile = katalogZeile({ ...medium, eignung: "offen" }, kontakt, new Map());
    expect(zeile[SPALTEN.indexOf("eignung")]).toBe("");
  });
});

describe("Arbeitsstand", () => {
  it("kennt nur die vier Zustände", () => {
    expect(istStand("vorgemerkt")).toBe(true);
    expect(istStand("angeschrieben")).toBe(false);
  });

  it("behauptet keinen Versand", () => {
    // Es gibt keinen Versandweg. Ein Zustand, der einen voraussetzt, ließe
    // später glauben, es sei etwas hinausgegangen.
    const woerter = STAENDE.map((s) => `${s.wert} ${s.text} ${s.hinweis}`).join(" ");
    expect(woerter).not.toMatch(/angeschrieben|versendet|verschickt|Antwort erhalten/i);
  });

  it("führt jede Kontaktart, die die Erhebung vergeben kann", () => {
    const vergeben = ["person", "redaktion", "allgemein", "person-ohne-namen", "formular", "werblich"];
    expect(KONTAKTARTEN.map((k) => k.wert).sort()).toEqual(vergeben.sort());
  });
});

describe("Filterliste der Geschichten", () => {
  it("enthält nur Geschichten, die aus den Themen wirklich entstehen können", () => {
    // Zwei Listen wären eine zu viel: Ein Filtereintrag, den die Erhebung nie
    // vergibt, liefert dauerhaft null Treffer und sieht dabei wie ein leerer
    // Bestand aus, nicht wie ein Fehler.
    const moeglich = new Set(THEMEN.map((t) => t.geschichte));
    for (const g of GESCHICHTEN) expect(moeglich.has(g)).toBe(true);
    for (const g of moeglich) expect(GESCHICHTEN as readonly string[]).toContain(g);
  });
});

describe("Wer angeschrieben wird — die Falle vom 05.09.2026", () => {
  /**
   * Der Betreiber sah in einer Übersicht „Robert Reisch (Geschäftsführer) ·
   * weinhold@erneuerbareenergien.de" — Name aus der einen, Adresse aus der
   * anderen Zeile. Eine falsche Anrede ist schlimmer als gar keine: Sie ist
   * das erste, was der Empfänger liest.
   */
  const k = (p: Partial<KontaktZeile>): KontaktZeile =>
    ({ domain: "x.de", schluessel: "s", name: null, funktion: null, rang: 50,
       mail: null, mail_art: null, formular_url: null, quelle_url: null,
       seitenart: null, anker: null, fundstelle: null, geprueft_am: null,
       stand: "offen", notiz: null, stand_at: null, ...p }) as KontaktZeile;

  it("nimmt Name und Weg nur aus DERSELBEN Zeile", () => {
    const a = adressatVon([
      k({ schluessel: "name:reisch", name: "Robert Reisch", funktion: "Geschäftsführer", rang: 90 }),
      k({ schluessel: "mail:weinhold", mail: "weinhold@example.de", rang: 80 }),
    ]);
    expect(a.name).toBeNull();
    expect(a.weg).toBe("weinhold@example.de");
    expect(a.ausEinerHand).toBe(false);
  });

  it("nimmt die Zeile, die beides trägt", () => {
    const a = adressatVon([
      k({ schluessel: "mail:info", mail: "info@example.de", rang: 40 }),
      k({ schluessel: "name:dietz", name: "Manja Dietz", funktion: "Chefredakteurin",
          mail: "manja.dietz@example.de", rang: 90 }),
    ]);
    expect(a.name).toBe("Manja Dietz");
    expect(a.weg).toBe("manja.dietz@example.de");
    expect(a.ausEinerHand).toBe(true);
  });

  it("nimmt ein Formular als Weg, wenn keine Adresse dasteht", () => {
    const a = adressatVon([k({ schluessel: "form", formular_url: "https://example.de/kontakt" })]);
    expect(a.wegArt).toBe("formular");
  });

  it("liefert einen leeren Adressaten statt einer Erfindung", () => {
    const a = adressatVon([k({ schluessel: "name:x", name: "Nur ein Name" })]);
    expect(a.weg).toBeNull();
    expect(a.name).toBeNull();
  });
});
