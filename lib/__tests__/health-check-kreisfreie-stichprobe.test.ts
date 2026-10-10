import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { atlasStichprobenPfade, istKreisfreieStadt } from "../health-atlas-stichprobe";

/** Ein Kreis, unter dem nur EINE Gemeinde liegt, ist eine kreisfreie Stadt.
 *  Seine Kreis-Adresse leitet per Design auf diese eine Gemeindeseite weiter,
 *  also darf sie nie als Kaltprobe gezogen werden — sonst meldet der
 *  Gesundheitscheck einen Vorfall über eine gesunde Seite (19.09.2026,
 *  Würzburg: "Atlas-Seite antwortet mit 307").
 */
const KREISE = new Map([
  // Kreisfreie Stadt: Kreis 09663 trägt denselben Slug wie ihre eine Gemeinde.
  ["09663", { slug: "wuerzburg", parent_region_id: "09" }],
  // Echter Landkreis mit vielen Gemeinden.
  ["09679", { slug: "landkreis-wuerzburg", parent_region_id: "09" }],
]);
const LAENDER = new Map([["09", { slug: "bayern", parent_region_id: "de" }]]);

describe("Kreisfreie Städte in der Atlas-Stichprobe", () => {
  it("nimmt die kreisfreie Stadt aus der Kreis-Probe, behält aber ihre Gemeindeseite", () => {
    const { gemeinde, kreis } = atlasStichprobenPfade({
      gemeinden: [{ slug: "wuerzburg", parent_region_id: "09663" }],
      kreisById: KREISE,
      landById: LAENDER,
      einzelkind: new Set(["09663"]),
    });

    // Die Adresse, die 307 antwortet, wird gar nicht erst gemessen.
    expect(kreis).toEqual([]);
    // Die Seite darunter antwortet mit 200 und bleibt eine gültige Probe.
    expect(gemeinde).toEqual(["/solar-atlas/bayern/wuerzburg/wuerzburg"]);
  });

  it("lässt einen echten Landkreis unverändert durch", () => {
    const { gemeinde, kreis } = atlasStichprobenPfade({
      gemeinden: [{ slug: "eisingen", parent_region_id: "09679" }],
      kreisById: KREISE,
      landById: LAENDER,
      einzelkind: new Set(["09663"]),
    });

    expect(kreis).toEqual(["/solar-atlas/bayern/landkreis-wuerzburg"]);
    expect(gemeinde).toEqual(["/solar-atlas/bayern/landkreis-wuerzburg/eisingen"]);
  });

  it("schließt bei gemischter Ziehung nur die kreisfreie Stadt aus", () => {
    const { kreis } = atlasStichprobenPfade({
      gemeinden: [
        { slug: "wuerzburg", parent_region_id: "09663" },
        { slug: "eisingen", parent_region_id: "09679" },
      ],
      kreisById: KREISE,
      landById: LAENDER,
      einzelkind: new Set(["09663"]),
    });

    expect(kreis).toEqual(["/solar-atlas/bayern/landkreis-wuerzburg"]);
  });

  it("schließt ohne Befund NICHTS aus — ein gescheiterter Abruf darf die Kreisprüfung nicht abschalten", () => {
    // Kommt die Kinderabfrage leer zurück (Datenbankfehler, Zeitlimit), ist die
    // Menge leer. Dann muss weiter gemessen werden: lieber ein Fehlalarm als
    // eine Prüfung, die sich bei jeder Störung still selbst deaktiviert.
    const { kreis } = atlasStichprobenPfade({
      gemeinden: [{ slug: "eisingen", parent_region_id: "09679" }],
      kreisById: KREISE,
      landById: LAENDER,
      einzelkind: new Set(),
    });

    expect(kreis).toEqual(["/solar-atlas/bayern/landkreis-wuerzburg"]);
  });
});

describe("Die Zählschwelle selbst", () => {
  // OHNE DIESEN BLOCK IST DIE SCHWELLE UNGEPRÜFT: Beim Bauen am 20.09.2026
  // blieben alle anderen Prüfungen grün, als die Bedingung versuchsweise von
  // „genau eine Gemeinde" auf „keine Gemeinde" verdreht wurde — die Prüfung
  // wäre wirkungslos gewesen und hätte sich bei jeder Störung selbst
  // abgeschaltet, ohne dass irgendetwas rot geworden wäre.
  it("genau eine Gemeinde darunter heißt kreisfrei", () => {
    expect(istKreisfreieStadt(1)).toBe(true);
  });

  it("zwei oder mehr Gemeinden heißen echter Landkreis", () => {
    expect(istKreisfreieStadt(2)).toBe(false);
  });

  it("keine Antwort heißt NICHT kreisfrei, sondern nicht feststellbar", () => {
    // Ein gescheiterter Abruf liefert null Zeilen. Würde das als „kreisfrei"
    // gelten, fiele bei jeder Datenbankstörung die halbe Kreisprüfung aus —
    // still, denn eine nicht gezogene Probe meldet nichts.
    expect(istKreisfreieStadt(0)).toBe(false);
  });
});

describe("Der Gesundheitscheck benutzt die Ableitung wirklich", () => {
  const quelle = readFileSync(resolve(__dirname, "../../scripts/health-check.ts"), "utf8");

  // GEPRÜFT WIRD DIE VERWENDUNG, NICHT DAS VORHANDENSEIN: Ein Import, den
  // niemand aufruft, sieht beim Lesen richtig aus und misst nichts.
  it("ruft die geteilte Ableitung auf, statt die Pfade selbst zusammenzusetzen", () => {
    expect(quelle).toMatch(/atlasStichprobenPfade\s*\(/);
  });

  it("stellt fest, wie viele Gemeinden unter einem gezogenen Kreis liegen", () => {
    // Ohne diese Abfrage ist die Ausschlussmenge immer leer und der Aufruf
    // oben wirkungslos — er sähe im Diff trotzdem vollständig aus.
    expect(quelle).toMatch(/level=eq\.gemeinde&parent_region_id=eq\./);
    expect(quelle).toMatch(/einzelkind/);
  });

  it("entscheidet über die Zahl der Kinder mit der geprüften Ableitung", () => {
    // Eine von Hand hingeschriebene Schwelle (`kinder.length === 1`) im Skript
    // ist von keinem Test erreichbar — verdreht man sie, bleibt alles grün.
    expect(quelle).toMatch(/istKreisfreieStadt\s*\(/);
    expect(quelle).not.toMatch(/kinder\.length\s*===/);
  });

  it("setzt die Kreis-Pfade nicht mehr von Hand zusammen", () => {
    // Die alte Fassung baute `/solar-atlas/${l.slug}/${k.slug}` direkt in der
    // Schleife — genau die Stelle, die die kreisfreien Städte mitnahm.
    const handgebaut = /kreisPfade\.add\(/;
    expect(quelle).not.toMatch(handgebaut);
  });
});

/** Seit dem 07.10.2026 liegen die Schweizer Orte in denselben Tabellen. Ihre
 *  Seiten sind bewusst nicht veröffentlicht (die Seite läuft von der Wurzel
 *  "de" abwärts und antwortet für einen Kanton mit 404). Die Ziehung zog am
 *  selben Morgen Tenniken (Basel-Landschaft) und meldete zwei 404-Vorfälle über
 *  Seiten, die es nicht geben soll. */
describe("Nur Orte unter der Atlas-Wurzel werden gezogen", () => {
  const kreise = new Map([
    ["chb1305", { slug: "bezirk-sissach", parent_region_id: "chk13" }],
    ["09679", { slug: "landkreis-wuerzburg", parent_region_id: "09" }],
  ]);
  const laender = new Map([
    ["chk13", { slug: "basel-landschaft", parent_region_id: "ch" }],
    ["09", { slug: "bayern", parent_region_id: "de" }],
  ]);

  it("lässt einen Schweizer Ort weg, behält den deutschen", () => {
    const { gemeinde, kreis } = atlasStichprobenPfade({
      gemeinden: [
        { slug: "tenniken", parent_region_id: "chb1305" },
        { slug: "eisingen", parent_region_id: "09679" },
      ],
      kreisById: kreise,
      landById: laender,
      einzelkind: new Set(),
    });
    expect(gemeinde).toEqual(["/solar-atlas/bayern/landkreis-wuerzburg/eisingen"]);
    expect(kreis).toEqual(["/solar-atlas/bayern/landkreis-wuerzburg"]);
  });

  it("zieht keinen Ort, dessen Land keine bekannte Elternregion hat", () => {
    const { gemeinde } = atlasStichprobenPfade({
      gemeinden: [{ slug: "eisingen", parent_region_id: "09679" }],
      kreisById: kreise,
      landById: new Map([["09", { slug: "bayern", parent_region_id: null }]]),
      einzelkind: new Set(),
    });
    expect(gemeinde).toEqual([]);
  });
});
