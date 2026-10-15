/**
 * DIE ATLAS-ABFRAGEN LEITEN IHRE HIERARCHIE NICHT MEHR AUS DER SCHREIBWEISE AB.
 *
 * WARUM (06.10.2026): Bis zu diesem Tag beantworteten die vier heißen
 * Datenbankfunktionen „welche Kinder hat diese Region" über die Zeichenlänge
 * des Schlüssels und „was liegt darunter" über den gemeinsamen Anfang. Das ist
 * eine Eigenschaft des deutschen Gemeindeschlüssels, keine der Sache: Eine
 * Zürcher Gemeindenummer beginnt nicht mit der ihres Kantons und ist nicht fest
 * sechsstellig — ein Anfangsvergleich auf „1" träfe dort 12, 100 und 1234 mit.
 *
 * Seitdem kommen beide Fragen aus geschriebenen Beziehungen (Verzeichnis und
 * Mitgliedertabelle). Dieser Test friert das ein. Er ist nötig, weil der
 * Rückfall keinen Fehler erzeugt: Für Deutschland liefern beide Regeln
 * dasselbe, gemessen über den ganzen Bestand — wer die alte zurückbaut, sieht
 * grüne Tests, richtige Zahlen und eine Seite, die normal aussieht. Erst der
 * zweite Markt zeigte stumm falsche Summen.
 *
 * WAS ER NICHT LEISTET: Er prüft nicht, ob die Zahlen stimmen. Das macht der
 * Vor/Nach-Vergleich beim Einspielen (`npx tsx scripts/apply-region-functions.ts`,
 * 22 Stichproben über alle vier Ebenen) und der Bestandsvergleich der
 * Kindermengen (`npm run region:kinder`, 0 Abweichungen über 11.668 Regionen).
 */
import { describe, it, expect } from "vitest";
import { MASTR_REGION_FUNCTIONS_SQL } from "../mastr-region-sql";

/** Nur die ausführbare SQL, ohne die Begründungen in den Kommentaren. */
function ohneKommentare(sql: string): string {
  return sql
    .split("\n")
    .filter((z) => !z.trim().startsWith("--"))
    .join("\n");
}

const CODE = ohneKommentare(MASTR_REGION_FUNCTIONS_SQL);

describe("Atlas-Abfragen ohne Stellenlogik", () => {
  it("schneidet den Gemeindeschlüssel nicht mehr auf eine Oberregion zu", () => {
    // `left(region_id, 2|5|8)` war die Ableitung „die ersten Stellen sind der
    // Elternteil". Andere Längen wären genauso falsch, deshalb greift das
    // Muster jede Zahl.
    const treffer = CODE.match(/left\(\s*a?\.?region_id\s*,\s*\d+\s*\)/gi) ?? [];
    expect(treffer, `noch vorhanden: ${treffer.join(", ")}`).toEqual([]);
  });

  it("gruppiert Kinder nicht über eine abgeschnittene Zeichenkette", () => {
    const treffer = CODE.match(/left\([^)]*,\s*%s\s*\)/gi) ?? [];
    expect(treffer, `noch vorhanden: ${treffer.join(", ")}`).toEqual([]);
  });

  it("grenzt nicht über ein Anfangsmuster auf dem Schlüssel ein", () => {
    // `region_id LIKE '<schluessel>%'` bzw. `region_key LIKE p_prefix || '%'`.
    const treffer = CODE.match(/region_(id|key)\s+LIKE/gi) ?? [];
    expect(treffer, `noch vorhanden: ${treffer.join(", ")}`).toEqual([]);
  });

  it("wählt die Ebene nicht mehr über die Länge des Schlüssels", () => {
    const treffer = CODE.match(/length\(\s*r?2?\.?region_key\s*\)/gi) ?? [];
    expect(treffer, `noch vorhanden: ${treffer.join(", ")}`).toEqual([]);
  });

  it("benutzt stattdessen Verzeichnis und Mitgliedschaft", () => {
    // Die Gegenprobe zum Test selbst: Wären die Muster oben erfüllt, weil die
    // SQL gar keine Hierarchie mehr enthält, prüfte er nichts und meldete grün.
    //
    // GEZÄHLT, NICHT NUR GESUCHT. Die erste Fassung fragte, ob die
    // Elternbedingung IRGENDWO vorkommt — und blieb grün, als zur Probe beide
    // echten Filter in den Live-Zweigen entfernt wurden: Die Vorprüfung (EXISTS)
    // trägt dieselbe Bedingung, und die genügte dem Muster. Derselbe Fehler, den
    // dieses Projekt schon zweimal gemacht hat (eine Prüfung, die den Wert in
    // seiner eigenen Definition findet). Die Zahlen sind gemessen:
    //   4 × gegen die Variable  — je Funktion die Vorprüfung und der Rollup-Zweig
    //   2 × als Literal (%L)    — je Funktion der Zweig über die Rohtabelle
    const gegenVariable = CODE.match(/parent_region_id\s*=\s*p_eltern/g) ?? [];
    const alsLiteral = CODE.match(/parent_region_id\s*=\s*%L/g) ?? [];
    expect(gegenVariable.length, "Vorprüfung oder Rollup-Zweig ohne Elternbedingung").toBe(4);
    expect(alsLiteral.length, "Zweig über die Rohtabelle ohne Elternbedingung").toBe(2);
    expect(CODE).toMatch(/mastr_region_mitglied/);
    // Der Schlüssel muss weiter als LITERAL in den Abfragetext — ein Parameter
    // lässt den Index auf der großen Tabelle liegen (590 ms statt 70 ms,
    // gemessen 28.07.2026, siehe Kopf der SQL-Datei).
    expect(CODE).toMatch(/format\('JOIN mastr_region_mitglied[^']*%L'/);
  });

  it("rechnet den Bundes-Schlüssel an EINER Stelle auf den Verzeichnis-Elternteil um", () => {
    // Der Bund heißt im Verzeichnis 'de', der Atlas-Schlüssel ist der leere
    // String. Zwei Fassungen dieser Umrechnung liefen irgendwann auseinander;
    // sie steht deshalb je Funktion genau einmal.
    const treffer = CODE.match(/CASE WHEN p_prefix = '' THEN 'de' ELSE p_prefix END/g) ?? [];
    expect(treffer.length).toBe(2);
  });

  it("erlaubt als Schlüssel auch Buchstaben — ein Markt-Wurzelschlüssel ist keine Zahl", () => {
    expect(CODE).toMatch(/\^\[0-9a-z\]\*\$/);
  });
});
