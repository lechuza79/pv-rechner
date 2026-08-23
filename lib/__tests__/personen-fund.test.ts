import { describe, expect, it } from "vitest";
import { entwirreAdressen, istPersonenAdresse, personenAus, saeubereFunktion, umschrift } from "../personen-fund";

describe("Verfremdete Adressen", () => {
  it("repariert das Leerzeichen vor dem @", () => {
    // Wörtlich von stadtwerke-lingen.de/kontakt, 23.08.2026.
    expect(entwirreAdressen("E-Mail: kundenservice @stadtwerke-lingen.de")).toContain(
      "kundenservice@stadtwerke-lingen.de",
    );
  });

  it("repariert das geschuetzte Leerzeichen", () => {
    expect(entwirreAdressen("info @ sw.de")).toContain("info@sw.de");
  });

  it("repariert die (at)-Schreibweisen", () => {
    for (const roh of ["info (at) sw.de", "info[at]sw.de", "info {at} sw.de"]) {
      expect(entwirreAdressen(roh)).toContain("info@sw.de");
    }
  });

  it("laesst eine gewoehnliche Adresse unangetastet", () => {
    expect(entwirreAdressen("max.mustermann@sw.de")).toBe("max.mustermann@sw.de");
  });

  it("zerstoert keinen Fliesstext mit dem Wort at", () => {
    // Der " at "-Zweig greift nur direkt vor einer Domain.
    expect(entwirreAdressen("Wir sind at home in der Region")).toBe("Wir sind at home in der Region");
  });
});

describe("Personen- gegen Funktionsadresse", () => {
  it("erkennt die Personenadresse am Trenner, nicht an einer Wortliste", () => {
    for (const m of ["christian.kramer@sw.de", "j.hopmann@sw.de", "anna-lena.mueller@sw.de"]) {
      expect(istPersonenAdresse(m)).toBe(true);
    }
    for (const m of ["info@sw.de", "vertrieb@sw.de", "kundenservice@sw.de"]) {
      expect(istPersonenAdresse(m)).toBe(false);
    }
  });
});

describe("Umschrift", () => {
  it("macht Umlaute vergleichbar", () => {
    expect(umschrift("Möllenkamp")).toBe("moellenkamp");
    expect(umschrift("Weiß")).toBe("weiss");
  });
});

describe("Funktionsbezeichnung saeubern", () => {
  it("nimmt eine echte Bezeichnung", () => {
    expect(saeubereFunktion(" Bereichsleitung Vertrieb & Energiebeschaffung ")).toBe(
      "Bereichsleitung Vertrieb & Energiebeschaffung",
    );
  });

  it("verwirft Fliesstext statt ihn zu raten", () => {
    expect(saeubereFunktion("Wir freuen uns auf Ihre Nachricht. Rufen Sie an")).toBeNull();
  });

  it("verwirft, was klein anfaengt oder zu kurz ist", () => {
    expect(saeubereFunktion("und")).toBeNull();
    expect(saeubereFunktion("erreichbar montags")).toBeNull();
  });

  it("wirft die Beschriftungen der Kontaktangaben weg", () => {
    expect(saeubereFunktion("Prokuristin Telefon:")).toBe("Prokuristin");
  });
});

// ─── Die Eichung ──────────────────────────────────────────────────────────────

/**
 * Der Sollwert stammt aus der HANDPRUEFUNG von stadtwerke-lingen.de am
 * 23.08.2026, nicht aus einem Lauf dieses Moduls. Das ist der Punkt: Erst steht
 * die Antwort fest, dann muss der Automat sie reproduzieren. Die erste Erhebung
 * dieses Projekts hat es umgekehrt gemacht und Zahlen gemeldet, die nicht
 * stimmen konnten.
 *
 * Das HTML ist dem Aufbau der echten Seite nachgebildet: Bereichsueberschrift,
 * darunter je Person Name, Funktion, Durchwahl, Adresse.
 */
const LINGEN = `
<h2>Geschäftsführung</h2>
<div><p>Thorsten Schlamann</p><p>Geschäftsführung</p><p>0591-91200-200</p>
<p>thorsten.schlamann@stadtwerke-lingen.de</p></div>
<div><p>Hermann Cordes</p><p>Geschäftsführung</p><p>0591-91200-100</p>
<p>hermann.cordes@stadtwerke-lingen.de</p></div>
<h2>Bereichsleitungen</h2>
<div><p>Konstantin Lögers</p><p>Bereichsleitung Kaufmännischer Bereich</p><p>0591-91200-207</p>
<p>konstantin.loegers@stadtwerke-lingen.de</p></div>
<div><p>Christian Kramer</p><p>Bereichsleitung Vertrieb &amp; Energiebeschaffung</p><p>0591-91200-144</p>
<p>christian.kramer@stadtwerke-lingen.de</p></div>
<div><p>Daniel Möllenkamp</p><p>Bereichsleitung Netztechnik</p><p>0591-91200-316</p>
<p>daniel.moellenkamp@stadtwerke-lingen.de</p></div>
`;

describe("Eichung an Stadtwerke Lingen", () => {
  const personen = personenAus(LINGEN);

  it("findet alle fuenf Personen", () => {
    expect(personen).toHaveLength(5);
  });

  it("liest Name, Funktion und Bereich beim Entscheider richtig", () => {
    const kramer = personen.find((p) => p.mail === "christian.kramer@stadtwerke-lingen.de");
    expect(kramer).toBeDefined();
    expect(kramer?.name).toBe("Christian Kramer");
    expect(kramer?.funktion).toBe("Bereichsleitung Vertrieb & Energiebeschaffung");
    expect(kramer?.abschnitt).toBe("Bereichsleitungen");
    expect(kramer?.telefon).toBe("0591-91200-144");
  });

  it("verwechselt die Bereiche nicht", () => {
    const nachBereich = Object.fromEntries(personen.map((p) => [p.mail.split(".")[1].split("@")[0], p.abschnitt]));
    expect(nachBereich["schlamann"]).toBe("Geschäftsführung");
    expect(nachBereich["cordes"]).toBe("Geschäftsführung");
    expect(nachBereich["kramer"]).toBe("Bereichsleitungen");
  });

  it("findet den Namen trotz Umlaut-Umschrift in der Adresse", () => {
    // daniel.moellenkamp@ gegen „Daniel Möllenkamp" im Text.
    const m = personen.find((p) => p.mail.startsWith("daniel.moellenkamp"));
    expect(m?.name).toBe("Daniel Möllenkamp");
    expect(m?.funktion).toBe("Bereichsleitung Netztechnik");
  });

  it("nimmt keine Funktion vom Eintrag darueber mit", () => {
    // Ohne Blocktrennung klebt der naechste Name an der Durchwahl des vorigen —
    // dann bekaeme Cordes die Funktion von Schlamann angehaengt.
    const cordes = personen.find((p) => p.mail.startsWith("hermann.cordes"));
    expect(cordes?.funktion).toBe("Geschäftsführung");
    expect(cordes?.name).toBe("Hermann Cordes");
  });

  it("laesst Funktionspostfaecher aussen vor", () => {
    const mit = personenAus(`${LINGEN}<p>info@stadtwerke-lingen.de</p>`);
    expect(mit.map((p) => p.mail)).not.toContain("info@stadtwerke-lingen.de");
  });
});
