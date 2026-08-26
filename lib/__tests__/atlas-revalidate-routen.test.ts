import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ATLAS_REVALIDATE_ROUTEN,
  ATLAS_DATEN_TAG,
  REVALIDATE_PFLICHT_AB_SEKUNDEN,
} from "../atlas-revalidate-routen";
import { leseHaltbarkeit } from "./haltbarkeit-lesen";

/**
 * DIE INVALIDIERUNG DARF NICHT STILL INS LEERE LAUFEN.
 *
 * Seit dem 26.08.2026 halten die Atlas-Seiten länger als ihr Datentakt, und die
 * neuen Zahlen werden nur sichtbar, weil der Datenlauf sie aktiv für ungültig
 * erklärt. Damit hängt die Richtigkeit von 11.000 Seiten an zwei Dingen, und
 * beide können unsichtbar kaputtgehen:
 *
 *   1. DER MARKER an den zwischengespeicherten Abfragen — das ist der Weg, der
 *      wirklich wirkt. Fehlt er an einer Abfrage, behält diese ihre alten Daten.
 *   2. Die Routenmuster — die nachweislich NICHT wirken (auf Produktion
 *      gemessen), aber mitlaufen. Sie sind hier nur der Vollständigkeit halber
 *      geprüft; wer sich auf sie verlässt, verlässt sich auf nichts.
 *
 * Ein adversarialer Prüfer hat am 26.08.2026 drei Löcher in der ersten Fassung
 * dieses Tests gefunden, alle drei stehen unten an ihrer Prüfung:
 *   — Er bewachte ausschließlich die wirkungslosen Routenmuster; für den Marker,
 *     der die Arbeit tut, gab es keinen einzigen Test.
 *   — Er las Haltbarkeiten mit einem Regex, der `60 * 60 * 24 * 7` als 60
 *     verstand. Eine neue Seite mit sieben Tagen, als Rechnung geschrieben,
 *     wäre als kurzlebig durchgegangen.
 *   — Er sah nur `app/(site)`. Die Widgets unter `app/(embed)` rendern dieselben
 *     Atlas-Daten und waren unsichtbar.
 */

const APP = path.join(__dirname, "..", "..", "app");
const LIB = path.join(__dirname, "..");

/** Module, deren zwischengespeicherte Abfragen am MaStR-Datenlauf hängen. */
const ATLAS_DATEN_MODULE = ["atlas.ts", "mastr-data.ts"];

function seitenDatei(routenMuster: string): string {
  return path.join(APP, "(site)", routenMuster.replace(/^\//, ""), "page.tsx");
}

/**
 * Alle Seiten unter (site) UND (embed) mit ihrem Routenmuster.
 *
 * Die Widgets gehören dazu, weil sie dieselben Atlas-Daten rendern. Die erste
 * Fassung sah nur (site) — eine langlebige Widget-Seite wäre für die Schranke
 * unsichtbar gewesen.
 */
function alleSeiten(): { muster: string; gruppe: string; datei: string; quelle: string }[] {
  const treffer: { muster: string; gruppe: string; datei: string; quelle: string }[] = [];

  for (const gruppe of ["(site)", "(embed)"]) {
    const wurzel = path.join(APP, gruppe);
    if (!fs.existsSync(wurzel)) continue;

    const lauf = (dir: string) => {
      for (const eintrag of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, eintrag.name);
        if (eintrag.isDirectory()) lauf(p);
        else if (eintrag.name === "page.tsx") {
          const muster = "/" + path.relative(wurzel, dir).split(path.sep).join("/");
          treffer.push({ muster, gruppe, datei: p, quelle: fs.readFileSync(p, "utf8") });
        }
      }
    };
    lauf(wurzel);
  }
  return treffer;
}

/** Haltbarkeit einer Seite in Sekunden, oder null wenn sie keine angibt. */
function haltbarkeit(quelle: string): number | null {
  const h = leseHaltbarkeit(quelle);
  if (h.art === "zahl") return h.sekunden;
  if (h.art === "unlesbar") {
    throw new Error(
      `Haltbarkeit "${h.ausdruck}" ist nicht ausrechenbar. Sie fiele sonst stumm aus ` +
        `der Prüfung — als Zahl schreiben oder haltbarkeit-lesen.ts erweitern.`
    );
  }
  return null;
}

describe("Atlas-Invalidierung: der Marker muss überall sitzen", () => {
  /**
   * DIE WICHTIGSTE PRÜFUNG DIESER DATEI.
   *
   * Der Marker ist der einzige Mechanismus, der wirklich invalidiert. Eine neue
   * zwischengespeicherte Atlas-Abfrage ohne ihn liefe ohne jede Warnung durch,
   * und ihre Daten blieben nach dem Datenlauf stehen. Bis zum 26.08.2026 gab es
   * dafür keinen Test — der Wächter bewachte die Attrappe.
   */
  it("jede zwischengespeicherte Atlas-Abfrage trägt den Marker", () => {
    const ohne: string[] = [];
    let gefunden = 0;

    for (const modul of ATLAS_DATEN_MODULE) {
      const quelle = fs.readFileSync(path.join(LIB, modul), "utf8");
      const zeilen = quelle.split("\n");
      for (let i = 0; i < zeilen.length; i++) {
        if (!zeilen[i].includes("unstable_cache(")) continue;
        gefunden++;
        const bisEnde = zeilen.slice(i, i + 60).join("\n").split("});")[0];
        if (!bisEnde.includes("ATLAS_DATEN_TAG")) {
          ohne.push(`${modul}:${i + 1}`);
        }
      }
    }

    // Gegenprobe gegen die eigene Blindheit — ein Test, der nichts findet,
    // ist immer grün.
    expect(gefunden, "Es müssen Atlas-Abfragen gefunden werden").toBeGreaterThan(5);

    expect(
      ohne,
      "Diese zwischengespeicherten Atlas-Abfragen tragen den Marker NICHT. Nach dem " +
        "monatlichen Datenlauf behalten sie ihre alten Zahlen, ohne dass irgendwo " +
        "etwas rot wird — die Seite bleibt schnell, vollständig und falsch:\n"
    ).toEqual([]);
  });

  it("der Marker ist gesetzt und nicht leer", () => {
    expect(ATLAS_DATEN_TAG).toBeTruthy();
    expect(typeof ATLAS_DATEN_TAG).toBe("string");
  });

  it("jedes Routenmuster in der Liste zeigt auf eine echte Seite", () => {
    for (const muster of ATLAS_REVALIDATE_ROUTEN) {
      expect(
        fs.existsSync(seitenDatei(muster)),
        `Das Muster "${muster}" zeigt auf keine Seite. Wurde die Route umbenannt?`
      ).toBe(true);
    }
  });

  it("jede Seite mit langer Haltbarkeit steht in der Liste", () => {
    const vergessen = alleSeiten()
      .map((s) => ({ ...s, ttl: haltbarkeit(s.quelle) }))
      .filter((s) => s.ttl !== null && s.ttl > REVALIDATE_PFLICHT_AB_SEKUNDEN)
      .filter((s) => !ATLAS_REVALIDATE_ROUTEN.includes(s.muster as never))
      .map((s) => `${s.gruppe}${s.muster} (Haltbarkeit ${s.ttl} s)`);

    expect(
      vergessen,
      "Diese Seiten halten länger als einen Tag, werden aber nach dem Datenlauf " +
        "nicht für ungültig erklärt — sie würden veraltete Zahlen zeigen. " +
        "Entweder in ATLAS_REVALIDATE_ROUTEN aufnehmen, oder die Haltbarkeit senken:\n" +
        vergessen.join("\n")
    ).toEqual([]);
  });

  it("die Förderseiten stehen bewusst NICHT drin", () => {
    expect(ATLAS_REVALIDATE_ROUTEN.filter((r) => r.includes("foerderung"))).toEqual([]);
  });

  it("die Förderseiten behalten eine kurze Haltbarkeit", () => {
    const zuLang = alleSeiten()
      .filter((s) => s.muster.startsWith("/photovoltaik-foerderung"))
      .map((s) => ({ muster: s.muster, ttl: haltbarkeit(s.quelle) }))
      .filter((s) => s.ttl !== null && s.ttl > REVALIDATE_PFLICHT_AB_SEKUNDEN);

    expect(
      zuLang.map((s) => `${s.muster} (${s.ttl} s)`),
      "Förderseiten dürfen nicht länger als einen Tag halten: Ein ausgelaufenes " +
        "Programm würde sonst weiter Geld abziehen, und der Releaseplan könnte " +
        "Ortsseiten nicht schubweise freischalten."
    ).toEqual([]);
  });
});
