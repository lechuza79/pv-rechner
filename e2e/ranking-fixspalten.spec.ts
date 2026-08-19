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
     * DASS ES SEITLICH WEITERGEHT, MUSS ZU SEHEN SEIN — und bedienbar.
     *
     * VORGESCHICHTE (19.08.2026, zwei Anläufe an einem Tag). Der Betreiber sah
     * auf dem Telefon nicht, dass die Tabelle scrollt. Der Verlauf an der
     * rechten Kante war da und auf voller Deckkraft — er hatte nur nichts zu
     * tun: Die Tabelle rastet an Spaltenkanten ein, der rechte Rand fällt in
     * eine Spaltenlücke, und ein Verlauf von Seitenfarbe nach Seitenfarbe ist
     * unsichtbar (bei 390 px in der Ausgangsstellung kein einziges Zeichen auf
     * dem Streifen). Der erste Anlauf setzte eine harte Kante darüber und einen
     * Satz darunter; beides ist zurückgenommen. Jetzt stehen zwei Knöpfe da.
     *
     * Geprüft wird, was ein Nutzer erlebt:
     *  1. Am linken Rand steht NUR der Weiter-Knopf — ein Zurück-Knopf, der
     *     nichts zu tun hat, behauptet verborgenen Inhalt links.
     *  2. Jeder Druck springt auf den NÄCHSTEN RASTPUNKT, nicht um einen
     *     erfundenen Betrag. Nachweis ohne die Rastpunkte zu kennen: Die
     *     Stellungen wachsen streng, jede einzelne ist eine Ruhestellung (nach
     *     dem Loslassen bewegt sich nichts mehr — sonst hätte das Einrasten den
     *     Knopf korrigiert), und es sind so viele Sprünge wie Wertspalten.
     *  3. Am rechten Ende verschwindet der Weiter-Knopf und der Zurück-Knopf
     *     steht da; zurück landet man wieder bei genau 0.
     *  4. Beide sind echte Knöpfe mit Beschriftung und mit der Tastatur zu
     *     bedienen (WCAG 2.1.1) — deshalb Fokus + Enter statt Klick.
     */
    test("springt mit den Pfeilen spaltenweise und zeigt sie nur, wo es weitergeht", async ({ page }) => {
      await page.goto("/solar-atlas");
      await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });
      // Erst wenn der Überlauf gemessen ist, stehen auch die Knöpfe — beides
      // hängt an derselben Messung.
      await expect(page.locator(".atlas-tabelle-scroller")).toHaveAttribute("tabindex", "0", { timeout: 15_000 });

      const zurueck = page.getByRole("button", { name: "Eine Spalte zurück" });
      const weiter = page.getByRole("button", { name: "Eine Spalte weiter" });
      const stellung = () =>
        page.evaluate(() => Math.round((document.querySelector(".atlas-tabelle-scroller") as HTMLElement).scrollLeft));

      await expect(weiter).toBeVisible();
      await expect(zurueck).toBeHidden();
      expect(await stellung()).toBe(0);

      // Vorwärts bis ans Ende. Nach jedem Sprung eine zweite Messung: Rastet die
      // Tabelle nach dem Loslassen noch nach, war das Ziel kein Rastpunkt.
      const stellungen: number[] = [];
      for (let i = 0; i < 12 && (await weiter.isVisible()); i++) {
        await weiter.focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(600);
        const gelandet = await stellung();
        await page.waitForTimeout(300);
        expect(await stellung(), "nach dem Sprung ist die Tabelle nachgerastet — das Ziel war kein Rastpunkt").toBe(
          gelandet,
        );
        stellungen.push(gelandet);
      }

      // Streng wachsend, keine Stelle doppelt (ein Knopf, der auf der Stelle
      // tritt, sah zwischenzeitlich aus wie ein toter Knopf).
      // Wie viele Sprünge es bis ans Ende sind, hängt an der Fensterbreite: auf
      // dem Telefon sechs, am Desktop zwei (dort fehlen nur zwei Spalten).
      expect(stellungen.length, "kein einziger Sprung").toBeGreaterThanOrEqual(2);
      for (let i = 1; i < stellungen.length; i++) {
        expect(stellungen[i], `Sprung ${i} ging nicht vorwärts: ${stellungen.join(" → ")}`).toBeGreaterThan(
          stellungen[i - 1],
        );
      }
      // Sieben Wertspalten, also höchstens sieben Sprünge bis ans Ende — mehr
      // hieße, dass der Knopf feiner springt als die Tabelle einrastet.
      expect(stellungen.length).toBeLessThanOrEqual(7);

      await expect(weiter).toBeHidden();
      await expect(zurueck).toBeVisible();

      // …und wieder zurück, bis genau auf 0.
      for (let i = 0; i < 12 && (await zurueck.isVisible()); i++) {
        await zurueck.focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(600);
      }
      expect(await stellung(), "zurück landet nicht am linken Rand").toBe(0);
      await expect(zurueck).toBeHidden();
      await expect(weiter).toBeVisible();
    });

    /**
     * ZWEI AUSZEICHNUNGEN, ZWEI BEDEUTUNGEN — und keine dritte.
     *
     * DER ANLASS (19.08.2026). Seit Platzierung und Sortierung getrennt sind,
     * tragen zwei Spalten gleichzeitig eine Auszeichnung, und keine sagte, wofür
     * sie steht. Vorgabe des Betreibers: Die SORTIERTE Spalte bekommt einen
     * Pfeil, die PLATZIERTE eine blau hinterlegte Box wie das Feld „Platzierung
     * nach …" darüber — das ist die sichtbare Klammer zwischen beiden.
     *
     * Der Test nagelt die drei Aussagen fest, die dabei schiefgehen können:
     *  1. Genau EINE Box und genau EIN Pfeil, in jedem Zustand. Zwei Pfeile
     *     (Platz-Kopf und Wertspalte gleichzeitig) waren der erste Fehlversuch.
     *  2. Box und Pfeil folgen den richtigen Zuständen und lassen sich TRENNEN:
     *     Nach einem Klick auf eine andere Überschrift wandert der Pfeil, die
     *     Box bleibt.
     *  3. Die Marken kosten keine Breite. Die Wertspalten haben 1 bis 2 Pixel
     *     Luft; wäre der Pfeil ein normales Kind, zöge er die Tabelle auf. Die
     *     Gesamtbreite muss über alle Zustände dieselbe bleiben — sie bestimmt
     *     die Rastpunkte, und ein verschobener Rastpunkt schneidet Zahlen an.
     */
    test("markiert sortierte und platzierte Spalte verschieden — ohne die Tabelle zu verbreitern", async ({ page }) => {
      await page.goto("/solar-atlas");
      await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });
      await expect(page.locator(".atlas-tabelle-scroller")).toHaveAttribute("tabindex", "0", { timeout: 15_000 });

      const zustand = () =>
        page.evaluate(() => {
          const sc = document.querySelector(".atlas-tabelle-scroller") as HTMLElement;
          return {
            box: [...document.querySelectorAll<HTMLElement>("[data-platziert]")].map((e) => e.dataset.spaltenkopf),
            sortiert: [...document.querySelectorAll<HTMLElement>("[data-sortiert]")].map((e) => e.dataset.spaltenkopf),
            pfeileAn: document.querySelectorAll('[data-sortpfeil="an"]').length,
            breite: Math.round(sc.scrollWidth),
          };
        });

      const start = await zustand();
      expect(start.box.length, "genau eine Spalte trägt die Platzierungs-Box").toBe(1);
      expect(start.pfeileAn, "genau ein Sortier-Pfeil").toBe(1);
      expect(start.sortiert).toEqual(start.box); // beim Laden dieselbe Größe

      // Nach einer anderen Spalte sortieren: der Pfeil wandert, die Box bleibt.
      await page.getByTitle(/Liste nach Anlagen sortieren/).click();
      await page.waitForTimeout(400);
      const getrennt = await zustand();
      expect(getrennt.sortiert).toEqual(["count"]);
      expect(getrennt.box).toEqual(start.box);
      expect(getrennt.pfeileAn).toBe(1);

      // Andere Platzierung wählen: die Box wandert mit dem Feld darüber.
      await page.getByRole("button", { name: /Platzierung nach/ }).click();
      await page.getByRole("button", { name: "CO₂ gespart", exact: true }).first().click();
      await page.waitForTimeout(400);
      const umgestellt = await zustand();
      expect(umgestellt.box).toEqual(["co2"]);
      expect(umgestellt.pfeileAn).toBe(1);

      // Auch die letzte Spalte sortieren — dort hat ein überlaufendes Kind den
      // meisten Platz zu verderben.
      await page.getByTitle(/Liste nach Batterien sortieren/).click();
      await page.waitForTimeout(400);
      const letzte = await zustand();
      expect(letzte.sortiert).toEqual(["speicher"]);

      for (const [name, z] of [["getrennt", getrennt], ["umgestellt", umgestellt], ["letzte Spalte", letzte]] as const) {
        expect(z.breite, `${name}: die Tabelle ist breiter geworden`).toBe(start.breite);
      }
    });
  });
}

/**
 * JEDER RASTPUNKT LIEGT AUF DER LINKEN KANTE EINER WERTSPALTE — für JEDE Spalte.
 *
 * DER ANLASS (19.08.2026). Der Betreiber meldete, die Spalten-Anker seien
 * versetzt: Ein Druck auf den Blätter-Pfeil wechsle nicht sauber zur nächsten
 * Spalte. Nachgemessen (Rechteck gegen Rechteck, Chromium und WebKit, 390 und
 * 1280 px, Bundesland- und Kreisliste) war der Versatz an JEDER erreichbaren
 * Ruhestellung exakt 0,00 px — die Rechnung dahinter stimmt also:
 *   scroll-padding-left = Innenabstand des Kastens + Breite des mitlaufenden
 *   Blocks (Platz + Lücke + Name + Lücke) = 8 + 216 = 224 px.
 * Nur: Diese Rechnung steht an drei Stellen im Code (SCROLLER_PAD, FIX_BREITE,
 * die Rastpunkte aus den Spaltenbreiten), und jede Änderung an einer
 * Spaltenbreite, an der Rasterlücke oder am Innenabstand verschiebt sie
 * lautlos. Ein Versatz von wenigen Pixeln ist genau die Fehlerklasse, gegen die
 * es das Einrasten überhaupt gibt: Die mitlaufende Namensspalte schneidet dann
 * in die erste Wertzelle und macht aus „1.399.105" ein „399.105".
 *
 * Deshalb steht die Messung jetzt als Test da, nicht als Notiz. Er prüft beide
 * Richtungen:
 *  1. JEDE Ruhestellung ist bündig — genau eine Wertspalte beginnt dort auf der
 *     Haltekante (rechte Kante der Namensspalte plus ihre 11 px Deckung).
 *  2. JEDE Wertspalte ist auch wirklich einmal die bündige — sonst wäre der
 *     Test grün, wenn die Tabelle gar nicht mehr scrollt oder das Einrasten
 *     Spalten überspringt.
 *
 * GEGENPROBE GEFAHREN: mit `scrollPaddingLeft: FIX_BREITE` (also ohne den
 * Innenabstand des Kastens) meldet er 8 px Versatz an jeder Ruhestellung.
 */
test.describe("Rangliste: die Rastpunkte sitzen auf den Spaltenkanten", () => {
  for (const [name, viewport] of [
    ["Telefon", { width: 390, height: 820 }],
    ["Desktop", { width: 1280, height: 820 }],
  ] as const) {
    for (const url of ["/solar-atlas", "/solar-atlas/bayern"]) {
      test(`${name} ${url}: jede Ruhestellung ist bündig mit einer Wertspalte`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(url);
        await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });
        await expect(page.locator(".atlas-tabelle-scroller")).toHaveAttribute("tabindex", "0", { timeout: 15_000 });

        const befund = await page.evaluate(async () => {
          const schlaf = (ms: number) => new Promise((r) => setTimeout(r, ms));
          const sc = document.querySelector(".atlas-tabelle-scroller") as HTMLElement;
          const nameSpalte = sc.querySelector<HTMLElement>(".atlas-fix-spalte--kante")!;
          const koepfe = [...sc.querySelectorAll<HTMLElement>("[data-spaltenkopf]")];
          const max = sc.scrollWidth - sc.clientWidth;

          /**
           * Eine Stellung anfahren und warten, BIS SIE RUHT — nicht eine feste
           * Zahl Millisekunden. Das Einrasten läuft asynchron; unter Last
           * (mehrere Playwright-Arbeiter auf einem Dev-Server) kam eine feste
           * Pause gelegentlich zu früh und maß eine Zwischenstellung, die keine
           * Ruhestellung ist. Gewertet wird erst, wenn sich `scrollLeft` über
           * mehrere Bilder nicht mehr bewegt.
           */
          const anfahrenUndRuhen = async (x: number) => {
            sc.scrollLeft = x;
            let vorher = NaN;
            for (let i = 0; i < 40; i++) {
              await schlaf(25);
              const jetzt = Math.round(sc.scrollLeft * 100) / 100;
              if (jetzt === vorher) return jetzt;
              vorher = jetzt;
            }
            return vorher;
          };

          // Erst die Ruhestellungen einsammeln: durchfahren und notieren, wo die
          // Tabelle nach dem Einrasten wirklich stehen bleibt. Gesetzt wird eine
          // beliebige Stellung — gewertet die, die dabei herauskommt. Schrittweite
          // 8 px: Die Rastpunkte liegen mindestens 72 px auseinander (schmalste
          // Wertspalte plus Rasterlücke), keiner kann übersprungen werden.
          const rast: number[] = [];
          for (let x = 0; x <= max + 6; x += 8) {
            const p = await anfahrenUndRuhen(x);
            if (!rast.includes(p)) rast.push(p);
          }
          rast.sort((a, b) => a - b);

          const funde: { pos: number; versatz: number; spalte: string }[] = [];
          const buendige: string[] = [];
          for (const p of rast) {
            await anfahrenUndRuhen(p);
            // Die Haltekante: rechte Kante der Namensspalte plus ihr deckender
            // Überstand über die Rasterlücke (--atlas-fix-luecke, 11 px).
            const kante = nameSpalte.getBoundingClientRect().right + 11;
            let naechste = { d: Infinity, key: "" };
            for (const k of koepfe) {
              const d = k.getBoundingClientRect().left - kante;
              if (Math.abs(d) < Math.abs(naechste.d)) naechste = { d, key: k.dataset.spaltenkopf ?? "?" };
            }
            const versatz = Math.round(naechste.d * 100) / 100;
            if (Math.abs(versatz) > 0.5) funde.push({ pos: p, versatz, spalte: naechste.key });
            else if (!buendige.includes(naechste.key)) buendige.push(naechste.key);
          }
          sc.scrollLeft = 0;
          return { max, rast, funde, buendige, spalten: koepfe.map((k) => k.dataset.spaltenkopf ?? "?") };
        });

        expect(befund.max, "die Tabelle läuft in diesem Fenster gar nicht über").toBeGreaterThan(40);
        expect(befund.rast.length, `nur ${befund.rast.length} Ruhestellungen: ${befund.rast}`).toBeGreaterThan(1);
        expect(
          befund.funde.slice(0, 6),
          `${befund.funde.length} Ruhestellungen sind nicht bündig (Stellungen: ${befund.rast})`,
        ).toEqual([]);

        // Jede Ruhestellung gehört einer ANDEREN Spalte — zwei Stellungen für
        // dieselbe Spalte hieße, dass eine davon nur zufällig bündig ist.
        expect(befund.buendige.length, `Ruhestellungen ${befund.rast}, bündige Spalten ${befund.buendige}`).toBe(
          befund.rast.length,
        );
        // …und die bündigen Spalten sind die ersten der Reihe nach: Das
        // Einrasten überspringt keine.
        expect(befund.buendige).toEqual(befund.spalten.slice(0, befund.buendige.length));
      });
    }
  }
});

/**
 * DIE BLAUE PLATZIERUNGS-BOX BLEIBT IN IHRER SPALTE UND ÜBERDECKT NICHTS.
 *
 * DER ANLASS (19.08.2026). Sie stand links und rechts fünf Pixel über ihre
 * Spalte hinaus — in die Rasterlücke, die keiner Spalte gehört. Gemessen bei
 * 1280 px mit Platzierung „Pro Kopf": Der „?" der Nachbarspalte (Leistung)
 * endete bei 387,1, die Box begann bei 384 — 3,1 px Überschneidung. Der eigene
 * „?" begann bei 448,2, die Box endete bei 455 — 4,2 px. Dazu ragten die fünf
 * Pixel beim seitlichen Scrollen in den Streifen, den die mitlaufende
 * Namensspalte deckt, und blitzten dort hervor, bevor die Spalte selbst kam.
 *
 * GEPRÜFT WIRD AN RECHTECKEN, nicht am Augenmaß, und für mehrere Platzierungen:
 * eine mittlere Spalte (Nachbar auf beiden Seiten), die erste (kein linker
 * Nachbar) und die letzte (rechts folgt nur noch die Pfeilspur).
 *
 * GEGENPROBE GEFAHREN: mit `left: -5, right: -5` an S.headBox meldet er die
 * Überschneidung mit beiden „?" (3,1 px links, 4,2 px rechts) und den Austritt
 * aus der Spalte.
 */
test.describe("Rangliste: die Platzierungs-Box bleibt in ihrer Spalte", () => {
  for (const [name, viewport] of [
    ["Telefon", { width: 390, height: 820 }],
    ["Desktop", { width: 1280, height: 820 }],
  ] as const) {
    test(`${name}: Box überdeckt weder den eigenen noch den benachbarten „?"`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/solar-atlas");
      await page.waitForSelector(".atlas-tabelle-scroller .atlas-rank-row", { timeout: 60_000 });
      await expect(page.locator(".atlas-tabelle-scroller")).toHaveAttribute("tabindex", "0", { timeout: 15_000 });

      const messen = () =>
        page.evaluate(() => {
          const leer = {
            spalte: "",
            rausLinks: 0,
            rausRechts: 0,
            rausOben: 0,
            rausUnten: 0,
            ueberEigenerFrage: 0,
            ueberNachbarFrage: 0,
            ueberNaechsteFrage: 0,
          };
          const kopf = document.querySelector<HTMLElement>("[data-platziert]");
          if (!kopf) return { ...leer, fehler: "keine Spalte trägt die Platzierungs-Box" };
          const box = [...kopf.children].find(
            (c) => getComputedStyle(c as HTMLElement).position === "absolute",
          ) as HTMLElement | undefined;
          if (!box) return { ...leer, fehler: `Spalte ${kopf.dataset.spaltenkopf} hat keine Box` };

          const koepfe = [...document.querySelectorAll<HTMLElement>("[data-spaltenkopf]")];
          const i = koepfe.indexOf(kopf);
          const frage = (el: HTMLElement | undefined) =>
            el?.querySelector<HTMLElement>('button[aria-label$="Erklärung"]')?.getBoundingClientRect() ?? null;

          const kr = kopf.getBoundingClientRect();
          const br = box.getBoundingClientRect();
          const zeile = kopf.parentElement!.getBoundingClientRect();
          const ueber = (a: DOMRect | null) =>
            a === null ? 0 : Math.round(Math.max(0, Math.min(br.right, a.right) - Math.max(br.left, a.left)) * 100) / 100;

          return {
            fehler: undefined as string | undefined,
            spalte: kopf.dataset.spaltenkopf ?? "?",
            // Wie weit die Box links/rechts über ihre Spalte hinausragt.
            rausLinks: Math.round((kr.left - br.left) * 100) / 100,
            rausRechts: Math.round((br.right - kr.right) * 100) / 100,
            // …und oben/unten über die Kopfzeile.
            rausOben: Math.round((zeile.top - br.top) * 100) / 100,
            rausUnten: Math.round((br.bottom - zeile.bottom) * 100) / 100,
            ueberEigenerFrage: ueber(frage(kopf)),
            ueberNachbarFrage: ueber(frage(koepfe[i - 1])),
            ueberNaechsteFrage: ueber(frage(koepfe[i + 1])),
          };
        });

      // Erste Spalte, mittlere Spalte, vorletzte — links kein Nachbar, beidseitig
      // Nachbarn, und rechts eine Spalte, deren „?" in der letzten Lücke sitzt.
      const platzierungen: [string, string][] = [
        ["Pro Kopf", "perCapita"],
        ["Anlagen", "count"],
        ["Eigenverbrauch", "eigenverbrauch"],
      ];
      for (const [wahl, key] of platzierungen) {
        if (key !== "perCapita") {
          await page.getByRole("button", { name: /Platzierung nach/ }).click();
          await page.getByRole("button", { name: wahl, exact: true }).first().click();
        }
        // Auf den Zustand warten, nicht auf die Uhr: Unter Last hat ein fester
        // Wartewert schon die alte Spalte gemessen.
        await expect(page.locator(`[data-spaltenkopf="${key}"][data-platziert]`)).toHaveCount(1, { timeout: 10_000 });
        const m = await messen();
        expect(m.fehler, `${wahl}: ${m.fehler}`).toBeUndefined();
        expect(m.rausLinks, `${wahl}: Box ragt links aus ihrer Spalte`).toBeLessThanOrEqual(0.5);
        expect(m.rausRechts, `${wahl}: Box ragt rechts aus ihrer Spalte`).toBeLessThanOrEqual(0.5);
        expect(m.rausOben, `${wahl}: Box ragt über die Kopfzeile hinaus`).toBeLessThanOrEqual(0.5);
        expect(m.rausUnten, `${wahl}: Box ragt unter der Kopfzeile hervor`).toBeLessThanOrEqual(0.5);
        expect(m.ueberEigenerFrage, `${wahl}: Box überdeckt ihren eigenen „?"`).toBeLessThanOrEqual(0.5);
        expect(m.ueberNachbarFrage, `${wahl}: Box überdeckt den „?" der Spalte links`).toBeLessThanOrEqual(0.5);
        expect(m.ueberNaechsteFrage, `${wahl}: Box überdeckt den „?" der Spalte rechts`).toBeLessThanOrEqual(0.5);
      }
    });
  }
});

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
