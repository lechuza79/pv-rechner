import { describe, expect, it } from "vitest";
import {
  faelligeAnfragen,
  ohneAntwort,
  offenSeitTagen,
  ordneAnfrageZu,
  MAX_JE_LAUF,
  OHNE_ANTWORT_AB_TAGEN,
  type Anfrage,
} from "../funding-anfragen";

/**
 * Ein Automatismus, der Mails an Behörden schickt, wird an seinen BREMSEN
 * gemessen, nicht an seinem Ertrag.
 *
 * Der Auslöser ist gemessen (drei Läufe ohne Amtsquelle), aber alles, was
 * danach kommt, ist eine Zusage: kein Nachfassen, keine Person als Empfänger,
 * keine Serie. Jede dieser Zusagen hängt an einer Bedingung in dieser Datei —
 * und keine davon ist im laufenden Betrieb zu sehen, solange gerade nichts
 * eskaliert ist. Genau deshalb Fixtures statt eines Laufs gegen die Datenbank:
 * Am Tag der Prüfung stand dort null, und „null" ist von „kaputt" nicht zu
 * unterscheiden.
 */
describe("Wer eine Anfrage bekommt", () => {
  const kandidat = (id: string, extra: Partial<{ eskaliert: boolean; empfaenger: string | null }> = {}) => ({
    programId: id,
    eskaliert: true,
    empfaenger: `info@${id}.de`,
    ...extra,
  });

  it("nur, wo wir wirklich nicht mehr an die Amtsseite kommen", () => {
    const { senden } = faelligeAnfragen(
      [kandidat("a"), kandidat("b", { eskaliert: false })],
      new Set(),
    );
    expect(senden).toEqual(["a"]);
  });

  it("nie zweimal — kein Nachfassen ist die Zusage, die den Weg trägt", () => {
    const { senden, uebersprungen } = faelligeAnfragen([kandidat("a")], new Set(["a"]));
    expect(senden).toEqual([]);
    expect(uebersprungen[0].grund).toContain("kein Nachfassen");
  });

  it("ohne Postfach wird nicht geraten — und das Fehlen wird benannt", () => {
    // Ein Programm ohne Empfänger fiele sonst still aus der Auswahl, und
    // niemand erführe, dass die Eskalation dort gar nicht stattfinden kann.
    const { senden, uebersprungen } = faelligeAnfragen([kandidat("a", { empfaenger: null })], new Set());
    expect(senden).toEqual([]);
    expect(uebersprungen[0].grund).toContain("kein Rollen-Postfach");
  });

  it("höchstens drei je Lauf, der Rest wird benannt statt verschluckt", () => {
    const viele = ["a", "b", "c", "d", "e"].map((x) => kandidat(x));
    const { senden, uebersprungen } = faelligeAnfragen(viele, new Set());
    expect(senden).toHaveLength(MAX_JE_LAUF);
    expect(uebersprungen.filter((u) => u.grund.includes("Höchstzahl"))).toHaveLength(5 - MAX_JE_LAUF);
  });

  it("eine leere Lage ist ein Ergebnis, kein Fehler", () => {
    expect(faelligeAnfragen([], new Set()).senden).toEqual([]);
  });
});

describe("Wo nichts zurückkam", () => {
  const a = (id: string, gesendet: string, antwort: string | null = null): Anfrage => ({
    programId: id,
    empfaenger: `info@${id}.de`,
    gesendetAm: gesendet,
    antwortAm: antwort,
    antwortArt: antwort ? "antwort" : null,
  });

  it("meldet erst nach der Frist — sonst steht die Meldung nach jedem Versand da", () => {
    const heute = "2026-10-01";
    const frisch = a("neu", "2026-09-28T10:00:00Z");
    const alt = a("alt", "2026-09-01T10:00:00Z");
    expect(ohneAntwort([frisch, alt], heute).map((x) => x.programId)).toEqual(["alt"]);
  });

  it("eine beantwortete Anfrage ist nie offen, egal wie alt", () => {
    const beantwortet = a("alt", "2026-01-01T10:00:00Z", "2026-01-05T10:00:00Z");
    expect(ohneAntwort([beantwortet], "2026-10-01")).toEqual([]);
  });

  it("die älteste zuerst — das ist die Reihenfolge, in der jemand anruft", () => {
    const heute = "2026-10-01";
    const liste = [a("b", "2026-08-01T10:00:00Z"), a("a", "2026-07-01T10:00:00Z")];
    expect(ohneAntwort(liste, heute).map((x) => x.programId)).toEqual(["a", "b"]);
  });

  it("genau an der Frist zählt sie noch nicht als überfällig", () => {
    // Der Rand gehört geprüft: „mehr als 14 Tage" und „14 Tage" sind zwei
    // verschiedene Aussagen, und die falsche erzeugt eine Meldung zu früh.
    const heute = "2026-10-01";
    const genau = a("x", `2026-09-17T00:00:00Z`);
    expect(offenSeitTagen(genau, heute)).toBe(OHNE_ANTWORT_AB_TAGEN);
    expect(ohneAntwort([genau], heute)).toHaveLength(1);
    const einTagJuenger = a("y", "2026-09-18T00:00:00Z");
    expect(ohneAntwort([einTagJuenger], heute)).toHaveLength(0);
  });

  it("zählt die Tage, statt sie zu behaupten", () => {
    expect(offenSeitTagen(a("x", "2026-09-01T00:00:00Z"), "2026-09-11")).toBe(10);
  });
});

describe("Eine Antwort der richtigen Anfrage zuordnen", () => {
  const offen: Anfrage[] = [
    {
      programId: "waldalgesheim-balkon-pv",
      empfaenger: "verwaltung@waldalgesheim.de",
      gesendetAm: "2026-09-09T11:31:00Z",
      antwortAm: null,
      antwortArt: null,
    },
  ];
  const betreffe = new Map([
    ["waldalgesheim-balkon-pv", "Aktueller Stand des Förderprogramms „Installation von Balkon-Photovoltaik-Anlagen\""],
  ]);

  it("ordnet zu, wenn Domain und zitierter Betreff zusammenpassen", () => {
    const mail = {
      von: "buergermeister@waldalgesheim.de",
      betreff: 'AW: Aktueller Stand des Förderprogramms „Installation von Balkon-Photovoltaik-Anlagen"',
      roh: "Es gilt der Betrag aus der Richtlinie.",
    };
    expect(ordneAnfrageZu(mail, offen, betreffe)).toBe("waldalgesheim-balkon-pv");
  });

  it("findet den Betreff auch nur im zitierten Text", () => {
    const mail = {
      von: "verwaltung@waldalgesheim.de",
      betreff: "Ihre Anfrage",
      roh: 'Am 09.09. schrieben Sie: „Aktueller Stand des Förderprogramms „Installation von Balkon-Photovoltaik-Anlagen""',
    };
    expect(ordneAnfrageZu(mail, offen, betreffe)).toBe("waldalgesheim-balkon-pv");
  });

  it("ordnet die ANTWORT AUF DEN KOMMUNEN-BRIEF nicht dieser Anfrage zu", () => {
    // Derselbe Ort, dasselbe Postfach, ein völlig anderes Thema. Ohne den
    // Betreff als Bedingung würde jede Antwort aus dem Rathaus eine offene
    // Förderfrage schließen, die in Wahrheit offen ist.
    const mail = {
      von: "verwaltung@waldalgesheim.de",
      betreff: "AW: Waldalgesheim auf Platz 1 von 53",
      roh: "Vielen Dank für Ihre Nachricht, wir prüfen das.",
    };
    expect(ordneAnfrageZu(mail, offen, betreffe)).toBeNull();
  });

  it("eine fremde Domain zählt nie", () => {
    const mail = {
      von: "info@irgendwo.de",
      betreff: 'AW: Aktueller Stand des Förderprogramms „Installation von Balkon-Photovoltaik-Anlagen"',
      roh: "",
    };
    expect(ordneAnfrageZu(mail, offen, betreffe)).toBeNull();
  });

  it("bei zwei möglichen Anfragen wird nicht geraten", () => {
    const zwei: Anfrage[] = [
      { ...offen[0], programId: "a", empfaenger: "info@stadt.de" },
      { ...offen[0], programId: "b", empfaenger: "info@stadt.de" },
    ];
    const gleich = new Map([
      ["a", "Aktueller Stand des Förderprogramms X"],
      ["b", "Aktueller Stand des Förderprogramms X"],
    ]);
    const mail = { von: "info@stadt.de", betreff: "AW: Aktueller Stand des Förderprogramms X", roh: "" };
    expect(ordneAnfrageZu(mail, zwei, gleich)).toBeNull();
  });
});
