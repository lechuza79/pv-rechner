import { describe, it, expect } from "vitest";
import { MERKMALE, STAENDE, belegteMerkmale, hatKontaktweg, istStand } from "../fachbetrieb-stand";

const leer = {
  meisterbetrieb: null,
  handwerkskammer: null,
  innung: null,
  installateurverzeichnis: null,
  zertifikate: null,
  gruendungsjahr: null,
  hr_nummer: null,
  bewertung_wert: null,
};

describe("Arbeitsstand", () => {
  it("kennt nur die vier vorgesehenen Zustände", () => {
    expect(istStand("vorgemerkt")).toBe(true);
    expect(istStand("angeschrieben")).toBe(false);
  });

  it("enthält KEINEN Zustand, der einen Versand voraussetzt", () => {
    // Es gibt keinen Versandweg. Ein Zustand wie „angeschrieben" oder „Antwort
    // erhalten" würde einen Apparat behaupten, den es nicht gibt — und die zwei
    // offenen Fragen dazu gehören dem Betreiber, nicht diesem Modul.
    for (const s of STAENDE) {
      expect(s.wert).not.toMatch(/schrieb|versand|antwort|mail|kontaktiert/i);
    }
  });

  it("gibt jedem Zustand einen erklärenden Hinweis", () => {
    for (const s of STAENDE) expect(s.hinweis.length).toBeGreaterThan(5);
  });
});

describe("Die acht Merkmale kommen aus EINER Liste", () => {
  it("hält Zahl und Aufzählung zusammen", () => {
    // Ohne die gemeinsame Quelle stünde die Acht an einer Stelle und die
    // Aufzählung an einer anderen. Wer ein Merkmal ergänzt, hätte dann neun
    // Einträge neben einer Zahl aus acht — und das fiele niemandem auf, weil
    // beide für sich plausibel aussehen.
    expect(MERKMALE).toHaveLength(8);
    expect(belegteMerkmale({ ...leer })).toBe(0);
    const alleBelegt = {
      meisterbetrieb: true,
      handwerkskammer: "Handwerkskammer Lübeck",
      innung: "Elektro-Innung",
      installateurverzeichnis: true,
      zertifikate: ["E-CHECK"],
      gruendungsjahr: 1992,
      hr_nummer: "HRB 1",
      bewertung_wert: 4.5,
      bewertung_anzahl: 20,
    };
    expect(belegteMerkmale(alleBelegt)).toBe(MERKMALE.length);
  });

  it("jedes Merkmal hat einen Namen für die Anzeige", () => {
    for (const m of MERKMALE) {
      expect(m.text.length).toBeGreaterThan(2);
      expect(m.name).toMatch(/^[a-z_]+$/);
    }
  });

  it("nennt bei der Bewertung IMMER die Herkunft", () => {
    // Ohne den Zusatz liest sie sich wie eine von uns erhobene Bewertung. Sie
    // ist eine Selbstauskunft der Website — auch wenn der Betrieb dort seine
    // Google-Sterne wiedergibt.
    const m = MERKMALE.find((x) => x.name === "bewertung");
    const text = m?.wert({ ...leer, bewertung_wert: 4.5, bewertung_anzahl: 20 });
    expect(text).toContain("Angabe der Website");
  });
});

describe("Belegte Merkmale", () => {
  it("zählt nur, was wirklich belegt ist", () => {
    expect(belegteMerkmale(leer)).toBe(0);
    expect(belegteMerkmale({ ...leer, meisterbetrieb: true, gruendungsjahr: 1992 })).toBe(2);
  });

  it("zählt eine leere Zertifikatsliste NICHT mit", () => {
    // Ein leeres Feld ist kein Merkmal — sonst bekäme jeder Betrieb einen
    // Punkt dafür, dass wir nichts gefunden haben.
    expect(belegteMerkmale({ ...leer, zertifikate: [] })).toBe(0);
    expect(belegteMerkmale({ ...leer, zertifikate: ["E-CHECK"] })).toBe(1);
  });

  it("zählt einen falschen Meisterbetrieb-Wert nicht mit", () => {
    expect(belegteMerkmale({ ...leer, meisterbetrieb: false })).toBe(0);
  });
});

describe("Rangordnung der Läufe: wer mehr gesehen hat, gewinnt", () => {
  // Die Regel steht im Erhebungslauf (scripts/fachbetriebe-refresh.ts, Phase
  // --profil). Hier wird sie als Entscheidungstabelle festgehalten, weil sie
  // sonst beim nächsten Umbau still verlorengeht — und der Verlust ist von
  // außen unsichtbar: Die Zahlen bleiben plausibel, nur die gründlichere
  // Prüfung ist weg.
  //
  // Gemessen am 28.08.2026: Ein Wiederholungslauf der Profil-Phase machte aus
  // 758 Domains mit dem Vermerk „zweimal geprüft, kein Photovoltaik" wieder 27,
  // und 55 Betriebe, die erst die Navigation verraten hatte, standen wieder auf
  // „unklar". Dieselben Seiten wären danach ein drittes Mal abgerufen worden.

  /** Spiegelt die Regel aus der Profil-Phase. */
  function artNachProfil(
    neuesUrteil: string | null,
    bisher: string,
    kontaktGelaufen: boolean,
  ): string {
    return neuesUrteil === "kein-betrieb" || !kontaktGelaufen ? (neuesUrteil ?? bisher) : bisher;
  }

  it("nimmt ein erkanntes Nicht-Betrieb-Muster immer an — das ist ein Befund", () => {
    expect(artNachProfil("kein-betrieb", "betrieb", true)).toBe("kein-betrieb");
    expect(artNachProfil("kein-betrieb", "betrieb", false)).toBe("kein-betrieb");
  });

  it("stuft NICHT auf unklar zurück, wenn die gründlichere Prüfung schon lief", () => {
    // Die Profil-Phase kennt Startseite und Impressum; die Kontakt-Phase kennt
    // zusätzlich Navigation und Kontaktseite.
    expect(artNachProfil("unklar", "betrieb", true)).toBe("betrieb");
  });

  it("stuft sehr wohl zurück, solange die Kontakt-Phase noch nicht lief", () => {
    expect(artNachProfil("unklar", "betrieb", false)).toBe("unklar");
  });

  it("lässt den bisherigen Stand stehen, wenn nichts festgestellt wurde", () => {
    expect(artNachProfil(null, "betrieb", true)).toBe("betrieb");
    expect(artNachProfil(null, "betrieb", false)).toBe("betrieb");
  });
});

describe("Erreichbarkeit", () => {
  it("zählt ein Formular als Kontaktweg", () => {
    // Bei den Gemeinden war das der Regelfall, und bei Fachbetrieben ebenso:
    // Viele zeigen bewusst keine Adresse, sondern nur ein Formular.
    expect(hatKontaktweg({ email: null, telefon: null, kontakt_formular: true })).toBe(true);
  });

  it("erkennt einen Betrieb ohne jeden Weg", () => {
    expect(hatKontaktweg({ email: null, telefon: null, kontakt_formular: null })).toBe(false);
  });

  it("genügt eine E-Mail oder eine Telefonnummer", () => {
    expect(hatKontaktweg({ email: "a@b.de", telefon: null, kontakt_formular: null })).toBe(true);
    expect(hatKontaktweg({ email: null, telefon: "0123", kontakt_formular: false })).toBe(true);
  });
});
