import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import {
  RECHTSBELEGE, VORBEHALT_WOERTER, NOCH_NICHT_BELEGT, belegFuer, type Rechtsbeleg,
} from "../rechtsbelege";

/**
 * Wer eine Vorschrift nennt, hat sie gelesen.
 *
 * Der Test liest die Paragrafen aus dem Text, den ein NUTZER sieht, und verlangt
 * für jeden einen Eintrag in `lib/rechtsbelege.ts` — mit Fundstelle, Prüfdatum
 * und, wo ein Volltext im Repo liegt, einer Datei, die es wirklich gibt.
 *
 * Er prüft ausdrücklich NICHT den Wortlaut einer Aussage. Das kann kein Test:
 * Ob „bis 30 kW" eine Vermutungsregel oder eine Sperre beschreibt, entscheidet
 * das Lesen des Gesetzes. Was er kann, ist die Vorstufe davon sicherstellen —
 * dass überhaupt jemand gelesen hat. Der Fehler, der diese Inventur ausgelöst
 * hat, war nicht „falsch gelesen", sondern „gar nicht gelesen, klang plausibel".
 *
 * Vier Regeln, jede aus einem gemessenen Fehler:
 *   1. Jede genannte Vorschrift braucht einen Beleg (25.08.2026: 32 Vorschriften
 *      im sichtbaren Text, kein einziges hinterlegtes Prüfdatum).
 *   2. Ein Paragraf ohne sein Gesetz ist keine Fundstelle (drei Stellen).
 *   3. Ein Entwurf, der ohne Vorbehalt genannt wird, liest sich wie geltendes
 *      Recht — beim Gebäudemodernisierungsgesetz viermal passiert.
 *   4. Ein Beleg, der auf eine nicht vorhandene Datei zeigt, ist schlimmer als
 *      keiner: Er sieht aus wie ein Nachweis. Genau deshalb prüft der Test die
 *      Existenz und glaubt der Angabe nicht.
 */

const WURZEL = join(__dirname, "..", "..");

// ─── Erkennung ──────────────────────────────────────────────────────────────
// Gegen 22 von Hand gelöste Fälle geeicht (Inventur 25.08.2026). Die zwei, die
// dabei „danebenlagen", waren keine Werkzeugfehler: Dort steht der Paragraf ohne
// sein Gesetz — der Extraktor rät nicht, er meldet es (Regel 2).

const GESETZE: { muster: RegExp; kuerzel: string; name: string }[] = [
  { muster: /\bUmsatzsteuergesetz(?:es)?\b|\bUStG\b/, kuerzel: "UStG", name: "Umsatzsteuergesetz" },
  { muster: /\bMedienstaatsvertrag(?:s|es)?\b|\bMStV\b/, kuerzel: "MStV", name: "Medienstaatsvertrag" },
  { muster: /\bGebäudemodernisierungsgesetz(?:es)?\b|\bGModG\b/, kuerzel: "GModG", name: "Gebäudemodernisierungsgesetz" },
  { muster: /\bEEG\b|\bErneuerbare-Energien-Gesetz(?:es)?\b/, kuerzel: "EEG", name: "Erneuerbare-Energien-Gesetz" },
  { muster: /\bEnWG\b/, kuerzel: "EnWG", name: "Energiewirtschaftsgesetz" },
  { muster: /\bMaStRV\b/, kuerzel: "MaStRV", name: "Marktstammdatenregisterverordnung" },
  { muster: /\bTDDDG\b/, kuerzel: "TDDDG", name: "Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz" },
  { muster: /\bDDG\b/, kuerzel: "DDG", name: "Digitale-Dienste-Gesetz" },
  { muster: /\bBGB\b/, kuerzel: "BGB", name: "Bürgerliches Gesetzbuch" },
  { muster: /\bOWiG\b/, kuerzel: "OWiG", name: "Gesetz über Ordnungswidrigkeiten" },
  { muster: /\bUWG\b/, kuerzel: "UWG", name: "Gesetz gegen den unlauteren Wettbewerb" },
  { muster: /\bUrhG\b/, kuerzel: "UrhG", name: "Urheberrechtsgesetz" },
  { muster: /\bEGovG\b/, kuerzel: "EGovG", name: "E-Government-Gesetz" },
  { muster: /\bGEG\b/, kuerzel: "GEG", name: "Gebäudeenergiegesetz" },
  { muster: /\bDNG\b/, kuerzel: "DNG", name: "Datennutzungsgesetz" },
  { muster: /\bWEG\b/, kuerzel: "WEG", name: "Wohnungseigentumsgesetz" },
  { muster: /\bBEHG\b/, kuerzel: "BEHG", name: "Brennstoffemissionshandelsgesetz" },
  { muster: /\bDSGVO\b/, kuerzel: "DSGVO", name: "Datenschutz-Grundverordnung" },
  { muster: /\bUStAE\b/, kuerzel: "UStAE", name: "Umsatzsteuer-Anwendungserlass" },
];

const NENNUNG =
  /(§§?)\s*((?:\d+[a-z]?)(?:\s*(?:,|\/|und|bis|–|-)\s*(?:§\s*)?(?:Abs(?:atz|\.)?\s*\d+[a-z]?\s*)?(?:Nr\.?\s*\d+\s*)?\d+[a-z]?)*)/g;

export interface Fund {
  norm: string;
  gesetz: string | null;
  datei: string;
  kontext: string;
}

function normenAus(text: string, datei: string): Fund[] {
  const treffer: Fund[] = [];
  for (const m of text.matchAll(NENNUNG)) {
    const start = m.index ?? 0;
    const nachher = text.slice(start + m[0].length, start + m[0].length + 60);
    const davor = text.slice(Math.max(0, start - 40), start);

    let gesetz: string | null = null;
    for (const g of GESETZE) if (g.muster.test(nachher)) { gesetz = g.kuerzel; break; }
    if (!gesetz) for (const g of GESETZE) if (g.muster.test(davor)) { gesetz = g.kuerzel; break; }

    // „Abs. 2", „Nr. 3", „Satz 1" tragen eigene Zahlen — die sind keine Paragrafen.
    const rumpf = m[2].replace(/(Abs(?:atz|\.)?|Nr\.?|Nummer|S(?:atz|\.)?)\s*\d+[a-z]?/g, "");
    const nummern = [...rumpf.matchAll(/\d+[a-z]?/g)].map((x) => x[0]);

    // „§§ 8 bis 10" meint 8, 9 und 10 — jede einzeln belegpflichtig.
    const istBereich = /\bbis\b|–/.test(m[2]);
    let liste = nummern;
    if (istBereich && nummern.length === 2) {
      const [a, b] = nummern.map((n) => parseInt(n, 10));
      if (!isNaN(a) && !isNaN(b) && b > a && b - a < 20) {
        liste = Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
      }
    }
    for (const nr of liste) {
      treffer.push({
        norm: `${gesetz ?? "?"} §${nr}`,
        gesetz,
        datei,
        kontext: text.slice(Math.max(0, start - 45), start + m[0].length + 55).replace(/\s+/g, " ").trim(),
      });
    }
  }
  return treffer;
}

// ─── Was als „nutzersichtbar" gilt ──────────────────────────────────────────

function dateien(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (["node_modules", "__tests__", ".next", ".next-dev"].includes(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) dateien(p, out);
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

/**
 * Kommentare fliegen raus. Dort steht die Herleitung — Arbeitsmaterial, das
 * ohnehin als unbelegt gilt und niemandem ausgeliefert wird.
 */
function ohneKommentare(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Das Register selbst zählt NICHT als Fundstelle.
 *
 * Ohne diese Ausnahme belegt sich jeder Eintrag selbst: Sein `norm`-Feld steht
 * als Zeichenkette in einer Datei unter `lib/`, der Scan liest es als Nennung,
 * und die Prüfung auf verwaiste Einträge kann strukturell nie anschlagen.
 * Gefunden von der Gegenprobe zu diesem Test (25.08.2026) — ein absichtlich
 * eingebauter verwaister Eintrag blieb grün. Wer hier eine weitere Datei
 * ausnimmt, prüft vorher, ob er damit dasselbe Loch aufreißt.
 */
const NICHT_SICHTBAR = [join("lib", "rechtsbelege.ts")];

function sichtbareFunde(): Fund[] {
  const funde: Fund[] = [];
  for (const bereich of ["lib", "components", "app"]) {
    for (const datei of dateien(join(WURZEL, bereich))) {
      const rel = datei.slice(WURZEL.length + 1);
      if (NICHT_SICHTBAR.includes(rel)) continue;
      funde.push(...normenAus(ohneKommentare(readFileSync(datei, "utf8")), rel));
    }
  }
  return funde;
}

/**
 * Stellen, an denen ein Paragraf bewusst ohne sein Gesetz steht — jede mit
 * Grund. Die Liste darf wachsen, aber nur mit ausgeschriebener Begründung:
 * „liest sich besser" ist keine.
 */
const OHNE_GESETZ_ERLAUBT: { norm: string; datei: RegExp; grund: string }[] = [
  {
    norm: "? §10",
    datei: /faq\.ts|gasheizung-oder-waermepumpe/,
    grund:
      "Wörtliches Zitat aus der Gesetzesbegründung (BT-Drs. 21/6278, S. 96): „für neu zu " +
      "errichtende Gebäude nach § 10 Absatz 2 Nummer 3 einzuhalten“. In einem Zitat wird " +
      "nichts ergänzt — der Satz davor nennt das Gebäudemodernisierungsgesetz.",
  },
];

describe("Belegregister für Rechtsaussagen", () => {
  const funde = sichtbareFunde();

  it("nennt keine Vorschrift ohne Beleg im Register", () => {
    const vorgemerkt = new Set(NOCH_NICHT_BELEGT.map((v) => v.norm));
    const fehlend = new Map<string, Fund>();
    for (const f of funde) {
      if (f.gesetz === null) continue; // eigene Regel weiter unten
      if (belegFuer(f.norm)) continue;
      if (vorgemerkt.has(f.norm)) continue; // eigene Regel: Frist, siehe unten
      if (!fehlend.has(f.norm)) fehlend.set(f.norm, f);
    }

    const meldung = [...fehlend.values()].map(
      (f) => `  ${f.norm} — ${f.datei}\n      …${f.kontext}…`,
    );

    expect(
      meldung,
      `${meldung.length} Vorschrift(en) werden einem Nutzer gezeigt, ohne dass jemand ` +
        `sie im Originaltext gelesen hat.\n\n` +
        `Beleg in lib/rechtsbelege.ts eintragen — mit der Fundstelle (Absatz und Satz, ` +
        `nicht nur der Paragraf), dem Tag, an dem der Originaltext gelesen wurde, und ` +
        `dem Pfad zum Volltext, falls er im Repo liegt.\n` +
        `Ein Datum schätzen oder aus einem alten Kommentar übernehmen gilt nicht — genau ` +
        `dagegen gibt es dieses Register.\n\n` +
        meldung.join("\n"),
    ).toEqual([]);
  });

  it("nennt keinen Paragrafen ohne sein Gesetz", () => {
    const offen = funde
      .filter((f) => f.gesetz === null)
      .filter(
        (f) =>
          !OHNE_GESETZ_ERLAUBT.some(
            (a) => a.norm === f.norm && a.datei.test(f.datei),
          ),
      )
      .map((f) => `  ${f.datei}: …${f.kontext}…`);

    expect(
      [...new Set(offen)],
      "Ein Paragraf ohne sein Gesetz ist für einen Leser keine Fundstelle — er kann sie " +
        "nicht nachschlagen.\nGesetz danebenschreiben, oder die Stelle mit Grund in " +
        "OHNE_GESETZ_ERLAUBT eintragen.\n" +
        [...new Set(offen)].join("\n"),
    ).toEqual([]);
  });

  it("verspricht keinen Volltext, den es nicht gibt", () => {
    const tot = RECHTSBELEGE.filter((b) => b.volltext && !existsSync(join(WURZEL, b.volltext)))
      .map((b) => `  ${b.norm} zeigt auf ${b.volltext} — die Datei fehlt`);

    expect(
      tot,
      "Ein Beleg, der auf eine fehlende Datei zeigt, ist schlimmer als keiner: Er sieht " +
        "aus wie ein Nachweis.\n" + tot.join("\n"),
    ).toEqual([]);
  });

  it("führt keinen Beleg, den niemand mehr zitiert", () => {
    const zitiert = new Set(funde.map((f) => f.norm));
    const verwaist = RECHTSBELEGE.filter((b) => !zitiert.has(b.norm)).map(
      (b) => `  ${b.norm} (${b.traegt})`,
    );

    expect(
      verwaist,
      "Diese Belege gehören zu Aussagen, die es nicht mehr gibt. Ein Register, das nur " +
        "wächst, wird irgendwann nicht mehr gepflegt — Eintrag entfernen.\n" + verwaist.join("\n"),
    ).toEqual([]);
  });

  it("hält jeden Eintrag vollständig", () => {
    const luecken: string[] = [];
    for (const b of RECHTSBELEGE) {
      const fehlt = (feld: keyof Rechtsbeleg) => !b[feld] || String(b[feld]).trim() === "";
      if (fehlt("gesetz")) luecken.push(`${b.norm}: Gesetzesname fehlt`);
      if (fehlt("traegt")) luecken.push(`${b.norm}: „wofür wir sie in Anspruch nehmen" fehlt`);
      if (fehlt("quelle")) luecken.push(`${b.norm}: Quelle fehlt`);
      if (fehlt("fundstelle")) luecken.push(`${b.norm}: Fundstelle fehlt`);
      // Ein Paragraf ohne Absatz ist keine Fundstelle — es sei denn, der
      // Paragraf hat wirklich nur einen Satz. Das steht dann ausgeschrieben da.
      else if (!/Abs|Satz|Sätze|S\.|Nr|Nummer|einziger|Halbsatz|Anhang|Anlage/.test(b.fundstelle)) {
        luecken.push(
          `${b.norm}: Fundstelle „${b.fundstelle}" nennt keinen Absatz — ein Paragraf ` +
            `allein ist keine Fundstelle (oder ausschreiben, dass er nur einen Satz hat)`,
        );
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.geprueftIso)) {
        luecken.push(`${b.norm}: Prüfdatum „${b.geprueftIso}" ist kein Tagesdatum`);
      }
    }
    expect(luecken, luecken.join("\n")).toEqual([]);
  });

  it("lässt einen Entwurf nicht wie geltendes Recht aussehen", () => {
    const entwuerfe = RECHTSBELEGE.filter((b) => b.zustand === "entwurf");
    const ohneVorbehalt: string[] = [];

    for (const b of entwuerfe) {
      const woerter = b.vorbehaltWoerter ?? VORBEHALT_WOERTER;
      for (const bereich of ["lib", "components", "app"]) {
        for (const datei of dateien(join(WURZEL, bereich))) {
          if (NICHT_SICHTBAR.includes(datei.slice(WURZEL.length + 1))) continue;
          const text = ohneKommentare(readFileSync(datei, "utf8"));
          for (const f of normenAus(text, datei)) {
            if (f.norm !== b.norm) continue;
            // Fenster um die Nennung: 400 Zeichen sind rund ein Absatz.
            const i = text.indexOf(f.kontext.slice(10, 40));
            const fenster = text.slice(Math.max(0, i - 400), i + 400);
            if (!woerter.some((w) => fenster.includes(w))) {
              ohneVorbehalt.push(
                `  ${b.norm} in ${datei.slice(WURZEL.length + 1)} — …${f.kontext}…`,
              );
            }
          }
        }
      }
    }

    expect(
      [...new Set(ohneVorbehalt)],
      "Diese Stellen nennen eine Vorschrift aus einem ENTWURF, ohne dass im Umfeld steht, " +
        "dass sie noch nicht gilt. Ein Leser hält sie für geltendes Recht — genau der " +
        "Fehler, der beim Gebäudemodernisierungsgesetz viermal hintereinander passiert ist.\n" +
        [...new Set(ohneVorbehalt)].join("\n"),
    ).toEqual([]);
  });
  it("lässt keine Belegschuld über ihre Frist laufen", () => {
    // Der Arbeitsvorrat darf bestehen — aber nicht endlos. Ohne diese Prüfung
    // wäre die Vormerkliste eine Dauerausnahme und das Register eine Fassade.
    const heute = new Date().toISOString().slice(0, 7);
    const abgelaufen = NOCH_NICHT_BELEGT.filter((v) => v.frist < heute).map(
      (v) => `  ${v.norm} — Frist ${v.frist} verstrichen: ${v.warum}`,
    );
    expect(
      abgelaufen,
      "Für diese Vorschriften ist die Frist abgelaufen, ohne dass jemand den Originaltext " +
        "gelesen hat.\nEntweder lesen und in RECHTSBELEGE eintragen — oder die Aussage aus " +
        "der Oberfläche nehmen. Die Frist zu verschieben, ohne gelesen zu haben, verschiebt " +
        "nur das Problem.\n" + abgelaufen.join("\n"),
    ).toEqual([]);
  });

  it("merkt nichts vor, das längst belegt ist", () => {
    const doppelt = NOCH_NICHT_BELEGT.filter((v) => belegFuer(v.norm)).map((v) => v.norm);
    expect(doppelt, "Steht im Register UND in der Vormerkliste: " + doppelt.join(", ")).toEqual([]);
  });

  it("merkt nichts vor, das niemand mehr zitiert", () => {
    const zitiert = new Set(funde.map((f) => f.norm));
    const tot = NOCH_NICHT_BELEGT.filter((v) => !zitiert.has(v.norm)).map((v) => v.norm);
    expect(tot, "Vorgemerkt, aber nirgends genannt — Eintrag entfernen: " + tot.join(", ")).toEqual([]);
  });
});
