import { test, expect, type Page } from "@playwright/test";
import { FLOWS, NOCH_OHNE_FLOWNAV, NOCH_NICHT_BEDIENBAR, SCHRITTE_OHNE_AUSWAHL, MAX_WEGE_JE_FLOW, ALLE_KOMBINATIONEN, uebrigeFragenBeantworten, akkordeonWahlenPruefen, akkordeonFragen, waehle, weiterKlicken } from "./flows";

/**
 * Der Flow-Läufer: klickt jede OPTION jedes Schritts und jeden ZWEIG durch
 * jeden Flow und stellt sicher, dass alle funktionieren. (Nicht mehr jede
 * Kombination — Begründung am Strategiewechsel in `gehe()`.)
 *
 * Er kennt keinen einzelnen Flow. Er erkennt an den geteilten Bausteinen, was
 * ein Schritt ist (`data-flow-option`), wo es weitergeht (`data-flow-next`) und
 * wann ein Weg zu Ende ist (keine Navigation mehr da). Ein neuer Flow, der die
 * Bausteine benutzt, wird damit ohne eine Zeile Testcode mitgeprüft.
 *
 * Geprüft wird je Weg:
 *   1. Der Weiter-Knopf ist gesperrt, solange nichts gewählt ist, und wird
 *      danach frei (die Flow-Konvention selbst).
 *   2. Der Weg erreicht ein Ergebnis — kein Schritt führt ins Leere.
 *   3. Kein Konsolenfehler, keine nicht abgefangene Ausnahme unterwegs.
 *
 * EIN ARBEITER in CI (--workers=1 in package.json). Jeder Flow fährt einen
 * eigenen Browser und baut je Weg die Seite neu auf; auf dem CI-Runner
 * (2 Kerne, auf denen auch der Produktions-Server läuft) lasten schon ZWEI
 * Browser die Maschine so aus, dass React auf den frisch geladenen Seiten
 * nicht mehr rechtzeitig übernimmt. Der Klick geht dann ins Leere, und der
 * Läufer meldet „Option ließ sich nicht wählen" für eine Option, die von Hand
 * einwandfrei funktioniert — am 18.08.2026 fünf Läufe in Folge, jedes Mal
 * eine andere Option, einmal auf einem Commit, der nur CLAUDE.md änderte.
 * (Die frühere Messung „zwei Arbeiter sind sicher" stammte vom
 * Entwicklerrechner — der hat ein Vielfaches der Kerne des Runners.) Das ist
 * eine Grenze der Maschine, kein Fehler der Oberfläche, und sie gehört
 * hierher statt in eine Wiederholungsschleife, die Rot in Grün verwandelt.
 *
 * (Nicht versucht werden sollte „auf Netzruhe warten": Diese Seiten laden
 * Preise und Förderdaten nach, das Warten lief je Seitenaufruf in die
 * Zeitgrenze und verdoppelte den Lauf auf über 20 Minuten.)
 *
 * Warum das nötig war: Beim Bau des Förder-Checks steckten zwei Fehler in
 * genau diesen Zwischenzuständen — ein Schritt, dessen Weiter-Knopf trotz
 * sichtbarem Wert gesperrt blieb, und eine Auswahl, die ein Programm falsch
 * ausschloss. Beide waren nur durch Durchklicken zu finden, und niemand kann
 * jeden Weg jedes Flows von Hand gehen.
 */

/** Platzhalter im Pfad für einen Schritt, der keine Auswahl hat (Eingabefeld
 *  mit Vorbelegung) — beim Nachstellen wird dort nur Weiter geklickt. */
const VORBELEGT = "(Vorbelegung übernommen)";

interface LaufErgebnis {
  wege: number;
  gedeckelt: boolean;
  fehler: string[];
  /** Bereits fotografierte Zustände — je Zustand genau ein Bild, nicht je Weg. */
  bilder: Set<string>;
  /** Schritte (Signatur aus Tiefe + Optionsliste), deren Optionen schon alle
   *  durchgespielt wurden — bei erneutem Erreichen genügt die erste Option. */
  erschoepfteSchritte: Set<string>;
  /** Schritte, deren Akkordeon-Fragen schon durchgeklickt wurden. Einmal je
   *  Schritt genügt: „hält die Antwort" hängt am Bauteil, nicht am Weg dorthin
   *  — und je Weg zu prüfen würde den Lauf vervielfachen. */
  akkordeonsGeprueft: Set<string>;
}

/**
 * Mit `FLOW_BILDER=<verzeichnis>` legt der Lauf von jedem Zustand ein Bild ab.
 *
 * Anlass (Betreiber, 13.08.2026): „ich kann unmöglich alles permanent
 * durchklicken." Der Läufer klickt ohnehin jeden Zustand an — die Bilder
 * fallen dabei ab. Damit lässt sich das Aussehen nach einer Änderung
 * durchblättern, statt es zu erklicken. Ohne die Variable kostet es nichts.
 */
const BILDER_ORDNER = process.env.FLOW_BILDER;

async function bildAblegen(page: Page, flowName: string, zustand: string, erg: LaufErgebnis) {
  if (!BILDER_ORDNER || erg.bilder.has(zustand)) return;
  erg.bilder.add(zustand);
  const datei = `${flowName}--${zustand || "start"}`.replace(/[^a-zA-Z0-9äöüÄÖÜß-]+/g, "_").slice(0, 120);
  await page.screenshot({ path: `${BILDER_ORDNER}/${datei}.png`, fullPage: false });
}

/**
 * Beschriftungen der wählbaren Optionen im aktuellen Schritt.
 *
 * Gelesen aus dem Attribut, NICHT aus dem sichtbaren Text: Viele Karten führen
 * ein Emoji als erste Zeile, und der Läufer hätte damit „☀️" als Bezeichnung
 * einer Option geführt — nicht wiederfindbar und in Fehlermeldungen wertlos.
 */
async function optionen(page: Page): Promise<string[]> {
  return page.locator("[data-flow-option]:visible").evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-flow-option") || ""),
  );
}


/**
 * Auswahlfelder eines Schritts belegen (z. B. Monat und Jahr der
 * Inbetriebnahme).
 *
 * Bewusste Grenze: EINE gültige Belegung, nicht jede Kombination. 12 Monate ×
 * 25 Jahre wären 300 Wege je Schritt, die am Verhalten des Flows nichts
 * unterscheiden — was die Werte inhaltlich ergeben, prüfen die Rechen-Tests.
 */
async function fuelleFelder(page: Page): Promise<number> {
  const felder = page.locator("select:visible");
  const anzahl = await felder.count();
  for (let i = 0; i < anzahl; i++) {
    const feld = felder.nth(i);
    const werte = await feld
      .locator("option:not([disabled])")
      .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter((x) => x !== ""));
    if (werte.length > 0) await feld.selectOption(werte[werte.length - 1]);
  }
  if (anzahl > 0) await page.waitForTimeout(120);
  return anzahl;
}

async function imFlow(page: Page): Promise<boolean> {
  return (await page.locator("[data-flow-nav]:visible").count()) > 0;
}

/**
 * Geht rekursiv jeden Weg ab dem aktuellen Zustand. `pfad` dient nur der
 * Fehlermeldung — sie muss sagen, WELCHER Weg gebrochen ist, sonst ist ein
 * roter Lauf über hunderte Wege nicht auswertbar.
 */
/**
 * Seite laden und den Flow bereitstellen. Flows, die erst in einem Fenster
 * öffnen, brauchen dafür einen Klick — jeder Weg beginnt neu von vorn, also
 * gehört das Öffnen an dieselbe Stelle wie das Laden.
 */
async function oeffne(page: Page, flowPfad: string, startKnopf?: string) {
  await page.goto(flowPfad, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load");
  if (!startKnopf) {
    // Warten, bis der Flow SELBST meldet, dass er auf Klicks reagiert.
    //
    // WARUM NICHT EINFACH EIN LADEEREIGNIS (18.08.2026): Der Läufer klickte in
    // Seiten, deren HTML dastand, deren React-Handler aber fehlten — Knopf
    // sichtbar, anklickbar, ohne Wirkung, Fehlerbild „20 s lang kein
    // aria-pressed=true". Das Bild WANDERTE zwischen den Rechnern (erst PV und
    // Wärmepumpe, nach dem ersten Anlauf Klimaanlage und Empfehlung), weil es
    // kein Fehler einer Seite ist, sondern ein Wettrennen.
    //
    // `domcontentloaded` steht vor dem JavaScript, und auch nach `load` lädt
    // Next.js Teile nach — es gibt kein Browser-Ereignis für „React hat
    // übernommen". Deshalb setzt FlowNav `data-flow-bereit` in einem Effekt:
    // Das läuft frühestens nach dem Mounten und ist damit ein Beweis statt einer
    // Schätzung. Flows MIT Startknopf brauchen es nicht — deren Klick-Schleife
    // unten wartet ohnehin, bis die Schrittleiste erscheint.
    await expect(page.locator("[data-flow-bereit]").first()).toBeAttached({ timeout: 30_000 });
    return;
  }
  const knopf = page.getByRole("button", { name: new RegExp(startKnopf, "i") }).first();
  await expect(knopf).toBeVisible({ timeout: 15_000 });
  await expect(async () => {
    await knopf.click();
    await expect(page.locator("[data-flow-nav]").first()).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 20_000 });
}

async function gehe(
  page: Page,
  flowName: string,
  flowPfad: string,
  startKnopf: string | undefined,
  ergebnisEnthaelt: string,
  pfad: string[],
  erg: LaufErgebnis,
): Promise<void> {
  if (erg.wege >= MAX_WEGE_JE_FLOW) {
    erg.gedeckelt = true;
    return;
  }

  const wahlen = await optionen(page);

  // Kein Schritt mehr: Der Weg muss in einem Ergebnis angekommen sein.
  if (!(await imFlow(page))) {
    erg.wege++;
    await bildAblegen(page, flowName, `ergebnis__${pfad.join("__")}`, erg);
    const text = await page.locator("body").innerText();
    if (!text.includes(ergebnisEnthaelt)) {
      erg.fehler.push(`[${pfad.join(" → ")}] endet ohne Ergebnis (erwartet: "${ergebnisEnthaelt}")`);
    }
    return;
  }

  if (wahlen.length === 0) {
    // Ein Schritt kann seine ganze Auswahl in Akkordeon-Fragen tragen — der
    // Dach-Schritt des PV-Rechners besteht aus nichts anderem. Er ist damit
    // KEIN Schritt ohne Auswahl, und er wird hier auch geprüft: Ohne diesen
    // Zweig lief die Akkordeon-Prüfung nur dort, wo daneben eine Auswahlkarte
    // stand — der Dach-Schritt wäre also weiter ungeprüft geblieben, obwohl
    // seine Fragen inzwischen gekennzeichnet sind. Gefunden von der Meldung
    // unten, die ihn zuerst als „ohne Auswahl" anzeigte.
    const akkordeons = await akkordeonFragen(page);
    if (akkordeons.length > 0) {
      const akkSignatur = `${pfad.length}:${akkordeons.join("¦")}`;
      if (!erg.akkordeonsGeprueft.has(akkSignatur)) {
        erg.akkordeonsGeprueft.add(akkSignatur);
        for (const f of await akkordeonWahlenPruefen(page)) {
          erg.fehler.push(`[${pfad.join(" → ") || "Start"}] ${f}`);
        }
      }
      await uebrigeFragenBeantworten(page);
      await weiterKlicken(page);
      await gehe(page, flowName, flowPfad, startKnopf, ergebnisEnthaelt, [...pfad, VORBELEGT], erg);
      return;
    }

    // Ein Schritt, in dem der Läufer nichts anzuklicken findet, ist ab jetzt
    // erklärungspflichtig — siehe SCHRITTE_OHNE_AUSWAHL. Ohne diese Anmeldung
    // ist „hier gibt es nur ein vorbelegtes Feld" von „hier fehlt die
    // Kennzeichnung" nicht zu unterscheiden, und die zweite Lesart hat den
    // Großverbraucher-Schritt monatelang aus der Prüfung gehalten.
    const angemeldet = SCHRITTE_OHNE_AUSWAHL.some(s => s.flow === flowName && s.tiefe === pfad.length);
    if (!angemeldet) {
      erg.fehler.push(
        `[${pfad.join(" → ") || "Start"}] Schritt ohne anklickbare Auswahl. Entweder fehlt den ` +
          `Bedienelementen die Kennzeichnung (data-flow-option / data-flow-wahl) — dann prüft hier ` +
          `niemand etwas —, oder der Schritt hat wirklich keine und gehört mit Grund in ` +
          `SCHRITTE_OHNE_AUSWAHL (e2e/flows.ts).`,
      );
    }
    // Schritte ohne Auswahlkarten gibt es wirklich — etwa eine Datums- oder
    // Größenangabe mit sinnvoller Vorbelegung. Sie sind gültig, solange der
    // Weiter-Knopf offen ist: Genau so geht ein Besucher hindurch, der die
    // Vorbelegung übernimmt. Bleibt er gesperrt, kommt hier niemand weiter —
    // das ist dann ein echter Befund und keine Lücke des Automatismus.
    await fuelleFelder(page);
    // Die Freigabe darf einen React-Commit nach der Eingabe kommen — ein
    // Befund ist erst, wenn Weiter DAUERHAFT gesperrt bleibt.
    const weiterHier = page.locator("[data-flow-next]:visible").first();
    const bleibtGesperrtOhneWahl = await expect(weiterHier)
      .not.toHaveAttribute("aria-disabled", "true", { timeout: 3_000 })
      .then(() => false)
      .catch(() => true);
    if (bleibtGesperrtOhneWahl) {
      erg.fehler.push(
        `[${pfad.join(" → ")}] Schritt ohne Auswahl UND mit gesperrtem Weiter — hier kommt niemand durch`,
      );
      erg.wege++;
      return;
    }
    await weiterKlicken(page);
    await gehe(page, flowName, flowPfad, startKnopf, ergebnisEnthaelt, [...pfad, VORBELEGT], erg);
    return;
  }

  const weiter = page.locator("[data-flow-next]:visible").first();

  // Die Flow-Konvention selbst: ohne Auswahl kein Weitergehen.
  if (pfad.length === 0 || wahlen.length > 0) {
    const gesperrt = await weiter.getAttribute("aria-disabled");
    if (gesperrt !== "true") {
      const schonGewaehlt = await page.locator('[data-flow-option][aria-pressed="true"]:visible').count();
      if (schonGewaehlt === 0) {
        erg.fehler.push(`[${pfad.join(" → ")}] Weiter ist frei, obwohl nichts gewählt ist`);
      }
    }
  }

  // Jede OPTION einmal, nicht jede KOMBINATION (Strategiewechsel 18.08.2026).
  //
  // Vorher ging der Läufer jede Kombination — beim PV-Rechner 192 Wege, bei der
  // Wärmepumpe ~1600. Das hatte zwei gemessene Folgen: Auf dem CI-Runner
  // (2 Kerne, dazu der Produktions-Server) liefen ~600 Seitenaufbauten in
  // 28 Minuten, die Maschine war gesättigt, React übernahm frisch geladene
  // Seiten teils >20 s nicht mehr — „Option ließ sich nicht wählen" für
  // Optionen, die von Hand einwandfrei funktionieren, in jedem Lauf eine
  // andere. Und der Deckel (MAX_WEGE_JE_FLOW) schnitt per Tiefensuche ganze
  // Äste ab: Bei der Wärmepumpe wurde die zweite Option des ERSTEN Schritts
  // nie erreicht, weil der erste Teilbaum den Deckel allein verbrauchte.
  //
  // Jetzt: Ein Schritt, dessen Optionen schon einmal alle durchgespielt
  // wurden, wird bei jedem weiteren Erreichen nur noch mit seiner ersten
  // Option durchlaufen. Ein Schritt mit ANDEREN Optionen (etwa der
  // Gebäude-Schritt, der nur hinter „Wärmepumpe an" auftaucht) ist eine neue
  // Signatur und wird voll erkundet. Damit ist garantiert: jede Option jedes
  // erreichbaren Schritts mindestens einmal, jeder Zweig einmal — was die
  // Kombinationen inhaltlich ergeben, prüfen die Rechen-Tests.
  // Im nächtlichen Alle-Kombinationen-Lauf (FLOW_ALLE_KOMBINATIONEN=1) ist die
  // Abkürzung abgeschaltet — dort wird wirklich jede Kombination gegangen.
  const signatur = `${pfad.length}:${wahlen.join("¦")}`;
  const schonErschoepft = !ALLE_KOMBINATIONEN && erg.erschoepfteSchritte.has(signatur);
  erg.erschoepfteSchritte.add(signatur);
  const zuGehen = schonErschoepft ? wahlen.slice(0, 1) : wahlen;

  for (const wahl of zuGehen) {
    if (erg.wege >= MAX_WEGE_JE_FLOW) {
      erg.gedeckelt = true;
      return;
    }

    // Jeder Weg beginnt neu von vorn: Zurück-Knöpfe stellen den Zustand nicht
    // zuverlässig wieder her, und ein Läufer, der auf halb aufgeräumten
    // Zuständen weiterläuft, prüft etwas, das kein Nutzer je sieht.
    await oeffne(page, flowPfad, startKnopf);
    for (const vorher of pfad) {
      if (vorher === VORBELEGT) await fuelleFelder(page);
      else {
        await waehle(page, vorher);
        await uebrigeFragenBeantworten(page);
      }
      await weiterKlicken(page);
    }

    await waehle(page, wahl);

    // Akkordeon-Fragen dieses Schritts: jede Wahl einmal, mit dem Nachweis,
    // dass sie stehen bleibt. VOR dem Beantworten der übrigen Fragen, weil die
    // Prüfung selbst durchklickt und dabei alles beantwortet zurücklässt.
    //
    // Der Merker hängt an den SICHTBAREN FRAGEN, nicht am Schritt und nicht am
    // Weg — BLOCKER. Erst die gewählte Option entscheidet, welche Fragen der
    // Schritt zeigt: Die vier Gebäudefragen erscheinen nur hinter „Wärmepumpe:
    // Ja". Ein Merker auf den Schritt hakt ihn bei der ERSTEN Option ab
    // („Wärmepumpe: Nein", wo es nichts zu sehen gibt) und hätte den ganzen
    // Zweig nie geprüft — wieder ein grüner Lauf über eine Fläche, die niemand
    // angesehen hat. Ein Merker auf die Option wäre das andere Extrem: Er
    // wiederholt dieselbe Prüfung für jede der neun Optionen des Schritts und
    // trieb den Lauf über die Zeitgrenze — ein abgebrochener Lauf fällt gar
    // kein Urteil. Die Frageliste trifft genau das Neue: einmal je Zusammen-
    // stellung, egal auf welchem Weg man sie erreicht.
    const sichtbareFragen = await akkordeonFragen(page);
    const akkSignatur = `${pfad.length}:${sichtbareFragen.join("¦")}`;
    if (sichtbareFragen.length > 0 && !erg.akkordeonsGeprueft.has(akkSignatur)) {
      erg.akkordeonsGeprueft.add(akkSignatur);
      for (const f of await akkordeonWahlenPruefen(page)) {
        erg.fehler.push(`[${[...pfad, wahl].join(" → ")}] ${f}`);
      }
    }
    await uebrigeFragenBeantworten(page);

    // Dieselbe Toleranz wie oben: Die Freigabe darf einen React-Commit nach
    // dem aria-pressed der Option kommen — unter Last wurde hier sonst ein
    // „Weiter bleibt gesperrt" gemeldet, das keines war.
    const weiterJetzt = page.locator("[data-flow-next]:visible").first();
    const bleibtGesperrt = await expect(weiterJetzt)
      .not.toHaveAttribute("aria-disabled", "true", { timeout: 3_000 })
      .then(() => false)
      .catch(() => true);
    if (bleibtGesperrt) {
      erg.fehler.push(
        `[${[...pfad, wahl].join(" → ")}] Weiter bleibt gesperrt, obwohl "${wahl}" gewählt und jede ` +
          `weitere Frage des Schritts beantwortet ist`,
      );
      erg.wege++;
      continue;
    }

    await weiterKlicken(page);
    await bildAblegen(page, flowName, [...pfad, wahl].join("__"), erg);
    await gehe(page, flowName, flowPfad, startKnopf, ergebnisEnthaelt, [...pfad, wahl], erg);
  }
}

for (const flow of FLOWS) {
  test(`Flow „${flow.name}": jede Option führt zu einem Ergebnis`, async ({ page }) => {
    // Durchklicken braucht Zeit: Jeder Weg wird von vorn aufgebaut, und im
    // Dev-Server kommt die erste Übersetzung jeder Route dazu. Der Standard
    // von 30 s reicht dafür nicht — er hat den Läufer beim ersten Lauf mitten
    // im Baum abgebrochen. Die 10 Minuten sind seit dem Strategiewechsel
    // (jede Option statt jeder Kombination) bewusst großzügig: Ein Limit ohne
    // Luft fällt an dem Tag, an dem der Runner langsam ist, nicht an dem Tag,
    // an dem etwas kaputtgeht.
    //
    // Der nächtliche Alle-Kombinationen-Lauf braucht ein Vielfaches: Die
    // Wärmepumpe allein hat ~1600 Kombinationen à ~3 s Seitenaufbau.
    test.setTimeout(ALLE_KOMBINATIONEN ? 10_800_000 : 600_000);
    const konsolenFehler: string[] = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      // Eng gefasste Ausnahme: Next lädt verlinkte Seiten im Voraus. Im
      // Testbuild antwortet die Login-Route darauf nicht, was je Seitenaufruf
      // eine Fehlermeldung erzeugt — bei 72 Wegen über 200 Stück, alle über
      // dieselbe Route und ohne Bezug zum Flow. Die Liste bewusst nicht
      // weiter aufmachen: Ein großzügiger Filter macht die Prüfung wertlos,
      // ohne dass es auffällt.
      if (m.text().includes("Failed to fetch RSC payload")) return;
      // Ebenso das Besucherzähl-Skript: Es wird erst auf Vercel ausgeliefert,
      // lokal antwortet die Adresse mit 404. Betrifft keine Seitenfunktion.
      if (m.text().includes("_vercel/insights")) return;
      if (m.text().includes("Failed to load resource") && m.location().url.includes("_vercel/")) return;
      konsolenFehler.push(m.text());
    });
    page.on("pageerror", (e) => konsolenFehler.push(`Ausnahme: ${e.message}`));

    // Über oeffne(), NICHT über ein nacktes goto: Flows, die erst in einem
    // Fenster starten, brauchen dafür einen Klick. Ohne ihn stand hier eine
    // Seite ohne jede Navigation, und der Lauf scheiterte an der Vorprüfung —
    // mit einer Meldung („nicht sichtbar"), die nach einem kaputten Flow aussah,
    // obwohl nur der Startknopf ungedrückt blieb. Genau so lag der Förder-Check
    // rot, seit er ins Fenster gezogen ist.
    await oeffne(page, flow.pfad, flow.startKnopf);
    // Flows liegen teils weiter unten auf der Seite — erst prüfen, ob es hier
    // überhaupt einen gibt, sonst schlägt der Test aus dem falschen Grund fehl.
    await expect(page.locator("[data-flow-nav]").first()).toBeVisible({ timeout: 15000 });

    const erg: LaufErgebnis = {
      wege: 0,
      gedeckelt: false,
      fehler: [],
      bilder: new Set(),
      erschoepfteSchritte: new Set(),
      akkordeonsGeprueft: new Set(),
    };
    await bildAblegen(page, flow.name, "01-start", erg);
    await gehe(page, flow.name, flow.pfad, flow.startKnopf, flow.ergebnisEnthaelt, [], erg);

    // Deckel laut wird gemeldet, nicht still hingenommen.
    if (erg.gedeckelt) {
      console.warn(
        `⚠ ${flow.name}: Deckel von ${MAX_WEGE_JE_FLOW} Wegen erreicht — NICHT alle Wege geprüft.`,
      );
    }
    console.log(`  ${flow.name}: ${erg.wege} Wege geprüft`);

    expect(erg.wege, `${flow.name}: kein einziger Weg durchlaufen`).toBeGreaterThan(0);
    expect(erg.fehler, `Gebrochene Wege in „${flow.name}"`).toEqual([]);
    expect(konsolenFehler, `Konsolenfehler in „${flow.name}"`).toEqual([]);
  });
}

test("noch nicht bedienbare Flows sind benannt, nicht verschwiegen", async () => {
  for (const f of NOCH_NICHT_BEDIENBAR) {
    console.warn(`⚠ ${f.name} wird NICHT geprüft: ${f.grund}`);
    expect(f.grund.length, `${f.name}: ohne Begründung ausgetragen`).toBeGreaterThan(40);
  }
});

test("ungeprüfte Flows stehen als ungeprüft da", async ({ page }) => {
  // Sobald ein alter Flow auf den gemeinsamen Navigations-Baustein migriert
  // ist, wird er prüfbar — und muss dann auch geprüft werden. Dieser Test
  // schlägt an, sobald das passiert, damit die Migration nicht dazu führt,
  // dass ein Flow zwar prüfbar wäre, aber niemand ihn in die Liste holt.
  test.setTimeout(120_000);
  const uebersehen: string[] = [];
  const nichtErreichbar: string[] = [];
  for (const f of NOCH_OHNE_FLOWNAV) {
    try {
      await page.goto(f.pfad, { waitUntil: "domcontentloaded", timeout: 20_000 });
    } catch {
      // Eine Seite, die nicht lädt, ist ein Befund des Rundgangs, nicht dieses
      // Tests — hier würde sie nur verschleiern, worum es geht.
      nichtErreichbar.push(f.name);
      continue;
    }
    if ((await page.locator("[data-flow-nav]").count()) > 0) {
      uebersehen.push(`${f.name} (${f.pfad})`);
    }
  }
  if (nichtErreichbar.length > 0) {
    console.warn(`⚠ nicht geladen, daher hier nicht bewertet: ${nichtErreichbar.join(", ")}`);
  }
  expect(
    uebersehen,
    "Diese Flows nutzen den gemeinsamen Baustein inzwischen und gehören in FLOWS " +
      "(e2e/flows.ts), statt weiter als ungeprüft geführt zu werden",
  ).toEqual([]);
});
