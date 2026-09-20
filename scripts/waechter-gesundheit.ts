/**
 * Läuft jeder Wächter noch?
 *
 *   npm run waechter:gesundheit            # nur die Läufe mit Befund, Exit 1 bei Stillstand
 *   npm run waechter:gesundheit -- --alle  # alle Läufe, auch die grünen
 *
 * WARUM ALS BEFEHL (Betreiber, 26.08.2026): Dieselbe Auswertung gab es zuerst
 * als Admin-Seite hinter Login. Die kann der Betreiber lesen — aber nicht der,
 * der die Wächter betreut und einen ausgefallenen Lauf wieder in Gang bringt.
 * Sein Urteil: „ich brauch die Übersicht nicht, wenn du da nicht rankommst."
 * Ein Zustand, den nur jemand sehen kann, der ihn nicht behebt, ist Zierde.
 *
 * WARUM ÜBERHAUPT: `stand:faellig` beantwortet, ob ein WERT zu alt ist. Die
 * Frage hier ist eine andere — ob der LAUF, der ihn frisch halten soll, noch
 * arbeitet. Ein Lauf, der ausfällt, hinterlässt keine Lücke, sondern nichts;
 * sichtbar wird er nur gegen eine Liste dessen, was laufen sollte. Gemessen am
 * 24.08.2026: acht von sechzehn Aufträgen hatten nie einen zuordenbaren
 * Bericht, darunter einer, der am selben Morgen nachweislich gelaufen war.
 *
 * Braucht die Datenbank (dort liegt die Ablage der Berichte). Ohne sie sagt der
 * Lauf das und urteilt nicht — „nicht nachgesehen" ist nicht „nichts gefunden".
 */
import { envLaden } from "./env-laden";
import { heuteInBerlin } from "../lib/zeit";
import type { Urteil } from "../lib/waechter-register";

const alle = process.argv.includes("--alle");
// Der DEUTSCHE Kalendertag, nicht der von UTC — dieselbe Korrektur wie am
// 01.09.2026 an der Stand-Schranke, an `stand:faellig` und an der Förder-Probe;
// dieser vierte Aufrufer wurde damals übersehen. Die Prüfdaten, gegen die hier
// gerechnet wird, sind deutsche Kalendertage. Zwischen 00:00 und 02:00 deutscher
// Sommerzeit liegt „heute" nach UTC einen Tag zurück: Am 02.09.2026 um 00:55 Uhr
// überschrieb dieser Lauf seinen Bericht mit „Wächter am 2026-09-01" und maß
// jedes Alter einen Tag zu kurz.
const heute = heuteInBerlin();

const MARKE: Record<Urteil["zustand"], string> = {
  laeuft: "ok      ",
  stillstand: "STILL   ",
  blind: "BLIND   ",
  unbekannt: "unklar  ",
};

async function main() {
  // Die Zugänge müssen stehen, BEVOR das Auswertungsmodul geladen wird: Der
  // Datenbank-Client entsteht beim Import, nicht beim ersten Aufruf. Ein
  // statischer Import oben hätte einen Client ohne Zugang erzeugt, und der Lauf
  // hätte „keine Datenbank konfiguriert" gemeldet, obwohl die Datei danebenliegt.
  envLaden();
  const { gesundheit } = await import("../lib/waechter-gesundheit");

  const daten = await gesundheit(heute);

  console.log(`Wächter am ${heute}\n`);
  if (!daten.ablageLesbar) {
    console.log(`  Ablage nicht gelesen: ${daten.problem ?? "unbekannter Grund"}`);
    console.log(`  Läufe, deren Lebenszeichen eine Meldung ist, stehen deshalb als „unklar".\n`);
  }

  const zeigen = alle ? daten.zeilen : daten.zeilen.filter((z) => z.urteil.zustand !== "laeuft");

  for (const z of zeigen) {
    console.log(`${MARKE[z.urteil.zustand]}  ${z.job.titel}  (${z.job.rhythmus})`);
    console.log(`            ${z.urteil.satz}`);
    if (z.job.runbook) console.log(`            Runbook: ${z.job.runbook}`);
    console.log();
  }

  const still = daten.zeilen.filter((z) => z.urteil.zustand === "stillstand");
  const blind = daten.zeilen.filter((z) => z.urteil.zustand === "blind");
  const unklar = daten.zeilen.filter((z) => z.urteil.zustand === "unbekannt");
  const ok = daten.zeilen.length - still.length - blind.length - unklar.length;

  console.log(
    `${daten.zeilen.length} Läufe: ${ok} ok, ${still.length} still, ` +
      `${blind.length} ohne Lebenszeichen, ${unklar.length} nicht nachgesehen`,
  );

  // Exit 1 nur bei Stillstand: Das ist der Befund, der Arbeit auslöst. „Ohne
  // Lebenszeichen" ist ein bekannter, im Register begründeter Zustand und darf
  // keinen roten Lauf erzeugen — sonst gewöhnt man sich an Rot, und der echte
  // Ausfall geht darin unter (dieselbe Lehre wie beim CI-Schritt an fremder
  // Infrastruktur).
  process.exit(still.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Wächter-Gesundheit konnte nicht ermittelt werden:", err);
  process.exit(2);
});
