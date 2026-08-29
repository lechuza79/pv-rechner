// ─── Kostenwache: Mengen je Projekt, Alarm auf den SPRUNG ────────────────────
//
// WARUM ES DAS GIBT (29.08.2026): Der größte Posten der Vercel-Rechnung hat sich
// verdreifacht (+249 %) und stand tagelang sichtbar in den Zahlen, ohne dass
// jemand hinsah. Der Gesundheitscheck misst seit Juli Erreichbarkeit,
// Antwortzeiten, Cache-Wirksamkeit und stillstehende Wächter — Kosten misst er
// nicht. Das ist dieselbe Lücke wie damals beim Atlas: EIN MESSWERT IST KEIN
// ZUSTAND, und was niemand wiederkehrend misst, merkt niemand.
//
// WAS HIER GEMESSEN WIRD — und was ausdrücklich nicht:
//
// Nicht Euro. Die Euro-Aufschlüsselung ist mit unserem Zugang nicht abrufbar
// (Messung am 29.08.2026, siehe `KOSTENWACHE_ZUGANG` unten). Gemessen werden die
// beiden MENGEN, aus denen die Rechnung entsteht:
//
//   • Aufbauten  — wie viele Anfragen die Produktion beantwortet hat (Last).
//   • Adressen   — wie viele VERSCHIEDENE Adressen dabei aufgerufen wurden
//                  (Ausbreitung in die Fläche).
//
// DIE ZWEITE ZAHL IST DER EIGENTLICHE BEFUND, und sie ist der Grund, warum es
// nicht bei einer bleibt. Beide steigen aus verschiedenen Ursachen:
//   – nur die Last  → jemand ruft DIESELBEN Adressen häufiger auf: eine
//                     Schleife, eine Wiederholungswelle, eine Route, die aus dem
//                     Cache gefallen ist.
//   – nur die Fläche → jemand entdeckt VIELE NEUE Adressen: ein Crawler läuft
//                     einen Katalog ab. Das ist der teure Fall, denn jede noch
//                     nie aufgerufene Adresse kostet einen vollen Aufbau.
//   – beides        → ein echter Verkehrsanstieg oder ein Crawler-Sturm.
// Eine Meldung, die das nicht trennt, sagt „es ist mehr geworden" und lässt
// offen, wonach zu suchen ist.
//
// KEIN FESTER BETRAG ALS SCHWELLE, sondern der Vergleich mit dem eigenen
// Vortagesniveau. Ein fester Deckel müsste je Projekt gepflegt werden, wäre bei
// einem wachsenden Projekt nach zwei Monaten falsch und würde beim kleinen
// Projekt nie und beim großen dauernd anschlagen.

import { FILMPROJEKT_ID, SOLAR_CHECK_PROJEKT_ID, VERCEL_TEAM_ID } from "./vercel-budget";

/** Ein Projekt, dessen Mengen beobachtet werden. */
export interface KostenProjekt {
  /** Kurzschlüssel in der Ablage — kurz, stabil, nicht die Vercel-Kennung. */
  schluessel: string;
  /** Klartext für die Meldung. */
  name: string;
  /** Vercel-Projektkennung. */
  projectId: string;
}

// Team- und Projektkennungen kommen aus der Ausgabenbremse (lib/vercel-budget.ts)
// und werden hier NICHT ein zweites Mal getippt. Beide Bausteine arbeiten an
// derselben Rechnung und müssten sonst getrennt gepflegt werden — und eine
// achtstellige Kennung ist eine Zahl ohne Aussehen: Vertippt man sich, zeigt sie
// auf ein anderes Projekt, ohne dass ein Test, ein Typfehler oder eine kaputte
// Seite das bemerkt. Dieselbe Falle wie beim Gemeindeschlüssel im Förderbereich.
export const KOSTEN_TEAM_ID = VERCEL_TEAM_ID;

export const KOSTEN_PROJEKTE: KostenProjekt[] = [
  { schluessel: "solar-check", name: "solar-check.io", projectId: SOLAR_CHECK_PROJEKT_ID },
  { schluessel: "film", name: "Filmprojekt", projectId: FILMPROJEKT_ID },
];

/**
 * Was am 29.08.2026 an Zugängen GEMESSEN wurde — damit die nächste Sitzung nicht
 * dieselbe Endpunktliste noch einmal durchprobiert.
 *
 *  • Euro je Posten: nicht abrufbar. Der Ausgaben-Endpunkt der Plattform
 *    (`/v1/teams/{id}/spend`) existiert, weist unsere Anfrage aber schon an der
 *    Form ab (HTTP 400 „should NOT have additional property `version`"), und
 *    zwar auch ohne jeden Parameter. Das ist KEIN Rechteproblem an unserem
 *    Zugang — ein zweiter Zugang mit Abrechnungsrechten wäre trotzdem einen
 *    Versuch wert, aber die Wache baut nicht darauf.
 *  • Verbrauchszahlen der Abrechnung (`vercel.com/api/usage`): der Endpunkt
 *    lebt, weist aber jeden Zeitraum ab („invalid_time_range") — geprüft mit
 *    Tages-, Wochen-, Monats- und exakter Abrechnungsperiode, als ISO und als
 *    Millisekunden.
 *  • Die Beobachtungs-Metriken (`/v2/observability/query`) enthalten GENAU die
 *    abgerechneten Größen (`vercel.request.count`, `…fdt_out_bytes` = der
 *    Datenverkehr, der die Rechnung treibt). Sie antworten auf unserem Tarif
 *    aber mit HTTP 402: sie brauchen das Zusatzprodukt „Observability Plus".
 *    Das ist eine Geldfrage und damit eine Entscheidung des Betreibers.
 *  • Die Laufzeitprotokolle sind ohne Zusatzprodukt abrufbar und liefern beide
 *    Mengen. Darauf läuft die Wache.
 */
export const KOSTENWACHE_ZUGANG = {
  gemessenAm: "2026-08-29",
  quelle: "laufzeitprotokoll",
} as const;

/**
 * Die Aufbewahrung der Laufzeitprotokolle beträgt auf unserem Tarif EINEN TAG
 * (gemessen 29.08.2026: der Vortag antwortet, alles davor liefert nichts). Daraus
 * folgt alles Weitere: Es gibt keine Historie zum Nachrechnen — wer den Tag
 * verpasst, hat ihn für immer verpasst. Deshalb die eigene Ablage, und deshalb
 * darf ein leerer Abruf NIEMALS als „null Verkehr" abgelegt werden.
 */
export const PROTOKOLL_AUFBEWAHRUNG_TAGE = 1;

/**
 * Die Aufbewahrung läuft GLEITEND ab, nicht am Tagesende: Je später am Tag man
 * den Vortag abfragt, desto mehr fehlt an seinem Anfang. Gemessen am 29.08.2026
 * am selben Tag: 5.738 Aufbauten um 07:00 Uhr, 5.661 um 07:45 — rund 1,3 %
 * Schwund je Stunde.
 *
 * Für den Sprung-Vergleich ist das belanglos (die Schwelle liegt beim
 * 2,5-fachen, der Schwund bewegt sich im niedrigen einstelligen Prozentbereich),
 * und weil der Gesundheitscheck den Tag beim ERSTEN Lauf nach Mitternacht
 * erfasst, ist er über alle Tage hinweg ähnlich groß. Es steht hier, damit
 * niemand später einer Abweichung nachjagt, die keine ist — und damit klar ist,
 * dass ein Tageswert eine UNTERGRENZE ist, keine amtliche Summe.
 */
export const SCHWUND_JE_STUNDE_ANTEIL = 0.013;

// ─── Ablage ──────────────────────────────────────────────────────────────────

export const KOSTENWACHE_DDL = `
  create table if not exists kosten_tageswerte (
    projekt text not null,
    tag date not null,
    aufbauten bigint not null,
    adressen bigint not null,
    quelle text not null,
    gruppen_gezeigt integer,
    gruppen_gesamt integer,
    gemeldet_am timestamptz,
    erfasst_am timestamptz not null default now(),
    primary key (projekt, tag)
  );
  create index if not exists kosten_tageswerte_tag_idx on kosten_tageswerte (projekt, tag desc);
  alter table kosten_tageswerte enable row level security;
`;

/** Eine abgelegte Tageszeile. */
export interface Tagesmenge {
  /** ISO-Tag (UTC), immer ein VOLLSTÄNDIGER Tag. */
  tag: string;
  aufbauten: number;
  adressen: number;
}

// ─── Antwort der Plattform lesen ─────────────────────────────────────────────

/**
 * Was eine Gruppierungs-Antwort hergibt.
 *
 * `verschiedene` ist die Zahl der verschiedenen Werte insgesamt — die Antwort
 * nennt sie selbst, auch wenn sie nur die größten Gruppen auflistet.
 */
export interface Gruppenbefund {
  summe: number;
  /** Wie viele Gruppen die Antwort aufgelistet hat. */
  gezeigt: number;
  /** Wie viele es insgesamt gibt (aus der Antwort). */
  verschiedene: number;
}

/**
 * Liest Summe und Gruppenzahl aus der Antwort.
 *
 * Gibt `null` zurück, wenn die Antwort gar keine Gruppen und keine Gesamtzahl
 * nennt. Das ist der Regelfall außerhalb der Aufbewahrungsfrist — und es heißt
 * „nicht abrufbar", nicht „null Verkehr". Diese Unterscheidung ist der Kern:
 * Eine Null als Messwert abzulegen würde am Folgetag einen Sprung ins
 * Unendliche behaupten und danach das Vergleichsniveau für zwei Wochen
 * verfälschen. Dieselbe Trennung wie beim Förder-Wächter zwischen „hat sich
 * geändert" und „Abruf kam nicht durch".
 */
export function leseGruppen(text: string): Gruppenbefund | null {
  const zeilen = [...text.matchAll(/^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*$/gm)];
  const gesamt = text.match(/\*\s*(\d[\d.,]*)\s+distinct values total/i);
  if (!zeilen.length && !gesamt) return null;
  const summe = zeilen.reduce((s, m) => s + Number(m[2]), 0);
  const verschiedene = gesamt ? Number(gesamt[1].replace(/[.,]/g, "")) : zeilen.length;
  return { summe, gezeigt: zeilen.length, verschiedene };
}

/**
 * Wie weit die Summe daneben liegen KANN, wenn die Antwort nicht alle Gruppen
 * aufgelistet hat.
 *
 * Die Gruppen kommen absteigend, die fehlenden sind also höchstens so groß wie
 * die kleinste gezeigte. Bei der Gruppierung nach Statuscode sind es eine
 * Handvoll Gruppen und die kleinste hat oft den Wert 1 — die Lücke ist dann
 * rechnerisch belanglos. Sie wird trotzdem ausgerechnet statt behauptet: Wächst
 * sie eines Tages, soll das auffallen und nicht stillschweigend in die
 * Vergleichszahl wandern.
 */
export function fehlbetragObergrenze(b: Gruppenbefund, kleinsteGezeigt: number): number {
  return Math.max(0, b.verschiedene - b.gezeigt) * kleinsteGezeigt;
}

// ─── Schwelle ────────────────────────────────────────────────────────────────

/**
 * Der Vergleich braucht mindestens sieben Tage. Weniger ist kein Niveau,
 * sondern eine Momentaufnahme — und ein Alarm daraus wäre geraten.
 */
export const MIN_VERGLEICHSTAGE = 7;

/** So viele Tage gehen höchstens in das Vergleichsniveau ein. */
export const BASIS_TAGE = 14;

/**
 * Ab welchem Vielfachen des eigenen Vortagesniveaus gemeldet wird.
 *
 * HERGELEITET, NICHT GEGRIFFEN — aber mit einer benannten Schwäche:
 *
 * (a) Nach OBEN begrenzt vom einzigen Vorfall, für den es eine Zahl gibt: Der
 *     Rechnungsposten stieg um 249 %, also auf das 3,49-fache. Eine Schwelle
 *     darüber hätte genau diesen Fall durchgelassen.
 * (b) Nach UNTEN begrenzt von der gewöhnlichen Schwankung. Gemessen wurde sie am
 *     29.08.2026 an den einzigen Tagesreihen, die es zu dem Zeitpunkt gab (drei
 *     Wochen Seitenaufrufe aus der Reichweitenmessung, beide Projekte): Das
 *     Filmprojekt erreichte im Normalbetrieb höchstens das 2,39-fache seines
 *     Vortagesniveaus. Eine Schwelle von 2,0 hätte dort mehrfach im Monat
 *     angeschlagen, ohne dass etwas gewesen wäre.
 *
 * DIE SCHWÄCHE, die dazugehört: Dieselbe Messung ergab für solar-check.io im
 * Normalbetrieb das 9,59-fache — die Seite wächst gerade, und die Reihe beginnt
 * bei zwei Aufrufen am Tag. Eine Schwelle, die DAS nicht auslöst, würde jeden
 * Vorfall durchlassen. Das ist kein Argument für eine andere Zahl, sondern der
 * Grund für die Mindestmengen unten: Bei einstelligen Tageswerten ist jedes
 * Vielfache Rauschen, und es kostet auch nichts.
 *
 * ZU PRÜFEN AB 10/2026: Für die Mengen, um die es hier wirklich geht (Anfragen
 * und Adressen, nicht Seitenaufrufe im Browser), gab es beim Bau KEINE Historie
 * — die Aufbewahrung der Protokolle ist ein Tag. Die Wache legt sie ab dem
 * ersten Lauf an. Sobald vier Wochen echter Werte vorliegen, gehört die Schwelle
 * gegen `groesstesVielfaches()` nachgezogen; der Bericht nennt den Wert bei
 * jedem Lauf, damit ihn niemand suchen muss.
 */
export const SPRUNG_FAKTOR = 2.5;

/**
 * Unterhalb dieser Tagesmengen wird kein Sprung gemeldet.
 *
 * Nicht Bequemlichkeit, sondern die Aussage der Zahl: Von 4 auf 14 Aufbauten ist
 * das 3,5-fache und kostet nichts. Die Grenzen liegen bewusst deutlich unter dem
 * gemessenen Normalbetrieb des KLEINEREN Projekts (28.08.2026: 5.738 Aufbauten,
 * 1.177 verschiedene Adressen an einem Tag) — sie sollen Rauschen abschneiden,
 * nicht einen echten Sprung.
 */
export const MIN_AUFBAUTEN = 1000;
export const MIN_ADRESSEN = 200;

/** Median statt Mittelwert: Ein einzelner Ausreißer soll das Vergleichsniveau
 *  nicht anheben — sonst versteckt der erste Vorfall den zweiten. */
export function median(werte: number[]): number {
  if (!werte.length) return 0;
  const s = [...werte].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export type Groesse = "aufbauten" | "adressen";

export interface Groessenurteil {
  groesse: Groesse;
  /** Klartext-Name für die Meldung. */
  name: string;
  wert: number;
  /** Vergleichsniveau (Median der Vortage). */
  basis: number;
  /** Das Vielfache — `null`, wenn es kein Niveau gibt (Basis 0). */
  vielfaches: number | null;
  gesprungen: boolean;
}

export type Kostenurteil =
  | { art: "kein-urteil"; grund: string }
  | { art: "ruhig"; tag: string; groessen: Groessenurteil[] }
  | { art: "sprung"; tag: string; groessen: Groessenurteil[]; satz: string };

const NAME: Record<Groesse, string> = {
  aufbauten: "die Last",
  adressen: "die Ausbreitung in die Fläche",
};

function urteileGroesse(
  groesse: Groesse,
  wert: number,
  vortage: number[],
  mindestmenge: number,
): Groessenurteil {
  const basis = median(vortage);
  const vielfaches = basis > 0 ? wert / basis : null;
  const gesprungen = wert >= mindestmenge && vielfaches !== null && vielfaches >= SPRUNG_FAKTOR;
  return { groesse, name: NAME[groesse], wert, basis, vielfaches, gesprungen };
}

/**
 * Das Urteil über EINEN vollständigen Tag.
 *
 * Reine Funktion ohne Uhr: Der zu beurteilende Tag und seine Vortage werden
 * hereingereicht. Ohne genug Vortage gibt es ausdrücklich KEIN Urteil — nicht
 * „alles in Ordnung". Der Unterschied ist der ganze Punkt: „Ich habe nachgesehen
 * und nichts gefunden" und „ich konnte gar nicht nachsehen" sind zwei
 * verschiedene Auskünfte, und die zweite als die erste auszugeben ist genau die
 * Sorte stille Falschaussage, gegen die es diese Wache gibt.
 */
export function beurteileKostenTag(heute: Tagesmenge, vortage: Tagesmenge[]): Kostenurteil {
  const basis = [...vortage]
    .filter((t) => t.tag < heute.tag)
    .sort((a, b) => (a.tag < b.tag ? 1 : -1))
    .slice(0, BASIS_TAGE);

  if (basis.length < MIN_VERGLEICHSTAGE) {
    return {
      art: "kein-urteil",
      grund:
        `noch kein Vergleichsniveau: ${basis.length} von ${MIN_VERGLEICHSTAGE} nötigen Vortagen abgelegt. ` +
        `Die Wache sammelt seit ihrem ersten Lauf; vorher kann sie einen Sprung nicht von einem normalen Tag unterscheiden.`,
    };
  }

  const groessen = [
    urteileGroesse("aufbauten", heute.aufbauten, basis.map((t) => t.aufbauten), MIN_AUFBAUTEN),
    urteileGroesse("adressen", heute.adressen, basis.map((t) => t.adressen), MIN_ADRESSEN),
  ];

  const gesprungen = groessen.filter((g) => g.gesprungen);
  if (!gesprungen.length) return { art: "ruhig", tag: heute.tag, groessen };

  return { art: "sprung", tag: heute.tag, groessen, satz: deutung(groessen) };
}

/**
 * Was der Sprung bedeutet — je nachdem, WELCHE der beiden Größen gesprungen ist.
 * Ohne diese Trennung sagt die Meldung nur „es ist mehr geworden" und lässt
 * offen, wonach zu suchen ist.
 */
function deutung(groessen: Groessenurteil[]): string {
  const last = groessen.find((g) => g.groesse === "aufbauten")!;
  const flaeche = groessen.find((g) => g.groesse === "adressen")!;

  if (last.gesprungen && flaeche.gesprungen) {
    return (
      `Last UND Fläche zusammen: Es kommen mehr Anfragen, und sie verteilen sich auf mehr Adressen. ` +
      `Das ist entweder ein echter Verkehrsanstieg oder ein Crawler, der den Bestand abläuft. ` +
      `Zuerst nachsehen, welche Adressen dazugekommen sind und wer sie aufruft.`
    );
  }
  if (flaeche.gesprungen) {
    return (
      `Nur die Fläche: Es werden viel mehr VERSCHIEDENE Adressen aufgerufen, ohne dass die Last entsprechend steigt. ` +
      `Das ist der teure Fall — jede noch nie aufgerufene Adresse kostet einen vollen Aufbau und liegt in keinem Cache. ` +
      `Übliche Ursachen: eine neue Sitemap oder Seitengattung ist live gegangen, oder ein Crawler hat einen Bestand entdeckt.`
    );
  }
  return (
    `Nur die Last: Dieselben Adressen werden viel häufiger aufgerufen. ` +
    `Das deutet nicht auf neue Inhalte, sondern auf Wiederholung — eine Route, die aus dem Cache gefallen ist, ` +
    `eine Schleife oder eine Wiederholungswelle. Zuerst die Cache-Wirksamkeit der meistgerufenen Adressen prüfen.`
  );
}

/**
 * Das größte Vielfache, das im abgelegten Bestand je vorkam — die Zahl, gegen
 * die `SPRUNG_FAKTOR` später nachgezogen wird. Steht im Bericht, damit die
 * Nachjustierung auf gemessenen Werten fußt statt auf einer Schätzung.
 */
export function groesstesVielfaches(reihe: Tagesmenge[], groesse: Groesse): number | null {
  const sortiert = [...reihe].sort((a, b) => (a.tag < b.tag ? -1 : 1));
  let groesstes: number | null = null;
  for (let i = MIN_VERGLEICHSTAGE; i < sortiert.length; i++) {
    const basis = median(
      sortiert.slice(Math.max(0, i - BASIS_TAGE), i).map((t) => t[groesse]),
    );
    if (basis <= 0) continue;
    const v = sortiert[i][groesse] / basis;
    if (groesstes === null || v > groesstes) groesstes = v;
  }
  return groesstes === null ? null : Math.round(groesstes * 100) / 100;
}

/** Eine Zahl, wie sie in einer Meldung stehen soll. */
export function menge(n: number): string {
  return n.toLocaleString("de-DE");
}

/** Der Tag, der beim Lauf am Stichtag beurteilt wird: der letzte VOLLSTÄNDIGE. */
export function zuBeurteilenderTag(jetzt: Date): string {
  return new Date(jetzt.getTime() - 86_400_000).toISOString().slice(0, 10);
}
