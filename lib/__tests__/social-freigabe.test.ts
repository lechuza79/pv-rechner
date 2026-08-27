import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BEFUND_MIN_ZEICHEN,
  NOETIGE_PRUEFUNGEN,
  PRUEF_BESCHREIBUNG,
  istPruefArt,
  pruefBeschreibung,
  pruefeBefund,
} from "../social-pruefung-kern";
import { REGELN, regelnFuer } from "../redaktionsplan";

/**
 * Die Freigabe wird ERTEILT — und daran hängt alles Weitere.
 *
 * Bis zum 27.08.2026 gab es keinen Weg dorthin: `speicherePruefung` lag
 * ungenutzt herum, die Ansicht zeigte den Prüfstand nur an. Damit ging nichts
 * raus, und Planen und Senden hingen mit dran.
 *
 * Was hier festgenagelt wird, sind die Eigenschaften, die eine Freigabe erst zu
 * einer machen — jede von ihnen ließe sich beim nächsten Umbau bequem entfernen,
 * ohne dass die Oberfläche kaputt aussähe.
 */

const ROUTE = resolve(__dirname, "../../app/api/social/pruefung/route.ts");

/**
 * Nur der Code, ohne Kommentare.
 *
 * Beim ersten Lauf sofort aufgefallen: Die Route ERKLÄRT in ihrem Kopf, warum
 * sie den Cron-Schlüssel nicht zulässt — und der Test, der genau das prüfen
 * sollte, schlug an diesem Satz an. Ein Struktur-Test, der Kommentare mitliest,
 * prüft die Absichtserklärung statt der Sache; er würde grün bleiben, wenn
 * jemand den Schlüssel wieder einbaut und den Kommentar stehen lässt.
 */
function ohneKommentare(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const quelle = ohneKommentare(readFileSync(ROUTE, "utf-8"));

describe("Der Befund ist Pflicht, im Klartext", () => {
  it("weist Leeres und Weißraum ab", () => {
    expect(pruefeBefund("")).toMatchObject({ ok: false });
    expect(pruefeBefund("   \n ")).toMatchObject({ ok: false });
  });

  it("weist das Abnicken ab", () => {
    // „ok" und „passt" halten fest, dass jemand geklickt hat, nicht was er
    // angesehen hat — dieselbe Fehlerklasse wie ein Prüfdatum ohne Prüfung.
    expect(pruefeBefund("ok")).toMatchObject({ ok: false });
    expect(pruefeBefund("passt")).toMatchObject({ ok: false });
  });

  it("lässt einen echten Befund durch", () => {
    expect(pruefeBefund("Beide Zahlen gegen die Abfrage nachgerechnet, Nenner stimmt.")).toEqual({ ok: true });
  });

  it("hält die Untergrenze klein genug, dass sie keine Schikane ist", () => {
    // Eine Sperre, die an einem normalen Satz anschlägt, wird umgangen.
    expect(BEFUND_MIN_ZEICHEN).toBeLessThanOrEqual(20);
    expect(pruefeBefund("Zahlen geprüft, stimmen.")).toEqual({ ok: true });
  });
});

describe("Jede Prüfart hat ihre Frage und ihre Prüfliste", () => {
  it("beschreibt jede nötige Prüfung", () => {
    for (const art of NOETIGE_PRUEFUNGEN) {
      const b = pruefBeschreibung(art);
      expect(b.frage.length, `Die Prüfart "${art}" hat keine Frage`).toBeGreaterThan(20);
      expect(b.nichtGeprueft.length, `Die Prüfart "${art}" sagt nicht, was sie auslässt`).toBeGreaterThan(10);
    }
  });

  it("beschreibt nichts, was es nicht gibt", () => {
    // Eine Beschreibung ohne Prüfart wäre eine Frage, die niemand beantwortet.
    for (const b of PRUEF_BESCHREIBUNG) expect(NOETIGE_PRUEFUNGEN).toContain(b.art);
  });

  it("gibt jeder Prüfart mindestens eine Regel", () => {
    // Ein Formular ohne Prüfliste ist eine Aufforderung ohne Gegenstand.
    for (const art of NOETIGE_PRUEFUNGEN) {
      expect(regelnFuer(art).length, `Die Prüfart "${art}" hat keine einzige Regel`).toBeGreaterThan(0);
    }
  });

  it("ordnet jede Regel genau einer Prüfung zu", () => {
    // Eine Regel ohne Zuordnung fiele aus beiden Prüflisten heraus und stünde
    // nur noch auf der Planungsseite — also genau dort, wo sie niemand liest,
    // während er unterschreibt.
    for (const r of REGELN) {
      expect(istPruefArt(r.gilt), `Die Regel "${r.regel}" gilt keiner bekannten Prüfung`).toBe(true);
    }
    expect(REGELN.length).toBe(NOETIGE_PRUEFUNGEN.reduce((n, a) => n + regelnFuer(a).length, 0));
  });

  it("hält den Superlativ bei den ZAHLEN", () => {
    // Er entsteht im Nenner, nicht im Wortlaut — wer nur die Formulierung
    // durchsieht, findet ihn nicht.
    expect(regelnFuer("zahlen").some((r) => /Superlativ/.test(r.regel))).toBe(true);
  });
});

describe("Die Route, die eine Freigabe entgegennimmt", () => {
  it("lässt NUR eine Admin-Session zu, nie den Cron-Schlüssel", () => {
    // Der Kern der Sache: Ein Automat, der sich seine eigenen Freigaben
    // ausstellt, ist keine Prüfung, sondern eine Schleife. Alle übrigen
    // Social-Routen dürfen den Schlüssel — diese eine nicht.
    expect(quelle).toMatch(/isAdminSession\(\)/);
    expect(quelle, "Die Freigabe-Route darf den Cron-Schlüssel nicht akzeptieren").not.toMatch(
      /istAdminOderCron/,
    );
  });

  it("rechnet den Abdruck selbst, statt ihn zu glauben", () => {
    // Ohne das könnte ein Aufrufer eine Freigabe für eine beliebige
    // Zeichenkette hinterlegen und damit die Sperre für den echten Beitrag
    // öffnen — die Prüfung wäre nur so gut wie das, was er behauptet.
    const bauen = quelle.indexOf("baueAllePosts(");
    const rechnen = quelle.indexOf("fassungsAbdruck(");
    const speichern = quelle.indexOf("speicherePruefung(");
    expect(bauen, "Die Route baut den Beitrag nicht selbst").toBeGreaterThan(-1);
    expect(rechnen, "Die Route rechnet den Abdruck nicht selbst").toBeGreaterThan(-1);
    expect(speichern, "Die Route speichert nicht").toBeGreaterThan(-1);
    // Die Reihenfolge ist die Sache, die schützt: erst bauen, dann rechnen,
    // dann ablegen. Sie kippt beim nächsten Umbau still zurück.
    expect(rechnen).toBeGreaterThan(bauen);
    expect(speichern).toBeGreaterThan(rechnen);
  });

  it("verlangt den Abdruck des Prüfers und weist einen abweichenden ab", () => {
    // Er ist die Aussage „ich habe genau das angesehen". Fehlt er, wurde
    // irgendetwas geprüft; weicht er ab, etwas anderes als das, was rausginge.
    expect(quelle).toMatch(/if \(!body\.fassung\)/);
    expect(quelle).toMatch(/body\.fassung !== abdruck/);
    expect(quelle).toMatch(/status: 409/);
  });

  it("nimmt kein Urteil ohne Befund entgegen", () => {
    expect(quelle).toMatch(/pruefeBefund\(/);
  });

  it("nimmt kein stillschweigendes Bestanden an", () => {
    // Ein Standardwert für das Urteil hieße: Wer das Feld vergisst, gibt frei.
    expect(quelle).toMatch(/typeof body\.bestanden !== "boolean"/);
  });
});

describe("Ungespeichertes lässt sich nicht freigeben", () => {
  const TISCH = ohneKommentare(readFileSync(resolve(__dirname, "../../components/social/StoryTisch.tsx"), "utf-8"));

  it("sperrt die Freigabe, solange etwas offen ist", () => {
    // Die Senderoute baut den Text später aus der ABLAGE neu. Eine Freigabe auf
    // einen Entwurf im Browser zeigte auf eine Fassung, die es nirgends gibt.
    expect(TISCH).toMatch(/gesperrt=\{\s*geaendert/);
  });

  it("erkennt den gespeicherten Stand am zuletzt Abgelegten, nicht an den Eigenschaften von oben", () => {
    // Die Serverseite rendert nach dem Speichern nicht neu. Verglichen gegen die
    // Eigenschaften bliebe die Freigabe nach jedem Speichern dauerhaft gesperrt
    // — die Sorte Fehler, die aussieht wie „geht halt nicht".
    expect(TISCH).toMatch(/setGespeichert\(\{/);
    expect(TISCH).toMatch(/stil !== gespeichert\.stil/);
  });
});
