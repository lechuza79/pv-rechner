/**
 * Auslesen des KfW-Förderreports — die reine Textarbeit, ohne Dateien und ohne
 * Datenbank.
 *
 * Der Bericht ist ein PDF von rund 1.230 Seiten je Jahrgang. Aus ihm holen wir
 * genau drei Tabellen:
 *
 *   1. „Neuzusagen Inlandsfinanzierung auf Programmebene" — die Bundeswerte.
 *      Sie sind nicht der Ertrag, sondern das MESSGERÄT: Gegen sie wird
 *      geprüft, ob das Auslesen der Kreistabelle vollständig war.
 *   2. „Landkreise nach Bundesländern" — je Kreis und Programm Anzahl der
 *      Zusagen und Volumen.
 *   3. „Förderschwerpunkte auf Programmebene nach Verwendungszwecken" — je
 *      Programm die Aufschlüsselung nach Boni. Nur auf Bundesebene; eine
 *      Kreuztabelle Verwendungszweck × Region gibt es im Bericht nicht.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WARUM DAS AUFWENDIGER IST, ALS ES AUSSIEHT — die drei Fallen, alle gemessen
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 1. PROGRAMMNAMEN BRECHEN UM, UND ZWAR UM DIE ZAHLEN HERUM. Ein Name, der zu
 *    lang für die Spalte ist, steht auf zwei Zeilen — und die Zahlen sitzen
 *    senkrecht zentriert, also auf der Zeile DAZWISCHEN:
 *
 *        BEG WG - EM Ergänzungskr. Plus Priv. -
 *                                                    38      1,8
 *        Selbstn
 *
 *    Ein Parser, der Zeile für Zeile liest, sieht eine Zeile ohne Namen und
 *    zwei ohne Zahlen. Er verliert die Zeile — und meldet trotzdem Erfolg.
 *    Deshalb wird hier NICHT zeilenweise gelesen, sondern spaltenweise: Der
 *    Kopf jeder Seite verrät, wo die Spalte „Programm" anfängt, und der Name
 *    einer Zeile wird aus allen Textstücken dieser Spalte zusammengesetzt, die
 *    unmittelbar vor und nach der Zahlenzeile stehen.
 *
 * 2. EIN KREIS KANN ÜBER MEHRERE SEITEN LAUFEN — und auf der Folgeseite steht
 *    sein Name NICHT noch einmal, nur das Bundesland. Wer den Kreis nicht über
 *    den Seitenumbruch mitführt, ordnet dessen zweite Hälfte niemandem zu.
 *
 * 3. DIE UNTERDRÜCKUNG TRIFFT NUR DIE ANZAHL, NIE DAS VOLUMEN. Eine Anzahl
 *    unter zehn steht als „*" da (Fußnote 2 des Berichts: „Eine Anzahl kleiner
 *    10 wird aus Datenschutzgründen nicht dargestellt."). Genau das macht die
 *    Kontrollsumme überhaupt erst möglich: Die Volumina sind lückenlos, also
 *    MUSS ihre Summe über alle Kreise den Bundeswert treffen. Tut sie es
 *    nicht, hat das Auslesen etwas verloren.
 *
 * Die Unterdrückung wird hier als `null` übernommen und NIE zurückgerechnet
 * (siehe {@link ANZAHL_SCHWELLE}).
 */

/** Ab dieser Anzahl weist die KfW eine Zelle aus; darunter steht „*". */
export const ANZAHL_SCHWELLE = 10;

/** Die 16 Bundesländer, wie der Bericht sie schreibt. */
const BUNDESLAND_NAMEN = new Set([
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
]);

export type Zelle = {
  /** Anzahl der Zusagen — `null`, wenn die KfW sie unterdrückt hat („*"). */
  anzahl: number | null;
  /** Volumen in Mio. €. Lückenlos, auch wo die Anzahl fehlt. */
  volumenMio: number;
};

export type KreisZeile = Zelle & {
  bundesland: string;
  kreis: string;
  programm: string;
};

export type VwzZeile = Zelle & {
  programm: string;
  verwendungszweck: string;
};

export type ReportDaten = {
  jahr: number;
  /** Stichtag des Jahrgangs, ISO. Jeder Jahrgang hat seinen eigenen. */
  stichtagIso: string;
  /** Bundeswerte je Programm — das Messgerät für die Kontrollsumme. */
  bund: Map<string, Zelle>;
  /** Bundesland → Programm → Zelle. Zweite Kontrollebene, lokalisiert Fehler. */
  laender: Map<string, Map<string, Zelle>>;
  kreise: KreisZeile[];
  verwendungszwecke: VwzZeile[];
  /** Zeilen der Verwendungszweck-Tabelle, die nicht ins Raster passten. */
  vwzVerworfen: number;
};

/* ───────────────────────── Zahlen und Zeilen ───────────────────────── */

/**
 * Deutsche Zahl aus dem Bericht. „*" = unterdrückt, „-" = nichts.
 *
 * Bewusst streng: Alles, was weder Zahl noch eines der beiden Zeichen ist,
 * wirft. Ein stillschweigendes 0 wäre hier die teuerste Antwort — es sähe aus
 * wie „in diesem Kreis wurde nichts gefördert".
 */
export function zahl(roh: string): number | null {
  const s = roh.trim();
  if (s === "*") return null;
  if (s === "-") return 0;
  if (!/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
    throw new Error(`Unlesbare Zahl im Bericht: ${JSON.stringify(roh)}`);
  }
  return Number(s.replace(/\./g, "").replace(",", "."));
}

/**
 * Zerlegt eine Zeile in Textteil und Zahlenspalten.
 *
 * `spalten` sagt, wie viele Zahlenspalten die Tabelle hat: zwei (Anzahl,
 * Mio. €) oder drei — der Jahrgang 2024 führt zusätzlich „gef. Wohneinheiten".
 * Die Spalte wird gelesen und verworfen; sie gibt es nur 2024, und eine Reihe
 * über zwei Jahrgänge, von denen einer die Spalte gar nicht kennt, wäre keine.
 */
function zerlege(zeile: string, spalten: number): { kopf: string; werte: string[] } | null {
  const zahlTeil = String.raw`(?:\*|-|\d{1,3}(?:\.\d{3})*(?:,\d+)?)`;
  const re = new RegExp(`^(.*?)${`\\s{2,}(${zahlTeil})`.repeat(spalten)}\\s*$`);
  const m = zeile.match(re);
  if (!m) return null;
  return { kopf: m[1], werte: m.slice(2, 2 + spalten) };
}

/* ───────────────────────── Seiten ───────────────────────── */

type Seite = {
  zeilen: string[];
  /** Spaltenanfang „Programm" im Kopf dieser Seite. */
  progStart: number;
  /** Index der Kopfzeile. */
  kopfIndex: number;
  /** Zahl der Wertspalten dieser Tabelle. */
  spalten: number;
};

/**
 * Findet den Tabellenkopf einer Seite und daraus die Spaltenanfänge.
 *
 * Die Spaltenpositionen ändern sich zwischen den Jahrgängen und zwischen den
 * Abschnitten. Sie werden deshalb je Seite aus dem Kopf abgeleitet und nirgends
 * als Konstante hinterlegt — eine getippte Spaltennummer wäre genau die Sorte
 * Zahl, die beim nächsten Jahrgang still danebenliegt.
 */
function kopfLesen(zeilen: string[]): Seite | null {
  // Der Kopf steht je nach Jahrgang auf EINER oder auf DREI Zeilen: 2025 trägt
  // eine Zeile alle Überschriften, 2024 zieht „Anzahl", „Mio. €" und „gef.
  // Wohneinheiten" auf eigene Zeilen darüber und darunter. Deshalb wird der
  // Kopf als BLOCK gesucht und die letzte seiner Zeilen als Ende genommen —
  // sonst landet „Anzahl 1,2,4)" im Namen der ersten Datenzeile.
  const fenster = Math.min(zeilen.length, 14);
  let progZeile = -1;
  for (let i = 0; i < fenster; i++) {
    const z = zeilen[i];
    const p = z.indexOf("Programm");
    if (p < 0) continue;
    // Links davon darf nur stehen, was zum Kopf gehört.
    const links = z.slice(0, p).trim();
    if (links && !/^(Geschäftsfeld|Geschäftssegment|Förderschwerpunkt|\s)+$/.test(links.replace(/\s{2,}/g, " "))) continue;
    progZeile = i;
    break;
  }
  if (progZeile < 0) return null;

  const kopfBlock = zeilen.slice(0, fenster);
  let kopfIndex = progZeile;
  for (let i = progZeile; i < fenster; i++) {
    if (zeilen[i].includes("Mio.") || zeilen[i].includes("Anzahl")) kopfIndex = i;
    else if (zeilen[i].trim() === "") break;
  }
  const spalten = kopfBlock.some((z) => z.includes("Wohneinheiten")) ? 3 : 2;
  return { zeilen, progStart: zeilen[progZeile].indexOf("Programm"), kopfIndex, spalten };
}

/** Text in der Programm-Spalte dieser Zeile. */
function progText(zeile: string, progStart: number): string {
  return zeile.length > progStart ? zeile.slice(progStart).trim() : "";
}

/**
 * Sammelt die Datenzeilen einer Seite und setzt umgebrochene Namen zusammen.
 *
 * `bekannt` ist das Vokabular der Programmnamen aus der Bundestabelle. Es ist
 * die Notbremse gegen die Falle Nr. 1: Wenn das gierige Zusammensetzen zwei
 * Zeilen verschmilzt, die nicht zusammengehören, entsteht ein Name, den es im
 * Bericht nicht gibt — und dann wird die kürzere Lesart genommen. Ohne dieses
 * Vokabular (beim Lesen der Bundestabelle selbst) wird gierig gelesen; dort
 * steht jedes Programm genau einmal, Verschmelzungen fielen in der
 * Vollständigkeitsprüfung auf.
 */
function zeilenDerSeite(
  seite: Seite,
  bekannt: Set<string> | null,
): { kopf: string; name: string; werte: string[]; zeileIdx: number }[] {
  const raus: { kopf: string; name: string; werte: string[]; zeileIdx: number }[] = [];
  const { zeilen, progStart, spalten } = seite;
  let vorlauf: string[] = [];

  for (let i = seite.kopfIndex + 1; i < zeilen.length; i++) {
    const z = zeilen[i];
    // Fußnoten und Seitenzahl beenden die Tabelle.
    if (/^\s*\d\)\s/.test(z) || /^\s*\d+\s*\/\s*\d+\s*$/.test(z)) break;

    const teile = zerlege(z, spalten);
    if (!teile) {
      const t = progText(z, progStart);
      if (t) vorlauf.push(t);
      else if (z.trim() === "") vorlauf = [];
      continue;
    }

    const eigen = progText(teile.kopf, progStart);
    const basis = [...vorlauf, eigen].filter(Boolean);
    vorlauf = [];

    // Nachlauf: Fortsetzungen des Namens UNTER der Zahlenzeile. Höchstens zwei
    // — mehr Umbrüche hat kein Name im Bericht, und je Zeile mehr wächst die
    // Gefahr, den Anfang der nächsten Zeile einzusammeln.
    const nach: string[] = [];
    for (let j = i + 1; j < zeilen.length && nach.length < 2; j++) {
      if (zeilen[j].trim() === "") break;
      if (zerlege(zeilen[j], spalten)) break;
      const t = progText(zeilen[j], progStart);
      if (!t) break;
      nach.push(t);
    }

    let name = [...basis, ...nach].join(" ").replace(/\s+/g, " ").trim();
    if (bekannt && !bekannt.has(name)) {
      // Kürzere Lesarten durchprobieren, bevor aufgegeben wird.
      for (let k = nach.length - 1; k >= 0; k--) {
        const kurz = [...basis, ...nach.slice(0, k)].join(" ").replace(/\s+/g, " ").trim();
        if (bekannt.has(kurz)) {
          name = kurz;
          break;
        }
      }
    }

    raus.push({ kopf: teile.kopf, name, werte: teile.werte, zeileIdx: i });

    // Die als Nachlauf verbrauchten Zeilen überspringen. OHNE DAS liest die
    // Schleife sie ein zweites Mal — als Vorlauf der NÄCHSTEN Zeile, deren Name
    // dann mit dem Ende des vorigen beginnt („Selbstn BEG WG - Heizungs…").
    // Gemessen: 459 von 9.179 Kreiszeilen trugen so einen verschmolzenen Namen,
    // und weil sie unter falschem Namen liefen, fehlten sie in der Summe ihres
    // Programms — 1.255 von 5.226 Mio. € bei der Heizungsförderung. Die Zeilen
    // waren da, sie standen nur woanders; nur die Kontrollsumme hat es gezeigt.
    i += nach.length;
  }
  return raus;
}

/* ───────────────────────── Die drei Tabellen ───────────────────────── */

const ABSCHNITT_BUND = "Neuzusagen Inlandsfinanzierung auf Programmebene";
const ABSCHNITT_LAND = "Neuzusagen pro Bundesland";
const ABSCHNITT_KREIS = "Landkreise nach Bundesländern";
const ABSCHNITT_VWZ = "Förderschwerpunkte auf Programmebene nach Verwendungszwecken";

/** Seiten eines Abschnitts, erkannt an der Kopfzeile der Seite. */
function seitenMit(seitenTexte: string[], titel: string): string[][] {
  return seitenTexte
    .filter((s) => s.split("\n").slice(0, 6).some((z) => z.includes(titel)))
    .map((s) => s.split("\n"));
}

/**
 * Bundeswerte je Programm.
 *
 * „Gesamt" wird übersprungen: Das sind die Zwischensummen der Geschäftsfelder
 * und Förderschwerpunkte, keine Programme. Sie mitzuzählen würde jede
 * Kontrollsumme zerstören.
 */
function leseBund(seitenTexte: string[]): Map<string, Zelle> {
  const raus = new Map<string, Zelle>();
  for (const zeilen of seitenMit(seitenTexte, ABSCHNITT_BUND)) {
    const seite = kopfLesen(zeilen);
    if (!seite) continue;
    for (const z of zeilenDerSeite(seite, null)) {
      if (!z.name || z.name === "Gesamt") continue;
      const anzahl = zahl(z.werte[0]);
      const volumenMio = zahl(z.werte[1]) ?? 0;
      const vorhanden = raus.get(z.name);
      if (vorhanden) {
        // Ein Programm kann in mehreren Geschäftssegmenten auftauchen.
        raus.set(z.name, {
          anzahl: vorhanden.anzahl === null || anzahl === null ? null : vorhanden.anzahl + anzahl,
          volumenMio: runde1(vorhanden.volumenMio + volumenMio),
        });
      } else {
        raus.set(z.name, { anzahl, volumenMio });
      }
    }
  }
  return raus;
}

/**
 * Bundeswerte je Bundesland und Programm — die ZWEITE Kontrollebene.
 *
 * Die Bundeskontrolle sagt nur, DASS etwas fehlt. Diese hier sagt, WO: Die
 * Summe der Kreise eines Landes muss den Landeswert treffen. Das ist derselbe
 * Unterschied wie zwischen „der Wächter ist rot" und „diese Seite hat sich
 * bewegt" — und der Grund, warum sie mitgelesen wird, obwohl sie im Produkt
 * nirgends erscheint.
 */
function leseLaender(seitenTexte: string[], bekannt: Set<string>): Map<string, Map<string, Zelle>> {
  const raus = new Map<string, Map<string, Zelle>>();
  let bundesland = "";

  for (const zeilen of seitenMit(seitenTexte, ABSCHNITT_LAND)) {
    const seite = kopfLesen(zeilen);
    if (!seite) continue;
    for (let i = 0; i < seite.kopfIndex; i++) {
      const t = zeilen[i].trim();
      if (BUNDESLAND_NAMEN.has(t)) bundesland = t;
    }
    if (!bundesland) continue;
    let land = raus.get(bundesland);
    if (!land) raus.set(bundesland, (land = new Map()));

    for (const z of zeilenDerSeite(seite, bekannt)) {
      if (!z.name || z.name === "Gesamt") continue;
      const anzahl = zahl(z.werte[0]);
      const volumenMio = zahl(z.werte[1]) ?? 0;
      const da = land.get(z.name);
      if (da) {
        land.set(z.name, {
          anzahl: da.anzahl === null || anzahl === null ? null : da.anzahl + anzahl,
          volumenMio: runde1(da.volumenMio + volumenMio),
        });
      } else {
        land.set(z.name, { anzahl, volumenMio });
      }
    }
  }
  return raus;
}

/** Kreiszeilen. Der Kreisname wird über Seitenumbrüche mitgeführt (Falle 2). */
function leseKreise(seitenTexte: string[], bekannt: Set<string>): KreisZeile[] {
  const raus: KreisZeile[] = [];
  let bundesland = "";
  let kreis = "";

  for (const zeilen of seitenMit(seitenTexte, ABSCHNITT_KREIS)) {
    const seite = kopfLesen(zeilen);
    if (!seite) continue;

    // Über dem Tabellenkopf stehen Bundesland und — nur auf der ERSTEN Seite
    // eines Kreises — der Kreisname.
    for (let i = 0; i < seite.kopfIndex; i++) {
      const t = zeilen[i].trim();
      if (!t) continue;
      if (t.includes(ABSCHNITT_KREIS) || /^\d/.test(t)) continue;
      if (BUNDESLAND_NAMEN.has(t)) {
        bundesland = t;
        continue;
      }
      kreis = t;
    }
    if (!bundesland || !kreis) continue;

    for (const z of zeilenDerSeite(seite, bekannt)) {
      if (!z.name || z.name === "Gesamt") continue;
      raus.push({
        bundesland,
        kreis,
        programm: z.name,
        anzahl: zahl(z.werte[0]),
        volumenMio: zahl(z.werte[1]) ?? 0,
      });
    }
  }
  return raus;
}

/**
 * Verwendungszwecke je Programm — Bundesebene.
 *
 * Diese Tabelle ist QUER gebaut, anders als die beiden anderen: Der
 * Verwendungszweck steht links, die Programme stehen als Spaltenpaare
 * (Anzahl / Mio. €) nebeneinander, und ein Programmname füllt je nach Länge
 * eine oder zwei Kopfzeilen ÜBER seinem Paar.
 *
 * Gelesen wird deshalb über zwei Ankerreihen aus der Unterkopfzeile: die
 * x-Positionen von „Anzahl" und die von „VWZ-Teilbetrag". Ein Paar spannt vom
 * einen zum anderen; der Programmname ist der Text, der über dieser Spanne
 * steht.
 *
 * DIE WERTE WERDEN NICHT NACH POSITION GELESEN, SONDERN NACH ANZAHL. Ein
 * Zahlenwert steht rechtsbündig irgendwo in seiner Spalte; ihn über
 * Spaltengrenzen zu schneiden war der erste Versuch und hat Bruchstücke von
 * Wörtern als Zahlen ausgelesen. Stattdessen: Die Zeile MUSS genau doppelt so
 * viele Zahlenwerte tragen, wie es Programmspalten gibt. Stimmt das nicht,
 * wird die Zeile verworfen und gezählt — eine Zeile, die anders aussieht als
 * erwartet, ist ein Befund, kein Rundungsproblem.
 */
function leseVerwendungszwecke(seitenTexte: string[], bekannt: Set<string>): { zeilen: VwzZeile[]; verworfen: number } {
  const raus: VwzZeile[] = [];
  let verworfen = 0;
  const zahlToken = String.raw`(?:\*|-|\d{1,3}(?:\.\d{3})*(?:,\d+)?)`;
  const zeilenRe = new RegExp(`^(.*?)((?:\\s{2,}${zahlToken})+)\\s*$`);

  for (const zeilen of seitenMit(seitenTexte, ABSCHNITT_VWZ)) {
    const unterkopf = zeilen.findIndex((z) => z.includes("VWZ-Teilbetrag"));
    if (unterkopf < 0) continue;

    const anker = (art: RegExp) => {
      const p: number[] = [];
      const re = new RegExp(art.source, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(zeilen[unterkopf])) !== null) p.push(m.index);
      return p;
    };
    const anzahlAnker = anker(/Anzahl/);
    const betragAnker = anker(/VWZ-Teilbetrag/);
    if (!anzahlAnker.length || anzahlAnker.length !== betragAnker.length) continue;

    // Namenszeilen: der zusammenhängende Textblock UNMITTELBAR über dem
    // Unterkopf — nicht alles darüber. Weiter oben steht der Name des
    // Förderschwerpunkts („Energieeffizienz und erneuerbare Energien"), und der
    // reicht in dieselben Spalten hinein: Er landete sonst als Wortfetzen im
    // Programmnamen, und das Programm war damit nicht mehr wiederzuerkennen.
    const namensZeilen: string[] = [];
    let k = unterkopf - 1;
    while (k >= 0 && zeilen[k].trim() === "") k--;
    while (k >= 0 && zeilen[k].trim() !== "") {
      namensZeilen.unshift(zeilen[k]);
      k--;
    }

    const programme = anzahlAnker.map((a, idx) => {
      const von = Math.max(0, a - 4);
      const bis = betragAnker[idx] + "VWZ-Teilbetrag".length + 4;
      return namensZeilen
        .map((z) => z.slice(von, bis).trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    });
    if (!programme.some((p) => bekannt.has(p))) continue;

    for (const z of zeilen.slice(unterkopf + 1)) {
      if (/^\s*\d\)\s/.test(z) || /^\s*\d+\s*\/\s*\d+\s*$/.test(z)) break;
      if (!z.trim()) continue;
      const m = z.match(zeilenRe);
      if (!m) continue;
      const vwz = m[1].trim();
      if (!vwz) continue;
      const werte = m[2].trim().split(/\s{2,}/).filter(Boolean);
      // Auf der ersten Seite jedes Förderschwerpunkts steht LINKS eine
      // zusätzliche Spalte „Gesamt" — die Summe über alle Programme des
      // Schwerpunkts, nicht über eines. Ihr Unterkopf steht eine Zeile tiefer
      // als der der Programmspalten und taucht in den Ankern nicht auf. Sie
      // wird an der Zahl der Werte erkannt und übersprungen; sie mitzulesen
      // hieße, die Summe eines Schwerpunkts als Wert eines Programms
      // auszuweisen.
      const versatz = werte.length === (programme.length + 1) * 2 ? 2 : 0;
      if (werte.length !== programme.length * 2 + versatz) {
        verworfen++;
        continue;
      }
      for (let i = 0; i < programme.length; i++) {
        if (!bekannt.has(programme[i])) continue;
        raus.push({
          programm: programme[i],
          verwendungszweck: vwz,
          anzahl: zahl(werte[versatz + i * 2]),
          volumenMio: zahl(werte[versatz + i * 2 + 1]) ?? 0,
        });
      }
    }
  }
  return { zeilen: raus, verworfen };
}

function runde1(n: number): number {
  return Math.round(n * 10) / 10;
}

const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** Stichtag der Titelseite. Jeder Jahrgang hat seinen eigenen. */
export function leseStichtag(text: string): string {
  const m = text.match(/Stichtag:\s*(\d{1,2})\.\s*([A-Za-zä]+)\s*(\d{4})/);
  if (!m) throw new Error("Kein Stichtag im Bericht gefunden.");
  const monat = MONATE.indexOf(m[2]);
  if (monat < 0) throw new Error(`Unbekannter Monat im Stichtag: ${m[2]}`);
  return `${m[3]}-${String(monat + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/**
 * Liest einen Jahrgang aus dem bereits in Text gewandelten Bericht.
 *
 * `text` ist die Ausgabe von `pdftotext -layout`, Seiten durch Seitenvorschub
 * getrennt.
 */
export function leseReport(text: string): ReportDaten {
  const seiten = text.split("\f");
  const stichtagIso = leseStichtag(seiten[0] ?? "");
  const jahr = Number(stichtagIso.slice(0, 4));

  const bund = leseBund(seiten);
  if (bund.size === 0) throw new Error("Bundestabelle nicht gefunden — Aufbau des Berichts geändert?");
  const bekannt = new Set(bund.keys());

  const laender = leseLaender(seiten, bekannt);
  const kreise = leseKreise(seiten, bekannt);
  if (kreise.length === 0) throw new Error("Kreistabelle nicht gefunden — Aufbau des Berichts geändert?");

  const vwz = leseVerwendungszwecke(seiten, bekannt);

  return { jahr, stichtagIso, bund, laender, kreise, verwendungszwecke: vwz.zeilen, vwzVerworfen: vwz.verworfen };
}

/* ───────────────────────── Die Kontrollsumme ───────────────────────── */

export type Kontrolle = {
  programm: string;
  bundVolumen: number;
  summeVolumen: number;
  abweichungMio: number;
  /** Zahl der Kreise, die für dieses Programm eine Zeile tragen. */
  kreise: number;
  bundAnzahl: number | null;
  /** Summe der NICHT unterdrückten Anzahlen. Muss unter dem Bundeswert liegen. */
  summeAnzahlSichtbar: number;
  unterdrueckt: number;
  /** Bundesländer, deren Kreissumme den Landeswert verfehlt. */
  laenderAbweichung: { bundesland: string; landVolumen: number; kreisVolumen: number }[];
  bestanden: boolean;
  grund?: string;
};

/**
 * Erlaubte Abweichung der Volumensumme, in Mio. €.
 *
 * Der Bericht rundet jede Zelle auf eine Nachkommastelle. Über 404 Kreise
 * summieren sich die Rundungen; der Erwartungswert der Summe dieser Fehler
 * liegt bei rund 0,6 Mio. €, der schlimmste Fall bei 20. Zwei Mio. € sind
 * damit großzügig genug für die Rundung und eng genug, um eine verlorene
 * Kreiszeile zu bemerken: Schon ein mittlerer Kreis trägt bei der
 * Heizungsförderung ein zweistelliges Millionenvolumen.
 *
 * Zusätzlich gilt eine relative Schranke für kleine Programme, bei denen 2
 * Mio. € das ganze Programm wären.
 */
export const KONTROLLE_TOLERANZ_MIO = 2;
export const KONTROLLE_TOLERANZ_ANTEIL = 0.005;

/**
 * Hält die ausgelesenen Kreiszeilen gegen die Bundeswerte.
 *
 * DAS IST DIE EIGENTLICHE SICHERUNG dieses Moduls. Ein Parser, der jede zehnte
 * Zeile verliert, liefert plausible Zahlen — nur eben zu niedrige, und niemand
 * sieht es. Prüfbar ist das nur, weil die Unterdrückung ausschließlich die
 * Anzahl trifft: Die Volumina sind lückenlos, ihre Summe MUSS den Bundeswert
 * treffen.
 *
 * Die Anzahl wird in der einzig möglichen Richtung geprüft: Die Summe der
 * sichtbaren Anzahlen darf den Bundeswert nicht überschreiten. Sie darf ihn
 * unterschreiten — das ist die Unterdrückung, und wie weit, wissen wir nicht.
 * Genau deshalb wird die Lücke auch nicht zurückgerechnet.
 */
export function kontrolliere(daten: ReportDaten, programme: string[]): Kontrolle[] {
  return programme.map((programm) => {
    const zeilen = daten.kreise.filter((z) => z.programm === programm);
    const bundZelle = daten.bund.get(programm);
    const bundVolumen = bundZelle?.volumenMio ?? 0;
    const summeVolumen = runde1(zeilen.reduce((s, z) => s + z.volumenMio, 0));
    const abweichungMio = runde1(Math.abs(summeVolumen - bundVolumen));
    const summeAnzahlSichtbar = zeilen.reduce((s, z) => s + (z.anzahl ?? 0), 0);
    const unterdrueckt = zeilen.filter((z) => z.anzahl === null).length;
    const bundAnzahl = bundZelle?.anzahl ?? null;

    // Zweite Ebene: je Bundesland die Kreissumme gegen den Landeswert. Sie
    // sagt, WO etwas fehlt — die Bundeszahl sagt nur, DASS.
    const laenderAbweichung: Kontrolle["laenderAbweichung"] = [];
    for (const [land, programme_] of daten.laender) {
      const landZelle = programme_.get(programm);
      if (!landZelle) continue;
      const kreisVolumen = runde1(
        zeilen.filter((z) => z.bundesland === land).reduce((s, z) => s + z.volumenMio, 0),
      );
      const tol = Math.max(0.5, landZelle.volumenMio * KONTROLLE_TOLERANZ_ANTEIL);
      if (Math.abs(kreisVolumen - landZelle.volumenMio) > tol) {
        laenderAbweichung.push({ bundesland: land, landVolumen: landZelle.volumenMio, kreisVolumen });
      }
    }

    const toleranz = Math.max(KONTROLLE_TOLERANZ_MIO, bundVolumen * KONTROLLE_TOLERANZ_ANTEIL);
    let grund: string | undefined;
    if (!bundZelle) grund = "Programm steht nicht in der Bundestabelle.";
    else if (zeilen.length === 0) grund = "Keine einzige Kreiszeile gefunden.";
    else if (abweichungMio > toleranz)
      grund = `Volumensumme weicht um ${abweichungMio} Mio. € ab (erlaubt ${runde1(toleranz)}).`;
    else if (bundAnzahl !== null && summeAnzahlSichtbar > bundAnzahl)
      grund = `Summe der sichtbaren Anzahlen (${summeAnzahlSichtbar}) übersteigt den Bundeswert (${bundAnzahl}).`;
    else if (laenderAbweichung.length)
      grund =
        `Kreissumme verfehlt den Landeswert in: ` +
        laenderAbweichung.map((a) => `${a.bundesland} (${a.kreisVolumen} statt ${a.landVolumen})`).join(", ");

    return {
      programm,
      bundVolumen,
      summeVolumen,
      abweichungMio,
      kreise: new Set(zeilen.map((z) => `${z.bundesland}|${z.kreis}`)).size,
      bundAnzahl,
      summeAnzahlSichtbar,
      unterdrueckt,
      laenderAbweichung,
      bestanden: !grund,
      grund,
    };
  });
}
