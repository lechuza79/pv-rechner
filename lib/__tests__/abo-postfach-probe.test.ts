import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { anmeldeBefundAus } from "../outreach-mail";
import { aboPostfachSatz } from "../../scripts/health-check";

// Stimmen die Zugangsdaten des Postfachs — nicht nur: sind sie gesetzt?
//
// DER ANLASS (02.09.2026, aus der Fehler-Triage): Die Bereitschaftsprüfung des
// Abos meldete „Versandweg und Signatur sind in der Produktion gesetzt",
// während noch nie eine Bestätigungsmail hinausgegangen war. Beide Aussagen
// stimmten. Sie fragt, ob die Zugangsdaten GESETZT sind; ein falsch getipptes
// Passwort ist gesetzt.
//
// VIERTE AUSPRÄGUNG DERSELBEN KLASSE: Spaltenabgleich prüft Code gegen
// Tabelle, Kostenwache Mengen gegen Rechnung, die Bereitschaftsprüfung Code
// gegen Umgebung — und diese Probe die Umgebung gegen ihre WIRKUNG.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Die Einordnung eines fehlgeschlagenen Anmeldeversuchs", () => {
  it("hält eine zurückgewiesene Anmeldung für einen Befund", () => {
    // Das ist der Fall, für den die Probe überhaupt gebaut ist: Die
    // Zugangsdaten stehen da und sind falsch.
    expect(anmeldeBefundAus({ code: "EAUTH" })).toBe("abgelehnt");
    expect(anmeldeBefundAus({ code: "eauth" })).toBe("abgelehnt");
    expect(anmeldeBefundAus({ responseCode: 535 })).toBe("abgelehnt");
    expect(anmeldeBefundAus({ responseCode: 534 })).toBe("abgelehnt");
  });

  it("hält eine gescheiterte Verbindung NICHT für einen Befund", () => {
    // Dieselbe Trennung wie beim Förder-Wächter zwischen „hat sich geändert"
    // und „Abruf kam nicht durch". Wer beides zusammenwirft, meldet bei jeder
    // Netzstörung eine Fehlkonfiguration — und an eine Warnung, die
    // regelmäßig grundlos angeht, gewöhnt man sich ab.
    expect(anmeldeBefundAus({ code: "ETIMEDOUT" })).toBe("unerreichbar");
    expect(anmeldeBefundAus({ code: "ECONNECTION" })).toBe("unerreichbar");
    expect(anmeldeBefundAus({ code: "EDNS" })).toBe("unerreichbar");
    expect(anmeldeBefundAus({ responseCode: 421 })).toBe("unerreichbar");
  });

  it("ordnet einen unbekannten Fehler in die vorsichtige Richtung ein", () => {
    // Lieber kein Urteil als ein falsches: Ein unbekannter Fehler als
    // „abgelehnt" zu melden schickt jemanden Zugangsdaten prüfen, die stimmen.
    expect(anmeldeBefundAus(new Error("irgendwas"))).toBe("unerreichbar");
    expect(anmeldeBefundAus(null)).toBe("unerreichbar");
    expect(anmeldeBefundAus(undefined)).toBe("unerreichbar");
    expect(anmeldeBefundAus("Text statt Fehlerobjekt")).toBe("unerreichbar");
  });
});

describe("Die Probe selbst", () => {
  const versand = lies("lib/abo-versand.ts");
  const probe = versand.slice(versand.indexOf("export async function pruefePostfachAnmeldung"));

  it("meldet sich nur an und verschickt nichts", () => {
    // Eine Testmail bräuchte einen Empfänger — entweder einen Menschen, dem
    // man alle drei Stunden schreibt, oder ein Postfach, dessen
    // Erreichbarkeit selbst wieder niemand prüft.
    expect(probe).toMatch(/\.verify\(\)/);
    expect(probe).not.toMatch(/sendMail/);
  });

  it("probiert gar nicht erst, wenn die Zugangsdaten unvollständig sind", () => {
    // Sonst stünden zwei Meldungen über dieselbe Ursache nebeneinander.
    expect(probe).toMatch(/nicht-konfiguriert/);
  });

  it("baut die Verbindung aus derselben Quelle wie der Versand", () => {
    // Zwei Fassungen liefen auseinander, und dann prüft die Probe eine
    // Verbindung, die der Versand so gar nicht aufbaut.
    const transporte = versand.match(/createTransport\(/g) ?? [];
    expect(transporte.length).toBe(1);
  });

  it("bricht die Probe nach kurzer Zeit ab, der Versand nicht", () => {
    // Die Probe hängt an einer Route, die alle drei Stunden abgefragt wird;
    // ein hängender Verbindungsversuch blockiert dort eine Funktion. Beim
    // Versand ist ein Abbruch teurer als ein langsamer Server.
    expect(versand).toMatch(/connectionTimeout/);
    expect(versand).toMatch(/PROBE_TIMEOUT_MS/);
    expect(versand).toMatch(/baueTransport\(befund\.konfig\)/); // Versand ohne Zeitgrenze
  });
});

describe("Die Selbstauskunft der Produktion", () => {
  const route = lies("app/api/abo/bereit/route.ts");

  it("fragt das Postfach", () => {
    expect(route).toMatch(/pruefePostfachAnmeldung/);
  });

  it("rechnet NUR die Zurückweisung in die Bereitschaft ein", () => {
    // Eine unerreichbare Verbindung darf die Bereitschaft nicht kippen —
    // sonst meldet jede Netzstörung eine Fehlkonfiguration.
    expect(route).toMatch(/postfach === "abgelehnt"/);
    expect(route).not.toMatch(/postfach !== "ok"[\s\S]{0,80}fehlt\.push/);
  });

  it("gibt den Ausgang der Probe im Klartext zurück, aber keinen Wert", () => {
    expect(route).toMatch(/\bpostfach,/);
    expect(route).not.toMatch(/OUTREACH_SMTP_PASS/);
  });
});

describe("Was der Gesundheitscheck daraus protokolliert", () => {
  it("unterscheidet nachgesehen von konnte-nicht-nachsehen", () => {
    // Der teuerste Fehler wäre, eine ausgefallene Probe wie eine bestandene
    // aussehen zu lassen.
    expect(aboPostfachSatz("ok")).toMatch(/nimmt die Zugangsdaten an/);
    expect(aboPostfachSatz("unerreichbar")).toMatch(/kein Urteil/);
    expect(aboPostfachSatz("ok")).not.toBe(aboPostfachSatz("unerreichbar"));
  });

  it("behauptet bei einer ungemessenen Probe nichts über das Postfach", () => {
    // Eine ältere Auslieferung kennt das Feld nicht — das ist „nicht
    // gemessen", nicht „in Ordnung".
    expect(aboPostfachSatz(null)).not.toMatch(/nimmt die Zugangsdaten an/);
  });
});
