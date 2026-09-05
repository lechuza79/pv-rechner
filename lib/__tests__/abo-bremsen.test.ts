import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { BESTAETIGUNG_SPERRE_MS, OFFENE_JE_ADRESSE_MAX } from "../gemeinde-abo";

// Was die Anmeldung gegen Missbrauch hat — und was ihre Grenzen sind.
//
// DER ANLASS ist eine Frage des Betreibers („haben wir irgendwas Richtung
// Spamschutz?"), und die ehrliche Antwort war: zu wenig. Die vorhandene
// Zählung lief im Arbeitsspeicher, also je Instanz und nach jedem Neustart bei
// null — gegen ein Skript, das über mehrere Instanzen verteilt anfragt, tut
// sie nichts. Der Schaden wäre nicht theoretisch: Wer eine fremde Adresse für
// hunderte Orte einträgt, schickt hunderte Bestätigungsmails, die niemand
// bestellt hat, und die Beschwerden treffen das Postfach, über das später die
// echten Meldungen laufen.
//
// Die Bremse zählt deshalb an der ADRESSE gegen die Datenbank. Das ist
// zusätzlich die richtige Größe: Geschützt wird der Mensch, dessen Postfach
// zugeschüttet wird, nicht ein Anschluss — und eine dauerhafte Zählung je
// IP-Adresse müsste diese speichern, was die Datenschutzerklärung ausdrücklich
// ausschließt.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Grenzwerte", () => {
  it("lässt einem Menschen Luft und deckelt trotzdem", () => {
    // Wohnort, Elternwohnort, Arbeitsort — mehr als eine Handvoll offener
    // Anmeldungen gleichzeitig hat niemand. Zu eng gesetzt trifft die Grenze
    // echte Leute, zu weit gesetzt schützt sie niemanden.
    expect(OFFENE_JE_ADRESSE_MAX).toBeGreaterThanOrEqual(3);
    expect(OFFENE_JE_ADRESSE_MAX).toBeLessThanOrEqual(10);
  });

  it("sperrt die zweite Bestätigung kurz, nicht lang", () => {
    // Lang genug gegen ein Skript, kurz genug, dass jemand, dessen Mail
    // wirklich nicht ankam, nicht wartet.
    expect(BESTAETIGUNG_SPERRE_MS).toBeGreaterThanOrEqual(30_000);
    expect(BESTAETIGUNG_SPERRE_MS).toBeLessThanOrEqual(15 * 60_000);
  });
});

describe("Die Bremsen sitzen dort, wo sie wirken", () => {
  const schicht = lies("lib/gemeinde-abo.ts");
  const route = lies("app/api/abo/anmelden/route.ts");

  it("zählt gegen die DATENBANK, nicht im Arbeitsspeicher", () => {
    // Der Kern der Änderung. Eine Zählung in einer Map wäre auf einer
    // Plattform, die Anfragen über mehrere Instanzen verteilt, wirkungslos —
    // und das sieht man ihr nicht an, weil sie lokal einwandfrei funktioniert.
    expect(schicht).toMatch(/count:\s*"exact"/);
    expect(schicht).toMatch(/\.eq\("email",\s*email\)/);
    expect(schicht).toMatch(/\.eq\("status",\s*"ausstehend"\)/);

    // UND die Zählung muss WIRKEN, nicht nur dastehen. Die erste Fassung
    // dieses Tests prüfte, ob die Grenze irgendwo im Modul vorkommt — sie kommt
    // in ihrer eigenen Definition vor, also blieb er grün, als die Prüfzeile
    // zur Probe ausgebaut wurde. Ein Wächter, der nichts sieht und trotzdem
    // grün meldet, ist schlimmer als keiner. Gesucht wird deshalb der
    // Vergleich, der zum stillen Fall führt.
    const bremszeile = schicht
      .split("\n")
      .find((z) => z.includes("OFFENE_JE_ADRESSE_MAX") && z.includes('art: "still"'));
    expect(bremszeile, "Die Grenze wird nirgends geprüft — die Zählung läuft ins Leere").toBeDefined();
    expect(bremszeile!).toMatch(/>=/);
  });

  it("nimmt die Zeit von außen, statt selbst auf die Uhr zu sehen", () => {
    // Dieselbe Regel wie beim Förder-Verlauf und beim Prüfdatum: Eine Funktion,
    // die ihre eigene Uhr liest, ist nicht prüfbar und stempelt irgendwann
    // etwas, das niemand erhoben hat. Der Zeitpunkt wird hereingereicht.
    // Auf die ZEILE geprüft, nicht über Zeichen-Abstände: Ein Test, der einen
    // Ausschnitt ab einem Suchtreffer nimmt, misst die Reihenfolge von
    // Konstanten-Definition und Verwendung mit — und wird rot, sobald jemand
    // die Datei umsortiert, ohne dass sich am Verhalten etwas ändert.
    const zeile = schicht
      .split("\n")
      .find((z) => z.includes("BESTAETIGUNG_SPERRE_MS") && z.includes("if ("));
    expect(zeile).toBeDefined();
    expect(zeile!).toMatch(/Date\.parse\(o\.jetztIso\)/);
    // Und die Uhr wird NICHT selbst gelesen.
    expect(zeile!).not.toMatch(/Date\.now\(\)/);
  });

  it("prüft die Grenze NUR vor einer neuen Zeile, nicht vor dem Aufwecken", () => {
    // Wer einen vorhandenen Eintrag erneuert, erhöht die Zahl der offenen
    // Anmeldungen nicht. Ihn dort abzuweisen träfe genau den Menschen, dessen
    // Bestätigungsmail nicht angekommen ist — also den Fall, für den es den
    // zweiten Versuch überhaupt gibt.
    const vorInsert = schicht.indexOf("abo-offene-zaehlen");
    const aufwecken = schicht.indexOf("abo-aufwecken");
    expect(vorInsert).toBeGreaterThan(aufwecken);
  });

  it("verrät nach außen nicht, DASS gebremst wurde", () => {
    // Eine eigene Fehlermeldung („zu viele offene Anmeldungen") verriete,
    // welche Adressen bereits eingetragen sind — genau die Auskunft, die diese
    // Route sonst überall vermeidet. Der gebremste Fall bekommt deshalb
    // dieselbe Antwort wie jeder andere.
    expect(route).toMatch(/if \(ergebnis\.art === "still"\) return OK;/);
  });

  it("benennt die Grenze der Speicher-Zählung, statt sie zu verschweigen", () => {
    // Der Kommentar an dieser Stelle behauptete bis 01.09.2026, eine Ablage in
    // der Datenbank stünde „in keinem Verhältnis". Ein Kommentar, der eine
    // Schwäche als Entscheidung ausgibt, ist schlimmer als keiner: Die nächste
    // Sitzung liest ihn als geprüft.
    expect(route).toMatch(/je Instanz/);
    expect(route).not.toMatch(/in keinem Verhältnis/);
  });
});

describe("Die Datenbank kann die Zählung überhaupt beantworten", () => {
  it("hat einen Index über Adresse und Status", () => {
    // Ohne ihn kostet jede Anmeldung einen vollständigen Tabellendurchlauf.
    // Der eindeutige Index liegt auf (Ort, Adresse) und trägt das nicht: Hier
    // wird über alle Orte hinweg gesucht.
    const setup = lies("app/api/abo/setup/route.ts");
    expect(setup).toMatch(/CREATE INDEX IF NOT EXISTS idx_gemeinde_abos_offene_je_adresse[\s\S]{0,120}\(email,\s*status\)/);
  });
});
