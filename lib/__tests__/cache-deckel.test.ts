import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { leseHaltbarkeit } from "./haltbarkeit-lesen";

/**
 * EIN KURZER ZWISCHENSPEICHER IM SEITENRAHMEN DECKELT DIE GANZE DOMAIN.
 *
 * Next nimmt für eine Seite die KÜRZESTE Haltbarkeit im gesamten Renderbaum.
 * Alles, was der Seitenrahmen (app/(site)/layout.tsx) lädt, liegt in diesem Baum
 * für JEDE Seite. Ein Zwischenspeicher mit fünf Minuten dort macht also aus
 * jeder Seite der Domain eine Fünf-Minuten-Seite — auch aus einer, die
 * ausdrücklich sieben Tage haben will.
 *
 * GENAU DAS WAR AM 26.08.2026 DER FALL, und es ist von außen unsichtbar: Die
 * Seiten waren schnell, richtig und vollständig. Erst eine Messreihe auf
 * Produktion (260 Abrufe über 12 Minuten vom selben Auslieferungsknoten) zeigte
 * es: kein Treffer älter als 273 Sekunden, dann kippte alles gleichzeitig. Die
 * Atlas-Seiten mit sieben Tagen Haltbarkeit liefen im selben Takt wie der Rest —
 * ihre Umstellung am selben Tag war dadurch wirkungslos.
 *
 * Der Schaden ist teuer, weil er sich multipliziert: rund 200 Seiten mal 288
 * Verfälle am Tag, und jeder Verfall kostet einen kompletten Neuaufbau samt
 * Cache-Schreibvorgang — die teuerste Zeile der Rechnung.
 *
 * Deshalb dieser Test. Er ist bewusst STRENGER als nötig: Er prüft nicht, was
 * der Seitenrahmen heute lädt (das wäre eine Importkette, die bei jeder
 * Umstrukturierung bricht), sondern verlangt von JEDEM zwischengespeicherten
 * Lesevorgang eine Mindesthaltbarkeit. Ein Modul, das heute nicht im Rahmen
 * liegt, kann morgen dort landen — und dann wäre es zu spät.
 */

const LIB = path.join(__dirname, "..");

/**
 * Mindesthaltbarkeit für einen zwischengespeicherten Lesevorgang.
 *
 * Eine Stunde ist die kürzeste Haltbarkeit, die im Projekt bewusst gewählt wird
 * (Förderseiten, Ratgeber, Widgets). Alles darunter kann nur schaden: Es
 * deckelt im Zweifel Seiten, die länger halten wollen, und spart nichts —
 * Aktualität kommt in diesem Projekt über Marker, nicht über kurze Fristen.
 */
const MIN_HALTBARKEIT_SEKUNDEN = 3600;

/**
 * Begründete Ausnahmen. Wer hier etwas einträgt, muss zeigen, dass der Wert
 * NICHT im Seitenrahmen landet — und warum eine kurze Frist nötig ist.
 * Die Liste ist absichtlich leer: Bisher gab es keinen solchen Fall, und der
 * einzige Kandidat (die Theme-Überlagerung) war genau der Schaden.
 */
const AUSNAHMEN: { datei: string; grund: string }[] = [];

type Fund = { datei: string; zeile: number; ttl: number };
type Unlesbar = { datei: string; zeile: number; ausdruck: string };

/**
 * Alle `unstable_cache`-Aufrufe in lib/ mit ihrer Haltbarkeit.
 *
 * Das Lesen selbst steht in ./haltbarkeit-lesen — es hat sich als eigene
 * Fehlerquelle erwiesen (eine Angabe wie `60 * 60 * 24 * 7` wurde von einem
 * naiven Regex als 60 gelesen, also 604.800 Sekunden als 60).
 */
function alleZwischenspeicher(): { funde: Fund[]; unlesbar: Unlesbar[] } {
  const funde: Fund[] = [];
  const unlesbar: Unlesbar[] = [];
  for (const name of fs.readdirSync(LIB)) {
    if (!name.endsWith(".ts") || name.endsWith(".d.ts")) continue;
    const datei = path.join(LIB, name);
    if (!fs.statSync(datei).isFile()) continue;
    const quelle = fs.readFileSync(datei, "utf8");
    if (!quelle.includes("unstable_cache(")) continue;

    const zeilen = quelle.split("\n");
    for (let i = 0; i < zeilen.length; i++) {
      if (!zeilen[i].includes("unstable_cache(")) continue;
      const fenster = zeilen.slice(i, i + 60).join("\n");
      const bisEnde = fenster.split("});")[0];
      const h = leseHaltbarkeit(bisEnde, quelle);
      if (h.art === "zahl") funde.push({ datei: name, zeile: i + 1, ttl: h.sekunden });
      else if (h.art === "unlesbar") unlesbar.push({ datei: name, zeile: i + 1, ausdruck: h.ausdruck });
      // "fehlt" ist zulaessig: ein Cache ohne Haltbarkeit laeuft nur ueber Marker
      // und deckelt deshalb nichts.
    }
  }
  return { funde, unlesbar };
}

describe("Kein Zwischenspeicher darf die Haltbarkeit der Seiten deckeln", () => {
  it("findet überhaupt Zwischenspeicher — sonst misst der Test nichts", () => {
    // Gegenprobe gegen die eigene Blindheit: Ein Test, der nichts findet,
    // ist immer grün und damit wertlos.
    expect(alleZwischenspeicher().funde.length).toBeGreaterThan(5);
  });

  it("jeder zwischengespeicherte Lesevorgang hält mindestens eine Stunde", () => {
    const zuKurz = alleZwischenspeicher()
      .funde.filter((f) => f.ttl < MIN_HALTBARKEIT_SEKUNDEN)
      .filter((f) => !AUSNAHMEN.some((a) => a.datei === f.datei));

    expect(
      zuKurz.map((f) => `${f.datei}:${f.zeile} hält nur ${f.ttl} s`),
      "Diese Zwischenspeicher sind kürzer als eine Stunde. Landet einer davon im " +
        "Seitenrahmen, deckelt er die Haltbarkeit JEDER Seite der Domain auf seinen " +
        "Wert — unsichtbar, weil die Seiten weiter richtig und schnell sind. " +
        "Entweder die Haltbarkeit anheben (Aktualität über einen Marker lösen) oder " +
        "mit Begründung in AUSNAHMEN eintragen:\n"
    ).toEqual([]);
  });

  it("keine Haltbarkeit bleibt unlesbar — sonst prüft der Test daran vorbei", () => {
    // Eine Angabe, die der Leser nicht ausrechnen kann, wuerde stumm aus der
    // Pruefung fallen. Genau so entstehen die Luecken, gegen die es diesen Test
    // gibt. Wer eine solche Schreibweise einfuehrt, erweitert den Leser.
    const { unlesbar } = alleZwischenspeicher();
    expect(
      unlesbar.map((u) => `${u.datei}:${u.zeile} → "${u.ausdruck}"`),
      "Diese Haltbarkeitsangaben konnte der Leser nicht ausrechnen. Sie fielen " +
        "sonst stillschweigend aus der Prüfung. Entweder als Zahl oder als " +
        "auflösbare Konstante schreiben, oder lib/__tests__/haltbarkeit-lesen.ts " +
        "erweitern:\n"
    ).toEqual([]);
  });

  it("die Theme-Überlagerung im Seitenrahmen hält lange", () => {
    // Der konkrete Fall, der den Schaden verursacht hat — eigens festgenagelt,
    // weil er im Seitenrahmen liegt und damit jede Seite betrifft.
    const quelle = fs.readFileSync(path.join(LIB, "theme-overrides-data.ts"), "utf8");
    const h = leseHaltbarkeit(quelle);
    expect(h.art, "theme-overrides-data.ts muss eine lesbare Haltbarkeit angeben").toBe("zahl");
    const ttl = h.art === "zahl" ? h.sekunden : 0;
    expect(
      ttl,
      `Die Theme-Überlagerung hält nur ${ttl} s. Sie läuft im Seitenrahmen und ` +
        "deckelt damit jede Seite der Domain. Ihre Aktualität kommt über den Marker, " +
        "den das Speichern zieht — eine kurze Frist bringt nichts und kostet viel."
    ).toBeGreaterThanOrEqual(MIN_HALTBARKEIT_SEKUNDEN);
  });
});
