import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { pngMasse, vorschaubildBefund } from "../../scripts/health-check";

/**
 * Das Vorschaubild war vom 08. bis 09.09.2026 vierzehn Stunden lang LEER, und
 * von außen war nichts kaputt: HTTP 200, Inhaltstyp „image/png", null Byte
 * Inhalt — und mit einem Jahr Zwischenspeicherung ausgeliefert. Ursache war der
 * Bot-Schutz: Die Bild-Funktion holte ihre Schrift über die eigene öffentliche
 * Adresse zurück und bekam dort die Prüfaufgabe als HTML; der Schriftleser
 * scheiterte an deren ersten vier Zeichen.
 *
 * Zwei Richtungen werden hier festgenagelt, weil eine allein nicht getragen
 * hätte: die BAUWEISE (die Schrift kommt aus dem Bündel, nicht über die eigene
 * Adresse) und die WIRKUNG (der Gesundheitscheck erkennt ein leeres Bild).
 */
describe("Vorschaubild", () => {
  const routeQuelle = readFileSync(join(process.cwd(), "app/api/og/route.tsx"), "utf8");

  it("holt seine Schrift NICHT über die eigene Adresse", () => {
    // Der Fehler war nicht der Schriftname, sondern der Weg: ein Abruf gegen die
    // eigene öffentliche Domain aus einer Funktion heraus. Geprüft wird deshalb
    // die Kombination, nicht die Datei — jeder solche Abruf einer eigenen
    // statischen Datei bricht wieder, sobald sich am Rand etwas ändert.
    const zeilen = routeQuelle.split("\n");
    const treffer = zeilen.filter((z) => /nextUrl\.origin/.test(z) && /\/fonts?\/|\.ttf|\.woff|\.otf|logo|\.png/i.test(z));
    expect(treffer, `statische Datei über die eigene Adresse geholt:\n${treffer.join("\n")}`).toEqual([]);
  });

  it("lädt die Schrift aus dem Bündel", () => {
    expect(routeQuelle).toMatch(/new URL\("\.\/JetBrainsMono-Bold\.ttf", import\.meta\.url\)/);
  });

  it("die Schriftdatei liegt neben der Route und ist eine echte Schrift", () => {
    const datei = readFileSync(join(process.cwd(), "app/api/og/JetBrainsMono-Bold.ttf"));
    expect(datei.length).toBeGreaterThan(50_000);
    // TrueType beginnt mit 0x00010000, OpenType mit "OTTO".
    const kopf = datei.subarray(0, 4).toString("hex");
    expect(["00010000", "4f54544f"]).toContain(kopf);
  });

  it("erkennt ein PNG an Signatur und Breite", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    // IHDR-Breite 1200 = 0x000004B0, ab Byte 16.
    png.set([0x00, 0x00, 0x04, 0xb0], 16);
    expect(pngMasse(png)).toEqual({ png: true, breite: 1200 });
  });

  it("hält die leere Antwort für kein Bild — auch bei HTTP 200", () => {
    expect(pngMasse(new Uint8Array(0))).toEqual({ png: false, breite: null });
    const befund = vorschaubildBefund({ status: 200, bytes: 0, png: false, breite: null });
    expect(befund).toHaveLength(1);
    expect(befund[0]).toMatch(/kein Bild/);
  });

  it("meldet die Prüfaufgabe des Bot-Schutzes als kein Bild", () => {
    // Genau der Fall vom 08.09.2026: HTML statt Schrift, also HTML statt Bild.
    const html = new TextEncoder().encode("<!DOCTYPE html><html>…</html>".padEnd(4000, " "));
    expect(pngMasse(html).png).toBe(false);
    expect(vorschaubildBefund({ status: 200, bytes: html.length, png: false, breite: null })).toHaveLength(1);
  });

  it("schweigt bei einem echten Bild und wenn gar nicht gemessen werden konnte", () => {
    expect(vorschaubildBefund({ status: 200, bytes: 32_925, png: true, breite: 1200 })).toEqual([]);
    // Nicht messbar ist kein Befund — „ich konnte nicht nachsehen" ist nicht
    // dasselbe wie „ich habe nachgesehen und nichts gefunden".
    expect(vorschaubildBefund(null)).toEqual([]);
  });

  it("meldet einen falschen Zuschnitt und einen Fehlercode getrennt", () => {
    expect(vorschaubildBefund({ status: 200, bytes: 900, png: true, breite: 600 })[0]).toMatch(/600 statt 1200/);
    expect(vorschaubildBefund({ status: 500, bytes: 0, png: false, breite: null })[0]).toMatch(/500 statt 200/);
  });

  it("der Gesundheitscheck ruft die Messung wirklich auf", () => {
    // Geprüft wird die VERWENDUNG, nicht das Vorhandensein: Eine Messung, die
    // niemand aufruft, ist von keiner nicht zu unterscheiden.
    // Und ausdrücklich NICHT als bloßes Vorkommen im Text: Beim Bauen dieses
    // Wächters blieb er grün, als die Zeile auskommentiert wurde — die Suche
    // fand sie im Kommentar wieder. Geprüft werden deshalb nur Zeilen, die
    // wirklich Code sind.
    const hc = readFileSync(join(process.cwd(), "scripts/health-check.ts"), "utf8");
    const codeZeilen = hc
      .split("\n")
      .map((z) => z.trim())
      .filter((z) => !z.startsWith("//") && !z.startsWith("*") && !z.startsWith("/*"));
    expect(codeZeilen).toContain("const vorschau = await messeVorschaubild();");
    expect(codeZeilen).toContain("forClaude.push(...vorschaubildBefund(vorschau));");
  });
});
