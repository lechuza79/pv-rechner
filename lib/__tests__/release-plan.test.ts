import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  RELEASE_PLAN,
  ALTBESTAND,
  ALTBESTAND_LIVE_SEIT,
  MIN_ABSTAND_GATTUNG_TAGE,
  MIN_ABSTAND_SCHUB_TAGE,
  planBefunde,
  releaseFreigegeben,
  ortSchluessel,
  schubFuer,
  type Schub,
} from "../release-plan";
import { publishedCities, ATLAS_CITIES } from "../atlas-cities";

const repo = path.resolve(__dirname, "../..");

describe("Releaseplan", () => {
  it("ist in sich schlüssig — keine Regelverstöße", () => {
    const befunde = planBefunde();
    expect(befunde.map((b) => `${b.schub}: ${b.text}`)).toEqual([]);
  });

  it("kennt jede veröffentlichte Förderseite — entweder als Altbestand oder aus einem Schub", () => {
    // Die Gegenrichtung zur Sperre: Wer an der Sperre vorbei veröffentlicht,
    // fällt hier auf. Ein Ort im Plan OHNE Seite ist dagegen erlaubt und der
    // Normalfall — der Plan entsteht vor der Seite.
    const ohneZeile = publishedCities()
      .filter((c) => !releaseFreigegeben("foerder-stadt", c.ags))
      .map((c) => `${c.name} (${c.ags})`);
    expect(ohneZeile).toEqual([]);
  });

  it("hält jeden Altbestands-Schlüssel an einem echten Eintrag fest", () => {
    // WARUM DIESER TEST EXTRA (19.08.2026): Die Prüfung darunter („jede
    // veröffentlichte Seite steht im Plan") kann eine ganze Fehlerklasse NICHT
    // sehen. Sie läuft über publishedCities() — und die fragt selbst schon den
    // Plan. Verliert ein Ort seine Freigabe, fällt er aus publishedCities heraus
    // und die Prüfung wird stillschweigend wahr, weil sie ihn gar nicht mehr
    // ansieht.
    //
    // Genau das stand bevor: Eine Parallel-Session korrigiert Hannovers
    // Gemeindeschlüssel von 03241 (Region Hannover, 1,14 Mio. Einwohner) auf
    // 03241001 (die Stadt) — ein richtiger Fix. Der eingefrorene Altbestand führt
    // Hannover aber unter dem alten Schlüssel. Ohne Nachziehen verliert eine
    // aktive, indexierte Seite ihre Freigabe, und keine Prüfung hätte gemuckt.
    //
    // Deshalb die Gegenrichtung: Jeder Schlüssel im Altbestand muss auf einen
    // Ort im Verzeichnis zeigen. Ein verwaister Schlüssel heißt, dass jemand
    // einen Ort umgeschlüsselt hat, ohne den Altbestand mitzunehmen.
    const verwaist = ALTBESTAND["foerder-stadt"].filter(
      (ags) => !ATLAS_CITIES.some((c) => c.ags === ags),
    );
    expect(verwaist, "Altbestands-Schlüssel ohne Eintrag im Städte-Verzeichnis").toEqual([]);
  });

  it("friert den Altbestand ein — er darf nicht wachsen", () => {
    // Rückwirkend als geprüft auszuweisen, was vor der Regel live ging, wäre ein
    // erfundenes Prüfdatum. Wächst diese Zahl, hat jemand einen neuen Ort am
    // Nachweis vorbei eingetragen, statt ihn in einen Schub zu stellen.
    expect(ALTBESTAND["foerder-stadt"]).toHaveLength(37);
    expect(ALTBESTAND["atlas-gemeinde"]).toHaveLength(0);
    expect(ALTBESTAND["atlas-landkreis"]).toHaveLength(0);
  });

  it("lässt keinen Schub auf live ohne beide beantworteten Fragen", () => {
    for (const s of RELEASE_PLAN) {
      if (s.status === "live" && s.orte.length > 0) {
        expect(s.nachweis, `Schub ${s.id} steht auf live ohne Nachweis`).toBeTruthy();
        expect(s.nachweis!.nachfrage.length, `Schub ${s.id}: Frage 1 unbeantwortet`).toBeGreaterThan(20);
        expect(s.nachweis!.kannibalisierung.length, `Schub ${s.id}: Frage 2 unbeantwortet`).toBeGreaterThan(20);
        expect(s.nachweis!.gemessenAm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("verlangt den Beleg als Datei, die es wirklich gibt", () => {
    // Eine Fundstelle, die niemand öffnen kann, ist kein Beleg. Dieselbe Regel
    // wie beim Freigabe-Nachweis der Atlas-Ebenen.
    for (const s of RELEASE_PLAN) {
      if (!s.nachweis) continue;
      expect(fs.existsSync(path.join(repo, s.nachweis.beleg)), `Beleg fehlt: ${s.nachweis.beleg}`).toBe(true);
    }
  });

  it("erkennt zwei Seitengattungen für denselben Ort ohne Abstand", () => {
    // Gegenprobe mit eingebautem Fehler: Würzburg hat als Förderseite seit Juni
    // eine Seite; eine Atlas-Ortsseite kurz darauf wäre genau die Kollision, die
    // dieses Projekt vermeiden will.
    const kaputt: Schub[] = [
      {
        id: "test-kollision",
        gattung: "atlas-gemeinde",
        datum: ALTBESTAND_LIVE_SEIT,
        status: "geplant",
        orte: ["09663000"], // Würzburg, als Gemeindeschlüssel
        begruendung: "Testfall",
        nachweis: null,
      },
    ];
    const befunde = planBefunde(kaputt);
    expect(befunde.some((b) => b.regel === "gattungen-zu-dicht")).toBe(true);
    expect(befunde[0].text).toContain("09663000");
  });

  it("erkennt die Kollision auch über die Schreibweise des Ortsschlüssels hinweg", () => {
    // Die Förderseite trägt fünf Stellen (kreisfreie Stadt), die Atlasseite acht.
    // Ohne Normalisierung wären das zwei verschiedene Orte und die Regel liefe leer.
    expect(ortSchluessel("09663")).toBe("09663000");
    expect(ortSchluessel("07143032")).toBe("07143032");
  });

  it("erkennt Schübe, die zu dicht aufeinanderfolgen", () => {
    const dicht: Schub[] = [
      { id: "a", gattung: "foerder-stadt", datum: "2026-09-01", status: "geplant", orte: ["09999001"], begruendung: "x", nachweis: null },
      { id: "b", gattung: "foerder-stadt", datum: "2026-09-05", status: "geplant", orte: ["09999002"], begruendung: "x", nachweis: null },
    ];
    const befunde = planBefunde(dicht);
    expect(befunde.some((b) => b.regel === "schuebe-zu-dicht")).toBe(true);
  });

  it("hält die Abstände so, dass sie messbar sind", () => {
    // Die Zahlen sind hergeleitet, nicht gegriffen: 28 Tage ist das Fenster, mit
    // dem in diesem Projekt überhaupt gemessen wird; 14 Tage die Untergrenze,
    // ab der sich eine Bewegung noch einem Schub zuordnen lässt.
    expect(MIN_ABSTAND_GATTUNG_TAGE).toBe(28);
    expect(MIN_ABSTAND_SCHUB_TAGE).toBe(14);
    expect(MIN_ABSTAND_GATTUNG_TAGE).toBeGreaterThan(MIN_ABSTAND_SCHUB_TAGE);
  });

  it("gibt einen geplanten Schub NICHT frei, auch wenn sein Datum erreicht ist", () => {
    // Sonst ginge eine Seite am Stichtag von selbst live, ohne dass jemand die
    // beiden Fragen beantwortet hat — genau die Automatik, die es zu ersetzen galt.
    const w1 = RELEASE_PLAN.find((s) => s.id === "w1-foerder-dach")!;
    expect(w1.status).toBe("geplant");
    const langeNach = new Date("2027-01-01");
    expect(releaseFreigegeben("foerder-stadt", w1.orte[0], langeNach)).toBe(false);
  });

  it("gibt den Altbestand unverändert frei", () => {
    expect(releaseFreigegeben("foerder-stadt", "09663")).toBe(true); // Würzburg
    expect(releaseFreigegeben("foerder-stadt", "11000")).toBe(true); // Berlin
  });

  it("weist jeden Ort eines Schubes seinem Schub zu", () => {
    for (const s of RELEASE_PLAN) {
      for (const o of s.orte) expect(schubFuer(s.gattung, o)?.id).toBe(s.id);
    }
  });
});
