import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INSTAGRAM_SCOPES, anmeldeAdresse, rueckrufAdresse } from "../instagram";

/**
 * Die Instagram-Anbindung.
 *
 * Geprüft wird, was ohne Konto prüfbar ist: die Anmeldeadresse und die Namen
 * der Berechtigungen. Beides sind Angaben, deren Fehler NICHT als Fehler
 * auffallen — eine Anmeldung mit falschem Berechtigungsnamen läuft durch und
 * liefert einen Schlüssel, der beim ersten Veröffentlichungsversuch abgewiesen
 * wird, also Wochen später.
 */

const WURZEL = join(__dirname, "..", "..");

describe("Anmeldeadresse", () => {
  const url = new URL(anmeldeAdresse("https://solar-check.io", "abc123"));

  it("führt zu Instagram, nicht zu Facebook", () => {
    // Es gibt ZWEI Wege zur selben Schnittstelle: über den Instagram-Login und
    // über den Facebook-Login mit verknüpfter Seite. Wir nehmen den ersten; die
    // Adressen der beiden sehen ähnlich aus und sind nicht austauschbar.
    expect(url.origin + url.pathname).toBe("https://www.instagram.com/oauth/authorize");
  });

  it("trägt die Rückrufadresse dieser Anbindung", () => {
    expect(url.searchParams.get("redirect_uri")).toBe("https://solar-check.io/api/instagram/callback");
    expect(rueckrufAdresse("https://solar-check.io")).toBe("https://solar-check.io/api/instagram/callback");
  });

  it("reicht den Zufallswert gegen untergeschobene Rückrufe durch", () => {
    expect(url.searchParams.get("state")).toBe("abc123");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("trennt die Berechtigungen mit Komma, nicht mit Leerzeichen", () => {
    // Die Anmeldedokumentation verlangt komma- oder URL-kodiert
    // leerzeichengetrennt. LinkedIn nebenan nimmt Leerzeichen — wer von dort
    // kopiert, baut hier eine Anmeldung, die anders ausgeht als gedacht.
    expect(url.searchParams.get("scope")).toBe(
      "instagram_business_basic,instagram_business_content_publish",
    );
  });
});

describe("Feste Rückrufadresse", () => {
  it("nimmt die konfigurierte Adresse, nicht den Ursprung der Anfrage", () => {
    // Aus der Anfrage abgeleitet hing die Adresse daran, über welche Domain der
    // Aufruf kam — mit „www." davor ist es ein anderer Ursprung als ohne, und
    // Instagram lehnt den Schlüsseltausch dann ab, obwohl im Portal alles
    // richtig steht. Real passiert am 01.09.2026.
    const vorher = process.env.INSTAGRAM_REDIRECT_URI;
    process.env.INSTAGRAM_REDIRECT_URI = "https://solar-check.io/api/instagram/callback";
    try {
      expect(rueckrufAdresse("https://www.solar-check.io")).toBe(
        "https://solar-check.io/api/instagram/callback",
      );
      const url = new URL(anmeldeAdresse("https://www.solar-check.io", "x"));
      expect(url.searchParams.get("redirect_uri")).toBe(
        "https://solar-check.io/api/instagram/callback",
      );
    } finally {
      if (vorher === undefined) delete process.env.INSTAGRAM_REDIRECT_URI;
      else process.env.INSTAGRAM_REDIRECT_URI = vorher;
    }
  });
});

describe("Berechtigungen", () => {
  it("nennt die seit März 2026 gültigen Namen", () => {
    // Die alten Kurzformen sind abgelöst. Wer sie noch schickt, bekommt eine
    // Anmeldung, die aussieht, als hätte sie funktioniert — und einen Schlüssel
    // ohne Schreibrecht.
    expect(INSTAGRAM_SCOPES).toContain("instagram_business_basic");
    expect(INSTAGRAM_SCOPES).toContain("instagram_business_content_publish");
    expect(INSTAGRAM_SCOPES).not.toContain("business_basic");
    expect(INSTAGRAM_SCOPES).not.toContain("business_content_publish");
    // Und nicht die des Facebook-Login-Wegs, der eine andere Anmeldung braucht.
    expect(INSTAGRAM_SCOPES).not.toContain("instagram_content_publish");
  });
});

describe("Erneuerungs-Hinweis des Gesundheitschecks", () => {
  it("nennt die Adresse der betroffenen Plattform, nicht fest LinkedIn", () => {
    // Der Hinweis stand fest auf LinkedIn, weil es lange nur die eine gab. Mit
    // einem zweiten Kanal wird daraus eine Anleitung ins Leere: Der Betreiber
    // klickt, meldet LinkedIn neu an, und der Instagram-Zugang läuft weiter aus.
    const quelle = readFileSync(join(WURZEL, "scripts", "health-check.ts"), "utf8");
    const abschnitt = quelle.slice(quelle.indexOf("for (const s of await messeSocialAblauf())"));
    const bis = abschnitt.slice(0, abschnitt.indexOf("Kostenwache"));
    expect(bis).toContain("api/${s.plattform}/start");
    expect(bis).not.toContain("api/linkedin/start");
  });
});
