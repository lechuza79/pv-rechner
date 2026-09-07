import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WURZEL = join(__dirname, "..", "..");
const lies = (...t: string[]) => readFileSync(join(WURZEL, ...t), "utf8");
const SEITE = lies("app", "(site)", "admin", "redaktion", "templates", "page.tsx");
const SAMMLER = lies("lib", "orts-beitraege-server.ts");
// Die geteilte Quellenwahl beider Redaktionsansichten.
const QUELLE = lies("lib", "redaktions-quelle.ts");
const ENTWICKLUNG = lies("app", "(site)", "admin", "redaktion", "page.tsx");
const LEISTE = lies("components", "social", "QuellenLeiste.tsx");

// Die Templates-Ansicht lässt sich aus dem nächsten Kommunen-Schub füllen.
//
// DER ARBEITSRHYTHMUS (Betreiber, 06.09.2026): pro Woche ein Batch planen und
// dabei die Templates fertigmachen, die dieser Batch braucht. Welche Bildform
// eine Ortsgeschichte bekommt, entscheiden ihre Zahlen — an den vierzehn
// bundesweiten Beiträgen zu üben hieße, ein Design für Fälle abzunehmen, die im
// Schub gar nicht vorkommen.
//
// Die drei Regeln stehen hier, weil sie beim nächsten Ausbau sonst zurückkommen.

describe("Templates aus dem Kommunen-Schub", () => {
  it("die Ansicht kennt beide Quellen", () => {
    // BEIDE Ansichten, und beide über dieselbe Quelle: Die Ortsgeschichten
    // tragen dieselben Katalog-Familien wie die bundesweiten Beiträge und
    // gehören deshalb unter dieselben Reiter, nicht in eine eigene Ansicht
    // daneben (Betreiber, 06.09.2026).
    for (const seite of [SEITE, ENTWICKLUNG]) {
      expect(seite).toContain('params.quelle === "kommunen"');
      expect(seite).toContain("quellenstand(");
    }
    expect(QUELLE).toContain("ortsBeitraegeMehrere");
  });

  it("der Sammellauf hat einen Deckel, und er ist klein", () => {
    // Ein Schub sind hundert Gemeinden, die Kette je Ort kostet ein halbes
    // Dutzend Abfragen. Ohne Deckel wären das sechshundert für eine Ansicht —
    // dieselbe Kopplung, an der im September der Produktionsbau zerbrochen ist.
    const oben = /Math.min\(opts.hoechstens \?\? 6, (\d+)\)/.exec(SAMMLER)?.[1];
    expect(oben, "Der Sammellauf hat keine Obergrenze").toBeTruthy();
    expect(Number(oben)).toBeLessThanOrEqual(24);
    const standard = /const ORTE_STANDARD = (\d+);/.exec(QUELLE)?.[1];
    expect(Number(standard)).toBeLessThanOrEqual(8);
  });

  it("der Ausschnitt wird genannt, nicht verschwiegen", () => {
    // Eine Ansicht, die sechs von hundert Orten zeigt und aussieht wie das
    // Ganze, behauptet eine Vollständigkeit, die sie nicht hat.
    expect(SAMMLER).toContain("angesehen");
    expect(SAMMLER).toContain("vorhanden");
    expect(LEISTE).toContain("von {stand.schub.vorhanden} Gemeinden");
  });

  it("die Quelle überlebt das Durchschalten einer Zeile", () => {
    // Sonst springt die Ansicht beim Wechsel der Füllung zurück auf die
    // bundesweiten Beiträge — und man beurteilt ein anderes Design als das,
    // das man ansehen wollte.
    //
    // GEPRÜFT WIRD NUR DER RUMPF DER ADRESS-FUNKTION. Die erste Fassung nahm
    // den Bereich bis zum Laden der Beiträge — und darin steht die Variable
    // `quelle` ohnehin. Der Test verglich den Fehler mit sich selbst und blieb
    // bei der Gegenprobe grün; dieselbe Klasse wie der Gemeindeschlüssel-Test,
    // der einen falschen Wert gegen sich selbst hielt.
    const start = SEITE.indexOf("const adresseMit");
    const rumpf = SEITE.slice(start, SEITE.indexOf("q.set(`f_${art}`", start));
    for (const k of ["quelle", "schub", "orte"]) {
      expect(rumpf, `„${k}" fällt beim Durchschalten weg`).toContain(`"${k}"`);
    }
  });

  it("der nächste Schub wird gemessen, nicht der Markierung geglaubt", () => {
    // Am 06.09.2026 zeigte die Markierung „aktueller Schub" im Code auf einen
    // Schub, dessen 79 Gemeinden alle angeschrieben waren — vier der fünf
    // Schübe waren durch. Wer ihr folgt, füllt die Templates-Arbeit mit
    // Geschichten von Orten, an denen sich nichts mehr ändern lässt.
    expect(QUELLE).toContain("async function naechsterSchub");
    expect(QUELLE).toContain("o.offen");
  });

  it("innerhalb des Schubs kommen die noch nicht angeschriebenen zuerst", () => {
    // Ein Schub ist nach Chargen sortiert, und die vorderen sind längst raus.
    expect(QUELLE).toMatch(/sort\(\(a, b\) => Number\(b\.offen\) - Number\(a\.offen\)\)/);
  });

  it("die Ortsgeschichten stehen als TYP da, nicht je Gemeinde", () => {
    // Sechs Orte × sieben Geschichten wären zweiundvierzig Einträge für sieben
    // Typen (Betreiber, 06.09.2026). Gestaltet wird der Typ: „Stichtag" sieht
    // in jeder Gemeinde gleich aus, nur mit anderen Zahlen darin. Bei den
    // bundesweiten Beiträgen fällt das nicht an — dort ist jeder ein
    // Einzelstück.
    // GEPRÜFT WIRD DIE VERWENDUNG, nicht das Vorhandensein: Die erste Fassung
    // suchte nur den Namen der Funktion und blieb bei der Gegenprobe grün, als
    // die Zuweisung wieder auf die ungefilterte Liste zeigte — die Funktion
    // stand ja noch da. Dieselbe Falle wie beim Datenbank-Wächter.
    expect(QUELLE).toContain("[...nachTyp(alle.map((x) => x.post)).values()].map((g) => g[0])");
    // Und die Auswahl muss auch WIRKEN: Sie stand kurz als eigene Größe da,
    // während die Ansicht weiter die ungefilterte Liste bekam.
    expect(QUELLE).toContain("posts: jeTyp,");
    expect(QUELLE).toContain("p.storyArt ?? p.id");
    // Der Typ muss am Beitrag hängen: Die Kennung trägt bei einigen Typen einen
    // Zusatz (den Monat, die Vergleichskategorie) und taugt nicht als Gruppe.
    expect(lies("lib", "orts-posts.ts")).toContain("storyArt: story.art");
  });

  it("im Wähler steht jeder Typ genau einmal", () => {
    // Eine Gemeinde mit vier Einzelkennzahl-Geschichten stand dort viermal
    // untereinander, jedes Mal mit demselben Namen — die Zusammenfassung galt
    // für die Zeilen und nicht für den Wähler. Halb umgestellt ist schlimmer
    // als gar nicht: Es sieht aus, als wäre etwas doppelt gerechnet.
    expect(SEITE).toContain("const traeger = posts.filter(");
    expect(SEITE, "der Wähler zieht wieder aus allen Ausprägungen").not.toContain(
      "[...weitereJeTyp.values()]",
    );
    // Und die Quellenwahl steht EINMAL — zwei Leisten für dieselbe Wahl sehen
    // nach zwei Wochen verschieden aus.
    for (const seite of [SEITE, ENTWICKLUNG]) expect(seite).toContain("<QuellenLeiste");
    // Und die Beschriftung ist der TYP, nicht nur der Ort — sonst sagt sie
    // beim Durchschalten nicht, was sich ändert.
    expect(SEITE).toContain("beschriftung(p)");
  });

  it("die Platzierungen werden einmal gerechnet, nicht je Ort", () => {
    // Die Rechnung läuft über alle 11.000 Gemeinden. Sechs Orte hintereinander
    // hießen sie sechsmal.
    const awards = lies("lib", "awards-server.ts");
    expect(awards).toContain("const platzierungsKarte = memoize");
    expect(awards).not.toMatch(/computePlacements\(stats\)\.get/);
  });
});
