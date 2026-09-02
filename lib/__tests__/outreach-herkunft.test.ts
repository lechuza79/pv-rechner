import { describe, it, expect } from "vitest";
import { ordneHerkunft, gemeindeDomain } from "../outreach-herkunft";

// Alle Fälle unten sind echte Verweise auf angeschriebene Gemeindeseiten,
// gemessen am 02.09.2026. Der Test hält die Einordnung an der Wirklichkeit
// fest statt an einer ausgedachten Liste.
describe("Herkunft eines Besuchers auf einer angeschriebenen Gemeindeseite", () => {
  it("erkennt ein soziales Netz als Veröffentlichung — auch die Mobil-Hostnamen", () => {
    // Heringen kam über drei verschiedene Facebook-Hostnamen gleichzeitig.
    for (const h of ["facebook.com", "m.facebook.com", "lm.facebook.com", "l.facebook.com"]) {
      expect(ordneHerkunft(h)).toBe("veroeffentlichung");
    }
    expect(ordneHerkunft("linkedin.com")).toBe("veroeffentlichung");
  });

  it("erkennt die eigene Website der Gemeinde als Veröffentlichung", () => {
    expect(ordneHerkunft("heringen.de", "https://www.heringen.de/")).toBe("veroeffentlichung");
    expect(ordneHerkunft("presse.heringen.de", "https://www.heringen.de/")).toBe("veroeffentlichung");
  });

  // DIE WICHTIGERE RICHTUNG: Eine fremde Domain darf NICHT als Veröffentlichung
  // durchgehen, nur weil sie den Ortsnamen enthält oder unbekannt ist.
  it("zählt eine fremde Gemeinde-Domain nicht als Veröffentlichung", () => {
    expect(ordneHerkunft("nidda.de", "https://www.heringen.de/")).toBe("andere");
  });

  it("trennt den Klick aus dem Postfach von der Veröffentlichung", () => {
    // Die Android-Mail-App meldet sich mit ihrem Paketnamen, nicht als Domain.
    expect(ordneHerkunft("com.google.android.gm")).toBe("brief");
    expect(ordneHerkunft("email.t-online.de")).toBe("brief");
  });

  // Ein Sicherheitsdienst öffnet Links in eingehenden Mails automatisch. Das
  // ist keine Aufmerksamkeit, sondern eine Maschine — als Empfänger-Klick
  // gezählt hätte er die Quote geschönt.
  it("erkennt den Mail-Prüfdienst und zählt ihn nicht als Menschen", () => {
    expect(ordneHerkunft("smex-ctp.trendmicro.com")).toBe("pruefdienst");
    expect(ordneHerkunft("eu1.safelinks.protection.outlook.com")).toBe("pruefdienst");
  });

  // Der Prüfdienst läuft VOR der Postfach-Regel: „safelinks.protection.outlook.com"
  // endet auf outlook.com und wäre sonst ein Mensch im Postfach.
  it("hält den Prüfdienst vom Postfach getrennt, auch bei gleicher Endung", () => {
    expect(ordneHerkunft("safelinks.protection.outlook.com")).not.toBe("brief");
  });

  it("ordnet Suchmaschine und KI-Antwort der Suche zu", () => {
    expect(ordneHerkunft("google.de")).toBe("suche");
    expect(ordneHerkunft("chatgpt.com")).toBe("suche");
  });

  it("erkennt die eigene Auswertung", () => {
    expect(ordneHerkunft("vercel.com")).toBe("intern");
  });

  // OHNE VERWEIS WIRD NICHT GEDEUTET. Darin steckt der Klick in der Mail
  // genauso wie der Aufruf aus einer Dorf-App (Wallertheim) — beides als
  // dasselbe zu zählen wäre eine Behauptung, keine Messung.
  it("deutet einen fehlenden Verweis nicht", () => {
    expect(ordneHerkunft("")).toBe("ohne");
    expect(ordneHerkunft("   ")).toBe("ohne");
  });

  it("liest die Domain der Gemeinde aus jeder gespeicherten Schreibweise", () => {
    expect(gemeindeDomain("https://www.heringen.de/rathaus")).toBe("heringen.de");
    expect(gemeindeDomain("heringen.de")).toBe("heringen.de");
    expect(gemeindeDomain("kaputt::/")).toBeNull();
    expect(gemeindeDomain(null)).toBeNull();
  });
});
