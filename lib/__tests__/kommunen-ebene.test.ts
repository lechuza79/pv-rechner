import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { darfOutreachEmpfangen, istGemeindeSchluessel, istKreisSchluessel } from "../kommunen-ebene";

/**
 * Die Kontakttabelle führt seit dem 09.09.2026 zwei Verwaltungsebenen — und der
 * Outreach darf nur die eine sehen.
 *
 * DER ANLASS: Ein Landkreis, der selbst fördert, war für die Förder-Suche
 * strukturell unsichtbar; alle 11.219 Zeilen der Tabelle trugen einen
 * achtstelligen Gemeindeschlüssel. Der Landkreis Oldenburg zahlt seit dem
 * 20.03.2026 einen Zuschuss für Balkonkraftwerke mit Speicher, und wir haben ihn
 * über eine fremde Liste gefunden statt über den eigenen Lauf.
 *
 * DER PREIS DER LÖSUNG ist genau dieser Test. Aus derselben Tabelle speist sich
 * der Kommunen-Outreach, dessen Anschreiben einen Platz in einer Rangliste
 * gleich großer GEMEINDEN behauptet. An einen Landkreis geschickt wäre der
 * Aufhänger frei erfunden — und es wäre eine echte Mail an eine echte Behörde,
 * also nichts, was sich zurückholen lässt.
 *
 * „Ein Kreis bekommt keine Kampagne zugewiesen, also passiert das nie" ist eine
 * Beobachtung über den heutigen Zustand, keine Grenze. Dieses Projekt hat
 * mehrfach erlebt, dass ein zweiter Schreibweg genau solche Zusagen einlöst.
 */
describe("Verwaltungsebene in der Kontakttabelle", () => {
  it("unterscheidet Gemeinde und Kreis an der Schlüssellänge", () => {
    expect(istGemeindeSchluessel("03458010")).toBe(true); // Hude (Oldenburg)
    expect(istGemeindeSchluessel("03458")).toBe(false);
    expect(istKreisSchluessel("03458")).toBe(true); // Landkreis Oldenburg
    expect(istKreisSchluessel("03458010")).toBe(false);
    // Kein Schlüssel ist beides — sonst hinge die Grenze von der Reihenfolge ab.
    for (const id of ["03458", "03458010", "08335043", "08335"]) {
      expect(istGemeindeSchluessel(id) && istKreisSchluessel(id)).toBe(false);
    }
  });

  it("lässt nur Gemeinden ein Anschreiben empfangen", () => {
    expect(darfOutreachEmpfangen("03458010")).toBe(true);
    expect(darfOutreachEmpfangen("03458")).toBe(false);
    expect(darfOutreachEmpfangen("")).toBe(false);
    expect(darfOutreachEmpfangen("0345801")).toBe(false);
  });

  // Die wichtigere Richtung: Wer einen dritten Schreibweg auf die Tabelle baut,
  // soll an dieser Stelle merken, dass es eine Grenze gibt. Geprüft wird die
  // VERWENDUNG, nicht das Vorhandensein der Funktion — ein Import, der nirgends
  // aufgerufen wird, sichert nichts.
  it("beide Outreach-Wege fragen die Grenze wirklich ab", () => {
    const wege = [
      "app/api/admin/kommunen/versandpaket/route.ts",
      "lib/kommunen-brief.ts",
    ];
    for (const w of wege) {
      const quelle = readFileSync(resolve(process.cwd(), w), "utf8");
      expect(quelle, `${w} importiert die Ebenen-Grenze nicht`).toMatch(/from "[^"]*kommunen-ebene"/);
      expect(quelle, `${w} ruft darfOutreachEmpfangen nicht auf`).toMatch(/!darfOutreachEmpfangen\(/);
    }
  });
});
