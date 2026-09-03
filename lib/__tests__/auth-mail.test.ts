import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTH_MAIL_VORLAGEN, alsDienstEinstellungen } from "../auth-mail";
import { aboBestaetigungsMail } from "../abo-mail";

/**
 * Wächter für die Mails des Anmeldedienstes.
 *
 * DIE FEHLERKLASSE IST VON AUSSEN UNSICHTBAR: Die Vorlagen liegen beim Dienst,
 * nicht im Code. Zwei von ihnen trugen bis zum 02.09.2026 die Gestaltung UND
 * den Namen des Schwesterprojekts im Betreff — kein Test konnte das sehen,
 * keine Seite sah kaputt aus. Sichtbar wurde es erst, als eine Mail im
 * Postfach lag.
 */

const ROOT = join(__dirname, "..", "..");
const lies = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("Mails des Anmeldedienstes", () => {
  it("deckt jede Vorlage ab, die der Dienst kennt", () => {
    // Eine fehlende Vorlage bleibt auf der englischen Werksfassung stehen —
    // und die fällt erst jemandem auf, der sie im Postfach hat.
    const arten = AUTH_MAIL_VORLAGEN.map((v) => v.art).sort();
    expect(arten).toEqual([
      "confirmation",
      "email_change",
      "invite",
      "magic_link",
      "reauthentication",
      "recovery",
    ]);
  });

  it("nennt im Betreff uns und nie ein anderes Projekt", () => {
    for (const v of AUTH_MAIL_VORLAGEN) {
      expect(v.betreff, v.art).toMatch(/Solar Check/);
      expect(v.betreff.toLowerCase(), v.art).not.toMatch(/binge|growth assistant/);
      expect(v.html.toLowerCase(), v.art).not.toMatch(/binge|growth assistant/);
    }
  });

  it("benutzt dieselbe Hülle wie die Abo-Mails", () => {
    // Zwei Gestaltungen für Mails desselben Absenders sind derselbe Fehler wie
    // zwei Formatter für eine Einheit — sie driften, und der Nutzer sieht es.
    const abo = aboBestaetigungsMail({
      ortName: "Höchberg",
      bestaetigenUrl: "https://solar-check.io/abo/bestaetigen?t=x",
      einstellungenUrl: "https://solar-check.io/abo/einstellungen?t=x",
      gattung: "gemeinde",
    } as Parameters<typeof aboBestaetigungsMail>[0]).html;

    for (const v of AUTH_MAIL_VORLAGEN) {
      // Der Kopf mit der Wortmarke und der Fuß mit den Pflichtlinks stammen
      // aus derselben Funktion — beides muss in jeder Mail stehen.
      expect(v.html, `${v.art}: kein Logo`).toContain('alt="Solar Check"');
      expect(v.html, `${v.art}: kein Impressum`).toContain("/impressum");
      expect(v.html, `${v.art}: kein Datenschutz`).toContain("/datenschutz");
      // Und die Karte sitzt auf demselben Grund wie bei den Abo-Mails.
      const grund = /background:(#[0-9a-f]{3,8})/i.exec(abo)?.[1];
      expect(grund, "Abo-Mail hat keinen Grundton — Test prüft sonst nichts").toBeTruthy();
      expect(v.html, `${v.art}: anderer Grundton`).toContain(`background:${grund}`);
    }
  });

  it("lässt die Platzhalter des Dienstes unangetastet", () => {
    // Wären sie durch die HTML-Maskierung gelaufen, würde aus dem Punkt eine
    // Entität und der Link im Postfach wäre tot — die Mail sähe dabei völlig
    // normal aus.
    for (const v of AUTH_MAIL_VORLAGEN) {
      if (v.art === "reauthentication") {
        expect(v.html, v.art).toContain("{{ .Token }}");
        continue;
      }
      expect(v.html, v.art).toContain("{{ .ConfirmationURL }}");
      expect(v.html, v.art).not.toMatch(/\{\{\s*&#|&#123;/);
    }
  });

  it("sagt in jeder Mail, was zu tun ist, wenn man sie nicht angefordert hat", () => {
    // Eine Mail über ein Konto, das man nicht wollte, ist der Moment, in dem
    // jemand an einen Angriff denkt. Die Auskunft „Nichtstun genügt" kostet
    // eine Zeile.
    for (const v of AUTH_MAIL_VORLAGEN) {
      expect(v.html, v.art).toMatch(/nicht angefordert/);
    }
  });

  it("nennt beim Passwort dieselbe Gültigkeit, die der Dienst wirklich gibt", () => {
    const recovery = AUTH_MAIL_VORLAGEN.find((v) => v.art === "recovery")!;
    // 24 Stunden ist die Vorgabe des Dienstes. Wer sie dort ändert, ändert
    // diesen Satz mit — sonst verspricht die Mail eine andere Frist, als gilt.
    expect(recovery.html).toContain("24 Stunden");
  });

  it("wird über den eigenen Lauf hochgeladen, nicht von Hand im Dashboard", () => {
    // Von Hand eingetragene Vorlagen sind die zweite Fassung, die niemand
    // pflegt — genau so kam die Gestaltung des Schwesterprojekts hierher.
    const skript = lies("scripts/auth-mailvorlagen.ts");
    expect(skript).toContain("alsDienstEinstellungen");
    expect(lies("package.json")).toContain("auth:mailvorlagen");
    // Und der Lauf schreibt nur mit ausdrücklicher Ansage.
    expect(skript).toContain("--schreiben");
  });

  it("liefert die Vorlagen in der Form, die der Dienst erwartet", () => {
    const e = alsDienstEinstellungen();
    expect(Object.keys(e)).toHaveLength(AUTH_MAIL_VORLAGEN.length * 2);
    expect(e["mailer_subjects_recovery"]).toContain("Solar Check");
    expect(e["mailer_templates_recovery_content"]).toContain("{{ .ConfirmationURL }}");
  });
});
