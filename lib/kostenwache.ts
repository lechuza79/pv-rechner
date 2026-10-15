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
// Seit dem 07.10.2026 die abgerechneten MENGEN aus den Abrechnungsdaten der
// Plattform (siehe `KOSTENWACHE_ZUGANG`), je Projekt und Abrechnungstag:
//
//   • Aufbauten         — Funktionsaufrufe, also wie viele Anfragen die
//                         Produktion selbst beantworten musste (Last).
//   • Schreibvorgänge   — Cache-Schreibvorgänge, der größte Rechnungsposten:
//                         jede Seite, die neu gebaut und abgelegt wird.
//
// Nicht der Betrag in Dollar: Der fällt auf null, solange das Inklusivkontingent
// des Abrechnungszeitraums reicht (gemessen 25.–29.09.2026: 0,00 $ bei normaler
// Last), und ein Sprung von null ist keiner.
//
// ZWEI GRÖSSEN, WEIL SIE VERSCHIEDENE URSACHEN ANZEIGEN:
//   – nur die Last       → dieselben Seiten werden häufiger gebaut: eine
//                          Schleife, eine Route, die aus dem Cache gefallen ist.
//   – nur das Schreiben  → viele Seiten werden NEU gebaut: ein Crawler läuft
//                          einen Bestand ab, oder ein Datenlauf hat den Cache
//                          ungültig gemacht. Das ist der teure Fall.
//   – beides             → ein echter Verkehrsanstieg oder ein Crawler-Sturm.
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
 * WOHER DIE ZAHLEN KOMMEN — und warum nicht mehr aus den Laufzeitprotokollen.
 *
 * Bis zum 06.10.2026 zählte die Wache die Laufzeitprotokolle (gruppiert nach
 * Statuscode und Adresse). Am 06./07.10.2026 hat die Plattform diesen Weg
 * zweifach geschlossen, beides gemessen:
 *  • Die Gruppierung nach Statuscode gibt es nicht mehr („Invalid option:
 *    expected one of requestPath|level|source|deploymentId|branch"), und die
 *    Protokolle zählen seitdem Protokollzeilen statt Anfragen (167 Zeilen für
 *    17 Stunden, bei rund 16.000 Funktionsaufrufen im selben Zeitraum).
 *  • Ein Zeitraum, der älter ist als 24 Stunden ab JETZT, wird ganz abgewiesen
 *    („does not retain runtime logs for the requested time range") — früher
 *    lieferte er still den noch vorhandenen Rest. Ein ganzer Vortag ist damit
 *    nach Mitternacht nie mehr abfragbar. Daher „der 2026-10-06 war nicht
 *    abrufbar".
 *
 * Die Abrechnungsdaten (`/v1/billing/charges`, FOCUS-Format, je Projekt und Tag)
 * sind seitdem die Quelle. Sie sind dem alten Weg in drei Punkten überlegen:
 * Sie bleiben ERHALTEN (kein verpasster Tag ist für immer verloren, und es
 * braucht keine eigene Ablage mehr), sie zählen genau die abgerechneten
 * Mengen, und es ist EIN Abruf für alle Projekte statt zwei je Projekt.
 * Ein Abrechnungstag läuft von 07:00 bis 07:00 UTC und trägt das Datum seines
 * Beginns; er erscheint erst, nachdem er abgeschlossen ist.
 *
 * Frühere Messungen am 29.08.2026 (für niemanden erneut zu prüfen): Der
 * Ausgaben-Endpunkt `/v1/teams/{id}/spend` wies jede Anfrage an der Form ab,
 * `vercel.com/api/usage` jeden Zeitraum, die Beobachtungs-Metriken verlangen
 * das Zusatzprodukt „Observability Plus" (HTTP 402).
 */
export const KOSTENWACHE_ZUGANG = {
  gemessenAm: "2026-10-07",
  quelle: "abrechnung",
} as const;

/** Die zwei abgerechneten Posten, aus denen die Tagesmengen entstehen — mit
 *  ihrem Namen in den Abrechnungsdaten (gemessen 07.10.2026). */
export const ABRECHNUNGS_POSTEN = {
  aufbauten: "Function Invocations",
  schreibvorgaenge: "ISR Writes",
} as const;

/** So viele Tage holt ein Lauf: das Vergleichsfenster plus den beurteilten Tag
 *  plus zwei Tage Puffer für eine verspätete Abrechnung. */
export const ABRUF_TAGE = 17;

/**
 * Erscheint der jüngste Abrechnungstag nicht, wird das gemeldet statt
 * stillschweigend der vorige beurteilt. Normal ist ein abgeschlossener Tag
 * spätestens einen Tag nach seinem Ende da (gemessen 07.10.2026: am 07.10. um
 * 07:00 UTC lag der Tag bis 06.10. 07:00 vor).
 */
export const ABRECHNUNG_MAX_VERZUG_STUNDEN = 54;

// ─── Ablage (stillgelegt) ────────────────────────────────────────────────────

/**
 * Die eigene Ablage brauchte es, weil die Protokolle nur einen Tag hielten. Die
 * Abrechnungsdaten bleiben erhalten; seit dem 07.10.2026 schreibt niemand mehr
 * in diese Tabelle. Sie bleibt als Archiv der Protokoll-Messungen
 * (29.08.–05.10.2026) stehen — gelöscht wird nichts, was jemand später zum
 * Vergleich braucht.
 */
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

export interface Tagesmenge {
  /** ISO-Datum des Abrechnungstags (Beginn 07:00 UTC). */
  tag: string;
  /** Funktionsaufrufe. */
  aufbauten: number;
  /** Cache-Schreibvorgänge. */
  schreibvorgaenge: number;
}

/** Eine Zeile der Abrechnungsdaten — nur die Felder, die hier gelesen werden. */
interface AbrechnungsZeile {
  ChargePeriodStart?: string;
  ServiceName?: string;
  ConsumedQuantity?: number;
  Tags?: { ProjectId?: string };
}

/**
 * Tagesmengen eines Projekts aus den Abrechnungsdaten (JSONL).
 *
 * Ein Tag erscheint nur, wenn für ihn mindestens einer der beiden Posten in
 * den Daten steht. Fehlt er, fehlt der Tag — er wird NICHT als null abgelegt:
 * Eine Null behauptete am Folgetag einen Sprung ins Unendliche und verdürbe
 * danach zwei Wochen das Vergleichsniveau. Kaputte Zeilen werden übergangen;
 * kommt aus der ganzen Antwort kein Tag heraus, gibt es eben keinen.
 */
export function tagesmengenAusAbrechnung(jsonl: string, projectId: string): Tagesmenge[] {
  const tage = new Map<string, Tagesmenge>();
  for (const roh of jsonl.split("\n")) {
    if (!roh.trim()) continue;
    let z: AbrechnungsZeile;
    try {
      z = JSON.parse(roh) as AbrechnungsZeile;
    } catch {
      continue;
    }
    if (z.Tags?.ProjectId !== projectId || !z.ChargePeriodStart) continue;
    const feld =
      z.ServiceName === ABRECHNUNGS_POSTEN.aufbauten ? "aufbauten"
      : z.ServiceName === ABRECHNUNGS_POSTEN.schreibvorgaenge ? "schreibvorgaenge"
      : null;
    if (!feld) continue;
    const menge = Number(z.ConsumedQuantity);
    if (!Number.isFinite(menge)) continue;
    const tag = z.ChargePeriodStart.slice(0, 10);
    const t = tage.get(tag) ?? { tag, aufbauten: 0, schreibvorgaenge: 0 };
    t[feld] += menge;
    tage.set(tag, t);
  }
  return [...tage.values()].sort((a, b) => (a.tag < b.tag ? -1 : 1));
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
 * ZU PRÜFEN AB 11/2026: Seit dem Wechsel auf die Abrechnungsdaten (07.10.2026)
 * gibt es echte Historie für genau die abgerechneten Mengen. Gemessen am
 * Wechseltag über 19.09.–01.10.2026: Normalbetrieb solar-check.io bis zum
 * 1,72-fachen bei den Funktionsaufrufen und bis zum 2,48-fachen beim Schreiben
 * (01.10., Tag des monatlichen Datenstands), Filmprojekt bis 2,48 / 2,08. Der
 * Crawler-Sturm ab 02.10.2026 lag beim 7,02- / 4,41-fachen.
 * Sobald vier Wochen nach dem Sturm vorliegen, gehört die Schwelle
 * gegen `groesstesVielfaches()` nachgezogen; der Bericht nennt den Wert bei
 * jedem Lauf, damit ihn niemand suchen muss.
 */
export const SPRUNG_FAKTOR = 2.5;

// EIN GEMESSENER FEHLALARM, DER JEDEN MONAT WIEDERKOMMT — und der Grund, warum
// er hier steht statt in einer höheren Schwelle.
//
// Am 09.09.2026 meldete die Wache für solar-check.io einen Sprung in der FLÄCHE
// auf das 4,44-fache: 11.912 verschiedene Adressen gegen ein Vortagesniveau von
// 2.683. Nachgesehen, nicht vermutet — die Aufteilung nach Route für diesen Tag:
//
//   • 13.275 der 20.867 Aufbauten entfielen auf Atlas-Gemeindeseiten.
//   • 11.606 davon fielen in DREI Stunden (16:00–19:00 UTC). In den fünf
//     Stunden danach waren es 208.
//   • Genau in diesem Fenster lief der monatliche MaStR-Datenlauf
//     (16:11–18:54 UTC, erfolgreich) — und mit ihm sein Aufwärm-Crawl, der
//     bauartbedingt ALLE rund 11.000 Gemeindeseiten einmal abruft.
//
// Das ist also unsere eigene Wartung, und sie ist gewollt: Der Crawl bezahlt die
// Kaltaufbauten einmal, damit der erste echte Besucher nach dem Datenlauf eine
// gecachte Seite bekommt. Die Wache hat dabei nichts falsch gemessen — sie hat
// genau das gefunden, wofür es sie gibt (viele neue Adressen), und die Ursache
// war beim Nachsehen harmlos.
//
// WARUM TROTZDEM NICHTS AN DER SCHWELLE GEÄNDERT WIRD: Sie hochzusetzen ließe
// den Befund verschwinden, statt ihn zu erklären — und nähme uns die Empfindlich-
// keit für den echten Fall an jedem anderen Tag. Der Aufwärm-Crawl liegt mit rund
// 11.400 Adressen ohnehin über jeder Schwelle, die noch etwas fängt.
//
// WARUM ER SO SELTEN AUFFÄLLT: Der Datenlauf ist monatlich, und der vorige
// (05.09.2026) ist nach 26 Sekunden gescheitert. Der letzte erfolgreiche davor
// war der 05.08.2026 — außerhalb des 14-Tage-Fensters, aus dem das Vergleichs-
// niveau entsteht. Deshalb sieht ein Datenlauf-Tag IMMER wie ein Sprung aus, und
// zwar in der Fläche, nicht in der Last. (Seit 07.10.2026 heißt die Größe
// „Schreibvorgänge" — der Aufwärm-Crawl baut jede Gemeindeseite neu und schreibt
// sie in den Cache, er zeigt sich also dort.)
//
// FÜR DEN NÄCHSTEN LAUF: Meldet die Wache einen Sprung im Schreiben, ist die erste
// Frage, ob an diesem Tag der Datenlauf lief (`gh run list --workflow=mastr-
// refresh.yml`). Passen Fenster und Menge zusammen, ist der Befund erledigt.
// Passen sie NICHT zusammen — Sprung an einem Tag ohne Datenlauf, oder deutlich
// mehr Adressen als der Atlas hergibt —, dann ist es ein Fremder, und dann gilt
// die Anleitung in der Meldung: nachsehen, wer ruft und ob es aus dem Cache kommt.
//
// NICHT GEBAUT, mit Absicht: Die Wache könnte den Datenlauf-Tag selbst benennen.
// Dafür bräuchte sie ein Signal, wann der Crawl lief — der BNetzA-Datenstand ist
// es nicht (das ist das Veröffentlichungsdatum der Behörde, nicht unser Lauf).
// Ein neues Signal dafür ist eine eigene Entscheidung mit mehreren vertretbaren
// Antworten, keine Reparatur; sie gehört nicht in einen Auto-Fix.

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
/** Cache-Schreibvorgänge: normal 50.000 bis 470.000 am Tag bei solar-check.io,
 *  130.000 bis 440.000 beim Filmprojekt (Abrechnung 19.09.–05.10.2026). */
export const MIN_SCHREIBVORGAENGE = 20_000;

/** Median statt Mittelwert: Ein einzelner Ausreißer soll das Vergleichsniveau
 *  nicht anheben — sonst versteckt der erste Vorfall den zweiten. */
export function median(werte: number[]): number {
  if (!werte.length) return 0;
  const s = [...werte].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export type Groesse = "aufbauten" | "schreibvorgaenge";

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
  schreibvorgaenge: "das Schreiben in den Cache",
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
        `Ohne genug Vortage lässt sich ein Sprung nicht von einem normalen Tag unterscheiden.`,
    };
  }

  const groessen = [
    urteileGroesse("aufbauten", heute.aufbauten, basis.map((t) => t.aufbauten), MIN_AUFBAUTEN),
    urteileGroesse("schreibvorgaenge", heute.schreibvorgaenge, basis.map((t) => t.schreibvorgaenge), MIN_SCHREIBVORGAENGE),
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
  const schreiben = groessen.find((g) => g.groesse === "schreibvorgaenge")!;

  if (last.gesprungen && schreiben.gesprungen) {
    return (
      `Last UND Schreiben zusammen: Es kommen mehr Anfragen, und dabei werden viele Seiten neu gebaut. ` +
      `Das ist entweder ein echter Verkehrsanstieg oder ein Crawler, der den Bestand abläuft. ` +
      `Zuerst nachsehen, wer die Seiten aufruft (Anfrageprotokolle der Plattform, nach Kennung und Netzbetreiber).`
    );
  }
  if (schreiben.gesprungen) {
    return (
      `Nur das Schreiben: Es werden viel mehr Seiten neu gebaut und abgelegt, ohne dass die Last entsprechend steigt. ` +
      `Das ist der teure Fall. Übliche Ursachen: ein Datenlauf hat den Cache ungültig gemacht und der Aufwärm-Crawl ` +
      `baut alles neu, eine neue Seitengattung ist live gegangen, oder ein Crawler hat einen Bestand entdeckt.`
    );
  }
  return (
    `Nur die Last: Dieselben Seiten werden viel häufiger gebaut. ` +
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
  // Ganze Zahlen: Die Abrechnung führt Funktionsaufrufe mit Nachkommastellen
  // (gewichtete Aufrufe), und „20.763,858 Aufrufe" ist keine Aussage.
  return Math.round(n).toLocaleString("de-DE");
}

/**
 * Der Zeitraum, den ein Lauf abruft: die letzten `ABRUF_TAGE` Tage bis jetzt,
 * auf ganze UTC-Tage gerundet. HIER IST DIE WELTZEIT RICHTIG, anders als bei
 * jedem Stichtag im Projekt (siehe lib/zeit.ts): Die Abrechnung rechnet in UTC.
 */
export function abrufZeitraum(jetzt: Date): { von: string; bis: string } {
  const tagBeginn = Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate());
  return {
    von: new Date(tagBeginn - (ABRUF_TAGE - 1) * 86_400_000).toISOString(),
    bis: new Date(tagBeginn + 86_400_000).toISOString(),
  };
}

/**
 * Ist der jüngste Abrechnungstag zu alt? Ein Tag ist abgeschlossen 31 Stunden
 * nach Mitternacht seines Datums (Beginn 07:00 UTC plus 24 Stunden).
 */
export function abrechnungVerspaetet(jungsterTag: string, jetzt: Date): boolean {
  const ende = Date.parse(`${jungsterTag}T07:00:00.000Z`) + 86_400_000;
  return (jetzt.getTime() - ende) / 3_600_000 > ABRECHNUNG_MAX_VERZUG_STUNDEN;
}
