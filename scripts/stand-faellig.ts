/**
 * Totmann-Schalter für die Prüfdaten.
 *
 *   npm run stand:faellig            # Liste, Exit 1 wenn etwas überfällig ist
 *   npm run stand:faellig -- --alle  # ganzer Prüfstand, auch das Grüne
 *
 * WARUM (17.08.2026): Die Regel „das Prüfdatum wandert mit jedem erreichten
 * Lauf" stand im Gate, kontrolliert hat sie niemand. Beim Nachsehen war der
 * Wärmepumpen-Wächter seit seiner Einrichtung am 13.07.2026 nie gelaufen — der
 * erste Termin verstrich still, und die Werte auf der Seite alterten mit einem
 * Prüfdatum, das keiner bewegte. Ein Wächter, der nicht läuft, meldet nichts;
 * das ist der Unterschied zwischen „alles in Ordnung" und „niemand hat
 * nachgesehen", und ohne dieses Skript sehen beide gleich aus.
 *
 * Läuft ohne Datenbank und ohne Netz: Es liest nur die Configs. Deshalb kann es
 * in jedem Wächter-Lauf am Anfang stehen, auch wenn der eigentliche Auftrag
 * gerade an einer Quelle scheitert.
 */
import { faelligkeiten, tageZwischen, PRUEFSTAND } from "../lib/pruefstand";
import { heuteInBerlin } from "../lib/zeit";

const alle = process.argv.includes("--alle");
// Kein Datum aus der Umgebung raten: Der heutige Tag ist die einzige Eingabe,
// und die kommt sichtbar aus der Uhr des Laufs — als DEUTSCHER Kalendertag, denn
// die Prüfdaten sind Kalendertage. Über `toISOString()` gemessen lag „heute"
// zwischen 00:00 und 02:00 deutscher Sommerzeit einen Tag zurück; ein Lauf um
// halb eins nachts hätte eine gerade verstrichene Frist noch als offen gemeldet.
const heute = heuteInBerlin();

const offen = faelligkeiten(heute);

if (alle) {
  console.log(`Prüfstand am ${heute}\n`);
  for (const e of PRUEFSTAND) {
    const alter = tageZwischen(e.geprueftIso, heute);
    const faellig = offen.find(o => o.feld === e.feld);
    const marke = faellig ? "ÜBERFÄLLIG" : "ok        ";
    console.log(
      `${marke}  ${e.was}\n` +
      `            geprüft ${e.geprueftIso} (vor ${alter} ${alter === 1 ? "Tag" : "Tagen"})` +
      `${e.reviewBy ? `, Termin ${e.reviewBy}` : ""}\n` +
      `            ${e.waechter} — ${e.rhythmus}\n`
    );
  }
}

if (offen.length === 0) {
  console.log(`Prüfstand am ${heute}: nichts überfällig (${PRUEFSTAND.length} Einträge).`);
  process.exit(0);
}

console.log(`Prüfstand am ${heute}: ${offen.length} überfällig\n`);
for (const o of offen) {
  // Die zwei Gründe brauchen zwei verschiedene Antworten, deshalb stehen sie
  // getrennt da: Beim Termin gehört der WERT auf den Prüfstand, beim Stillstand
  // der WÄCHTER.
  const grund =
    o.grund === "termin"
      ? `Termin ${o.reviewBy} um ${o.terminUeberzogen} Tage überzogen — Wert prüfen`
      : o.grund === "stillstand"
        ? `seit ${o.alterTage} Tagen unbewegt (erlaubt: ${o.maxAlterTage}) — läuft der Wächter noch?`
        : `Termin ${o.reviewBy} überzogen UND seit ${o.alterTage} Tagen unbewegt`;
  console.log(`• ${o.was}\n  ${grund}\n  ${o.feld} · ${o.waechter} (${o.rhythmus}) · ${o.runbook}\n`);
}

// Exit 1, damit ein Wächter-Lauf die Liste nicht übersehen kann.
process.exit(1);
