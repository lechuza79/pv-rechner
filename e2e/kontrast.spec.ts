import { test, expect } from "@playwright/test";
import { SEITEN } from "./routen";
import {
  HAEUFIGSTE_FARBE,
  MESSKOPF,
  UNLESBAR_UNTER,
  grenzeFuer,
  kontrastVon,
  stufePinnen,
  ueberlegen,
  zahlen,
  zeile,
  type Kontrastbefund,
  type Tagesstufe,
} from "./kontrast";

// ─── Kein Text verschwindet auf seinem Grund ─────────────────────────────────
//
// DER ANLASS (23.09.2026): Der Betreiber stolperte über eine Tabellenzeile, in
// der der eigene Ortsname auf einem dunklen Block stand — in der Tinte, die
// für die helle Platte daneben gedacht war, also 1,3:1. Dieselbe Zeile trug
// ihre Einheiten in Weiß auf Lime (1,1:1), und über die ganze Site standen
// 164 Zahlen im Flächengrün auf hellem Grund (1,8:1).
//
// KEINER DIESER FEHLER IST IM CODE ZU SEHEN. Es gab keinen Typfehler, keinen
// roten Test, kein kaputtes Aussehen — die Seite sieht aufgeräumt aus, sie ist
// nur an diesen Stellen leer. Entstanden sind sie alle gleich: Die
// Design-Umstellung vom 20./21.09.2026 hat die BEDEUTUNG der Farbtoken
// geändert, nicht ihre Verwendungsorte. „Text auf Akzent" war vorher Weiß und
// ist jetzt eine fast schwarze Tinte; wer Weiß von Hand getippt hatte, stand
// danach auf dem Kopf.
//
// Deshalb misst der Browser, und zwar die WIRKUNG: Was kommt beim Leser an,
// nachdem alle Lagen übereinanderliegen und alle Variablen aufgelöst sind.
// Ein Test auf die Farbtoken im Quelltext kann das nicht — genau die Fälle
// hier kamen über Zwischenvariablen, geerbte Klassen und getippte Werte
// zustande, und ein statischer Abgleich fand am selben Tag null Treffer.
//
// Was er NICHT leistet, damit niemand sich darauf verlässt: doppelte
// Elemente, falsch platzierte Kopien, verrutschte Layouts. Der Anlassfall
// trug beides — die unlesbare Zeile UND eine schwebende Kopie, die dauerhaft
// über den Spaltenköpfen klebte. Die fängt der Browser-Test des Ranglisten-
// Verhaltens, nicht dieser hier.

test.describe.configure({ timeout: 45_000 });

// Der eigene Ort muss gesetzt sein, sonst gibt es die markierte Zeile gar
// nicht — und genau sie war der Anlass. Ein Test, der nur Seiten AUFRUFT,
// misst die halbe Oberfläche: Zustände, die erst durch eine Eingabe
// entstehen, kommen darin nicht vor.
const EIGENER_ORT = {
  region_id: "09162000",
  name: "München",
  path: "/solar-atlas/bayern/muenchen/muenchen",
  kreisName: "München",
  bundeslandName: "Bayern",
  plz: "80331",
};

// BEIDE ENDEN DER TAGESSTUFEN, nicht die gerade geltende. Das Theme hat sieben
// Stufen, von voller Sonne bis Nacht, und sie unterscheiden sich nicht nur im
// Grund: Textfarben, Signalfarben und Ränder werden je Stufe eigens gesetzt.
// Wer nur eine misst, prüft die Site, die er gerade zufällig vor sich hat —
// genau so entgingen dem ersten Lauf 53 schwarze Diagramm-Beschriftungen, die
// nur nachts auf dunklem Grund stehen.
const STUFEN: Tagesstufe[] = ["light", "dark"];

/**
 * Seiten, über die dieser Wächter kein Urteil fällen kann.
 *
 * Die Ortsseite färbt ihre Überschrift nach dem HIMMEL dahinter: Ein Skript
 * tastet den gemalten Grund ab und setzt die Tinte danach — hell auf der
 * Nachtseite, dunkel über dem Tageshimmel. Das Abtasten hängt an gezeichneten
 * Bildern, und genau die bekommt ein Browser ohne sichtbares Fenster nur
 * unzuverlässig: Im Prüflauf bleibt die Tinte deshalb auf ihrem Anfangswert
 * Schwarz stehen, und der Wächter meldet Schwarz auf Nachthimmel.
 *
 * NACHGEMESSEN IM ECHTEN BROWSER (23.09.2026), weil die Frage sonst offen
 * geblieben wäre: In einem sichtbaren Fenster gibt es diesen Zustand NICHT.
 * Vierzig Messpunkte über acht Sekunden ab dem Seitenaufruf zeigen durchgehend
 * die abgetastete Tinte, kein einziges Mal Schwarz; die Überschrift steht hell
 * auf dem Nachthimmel und ist einwandfrei zu lesen. Im Prüflauf dagegen
 * kippte die Messung von Lauf zu Lauf — mal die Überschrift, mal der
 * Einleitungssatz, mal nichts.
 *
 * Es ist also kein Befund, den wir wegdrücken, sondern eine Grenze des
 * Messplatzes: Was an Bildfrequenz hängt, lässt sich dort nicht beurteilen.
 *
 * OFFEN (bis 11/2026): Fällt weg, sobald die Tinte nicht mehr mit Schwarz
 * startet — dann ist auch im Prüflauf nichts mehr zu melden. Die Sitzung, die
 * die Seite baut, hat die Messung am 23.09.2026 bekommen.
 */
const NOCH_KEIN_URTEIL: string[] = ["/solar-atlas/bayern/landkreis-wuerzburg/hoechberg"];

for (const stufe of STUFEN) {
  for (const { pfad } of SEITEN) {
    if (NOCH_KEIN_URTEIL.includes(pfad)) continue;
    test(`${pfad} (${stufe}): kein Text unter ${UNLESBAR_UNTER}:1`, async ({ page }) => {
      await page.addInitScript(stufePinnen(stufe));
      await page.addInitScript((ort) => {
        try {
          window.localStorage.setItem("solarcheck.home-gemeinde.v1", JSON.stringify(ort));
        } catch {
          // Privater Modus — dann eben ohne markierte Zeile.
        }
      }, EIGENER_ORT);

      const antwort = await page.goto(pfad, { waitUntil: "domcontentloaded" });
      expect(antwort?.status(), `${pfad} antwortet nicht mit 200`).toBe(200);
      // Nicht auf „Netz ruhig" warten: Auf dem Runner hängen externe Abrufe
      // minutenlang im Zeitlimit (dieselbe Messung wie beim Überlauf-Test).
      // Nachgeladene Blöcke ändern Farben nicht mehr, wenn sie einmal stehen.
      await page.waitForTimeout(2000);
      // Include the lazy ranking's controls: a closed disclosure cannot reveal
      // palette regressions in the postcode card or comparison badges.
      const rankingDisclosure = page.getByText(/^Alle .* in der ausführlichen Tabelle$/);
      if (await rankingDisclosure.count()) {
        await rankingDisclosure.click();
        await expect(page.locator(".atlas-tabelle-scroller")).toBeVisible();
      }
      await page.addScriptTag({ content: MESSKOPF });
      await page.addScriptTag({ content: HAEUFIGSTE_FARBE });

      const messen = () =>
        page.evaluate(() => (window as unknown as {
          __kontrastMessen: () => Kontrastbefund[];
        }).__kontrastMessen()) as Promise<Kontrastbefund[]>;

      // GEMESSEN WIRD, BIS SICH NICHTS MEHR ÄNDERT — nicht nach fester Frist.
      // Manche Farbe steht erst fest, wenn ein Skript sie gesetzt hat: Die
      // Überschrift der Ortsseite nimmt ihre Tinte aus dem gemalten Himmel
      // dahinter und trägt bis dahin die Anfangsfarbe Schwarz. Zwei Messungen
      // mit fester Pause reichten dafür nicht — der Browser-Test derselben
      // Seite braucht für genau diesen Zustand rund zehn Sekunden, und unter
      // Last mehr. Eine feste Frist ist hier immer entweder zu kurz (erfundene
      // Befunde) oder für jede ruhige Seite zu lang.
      //
      // Also: wiederholen, bis zwei Runden dasselbe sagen. Auf einer ruhigen
      // Seite sind das zwei Messungen, auf einer, die sich noch einrichtet, so
      // viele wie nötig — gedeckelt, damit ein flackernder Wert den Lauf nicht
      // aufhält.
      let vorherige = await messen();
      let jetzt = vorherige;
      for (let runde = 0; runde < 18; runde++) {
        await page.waitForTimeout(700);
        jetzt = await messen();
        const a = vorherige.map((b) => `${b.wo}|${b.text}|${b.tinte}`).sort().join("\n");
        const bb = jetzt.map((b) => `${b.wo}|${b.text}|${b.tinte}`).sort().join("\n");
        if (a === bb) break;
        vorherige = jetzt;
      }

      const verdaechtig = jetzt.filter((b) => b.kontrast < grenzeFuer(b));

      // NACHGEPRÜFT WIRD AM BILD, nicht am Baum: Ein Verlauf, ein Foto oder
      // eine gezeichnete Fläche hinter dem Text hat keine Hintergrund-FARBE,
      // und der Messkopf sieht dann den Grund der Seite statt den, auf dem der
      // Text wirklich steht. Genau daran ist der erste Fehlalarm entstanden.
      //
      // Fotografiert wird das ELEMENT — Playwright holt es dafür in den Blick.
      // Ein Ausschnitt des Fensters scheitert an allem, was weiter unten
      // steht, und ein übersprungener Befund sieht aus wie ein behobener: Mit
      // dieser Fassung blieb der Lauf bei absichtlich eingebauter Lücke grün.
      const befunde: Kontrastbefund[] = [];
      for (const b of verdaechtig) {
        const el = page.locator(`[data-kontrast="${b.marke}"]`).first();
        const bild = await el.screenshot({ timeout: 5_000 }).catch(() => null);
        if (!bild) {
          // Kein Urteil möglich — und das wird gemeldet, nicht verschwiegen.
          befunde.push(b);
          continue;
        }
        const grund = await page.evaluate(
          (x) => (window as unknown as { __haeufigsteFarbe: (s: string) => Promise<string | null> }).__haeufigsteFarbe(x),
          bild.toString("base64"),
        );
        if (!grund) {
          befunde.push(b);
          continue;
        }
        const echt = kontrastVon(ueberlegen(zahlen(b.tinte), zahlen(grund)), zahlen(grund));
        if (echt < grenzeFuer(b)) befunde.push({ ...b, kontrast: Math.round(echt * 100) / 100, grund });
      }

      // Gleiche Farbpaarung nur einmal melden: Eine Tabelle mit neunzig Zahlen
      // in derselben Farbe ist EIN Fehler, keine neunzig — und eine Meldung mit
      // neunzig Zeilen liest niemand.
      const gesehen = new Set<string>();
      const knapp = befunde.filter((b) => {
        const schluessel = `${b.vordergrund}|${b.grund}`;
        if (gesehen.has(schluessel)) return false;
        gesehen.add(schluessel);
        return true;
      });

      expect(
        befunde.length,
        `${pfad} (${stufe}): ${befunde.length} Textstellen unter der Lesbarkeitsgrenze ` +
          `(${knapp.length} verschiedene Farbpaare)\n  ` +
          knapp.map(zeile).join("\n  "),
      ).toBe(0);
    });
  }
}
