import { test, expect } from "@playwright/test";

/**
 * Die mitlaufenden Spalten der Rangliste dürfen keine Zahl anschneiden.
 *
 * DER ANLASS. Die Namensspalte bleibt beim Waagerecht-Scrollen stehen und deckt
 * alles links von ihrer Kante zu. Blieb die Tabelle ZWISCHEN zwei Spaltenkanten
 * stehen, schnitt diese Kante mitten durch eine Wertzelle — und beide Hälften
 * des Ergebnisses waren gelogen:
 *
 *  · Die Zahl steht links, die Einheit ist breiter. Aus „882 / Mio. €/Jahr"
 *    wurde eine NACKTE EINHEIT ohne Zahl. Genau das stand im Screenshot des
 *    Betreibers, über mehrere Zeilen.
 *  · Oder die Kante traf die Zahl selbst: „1.399.105" wurde zu „399.105" — eine
 *    vollständig lesbare, falsche Zahl.
 *
 * Gemessen über den Scrollbereich trat mindestens eines von beidem an sieben von
 * dreizehn Stellungen auf. Ein früherer Lauf hatte den Fehler an EINER Stellung
 * angesehen und für behoben erklärt — deshalb prüft dieser Test den GANZEN
 * Scrollbereich und vergleicht Rechtecke, nicht Augenmaß.
 *
 * DIE REGEL. In jeder erreichbaren Ruhestellung gilt für jede Wertzelle:
 * entweder sie liegt vollständig rechts der Haltekante (Zahl UND Einheit
 * sichtbar) oder vollständig links davon (beides verdeckt). Nichts dazwischen.
 *
 * WARUM ALS BROWSER-TEST. Die Aussage entsteht erst aus Layout, Sticky-Kante,
 * Schriftbreiten und Scrollstellung zusammen. Ein Unit-Test auf die
 * Spaltenbreiten könnte sie prinzipiell nicht treffen.
 */

async function pruefeUeberdeckung(page: import("@playwright/test").Page, schritte: number) {
  return page.evaluate((n: number) => {
    const TOL = 0.5;
    const sc = document.querySelector(".atlas-tabelle-scroller") as HTMLElement | null;
    if (!sc) return { max: -1, stellungen: [] as number[], funde: [{ pos: -1, art: "kein Scrollkasten", zelle: "" }] };
    const max = sc.scrollWidth - sc.clientWidth;
    const rows = [...sc.querySelectorAll<HTMLElement>(".atlas-rank-row")];
    const funde: { pos: number; art: string; zelle: string }[] = [];
    const stellungen: number[] = [];

    for (let i = 0; i <= n; i++) {
      // Gesetzt wird eine beliebige Stellung; wo die Tabelle einrastet, ist ihre
      // Sache — gewertet wird die Stellung, in der sie danach WIRKLICH steht.
      sc.scrollLeft = Math.round((max * i) / n);
      const pos = Math.round(sc.scrollLeft);
      if (!stellungen.includes(pos)) stellungen.push(pos);

      for (const r of rows) {
        const name = r.querySelector<HTMLElement>(".atlas-fix-spalte--kante");
        if (!name) continue;
        // Die Haltekante: rechte Kante der Namensspalte plus ihr deckender
        // Überstand über die Rasterlücke (--atlas-fix-luecke, 11 px).
        const kante = name.getBoundingClientRect().right + 11;
        const zellen = [...r.children].filter(
          (c) => !c.classList.contains("atlas-fix-spalte") && !c.classList.contains("atlas-go"),
        ) as HTMLElement[];
        for (const z of zellen) {
          const zahl = z.children[0] as HTMLElement | undefined;
          const einheit = z.children[1] as HTMLElement | undefined;
          if (!zahl) continue;
          const zr = zahl.getBoundingClientRect();
          if (zr.width === 0) continue;
          const er = einheit?.getBoundingClientRect();
          const zahlGanzWeg = zr.right <= kante + TOL;
          const zahlAngeschnitten = zr.left < kante - TOL && zr.right > kante + TOL;
          const einheitSichtbar = !!er && er.width > 0 && er.right > kante + TOL;
          const beschriftung = `${zahl.textContent ?? ""}|${(einheit?.textContent ?? "").trim()}`;
          if (zahlAngeschnitten) funde.push({ pos, art: "Zahl angeschnitten", zelle: beschriftung });
          else if (zahlGanzWeg && einheitSichtbar) funde.push({ pos, art: "Einheit ohne Zahl", zelle: beschriftung });
        }
      }
    }
    sc.scrollLeft = 0;
    return { max, stellungen, funde };
  }, schritte);
}

for (const [name, viewport] of [
  ["Telefon", { width: 375, height: 812 }],
  ["Desktop", { width: 1280, height: 800 }],
] as const) {
  test.describe(`Rangliste, mitlaufende Spalten (${name})`, () => {
    test.use({ viewport });

    test("keine Zahl wird von der Haltekante angeschnitten", async ({ page }) => {
      await page.goto("/solar-atlas");
      await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });
      // Der Scrollkasten rastet erst ein, wenn der gemessene Überlauf feststeht
      // (Client-Effekt) — daran hängt auch der Tab-Stopp.
      await expect(page.locator(".atlas-tabelle-scroller")).toHaveAttribute("tabindex", "0", { timeout: 15_000 });

      const { max, stellungen, funde } = await pruefeUeberdeckung(page, 16);
      expect(max, "die Tabelle läuft in diesem Fenster gar nicht über").toBeGreaterThan(40);
      // Es müssen wirklich verschiedene Ruhestellungen geprüft worden sein —
      // sonst wäre der Test still grün, weil er nur bei 0 gemessen hat. Wie
      // viele es sind, hängt an der Fensterbreite: auf dem Telefon sind es
      // sechs, auf dem Desktop zwei (dort fehlen nur wenige Pixel).
      expect(stellungen.length, `nur ${stellungen.length} Stellungen: ${stellungen}`).toBeGreaterThan(1);
      expect(funde.slice(0, 8), `${funde.length} Befunde`).toEqual([]);
    });

    /**
     * Dieselbe Fehlerklasse von der anderen Seite: nicht die Haltekante schneidet
     * die Zahl ab, sondern die Zahl läuft aus ihrer eigenen Spalte heraus.
     *
     * DER ANLASS. Die Pro-Kopf-Spalte ist 61 px breit und stand ungestaffelt in
     * Wp. Herbstmühle im Eifelkreis (25 Einwohner neben 34,9 MWp) ergibt
     * 1.395.922 Wp — 55 px zu viel. Der Zahlenstil bricht nicht um, also lief
     * der Wert nach rechts und stieß ohne Trennung an die Zahl der Nachbarspalte:
     * „1.395.92211". Wieder vollständig lesbar und wieder falsch, diesmal ohne
     * dass eine Kante daran beteiligt war.
     *
     * Geprüft wird deshalb der ganze Bestand einer Seite mit Extremwerten, nicht
     * die eine bekannte Zeile: Die nächste Ausreißer-Gemeinde kommt aus den
     * Daten, nicht aus dem Code, und niemand wird an sie denken.
     */
    test("keine Zahl läuft aus ihrer eigenen Spalte heraus", async ({ page }) => {
      // Der Eifelkreis führt die beiden extremsten Pro-Kopf-Werte des Landes
      // (Herbstmühle 1.395.922 Wp, Scheitenkorb 876.886 Wp) in EINER Liste.
      await page.goto("/solar-atlas/rheinland-pfalz/landkreis-eifelkreis-bitburg-pruem");
      await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });

      const funde = await page.evaluate(() => {
        const TOL = 0.5;
        const sc = document.querySelector(".atlas-tabelle-scroller") as HTMLElement;
        const raus: { zeile: string; inhalt: string; ueber: number }[] = [];
        for (const r of sc.querySelectorAll<HTMLElement>(".atlas-rank-row")) {
          const name = r.querySelector<HTMLElement>(".atlas-fix-spalte--kante")?.innerText ?? "?";
          // Nur die Wertspalten. Platz und Name sind ausgenommen: Der Name wird
          // absichtlich mit „…" gekürzt, statt seine Spalte zu sprengen — das
          // ist genau die Bauweise, die hier für die Zahlen NICHT gelten soll.
          for (const z of [...r.children] as HTMLElement[]) {
            if (z.classList.contains("atlas-go") || z.classList.contains("atlas-fix-spalte")) continue;
            // Zahl und Einheit sitzen als eigene Kinder in der Zelle; beide
            // stehen auf `nowrap` und können deshalb überlaufen.
            for (const teil of [...z.children] as HTMLElement[]) {
              const tr = teil.getBoundingClientRect();
              const zr = z.getBoundingClientRect();
              if (tr.width === 0) continue;
              const ueber = tr.right - zr.right;
              if (ueber > TOL) {
                raus.push({
                  zeile: name.split("\n")[0],
                  inhalt: teil.textContent ?? "",
                  ueber: Math.round(ueber),
                });
              }
            }
          }
        }
        return raus;
      });

      expect(funde.slice(0, 6), `${funde.length} Zellen laufen über`).toEqual([]);
    });

    test("die schwebende Kopie fluchtet in jeder Stellung mit der Liste", async ({ page }) => {
      await page.goto("/solar-atlas?plz=97204");
      await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });
      await expect(page.locator('[data-marked="true"]')).toHaveCount(1, { timeout: 20_000 });

      const max = await page.evaluate(() => {
        const sc = document.querySelector(".atlas-tabelle-scroller") as HTMLElement;
        return sc.scrollWidth - sc.clientWidth;
      });

      const abweichungen: { pos: number; spalte: number; delta: number }[] = [];
      let gemessen = 0;
      for (let i = 0; i <= 8; i++) {
        await page.evaluate((x: number) => {
          (document.querySelector(".atlas-tabelle-scroller") as HTMLElement).scrollLeft = x;
        }, Math.round((max * i) / 8));
        // Die Kopie folgt über einen React-Zustand aus dem Scroll-Ereignis. Der
        // braucht ein Ereignis UND ein Rendern — deshalb hier eine echte Pause
        // statt zweier Bilder in derselben evaluate-Schleife.
        await page.waitForTimeout(150);

        const schritt = await page.evaluate((tol: number) => {
          const sc = document.querySelector(".atlas-tabelle-scroller") as HTMLElement;
          const echt = document.querySelector<HTMLElement>('[data-marked="true"]')!;
          // Die schwebende Kopie ist die einzige Zeile AUSSERHALB des
          // Scrollkastens — sie erscheint nur, wenn die echte aus dem Blick ist.
          const kopie = [...document.querySelectorAll<HTMLElement>(".atlas-rank-row")].find((el) => !sc.contains(el));
          const pos = Math.round(sc.scrollLeft);
          if (!kopie) return { pos, gemessen: false, raus: [] as { pos: number; spalte: number; delta: number }[] };
          const raus: { pos: number; spalte: number; delta: number }[] = [];
          for (let s = 0; s < echt.children.length; s++) {
            const a = (echt.children[s] as HTMLElement).getBoundingClientRect();
            const b = (kopie.children[s] as HTMLElement).getBoundingClientRect();
            const delta = Math.abs(a.left - b.left);
            if (delta > tol) raus.push({ pos, spalte: s, delta: Math.round(delta) });
          }
          return { pos, gemessen: true, raus };
        }, 1.5);

        if (schritt.gemessen) gemessen++;
        abweichungen.push(...schritt.raus);
      }

      expect(gemessen, "die schwebende Kopie war in keiner Stellung da").toBeGreaterThan(3);
      expect(abweichungen.slice(0, 6)).toEqual([]);
    });

    /**
     * DASS ES SEITLICH WEITERGEHT, MUSS ZU SEHEN SEIN — bevor jemand wischt.
     *
     * DER ANLASS (19.08.2026). Der Betreiber sah auf dem Telefon nicht, dass die
     * Tabelle scrollt. Der Verlauf an der rechten Kante war da und stand auf
     * voller Deckkraft — er hatte nur nichts zu tun: Die Tabelle rastet an
     * Spaltenkanten ein, der rechte Rand fällt deshalb in eine Spaltenlücke, und
     * ein Verlauf von Seitenfarbe nach Seitenfarbe ist unsichtbar. Nachgemessen
     * bei 390 px lag in der AUSGANGSSTELLUNG — der, die jeder zuerst sieht — kein
     * einziges Zeichen auf dem Streifen.
     *
     * Deshalb prüft dieser Test beides, und zwar in der Reihenfolge, in der ein
     * Nutzer es erlebt: Der Satz steht da, solange die Tabelle noch nie bewegt
     * wurde, und er ist weg, sobald sie einmal bewegt wurde. Ein Hinweis, der
     * nach dem ersten Wischen zurückkäme, wäre eine Belehrung.
     *
     * Der Kanten-Verlauf selbst wird hier NICHT auf sein Aussehen geprüft — die
     * Farbe entsteht aus Tageszeit-Stufe, Token und zwei überlagerten Verläufen
     * und wäre nur als Pixelvergleich zu fassen. Geprüft wird, dass er da ist,
     * die volle Höhe deckt und auf der Kante des Scrollkastens sitzt.
     */
    test("sagt vor dem ersten Wischen, dass es rechts weitergeht", async ({ page }) => {
      await page.goto("/solar-atlas");
      await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });
      // Erst wenn der Überlauf gemessen ist, steht auch der Hinweis — beides
      // hängt an derselben Messung.
      await expect(page.locator(".atlas-tabelle-scroller")).toHaveAttribute("tabindex", "0", { timeout: 15_000 });

      const hinweis = page.getByText("Die Tabelle geht rechts weiter", { exact: false });
      await expect(hinweis).toBeVisible();

      // Der Verlauf deckt die Kante über die ganze Höhe der Tabelle. Er blendet
      // über 0,15 s ein — ohne diese Pause misst man einen Zwischenwert der
      // Animation und der Test flattert (gemessen: 0,61 und 0,9997).
      await page.waitForTimeout(400);
      const kante = await page.evaluate(() => {
        const sc = document.querySelector(".atlas-tabelle-scroller") as HTMLElement;
        const streifen = sc.parentElement!.querySelector<HTMLElement>(":scope > span[aria-hidden]");
        if (!streifen) return null;
        const s = streifen.getBoundingClientRect();
        const k = sc.getBoundingClientRect();
        return {
          deckung: Number(getComputedStyle(streifen).opacity),
          breite: Math.round(s.width),
          // Beides in Pixeln: sitzt der Streifen wirklich auf der rechten Kante,
          // und reicht er über die volle Höhe?
          abstandZurKante: Math.round(Math.abs(s.right - k.right)),
          hoehenFehlbetrag: Math.round(k.height - s.height),
        };
      });
      expect(kante).not.toBeNull();
      expect(kante!.deckung).toBeGreaterThan(0.95);
      expect(kante!.breite).toBeGreaterThan(20);
      expect(kante!.abstandZurKante).toBeLessThanOrEqual(1);
      expect(kante!.hoehenFehlbetrag).toBeLessThanOrEqual(1);

      // Einmal seitlich bewegen — danach ist der Satz weg und bleibt weg, auch
      // wenn man an den linken Rand zurückkehrt.
      await page.evaluate(() => {
        const sc = document.querySelector(".atlas-tabelle-scroller") as HTMLElement;
        sc.scrollLeft = 120;
      });
      await expect(hinweis).toHaveCount(0, { timeout: 5_000 });

      await page.evaluate(() => {
        (document.querySelector(".atlas-tabelle-scroller") as HTMLElement).scrollLeft = 0;
      });
      await page.waitForTimeout(200);
      await expect(hinweis).toHaveCount(0);
    });
  });
}

/**
 * Die mitlaufenden Spalten müssen in JEDER Zeile auch WIRKLICH DA SEIN.
 *
 * DER ANLASS (18.08.2026). Auf dem Telefon — Safari, 390 × 576 — trugen Zeile 1
 * und 2 Platzziffer und Ortsnamen, ab Zeile 3 waren beide Spalten LEER. Die
 * Wertspalten daneben standen korrekt, Zeilenhöhen und Trennlinien auch. Es
 * fehlte allein der Inhalt der beiden fixierten Spalten.
 *
 * WARUM DER TEST DARÜBER STEHT UND NICHT NUR DER ÜBERDECKUNGS-TEST OBEN. Der
 * prüft, ob die Haltekante eine Zahl anschneidet — eine Frage der Geometrie. Hier
 * war die Geometrie fehlerlos: Rechtecke, Textinhalt, Farben, Deckkraft und
 * Sichtbarkeit waren in jedem gemessenen Browser korrekt. Nicht gemalt wurde es
 * trotzdem. Deshalb prüft dieser Block ZWEI Dinge nebeneinander:
 *
 *  1. DAS ERGEBNIS — jede sichtbare Zeile trägt in beiden fixierten Spalten
 *     sichtbaren Text: nicht leer, Rechteck größer als null, und an seiner
 *     eigenen Stelle liegt nichts darüber. Das ist die Aussage, die der Betreiber
 *     im Browser sieht, und sie gehört festgenagelt, egal woran sie einmal
 *     scheitert.
 *  2. DIE URSACHE — keine dieser Zellen darf einen EIGENEN STAPELKONTEXT
 *     aufmachen. Genau das tat sie: `z-index:1` stand an jeder der 34 Zellen,
 *     obwohl der Absatz darüber in lib/theme.ts seit jeher das Gegenteil
 *     vorschreibt und die Folge sogar beschreibt („blieben einzelne Platz- und
 *     Namenszellen einfach unbemalt, während im Baum alles korrekt stand"). Harmlos
 *     blieb das, solange der Scrollkasten selbst kein Stapelkontext war; seit er
 *     einen hat, liegen 34 davon ineinander, unter einer Ein-/Ausblendung, die
 *     die ganze Gruppe zwischenspeichert.
 *
 * Punkt 1 allein hätte den Fehler NICHT gefunden — nachgemessen in Chromium und
 * WebKit, mit und ohne Größenänderung, war er dort jedes Mal grün. Ein Test, der
 * nur das Ergebnis prüft, wäre hier also genau so blind gewesen wie der
 * Überdeckungs-Test. Punkt 2 ist die Gegenprobe: Kommt `z-index:1` zurück,
 * schlägt er an.
 *
 * BEIDE LADEWEGE. Einmal direkt auf 390 px geladen, einmal breit geladen und
 * danach verkleinert. Der zweite Weg ist der, den eine Geräteansicht und ein
 * gedrehtes Telefon nehmen — dort steht die Tabelle schon, wenn sich die Breite
 * ändert, und alles, was beim ersten Rendern einmal gemessen und nicht
 * nachgeführt wird, fällt erst hier auf.
 */
const TELEFON = { width: 390, height: 576 };

async function pruefeFixSpalten(page: import("@playwright/test").Page) {
  await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });
  await expect(page.locator(".atlas-tabelle-scroller")).toHaveAttribute("tabindex", "0", { timeout: 15_000 });
  // Die Liste in den Blick holen — geprüft wird nur, was ein Mensch sehen würde.
  await page.evaluate(() => {
    document.querySelector(".atlas-tabelle-scroller")!.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(400);

  return page.evaluate(() => {
    const sc = document.querySelector(".atlas-tabelle-scroller") as HTMLElement;
    const funde: string[] = [];
    let geprueft = 0;

    /**
     * Was SOLL über der Liste liegen: die schwebende Karte am unteren Rand (der
     * Postleitzahl-Einstieg bzw. die Kopie der markierten Zeile) — und im
     * Entwicklungsmodus das Fehler-Fähnchen von Next. Zeilen darunter sind
     * absichtlich verdeckt; sie hier zu bemängeln hieße, das Gewollte anzuzeigen.
     */
    const decken = [...document.body.querySelectorAll<HTMLElement>("*")]
      .filter((el) => {
        if (sc.contains(el)) return false;
        if (el.tagName.toLowerCase() === "nextjs-portal") return true;
        const cs = getComputedStyle(el);
        return (cs.position === "sticky" || cs.position === "fixed") && cs.visibility !== "hidden";
      })
      .map((el) => el.getBoundingClientRect())
      .filter((b) => b.width > 0 && b.height > 0);

    for (const r of sc.querySelectorAll<HTMLElement>(".atlas-rank-row")) {
      const rr = r.getBoundingClientRect();
      // Nur vollständig sichtbare Zeilen: eine halb angeschnittene Zeile am
      // unteren Rand würde beim Punkt-Test das Fenster verlassen.
      if (rr.top < 0 || rr.bottom > window.innerHeight || rr.height === 0) continue;
      if (decken.some((d) => d.left < rr.right && d.right > rr.left && d.top < rr.bottom && d.bottom > rr.top)) continue;
      geprueft++;

      const spalten: [string, HTMLElement | null][] = [
        ["Platz", r.querySelector<HTMLElement>(".atlas-fix-spalte:not(.atlas-fix-spalte--kante)")],
        ["Name", r.querySelector<HTMLElement>(".atlas-fix-spalte--kante")],
      ];

      for (const [wie, zelle] of spalten) {
        const zeile = `Zeile ${geprueft} (${wie})`;
        if (!zelle) {
          funde.push(`${zeile}: die Zelle fehlt ganz`);
          continue;
        }

        // 2. DIE URSACHE: kein eigener Stapelkontext an den Zeilen-Zellen.
        // Die Kopfzeile ist ausgenommen (--kopf, z-index 4) — ihr Aufklapp-Menü
        // muss über den Zeilen liegen, das sind zwei Zellen statt zweiunddreißig.
        const zi = getComputedStyle(zelle).zIndex;
        if (zi !== "auto") funde.push(`${zeile}: eigener Stapelkontext (z-index: ${zi})`);

        // 1a. Text vorhanden.
        const text = (zelle.textContent ?? "").trim();
        if (text === "") {
          funde.push(`${zeile}: kein Text`);
          continue;
        }

        // 1b. Der Text hat ein Rechteck — geprüft am Textknoten selbst, nicht an
        // der Zelle: die Zelle deckt die volle Zeilenhöhe und hätte auch dann ein
        // Rechteck, wenn sie leer wäre.
        const bereich = document.createRange();
        bereich.selectNodeContents(zelle);
        const tr = bereich.getBoundingClientRect();
        if (tr.width < 1 || tr.height < 1) {
          funde.push(`${zeile}: Text ohne Fläche (${Math.round(tr.width)}×${Math.round(tr.height)})`);
          continue;
        }

        // 1c. Nichts liegt darüber — gefragt wird an der Stelle des Textes.
        const x = tr.left + Math.min(4, tr.width / 2);
        const y = tr.top + tr.height / 2;
        const oben = document.elementFromPoint(x, y);
        if (!oben || !(zelle === oben || zelle.contains(oben))) {
          const wer = oben ? `${oben.tagName.toLowerCase()}.${(oben.className || "").toString().slice(0, 40)}` : "nichts";
          funde.push(`${zeile}: verdeckt von ${wer}`);
        }
      }
    }
    return { geprueft, funde };
  });
}

test.describe("Rangliste, mitlaufende Spalten tragen in jeder Zeile ihren Inhalt", () => {
  test.use({ viewport: TELEFON });

  test("direkt auf 390 px geladen", async ({ page }) => {
    await page.goto("/solar-atlas");
    const { geprueft, funde } = await pruefeFixSpalten(page);
    // Ohne diese Zusicherung wäre der Test still grün, wenn gar keine Zeile im
    // Blick liegt — der Fehler, gegen den es ihn gibt.
    expect(geprueft, "keine vollständig sichtbare Zeile geprüft").toBeGreaterThan(3);
    expect(funde.slice(0, 10), `${funde.length} Befunde`).toEqual([]);
  });

  test("nach einer Größenänderung von 1280 auf 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/solar-atlas");
    await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });
    // Erst wenn die Tabelle steht, wird schmal gemacht: Alles, was beim ersten
    // Rendern gemessen und nicht nachgeführt wird, zeigt sich nur so.
    await page.setViewportSize(TELEFON);
    await page.waitForTimeout(600);
    const { geprueft, funde } = await pruefeFixSpalten(page);
    expect(geprueft, "keine vollständig sichtbare Zeile geprüft").toBeGreaterThan(3);
    expect(funde.slice(0, 10), `${funde.length} Befunde`).toEqual([]);
  });
});

/**
 * DIE RANGBEWEGUNG STEHT AUF JEDER EBENE DA — auch wo sie null ist.
 *
 * DER ANLASS (19.08.2026). Neben der Platzziffer stand nichts, und der Betreiber
 * fragte zweimal, ob die Spalte kaputt sei. Sie war es nicht: Zwischen sechzehn
 * Bundesländern bewegt sich in keiner der sieben Platzierungs-Größen etwas, also
 * gab es nichts zu zeigen. Nur ist „nichts da" von „nicht gerechnet" nicht zu
 * unterscheiden — deshalb steht jetzt „±0" da, wo gemessen und nichts gefunden
 * wurde.
 *
 * Der Test prüft beide Hälften, und die zweite ist die wichtigere:
 *  1. KEINE ZEILE LÄSST DIE BEWEGUNG WEG. Hinter jeder Platzziffer steht
 *     entweder eine Bewegung oder „±0".
 *  2. AUF KREIS- UND GEMEINDEEBENE BEWEGT SICH WIRKLICH ETWAS. Stünde dort
 *     ebenfalls überall „±0", wäre die Rechnung kaputt und die neue Anzeige
 *     würde den Fehler zudecken statt ihn zu zeigen — genau die Fehlerklasse,
 *     gegen die es diesen Punkt gibt. Gemessen am 19.08.2026: Bayern 76 von 96
 *     Kreisen bewegt, Landkreis Haßberge 12 von 26 Gemeinden.
 */
test.describe("Rangliste: die Rangbewegung steht auf jeder Ebene da", () => {
  const EBENEN = [
    { name: "Bundesländer", url: "/solar-atlas", bewegungErwartet: false },
    { name: "Kreise", url: "/solar-atlas/bayern", bewegungErwartet: true },
    { name: "Gemeinden", url: "/solar-atlas/bayern/landkreis-hassberge", bewegungErwartet: true },
  ] as const;

  for (const ebene of EBENEN) {
    test(`${ebene.name}: hinter jeder Platzziffer steht eine Bewegung`, async ({ page }) => {
      await page.goto(ebene.url);
      await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });

      const befund = await page.evaluate(() => {
        const sc = document.querySelector(".atlas-tabelle-scroller") as HTMLElement;
        // Der Textinhalt der Platz-Zelle: „4." plus das, was daneben steht. Die
        // Pfeile sind SVG und tragen keinen Text — „4.3" heißt also „Platz 4,
        // drei Plätze bewegt", „4.±0" heißt „Platz 4, unverändert".
        const roh = [...sc.querySelectorAll<HTMLElement>(".atlas-rank-row")].map((r) =>
          (r.querySelector(".atlas-fix-spalte:not(.atlas-fix-spalte--kante)")?.textContent ?? "").trim(),
        );
        return {
          zeilen: roh.length,
          // Eine Platzziffer ohne alles — der Zustand, der wie ein Fehler aussah.
          nackt: roh.filter((t) => /^\d+\.$/.test(t)),
          // Etwas, das in keine der bekannten Formen passt.
          unbekannt: roh.filter((t) => !/^(\d+\.|—)(±0|\d+)?$/.test(t)),
          unveraendert: roh.filter((t) => t.endsWith("±0")).length,
          bewegt: roh.filter((t) => /^\d+\.\d+$/.test(t)).length,
        };
      });

      expect(befund.zeilen, "keine Zeile geprüft").toBeGreaterThan(10);
      expect(befund.unbekannt.slice(0, 5)).toEqual([]);
      expect(befund.nackt.slice(0, 5), `${befund.nackt.length} Zeilen ohne Bewegungsangabe`).toEqual([]);
      if (ebene.bewegungErwartet) {
        expect(
          befund.bewegt,
          `auf dieser Ebene bewegt sich sonst nichts mehr — dann rechnet die Bewegung nicht, statt null zu sein (${befund.unveraendert} × ±0 von ${befund.zeilen})`,
        ).toBeGreaterThan(0);
      } else {
        // Umgekehrte Zusicherung: Hier IST heute alles unverändert, und genau
        // dieser Fall muss sichtbar sein statt leer zu bleiben.
        expect(befund.unveraendert).toBeGreaterThan(0);
      }
    });
  }
});
