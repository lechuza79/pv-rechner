import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { leseSmtpKonfig } from "../outreach-mail";

// Kann die PRODUKTION das Abo überhaupt bedienen?
//
// DER ANLASS, gemeldet vom Betreiber beim ersten Live-Versuch (01.09.2026):
// Das Abo war lokal vollständig geprüft — 19 Browser-Tests, echte Mail, echter
// Bestätigungsklick — und scheiterte auf der Produktion an der ersten
// Anmeldung, weil dort KEINE der fünf Zugangsdaten des Postfachs gesetzt war.
//
// Es gab keinen roten Test, keinen Fehler im Diff und keine kaputte Seite. Der
// Knopf funktionierte, das Fenster ging auf, die Adresse wurde angenommen — und
// danach kam „Die Bestätigungsmail konnte gerade nicht verschickt werden."
//
// DRITTE AUSPRÄGUNG DERSELBEN KLASSE in diesem Projekt: Was niemand
// wiederkehrend MISST, merkt niemand. Der Spaltenabgleich fand sie zwischen
// Code und Tabelle, die Kostenwache zwischen Mengen und Rechnung — hier liegt
// sie zwischen Code und Umgebung. Ein lokaler Lauf findet sie prinzipiell
// nicht, weil lokal alles gesetzt ist. Deshalb fragt der Gesundheitscheck die
// Produktion selbst.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Die Selbstauskunft der Produktion", () => {
  const route = lies("app/api/abo/bereit/route.ts");

  it("prüft alles, was der Abo-Weg zum Arbeiten braucht", () => {
    // Fehlt eine dieser Prüfungen, ist die Auskunft „bereit" unvollständig —
    // und eine unvollständige Bereitschaftsmeldung ist schlimmer als keine.
    expect(route).toMatch(/ABO_HMAC_SECRET/); // Unterschrift der Links
    expect(route).toMatch(/leseSmtpKonfig/); // Versandweg
    expect(route).toMatch(/NEXT_PUBLIC_BASE_URL/); // Adresse in den Mails
    expect(route).toMatch(/gemeinde_abos/); // Tabelle samt Nachweis-Spalten
  });

  it("benutzt DIESELBE Versandprüfung wie der Versand", () => {
    // Eine zweite Fassung der Prüfung würde auseinanderlaufen: Die
    // Bereitschaftsmeldung sagt „geht", während der Versand aus einem Grund
    // abweist, den die Meldung nicht kennt.
    const versand = lies("lib/abo-versand.ts");
    expect(versand).toMatch(/leseSmtpKonfig/);
    expect(route).toMatch(/leseSmtpKonfig/);
  });

  it("gibt keinen Wert preis, auch nicht seine Länge", () => {
    // Die Auskunft sagt, WAS fehlt, nie WAS gesetzt ist. Eine Länge ist bei
    // einem Passwort bereits eine Auskunft, und ein Anfangsstück erst recht.
    expect(route).not.toMatch(/\.slice\(0/);
    expect(route).not.toMatch(/\.length\s*\}/);
    expect(route).not.toMatch(/wert:|value:|geheim:\s*geheim/);
  });

  it("steht hinter dem Betriebsgeheimnis", () => {
    // Auch die Liste der FEHLENDEN Einstellungen sagt einem Angreifer, wo es
    // klemmt.
    expect(route).toMatch(/CRON_SECRET/);
    expect(route).toMatch(/status:\s*401/);
  });
});

describe("Der Gesundheitscheck fragt danach", () => {
  const hc = lies("scripts/health-check.ts");

  it("ruft die Selbstauskunft der Produktion ab", () => {
    expect(hc).toMatch(/api\/abo\/bereit/);
  });

  it("meldet den Fall an Claude, nicht an den Betreiber", () => {
    // Eine fehlende Umgebungsvariable braucht einen Handgriff, keine
    // Entscheidung — und der Betreiber kann sie nicht selbst nachtragen.
    // Ab dem AUFRUF im Lauf gesucht, nicht ab der Funktionsdefinition — die
    // steht weiter oben in der Datei und enthält die Meldestelle gar nicht.
    const stelle = hc.slice(hc.indexOf("const aboBereit = await messeAboBereit()"));
    expect(stelle.slice(0, 1500)).toMatch(/forClaude\.push/);
  });

  it("hält einen fehlgeschlagenen Abruf NICHT für einen Befund", () => {
    // Dieselbe Trennung wie beim Förder-Wächter zwischen „hat sich geändert"
    // und „Abruf kam nicht durch". Wer eine unerreichbare Route als
    // „nicht bereit" meldet, behauptet eine Beobachtung, die es nicht gab.
    const stelle = hc.slice(hc.indexOf("async function messeAboBereit"));
    const koerper = stelle.slice(0, stelle.indexOf("\n}\n"));
    expect(koerper).toMatch(/if \(!r\.ok\) return null;/);
    expect(koerper).toMatch(/catch \{\s*return null;/);
  });
});

describe("Die Versandprüfung selbst", () => {
  it("meldet jede fehlende Angabe einzeln", () => {
    // Gegenprobe: Die Prüfung, auf der die Bereitschaftsmeldung beruht, muss
    // bei leerer Umgebung wirklich anschlagen — sonst meldet die Produktion
    // „bereit" und kann nichts.
    const befund = leseSmtpKonfig({});
    expect(befund.ok).toBe(false);
    if (!befund.ok) {
      expect(befund.fehler.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("lässt eine vollständige Angabe durch", () => {
    // ABSENDER UND KONTO MÜSSEN GLEICH SEIN — die Prüfung ist strenger, als
    // sie aussieht, und das zurecht: Der Mailserver schreibt den technischen
    // Absender auf das angemeldete Konto um. Passt der nicht zur sichtbaren
    // Adresse, verfehlt die Mail ihre Ausrichtung und landet im Spam, während
    // im Kopf weiter der richtige Name steht. Meine erste Fassung dieses Tests
    // hatte zwei verschiedene und hielt die Ablehnung für einen Fehler.
    const befund = leseSmtpKonfig({
      OUTREACH_SMTP_HOST: "w01abcde.kasserver.com",
      OUTREACH_SMTP_USER: "post@solar-check.io",
      OUTREACH_SMTP_PASS: "geheim",
      OUTREACH_MAIL_FROM: "Solar Check <post@solar-check.io>",
      OUTREACH_SMTP_PORT: "465",
    });
    expect(befund.ok, "ok" in befund && !befund.ok ? befund.fehler.join(" · ") : "").toBe(true);
  });
});
