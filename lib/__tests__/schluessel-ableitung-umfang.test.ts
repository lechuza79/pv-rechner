/**
 * WER LEITET AUS EINEM GEMEINDESCHLÜSSEL EINE OBERREGION AB — und sonst niemand.
 *
 * WARUM (06.10.2026): Die Summen je Landkreis und Bundesland entstehen heute
 * dadurch, dass der Schlüssel eines Orts mit dem seines Kreises beginnt. Für
 * einen zweiten Markt trägt das nicht (eine Zürcher Gemeindenummer beginnt
 * nicht mit der ihres Kantons), die Zuordnung wird also ausgeschrieben statt
 * abgeschnitten.
 *
 * Der Umbau fasst ausschließlich die Summierung an. Dass er nichts ANDERES
 * anfasst, ist aber eine Behauptung, solange niemand sie prüfen kann — und
 * „nicht angefasst" ist etwas anderes als „geprüft". Dieser Test macht den
 * UMFANG prüfbar: Er friert ein, welche Module diese Ableitung tragen. Kommt
 * eine dazu oder fällt eine weg, wird er rot und nennt sie.
 *
 * WAS ER NICHT LEISTET, und das gehört dazu: Er prüft nicht, ob die zehn
 * Module richtig rechnen — nur, dass die Menge der Stellen, an denen diese
 * Logik überhaupt vorkommt, unverändert bleibt. Das Verhalten der einen reinen
 * Ableitung darunter wird zusätzlich festgenagelt; die übrigen stecken in
 * Funktionen, die Daten brauchen, und hängen an ihren eigenen Tests.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ertragForRegionId } from "../bundesland-ertrag";
import { NATIONAL_AVG_YIELD } from "../constants";

const LIB = resolve(__dirname, "..");

/**
 * Die Stellenlogik: „die ersten zwei Zeichen sind das Land, die ersten fünf der
 * Kreis". Zwei Einschränkungen, beide gemessen:
 *
 * NUR DIESE BEIDEN LÄNGEN — ein `slice(0, 8)` schneidet einen Gemeindeschlüssel
 * auf seine eigene Länge und leitet damit keine Oberregion ab.
 *
 * NUR AUF EINEM SCHLÜSSEL. Die erste Fassung suchte jedes Abschneiden auf zwei
 * oder fünf Zeichen und fand dadurch über dreißig Module, die mit Ortsschlüsseln
 * nichts zu tun haben: Postleitzahlen, Farbwerte, Zeilenköpfe, Versandzeiten.
 * Ein Wächter, der dreißig Unbeteiligte einsammelt, wird bei der ersten
 * Änderung aufgeweicht — und dann beobachtet er nichts mehr. Gemessen an den
 * echten Aufrufen heißt der Träger immer auf einen Schlüssel aus.
 */
const STELLENLOGIK = /(?:regionId|region_id|[Aa]gs|GemeindeId)\.slice\(0,\s*[25]\)/;

/**
 * Wer sie heute trägt, und wofür. Die Begründung steht dabei, weil eine nackte
 * Liste beim ersten Umbau zur Formalie wird: Wer einen Eintrag streicht, muss
 * sagen können, warum die Frage dort weggefallen ist.
 */
const TRAEGER: Record<string, string> = {
  "atlas-geo.ts": "Kreisgrenze zu einer Gemeinde",
  "atlas-nachbarn.ts": "Nachbarorte im selben Kreis bzw. Land",
  "atlas.ts": "Vorladen der Vorfahren und Einzelgemeinden eines Kreises",
  "award-hook.ts": "Vergleichsgruppe des Brief-Aufhängers",
  "awards-server.ts": "Kreis- und Landesname zu einer Gemeinde",
  "awards.ts": "Gebietszuschnitt einer Auszeichnungs-Ebene",
  "bundesland-ertrag.ts": "Standort-Ertrag über den Landesanteil des Schlüssels",
  "kfw-kreis-zuordnung.ts": "Register der Heizungsförderung auf ein Land filtern",
  "kommunen-brief.ts": "Bundesland des angeschriebenen Orts",
  "kommunen-testballon.ts": "ganze Kreise im Versandtopf halten",
  "kreis-ranking.ts": "Land eines Landkreises in der Rangliste",
  "schulferien.ts": "Ferienkalender des Ziel-Bundeslands",
  "social-funde.ts": "Kreisname zu einem Fund",
  "social-kennzahlen.ts": "Länderdichte aus den Gemeindezeilen",
  "suche.ts": "Land und Kreis zu einem gefundenen Ort",
  "utilities.ts": "Bundesländer eines Versorgers und seines Sitzes",
};

function traegerImBestand(): string[] {
  return readdirSync(LIB)
    .filter((d) => d.endsWith(".ts"))
    .filter((d) => STELLENLOGIK.test(readFileSync(resolve(LIB, d), "utf8")))
    .sort();
}

describe("Umfang der Schlüssel-Ableitung", () => {
  it("findet überhaupt etwas — sonst vergleicht der Test nichts und meldet grün", () => {
    // Die Gegenprobe zum Test selbst: Greift das Muster nicht mehr (weil die
    // Schreibweise sich ändert), wäre eine leere Liste gegen eine leere Liste
    // grün, und der Umfang wäre ab da unbeobachtet.
    expect(traegerImBestand().length).toBeGreaterThan(5);
  });

  it("trägt die Stellenlogik genau in den angemeldeten Modulen", () => {
    expect(traegerImBestand()).toEqual(Object.keys(TRAEGER).sort());
  });

  it("nennt für jeden Träger, welche Frage er damit beantwortet", () => {
    for (const [datei, zweck] of Object.entries(TRAEGER)) {
      expect(zweck.length, `${datei} ohne Begründung`).toBeGreaterThan(10);
    }
  });
});

describe("Standort-Ertrag aus dem Landesanteil des Schlüssels", () => {
  /**
   * Die einzige reine Ableitung unter den zehn: Schlüssel rein, Zahl raus, ohne
   * Daten von außen. Deshalb lässt sie sich im Wortsinn festnageln — und sie
   * ist gleichzeitig die, die der Umbau am ehesten versehentlich mitnimmt, weil
   * sie wie eine Hierarchie-Ableitung aussieht.
   */
  const FAELLE: Array<[string, string]> = [
    ["09", "Bayern, zweistellig"],
    ["09679", "Landkreis in Bayern"],
    ["09679147", "Gemeinde in Bayern"],
    ["01", "Schleswig-Holstein"],
    ["16", "Thüringen"],
    ["05334002", "Aachen — fünfstelliger Schlüssel gehört der StädteRegion"],
    ["03241001", "Hannover — fünfstelliger Schlüssel gehört der Region"],
    ["10041100", "Saarbrücken — fünfstelliger Schlüssel gehört dem Regionalverband"],
  ];

  it("liefert für jede Schlüssellänge denselben Wert wie sein Bundesland", () => {
    for (const [id, was] of FAELLE) {
      const land = id.slice(0, 2);
      expect(ertragForRegionId(id), was).toBe(ertragForRegionId(land));
    }
  });

  it("fällt bei einem unbekannten Land auf den Bundesschnitt, nicht auf null", () => {
    // Die stille Richtung: Eine null im Ertrag macht aus jeder Rechnung eine
    // Anlage ohne Ernte, und das sieht man einer Zahl nicht an.
    expect(ertragForRegionId("99")).toBe(NATIONAL_AVG_YIELD);
    expect(ertragForRegionId("")).toBe(NATIONAL_AVG_YIELD);
  });

  it("unterscheidet die Bundesländer wirklich — sonst prüft der Fall darüber nichts", () => {
    const werte = new Set(
      ["01", "02", "08", "09", "11", "13", "16"].map((l) => ertragForRegionId(l)),
    );
    expect(werte.size).toBeGreaterThan(3);
  });
});
