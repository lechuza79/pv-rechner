import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Warum es diesen Test gibt:
//
// Das Kontaktformular ging bis zum 16.08.2026 an ADMIN_EMAILS — und das ist ein
// privates Gmail-Konto. Damit war Google faktisch Empfänger jeder Nutzernachricht,
// in einem Drittland, und für ein privates Konto lässt sich kein
// Auftragsverarbeitungsvertrag abschließen. In der Datenschutzerklärung stand
// davon nichts; sie beschreibt (Abschnitt 10) den Weg über Resend in das Postfach
// des Verantwortlichen — also die Adresse aus Abschnitt 1.
//
// Der Betreiber hat entschieden, die Nachrichten in das Postfach der eigenen
// Domain zu leiten (deutscher Anbieter, bestehender Vertrag). Dieser Test nagelt
// die Entscheidung fest: Wer die Empfängerliste wieder an die Admin-Liste hängt,
// macht die Erklärung still unvollständig — sichtbar wäre das nirgends, die Mail
// käme ja weiterhin an.
//
// Geprüft wird die STRUKTUR der Route, weil der tatsächliche Empfänger aus einer
// Umgebungsvariablen kommt und in Tests nicht gesetzt ist.

const ROUTE = readFileSync(join(__dirname, "../../app/api/contact/route.ts"), "utf8");

describe("Kontaktformular: Empfänger", () => {
  it("nutzt NICHT die Admin-Liste als Empfänger", () => {
    // Kommentare dürfen ADMIN_EMAILS erwähnen — sie erklären ja gerade, warum
    // es hier nicht steht. Der ausgeführte Code darf es nicht.
    const code = ROUTE.split("\n")
      .filter(l => !l.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toContain("ADMIN_EMAILS");
  });

  it("fällt auf das Postfach der eigenen Domain zurück", () => {
    // Dieselbe Adresse, die die Datenschutzerklärung in Abschnitt 1 nennt und
    // auf die sich Abschnitt 10 bezieht.
    expect(ROUTE).toContain('CONTACT_FALLBACK = "hey@solar-check.io"');
    expect(ROUTE).toMatch(/process\.env\.CONTACT_RECIPIENTS \|\| CONTACT_FALLBACK/);
  });

  it("hält fest, warum das so ist", () => {
    // Ohne die Begründung im Code ist die nächste Session eine Zeile davon
    // entfernt, das aus Bequemlichkeit zurückzudrehen.
    expect(ROUTE).toMatch(/bewusst NICHT ADMIN_EMAILS/);
    expect(ROUTE).toMatch(/Weiterleitung/);
  });
});
