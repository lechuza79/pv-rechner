// Was in den Daten auffällt — als Satz, nicht als Beitrag.
//
// DER ENGPASS IST DIE IDEE, nicht das Formular. Ein Beitrag entsteht heute als
// handgeschriebene Funktion; wer einen neuen will, braucht zuerst etwas, das
// erzählenswert ist. Genau das sucht dieses Modul: Es geht die Daten nach
// festen Mustern durch und legt jeden Fund als einen Satz ab. Was davon taugt,
// entscheidet ein Mensch — und aus dem Gewählten wird dann Visual und Text.
//
// DIE MUSTER HÄNGEN AN DER REDAKTIONS-KATEGORIE, nicht an einer eigenen Liste.
// „Die Anomalie als offene Frage" sagt bereits, dass dort Ausreißer gesucht
// werden; „Der Vergleich: Rang und Kontrast" sagt es für Kontraste. Eine zweite
// Musterliste daneben wäre eine zweite Ordnung für dieselbe Sache — genau der
// Fehler, den der Katalog schon einmal gemacht hat, als Kategorien und Familien
// getrennt geführt wurden.
//
// KEINE ZAHL OHNE IHREN NENNER, keine Aussage ohne ihre Grundmenge. Dieselben
// Schranken wie bei den Gemeindemeldungen und aus demselben Anlass: Ein Ort mit
// 16 Einwohnern und einem Balkonkraftwerk stand schon einmal als „Platz 1 von
// 150" in einem Brief. Der Superlativ wohnte vollständig im Nenner.
//
// KEINE UHR, KEINE DATENBANK. Alles wird hereingereicht, damit ein Test die
// Funde gegen einen festen Datenstand prüfen kann.

import type { AwardCategory, GemeindeStats } from "./awards";

/** Ein Fund: ein Satz, seine Zahlen und woran er hängt. */
export type Fund = {
  /**
   * Was den Fund ausmacht — das, was in der Ansicht steht und was ein Mensch
   * zurufen kann („mach aus g10-anomalie-fuerfeld einen Post").
   *
   * SIE WIRD NICHT AUS DEM SATZ GERATEN, sondern vom Finder gesetzt: Nur er
   * weiß, was seinen Fund von einem anderen unterscheidet. Der erste Versuch
   * las die Namen aus dem Satz und ist gemessen gescheitert — 116 Kollisionen
   * über 399 Funde, weil „Kleine Gemeinden gegen Großstädte" bei sechs
   * verschiedenen Messgrößen denselben Namen ergab; der Vorrat hätte fünf
   * davon stumm verschluckt.
   *
   * Sie muss zugleich eindeutig und über Läufe hinweg STABIL sein, enthält
   * deshalb die Messgröße und die verglichenen Namen, aber nie eine Zahl:
   * Zahlen folgen dem Datenstand, und eine wandernde Kennung verlöre die
   * Vormerkung von gestern.
   */
  kennung: string;
  /**
   * Die Kommunen und Kreise, über die dieser Fund etwas sagt.
   *
   * VOM FINDER GESETZT, nie aus dem Satz gelesen. Im Satz stehen neben Orten
   * auch Gruppen („Dörfer", „Kleine Gemeinden", „typischer Ort"), und ein
   * Filter, der die mitfängt, bietet Ortsnamen an, die keine sind.
   *
   * Leer ist ein gültiger Wert: Kohorte und Wohnform sind bundesweite
   * Aussagen und nennen bewusst niemanden.
   */
  orte?: string[];
  /**
   * Die Bundesländer, über die dieser Fund etwas sagt — GETRENNT von den
   * Kommunen, weil beides verschiedene Fragen beantwortet.
   *
   * „Zeig mir alles über Bayern" und „zeig mir alles über Fürfeld" sind zwei
   * Suchen; in einer gemeinsamen Liste stünden sechzehn Länder zwischen
   * zweihundert Gemeinden und wären dort nicht zu finden.
   */
  laender?: string[];
  /**
   * Ob die Aussage an ein Zeitfenster gebunden ist.
   *
   * ZWEI VERSCHIEDENE FRAGEN, die leicht verwechselt werden: Die Haltbarkeit
   * sagt, wie lange DIESER Fund trägt; der Takt (am Muster, siehe
   * {@link MUSTER_TAKT}) sagt, wie oft das MUSTER Nachschub liefert. Die
   * Anomalie ist zeitgebunden mit wöchentlichem Nachschub, die Kohorte ein
   * Evergreen, der sich einmal im Jahr bewegt.
   *
   * Vom FINDER gesetzt, weil nur er es weiß: Ein Satz, der einen Zeitraum
   * nennt („zwischen März und Mai 2025"), ist zeitgebunden, auch wenn jede Zahl
   * darin stimmt — er ist nach ein paar Wochen kalt. Ein Strukturbefund
   * („Solarleistung je Wohnung nach Wohnform") trägt über Jahre.
   *
   * Ohne Angabe gilt ZEITGEBUNDEN, die vorsichtige Richtung: Ein Fund, den
   * niemand eingeordnet hat, wird nicht Monate später als Evergreen gepostet.
   */
  evergreen?: boolean;
  /** Welches Muster ihn gefunden hat. */
  muster: MusterArt;
  /** Die Redaktions-Kategorie, in die er gehört. */
  kategorie: string;
  /** Der Satz — eine Aussage, keine Überschrift. */
  satz: string;
  /**
   * Wie stark der Fund ist, damit sich die Liste sortieren lässt.
   *
   * Bewusst OHNE Einheit und nie im Satz sichtbar: Eine Rangzahl, die neben
   * einer Aussage steht, liest sich wie ein Messwert. Sie ordnet nur.
   */
  staerke: number;
  /** Die Zahlen, auf denen er steht — für den späteren Beitrag. */
  werte: { name: string; wert: number; einheit: string }[];
  /** Woran der Fund hängt: Grundmenge und Nenner, im Klartext. */
  grundlage: string;
};

export type MusterArt =
  | "ausreisser"
  | "kontrast"
  | "umkehrung"
  | "aufholer"
  | "topliste"
  | "david"
  | "flaechenmix"
  | "foerderluecke"
  | "kohorte"
  | "heizungsfoerderung"
  | "wohnform"
  | "anomalie"
  | "saison";

/** Wie groß eine Gruppe sein muss, damit ein Vergleich in ihr etwas heißt. */
export const MIN_GRUPPE = 20;

/**
 * Wie viele Einheiten eine Gemeinde haben muss, damit sie als Ausreißer zählt.
 *
 * Ohne diese Schranke gewinnt jedes Mal derselbe Ort: der kleinste. Ein Dorf mit
 * 16 Einwohnern und einem Gerät steht pro Kopf uneinholbar vorn, und die
 * Aussage entsteht vollständig im Nenner. Genau dieser Fall ist im
 * Kommunen-Anschreiben schon einmal live gegangen.
 */
export const MIN_MENGE = 5;

/**
 * Ausreißer: ein Ort, der weit über dem Median seiner Gruppe liegt.
 *
 * Gemessen wird gegen den MEDIAN, nicht gegen den Mittelwert: Ein einzelner
 * Extremwert zöge den Mittelwert mit sich und versteckte damit genau den
 * Ausreißer, den wir suchen.
 *
 * NUR NACH OBEN. Ein negativer Ausschlag wäre eine Bloßstellung, und die beendet
 * den Kontakt in einer ganzen Region — dieselbe Entscheidung wie im
 * Award-Aufhänger.
 */
export function findeAusreisser(
  gemeinden: GemeindeStats[],
  kategorie: AwardCategory,
  redaktionsKategorie: string,
  opts: {
    mindestFaktor?: number;
    hoechstFaktor?: number;
    anzahl?: number;
    /**
     * Der Vergleichsraum, in dem „typisch" gilt.
     *
     * Ohne ihn wird gegen ganz Deutschland verglichen, und dann gewinnen immer
     * dieselben drei Orte. Innerhalb eines Bundeslands oder einer Größenklasse
     * ist „fällt aus der Reihe" eine andere und oft interessantere Aussage: Es
     * heißt, der Ort weicht von seinesgleichen ab, nicht vom Bundesschnitt.
     */
    raum?: (g: GemeindeStats) => string | null;
    /** Wie der Raum im Satz heißt — „in Bayern", „unter kleinen Gemeinden". */
    raumText?: (name: string) => string;
  } = {},
): Fund[] {
  const mindestFaktor = opts.mindestFaktor ?? 2;
  // EINE OBERGRENZE, und sie ist so wichtig wie die Untergrenze. Was hundertmal
  // über dem Median liegt, ist kein Ausreißer derselben Sorte Ort, sondern eine
  // andere Sorte: ein Dorf mit einem Solarpark, ein Gewerbegebiet ohne
  // Einwohner. „Ohne dass wir wüssten, warum" ist dort falsch — wir wissen es,
  // und die Frage wäre gestellt, um nicht beantwortet zu werden.
  const hoechstFaktor = opts.hoechstFaktor ?? 12;
  const anzahl = opts.anzahl ?? 3;
  const raum = opts.raum ?? (() => "Deutschland");
  const raumText = opts.raumText ?? ((n) => (n === "Deutschland" ? "im Bundesgebiet" : `in ${n}`));

  const nachRaum = new Map<string, { g: GemeindeStats; wert: number }[]>();
  for (const eintrag of messbare(gemeinden, kategorie)) {
    const name = raum(eintrag.g);
    if (!name) continue;
    const bisher = nachRaum.get(name);
    if (bisher) bisher.push(eintrag);
    else nachRaum.set(name, [eintrag]);
  }

  const funde: Fund[] = [];
  for (const [name, taugliche] of nachRaum) {
    if (taugliche.length < MIN_GRUPPE) continue;
    const median = medianVon(taugliche.map((x) => x.wert));
    if (median <= 0) continue;

    funde.push(
      ...taugliche
        .map(({ g, wert }) => ({ g, wert, faktor: wert / median }))
        .filter((x) => x.faktor >= mindestFaktor && x.faktor <= hoechstFaktor)
        .sort((a, b) => b.faktor - a.faktor)
        .slice(0, anzahl)
        .map(({ g, wert, faktor }) => ({
          kennung: kennungAus(redaktionsKategorie, "ausreisser", kategorie.key, g.name, raumText(name)),
          orte: [g.name],
          evergreen: true,
          muster: "ausreisser" as const,
          kategorie: redaktionsKategorie,
          satz: `${g.name} liegt bei ${kategorie.themaDativ ?? kategorie.thema} ${malSoHoch(faktor)} wie der typische Ort ${raumText(name)} — ohne dass wir wüssten, warum.`,
          staerke: faktor,
          werte: [
            { name: g.name, wert, einheit: kategorie.format },
            { name: `typischer Ort ${raumText(name)}`, wert: median, einheit: kategorie.format },
          ],
          grundlage: `${taugliche.length} Orte ${raumText(name)} mit belastbarer Grundmenge; verglichen gegen den Median, nicht den Mittelwert. ${kategorie.basis?.(g) ?? ""}`.trim(),
        })),
    );
  }
  return funde;
}

/**
 * Kontrast: zwei Gruppen, deren Werte auffällig auseinanderliegen.
 *
 * Die Gruppierung wird hereingereicht — Größenklasse, Bundesland, Ost/West sind
 * verschiedene Fragen, und welche gerade gemeint ist, entscheidet nicht dieses
 * Modul.
 *
 * VERGLICHEN WERDEN GRUPPEN-MEDIANE, nicht Summen: Eine Summe misst, wie viele
 * Orte in der Gruppe sind, kein Verhalten.
 */
export function findeKontrast(
  gemeinden: GemeindeStats[],
  kategorie: AwardCategory,
  redaktionsKategorie: string,
  gruppiere: (g: GemeindeStats) => string | null,
  opts: { mindestFaktor?: number; sindLaender?: boolean } = {},
): Fund[] {
  const mindestFaktor = opts.mindestFaktor ?? 1.3;

  const gruppen = new Map<string, number[]>();
  for (const { g, wert } of messbare(gemeinden, kategorie)) {
    const name = gruppiere(g);
    if (!name) continue;
    const bisher = gruppen.get(name);
    if (bisher) bisher.push(wert);
    else gruppen.set(name, [wert]);
  }

  const mediane = [...gruppen.entries()]
    .filter(([, werte]) => werte.length >= MIN_GRUPPE)
    .map(([name, werte]) => ({ name, median: medianVon(werte), anzahl: werte.length }))
    .sort((a, b) => b.median - a.median);

  if (mediane.length < 2) return [];

  // ALLE PAARE, nicht nur das äußerste. Der erste Anlauf verglich ausschließlich
  // die oberste mit der untersten Gruppe und lieferte damit je Metrik genau
  // EINEN Satz — bei sechzehn Bundesländern wirft er fünfzehn Vergleiche weg,
  // darunter die interessanten: Zwei Nachbarn, die weit auseinanderliegen, sind
  // eine bessere Geschichte als der Abstand zwischen Extrem und Extrem.
  const funde: Fund[] = [];
  for (let i = 0; i < mediane.length; i++) {
    for (let j = i + 1; j < mediane.length; j++) {
      const oben = mediane[i];
      const unten = mediane[j];
      if (unten.median <= 0) continue;
      const faktor = oben.median / unten.median;
      if (faktor < mindestFaktor) continue;
      funde.push({
        kennung: kennungAus(redaktionsKategorie, "kontrast", kategorie.key, oben.name, unten.name),
        orte: [],
        laender: opts.sindLaender ? [oben.name, unten.name] : [],
        evergreen: true,
        muster: "kontrast",
        kategorie: redaktionsKategorie,
        satz: `Bei ${kategorie.themaDativ ?? kategorie.thema} liegt ${oben.name} ${malSoHoch(faktor)} wie ${unten.name}.`.replace(
          / liegt /,
          mehrzahl(oben.name) ? " liegen " : " liegt ",
        ),
        staerke: faktor,
        werte: [
          { name: oben.name, wert: oben.median, einheit: kategorie.format },
          { name: unten.name, wert: unten.median, einheit: kategorie.format },
        ],
        grundlage: `Mediane über ${oben.anzahl} bzw. ${unten.anzahl} Orte — nicht Summen, die nur die Gruppengröße messen.`,
      });
    }
  }
  return funde;
}

/**
 * Die Orte, für die diese Metrik überhaupt etwas hergibt.
 *
 * Drei Schranken, und jede hat einen Grund: KEIN WERT heißt, dass die Metrik
 * dort nicht anwendbar ist (nicht „null") — ein solcher Ort gehört nicht in den
 * Vergleich, weder als Nenner noch als Zähler. UNPLAUSIBEL fängt, was der
 * Award-Katalog ohnehin als Datenfehler kennt. Und ZU KLEIN ist die eigentliche
 * Bremse: Ohne sie gewinnt jedes Mal der kleinste Ort, und die Aussage entsteht
 * vollständig im Nenner.
 */
function messbare(
  gemeinden: GemeindeStats[],
  kategorie: AwardCategory,
): { g: GemeindeStats; wert: number }[] {
  const raus: { g: GemeindeStats; wert: number }[] = [];
  for (const g of gemeinden) {
    if (kategorie.plausibel && !kategorie.plausibel(g)) continue;
    const menge = kategorie.menge?.(g) ?? null;
    if (menge !== null && menge < MIN_MENGE) continue;
    const wert = kategorie.metric(g);
    if (wert === null || !(wert > 0)) continue;
    raus.push({ g, wert });
  }
  return raus;
}

/**
 * Ist der Gruppenname ein Plural?
 *
 * „liegen Nordrhein-Westfalen" stand nach dem ersten breiten Lauf in jedem
 * Ländervergleich — ein Bundesland ist Singular, eine Größenklasse („kleine
 * Gemeinden") Plural, und beide laufen durch dieselbe Zeile. Geprüft wird am
 * Namen selbst statt an einer Liste der Gruppierungen: Die Zeile weiß nicht, wer
 * sie aufgerufen hat, und soll es auch nicht wissen müssen.
 */
function mehrzahl(name: string): boolean {
  return /(n|e|s)$/.test(name) && /\s/.test(name);
}

/** Der Median. Gegen den Mittelwert, weil ein Extremwert ihn mitzöge. */
function medianVon(werte: number[]): number {
  if (!werte.length) return 0;
  const s = [...werte].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * „doppelt so hoch", „5,4-mal so hoch" — mit KOMMA und ohne Deklination.
 *
 * ZWEI FEHLER AUS DEM ERSTEN ECHTEN LAUF, beide in jedem Satz. Die englische
 * Punktschreibweise („5.4-mal") hat in einem Projekt nichts verloren, dessen
 * erste Regel lautet, dass eine falsch geschriebene Zahl der schwerste Fehler
 * ist. Und der Versuch, das Thema als Objekt einzusetzen, ergab „so viel
 * Balkonkraftwerken je 1.000 Einwohner" — nach „so viel" steht kein Dativ, und
 * bei zählbaren Dingen müsste es ohnehin „so viele" heißen.
 *
 * „liegt bei X so hoch wie" umgeht beides: Nach „bei" steht der Dativ, den die
 * Award-Kategorie ohnehin führt, und der Vergleich braucht kein Objekt.
 *
 * Zwei Werte bekommen Worte statt Ziffern: „doppelt" und „dreimal" lesen sich
 * als Aussage, „2,0-mal" als Messprotokoll.
 */
export function malSoHoch(faktor: number): string {
  if (Math.abs(faktor - 2) < 0.05) return "doppelt so hoch";
  if (Math.abs(faktor - 3) < 0.05) return "dreimal so hoch";
  return `${faktor.toLocaleString("de-DE", { maximumFractionDigits: 1 })}-mal so hoch`;
}

/**
 * Umkehrung: eine Gruppe, die bei zwei verwandten Größen entgegengesetzt steht.
 *
 * DAS IST DAS MUSTER, DAS EINE RANGLISTE NICHT ZEIGEN KANN. Sie ordnet je
 * Größe; dass dieselbe Gruppe in der einen vorn und in der anderen hinten
 * liegt, sieht man erst, wenn man zwei Ranglisten nebeneinanderlegt — und genau
 * dort steckt die Geschichte: Wer viele Dachanlagen hat, aber kaum Speicher,
 * verhält sich anders als sein Bestand vermuten lässt.
 *
 * Gemessen wird der Abstand der RANGPLÄTZE, nicht der Werte: Zwei Größen mit
 * verschiedenen Einheiten lassen sich nicht subtrahieren, ihre Plätze schon.
 */
export function findeUmkehrung(
  gemeinden: GemeindeStats[],
  a: AwardCategory,
  b: AwardCategory,
  redaktionsKategorie: string,
  gruppiere: (g: GemeindeStats) => string | null,
  opts: { mindestAbstand?: number } = {},
): Fund[] {
  const mindestAbstand = opts.mindestAbstand ?? 0.4;
  const rangA = rangAnteile(gemeinden, a, gruppiere);
  const rangB = rangAnteile(gemeinden, b, gruppiere);

  const funde: Fund[] = [];
  for (const [name, pa] of rangA) {
    const pb = rangB.get(name);
    if (pb === undefined) continue;
    const abstand = pb - pa;
    if (Math.abs(abstand) < mindestAbstand) continue;
    const vorn = abstand > 0 ? a : b;
    const hinten = abstand > 0 ? b : a;
    funde.push({
      kennung: kennungAus(redaktionsKategorie, "umkehrung", a.key, b.key, name),
      evergreen: true,
      muster: "umkehrung",
      kategorie: redaktionsKategorie,
      satz: `${name} steht bei ${vorn.themaDativ ?? vorn.thema} weit vorn und bei ${hinten.themaDativ ?? hinten.thema} weit hinten.`,
      staerke: Math.abs(abstand),
      werte: [],
      grundlage: `Verglichen werden Rangplätze, nicht Werte — zwei Größen mit verschiedenen Einheiten lassen sich nicht subtrahieren. ${rangA.size} bzw. ${rangB.size} Gruppen mit belastbarer Menge.`,
    });
  }
  return funde;
}

/**
 * Wo eine Gruppe bei dieser Messgröße steht — als Anteil zwischen 0 (vorn) und
 * 1 (hinten).
 *
 * Als ANTEIL, nicht als Platznummer: Nur so lassen sich zwei Ranglisten
 * verschiedener Länge vergleichen — und die eine Größe hat regelmäßig weniger
 * Gruppen mit belastbarer Menge als die andere.
 */
function rangAnteile(
  gemeinden: GemeindeStats[],
  kategorie: AwardCategory,
  gruppiere: (g: GemeindeStats) => string | null,
): Map<string, number> {
  const gruppen = new Map<string, number[]>();
  for (const { g, wert } of messbare(gemeinden, kategorie)) {
    const name = gruppiere(g);
    if (!name) continue;
    const bisher = gruppen.get(name);
    if (bisher) bisher.push(wert);
    else gruppen.set(name, [wert]);
  }
  const sortiert = [...gruppen.entries()]
    .filter(([, werte]) => werte.length >= MIN_GRUPPE)
    .map(([name, werte]) => ({ name, median: medianVon(werte) }))
    .sort((x, y) => y.median - x.median);
  return new Map(sortiert.map((x, i) => [x.name, i / Math.max(1, sortiert.length - 1)]));
}

/**
 * Aufholer: hinten im Bestand, vorn beim Tempo.
 *
 * Auch das zeigt keine Rangliste — sie kennt entweder den Bestand oder das
 * Tempo. Die Geschichte ist die Bewegung gegen den eigenen Stand: Wer weit
 * hinten liegt und trotzdem am schnellsten baut, verändert gerade seine Lage.
 *
 * NUR DIESE EINE RICHTUNG. „Vorn im Bestand, hinten beim Tempo" wäre die
 * Aussage, dass jemand nachlässt — dieselbe Bloßstellung, die beim
 * Ausreißer-Sucher schon ausgeschlossen ist, nur über eine ganze Region.
 *
 * DIE RICHTUNG WIRD GERECHNET, NICHT AM SATZ ABGELESEN. Die erste Fassung ging
 * über die Umkehrung und filterte danach auf ein Wort im Satz — das war
 * wirkungslos, weil der Umkehrungs-Satz IMMER beide Messgrößen nennt. Gemessen
 * an einem Testbestand kam „A steht bei Bestand weit vorn und bei Tempo weit
 * hinten" als Aufholer heraus: die verbotene Richtung, im unveränderten
 * Wortlaut der Umkehrung, weil auch das Ersetzen nicht griff.
 */
export function findeAufholer(
  gemeinden: GemeindeStats[],
  bestand: AwardCategory,
  tempo: AwardCategory,
  redaktionsKategorie: string,
  gruppiere: (g: GemeindeStats) => string | null,
  opts: { mindestAbstand?: number } = {},
): Fund[] {
  const mindestAbstand = opts.mindestAbstand ?? 0.4;
  const rangBestand = rangAnteile(gemeinden, bestand, gruppiere);
  const rangTempo = rangAnteile(gemeinden, tempo, gruppiere);

  const funde: Fund[] = [];
  for (const [name, pTempo] of rangTempo) {
    const pBestand = rangBestand.get(name);
    if (pBestand === undefined) continue;
    // Vorn beim Tempo heißt kleiner Anteil, hinten im Bestand heißt großer.
    // Nur dieser Fall, nie der umgekehrte.
    const abstand = pBestand - pTempo;
    if (abstand < mindestAbstand) continue;
    funde.push({
      kennung: kennungAus(redaktionsKategorie, "aufholer", bestand.key, tempo.key, name),
      evergreen: false,
      muster: "aufholer",
      kategorie: redaktionsKategorie,
      satz: `${name} baut derzeit mit am schnellsten zu — und liegt bei ${bestand.themaDativ ?? bestand.thema} trotzdem weit hinten.`,
      staerke: abstand,
      werte: [],
      grundlage: `Verglichen werden Rangplätze, nicht Werte — zwei Größen mit verschiedenen Einheiten lassen sich nicht subtrahieren. ${rangTempo.size} bzw. ${rangBestand.size} Gruppen mit belastbarer Menge. Nur diese eine Richtung: „vorn im Bestand, hinten beim Tempo" wäre die Aussage, dass eine Region nachlässt.`,
    });
  }
  return funde;
}

/**
 * G3.2 — Die Top-Liste, und was an ihr auffällt.
 *
 * DIE LISTE ALLEIN IST KEINE GESCHICHTE. Der Katalog schreibt das Beispiel
 * mitsamt seiner Pointe: „Die zehn Gemeinden mit der höchsten Solarleistung je
 * Einwohner — neun davon haben unter 5.000 Einwohner." Erzählenswert ist nicht
 * der erste Platz, sondern was die zehn gemeinsam haben.
 *
 * Gesucht wird deshalb die Auffälligkeit IN der Liste: eine Größenklasse oder
 * ein Bundesland, das dort weit über seinem Anteil am Gesamtbestand liegt.
 *
 * TOP JA, FLOP NIE — Schranke aus dem Katalog.
 */
export function findeTopliste(
  gemeinden: GemeindeStats[],
  kategorie: AwardCategory,
  redaktionsKategorie: string,
  merkmal: (g: GemeindeStats) => string | null,
  merkmalName: string,
  opts: { anzahl?: number; mindestUeberhang?: number } = {},
): Fund[] {
  const anzahl = opts.anzahl ?? 10;
  // Wie stark ein Merkmal überrepräsentiert sein muss. Zwei Drittel der Liste
  // bei einem Drittel Anteil am Bestand ist eine Aussage; die Hälfte bei knapp
  // darunter ist Zufall.
  const mindestUeberhang = opts.mindestUeberhang ?? 2;

  const taugliche = messbare(gemeinden, kategorie);
  if (taugliche.length < MIN_GRUPPE * 5) return [];

  const spitze = [...taugliche].sort((a, b) => b.wert - a.wert).slice(0, anzahl);

  // Der Anteil im GESAMTBESTAND ist der Vergleichsmaßstab. Ohne ihn wäre „acht
  // von zehn sind Dörfer" bedeutungslos — Dörfer stellen die Mehrheit aller
  // Gemeinden, und acht von zehn wären dann das Erwartete.
  const gesamt = new Map<string, number>();
  for (const { g } of taugliche) {
    const m = merkmal(g);
    if (m) gesamt.set(m, (gesamt.get(m) ?? 0) + 1);
  }
  const inSpitze = new Map<string, number>();
  for (const { g } of spitze) {
    const m = merkmal(g);
    if (m) inSpitze.set(m, (inSpitze.get(m) ?? 0) + 1);
  }

  const funde: Fund[] = [];
  for (const [name, zahl] of inSpitze) {
    const anteilSpitze = zahl / spitze.length;
    const anteilGesamt = (gesamt.get(name) ?? 0) / taugliche.length;
    if (anteilGesamt <= 0) continue;
    const ueberhang = anteilSpitze / anteilGesamt;
    if (ueberhang < mindestUeberhang || zahl < 5) continue;
    funde.push({
      kennung: kennungAus(redaktionsKategorie, "topliste", kategorie.key, merkmalName, name),
      laender: merkmalName === "Bundesland" ? [name] : [],
      evergreen: true,
      muster: "topliste",
      kategorie: redaktionsKategorie,
      satz: `Von den ${spitze.length} Orten mit der höchsten ${kategorie.thema} sind ${zahl} ${name} — obwohl die nur ${Math.round(anteilGesamt * 100)} Prozent aller Orte stellen.`,
      staerke: ueberhang,
      werte: [
        { name: `in der Spitze`, wert: Math.round(anteilSpitze * 100), einheit: "prozent" },
        { name: `im Bestand`, wert: Math.round(anteilGesamt * 100), einheit: "prozent" },
      ],
      grundlage: `${taugliche.length} Orte mit belastbarer Grundmenge; verglichen wird der Anteil in der Spitze gegen den Anteil am Gesamtbestand — ohne diesen Nenner wäre die Aussage bedeutungslos. Merkmal: ${merkmalName}.`,
    });
  }
  return funde;
}

/**
 * G3.4 — David gegen Goliath.
 *
 * „[Kleine Gemeinde] hat mehr Solarleistung je Einwohner als München, Hamburg
 * und Berlin zusammen."
 *
 * ZUSAMMEN HEISST: EIN gemeinsamer Wert. Die Pro-Kopf-Werte dreier Städte zu
 * addieren wäre falsch — man summiert keine Quoten. Richtig ist die gemeinsame
 * Rechnung: alle Anlagen der drei durch alle ihre Einwohner. Genau daran
 * scheitert dieser Vergleich in der Presse regelmäßig.
 *
 * Die Städte werden NICHT abgewertet, sondern als Strukturunterschied erklärt —
 * Schranke aus dem Katalog. Der Satz nennt deshalb die Dachfläche je Kopf als
 * Grund und nicht das Verhalten der Städter.
 */
export function findeDavid(
  gemeinden: GemeindeStats[],
  kategorie: AwardCategory,
  redaktionsKategorie: string,
  opts: { staedte?: number; anzahl?: number; mindestFaktor?: number } = {},
): Fund[] {
  const staedteZahl = opts.staedte ?? 3;
  const anzahl = opts.anzahl ?? 3;
  // DIE HÜRDE, NICHT DIE LISTENLÄNGE, MACHT DEN FUND. Ohne sie kamen 29.266
  // Treffer heraus — jeder zweite kleine Ort schlägt Berlin, Hamburg und
  // München zusammen. Der Satz war damit wahr und trotzdem keine Geschichte:
  // Er beschrieb die Regel und klang nur wie die Ausnahme.
  //
  // Beim Dreifachen bleibt eine Handvoll übrig, und die verdient den Satz.
  const mindestFaktor = opts.mindestFaktor ?? 3;

  const taugliche = messbare(gemeinden, kategorie);
  if (taugliche.length < MIN_GRUPPE) return [];

  const groesste = [...taugliche]
    .sort((a, b) => b.g.population - a.g.population)
    .slice(0, staedteZahl);
  if (groesste.length < staedteZahl) return [];

  // Der gemeinsame Wert der Städte: nicht der Mittelwert ihrer Quoten, sondern
  // die Quote ihrer Summen.
  const summeEinwohner = groesste.reduce((n, x) => n + x.g.population, 0);
  const gemeinsam =
    groesste.reduce((n, x) => n + x.wert * x.g.population, 0) / Math.max(1, summeEinwohner);
  if (!(gemeinsam > 0)) return [];

  const namen = groesste.map((x) => x.g.name);
  const staedteText = `${namen.slice(0, -1).join(", ")} und ${namen[namen.length - 1]}`;

  return taugliche
    .filter((x) => x.g.population < 20_000 && x.wert >= gemeinsam * mindestFaktor)
    // NACH DEM ABSTAND ZU DEN STÄDTEN, und das war vorher kaputt: Die alte
    // Fassung rechnete `b.wert / a.g.population` — den Wert des einen Orts
    // geteilt durch die Einwohner des anderen. Das ist keine Vergleichsgröße,
    // sondern eine Zufallszahl; welche drei Orte oben landeten, hing an der
    // Reihenfolge der Liste. Kein Absturz, keine falsche Zahl im Satz — nur die
    // falsche Auswahl, und die sieht man einem plausiblen Ort nicht an.
    .sort((a, b) => b.wert - a.wert)
    .slice(0, anzahl)
    .map(({ g, wert }) => ({
      kennung: kennungAus(redaktionsKategorie, "david", kategorie.key, g.name),
      orte: [g.name, ...namen],
      evergreen: true,
      muster: "david" as const,
      kategorie: redaktionsKategorie,
      satz: `${g.name} mit ${g.population.toLocaleString("de-DE")} Einwohnern hat mehr ${kategorie.thema} als ${staedteText} zusammen.`,
      staerke: wert / gemeinsam,
      werte: [
        { name: g.name, wert, einheit: kategorie.format },
        { name: `${staedteText} zusammen`, wert: gemeinsam, einheit: kategorie.format },
      ],
      grundlage: `„Zusammen" heißt ein gemeinsamer Wert aus allen Anlagen und allen Einwohnern der drei Städte — Pro-Kopf-Werte lassen sich nicht addieren. Der Unterschied ist die Dachfläche je Kopf, nicht das Verhalten. Verlangt wird mindestens das ${malSoHoch(mindestFaktor)}: Die Städte schlicht zu übertreffen schaffen tausende kleine Orte, das wäre die Regel und keine Geschichte. ${kategorie.basis?.(g) ?? ""}`.trim(),
    }));
}

/**
 * G14.1 — Die Flächenfrage: wo die Leistung steht.
 *
 * „In [Landkreis] stehen X Prozent der Solarleistung auf Freiflächen, Y auf
 * Gewerbe- und Z auf privaten Dächern. Im Nachbarkreis ist das Verhältnis
 * umgekehrt."
 *
 * DAS IST DAS EINZIGE MUSTER IM KATALOG MIT EINER WARNUNG DAVOR: kommunalpolitisch
 * heiß (Flächenverbrauch, Bürgerinitiativen), höchster Ertrag und höchstes
 * Risiko. Deshalb steht im Satz keine Wertung und keine Empfehlung — nur das
 * Verhältnis, und beide Seiten namentlich. Ein „obwohl" oder „nur" wäre hier
 * bereits Stellungnahme.
 *
 * Verglichen werden Regionen im SELBEN Bundesland: Zwischen Bayern und
 * Nordrhein-Westfalen ist ein Unterschied im Flächenmix erwartbar, innerhalb
 * eines Landes nicht.
 */
export function findeFlaechenmix(
  gemeinden: GemeindeStats[],
  redaktionsKategorie: string,
  region: (g: GemeindeStats) => string | null,
  land: (g: GemeindeStats) => string | null,
  opts: { mindestKwp?: number; mindestUnterschied?: number } = {},
): Fund[] {
  const mindestKwp = opts.mindestKwp ?? 20_000;
  // Wie weit die Freiflächen-Anteile auseinanderliegen müssen. In
  // Prozentpunkten, nicht als Faktor: Bei Anteilen ist der Abstand die Aussage,
  // ein Faktor macht aus 2 gegen 1 Prozent eine Verdopplung.
  const mindestUnterschied = opts.mindestUnterschied ?? 40;

  type Mix = { frei: number; gewerbe: number; privat: number; land: string };
  const proRegion = new Map<string, Mix>();
  for (const g of gemeinden) {
    const r = region(g);
    const l = land(g);
    if (!r || !l) continue;
    const bisher = proRegion.get(r) ?? { frei: 0, gewerbe: 0, privat: 0, land: l };
    bisher.frei += g.freiflaecheKwp ?? 0;
    bisher.gewerbe += g.gewerbeDachKwp ?? 0;
    bisher.privat += g.privatDachKwp ?? 0;
    proRegion.set(r, bisher);
  }

  const anteile = [...proRegion.entries()]
    .map(([name, m]) => {
      const gesamt = m.frei + m.gewerbe + m.privat;
      return {
        name,
        land: m.land,
        gesamt,
        freiAnteil: gesamt > 0 ? (m.frei / gesamt) * 100 : 0,
        privatAnteil: gesamt > 0 ? (m.privat / gesamt) * 100 : 0,
      };
    })
    .filter((x) => x.gesamt >= mindestKwp);

  const funde: Fund[] = [];
  const nachLand = new Map<string, typeof anteile>();
  for (const a of anteile) {
    const bisher = nachLand.get(a.land);
    if (bisher) bisher.push(a);
    else nachLand.set(a.land, [a]);
  }

  for (const [landName, liste] of nachLand) {
    if (liste.length < 4) continue;
    const sortiert = [...liste].sort((x, y) => y.freiAnteil - x.freiAnteil);
    const oben = sortiert[0];
    const unten = sortiert[sortiert.length - 1];
    const abstand = oben.freiAnteil - unten.freiAnteil;
    if (abstand < mindestUnterschied) continue;

    funde.push({
      kennung: kennungAus(redaktionsKategorie, "flaechenmix", landName, oben.name, unten.name),
      orte: [oben.name, unten.name],
      laender: [landName],
      evergreen: true,
      muster: "flaechenmix",
      kategorie: redaktionsKategorie,
      satz: `In ${oben.name} stehen ${Math.round(oben.freiAnteil)} Prozent der Solarleistung auf Freiflächen, in ${unten.name} sind es ${Math.round(unten.freiAnteil)} — beide in ${landName}.`,
      staerke: abstand,
      werte: [
        { name: `${oben.name}, Freifläche`, wert: Math.round(oben.freiAnteil), einheit: "prozent" },
        { name: `${unten.name}, Freifläche`, wert: Math.round(unten.freiAnteil), einheit: "prozent" },
      ],
      grundlage: `Verglichen wird innerhalb EINES Bundeslands — zwischen Ländern ist ein Unterschied im Flächenmix erwartbar. ${liste.length} Regionen mit mindestens ${(mindestKwp / 1000).toLocaleString("de-DE")} MW. Der Satz enthält bewusst keine Wertung: Flächenverbrauch ist kommunalpolitisch heiß.`,
    });
  }
  return funde;
}

/**
 * G12.1 — Was in kommunalen Förderprogrammen fehlt.
 *
 * „Vier Dinge, die in fast jedem kommunalen Förderprogramm fehlen und es für
 * Bürger unbrauchbar machen."
 *
 * KEINE KOMMUNE NAMENTLICH — Schranke aus dem Katalog. Das Muster hilft, es
 * bewertet nicht: Gezählt wird über den ganzen Katalog, genannt wird niemand.
 * Ein Ort neben einer Lücke wäre eine Bloßstellung der Verwaltung, die das
 * Programm überhaupt erst aufgelegt hat.
 *
 * Und es ist das einzige Muster ohne Rangliste dahinter: Hier gewinnt niemand.
 */
export function findeFoerderluecken(
  programme: {
    status: string;
    level: string;
    maxFoerderung?: string;
    capped: boolean;
    conditions: unknown[];
    pvPerKwp?: number;
    speicherPerKwh?: number;
    percentOfCost?: number;
  }[],
  redaktionsKategorie: string,
  opts: { mindestAnteil?: number } = {},
): Fund[] {
  // Eine Lücke ist erst eine Aussage, wenn sie die Mehrheit betrifft. Darunter
  // beschreibt sie Einzelfälle und liest sich trotzdem wie ein Systembefund.
  const mindestAnteil = opts.mindestAnteil ?? 0.4;

  const kommunal = programme.filter((p) => p.level === "kommune" && p.status === "aktiv");
  if (kommunal.length < 20) return [];

  // NUR EINE LÜCKE, UND DAS IST DAS ERGEBNIS DER PRÜFUNG, KEIN ANFANG.
  // Der Katalog nennt vier; drei davon kann dieser Datenbestand nicht sehen,
  // und sie zu behaupten wäre eine falsche Anschuldigung gegen die Verwaltung:
  //
  // - „kein Antragsformular" und „Antragspflicht ohne Hinweis" stehen nirgends
  //   als Feld — wir erfassen sie nicht, also wissen wir es nicht.
  // - „begrenzter Topf ohne Restangabe": `capped` sagt, DASS der Topf begrenzt
  //   ist, nicht, ob die Gemeinde den Rest veröffentlicht. Der erste Lauf schrieb
  //   trotzdem „ohne zu sagen, wie viel übrig ist" — 67 von 71 Gemeinden
  //   vorgeworfen, was wir nie nachgesehen haben.
  // - „kein ausrechenbarer Satz" misst zur Hälfte UNS: Ein Programm bekommt hier
  //   bewusst keinen strukturierten Satz, wenn unser Modell seine Bauform nicht
  //   ausdrücken kann (Einkommensgrenze, Sockel plus Satz je kWh). Das ist unsere
  //   Grenze, nicht ihre.
  //
  // Was bleibt, ist ein Feld, das die Amtsseite entweder nennt oder nicht.
  const luecken: { text: string; trifft: (p: (typeof kommunal)[number]) => boolean }[] = [
    {
      text: "nennt keinen Höchstbetrag — man erfährt erst im Bescheid, wie viel überhaupt möglich ist",
      trifft: (p) => !p.maxFoerderung,
    },
  ];

  const funde: Fund[] = [];
  for (const l of luecken) {
    const zahl = kommunal.filter(l.trifft).length;
    const anteil = zahl / kommunal.length;
    if (anteil < mindestAnteil) continue;
    funde.push({
      kennung: kennungAus(redaktionsKategorie, "foerderluecke", "hoechstbetrag"),
      evergreen: true,
      muster: "foerderluecke",
      kategorie: redaktionsKategorie,
      satz: `${zahl} von ${kommunal.length} kommunalen Förderprogrammen ${l.text}.`,
      staerke: anteil,
      werte: [{ name: "betroffen", wert: Math.round(anteil * 100), einheit: "prozent" }],
      grundlage: `Gezählt über alle ${kommunal.length} aktiven kommunalen Programme im eigenen Katalog. Bewusst ohne Ortsnamen: Das Muster hilft, es bewertet nicht — eine Gemeinde neben einer Lücke wäre eine Bloßstellung der Verwaltung, die das Programm überhaupt erst aufgelegt hat.`,
    });
  }
  return funde;
}

/**
 * G16.1 — Die Kohorte: wie sich die typische Anlage über die Jahrgänge verändert.
 *
 * „Die typische private Dachanlage war 2011 5,4 kWp groß, heute sind es 11,2.
 * Der Speicher kam ab 2016 dazu — inzwischen hat jede zweite neue Anlage einen."
 *
 * DAS EINZIGE MUSTER OHNE ORTSBEZUG, und deshalb das einzige ohne
 * Kränkungsrisiko — es kann niemanden bloßstellen, weil es niemanden nennt.
 *
 * Gerechnet wird je BAUJAHR, nicht am Bestand: Die mittlere Größe aller je
 * gebauten Anlagen ist eine Mischung aus zwanzig Jahrgängen und bewegt sich
 * kaum; erst der Jahrgangsvergleich zeigt die Entwicklung.
 */
export type JahrgangsZeile = { year: number; segment: string; count: number; kwp: number };

export function findeKohorte(
  solarJeJahr: JahrgangsZeile[],
  speicherJeJahr: JahrgangsZeile[],
  redaktionsKategorie: string,
  letztesVollesJahr: number,
  opts: { mindestAnlagen?: number; mindestWachstum?: number; abJahr?: number } = {},
): Fund[] {
  // Frühe Jahrgänge sind dünn besetzt, und ein Mittelwert aus 40 Anlagen ist
  // keine „typische Anlage".
  const mindestAnlagen = opts.mindestAnlagen ?? 1_000;
  const mindestWachstum = opts.mindestWachstum ?? 1.3;
  // DIESELBE UNTERGRENZE WIE DIE ZUBAU-STORY. Das Register trägt Fantasie-
  // Jahrgänge aus Tippfehlern (1900, 1923), und die frühen echten Jahrgänge
  // sind so dünn, dass ein Mittelwert daraus nichts über „die typische Anlage"
  // sagt. Ohne die Grenze begann der Satz bei 1998.
  const abJahr = opts.abJahr ?? 2000;

  const groesse = new Map<number, { count: number; kwp: number }>();
  for (const r of solarJeJahr) {
    if (r.segment !== "privat_dach") continue;
    // DAS LAUFENDE JAHR IST UNVOLLSTÄNDIG und gehört nicht in einen Vergleich —
    // dieselbe Vorsicht, mit der die Zubau-Story ihr letztes Jahr kennzeichnet.
    if (r.year < abJahr || r.year > letztesVollesJahr) continue;
    const e = groesse.get(r.year) ?? { count: 0, kwp: 0 };
    e.count += r.count;
    e.kwp += r.kwp;
    groesse.set(r.year, e);
  }

  const jahrgaenge = [...groesse.entries()]
    .filter(([, e]) => e.count >= mindestAnlagen)
    .map(([year, e]) => ({ year, mittel: e.kwp / e.count, count: e.count }))
    .sort((a, b) => a.year - b.year);
  if (jahrgaenge.length < 5) return [];

  const funde: Fund[] = [];
  const frueh = jahrgaenge[0];
  const spaet = jahrgaenge[jahrgaenge.length - 1];
  if (spaet.mittel / frueh.mittel >= mindestWachstum) {
    funde.push({
      kennung: kennungAus(redaktionsKategorie, "kohorte", "anlagengroesse-je-jahrgang"),
      evergreen: true,
      muster: "kohorte",
      kategorie: redaktionsKategorie,
      satz: `Die typische private Dachanlage war ${frueh.year} ${frueh.mittel.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kWp groß, ${spaet.year} sind es ${spaet.mittel.toLocaleString("de-DE", { maximumFractionDigits: 1 })}.`,
      staerke: spaet.mittel / frueh.mittel,
      werte: jahrgaenge.map((j) => ({
        name: String(j.year),
        wert: Number(j.mittel.toFixed(2)),
        einheit: "kwp",
      })),
      grundlage: `Je Baujahr gerechnet, nicht am Bestand: Der Mittelwert aller je gebauten Anlagen mischt zwanzig Jahrgänge und bewegt sich kaum. Jahrgänge unter ${mindestAnlagen.toLocaleString("de-DE")} Anlagen bleiben draußen, das laufende Jahr ebenfalls — es ist noch nicht vollständig gemeldet.`,
    });
  }

  // Der Speicher als zweite Kohorten-Frage: ab wann kam er dazu?
  //
  // GEMESSEN, UND DAS ERGEBNIS HAT DEN SATZ GEÄNDERT: Die Quote läuft von 18
  // Prozent (2015) auf 98 (2024) — und steht 2025 bei 136. Es werden inzwischen
  // mehr Speicher angemeldet als neue private Dachanlagen gebaut.
  //
  // „Jede neue Anlage hat einen" wäre ab diesem Punkt falsch: Die Speicherzahl
  // hängt dann nicht mehr nur an neuen Dachanlagen, sondern auch an
  // Nachrüstungen und an Speichern, die gar nicht privat sind — das Register
  // trennt beim Speicher keine Segmente. Der Satz endet deshalb beim letzten
  // Jahrgang unter 100 Prozent, und die Überschreitung steht als Beobachtung
  // daneben, OHNE Ursache: Welcher Anteil davon Nachrüstung ist, sagen diese
  // Daten nicht.
  const speicher = new Map<number, number>();
  for (const r of speicherJeJahr) {
    if (r.year < abJahr || r.year > letztesVollesJahr) continue;
    speicher.set(r.year, (speicher.get(r.year) ?? 0) + r.count);
  }
  const quote = (y: number) => (speicher.get(y) ?? 0) / Math.max(1, groesse.get(y)?.count ?? 0);
  const belastbar = jahrgaenge.filter((j) => quote(j.year) > 0 && quote(j.year) <= 1);
  const ueberschritten = jahrgaenge.filter((j) => quote(j.year) > 1).map((j) => j.year);

  const letzterSauber = belastbar[belastbar.length - 1];
  if (letzterSauber && quote(letzterSauber.year) > 0.15) {
    const erstesJahr = [...speicher.entries()]
      .filter(([, n]) => n >= mindestAnlagen)
      .sort((a, b) => a[0] - b[0])[0];
    if (erstesJahr) {
      const anteil = Math.round(quote(letzterSauber.year) * 100);
      funde.push({
        kennung: kennungAus(redaktionsKategorie, "kohorte", "speicheranteil-je-jahrgang"),
        evergreen: true,
        muster: "kohorte",
        kategorie: redaktionsKategorie,
        satz: `Speicher kamen ab ${erstesJahr[0]} in nennenswerter Zahl dazu — ${letzterSauber.year} kam auf ${anteil} von 100 neuen privaten Dachanlagen einer.`,
        staerke: quote(letzterSauber.year),
        werte: jahrgaenge
          .filter((j) => quote(j.year) > 0)
          .map((j) => ({
            name: String(j.year),
            wert: Math.round(quote(j.year) * 100),
            einheit: "prozent",
          })),
        grundlage:
          `Neue Speicher je Jahr gegen neue private Dachanlagen desselben Jahres — eine Quote aus zwei Registerteilen, keine Zuordnung Anlage zu Speicher. Ein nachgerüsteter Speicher zählt im Jahr seiner Anmeldung, nicht im Jahr seiner Anlage, und das Register trennt beim Speicher keine Segmente: Gewerbe und Nachrüstung stecken mit drin.` +
          (ueberschritten.length
            ? ` ${ueberschritten.join(", ")} liegt die Quote über 100 Prozent — es werden mehr Speicher angemeldet als neue private Dachanlagen gebaut. Welcher Anteil davon Nachrüstung ist, sagen diese Daten nicht; deshalb endet der Satz beim letzten Jahrgang darunter.`
            : ""),
      });
    }
  }
  return funde;
}

/**
 * G19.1 — Heizungsförderung je Landkreis.
 *
 * „Im Landkreis X wurden 861 Heizungsförderungen zugesagt, 11,5 Mio Euro. Je
 * 1.000 Einwohner ist das Y — im Nachbarkreis Z."
 *
 * DREI SCHRANKEN AUS DEM KATALOG, und zwei davon stecken im Satz selbst:
 * - „Zusagen Heizungsförderung" heißt NICHT „Wärmepumpen". Auf Kreisebene ist
 *   nicht nach Technik aufgeschlüsselt; die kursierende Quote von rund 87
 *   Prozent ist ein Bundeswert, und sie auf einen Kreis anzuwenden hieße, eine
 *   Annahme in eine Zahl hineinzurechnen, die die Quelle nicht hergibt. Der
 *   Satz sagt deshalb „Heizungsförderungen", nie „Wärmepumpen".
 * - Eine Zusage ist keine Anlage — zwischen Zusage und Einbau liegen Monate,
 *   ein Teil wird nie abgerufen.
 * - Werte unter zehn sind in der Quelle unterdrückt. Ein Kreis knapp über der
 *   Grenze trägt womöglich unterdrückte Zeilen und ist damit zu niedrig
 *   ausgewiesen; die Mindestmenge liegt deshalb deutlich darüber.
 */
export function findeHeizungsfoerderung(
  zeilen: {
    region_id: string;
    jahr: number;
    programm: string;
    anzahl: number;
    volumen_mio: number;
  }[],
  einwohner: (regionId: string) => number | null,
  name: (regionId: string) => string | null,
  redaktionsKategorie: string,
  opts: { mindestZusagen?: number; anzahl?: number } = {},
): Fund[] {
  const mindestZusagen = opts.mindestZusagen ?? 100;
  const anzahl = opts.anzahl ?? 5;

  const jahre = [...new Set(zeilen.map((z) => z.jahr))].sort((a, b) => b - a);
  const jahr = jahre[0];
  if (jahr === undefined) return [];

  const proKreis = new Map<string, { anzahl: number; volumen: number }>();
  for (const z of zeilen) {
    if (z.jahr !== jahr) continue;
    if (!/Heizungsf/i.test(z.programm)) continue;
    const e = proKreis.get(z.region_id) ?? { anzahl: 0, volumen: 0 };
    e.anzahl += z.anzahl;
    e.volumen += z.volumen_mio;
    proKreis.set(z.region_id, e);
  }

  const quoten = [...proKreis.entries()]
    .map(([id, e]) => {
      const ew = einwohner(id);
      const n = name(id);
      return ew && n && e.anzahl >= mindestZusagen
        ? { id, name: n, ...e, jeTausend: (e.anzahl / ew) * 1000 }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.jeTausend - a.jeTausend);
  if (quoten.length < 20) return [];

  const median = medianVon(quoten.map((q) => q.jeTausend));
  const zahl = (n: number, k = 1) =>
    n.toLocaleString("de-DE", { minimumFractionDigits: k, maximumFractionDigits: k });

  return quoten.slice(0, anzahl).map((q) => ({
    kennung: kennungAus(redaktionsKategorie, "heizung", q.name),
    orte: [q.name],
    evergreen: false,
    muster: "heizungsfoerderung" as const,
    kategorie: redaktionsKategorie,
    satz: `In ${q.name} wurden ${jahr} ${q.anzahl.toLocaleString("de-DE")} Heizungsförderungen zugesagt, ${zahl(q.volumen)} Mio Euro — je 1.000 Einwohner ${zahl(q.jeTausend)}, gegenüber ${zahl(median)} im Mittel aller Kreise.`,
    staerke: q.jeTausend / Math.max(0.001, median),
    werte: [
      { name: q.name, wert: Number(q.jeTausend.toFixed(2)), einheit: "jeTausend" },
      { name: "Mittel aller Kreise", wert: Number(median.toFixed(2)), einheit: "jeTausend" },
    ],
    grundlage: `„Heizungsförderung" ist NICHT „Wärmepumpe" — auf Kreisebene ist nicht nach Technik aufgeschlüsselt, und die kursierende Bundesquote auf einen Kreis anzuwenden hieße, eine Annahme in die Zahl hineinzurechnen. Eine Zusage ist außerdem keine Anlage: Zwischen Zusage und Einbau liegen Monate, ein Teil wird nie abgerufen. Kreise unter ${mindestZusagen} Zusagen bleiben draußen, weil Werte unter zehn in der Quelle unterdrückt sind und eine Summe damit zu niedrig ausfiele. ${quoten.length} Kreise verglichen.`,
  }));
}

/**
 * G15.1 — Was nicht gebaut wurde: die Wohnform.
 *
 * „Auf Mehrfamilienhäusern steht praktisch nichts."
 *
 * DER KATALOGSATZ, WIE ER DORT STEHT, IST NICHT BELEGBAR — und das ist der
 * wichtigste Teil dieses Musters. Er lautet: „X Prozent der Wohnungen liegen in
 * Gebäuden, auf denen wir Y Prozent der privaten Solarleistung finden." Das
 * verlangt eine Zuordnung Anlage → Gebäudetyp, und die gibt es nicht: Das
 * Anlagenregister nennt eine Gemeinde und eine Leistung, nie das Gebäude
 * darunter. Wer das Y trotzdem hinschreibt, hat es erfunden.
 *
 * Belegbar ist der Vergleich über Gemeinden: Wo die Wohnungen überwiegend in
 * großen Gebäuden liegen, steht weniger private Solarleistung je Wohnung. Das
 * ist eine schwächere Aussage als der Katalogsatz und eine ehrliche — sie zeigt
 * denselben Befund, ohne eine Zuordnung zu behaupten.
 *
 * Der NENNER ist die Wohnung, nicht der Einwohner: Gefragt ist, wie viel
 * Solarleistung auf ein Zuhause kommt, und in einer Stadt wohnen mehr Menschen
 * je Dach.
 */
export function findeWohnform(
  gemeinden: GemeindeStats[],
  wohnungen: (regionId: string) => { gesamt: number; mehrfamilie: number } | null,
  redaktionsKategorie: string,
  opts: { mindestWohnungen?: number; mindestGruppe?: number } = {},
): Fund[] {
  const mindestWohnungen = opts.mindestWohnungen ?? 500;
  const mindestGruppe = opts.mindestGruppe ?? MIN_GRUPPE;

  type Ort = { name: string; anteil: number; jeWohnung: number };
  const orte: Ort[] = [];
  for (const g of gemeinden) {
    const w = g.regionId ? wohnungen(g.regionId) : null;
    if (!w || w.gesamt < mindestWohnungen) continue;
    const kwp = g.privatDachKwp ?? 0;
    if (!(kwp > 0)) continue;
    orte.push({
      name: g.name,
      anteil: (w.mehrfamilie / w.gesamt) * 100,
      // In Watt, damit die Zahl im Satz ohne Nachkommastellen lesbar ist.
      jeWohnung: (kwp * 1000) / w.gesamt,
    });
  }
  if (orte.length < mindestGruppe * 4) return [];

  // Fünftel statt Hälften: Der Unterschied liegt nicht zwischen „viel" und
  // „wenig", sondern an den Enden — die Mitte verwischt ihn.
  const sortiert = [...orte].sort((a, b) => a.anteil - b.anteil);
  const fuenftel = Math.floor(sortiert.length / 5);
  if (fuenftel < mindestGruppe) return [];
  const wenig = sortiert.slice(0, fuenftel);
  const viel = sortiert.slice(-fuenftel);

  const medianWenig = medianVon(wenig.map((o) => o.jeWohnung));
  const medianViel = medianVon(viel.map((o) => o.jeWohnung));
  if (!(medianWenig > 0) || !(medianViel > 0)) return [];

  const faktor = medianWenig / medianViel;
  if (faktor < 1.3) return [];

  const zahl = (n: number) => Math.round(n).toLocaleString("de-DE");
  return [
    {
      kennung: kennungAus(redaktionsKategorie, "wohnform", "solarleistung-je-wohnung"),
      evergreen: true,
      muster: "wohnform",
      kategorie: redaktionsKategorie,
      satz: `In den Orten, wo die meisten Wohnungen im Einfamilienhaus liegen, stehen ${zahl(medianWenig)} Watt private Solarleistung je Wohnung auf den Dächern — wo Mehrfamilienhäuser überwiegen, sind es ${zahl(medianViel)}.`,
      staerke: faktor,
      werte: [
        { name: "wenig Mehrfamilienhäuser", wert: Math.round(medianWenig), einheit: "wattJeWohnung" },
        { name: "viele Mehrfamilienhäuser", wert: Math.round(medianViel), einheit: "wattJeWohnung" },
      ],
      grundlage: `Verglichen werden die äußeren Fünftel von ${orte.length.toLocaleString("de-DE")} Gemeinden mit mindestens ${mindestWohnungen.toLocaleString("de-DE")} Wohnungen, je Gruppe der Median. Nenner ist die WOHNUNG, nicht der Einwohner — in der Stadt wohnen mehr Menschen je Dach. „Mehrfamilienhaus" heißt hier: Gebäude mit drei oder mehr Wohnungen (Zensus 2022, Stichtag 15.05.2022). Was die Zahlen NICHT hergeben: welche Anlage auf welchem Gebäudetyp steht — das Anlagenregister nennt eine Gemeinde und eine Leistung, nie das Gebäude darunter.`,
    },
  ];
}

/**
 * G10.1 — Die Anomalie als offene Frage.
 *
 * „In [Ort] wurden [2021] innerhalb von drei Monaten [140] Balkonkraftwerke
 * angemeldet. In den fünf Nachbargemeinden zusammen: [drei]. Weiß jemand, was
 * da los war?"
 *
 * DAS EINZIGE MUSTER, DAS MIT EINER FRAGE ENDET — und das ist keine Koketterie:
 * Wir wissen die Antwort nicht. Ein Schub in einem Ort kann eine
 * Sammelbestellung sein, ein Zeitungsartikel, eine Wohnungsgenossenschaft oder
 * ein neues Baugebiet; sie zu erraten hieße, eine Ursache zu behaupten, die in
 * keinem Datensatz steht. Der Katalog rechnet ausdrücklich damit, dass die
 * Antwort aus den Kommentaren kommt und der nächste Post wird.
 *
 * NUR NACH OBEN. Ein negativer Ausschlag wäre eine Bloßstellung — dieselbe
 * Schranke wie beim Ausreißer.
 *
 * Der Vergleich läuft gegen den ORT SELBST, nicht gegen andere: Gesucht ist
 * nicht „wo passiert viel", sondern „wo passiert plötzlich viel". Eine Stadt
 * mit dauerhaft hohem Zubau ist keine Anomalie, sie ist eine Stadt.
 */
export type MonatsZeile = { regionId: string; monat: string; count: number };

/** „2026-09" minus n Monate — als Vergleichsschwelle, nicht als Datum. */
function monatVor(monat: string, n: number): string {
  const [j, m] = monat.split("-").map(Number);
  const gesamt = j * 12 + (m - 1) - n;
  return `${Math.floor(gesamt / 12)}-${String((gesamt % 12) + 1).padStart(2, "0")}`;
}

export function findeAnomalie(
  zeilen: MonatsZeile[],
  name: (regionId: string) => string | null,
  redaktionsKategorie: string,
  thema: string,
  opts: {
    fenster?: number;
    mindestMenge?: number;
    mindestFaktor?: number;
    anzahl?: number;
    reifeMonate?: number;
    /**
     * Der laufende Monat — alles ab hier gilt als unfertig.
     *
     * AUS DEM KALENDER, NICHT AUS DEN DATEN. Die erste Fassung schnitt die
     * letzten drei EINTRÄGE der Monatsliste ab; steht der laufende Monat noch
     * mit keiner Anlage in der Tabelle, fehlt er dort, und der Schnitt entfernt
     * drei abgeschlossene Monate und lässt den unfertigen stehen. Dieselbe
     * Falle, an der der Saisonvergleich zweimal gescheitert ist, bevor der
     * Stichtag von außen kam.
     */
    heuteMonat?: string;
    /**
     * Gab es in diesem Ort zu dieser Zeit ein Förderprogramm?
     *
     * WER DIE ANTWORT KENNT, DARF NICHT FRAGEN. „Weiß jemand, was da los war?"
     * ist eine echte Frage, solange wir es nicht wissen — steht die Ursache in
     * unserem eigenen Förderkatalog, wäre sie eine Inszenierung, und die erste
     * Antwort in den Kommentaren macht sie öffentlich sichtbar.
     *
     * Der Katalog kennt heute 110 von 11.000 Gemeinden: Ein Treffer beweist
     * etwas, ein Fehlen beweist nichts. Deshalb schließt ein Treffer den Fund
     * aus, und das Fehlen ändert am Satz nichts.
     */
    foerderungBekannt?: (regionId: string, vonMonat: string, bisMonat: string) => boolean;
  } = {},
): Fund[] {
  const fenster = opts.fenster ?? 3;
  // Unter dieser Zahl ist ein Schub kein Ereignis, sondern eine Handvoll
  // Nachbarn — und der Faktor entsteht dann allein im kleinen Nenner.
  const mindestMenge = opts.mindestMenge ?? 25;
  const mindestFaktor = opts.mindestFaktor ?? 4;
  const anzahl = opts.anzahl ?? 5;
  // EIN MONAT IST NICHT FERTIG, WENN ER VORBEI IST — und das ist gemessen,
  // nicht befürchtet. Über 443.134 Solaranlagen der letzten zwei Jahre, aus dem
  // Abstand zwischen Inbetriebnahme und Registrierung (02.09.2026):
  //
  //   Median 4 Tage — aber die Verteilung hat einen langen Schwanz:
  //   nach  30 Tagen im Register: 81,6 %
  //   nach  60 Tagen: 88,7 %
  //   nach  90 Tagen: 91,8 %
  //   nach 180 Tagen: 96,2 %
  //
  // Wer über den Vormonat schreibt, schreibt über eine Zahl, der ein Fünftel
  // fehlt — und im nächsten Export steht eine andere da. Drei Monate Karenz
  // sind der Ausgleich: Bei 92 % trägt ein Ausschlag um das Vierfache immer
  // noch, ein halbes Jahr Karenz wäre genauer und die Geschichte alt.
  //
  // Die verbleibenden 8 Prozent stehen in der Grundlage, statt weggelassen zu
  // werden: Die genannte Menge ist eine Untergrenze, keine Endzahl.
  const reifeMonate = opts.reifeMonate ?? 3;

  const proOrt = new Map<string, Map<string, number>>();
  const alleMonate = new Set<string>();
  for (const z of zeilen) {
    alleMonate.add(z.monat);
    const m = proOrt.get(z.regionId) ?? new Map<string, number>();
    m.set(z.monat, (m.get(z.monat) ?? 0) + z.count);
    proOrt.set(z.regionId, m);
  }
  const monate = [...alleMonate].sort();
  if (monate.length < fenster + reifeMonate + 6) return [];
  // Der jüngste Monat, der als fertig gilt: `reifeMonate` vor dem laufenden.
  // Ohne Stichtag bleibt es beim Abschneiden der letzten Einträge — schlechter,
  // aber besser als gar keine Karenz.
  const reif = opts.heuteMonat
    ? monate.filter((m) => m < monatVor(opts.heuteMonat!, reifeMonate))
    : monate.slice(0, monate.length - reifeMonate);
  if (reif.length < fenster + 6) return [];

  type Treffer = {
    ort: string;
    von: string;
    bis: string;
    menge: number;
    ueblich: number;
    faktor: number;
  };
  const treffer: Treffer[] = [];

  for (const [regionId, reihe] of proOrt) {
    const ort = name(regionId);
    if (!ort) continue;
    const gefoerdert = opts.foerderungBekannt;
    const werte = reif.map((m) => reihe.get(m) ?? 0);
    const gesamt = werte.reduce((a, b) => a + b, 0);
    if (gesamt < mindestMenge) continue;

    for (let i = 0; i + fenster <= werte.length; i++) {
      const menge = werte.slice(i, i + fenster).reduce((a, b) => a + b, 0);
      if (menge < mindestMenge) continue;
      // Verglichen wird mit dem üblichen Fenster DESSELBEN Orts — der Median
      // über alle übrigen Fenster, damit der Ausschlag sich nicht selbst in
      // seinen Vergleichswert hineinrechnet.
      const andere: number[] = [];
      for (let j = 0; j + fenster <= werte.length; j++) {
        if (j >= i - fenster + 1 && j <= i + fenster - 1) continue;
        andere.push(werte.slice(j, j + fenster).reduce((a, b) => a + b, 0));
      }
      if (andere.length < 4) continue;
      const ueblich = medianVon(andere);
      // Ein Ort, der sonst NICHTS baut, ergäbe eine Division durch null und
      // damit einen unendlichen Faktor. Der Vergleichswert bekommt deshalb eine
      // Untergrenze von eins: „aus dem Nichts" ist erzählenswert, „unendlich
      // mal so viel" ist keine Zahl.
      const basis = Math.max(1, ueblich);
      const faktor = menge / basis;
      if (faktor < mindestFaktor) continue;
      // NUR DIESES FENSTER, nicht den ganzen Ort: Ein Programm, das 2024
      // lief, erklärt keinen Ausschlag von 2026. Die erste Fassung brach
      // hier die Schleife ab und verwarf damit auch spätere, förderfreie
      // Ausschläge desselben Orts.
      if (gefoerdert?.(regionId, reif[i], reif[i + fenster - 1])) continue;
      treffer.push({
        ort,
        von: reif[i],
        bis: reif[i + fenster - 1],
        menge,
        ueblich: Math.round(ueblich),
        faktor,
      });
      break; // Je Ort der stärkste Ausschlag, nicht jedes überlappende Fenster.
    }
  }

  const monatsName = (m: string) => {
    const [j, mo] = m.split("-");
    const namen = [
      "Januar", "Februar", "März", "April", "Mai", "Juni",
      "Juli", "August", "September", "Oktober", "November", "Dezember",
    ];
    return `${namen[Number(mo) - 1] ?? mo} ${j}`;
  };

  return treffer
    .sort((a, b) => b.faktor - a.faktor)
    .slice(0, anzahl)
    .map((t) => ({
      kennung: kennungAus(redaktionsKategorie, "anomalie", t.ort, t.von),
      orte: [t.ort],
      evergreen: false,
      muster: "anomalie" as const,
      kategorie: redaktionsKategorie,
      satz: `In ${t.ort} gingen zwischen ${monatsName(t.von)} und ${monatsName(t.bis)} ${t.menge.toLocaleString("de-DE")} ${thema} ans Netz — sonst sind es dort ${t.ueblich} in drei Monaten. Weiß jemand, was da los war?`,
      staerke: t.faktor,
      werte: [
        { name: "in diesen drei Monaten", wert: t.menge, einheit: "anzahl" },
        { name: "sonst in drei Monaten", wert: t.ueblich, einheit: "anzahl" },
      ],
      grundlage: `Verglichen wird der Ort mit SICH SELBST — der Median aller übrigen Dreimonatsfenster, ohne die Nachbarfenster des Ausschlags. Gesucht ist nicht „wo passiert viel", sondern „wo passiert plötzlich viel". Nur nach oben: Ein Einbruch wäre eine Bloßstellung. Die jüngsten ${reifeMonate} Monate bleiben draußen, weil Anlagen nach der Inbetriebnahme registriert werden: Gemessen an 443.134 Anlagen stehen nach 30 Tagen erst 82 Prozent eines Monats im Register, nach 90 Tagen 92. Auch die genannte Menge ist deshalb eine Untergrenze — sie wächst noch leicht nach. Der Satz nennt bewusst keine Ursache — Sammelbestellung, Zeitungsartikel oder Neubaugebiet stehen in keinem Datensatz. Orte, für die unser Förderkatalog zu dieser Zeit ein Programm kennt, sind ausgenommen: Wer die Antwort kennt, darf nicht fragen. Der Katalog deckt allerdings erst einen Bruchteil der Gemeinden ab — ein Treffer beweist etwas, sein Fehlen nichts.`,
    }));
}

/**
 * Ein Ortsname, der nur einen Ort meint.
 *
 * „In Lichtenau gingen 27 Balkonkraftwerke ans Netz" — es gibt VIER Gemeinden
 * dieses Namens (Nordrhein-Westfalen, Baden-Württemberg, Bayern, Sachsen), und
 * der Satz meint eine davon. Dieselbe Falle wie im Ortsverzeichnis, wo jeder
 * achtstellige Eintrag seinen Kreis mitnennen muss; hier fiel sie auf, weil
 * derselbe Lauf zweimal ein „Fürfeld" mit verschiedenen Zahlen zeigte.
 *
 * Der Zusatz kommt NUR, wo er gebraucht wird: „Berlin (Berlin)" wäre lächerlich
 * und macht aus einer Klarstellung eine Marotte.
 */
export function ortsnamen(
  orte: { regionId?: string; name: string }[],
  kreisName: (kreisId: string) => string | null,
): (regionId: string) => string | null {
  const zahl = new Map<string, number>();
  for (const o of orte) zahl.set(o.name, (zahl.get(o.name) ?? 0) + 1);

  const namen = new Map<string, string>();
  for (const o of orte) {
    if (!o.regionId) continue;
    if ((zahl.get(o.name) ?? 0) < 2) {
      namen.set(o.regionId, o.name);
      continue;
    }
    const kreis = o.regionId.length >= 5 ? kreisName(o.regionId.slice(0, 5)) : null;
    // Ohne Kreisnamen lieber gar keinen Ort nennen als den falschen: Ein Satz
    // über „Lichtenau" ohne Zusatz behauptet gegenüber drei anderen Lichtenaus
    // etwas, das dort nicht stimmt.
    namen.set(o.regionId, kreis ? `${o.name} (${kreis})` : "");
  }
  return (regionId: string) => namen.get(regionId) || null;
}

/**
 * Aus Wörtern einen lesbaren Schlüssel machen.
 *
 * Nur die Schreibweise, nicht die Auswahl: WELCHE Wörter einen Fund ausmachen,
 * entscheidet der Finder — siehe `Fund.kennung`. Lesbar und nicht bloß
 * eindeutig, weil die Kennung in einem Zuruf funktionieren muss; eine
 * Prüfsumme wäre kürzer und dafür unbrauchbar.
 */
export function kennungAus(kategorie: string, muster: string, ...teile: string[]): string {
  const wort = teile
    .join(" ")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${kategorie}-${muster}-${wort || "fund"}`.slice(0, 90);
}

/**
 * Wie oft ein Muster Nachschub liefert — der Takt, in dem es sich zu ernten
 * lohnt.
 *
 * NICHT ZU VERWECHSELN MIT DER HALTBARKEIT: Die sagt, wie lange ein EINZELNER
 * Fund trägt, der Takt, wie oft das MUSTER etwas Neues hergibt. Beides zusammen
 * ergibt den Redaktionsplan: Was wöchentlich nachwächst und schnell kalt wird,
 * gehört zeitnah raus; was jährlich nachwächst und über Jahre trägt, füllt die
 * Lücken dazwischen.
 *
 * Die Werte stehen im Story-Katalog je Muster als Prosa („Takt: quartalsweise").
 * Hier stehen sie als Angabe, mit der sich rechnen lässt — dieselbe Systematik
 * wie bei den Stufen und Fristen: Was an zwei Stellen steht, driftet.
 */
export type Takt = "woechentlich" | "monatlich" | "quartalsweise" | "jaehrlich";

export const TAKT_LABEL: Record<Takt, string> = {
  woechentlich: "wöchentlich",
  monatlich: "monatlich",
  quartalsweise: "quartalsweise",
  jaehrlich: "jährlich",
};

export const MUSTER_TAKT: Record<MusterArt, Takt> = {
  // Jede Woche eine neue Kalenderwoche, jede mit elf Vergleichsjahren.
  saison: "woechentlich",
  // Läuft mit den Monatsdaten mit: jede Woche können neue Ausschläge dazukommen.
  anomalie: "woechentlich",
  // Der Förderreport erscheint quartalsweise.
  heizungsfoerderung: "quartalsweise",
  // Der Anlagenbestand wird monatlich neu geladen; Ausreißer und Ranglisten
  // bewegen sich damit, wenn auch selten stark.
  ausreisser: "monatlich",
  topliste: "monatlich",
  david: "monatlich",
  aufholer: "monatlich",
  // Strukturbefunde über Gruppen ändern sich langsam — sie öfter zu ernten
  // liefert denselben Fund noch einmal.
  kontrast: "quartalsweise",
  umkehrung: "quartalsweise",
  flaechenmix: "quartalsweise",
  // Der Förderkatalog wird laufend gepflegt, die Lücken darin ändern sich
  // trotzdem nur langsam.
  foerderluecke: "quartalsweise",
  // Jahrgänge und Wohnungsbestand: einmal im Jahr.
  kohorte: "jaehrlich",
  wohnform: "jaehrlich",
};

/**
 * Diese Woche gegen dieselbe Woche der Vorjahre.
 *
 * „In der KW 36 lieferte Solar 38 Prozent des Stroms — der höchste Wert für
 * eine KW 36 seit Beginn der Reihe 2015."
 *
 * DER JAHRESVERGLEICH IST DER EINZIGE, DER BEI WETTERDATEN TRÄGT. Solar gegen
 * den Vormonat zu stellen misst die Jahreszeit, nicht die Entwicklung: Im
 * September ist es immer weniger als im Juli, in jedem Jahr, überall. Erst
 * dieselbe Woche über mehrere Jahre hält die Jahreszeit fest und lässt sehen,
 * was sich wirklich verändert hat.
 *
 * DER ANTEIL, NICHT DIE MENGE. Eine erzeugte Menge wächst mit dem Zubau und
 * schlägt deshalb fast jedes Jahr einen Rekord — das wäre eine Meldung ohne
 * Aussage. Der Anteil an der Last sagt, wie viel vom Verbrauch gedeckt war,
 * und der kann auch fallen.
 *
 * NUR AM RAND DER REIHE. Ein Wert im Mittelfeld ist keine Geschichte („der
 * viertbeste Wert seit 2015" liest niemand); erzählenswert ist der Höchst- oder
 * Tiefstwert, und nur mit genug Vergleichsjahren dahinter.
 */
export type WochenZeile = {
  jahr: number;
  woche: number;
  wert: number;
  last: number;
};

export function findeSaison(
  zeilen: WochenZeile[],
  redaktionsKategorie: string,
  thema: string,
  opts: { mindestJahre?: number; nurLetzte?: number; heute?: { jahr: number; woche: number } } = {},
): Fund[] {
  // Unter dieser Zahl trägt „seit Beginn der Reihe" nicht: Ein Höchstwert unter
  // vier Jahren ist keiner, sondern eine Beobachtung über vier Zahlen.
  const mindestJahre = opts.mindestJahre ?? 6;
  // Nur die zuletzt abgeschlossenen Wochen: Eine Woche, die zwei Monate
  // zurückliegt, ist als „diese Woche" keine Meldung mehr.
  const nurLetzte = opts.nurLetzte ?? 3;

  const jeWoche = new Map<number, WochenZeile[]>();
  for (const z of zeilen) {
    if (!(z.last > 0)) continue;
    const bisher = jeWoche.get(z.woche);
    if (bisher) bisher.push(z);
    else jeWoche.set(z.woche, [z]);
  }

  // WELCHE WOCHE LÄUFT NOCH? Das sagt der Kalender, nicht die Reihe.
  //
  // Zwei Anläufe sind daran gescheitert, es aus den Daten zu erraten: Erst
  // „immer die jüngste überspringen" — das trifft die laufende Woche nur, wenn
  // sie überhaupt schon eine Zeile hat. Dann „nur Wochen mit Daten, davon die
  // jüngste überspringen" — das übersprang die jüngste VOLLSTÄNDIGE, sobald
  // die laufende noch gar nicht in der Reihe stand. Beide Male sah das Ergebnis
  // plausibel aus; gefangen hat es erst ein Test.
  //
  // Eine halb erhobene Woche ist von einer schwachen nicht zu unterscheiden —
  // beide zeigen wenig. Deshalb kommt der Stichtag von außen.
  const letztesJahr = Math.max(...zeilen.map((z) => z.jahr));
  const heute = opts.heute;
  const laeuftNoch = (jahr: number, woche: number) =>
    heute !== undefined && jahr === heute.jahr && woche >= heute.woche;

  const wochenDesJahres = zeilen
    .filter((z) => z.jahr === letztesJahr && z.last > 0 && !laeuftNoch(z.jahr, z.woche))
    .map((z) => z.woche)
    .sort((a, b) => b - a);
  const kandidaten = wochenDesJahres.slice(0, nurLetzte);

  const funde: Fund[] = [];
  for (const woche of kandidaten) {
    const reihe = jeWoche.get(woche) ?? [];
    if (reihe.length < mindestJahre) continue;
    const jetzt = reihe.find((z) => z.jahr === letztesJahr);
    if (!jetzt) continue;

    const anteil = (z: WochenZeile) => (z.wert / z.last) * 100;
    const jetztAnteil = anteil(jetzt);
    const vorher = reihe.filter((z) => z.jahr !== letztesJahr);
    const hoechster = jetztAnteil > Math.max(...vorher.map(anteil));
    const tiefster = jetztAnteil < Math.min(...vorher.map(anteil));
    if (!hoechster && !tiefster) continue;

    const ab = Math.min(...reihe.map((z) => z.jahr));
    const zweitbester = [...vorher].sort((a, b) =>
      hoechster ? anteil(b) - anteil(a) : anteil(a) - anteil(b),
    )[0];
    const zahl = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

    funde.push({
      kennung: kennungAus(redaktionsKategorie, "saison", thema, `kw${woche}`),
      // Der Vergleich hält die Jahreszeit fest und misst, was sich wirklich
      // bewegt hat — er trägt deshalb über Jahre, obwohl er eine Woche nennt.
      // Als MELDUNG ist er trotzdem zeitgebunden: „diese Woche" ist in einem
      // Monat niemandes Woche mehr.
      evergreen: false,
      muster: "saison",
      kategorie: redaktionsKategorie,
      satz: `In der KW ${woche} deckte ${thema} ${zahl(jetztAnteil)} Prozent des deutschen Stromverbrauchs — der ${hoechster ? "höchste" : "niedrigste"} Wert für eine KW ${woche} seit ${ab}. Bisheriger ${hoechster ? "Höchstwert" : "Tiefstwert"}: ${zahl(anteil(zweitbester))} Prozent ${zweitbester.jahr}.`,
      staerke: Math.abs(jetztAnteil - anteil(zweitbester)),
      werte: [
        { name: `KW ${woche} ${letztesJahr}`, wert: Number(jetztAnteil.toFixed(1)), einheit: "prozent" },
        {
          name: `KW ${woche} ${zweitbester.jahr}`,
          wert: Number(anteil(zweitbester).toFixed(1)),
          einheit: "prozent",
        },
      ],
      grundlage: `Verglichen wird DIESELBE Kalenderwoche über ${reihe.length} Jahre (ab ${ab}) — gegen den Vormonat gemessen wäre es die Jahreszeit und nicht die Entwicklung: Im September ist es immer weniger als im Juli, in jedem Jahr. Und gemessen wird der ANTEIL am Verbrauch, nicht die erzeugte Menge: Die wächst mit dem Zubau und schlägt fast jedes Jahr einen Rekord, was eine Meldung ohne Aussage wäre. Die zuletzt erhobene Woche bleibt draußen, weil ihre Erhebung noch läuft.`,
    });
  }
  return funde;
}
