/**
 * Wann ist der Anlagenbestand fällig — und ist er ausgeblieben?
 *
 * DER ANLASS (05.09.2026, gemessen am 09.09.2026): Der monatliche Import des
 * Gesamtdatenexports der Bundesnetzagentur schlug fehl, weil der Server der
 * Behörde vom GitHub-Läufer aus nicht erreichbar war — acht Abrufversuche,
 * jeder auf Netzwerkebene abgebrochen, der Lauf nach 26 Sekunden rot. Vier Tage
 * später hat es ein Mensch zufällig bemerkt.
 *
 * DIE AUFSICHT GAB ES BEREITS UND SIE HAT GESCHWIEGEN, und das ist der
 * eigentliche Befund. Sie urteilte über das ALTER in Tagen: ab 45 gelb, ab 70
 * rot. Am Tag des Fehlschlags war der Bestand 31 Tage alt, also grün; gelb wäre
 * er am 19.09. geworden (und Gelb erzeugt keine Nachricht), rot am 14.10. — da
 * hätte der Lauf des Oktobers die Lücke längst stillschweigend geschlossen.
 * Eine Tagesschwelle kann „ein Lauf ist ausgefallen" gar nicht ausdrücken: Sie
 * misst den Abstand zum letzten Erfolg, nicht den zum letzten TERMIN.
 *
 * Deshalb rechnet diese Datei gegen den ZEITPLAN der Action statt gegen eine
 * gegriffene Zahl. Der Plan steht in der Workflow-Datei und wird von dort
 * gelesen, nie hier getippt: Wer den Termin verschiebt, verschiebt beides
 * zugleich — sonst meldete die Aufsicht nach einer Planänderung jeden Monat
 * einen Ausfall, den es nicht gibt.
 *
 * ZWEI AUFRUFER, EINE QUELLE: Der Gesundheitscheck fragt „fehlt der Import?",
 * der Importlauf selbst fragt „habe ich hier noch etwas zu tun?". Das ist
 * dieselbe Frage aus zwei Richtungen; zwei Fassungen davon liefen
 * auseinander, sobald jemand eine anfasst.
 *
 * ZEITZONE: Hier ist die WELTZEIT richtig, nicht der deutsche Kalendertag. Der
 * Zeitplan der Action ist in Weltzeit angegeben, und der Datenstand ist der
 * Tagesstempel im Dateinamen der Behörde, der ebenfalls aus der Weltzeit kommt.
 * Ein deutscher Kalendertag träfe hier den falschen Eimer. Gerechnet wird
 * ausschließlich auf einem hereingereichten Zeitpunkt — keine eigene Uhr,
 * damit sich jeder Rand prüfen lässt.
 */

/**
 * Nachfrist nach dem letzten geplanten Versuch, bevor ein fehlender Import als
 * Ausfall gilt.
 *
 * Zwei Tage, und die Zahl ist hergeleitet: Der Lauf selbst dauert rund zweieinhalb
 * Stunden, danach folgen Ungültig-Erklären und Aufwärmen. Wer ohne Nachfrist
 * urteilt, meldet am Vormittag des Termins einen Ausfall, während der Lauf noch
 * läuft — und eine Meldung, die regelmäßig grundlos angeht, filtert man weg.
 */
export const IMPORT_NACHFRIST_TAGE = 2;

/**
 * An welchen Tagen des Monats ist der Import geplant?
 *
 * Gelesen aus dem Zeitplan der Action (`cron: "0 4 5,7,9 * *"` → `[5, 7, 9]`).
 * Das dritte Feld eines Zeitplans ist der Tag des Monats. Mehrere Zeilen und
 * Kommalisten werden zusammengefasst; alles andere (Sternchen, Schrittweiten,
 * Bereiche) gilt als nicht auswertbar.
 *
 * `null` heißt „konnte nicht nachsehen" und ist ausdrücklich KEIN Urteil: Wer
 * daraus „kein Termin, also kein Ausfall" macht, baut eine Aufsicht, die sich
 * beim ersten Tippfehler im Zeitplan lautlos abschaltet. Die Aufrufer melden
 * diesen Zustand.
 */
export function importTageAusZeitplan(workflowText: string): number[] | null {
  const zeilen = [...workflowText.matchAll(/^\s*-\s*cron:\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  if (!zeilen.length) return null;
  const tage = new Set<number>();
  for (const zeile of zeilen) {
    const felder = zeile.trim().split(/\s+/);
    if (felder.length < 5) return null;
    const tagFeld = felder[2];
    // Nur die Form, die wir wirklich benutzen: eine Zahl oder eine Kommaliste.
    // Ein Sternchen ("jeden Tag") ist kein Monatsrhythmus, eine Schrittweite
    // ("*/3") auch nicht — beides hier zu deuten hieße raten.
    if (!/^\d+(,\d+)*$/.test(tagFeld)) return null;
    for (const t of tagFeld.split(",")) {
      const n = Number(t);
      if (!Number.isInteger(n) || n < 1 || n > 28) return null; // >28 gibt es nicht in jedem Monat
      tage.add(n);
    }
  }
  return [...tage].sort((a, b) => a - b);
}

/** Kalendertag in Weltzeit als `JJJJ-MM-TT` (siehe Zeitzonen-Begründung oben). */
function alsTag(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/**
 * Der Beginn des Import-Zyklus, in dem wir gerade stehen.
 *
 * Das ist der ERSTE geplante Termin, der bereits angebrochen ist: am 09.09. bei
 * Terminen am 5., 7. und 9. der 05.09., am 04.10. noch immer der 05.09. Alles,
 * was älter ist als dieser Tag, gehört zum vorigen Zyklus — der Bestand ist
 * dann nicht bloß alt, sondern es fehlt ein Lauf.
 */
export function zyklusStart(importTage: number[], jetzt: Date): string {
  const ersterTag = Math.min(...importTage);
  const jahr = jetzt.getUTCFullYear();
  const monat = jetzt.getUTCMonth();
  const start = new Date(Date.UTC(jahr, monat, ersterTag));
  // Vor dem Termin dieses Monats läuft noch der Zyklus des Vormonats.
  if (jetzt.getTime() < start.getTime()) return alsTag(new Date(Date.UTC(jahr, monat - 1, ersterTag)));
  return alsTag(start);
}

/**
 * Hat der Importlauf in diesem Zyklus noch etwas zu tun?
 *
 * Die Frage des Laufs selbst. Sie erlaubt mehrere Anläufe je Monat, ohne den
 * 3-GB-Download zu wiederholen, wenn der erste geglückt ist: Ein späterer
 * Versuch sieht, dass der Bestand bereits aus diesem Zyklus stammt, und hört
 * auf. Ohne diese Frage wären zusätzliche Termine keine Absicherung, sondern
 * dreifache Arbeit.
 */
export function importNoetig(datenstand: string, importTage: number[], jetzt: Date): boolean {
  return datenstand < zyklusStart(importTage, jetzt);
}

export type ImportPlanBefund =
  /** Der Bestand stammt aus dem laufenden Zyklus. */
  | { art: "aktuell"; zyklusStart: string }
  /** Er fehlt, aber ein geplanter Versuch steht noch aus — noch kein Ausfall. */
  | { art: "unterwegs"; zyklusStart: string; letzterVersuch: string }
  /** Alle geplanten Versuche sind verstrichen, der Bestand ist alt. */
  | { art: "ausgefallen"; zyklusStart: string; letzterVersuch: string };

/**
 * Das Urteil des Gesundheitschecks.
 *
 * Gemeldet wird erst, wenn ALLE geplanten Versuche des Zyklus samt Nachfrist
 * verstrichen sind. Früher zu melden hieße, einen Ausfall zu behaupten, den der
 * nächste Anlauf in zwei Tagen von selbst behebt — und der Unterschied zwischen
 * „läuft noch" und „ist ausgefallen" ist genau der zwischen einer Meldung, die
 * jemand ernst nimmt, und einer, die er wegfiltert.
 */
export function importPlanBefund(
  datenstand: string,
  importTage: number[],
  jetzt: Date,
): ImportPlanBefund {
  const start = zyklusStart(importTage, jetzt);
  if (!importNoetig(datenstand, importTage, jetzt)) return { art: "aktuell", zyklusStart: start };

  const spanne = Math.max(...importTage) - Math.min(...importTage);
  const [j, m, t] = start.split("-").map(Number);
  // Mittag als Anker: reine Datumsarithmetik auf einem bereits in Weltzeit
  // verankerten Tag, damit kein Sommerzeit-Sprung eine Grenze verschiebt.
  const frist = new Date(Date.UTC(j, m - 1, t + spanne + IMPORT_NACHFRIST_TAGE, 12));
  const letzterVersuch = alsTag(new Date(Date.UTC(j, m - 1, t + spanne)));

  return jetzt.getTime() >= frist.getTime()
    ? { art: "ausgefallen", zyklusStart: start, letzterVersuch }
    : { art: "unterwegs", zyklusStart: start, letzterVersuch };
}

/**
 * Was der Gesundheitscheck aus Termin UND Ausgang des letzten Laufs macht.
 *
 * Zwei Signale, weil eines allein zu spät ist: Der Termin sagt zuverlässig, ob
 * ein Zyklus wirklich ausgefallen ist — aber erst, wenn alle Nachhol-Termine
 * verstrichen sind. Der Ausgang des letzten Laufs sagt schon am Tag des
 * Fehlschlags, dass etwas nicht stimmt, ist dafür allein kein Beweis (ein
 * einzelner roter Lauf kann vom nächsten Termin geheilt werden).
 *
 * Deshalb die Abstufung: ein roter Lauf mit noch offenem Zyklus ist eine
 * Warnung („sieh hin"), ein verstrichener Zyklus ein Befund für Claude („hol
 * es nach"). Ein roter Lauf bei aktuellem Bestand bleibt eine Warnung — die
 * Daten stimmen, aber etwas dahinter ist kaputt (Plausibilitätsprüfung,
 * Ungültig-Erklären, Aufwärmen).
 *
 * `letzterLauf === null` heißt „nicht nachgesehen" und erzeugt nie eine
 * Meldung: Ohne Zugang zur Lauf-Historie etwas über sie zu behaupten wäre eine
 * Beobachtung, die es nicht gab.
 */
export function importlaufMeldung(
  befund: ImportPlanBefund,
  letzterLauf: string | null,
): { stufe: "warnung" | "claude"; text: string } | null {
  if (befund.art === "ausgefallen") {
    return {
      stufe: "claude",
      text:
        `fällig am ${befund.zyklusStart}, letzter geplanter Anlauf ${befund.letzterVersuch} — beide verstrichen`,
    };
  }
  if (letzterLauf === null || letzterLauf === "success") return null;
  return {
    stufe: "warnung",
    text:
      befund.art === "aktuell"
        ? `Der Bestand ist aktuell, aber der letzte Lauf endete „${letzterLauf}" — betroffen ist dann nicht der ` +
          `Import selbst, sondern was danach kommt (Plausibilitätsprüfung, Ungültig-Erklären, Aufwärmen).`
        : `Der letzte Lauf endete „${letzterLauf}", der Bestand ist noch aus dem vorigen Zyklus. Der nächste ` +
          `geplante Anlauf ist am ${befund.letzterVersuch} — bis dahin ist das kein Ausfall, aber es gehört angesehen.`,
  };
}
