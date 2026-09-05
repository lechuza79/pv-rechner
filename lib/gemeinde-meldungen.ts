// Was es über EINEN Ort gerade zu berichten gibt.
//
// WARUM ES DIESE DATEI GIBT: Der Story-Katalog (docs/datenstories-katalog.md)
// beschreibt die Geschichten-Familien bundesweit, und der Beitrags-Generator
// (lib/social-posts.ts) rechnet sie auch bundesweit — aus EINEM Datensatz über
// Deutschland. Eine Gemeinde bekam davon nichts ab: Ihr einziger Aufhänger war
// die Platzierung aus dem Award-Kern, und die trägt nach eigener Messung nur
// bei rund einem Drittel der Orte. Die übrigen zwei Drittel hatten nichts zu
// erzählen — im Brief nicht, auf der Seite nicht, und in einer Abo-Mail erst
// recht nicht.
//
// Diese Datei ist dieselbe Systematik eine Ebene tiefer: Aus den Zahlen, die
// die Gemeindeseite ohnehin lädt, fällt eine Liste von Meldungen an. Jede
// prüft ihre eigenen Schranken und meldet sich ab, wenn sie nicht trägt —
// statt eine Aussage zu erzwingen, die auf kleiner Grundmenge entsteht.
//
// REIN und ohne Datenbank-, Next- oder server-only-Importe. Der Aufrufer
// reicht die Zahlen herein; ein Test prüft die Schranken ohne beides.
//
// DREI OBERFLÄCHEN, EINE RECHNUNG — das ist der ganze Punkt (dieselbe Lehre wie
// lib/gemeinde-vergleich.ts, wo Brief und Seite denselben Ort mit zwei
// verschiedenen Messgrößen beschrieben und sich dadurch widersprachen):
//   1. der Block „Was sich hier bewegt hat" auf der Gemeindeseite
//   2. die Abo-Mail an die Abonnenten dieses Orts
//   3. später der zweite Absatz im Kommunen-Anschreiben
// Wer eine vierte Oberfläche baut, ruft diese Funktion — er formuliert nicht
// nach.

import { fmtPvLeistung, fmtSpeicherKwh, pvLeistungTeile } from "./atlas-format";
import { ortPraeposition } from "./atlas-orte";

// ─── Schranken ───────────────────────────────────────────────────────────────

/**
 * Ab so vielen Anlagen trägt eine Aussage über eine Jahreszahl.
 *
 * Hergeleitet, nicht gegriffen: Der Kommunen-Outreach hat die Fehlerklasse
 * schon einmal bezahlt — Hamm im Eifelkreis, 16 Einwohner, ein
 * Balkonkraftwerk, „Platz 1 von 150". Der Superlativ entstand vollständig im
 * Nenner. Dort steht die Schwelle bei fünf (MIN_MENGE_FUER_AUFHAENGER); hier
 * geht es nicht um eine Platzierung, sondern um eine Bewegung, und „drei neue
 * Anlagen" ist als Bewegung schon eine Aussage. Fünf bleibt trotzdem die
 * Untergrenze, damit beide Oberflächen dieselbe Vorsicht zeigen.
 */
export const MIN_ANLAGEN_FUER_MELDUNG = 5;

/**
 * Ab so vielen betroffenen Anlagen wird der Auslauf der Vergütung gemeldet.
 *
 * Der Katalog nennt zwanzig (G4.2, „mindestens [20] betroffene Anlagen je
 * genannter Einheit"). Das ist die schärfste Schranke hier, und sie ist es aus
 * einem inhaltlichen Grund: Die Meldung sagt sinngemäß „bei Ihnen im Ort
 * verlieren Leute Geld". Bei drei Betroffenen ist das keine Lokalnachricht
 * mehr, sondern ein Hinweis auf drei identifizierbare Haushalte.
 */
export const MIN_ANLAGEN_FUER_AUSLAUF = 20;

/** Ab so vielen Batterien trägt eine Aussage über die Speicherdichte. */
export const MIN_BATTERIEN_FUER_MELDUNG = 5;

/**
 * So viele Jahre zahlt das EEG. Nach § 25 EEG endet die Vergütung am 31.12.
 * des zwanzigsten Jahres nach Inbetriebnahme.
 *
 * NICHT hier neu getippt, sondern aus der Einspeise-Konfiguration geholt —
 * dieselbe Zahl steht im Rechner und auf der Vergütungs-Tabelle, und drei
 * Fassungen davon liefen im Projekt schon einmal auseinander.
 */
export { FEED_IN_YEARS } from "./constants";
import { FEED_IN_YEARS } from "./constants";

// ─── Was hereingereicht wird ─────────────────────────────────────────────────

type SegRow = { segment: string; count: number; kwp: number };
type JahrRow = { year: number; count: number; kwp: number };
type JahrSegRow = { year: number; segment: string; count: number; kwp: number };

/**
 * Der Ausschnitt der Atlas-Daten, den die Meldungen brauchen.
 *
 * Bewusst als eigener, schmaler Typ statt `RegionAtlas`: Die Gemeindeseite
 * reicht ihre vorhandenen Daten herein, ein Test baut sich eine Zeile von Hand,
 * und keiner von beiden muss das ganze Datenmodell kennen.
 */
export type MeldungsDaten = {
  /** Name des Orts, wie er auf der Seite steht. */
  name: string;
  /** Achtstelliger Gemeindeschlüssel. Wandert in die Meldung, nie in den Text. */
  regionId: string;
  /** Einwohnerzahl. Ohne sie entfällt jede Pro-Kopf-Aussage. */
  population: number | null;
  solar: {
    total_count: number;
    total_kwp: number;
    by_segment: SegRow[];
    by_year: JahrRow[];
    by_year_segment: JahrSegRow[];
  };
  speicher: {
    kwh_batterie: number;
    by_segment?: { segment: string; count: number }[];
  };
  /** Datenstand des Anlagenregisters (ISO). Steht an jeder Zahl. */
  standIso: string;
};

/** Ein Förderprogramm, soweit die Meldung es braucht. */
export type MeldungsFoerderung = {
  name: string;
  /** Zählt es gerade? Kommt von `fundingZaehlt()`, wird NIE hier entschieden. */
  zaehlt: boolean;
};

/** Die Platzierung, soweit die Meldung sie braucht. Kommt aus dem Award-Kern. */
export type MeldungsPlatzierung = {
  /** Was gemessen wird, im Klartext — nie der interne Kategorietitel. */
  messgroesse: string;
  rang: number;
  /** Größe der Vergleichsgruppe. Steht IMMER dabei. */
  ausN: number;
  /** Wie die Gruppe heißt („im Landkreis Fulda", „in Hessen"). */
  gruppe: string;
};

// ─── Was herauskommt ─────────────────────────────────────────────────────────

/**
 * Die Art einer Meldung. Sie entscheidet NICHT über die Formulierung (die
 * steht am Eintrag), sondern darüber, wie eine Oberfläche sie einordnet:
 * Was sich bewegt hat, altert in Wochen; was den Bestand beschreibt, nicht.
 */
export type MeldungsArt =
  /** Etwas hat sich seit dem letzten Datenstand geändert. Altert schnell. */
  | "bewegung"
  /** Ein Stichtag steht bevor. Altert zum Stichtag. */
  | "stichtag"
  /** So steht der Ort da. Altert langsam, trägt eine stille Abo-Mail. */
  | "bestand";

export type Meldung = {
  /** Stabiler Schlüssel. Die Abo-Mail merkt sich daran, was sie schon sandte. */
  schluessel: string;
  art: MeldungsArt;
  /** Eine Zeile, die für sich steht — Betreffzeile, Listenpunkt, Überschrift. */
  titel: string;
  /** Zwei bis drei Sätze. Enthält den Nenner und, wo nötig, den Vorbehalt. */
  text: string;
  /**
   * Wie stark die Meldung ist, wenn eine Oberfläche nur eine zeigen darf.
   * Höher ist stärker. Bewusst eine Zahl und kein Sortier-Kommentar: Wer eine
   * Meldung ergänzt, muss sich entscheiden, wo sie steht.
   */
  gewicht: number;
};

// ─── Hilfsgrößen ─────────────────────────────────────────────────────────────

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

/** "in Fulda", "im Saarland", "in der Region Hannover".
 *
 *  Die Präposition kommt aus derselben Quelle wie überall im Atlas
 *  (lib/atlas-orte.ts) — sie hier nachzuformulieren wäre eine zweite Fassung
 *  einer Regel, die schon einmal auseinandergelaufen ist. Die dortige
 *  Vollfunktion braucht ein Regions-Objekt mit Ebene; hier ist die Ebene immer
 *  die Gemeinde, deshalb genügt die Präposition. */
const wo = (name: string) => `${ortPraeposition(name)} ${name}`;

/** Singular oder Plural — Grammatik ist Teil der Richtigkeit. */
function anlagenWort(n: number): string {
  return n === 1 ? "eine Anlage" : `${nf(n)} Anlagen`;
}

function segCount(d: MeldungsDaten, segment: string): number {
  return d.solar.by_segment.find((s) => s.segment === segment)?.count ?? 0;
}

function segKwp(d: MeldungsDaten, segment: string): number {
  return d.solar.by_segment.find((s) => s.segment === segment)?.kwp ?? 0;
}

function batterien(d: MeldungsDaten): number {
  return (d.speicher.by_segment ?? [])
    .filter((s) => s.segment.startsWith("batterie"))
    .reduce((x, s) => x + s.count, 0);
}

/** Das letzte Jahr, für das der Datenstand vollständig ist. */
function letztesVollesJahr(standIso: string): number {
  const jahr = Number(standIso.slice(0, 4));
  if (!Number.isFinite(jahr)) return new Date().getUTCFullYear() - 1;
  // Der Datenstand des laufenden Jahres ist per Bauart unvollständig: Anlagen
  // werden verspätet gemeldet. Das volle Jahr ist deshalb das vorige.
  return jahr - 1;
}

// ─── Die Meldungen ───────────────────────────────────────────────────────────

/**
 * Der Zubau des letzten vollen Jahres.
 *
 * WARUM NICHT DER LAUFENDE MONAT: Das Anlagenregister trägt zwar ein
 * Inbetriebnahme-DATUM, unsere Aggregation wirft beim Einlesen alles außer dem
 * JAHR weg (scripts/mastr-refresh.ts, `parseYear` schneidet auf vier Stellen).
 * Eine Monatsaussage wäre damit nicht gerechnet, sondern erfunden. Der Monat
 * ist nachrüstbar — eine Stelle im Import plus eine schmale Monatstabelle —
 * und steht als eigener Schritt an; bis dahin ist das Jahr die kleinste
 * ehrliche Einheit.
 */
function meldungZubau(d: MeldungsDaten): Meldung | null {
  const jahr = letztesVollesJahr(d.standIso);
  const zeile = d.solar.by_year.find((y) => y.year === jahr);
  if (!zeile || zeile.count < MIN_ANLAGEN_FUER_MELDUNG) return null;

  const vorjahr = d.solar.by_year.find((y) => y.year === jahr - 1);
  const teile = pvLeistungTeile(zeile.kwp);

  let vergleich = "";
  if (vorjahr && vorjahr.count >= MIN_ANLAGEN_FUER_MELDUNG) {
    const diff = zeile.count - vorjahr.count;
    if (diff > 0) vergleich = ` Im Jahr davor waren es ${nf(vorjahr.count)} — also ${nf(diff)} mehr.`;
    else if (diff < 0) vergleich = ` Im Jahr davor waren es ${nf(vorjahr.count)}.`;
    else vergleich = ` Genauso viele wie im Jahr davor.`;
  }

  return {
    schluessel: `zubau-${jahr}`,
    art: "bewegung",
    titel: `${anlagenWort(zeile.count)} kamen ${jahr} in ${d.name} dazu`,
    text:
      `${jahr} gingen in ${wo(d.name)} ${anlagenWort(zeile.count)} mit zusammen ` +
      `${teile.value} ${teile.unit} ans Netz.${vergleich}`,
    gewicht: 70,
  };
}

/**
 * Wie vielen Anlagen zum Jahresende die Einspeisevergütung ausläuft.
 *
 * Der stärkste Einzeleintrag des Katalogs (G4.2) — und die einzige Meldung mit
 * einem echten Termin und einer echten Handlung dahinter. Sie zählt nur die
 * privaten Dächer: Eine Freiflächenanlage von 2006 gehört einem Betreiber, der
 * seine Vermarktung kennt; ein Hausdach von 2006 gehört jemandem, für den das
 * eine Nachricht ist.
 */
function meldungAuslauf(d: MeldungsDaten, heuteJahr: number): Meldung | null {
  const jahrgang = heuteJahr - FEED_IN_YEARS;
  const betroffen = d.solar.by_year_segment
    .filter((r) => r.year === jahrgang && r.segment === "privat_dach")
    .reduce((x, r) => x + r.count, 0);
  if (betroffen < MIN_ANLAGEN_FUER_AUSLAUF) return null;

  return {
    schluessel: `auslauf-${heuteJahr}`,
    art: "stichtag",
    titel: `${anlagenWort(betroffen)} in ${d.name} verlieren Ende ${heuteJahr} die Einspeisevergütung`,
    text:
      `In ${wo(d.name)} stehen ${anlagenWort(betroffen)} auf privaten Dächern, die ` +
      `${jahrgang} ans Netz gingen. Für sie endet die EEG-Vergütung am 31. Dezember ${heuteJahr} — ` +
      `nach zwanzig Jahren, wie im Gesetz vorgesehen. Danach gibt es für den eingespeisten Strom ` +
      `nur noch den Marktwert. Wer davon betroffen ist, hat drei Möglichkeiten: den Eigenverbrauch ` +
      `erhöhen, in die Direktvermarktung wechseln oder die Anlage weiterlaufen lassen und den ` +
      `geringeren Erlös nehmen.`,
    gewicht: 100,
  };
}

/**
 * Ein kommunaler Zuschuss im Ort.
 *
 * Die einzige Meldung mit einer Handlung für einen Bewohner — und der Grund,
 * aus dem ein Abo für Bewohner überhaupt einen Wert hat. Sie fragt NICHT
 * selbst, ob ein Programm zählt: Das entscheidet `fundingZaehlt()` an einer
 * Stelle, und der Aufrufer reicht das Urteil herein.
 */
function meldungFoerderung(d: MeldungsDaten, programme: MeldungsFoerderung[]): Meldung | null {
  const aktiv = programme.filter((p) => p.zaehlt);
  if (aktiv.length === 0) return null;

  const namen = aktiv.map((p) => p.name);
  const liste =
    namen.length === 1
      ? namen[0]
      : `${namen.slice(0, -1).join(", ")} und ${namen[namen.length - 1]}`;

  return {
    schluessel: `foerderung-${aktiv.length}`,
    art: "bestand",
    titel:
      aktiv.length === 1
        ? `In ${d.name} gibt es einen kommunalen Zuschuss`
        : `In ${d.name} gibt es ${nf(aktiv.length)} kommunale Zuschüsse`,
    text:
      `${wo(d.name)} fördert Solaranlagen aus eigenen Mitteln: ${liste}. ` +
      `Das kommt zu Bundes- und Landesmitteln dazu, solange das jeweilige Programm ` +
      `die Kombination zulässt. Verbindlich ist immer die Auskunft der Gemeinde.`,
    gewicht: 90,
  };
}

/**
 * Die typische Anlage im Ort — und wie viele Speicher danebenstehen.
 *
 * ACHTUNG, das Verhältnis ist KEIN Anteil: Gezählt werden angemeldete
 * Speicher-Einheiten, nicht Dachanlagen mit Speicher. Ein Haushalt kann
 * mehrere anmelden, und ein Balkonspeicher hat gar keine Dachanlage. Als
 * „Quote" beschriftet wäre das eine falsche Aussage — derselbe Fehler steht
 * schon einmal im Beitrags-Generator beschrieben.
 */
function meldungBestand(d: MeldungsDaten): Meldung | null {
  const anlagen = segCount(d, "privat_dach");
  if (anlagen < MIN_ANLAGEN_FUER_MELDUNG) return null;

  const kwp = segKwp(d, "privat_dach");
  const mittel = kwp / anlagen;
  const akkus = batterien(d);

  const speicherSatz =
    akkus >= MIN_BATTERIEN_FUER_MELDUNG
      ? ` Daneben sind ${nf(akkus)} Batteriespeicher mit zusammen ${fmtSpeicherKwh(d.speicher.kwh_batterie)} ` +
        `angemeldet — gezählt werden Speicher, nicht Anlagen mit Speicher, ein Haushalt kann mehrere haben.`
      : "";

  return {
    schluessel: "bestand-privat",
    art: "bestand",
    titel: `${anlagenWort(anlagen)} auf privaten Dächern in ${d.name}`,
    text:
      `Auf den privaten Dächern in ${wo(d.name)} stehen ${anlagenWort(anlagen)} mit zusammen ` +
      `${fmtPvLeistung(kwp)}. Die durchschnittliche Anlage hat damit ${fmtPvLeistung(mittel)}.` +
      speicherSatz,
    gewicht: 40,
  };
}

/**
 * Die Platzierung.
 *
 * Vier Regeln aus dem Kommunen-Audit, alle im Aufrufer nicht wiederholbar,
 * deshalb hier: Die Gruppengröße steht IMMER dabei („von 53") — ohne sie
 * behauptet „Platz 1 in Hessen" den ersten Platz unter allen hessischen
 * Kommunen, während der Rang nur in einer Teilmenge gilt. Und die Messgröße
 * steht im Klartext, nie der interne Kategorietitel.
 */
function meldungPlatzierung(d: MeldungsDaten, p: MeldungsPlatzierung | null): Meldung | null {
  if (!p) return null;
  if (p.ausN < MIN_ANLAGEN_FUER_MELDUNG) return null;
  // Nur Lob mit Namen. Ein hinterer Rang ist eine Bloßstellung und wird nie
  // zur Meldung — dieselbe Regel wie „Top ja, Flop nie" im Katalog.
  if (p.rang > 3) return null;

  const rangWort = p.rang === 1 ? "an der Spitze" : `auf Platz ${p.rang}`;
  return {
    schluessel: `platz-${p.rang}`,
    art: "bestand",
    titel: `${d.name} steht ${rangWort} — ${p.messgroesse}`,
    text:
      `Gemessen an ${p.messgroesse} steht ${wo(d.name)} ${p.gruppe} auf Platz ${p.rang} ` +
      `von ${nf(p.ausN)}. Was dort steht, haben die Bürgerinnen und Bürger gebaut, nicht die Verwaltung.`,
    gewicht: 80,
  };
}

// ─── Die eine Funktion, die alle Oberflächen rufen ───────────────────────────

/**
 * Alle Meldungen, die dieser Ort gerade trägt — stärkste zuerst.
 *
 * Leer ist ein zulässiges Ergebnis und ausdrücklich gewollt: Ein Ort mit drei
 * Anlagen hat nichts zu melden, und eine erzwungene Aussage wäre genau der
 * Fehler, gegen den die Schranken oben gebaut sind. Der Aufrufer blendet den
 * Block dann aus, statt eine leere Überschrift zu zeigen.
 */
export function gemeindeMeldungen(opts: {
  daten: MeldungsDaten;
  foerderung?: MeldungsFoerderung[];
  platzierung?: MeldungsPlatzierung | null;
  /** Das laufende Jahr. Hereingereicht, nicht aus der Uhr gelesen — sonst
   *  liefert dieselbe Funktion im Test je nach Kalendertag ein anderes
   *  Ergebnis (dieselbe Fehlerklasse wie ein Vergleich ohne Uhr im
   *  Förder-Verlauf). */
  heuteJahr: number;
}): Meldung[] {
  const { daten, foerderung = [], platzierung = null, heuteJahr } = opts;

  return [
    meldungAuslauf(daten, heuteJahr),
    meldungFoerderung(daten, foerderung),
    meldungPlatzierung(daten, platzierung),
    meldungZubau(daten),
    meldungBestand(daten),
  ]
    .filter((m): m is Meldung => m !== null)
    .sort((a, b) => b.gewicht - a.gewicht);
}

/**
 * Trägt dieser Ort überhaupt etwas, das eine Mail rechtfertigt?
 *
 * Bewusst schärfer als „es gibt mindestens eine Meldung": Eine reine
 * Bestandsbeschreibung ist keine Nachricht — sie stand beim letzten Mal
 * genauso da. Eine Mail geht nur raus, wenn sich etwas bewegt hat oder ein
 * Stichtag bevorsteht. Für den stillen Fall gibt es die Quartals-Standmeldung,
 * und die entscheidet der Versand, nicht diese Funktion.
 */
export function hatNachricht(meldungen: Meldung[]): boolean {
  return meldungen.some((m) => m.art === "bewegung" || m.art === "stichtag");
}
