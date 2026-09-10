import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  auslieferungsAlterText,
  kaltaufbauHerkunft,
  neuesteProduktionsAuslieferung,
} from "../auslieferungs-alter";

const HEALTH = readFileSync(resolve(__dirname, "../../scripts/health-check.ts"), "utf8");

describe("Alter der Auslieferung als Kontext zum Kaltaufbau", () => {
  it("nennt Minuten und Stunden in der Form, in der ein Mensch sie liest", () => {
    expect(auslieferungsAlterText(0.4)).toContain("weniger als eine Minute");
    expect(auslieferungsAlterText(1)).toContain("1 Minute alt");
    expect(auslieferungsAlterText(3.5)).toContain("4 Minuten alt");
    expect(auslieferungsAlterText(59)).toContain("59 Minuten alt");
    expect(auslieferungsAlterText(60)).toContain("1 Stunde alt");
    expect(auslieferungsAlterText(89)).toContain("1 Stunde alt");
    expect(auslieferungsAlterText(120)).toContain("2 Stunden alt");
  });

  it("sagt „nicht abrufbar“ statt ein Alter zu erfinden", () => {
    // Dieselbe Regel wie beim Foerder-Pruefdatum: ein geratener Wert ist
    // schlimmer als eine benannte Luecke.
    expect(auslieferungsAlterText(null)).toContain("nicht abrufbar");
    expect(kaltaufbauHerkunft(null)).toContain("nicht abrufbar");
    expect(kaltaufbauHerkunft(null)).not.toMatch(/\b\d+ (Minute|Stunde)/);
  });

  it("traegt in BEIDE Richtungen — der Zusatz nennt das Alter, ob frisch oder alt", () => {
    expect(kaltaufbauHerkunft(3)).toContain("3 Minuten alt");
    expect(kaltaufbauHerkunft(360)).toContain("6 Stunden alt");
    // Und er sagt, woran man es festmacht: an der LAGE des Ausreissers.
    for (const alter of [3, 360]) {
      expect(kaltaufbauHerkunft(alter)).toContain("erste Stichprobe");
    }
  });

  it("weicht das Urteil NICHT auf: der Zusatz kommt bei JEDEM Alter", () => {
    // Ein Aufbau nahe der Notbremse bleibt ein Befund, egal wie frisch die
    // Auslieferung ist — der erste Besucher zahlt die Zeit wirklich. Eine
    // Bedingung „bei frischer Auslieferung nicht melden" waere eine
    // aufgeweichte Schwelle (Waechter-Gate, Teil 2).
    //
    // GEPRUEFT WIRD DIE WIRKUNG, nicht die Abwesenheit von Zahlen: Die erste
    // Fassung dieses Tests verbot jeden Zahlenvergleich im Modul und schlug
    // damit an der reinen Formatierung an (Minuten gegen Stunden). Ein Test,
    // der eine harmlose Zeile verbietet, wird beim naechsten Umbau aufgeweicht
    // — und dann faengt er auch das nicht mehr, wofuer es ihn gibt.
    for (const alter of [0, 0.1, 1, 3, 59, 60, 240, 10000]) {
      expect(kaltaufbauHerkunft(alter).length).toBeGreaterThan(80);
    }
  });
});

describe("Verdrahtung im Gesundheitscheck", () => {
  it("holt das Alter und schreibt es in den Bericht", () => {
    expect(HEALTH).toMatch(/const auslieferungsAlter = await auslieferungsAlterMinuten\(\)/);
    expect(HEALTH).toMatch(/lines\.push\(auslieferungsAlterText\(auslieferungsAlter\)\)/);
  });

  it("haengt die Herkunft BEDINGUNGSLOS an den roten Kaltaufbau-Befund", () => {
    const befund = HEALTH.slice(
      HEALTH.indexOf("Eine frisch aufgebaute Atlas-Seite braucht"),
      HEALTH.indexOf('} else if (coldVerdict === "gelb")'),
    );
    expect(befund).toContain("kaltaufbauHerkunft(auslieferungsAlter)");
    // Kein „nur wenn frisch": der Befund darf nicht am Alter haengen.
    expect(befund).not.toMatch(/auslieferungsAlter\s*[<>]/);
    expect(befund).not.toMatch(/auslieferungsAlter\s*(!==|===)\s*null\s*[&?]/);
  });

  it("laesst einen fehlgeschlagenen Abruf NICHT als Zahl durchgehen", () => {
    const leser = HEALTH.slice(
      HEALTH.indexOf("async function auslieferungsAlterMinuten"),
      HEALTH.indexOf("Fragt die Laufzeitprotokolle nach Gruppen ab"),
    );
    // Jeder Fehlausgang endet auf null, nirgends ein Ersatzwert.
    expect(leser).not.toMatch(/return\s+0\s*;/);
    expect(leser).toMatch(/if \(!res\.ok\) return null;/);
    expect(leser).toMatch(/minuten < 0 \? null : minuten/);
  });

  it("waehlt die Auslieferung ueber den geteilten Baustein, nicht von Hand", () => {
    // Sonst liegt die Auswahl in einem Skript und ist damit ungetestet — genau
    // die Stelle, an der ein CANCELED-Eintrag unbemerkt als „laufend" gilt.
    const leser = HEALTH.slice(
      HEALTH.indexOf("async function auslieferungsAlterMinuten"),
      HEALTH.indexOf("Fragt die Laufzeitprotokolle nach Gruppen ab"),
    );
    expect(leser).toContain("neuesteProduktionsAuslieferung(");
    expect(leser).not.toContain('state === "READY"');
  });
});

describe("Welche Auslieferung als die laufende gilt", () => {
  // Die Form stammt aus einer echten Antwort vom 10.09.2026.
  const echt = [
    { id: "neu", created: 1788999912206, state: "READY", target: "production" },
    { id: "vorher", created: 1788994245568, state: "READY", target: "production" },
    { id: "abgebrochen-zweig", created: 1788999999999, state: "CANCELED", target: null },
    { id: "abgebrochen-prod", created: 1788999999998, state: "CANCELED", target: "production" },
    { id: "vorschau", created: 1788999999997, state: "READY", target: null },
  ];

  it("nimmt die neueste, die wirklich live steht", () => {
    expect(neuesteProduktionsAuslieferung(echt)).toBe(1788999912206);
  });

  it("zaehlt weder Abgebrochenes noch Vorschauen — die sind ALLE juenger", () => {
    // Der Fall ist so gebaut, dass jede der drei Fallen das Ergebnis kippen
    // wuerde, wenn sie mitzaehlte: sie tragen die groessten Zeitstempel.
    for (const falle of ["abgebrochen-zweig", "abgebrochen-prod", "vorschau"]) {
      const nur = echt.filter((d) => d.id === falle);
      expect(neuesteProduktionsAuslieferung(nur)).toBeNull();
    }
  });

  it("vertraut der Reihenfolge der Liste nicht", () => {
    const verdreht = [...echt].reverse();
    expect(neuesteProduktionsAuslieferung(verdreht)).toBe(1788999912206);
  });

  it("gibt bei fehlendem oder unbrauchbarem Zeitstempel null statt einer Zahl", () => {
    expect(neuesteProduktionsAuslieferung([])).toBeNull();
    expect(
      neuesteProduktionsAuslieferung([{ state: "READY", target: "production" }]),
    ).toBeNull();
    expect(
      neuesteProduktionsAuslieferung([
        { created: Number.NaN, state: "READY", target: "production" },
      ]),
    ).toBeNull();
  });
});
