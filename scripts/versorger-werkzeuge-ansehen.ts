// Die Werkzeug-Kandidaten IM ECHTEN BROWSER ansehen und Belege sichern.
//
// WARUM ES DIESEN SCHRITT GIBT (Gegenprüfung 05.09.2026): Von den vier Zahlen,
// die die Wettbewerbsaussage trugen, hielt keine der Handprüfung stand. Nicht
// weil die Muster schlecht waren, sondern weil aus dem QUELLTEXT allein nicht zu
// sehen ist, ob eine Seite eine Investition durchrechnet oder einen Stromtarif.
// „Sechs Versorger mit eigenem Photovoltaik-Rechner" waren nach Handprüfung
// null — sechsmal der Tarif-Konfigurator, der im Seitenkopf jeder Unterseite
// steht.
//
// Zwei Dinge kann nur der echte Browser:
//
//  1. JAVASCRIPT AUSFÜHREN. Ein Werkzeug, das erst im Browser entsteht, ist im
//     Quelltext gar nicht vorhanden — die Erhebung meldet dann „kein Werkzeug",
//     und das sieht aus wie ein Befund.
//  2. DAS ERGEBNIS SEHEN. Ob eine Seite rechnet, steht nicht im Formular,
//     sondern in dem, was nach dem Rechnen dasteht.
//
// Dieser Lauf URTEILT NICHT. Er sichert je Kandidat den gerenderten Text, die
// Feldnamen und einen Bildausschnitt; eingeordnet wird danach anhand dieser
// Belege. Das ist dieselbe Trennung wie beim Förder-Screening: Die Maschine
// sortiert vor, ein Leser entscheidet — und ein Screening-Zitat ist nie die
// Quelle für eine Zahl.
//
// Aufruf:
//   npx tsx scripts/versorger-werkzeuge-ansehen.ts            # alle Kandidaten
//   npx tsx scripts/versorger-werkzeuge-ansehen.ts --grenze=50
//   npx tsx scripts/versorger-werkzeuge-ansehen.ts --stichprobe=80   # aus "keins"
//
// Die Belege landen unter docs/erhebung/werkzeuge/ als eine JSON-Datei je
// Versorger; das Bild daneben als PNG.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { alleZeilen, datenbank, log } from "../lib/skript-umgebung";
import { UA } from "../lib/website-abruf";
import {
  ANLAGE_EINGABE,
  NETZ_PFLICHTPROZESS,
  TARIF_MERKMAL,
  WIRTSCHAFTLICHKEIT_MERKMAL,
  type Werkzeugbefund,
} from "../lib/versorger-werkzeuge";

const HIER = dirname(fileURLToPath(import.meta.url));
const ABLAGE = resolve(HIER, "..", "docs", "erhebung", "werkzeuge");

/** Wie lange eine Seite Zeit bekommt, sich aufzubauen. Großzügiger als beim
 *  reinen Abruf: Ein Werkzeug, das nachgeladen wird, braucht seine Zeit. */
const AUFBAU_MS = 20_000;
/** Nach dem Laden noch warten, damit nachgeladene Werkzeuge erscheinen. */
const RUHE_MS = 2_500;

type Zeile = { id: string; name: string; website: string | null; werkzeug: Werkzeugbefund | null };

/**
 * Was ein Beleg festhält.
 *
 * Bewusst mehr, als für die eine Frage nötig wäre: Der Abruf ist der teure
 * Teil, die Neubewertung soll später eine Abfrage kosten und keinen zweiten
 * Lauf — dieselbe Lehre wie bei den Postfächern.
 */
type Beleg = {
  id: string;
  name: string;
  url: string;
  /** Was die Maschine aus dem Quelltext geschlossen hatte. Zum Vergleich. */
  vermutet: string;
  abruf: "ok" | "fehler";
  fehler?: string;
  /** Titel und sichtbarer Text der gerenderten Seite, gekürzt. */
  titel?: string;
  text?: string;
  /** Alle Eingabefelder mit Beschriftung — daran hängt die Unterscheidung
   *  zwischen Tarifrechner und Wirtschaftlichkeitsrechnung. */
  felder?: { art: string; name: string; label: string }[];
  /** Fremde Rahmen: Wer liefert das Werkzeug? */
  rahmen?: string[];
  /** Was die Muster im GERENDERTEN Text finden — nicht mehr im Quelltext. */
  merkmale?: Record<string, boolean>;
  bild?: string;
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const grenze = Number(argv.find((a) => a.startsWith("--grenze="))?.split("=")[1] ?? Infinity);
  const stichprobe = Number(argv.find((a) => a.startsWith("--stichprobe="))?.split("=")[1] ?? 0);

  const db = datenbank();
  const zeilen = await alleZeilen<Zeile>(db, "utilities", "id, name, website, werkzeug");

  // Zwei Mengen, und BEIDE werden gebraucht.
  //
  // Die Kandidaten belegen, was da ist. Die Stichprobe aus den vermeintlich
  // leeren belegt die GEGENRICHTUNG — ohne sie ist „nur X von 859 haben eins"
  // unbelegt, denn niemand hat je nachgesehen, ob die anderen wirklich keines
  // haben. Aus der Stichprobe wird eine Fehlerquote, und daraus bekommt die
  // Zahl eine ehrliche Spanne statt einer Scheingenauigkeit.
  const kandidaten = zeilen.filter((z) => z.werkzeug && z.werkzeug.zustand !== "keins" && z.werkzeug.url);
  const leere = zeilen.filter((z) => z.website && (!z.werkzeug || z.werkzeug.zustand === "keins"));

  const liste: { z: Zeile; url: string; vermutet: string }[] = [];
  for (const z of kandidaten) liste.push({ z, url: z.werkzeug!.url!, vermutet: z.werkzeug!.zustand });
  if (stichprobe > 0) {
    // Gleichmäßig über die Liste greifen statt die ersten n zu nehmen: Die
    // Tabelle ist nach Größe sortiert, und die ersten n wären lauter große
    // Häuser — eine Stichprobe, die genau die Gruppe misst, die am wenigsten
    // repräsentativ ist.
    const schritt = Math.max(1, Math.floor(leere.length / stichprobe));
    for (let i = 0; i < leere.length && liste.length < kandidaten.length + stichprobe; i += schritt) {
      liste.push({ z: leere[i], url: leere[i].website!, vermutet: "keins" });
    }
  }
  const arbeit = liste.slice(0, grenze === Infinity ? undefined : grenze);
  log(`${kandidaten.length} Kandidaten, ${leere.length} ohne Befund; angesehen werden ${arbeit.length}`);

  mkdirSync(ABLAGE, { recursive: true });
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const kontext = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 900 },
    locale: "de-DE",
  });

  let ok = 0;
  let fehler = 0;
  for (const [i, a] of arbeit.entries()) {
    const beleg = await ansehen(kontext, a);
    writeFileSync(resolve(ABLAGE, `${a.z.id}.json`), JSON.stringify(beleg, null, 2), "utf8");
    if (beleg.abruf === "ok") ok++;
    else fehler++;
    if ((i + 1) % 10 === 0 || i + 1 === arbeit.length) log(`  ${i + 1}/${arbeit.length} — ${ok} gesehen, ${fehler} nicht`);
  }

  await browser.close();
  log(`Fertig. Belege unter docs/erhebung/werkzeuge/ (${ok} gesehen, ${fehler} nicht erreichbar).`);
  log("Eingeordnet wird anhand dieser Belege — dieser Lauf urteilt nicht.");
}

async function ansehen(
  kontext: import("playwright").BrowserContext,
  a: { z: Zeile; url: string; vermutet: string },
): Promise<Beleg> {
  const grund: Beleg = { id: a.z.id, name: a.z.name, url: a.url, vermutet: a.vermutet, abruf: "fehler" };
  const seite = await kontext.newPage();
  try {
    await seite.goto(a.url, { waitUntil: "domcontentloaded", timeout: AUFBAU_MS });
    await seite.waitForTimeout(RUHE_MS);

    grund.titel = (await seite.title()).slice(0, 200);
    const text = (await seite.evaluate(() => document.body?.innerText ?? "")).replace(/\s+/g, " ").trim();
    grund.text = text.slice(0, 6000);

    // Eingabefelder MIT ihrer Beschriftung. Der Feldname allein reicht nicht:
    // `tc_zip` und `persons-power` sagen einem Leser nichts, die Beschriftung
    // daneben („Ihr Jahresverbrauch") sagt alles.
    grund.felder = await seite.evaluate(() => {
      const raus: { art: string; name: string; label: string }[] = [];
      for (const el of Array.from(document.querySelectorAll("input, select, textarea")).slice(0, 60)) {
        const e = el as HTMLInputElement;
        if (e.type === "hidden") continue;
        const id = e.id;
        const zug = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const nah = zug ?? e.closest("label") ?? e.parentElement;
        raus.push({
          art: e.type || e.tagName.toLowerCase(),
          name: (e.name || e.id || "").slice(0, 60),
          label: (nah?.textContent ?? e.placeholder ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
        });
      }
      return raus;
    });

    grund.rahmen = await seite.evaluate(() =>
      Array.from(document.querySelectorAll("iframe"))
        .map((f) => (f as HTMLIFrameElement).src)
        .filter((s) => /^https?:/.test(s))
        .slice(0, 10),
    );

    // Dieselben Muster wie im Quelltext-Lauf, aber auf dem GERENDERTEN Text.
    // Wo sich beide unterscheiden, war der Quelltext-Befund blind.
    grund.merkmale = {
      tarifwort: TARIF_MERKMAL.test(text),
      wirtschaftlichkeitswort: WIRTSCHAFTLICHKEIT_MERKMAL.test(text),
      anlagenfeld: grund.felder.some((f) => ANLAGE_EINGABE.test(`name="${f.name}"`) || ANLAGE_EINGABE.test(`name="${f.label}"`)),
      pflichtprozess: NETZ_PFLICHTPROZESS.test(a.url),
    };

    const bild = resolve(ABLAGE, `${a.z.id}.png`);
    await seite.screenshot({ path: bild, fullPage: false });
    grund.bild = `${a.z.id}.png`;
    grund.abruf = "ok";
  } catch (e) {
    grund.fehler = (e instanceof Error ? e.message : String(e)).slice(0, 200);
  } finally {
    await seite.close();
  }
  return grund;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
