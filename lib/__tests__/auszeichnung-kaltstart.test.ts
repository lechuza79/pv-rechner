import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Der Seitenaufbau darf den Auszeichnungs-Index nicht selbst rechnen.
//
// DER ANLASS IST GEMESSEN (08.09.2026). Seit dem 05.09. fragte die
// Gemeindeseite beim Aufbau, ob für die Auszeichnungs-Kachel Platz reserviert
// werden soll. Die Ja/Nein-Antwort hängt an einer Rangfolge über ALLE Orte,
// also am vollen Index: 10.742 Zeilen, 3,70 s beim ersten Aufruf in einem
// frischen Prozess, 0,00 s bei jedem weiteren.
//
// GENAU DIESES MUSTER STAND IN DEN GESUNDHEITSLÄUFEN: erste Stichprobe 5,5 bis
// 7,9 s, jede folgende 0,6 bis 1,8 s — sechsmal in zwei Tagen, einmal 0,1 s vor
// der Notbremse bei 8 s. Über die 60 Läufe davor lag keine erste Stichprobe
// über 3,3 s. Kein Fehler, kein roter Test, keine kaputte Seite; die Seiten
// antworteten durchweg mit 200. Das ist die Vorstufe zum Ausfall, die dieses
// Projekt im Juli 2026 schon einmal zwei Tage lang nicht gesehen hat.
//
// EIN PROZESS-LOKALES MEMO IST DAGEGEN KEIN SCHUTZ: Es spart den zweiten
// Aufruf, nie den ersten — und eine frisch gestartete Function macht immer
// einen ersten. Deshalb prüft dieser Wächter die VERWENDUNG (was ruft der
// Seitenaufbau wirklich auf), nicht das bloße Vorhandensein eines Caches.

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const server = lies("lib/awards-server.ts");
const seite = lies("app/(site)/solar-atlas/[bundesland]/[kreis]/[gemeinde]/page.tsx");

/** Der Rumpf einer Funktion ab ihrer Deklaration bis zur schließenden Klammer in Spalte 1. */
function rumpf(quelle: string, deklaration: string): string {
  const ab = quelle.indexOf(deklaration);
  expect(ab, `nicht gefunden: ${deklaration}`).toBeGreaterThan(-1);
  const ende = quelle.indexOf("\n}", ab);
  return quelle.slice(ab, ende === -1 ? undefined : ende);
}

describe("Auszeichnungs-Platzhalter: der Kaltstart zahlt ihn nicht", () => {
  it("die Ja/Nein-Frage rechnet den Index NICHT selbst", () => {
    const koerper = rumpf(server, "export async function hatAuszeichnung(");
    expect(
      koerper,
      "hatAuszeichnung darf den vollen Index nicht je Aufruf bauen — das ist die Bauweise, " +
        "die eine frisch gestartete Function 3,7 s kostet",
    ).not.toMatch(/buildHookIndex|loadAwardStats/);
    expect(koerper, "sie fragt die gecachte Liste").toMatch(/auszeichnungsOrte\(/);
  });

  it("die Liste liegt im GETEILTEN Cache, nicht nur im Prozess", () => {
    // Der Unterschied ist der ganze Punkt: `memoize` lebt je Function-Instanz
    // und ist nach jedem Kaltstart leer, der Datencache nicht.
    expect(server).toMatch(/export const auszeichnungsOrte = unstable_cache\(/);
    const stelle = server.slice(server.indexOf("export const auszeichnungsOrte"));
    const optionen = stelle.slice(0, stelle.indexOf("});"));
    expect(optionen, "mit der Marke des Datenlaufs, damit der Monatslauf sie mitnimmt").toMatch(
      /tags:\s*\[ATLAS_DATEN_TAG\]/,
    );
    expect(optionen, "mit Ablauf").toMatch(/revalidate:\s*\d+/);
  });

  it("gecacht wird NUR die Kennung, sonst reißt der 2-MB-Deckel", () => {
    // Gemessen: der volle Index ist 7,11 MB und passt nicht in den Datencache;
    // die bloßen Kennungen sind 49 kB. Jedes zusätzliche Feld je Ort führt die
    // Liste zurück Richtung Deckel — und ein gerissener Deckel fällt still aus,
    // die Ansicht rechnet dann wieder jedes Mal neu.
    const koerper = rumpf(server, "const auszeichnungsOrteUncached");
    expect(koerper, "die Liste trägt genau die Kennung").toMatch(/\.map\(\(r\) => r\.regionId\)/);
    expect(koerper, "kein Objekt je Ort").not.toMatch(/=>\s*\(\{/);
  });

  it("die Gemeindeseite stellt die Frage weiterhin, statt zu raten", () => {
    // Die Gegenrichtung: Ohne die Frage gäbe es nur zwei schlechte Antworten —
    // nie ein Platzhalter (der Inhalt springt) oder immer einer (er springt bei
    // den Orten ohne Auszeichnung, nur andersherum).
    expect(seite).toMatch(/erwartet=\{await hatAuszeichnung\(/);
  });
});
