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
  });
}
