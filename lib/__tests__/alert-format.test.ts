import { describe, it, expect } from "vitest";
import { buildAlertMail, buildSummaryLines, decideDelivery, isStructured } from "../alert-format";

// Diese Tests halten die Regel fest, die den Wächtern das Postfach-Spam abgewöhnt
// hat (28.07.2026): Eine Mail gibt es NUR, wenn eine Entscheidung beim Betreiber
// liegt. Wer die Schleuse aufweicht, damit „der Bericht auch mal durchkommt",
// lässt hier einen Test fallen — dasselbe Muster wie beim Nicht-Hochsetzen der
// Gesundheits-Schwellen.

describe("Zustellung: nur mit Entscheidung", () => {
  it("stellt zu, wenn eine Entscheidung beim Betreiber liegt", () => {
    const d = decideDelivery({ subject: "Klima", decisions: ["Studie für 30 € kaufen?"] });
    expect(d.send).toBe(true);
  });

  it("hält einen Lauf ohne Entscheidung zurück — auch mit viel Inhalt", () => {
    const d = decideDelivery({
      subject: "Geräte-Config",
      decisions: [],
      done: ["Wirkungsgrad korrigiert"],
      details: "…drei Bildschirmseiten Rechenschaft…",
    });
    expect(d.send).toBe(false);
    expect(d.reason).toBe("nichts zu entscheiden");
  });

  it("stellt nie zu, was an Claude adressiert ist", () => {
    // Der Fall, der die sieben „Handlungsbedarf"-Mails erzeugt hat: ein roter
    // Lauf, dessen Befund ein Code-Fix ist. Dafür ist die Autofix-Action da.
    const d = decideDelivery({
      subject: "Gesundheitscheck ROT",
      audience: "claude",
      decisions: ["wird ignoriert"],
      details: "Abfrage langsam",
    });
    expect(d.send).toBe(false);
    expect(d.reason).toMatch(/Claude/);
  });

  it("lässt den Wochenbericht ausdrücklich durch (force)", () => {
    const d = decideDelivery({ subject: "Woche", done: ["a", "b"], force: true });
    expect(d.send).toBe(true);
  });

  it("stellt den alten Fließtext-Weg weiter zu, damit kein Wächter still verstummt", () => {
    const d = decideDelivery({ subject: "Alt", body: "Bericht" });
    expect(d.send).toBe(true);
    expect(isStructured({ subject: "Alt", body: "Bericht" })).toBe(false);
  });

  it("weist eine Meldung ohne Betreff oder Inhalt ab", () => {
    expect(decideDelivery({ decisions: ["x"] }).problem).toBeTruthy();
    expect(decideDelivery({ subject: "nur Betreff" }).problem).toBeTruthy();
  });
});

describe("Form: Handlungsbedarf steht vor dem Klicken fest", () => {
  it("nennt Entscheidungen und Erledigtes im Kopf", () => {
    const kopf = buildSummaryLines({ subject: "x", decisions: ["a"], done: ["b", "c"] });
    expect(kopf[0]).toBe("Deine Entscheidung: 1 Punkt");
    expect(kopf[1]).toBe("Selbst erledigt: 2");
  });

  it("sagt ausdruecklich nichts, wenn nichts zu entscheiden ist", () => {
    expect(buildSummaryLines({ subject: "x", done: ["b"] })[0]).toBe("Deine Entscheidung: nichts");
  });

  it("nennt den Betreff nur dann eine Entscheidung, wenn eine ansteht", () => {
    expect(buildAlertMail({ subject: "Klima", decisions: ["Studie kaufen?"] }).subject).toMatch(/^Solar Check – Entscheidung:/);
    expect(buildAlertMail({ subject: "Klima", done: ["x"], force: true }).subject).toMatch(/^Solar Check – Wächter:/);
  });

  it("klappt den langen Bericht ein, statt ihn voranzustellen", () => {
    const { html } = buildAlertMail({
      subject: "x",
      decisions: ["Entscheide dies."],
      details: "Sehr langer Bericht",
    });
    expect(html.indexOf("Entscheide dies.")).toBeLessThan(html.indexOf("Sehr langer Bericht"));
    expect(html).toContain("<details");
  });

  it("kürzt sichtbar, statt eine zu lange Entscheidung zu verschlucken", () => {
    const { html } = buildAlertMail({ subject: "x", decisions: ["A".repeat(600)] });
    expect(html).toContain("[…]");
    expect(html).not.toContain("A".repeat(600));
  });

  it("deckelt die Zahl der Punkte — mehr als fünf Entscheidungen sind keine Entscheidung mehr", () => {
    const viele = Array.from({ length: 9 }, (_, i) => `Punkt ${i}`);
    expect(buildSummaryLines({ subject: "x", decisions: viele })[0]).toBe("Deine Entscheidung: 5 Punkte");
  });

  it("lässt Bericht-Text kein Markup einschleusen", () => {
    const { html } = buildAlertMail({ subject: "x", decisions: ['<img src=x onerror="alert(1)">'] });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
