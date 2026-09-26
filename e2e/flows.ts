import { expect, type Page } from "@playwright/test";

/**
 * Die Flows, die der Flow-Läufer (flows.spec.ts) erschöpfend durchklickt.
 *
 * Anlass (Betreiber, 13.08.2026): „ich kann unmöglich alle flows einzeln
 * prüfen. können wir dafür einen automatismus einrichten der alle wege
 * durchklickt und sicherstellt dass alle funktionieren?"
 *
 * Zu pflegen ist hier **eine Zeile je Flow** — die Adresse. Alles andere
 * erkennt der Läufer an den Bausteinen: `data-flow-option` (OptionCard) und
 * `data-flow-nav` / `data-flow-next` (FlowNav). Ein Flow, der diese Bausteine
 * nutzt, wird ohne weiteres Zutun vollständig geprüft.
 */

export interface FlowUnterTest {
  name: string;
  pfad: string;
  /** Text, der im Ergebnis stehen muss — beweist, dass der Weg wirklich ankommt
   *  und nicht nur die Knöpfe verschwinden. */
  ergebnisEnthaelt: string;
  /** Beschriftung des Knopfes, der den Flow erst öffnet (Flows im Fenster).
   *  Ohne Angabe steht der Flow direkt auf der Seite. */
  startKnopf?: string;
}

export const FLOWS: FlowUnterTest[] = [
  {
    name: "Förder-Check Frankfurt",
    pfad: "/photovoltaik-foerderung/hessen/frankfurt",
    ergebnisEnthaelt: "Das gilt für dich",
    // Der Check steht nicht offen auf der Seite, sondern startet im Fenster
    // (components/FoerderCheckStarter.tsx). Ohne diesen Knopf findet der Läufer
    // gar keine Navigation und bricht ab, bevor er den ersten Schritt sieht.
    startKnopf: "Förder-Check starten",
  },
  {
    name: "PV-Rechner",
    // Die nackte Adresse zeigt seit 21.09.2026 den Empfehlungsweg (Eintrag
    // darunter); die Direkteingabe erreicht man über ?direkt=1.
    pfad: "/photovoltaik-rechner?direkt=1",
    ergebnisEnthaelt: "amortisiert sich in",
  },
  {
    name: "PV-Bedarf / Empfehlung",
    pfad: "/photovoltaik-rechner",
    ergebnisEnthaelt: "Die Empfehlung basiert auf",
  },
  {
    name: "Wärmepumpen-Rechner",
    pfad: "/waermepumpe-rechner",
    ergebnisEnthaelt: "Dein Heizkostenvergleich.",
  },
  {
    name: "Klimaanlagen-Rechner",
    pfad: "/klimaanlage-stromkosten",
    ergebnisEnthaelt: "Deine Klimaanlage im Betrieb",
  },
  {
    name: "Balkonkraftwerk-Rechner",
    pfad: "/balkonkraftwerk/rechner",
    ergebnisEnthaelt: "Deine Empfehlung",
  },
  {
    name: "Einspeisevergütungs-Rechner",
    pfad: "/einspeiseverguetung-rechner",
    ergebnisEnthaelt: "Dein Vergütungssatz",
  },
];

/**
 * Flows, die der Automatismus zwar erkennt, aber noch nicht zu Ende bedienen
 * kann — mit dem Grund und dem, was dafür fehlt.
 *
 * Bewusst hier statt stillschweigend ausgelassen: Ein Flow, der nicht geprüft
 * wird, soll als ungeprüft dastehen.
 *
 * Derzeit leer: Der letzte Eintrag (Einspeisevergütung, Schritt „Wer verbraucht
 * den Strom?“) ist seit dem 17.08.2026 bedienbar — seine Auswahl-Chips tragen
 * dieselbe Kennzeichnung wie eine Auswahlkarte. Wer einen Flow baut, den der
 * Läufer nicht zu Ende klicken kann, trägt ihn hier mit Begründung ein, statt
 * ihn zu verschweigen.
 */
export const NOCH_NICHT_BEDIENBAR: { name: string; pfad: string; grund: string }[] = [];

/**
 * Flows, die den gemeinsamen Navigations-Baustein noch NICHT nutzen und
 * deshalb vom Läufer nicht erfasst werden.
 *
 * Bewusst als sichtbare Liste, nicht als Schweigen: Ein ungeprüfter Flow soll
 * als ungeprüft dastehen. Der Läufer schlägt an, sobald einer davon auf
 * `FlowNav` migriert ist — dann gehört er nach oben und hier heraus.
 *
 * Leer seit dem 17.08.2026: Die fünf Rechner (PV, Bedarf, Wärmepumpe, Klima,
 * Balkon) nutzen den gemeinsamen Baustein und stehen oben in FLOWS. Die Liste
 * bleibt als Ort für den nächsten Flow bestehen, der ohne ihn gebaut wird.
 */
export const NOCH_OHNE_FLOWNAV: { name: string; pfad: string }[] = [];

/**
 * Schritte, in denen der Läufer NICHTS anzuklicken findet — angemeldet, mit
 * Grund.
 *
 * Das ist die Bremse gegen den nächsten blinden Fleck. Bis zum 22.08.2026 nahm
 * der Läufer einen solchen Schritt stillschweigend hin („Vorbelegung
 * übernommen") und ging weiter. Genau da fiel der Großverbraucher-Schritt
 * hinein: Seine Ein/Aus-Schalter trugen keine Kennzeichnung, der Läufer sah
 * keine Auswahl, klickte nur Weiter — und hat die Wärmepumpe nie eingeschaltet.
 * Der Lauf meldete trotzdem „jede Option jedes Schritts geprüft".
 *
 * Ein Schritt ohne Auswahl ist also entweder eine BEHAUPTUNG (hier steht
 * wirklich nur ein vorbelegtes Eingabefeld) — dann gehört er hierher — oder
 * eine fehlende Kennzeichnung. Beides sieht im Browser gleich aus, und nur die
 * Anmeldung unterscheidet sie.
 */
export const SCHRITTE_OHNE_AUSWAHL: { flow: string; tiefe: number; grund: string }[] = [
  {
    flow: "Einspeisevergütungs-Rechner",
    tiefe: 1,
    grund:
      "Monat und Jahr der Inbetriebnahme stehen als Auswahlfelder da, nicht als Knopfreihe — " +
      "12 × 25 Kombinationen wären als Wege sinnlos, der Läufer belegt sie einmal gültig.",
  },
];

/**
 * Zwei Betriebsarten (Vorgabe des Betreibers, 18.08.2026: möglichst alle
 * Kombinationen testen, bevor ein Nutzer sie trifft):
 *
 *   Standard (jeder Push)         — jede OPTION jedes Schritts und jeder
 *     Zweig, nicht jede Kombination. Schnell und auf dem CI-Runner stabil.
 *   FLOW_ALLE_KOMBINATIONEN=1     — wirklich jede Kombination, ohne die
 *     Erschöpft-Abkürzung. Läuft nächtlich (flows-nightly.yml), und dort seit
 *     dem 07.09.2026 mit einem eigenen JOB je Flow: 3.462 Wege über sieben
 *     Flows, der längste davon der PV-Rechner mit 1.728 Wegen in 174 bis 182
 *     Minuten. Wer hier eine Bedienfamilie ergänzt, vervielfacht diese Zahl —
 *     der Gesundheitscheck warnt deshalb, sobald weniger als ein Viertel der
 *     Zeit frei bleibt. Die frühere Angabe „3.440 Wege in 4 h 20 bei 5 Stunden
 *     erlaubter Zeit" stammte aus der Zeit des EINEN gemeinsamen Jobs und
 *     beschreibt keinen Lauf mehr, den es gibt.
 */
export const ALLE_KOMBINATIONEN = !!process.env.FLOW_ALLE_KOMBINATIONEN;

/**
 * Notbremse gegen einen entlaufenen Läufer. Wird sie erreicht, MELDET er das —
 * eine stille Kürzung würde „geprüft" behaupten, ohne es zu tun.
 *
 * Seit dem 18.08.2026 geht der Läufer im Standard-Modus jede OPTION jedes
 * Schritts und jeden Zweig, nicht mehr jede Kombination (Strategiewechsel,
 * begründet in flows.spec.ts an `gehe()`). Damit liegen alle Flows deutlich
 * unter diesem Deckel — er ist kein Abdeckungs-Kompromiss mehr, sondern fängt
 * nur noch den Fall, dass ein künftiger Flow den Läufer in einen Zyklus
 * schickt (etwa ein Schritt, der bei jedem Erreichen andere
 * Optionsbeschriftungen trägt und darum nie als erschöpft erkannt wird).
 *
 * Vorher war er ein echter Abdeckungs-Deckel — und ein irreführender: Die
 * Tiefensuche verbrauchte ihn komplett im ersten Teilbaum, bei der Wärmepumpe
 * (~1600 Kombinationen) wurde so nicht einmal die zweite Option des ERSTEN
 * Schritts je erreicht, während der Lauf „150 Wege geprüft" meldete.
 *
 * Im Alle-Kombinationen-Modus muss er über dem tiefsten Flow liegen
 * (Wärmepumpe ~1600 Kombinationen) — auch dort gilt: erreicht er den Deckel,
 * wird das gemeldet, nicht verschwiegen.
 */
export const MAX_WEGE_JE_FLOW = ALLE_KOMBINATIONEN ? 2500 : 150;

/**
 * Das Zeitlimit EINES Flow-Tests — und die innerste von drei Grenzen.
 *
 * WARUM ES HIER STEHT UND NICHT IM LÄUFER (gemessen 24.09.2026): Der
 * nächtliche Lauf war vom 21. bis 23.09.2026 drei Nächte rot, jedes Mal im
 * PV-Rechner, jedes Mal an einer ANDEREN Stelle des Baums und keine davon
 * nachstellbar. Der Grund war keine dieser Stellen: Der Fehler wurde in allen
 * drei Nächten exakt 3 h 0 m nach dem Start des Tests geworfen (10:57:05 auf
 * 07:57:02, 10:54:40 auf 07:54:39, 11:10:00 auf 08:09:58) — das ist dieses
 * Limit, nicht der Rechner. Läuft es ab, bricht Playwright die gerade
 * laufende Wiederhol-Schleife ab; `weiterKlicken` und `waehle` fangen das in
 * ihrem `catch` und werfen ihre eigene Meldung. Aus einem Zeitablauf wird so
 * ein „Weiter kam nicht durch", das auf einen Produktfehler zeigt, den es
 * nicht gibt.
 *
 * DREI GRENZEN, UND DIE INNERSTE WAR DIE ENGSTE — das war der eigentliche
 * Fehler. Die 3 Stunden stammen vom 18.08.2026, als der ganze nächtliche Lauf
 * EIN Test über alle sieben Flows war und die Verteilung noch niemand kannte.
 * Am 07.09.2026 bekam jeder Flow einen eigenen Job, und weil der PV-Rechner
 * dabei mit 174–182 Minuten gemessen wurde, bekam sein SCHRITT 200 Minuten und
 * sein JOB 220. Dieses Limit hier blieb bei 180 — die äußeren Grenzen trugen
 * also 10 % Luft, die innere 0 bis 3 %, und sie greift zuerst. Sechs grüne
 * Nächte lagen bei 174–178 Minuten, drei rote darüber; das ist kein Wachstum,
 * sondern ein Münzwurf.
 *
 * 195 MINUTEN SIND KEIN ANGEHOBENES LIMIT IM SINNE DES WÄCHTER-GATES: Es wird
 * nicht mehr Zeit verbraucht (eine gute Nacht endet weiter nach 175 Minuten),
 * sondern eine Grenze an das Budget angeglichen, das am 07.09. für genau diese
 * Laufzeit bereitgestellt wurde. Gewachsen ist nichts — nachgezählt sind es
 * unverändert 1.728 Wege wie am 16.09.
 *
 * Die Reihenfolge muss bleiben: dieses Limit < Schritt-Limit < Job-Limit.
 * Reißt das Schritt-Limit zuerst, heißt der Ausgang „failure" ohne Hinweis
 * darauf, WO der Läufer stand; reißt das Job-Limit zuerst, heißt er
 * „cancelled" und fällt erst nach drei stummen Nächten auf. Festgenagelt von
 * lib/__tests__/workflow-schritt-zeitlimits.test.ts.
 */
export const FLOW_TEST_ZEITLIMIT_MIN = { alleKombinationen: 195, jedeOption: 10 } as const;

/** Dasselbe in Millisekunden für `test.setTimeout` — je nach Betriebsart. */
export const FLOW_TEST_ZEITLIMIT_MS =
  (ALLE_KOMBINATIONEN ? FLOW_TEST_ZEITLIMIT_MIN.alleKombinationen : FLOW_TEST_ZEITLIMIT_MIN.jedeOption) * 60_000;

/**
 * Der Titel, unter dem ein Flow im Läufer steht — EINE Quelle für den Test
 * selbst UND für die Aufteilung des nächtlichen Laufs auf mehrere Jobs.
 *
 * Der Titel stand bis zum 07.09.2026 nur als Vorlage im Läufer. Das trug,
 * solange ihn niemand sonst brauchte; seit die Nacht je Flow einen eigenen Job
 * startet und ihren Test über `--grep` auswählt, hätte er ein zweites Mal
 * dagestanden — und eine umbenannte Zeile hätte den Job auf NULL Tests laufen
 * lassen. Ein Lauf ohne Tests ist grün, und ein grüner Lauf, der nichts sieht,
 * ist schlimmer als gar keiner (dieselbe Lehre wie bei den Wächtern, die ihre
 * eigene Gegenprobe bestehen müssen).
 */
export function flowTestTitel(name: string): string {
  return `Flow „${name}": jede Option führt zu einem Ergebnis`;
}

/**
 * Derselbe Titel als Ausdruck für `--grep`, mit maskierten Sonderzeichen.
 *
 * Playwright liest `--grep` als regulären Ausdruck. Heute trägt kein Flow-Name
 * ein Sonderzeichen; ein künftiger mit Klammer oder Punkt würde ohne Maskierung
 * entweder zu viel treffen oder gar nichts — und „gar nichts" ist der teure
 * Fall, siehe oben.
 */
export function flowGrep(name: string): string {
  return flowTestTitel(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Woran ein Flow-Test zu erkennen ist. Der nächtliche Sammel-Job nimmt mit
 * `--grep-invert` alles, was das NICHT enthält — damit läuft ein künftiger
 * Buchhaltungs-Test automatisch mit, statt still liegenzubleiben.
 *
 * ABGELEITET, nicht getippt: Es ist genau das Stück, das `flowTestTitel` VOR
 * den Namen setzt. Als eigene Zeichenkette wäre es die letzte verbliebene
 * zweite Fassung des Titels — und beim ersten Umformulieren („Flow" → „Ablauf")
 * schlösse der Sammel-Job nichts mehr aus und liefe den ganzen Bestand doppelt.
 *
 * OHNE ANKER, und das ist kein Versehen: Playwright vergleicht `--grep` nicht
 * mit dem Testtitel, sondern mit dem ganzen Pfad davor — „[flows] ›
 * e2e/flows.spec.ts:358:7 › Flow „…"". Ein `^` traf deshalb NIE, der Sammel-Job
 * hätte alle neun Tests ein zweites Mal gelaufen. Gefunden von `--pruefen` im
 * Matrix-Skript, bevor die Nacht es getan hätte.
 */
const NAMENS_PLATZHALTER = "\u0000";
export const FLOW_TITEL_MARKE = flowTestTitel(NAMENS_PLATZHALTER).split(NAMENS_PLATZHALTER)[0];


// ─── Geteilte Schritte durch einen Flow ──────────────────────────────────────
//
// Diese beiden Helfer lagen bis zum 18.08.2026 in flows.spec.ts und standen
// damit nur dem Flow-Läufer zur Verfügung. Genau das ist schiefgegangen: Als der
// Flow-Umbau die Vorauswahl aus jedem Schritt nahm (Betreiber-Vorgabe — kein
// Schritt startet vorbelegt), klickten die älteren Browser-Tests weiter nur
// „Weiter" und blieben am ausgegrauten Knopf hängen. Drei Tests standen
// daraufhin rot auf main, und die Ursache lag nicht in dem, was sie prüfen.
//
// Wer einen Flow durchklickt, nimmt diese Helfer — nicht eine eigene Kopie.

/**
 * Ein Schritt kann MEHRERE Fragen tragen — im PV-Rechner etwa Personenzahl und
 * Nutzungsprofil nebeneinander. Nach der Wahl in der einen Frage bleibt Weiter
 * dann zu Recht gesperrt, weil die andere noch offen ist.
 *
 * Diese Funktion beantwortet die übrigen Fragen des Schritts mit ihrer jeweils
 * ersten Option. Die Fragen unterscheidet sie an `data-flow-group` (OptionCard);
 * ohne das Attribut gehören alle Optionen zur selben Frage und es passiert
 * nichts.
 *
 * BEWUSSTE GRENZE: Variiert wird nur die Frage, aus der die Hauptwahl kam — die
 * übrigen bekommen immer ihre erste Option. Sonst multiplizieren sich die Wege
 * je Schritt (4 Personen × 4 Profile = 16 statt 8), ohne dass die Kombination am
 * Verhalten des Flows etwas ändert; was die Werte inhaltlich ergeben, prüfen die
 * Rechen-Tests.
 */
export async function uebrigeFragenBeantworten(page: Page) {
  const offene = await page.locator("[data-flow-option]:not([inert] *):visible").evaluateAll((els) => {
    const beantwortet = new Set(
      els.filter((e) => e.getAttribute("aria-pressed") === "true").map((e) => e.getAttribute("data-flow-group") || ""),
    );
    const ersteJeGruppe = new Map<string, string>();
    for (const e of els) {
      const gruppe = e.getAttribute("data-flow-group") || "";
      if (beantwortet.has(gruppe) || ersteJeGruppe.has(gruppe)) continue;
      ersteJeGruppe.set(gruppe, e.getAttribute("data-flow-option") || "");
    }
    return [...ersteJeGruppe.values()];
  });
  for (const label of offene) await waehle(page, label);
  await akkordeonFragenBeantworten(page);
}

// ─── Akkordeon-Fragen (components/AccordionField) ────────────────────────────
//
// Sie sind ein eigener Bedienweg, nicht bloß anders aussehende Auswahlkarten:
// Nach der Wahl klappt die Frage zu einer Zeile ein, die Knöpfe verschwinden.
// Der Läufer kann also nicht am Knopf ablesen, was gewählt ist — er muss die
// Frage wieder AUFKLAPPEN. Genau daraus zieht er hier seinen schärfsten Nachweis
// (`akkordeonWahlenPruefen`): Was ich gewählt habe, muss auch gespeichert sein.
//
// Warum das nötig war (22.08.2026): Diese Fragen trugen gar keine Kennzeichnung
// und waren für den Läufer unsichtbar — Dachform, Ausrichtung, Neigung und alle
// vier Gebäudefragen. Der Lauf meldete trotzdem „jede Option jedes Schritts
// geprüft". Durchgekommen ist damit ein Fehler, bei dem ein Klick auf
// „Flachdach" die Dachform wieder auf „Satteldach" zurückfallen ließ: sichtbar
// im Browser, unsichtbar für jede Prüfung, die wir hatten.

/** Namen der gerade sichtbaren Akkordeon-Fragen — aufgeklappt wie eingeklappt. */
export async function akkordeonFragen(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const sichtbar = (e: Element) => (e as HTMLElement).offsetParent !== null && !e.closest("[inert]");
    const namen: string[] = [];
    for (const e of Array.from(document.querySelectorAll("[data-flow-akkordeon-offen], [data-flow-akkordeon]"))) {
      if (!sichtbar(e)) continue;
      const name = e.getAttribute("data-flow-akkordeon-offen") ?? e.getAttribute("data-flow-akkordeon");
      if (name && !namen.includes(name)) namen.push(name);
    }
    return namen;
  });
}

/** Zustand einer Frage: wie viele Wahlmöglichkeiten, welche ist markiert, wie
 *  heißen sie. Alles in EINEM Durchgriff, damit sich zwischen zwei Abfragen
 *  nichts ändern kann. */
async function akkordeonZustand(page: Page, frage: string) {
  return page.evaluate((f) => {
    const sichtbar = (e: Element) => (e as HTMLElement).offsetParent !== null && !e.closest("[inert]");
    const block = Array.from(document.querySelectorAll("[data-flow-akkordeon-offen]"))
      .filter(sichtbar)
      .find((e) => e.getAttribute("data-flow-akkordeon-offen") === f);
    if (!block) {
      const zeile = Array.from(document.querySelectorAll("[data-flow-akkordeon]"))
        .filter(sichtbar)
        .find((e) => e.getAttribute("data-flow-akkordeon") === f);
      return { offen: false, da: !!zeile, wahlen: [] as string[], gewaehlt: -1 };
    }
    const knoepfe = Array.from(block.querySelectorAll("[data-flow-wahl]")).filter(sichtbar);
    return {
      offen: true,
      da: true,
      wahlen: knoepfe.map((k) => (k as HTMLElement).innerText.trim()),
      gewaehlt: knoepfe.findIndex((k) => k.getAttribute("aria-pressed") === "true"),
    };
  }, frage);
}

/** Frage aufklappen (falls eingeklappt) und warten, bis ihre Knöpfe dastehen. */
export async function akkordeonOeffnen(page: Page, frage: string): Promise<boolean> {
  if ((await akkordeonZustand(page, frage)).offen) return true;
  const zeile = page.locator(`[data-flow-akkordeon="${frage.replace(/"/g, '\\"')}"]:visible`).first();
  if ((await zeile.count()) === 0) return false;
  try {
    await expect(async () => {
      await zeile.click({ timeout: 3_000 });
      expect((await akkordeonZustand(page, frage)).offen).toBe(true);
    }).toPass({ timeout: 10_000 });
  } catch {
    return false;
  }
  return true;
}

/**
 * Eine Wahl innerhalb einer Akkordeon-Frage anklicken — und nachweisen, dass sie
 * gesetzt ist.
 *
 * Der Nachweis kann NICHT am Knopf hängen: Die meisten dieser Fragen klappen
 * nach der Wahl zu, der Knopf ist dann gar nicht mehr da. Es genügt aber auch
 * NICHT, „zugeklappt" als Erfolg zu werten — genau daran ist die erste Fassung
 * gescheitert: Eine Frage, die noch gar nicht AUFgeklappt war, ist ebenfalls
 * „nicht offen", und der Helfer meldete Erfolg, ohne je geklickt zu haben. Die
 * Ausrichtung blieb so ungesetzt, und der Test, der den fehlenden Dachabschlag
 * nachweisen sollte, prüfte in Wahrheit gar nichts (gefunden im Lauf mit
 * Datenbank am 22.08.2026, während er in der Worktree grün war).
 *
 * Deshalb: aufklappen, klicken, und beim Zuklappen wieder aufklappen und
 * nachsehen. Ein Helfer, der stillschweigend „erledigt" sagt, ist derselbe
 * Fehler wie die Prüfung, die er belegen soll.
 *
 * `pruefeWert: false` nur für den Sweep — der prüft den Wert selbst und
 * formuliert daraus seinen Befund („die Antwort hält nicht") statt einer
 * Ausnahme.
 */
export async function akkordeonWaehlen(page: Page, frage: string, index: number, pruefeWert = true) {
  const knopf = page
    .locator(`[data-flow-frage="${frage.replace(/"/g, '\\"')}"][data-flow-wahl="${index}"]:visible`)
    .first();
  try {
    await expect(async () => {
      // Aufgeklappt sein ist Voraussetzung: Ein Klick auf einen Knopf, den es
      // gerade nicht gibt, wäre sonst 20 s Warten ohne Aussage.
      if (!(await akkordeonZustand(page, frage)).offen) await akkordeonOeffnen(page, frage);
      expect((await akkordeonZustand(page, frage)).offen, `Frage „${frage}" ließ sich nicht aufklappen`).toBe(true);
      await knopf.click({ timeout: 3_000 });
      const z = await akkordeonZustand(page, frage);
      if (z.offen) {
        expect(z.gewaehlt).toBe(index);
        return;
      }
      if (!pruefeWert) return;
      // Zugeklappt: Der Wert steht nur beim Wiederaufklappen fest.
      await akkordeonOeffnen(page, frage);
      expect((await akkordeonZustand(page, frage)).gewaehlt).toBe(index);
      // Und wieder zuklappen — sonst bleibt die Frage offen, die nächste
      // erscheint gar nicht, und der Flow steht anders da als nach einer
      // normalen Bedienung. Derselbe Klick, derselbe Wert.
      await knopf.click({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  } catch {
    // Die nackte Meldung von toPass sagt nur „Timeout while waiting on the
    // predicate". Bei einem Läufer über hunderte Wege ist das nicht auswertbar —
    // sie muss sagen, WELCHE Frage in WELCHEM Zustand klemmt.
    const z = await akkordeonZustand(page, frage);
    const alle = await akkordeonFragen(page);
    // Der häufigste Fall ist kein hängender Knopf, sondern eine Frage, die es
    // nicht mehr gibt: Eine Antwort hat den Zustand mitgerissen, an dem die
    // Frage hängt (Wärmepumpe wieder aus → die vier Gebäudefragen weg). Das
    // gehört so gemeldet, sonst sucht jemand den Fehler im Testwerkzeug.
    if (!z.da) {
      throw new Error(
        `Frage „${frage}" ist verschwunden, während sie beantwortet wurde — eine ` +
          `Antwort hat den Zustand mitgenommen, an dem die Frage hängt. ` +
          `Sichtbar sind jetzt: ${alle.join(", ") || "keine Frage mehr"}.`,
      );
    }
    throw new Error(
      `Frage „${frage}": Wahl Nr. ${index} ließ sich nicht setzen. ` +
        `Zustand: ${JSON.stringify(z)}. Sichtbare Fragen: ${alle.join(", ") || "keine"}.`,
    );
  }
}

/**
 * Offene Akkordeon-Fragen mit ihrer ersten Wahl beantworten — die schnelle
 * Variante fürs Nachstellen eines Weges. Wiederholt, weil eine beantwortete
 * Frage die nächste aufklappt (progressive Disclosure).
 */
export async function akkordeonFragenBeantworten(page: Page) {
  for (let runde = 0; runde < 10; runde++) {
    const offeneOhneAntwort = await page.evaluate(() => {
      const sichtbar = (e: Element) => (e as HTMLElement).offsetParent !== null && !e.closest("[inert]");
      for (const block of Array.from(document.querySelectorAll("[data-flow-akkordeon-offen]")).filter(sichtbar)) {
        const knoepfe = Array.from(block.querySelectorAll("[data-flow-wahl]")).filter(sichtbar);
        if (knoepfe.length === 0) continue; // Frage ohne Knopfreihe (reines Eingabefeld)
        if (knoepfe.some((k) => k.getAttribute("aria-pressed") === "true")) continue;
        return block.getAttribute("data-flow-akkordeon-offen");
      }
      return null;
    });
    if (!offeneOhneAntwort) return;
    await akkordeonWaehlen(page, offeneOhneAntwort, 0);
  }
}

/**
 * Jede Wahl jeder Akkordeon-Frage einmal anklicken — und nach jedem Klick
 * nachsehen, ob sie STEHEN GEBLIEBEN ist.
 *
 * Das Aufklappen-und-Nachsehen ist der ganze Punkt und bewusst nicht über den
 * Text der eingeklappten Zeile gelöst: Deren Wortlaut ist nicht immer der der
 * Knopfbeschriftung (das Heizsystem trägt im Knopf ein Kürzel, in der Zeile den
 * ganzen Namen). Ein Textvergleich wäre dort falsch-rot, der Vergleich der
 * Markierung ist es nie.
 *
 * Linear, nicht multiplikativ: jede Wahl einmal, nicht jede Kombination — wie
 * beim Läufer selbst. Was die Werte inhaltlich ergeben, prüfen die Rechen-Tests.
 */
export async function akkordeonWahlenPruefen(page: Page): Promise<string[]> {
  const fehler: string[] = [];
  const erledigt = new Set<string>();
  for (let runde = 0; runde < 12; runde++) {
    const frage = (await akkordeonFragen(page)).find((f) => !erledigt.has(f));
    if (!frage) break;
    erledigt.add(frage);
    if (!(await akkordeonOeffnen(page, frage))) continue;
    // Was hier schiefgeht, ist ein BEFUND über die Seite, kein Absturz des
    // Läufers: gemeldet und weitergegangen. Ein abgebrochener Lauf fällt kein
    // Urteil über die übrigen Fragen — und „abgebrochen" liest sich als „egal".
    try {
      await akkordeonFragePruefen(page, frage, fehler);
    } catch (e) {
      fehler.push((e as Error).message);
    }
  }
  return fehler;
}

async function akkordeonFragePruefen(page: Page, frage: string, fehler: string[]) {
    const anfang = await akkordeonZustand(page, frage);
    // Eine Frage ohne Knopfreihe (nur ein Eingabefeld, etwa die Laufleistung des
    // E-Autos) hat hier nichts zu prüfen — und darf vor allem nicht „mit ihrer
    // ersten Wahl" zurückgelassen werden: Es gibt keine. Genau daran hing der
    // erste Lauf 20 Sekunden an einem Knopf, den es nicht gibt.
    if (anfang.wahlen.length === 0) return;
    for (let i = 0; i < anfang.wahlen.length; i++) {
      if (!(await akkordeonOeffnen(page, frage))) break;
      const vorher = await akkordeonZustand(page, frage);
      // Die Auswahl kann sich unterwegs verkürzen — auf einem aufgeständerten
      // Dach fällt „Nord" weg. Das ist gewollt und kein Befund.
      if (i >= vorher.wahlen.length) break;
      await akkordeonWaehlen(page, frage, i, false);

      // Nicht sofort nachsehen, sondern nachsehen BIS es steht — bewusst
      // wiederholend. Manche dieser Flows halten ihren Zustand in der Adresse,
      // und `router.replace` wirkt erst im nächsten Render; gemessen am
      // Dev-Server dauert das mehrere hundert Millisekunden. Ein Blick direkt
      // nach dem Klick misst gegen den Router und macht den Läufer zufällig rot
      // — genau das tat die erste Fassung, mit einer Meldung, die nach einem
      // echten Fehler aussah. Wo die Antwort WIRKLICH nicht hält, wird sie auch
      // in sechs Sekunden nicht richtig.
      let nachher = await akkordeonZustand(page, frage);
      const haelt = await expect(async () => {
        await akkordeonOeffnen(page, frage);
        nachher = await akkordeonZustand(page, frage);
        expect(nachher.gewaehlt).toBe(i);
      })
        .toPass({ timeout: 6_000 })
        .then(() => true)
        .catch(() => false);
      if (!haelt) {
        fehler.push(
          `Frage „${frage}": „${vorher.wahlen[i]}" gewählt, gespeichert ist ` +
            `${nachher.gewaehlt >= 0 ? `„${nachher.wahlen[nachher.gewaehlt]}"` : "nichts"} — ` +
            `die Antwort hält nicht`,
        );
        break; // Eine Meldung je Frage genügt; alles Weitere ist dieselbe Ursache.
      }
    }
    // Die Frage wieder einklappen und beantwortet zurücklassen, damit der Flow
    // hinterher im selben Zustand ist wie ohne diese Prüfung.
    const ende = await akkordeonZustand(page, frage);
    if (ende.offen && ende.wahlen.length > 0) await akkordeonWaehlen(page, frage, 0);
}

/**
 * Wählt eine Option und wartet, bis sie als gewählt markiert ist.
 *
 * Das Warten ist der Kern: Nach dem Seitenaufruf steht das servergerenderte
 * HTML schon da, die React-Handler aber noch nicht. Ein Klick in diesem Fenster
 * verpufft — der Läufer meldete daraufhin „Weiter bleibt gesperrt, obwohl
 * gewählt ist" für Optionen, die von Hand einwandfrei funktionieren. Ein festes
 * Wartezeit-Pflaster wäre auf langsamen Rechnern wieder brüchig; die Rückmeldung
 * der Oberfläche selbst ist das verlässliche Signal.
 */
/**
 * Klickt Weiter und wartet, bis der Schritt WIRKLICH gewechselt hat.
 *
 * Zwei Arten, wie ein blinder Weiter-Klick verpufft (beide am 18.08.2026 auf
 * ausgelasteten Maschinen gemessen):
 *   - Der Knopf ist noch `aria-disabled` (FlowNav sperrt bewusst so statt mit
 *     `disabled`, damit der Hinweis-Tooltip klickbar bleibt) — der Klick wird
 *     stumm verschluckt. Das passiert, wenn die Freigabe einen React-Commit
 *     später kommt als das aria-pressed der eben gewählten Option.
 *   - Der Klick landet, aber der Läufer prüft nie, ob der Schritt gewechselt
 *     hat, und sucht dann die nächste Option auf dem alten Schritt — die
 *     Fehlermeldung zeigt auf die falsche Stelle.
 *
 * Der Nachweis des Wechsels braucht keine Schritt-Kennung im DOM: Nach der
 * Flow-Konvention startet kein Schritt mit einer Vorauswahl. Der Fingerabdruck
 * aus sichtbaren Optionen UND ihrem Auswahlzustand ändert sich deshalb bei
 * jedem echten Wechsel — selbst wenn zwei Schritte identische Beschriftungen
 * trügen, unterscheidet sie der Auswahlzustand (vorher: eine gewählt, nachher:
 * keine). Verschwindet die Navigation ganz, ist das Ergebnis erreicht — auch
 * ein Wechsel.
 */
/**
 * Der WEG gehört in jede geworfene Meldung — BLOCKER für den Kombinations-Läufer.
 *
 * Der nächtliche Lauf geht für den PV-Rechner rund 1.700 Kombinationen in gut
 * drei Stunden. Gesammelte Befunde (`erg.fehler`) tragen ihren Weg längst; die
 * beiden Helfer hier WERFEN aber, und eine geworfene Meldung reißt den Test ab,
 * ohne zu sagen, WO. Gemessen an den Läufen vom 21. und 22.09.2026: Zweimal
 * dieselbe Meldung „Weiter kam nicht durch (Weiter-Knopf frei)", beide Male
 * ohne einen einzigen Hinweis auf die Kombination — nicht nachstellbar, also
 * auch nicht behebbar. Der Kommentar in `waehle` benannte die Lücke bereits
 * („noch auf welchem Weg"), geschlossen war sie nie.
 *
 * Optional, weil die übrigen Aufrufer feste, kurze Wege gehen: Dort sagt die
 * Datei-und-Zeile-Angabe von Playwright bereits alles.
 */
function wegPraefix(weg?: string) {
  return weg ? `[${weg}] ` : "";
}

/**
 * Die beiden Meldungen stehen als eigene Funktionen da, damit der Wächter sie
 * AUFRUFEN kann statt den Quelltext nach ihrem Wortlaut zu durchsuchen. Eine
 * Textsuche bliebe grün, sobald jemand den Parameter entgegennimmt und in der
 * Meldung vergisst — genau die Fehlerklasse, gegen die es diesen Fix gibt.
 */
export function weiterMeldung(weg: string | undefined, gesperrt: boolean) {
  return (
    `${wegPraefix(weg)}Weiter kam nicht durch: Der Schritt wechselte 20 s lang nicht ` +
    `(Weiter-Knopf ${gesperrt ? "gesperrt (aria-disabled)" : "frei"}).`
  );
}

export function wahlMeldung(weg: string | undefined, label: string, zustand: unknown) {
  return (
    `${wegPraefix(weg)}Option „${label}" ließ sich nicht wählen (20 s lang kein aria-pressed=true). ` +
    `Zustand: ${JSON.stringify(zustand)}. ` +
    `Steht dort sichtbar=true und deaktiviert=false, kam der Klick nicht an — ` +
    `dann liegt etwas darüber oder die Seite ist nicht interaktiv geworden.`
  );
}

export async function weiterKlicken(page: Page, weg?: string) {
  const fingerabdruck = () =>
    page.evaluate(() => {
      const sichtbar = (e: Element) => (e as HTMLElement).offsetParent !== null && !e.closest("[inert]");
      if (!Array.from(document.querySelectorAll("[data-flow-nav]")).some(sichtbar)) return "kein-flow";
      return Array.from(document.querySelectorAll("[data-flow-option]"))
        .filter(sichtbar)
        .map((e) => `${e.getAttribute("data-flow-option")}=${e.getAttribute("aria-pressed")}`)
        .join("¦");
    });
  const weiter = page.locator("[data-flow-next]:not([inert] *):visible").first();
  const vorher = await fingerabdruck();
  try {
    await expect(async () => {
      await expect(weiter).not.toHaveAttribute("aria-disabled", "true", { timeout: 1_000 });
      await weiter.click();
      await expect(async () => {
        expect(await fingerabdruck()).not.toBe(vorher);
      }).toPass({ timeout: 1_500 });
    }).toPass({ timeout: 20_000 });
  } catch {
    const gesperrt = (await weiter.getAttribute("aria-disabled").catch(() => null)) === "true";
    throw new Error(weiterMeldung(weg, gesperrt));
  }
}

export async function waehle(page: Page, label: string, weg?: string) {
  const option = page.locator(`[data-flow-option="${label.replace(/"/g, '\\"')}"]:visible`).first();
  await expect(option).toBeEnabled({ timeout: 15_000 });
  // Wiederholen, nicht warten: Der Knopf ist ab dem servergerenderten HTML da
  // und anklickbar, reagiert aber erst, wenn React ihn übernommen hat. Ein
  // einzelner Klick in dieses Fenster ist verloren — längeres Warten danach
  // holt ihn nicht zurück, weil das Ereignis nie einen Empfänger hatte.
  try {
    await expect(async () => {
      // Das Klick-Timeout ist der Kern und nicht Kosmetik — BLOCKER.
      //
      // Ohne eigenes Timeout erbt click() den TEST-Timeout, nicht die 20 s der
      // Wiederhol-Schleife. Wartet Playwright dann auf ein Element, das es für
      // instabil hält (Step-Wechsel animiert 0,3 s, auf einem ausgelasteten
      // Runner länger), frisst der EINE Klick das ganze Budget von toPass — und
      // die Schleife, die genau dafür gebaut wurde, läuft kein einziges Mal an.
      // Gemessen am CI-Lauf vom 18.08.2026: „20 s lang kein aria-pressed=true"
      // bei einem Knopf, der sichtbar und aktiv war und von Hand einwandfrei
      // funktioniert; lokal nicht reproduzierbar, weil dort nichts hängt.
      //
      // Mit kurzem Klick-Timeout wird aus dem einen hängenden Versuch ein halbes
      // Dutzend echter. Ein wirklich blockiertes Element (Overlay davor) fällt
      // weiterhin durch — nur eben nach mehreren Anläufen statt nach einem.
      await option.click({ timeout: 3_000 });
      await expect(option).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
  } catch {
    // Die nackte Meldung von toPass lautet nur „Timeout while waiting on the
    // predicate" — sie sagt weder, WELCHE Option klemmt, noch auf welchem Weg.
    // Bei hunderten Wegen ist das nicht auswertbar, und genau daran hat eine
    // Fehlersuche schon eine Runde verloren.
    const zustand = await option.evaluate((e) => ({
      pressed: e.getAttribute("aria-pressed"),
      sichtbar: (e as HTMLElement).offsetParent !== null && !e.closest("[inert]"),
      deaktiviert: (e as HTMLButtonElement).disabled,
    })).catch(() => null);
    throw new Error(wahlMeldung(weg, label, zustand));
  }
}
