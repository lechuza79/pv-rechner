// Was einen ORT zur Geschichte macht — nach den festen Familien des
// Story-Katalogs (docs/datenstories-katalog.md), gerechnet für eine Gemeinde.
//
// WARUM ES DIESE DATEI NEBEN lib/gemeinde-meldungen.ts GIBT, und warum die
// Unterscheidung der ganze Punkt ist:
//
// Die Ortsmeldungen sind für die ABO-MAIL gebaut. Dort hat der Leser die Seite
// nicht vor sich, also ist es richtig, ihm den Bestand zu beschreiben („478
// Anlagen auf privaten Dächern"). Auf der Ortsseite ist derselbe Satz
// Doppelung: Zwei Zentimeter tiefer steht dieselbe Zahl als Kachel. Gemessen am
// 05.09.2026 an Heringen — von fünf Meldungen waren drei wörtlich das, was
// darunter schon stand, und eine war die Auszeichnungs-Karte darüber.
//
// EINE GESCHICHTE IST EIN BEFUND, KEINE BESCHREIBUNG. Der Katalog führt dafür
// feste Familien; hier stehen die, die sich für EINEN Ort rechnen lassen und
// die auf der Seite nicht ohnehin schon sichtbar sind:
//
//   G4.1  Was der Ort eingespielt hat — Einspeisevergütung seit 2000
//   G4.2  Der Auslauf-Jahrgang — wem die Vergütung dieses Jahr endet
//   G4.4  Die Wirkungsbilanz — Erzeugung und vermiedenes CO₂
//
// DIE REGEL, DIE HIER GILT: Was auf der Seite schon steht, gehört nicht in den
// Feed. Zubau des Vorjahres, Anlagenzahl, Leistung je Einwohner und die
// Platzierung stehen dort als Kacheln, Ring und eigene Karte — sie kommen
// deshalb bewusst NICHT vor, obwohl sich Sätze darüber leicht bilden ließen.
//
// JEDE GESCHICHTE TRÄGT IHRE ZAHLEN ALS DATEN, nicht nur im Fließtext. Erst
// damit kann eine Karte ein Bild zeichnen statt eines Absatzes — und erst damit
// passt sie in dieselbe Form wie ein Fund aus dem Story-Suchlauf, der seine
// Werte ebenso benannt und mit Einheit führt.
//
// REIN und ohne Datenbank-, Next- oder server-only-Importe: Der Aufrufer reicht
// die Zahlen herein, die die Gemeindeseite ohnehin lädt.

import { FEED_IN_YEARS, PERSONEN } from "./constants";
import {
  co2Tonnen,
  eigenverbrauchAnteilRegion,
  einspeiseCt,
  erzeugungKwh,
} from "./atlas-impact";

// ─── Was hereingereicht wird ─────────────────────────────────────────────────

type JahrSegRow = { year: number; segment: string; count: number; kwp: number };

export type StoryDaten = {
  name: string;
  /** Achtstelliger Gemeindeschlüssel — bestimmt den Standort-Ertrag. */
  regionId: string;
  population: number | null;
  solar: {
    total_count: number;
    total_kwp: number;
    by_segment: { segment: string; count: number; kwp: number }[];
    by_year_segment: JahrSegRow[];
  };
  speicher: { by_segment?: { segment: string; count: number }[]; kwh_batterie: number };
  /** Datenstand des Anlagenregisters (ISO). */
  standIso: string;
};

// ─── Was herauskommt ─────────────────────────────────────────────────────────

/** Die Familie aus dem Katalog, aus der die Geschichte kommt. */
export type StoryKategorie = "G4.1" | "G4.2" | "G4.4";

/** Was die Kategorie dem Leser sagt — nie das Kürzel. */
export const KATEGORIE_LABEL: Record<StoryKategorie, string> = {
  "G4.1": "Was der Ort eingespielt hat",
  "G4.2": "Stichtag",
  "G4.4": "Wirkungsbilanz",
};

export type StoryWert = {
  name: string;
  wert: number;
  einheit: string;
  /** Die tragende Zahl der Geschichte. Höchstens EINE je Geschichte — sie steht
   *  im Bild groß, die übrigen klein daneben. */
  haupt?: boolean;
};

export type OrtsStory = {
  /**
   * Stabile Kennung OHNE Zahl: Zahlen folgen dem Datenstand, und eine wandernde
   * Kennung verlöre die Zuordnung zwischen zwei Läufen — dieselbe Regel wie beim
   * Fund aus dem Story-Suchlauf.
   */
  kennung: string;
  kategorie: StoryKategorie;
  /**
   * Die Beschriftung der Kategorie, FERTIG AUFGELÖST.
   *
   * Warum sie an der Geschichte hängt statt in einer Tabelle, die sich die
   * Oberfläche holt: Diese Datei rechnet auf der Vergütungsreihe, der
   * Stundensimulation und einem halben Dutzend Konfigurationen. Eine
   * Client-Komponente, die auch nur EINEN Wert von hier importiert, zieht die
   * ganze Kette in das Browser-Bündel jeder der 11.000 Ortsseiten — und beim
   * ersten Versuch stürzte die Komponente beim Hydratisieren ab und riss über
   * die Fehlergrenze die halbe Seite mit. Dieselbe Lehre wie bei der
   * Stand-Zeile: Die Auflösung gehört auf den Server, das Rendern darf überall
   * passieren. Die Oberfläche importiert deshalb nur noch TYPEN von hier.
   */
  kategorieLabel: string;
  /** Eine Zeile, die für sich steht. */
  titel: string;
  /** Zwei bis drei Sätze. Enthält den Nenner und, wo nötig, den Vorbehalt. */
  text: string;
  /** Benannte Werte mit Einheit — daraus zeichnet die Karte ihr Bild. */
  werte: StoryWert[];
  /** Woran die Geschichte hängt: Grundmenge, Nenner, Annahmen. Im Klartext. */
  grundlage: string;
  /** Höher ist stärker. Wer eine Geschichte ergänzt, entscheidet, wo sie steht. */
  gewicht: number;
};

// ─── Schranken ───────────────────────────────────────────────────────────────

/**
 * Ab so vielen betroffenen Anlagen wird der Auslauf gemeldet.
 *
 * Zwanzig, wie im Katalog (G4.2, „mindestens [20] betroffene Anlagen je
 * genannter Einheit"). Darunter ist die Aussage über eine Handvoll Haushalte,
 * die sich im Ort gegenseitig kennen.
 */
export const MIN_ANLAGEN_FUER_AUSLAUF = 20;

/**
 * Ab so vielen Anlagen trägt eine Geldsumme über den ganzen Bestand.
 *
 * Dieselbe Untergrenze wie beim Aufhänger im Kommunen-Anschreiben. Der Fall,
 * gegen den sie steht, ist belegt: Hamm im Eifelkreis, 16 Einwohner, eine
 * Anlage — jede Pro-Kopf-Zahl entsteht dort vollständig im Nenner.
 */
export const MIN_ANLAGEN_FUER_GELD = 5;

// ─── Hilfsgrößen ─────────────────────────────────────────────────────────────

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

/** Auf so viele Nachkommastellen runden — EINMAL, damit Text und Kachel
 *  dieselbe Zahl lesen. */
const runde = (n: number, stellen: number) => {
  const f = 10 ** stellen;
  return Math.round(n * f) / f;
};

/** Singular oder Plural — Grammatik ist Teil der Richtigkeit. */
function anlagenWort(n: number): string {
  return n === 1 ? "eine Anlage" : `${nf(n)} Anlagen`;
}

/** Das letzte Jahr, für das der Datenstand vollständig ist. */
function letztesVollesJahr(standIso: string): number {
  const jahr = Number(standIso.slice(0, 4));
  if (!Number.isFinite(jahr)) return new Date().getUTCFullYear() - 1;
  // Anlagen werden verspätet gemeldet; das laufende Jahr ist per Bauart
  // unvollständig.
  return jahr - 1;
}

function segSumme(d: StoryDaten, segment: string): { count: number; kwp: number } {
  const z = d.solar.by_segment.find((s) => s.segment === segment);
  return { count: z?.count ?? 0, kwp: z?.kwp ?? 0 };
}

function batterien(d: StoryDaten): { count: number; kwh: number } {
  const count = (d.speicher.by_segment ?? [])
    .filter((s) => s.segment.startsWith("batterie"))
    .reduce((x, s) => x + s.count, 0);
  return { count, kwh: d.speicher.kwh_batterie };
}

/**
 * Der EINGESPEISTE Anteil je Segment.
 *
 * Nur er wird vergütet — selbst verbrauchter Strom bekommt keine Zahlung. Für
 * private Dächer kommt der Eigenverbrauch aus den Zahlen DIESER Region
 * (Anlagengröße, Speicherbestand, Standort-Ertrag); für Gewerbe und Freifläche
 * ist er uns nicht belegt, dort wird mit voller Einspeisung gerechnet.
 *
 * DIE FEHLERRICHTUNG STEHT AN DER ZAHL, nicht nur hier: Wo ein Gewerbebetrieb
 * selbst verbraucht, fällt die Summe zu hoch aus. Das ist die unangenehme
 * Richtung, und sie gehört deshalb sichtbar an die Geschichte (siehe
 * `grundlage` bei G4.1).
 */
function einspeiseAnteil(d: StoryDaten, segment: string): number {
  if (segment !== "privat_dach") return 1;
  const dach = segSumme(d, "privat_dach");
  const bat = batterien(d);
  const ev = eigenverbrauchAnteilRegion(
    { dachCount: dach.count, dachKwp: dach.kwp, batterieCount: bat.count, batterieKwh: bat.kwh },
    d.regionId,
  );
  if (ev === null) return 1;
  return Math.max(0, 1 - ev);
}

// ─── G4.1 — Was der Ort eingespielt hat ──────────────────────────────────────

/**
 * Die Einspeisevergütung, die seit 2000 in diesen Ort geflossen ist.
 *
 * Je Baujahr und Anlagenart: rechnerische Jahreserzeugung × eingespeister
 * Anteil × Vergütungssatz DIESES Jahrgangs × Zahl der bereits vergüteten Jahre,
 * gedeckelt bei den zwanzig Jahren des EEG. Kein Mischsatz — der Satz hängt
 * dramatisch am Baujahr (ein privates Dach von 2010 bekam ein Vielfaches eines
 * von 2025), und genau das ist die Aussage.
 *
 * DER NENNER SIND ANLAGEN, NICHT EINWOHNER (Katalog G4.1). Die Pro-Kopf-Zahl
 * darf danebenstehen, nie allein — sonst behauptet sie eine Auszahlung an jeden.
 * Das Wort „Subvention" kommt nicht vor.
 */
function storyEingespielt(d: StoryDaten, heuteJahr: number): OrtsStory | null {
  if (d.solar.total_count < MIN_ANLAGEN_FUER_GELD) return null;
  if (d.solar.by_year_segment.length === 0) return null;

  let summe = 0;
  let anlagen = 0;
  for (const z of d.solar.by_year_segment) {
    if (z.kwp <= 0) continue;
    const jahre = Math.min(FEED_IN_YEARS, heuteJahr - z.year);
    if (jahre <= 0) continue;
    const kwpMittel = z.count > 0 ? z.kwp / z.count : null;
    const ct = einspeiseCt(z.segment, z.year, kwpMittel);
    const kwh = erzeugungKwh(z.kwp, d.regionId) * einspeiseAnteil(d, z.segment);
    summe += (kwh * ct * jahre) / 100;
    anlagen += z.count;
  }
  if (summe <= 0 || anlagen < MIN_ANLAGEN_FUER_GELD) return null;

  // EINE Rundung je Größe, und Text wie Kachel lesen dieselbe.
  //
  // Der Fehler, gegen den das steht, war beim ersten Lauf sofort da: Die Kachel
  // zeigte „17.100 € je Anlage", der Satz daneben „17.139 €" — dieselbe Größe,
  // zwei Zahlen auf einer Karte. Von außen sieht keine der beiden falsch aus.
  const mio = runde(summe / 1_000_000, 1);
  const jeAnlage = Math.round(summe / anlagen / 100) * 100;
  const proKopf =
    d.population && d.population > 0 ? Math.round(summe / d.population / 10) * 10 : null;

  const werte: StoryWert[] = [
    { name: "seit 2000 geflossen", wert: mio, einheit: "Mio €", haupt: true },
    { name: "je Anlage", wert: jeAnlage, einheit: "€" },
  ];
  if (proKopf !== null) {
    werte.push({ name: "auf alle Einwohner umgelegt", wert: proKopf, einheit: "€" });
  }

  return {
    kennung: "eingespielt",
    kategorie: "G4.1",
    kategorieLabel: KATEGORIE_LABEL["G4.1"],
    titel:
      `${mio >= 1 ? `${mio.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio €` : `${nf(summe)} €`} ` +
      `Einspeisevergütung sind seit 2000 nach ${d.name} geflossen`,
    text:
      `Verteilt auf ${anlagenWort(anlagen)}, die bisher mindestens ein volles Jahr vergütet wurden, ` +
      `sind das im Schnitt ${nf(jeAnlage)} € je Anlage. Der Satz hängt am Baujahr: Wer früh gebaut ` +
      `hat, bekommt ein Vielfaches dessen, was heute gezahlt wird.` +
      (proKopf !== null
        ? ` Auf alle ${nf(d.population!)} Einwohner umgelegt wären es ${nf(proKopf)} € — das ist eine ` +
          `Standortkennzahl, keine Auszahlung an jeden.`
        : ""),
    werte,
    grundlage:
      `Gerechnet, nicht gemessen: Jahreserzeugung je Baujahr aus der installierten Leistung und ` +
      `dem Standort-Ertrag, multipliziert mit dem Vergütungssatz dieses Jahrgangs. Vergütet wird ` +
      `nur der eingespeiste Strom; bei privaten Dächern ist der Eigenverbrauch aus dem Anlagen- ` +
      `und Speicherbestand des Orts abgezogen, bei Gewerbe und Freifläche ist er uns nicht belegt — ` +
      `dort fällt die Summe zu hoch aus, wenn selbst verbraucht wird. Gezählt werden nur Anlagen ` +
      `mit mindestens einem vollen Vergütungsjahr — die Zahl liegt deshalb unter dem Gesamtbestand ` +
      `des Orts.`,
    gewicht: 90,
  };
}

// ─── G4.2 — Der Auslauf-Jahrgang ─────────────────────────────────────────────

/**
 * Wem in diesem Jahr die Einspeisevergütung endet.
 *
 * Der stärkste Einzeleintrag des Katalogs, und der einzige der drei, der einen
 * Termin trägt. Gezählt werden NUR private Dächer: Bei Gewerbe und Freifläche
 * ist der Weiterbetrieb eine Unternehmensentscheidung, keine Haushaltsfrage.
 */
function storyAuslauf(d: StoryDaten, heuteJahr: number): OrtsStory | null {
  const jahrgang = heuteJahr - FEED_IN_YEARS;
  const betroffen = d.solar.by_year_segment
    .filter((z) => z.year === jahrgang && z.segment === "privat_dach")
    .reduce((s, z) => s + z.count, 0);
  if (betroffen < MIN_ANLAGEN_FUER_AUSLAUF) return null;

  const altCt = runde(einspeiseCt("privat_dach", jahrgang, null), 2);

  return {
    kennung: "auslauf",
    kategorie: "G4.2",
    kategorieLabel: KATEGORIE_LABEL["G4.2"],
    titel: `${anlagenWort(betroffen)} in ${d.name} verlieren Ende ${heuteJahr} die Einspeisevergütung`,
    text:
      `Sie gingen ${jahrgang} ans Netz und bekamen seither ${altCt.toLocaleString("de-DE")} Cent ` +
      `je Kilowattstunde. Nach zwanzig Jahren endet die Vergütung am 31. Dezember, wie im Gesetz ` +
      `vorgesehen; danach gibt es nur noch den Marktwert. Wer betroffen ist, hat drei Wege: den ` +
      `Eigenverbrauch erhöhen, in die Direktvermarktung wechseln oder die Anlage weiterlaufen lassen.`,
    werte: [
      { name: "betroffene Anlagen", wert: betroffen, einheit: "", haupt: true },
      { name: `Satz seit ${jahrgang}`, wert: runde(altCt, 2), einheit: "ct/kWh" },
      // KEIN Stichtag als Kachelwert: Eine Jahreszahl ist keine Messgröße, sie
      // ließe sich weder vergleichen noch runden — und neben der Jahreszahl des
      // Baujahrs im Text stünden zwei Zahlen, die gleich aussehen und
      // Verschiedenes meinen. Der Termin steht in der Schlagzeile, wo er
      // hingehört.
    ],
    grundlage:
      `Nur private Dachanlagen des Baujahrs ${jahrgang}; bei Gewerbe und Freifläche ist der ` +
      `Weiterbetrieb eine Unternehmensentscheidung. Das Register führt das Baujahr, nicht den Tag — ` +
      `maßgeblich ist ohnehin das Jahresende.`,
    gewicht: 100,
  };
}

// ─── G4.4 — Die Wirkungsbilanz ───────────────────────────────────────────────

/**
 * Was der Bestand im Jahr erzeugt und an CO₂ vermeidet.
 *
 * ERZEUGUNG IST GESCHÄTZT, NIE GEMESSEN (Katalog G4.4) — das steht an der Zahl.
 * Der CO₂-Faktor ist bewusst konservativ gewählt; der amtliche
 * Vermeidungsfaktor für Photovoltaik liegt deutlich höher.
 */
function storyWirkung(d: StoryDaten): OrtsStory | null {
  if (d.solar.total_count < MIN_ANLAGEN_FUER_GELD) return null;
  const kwh = erzeugungKwh(d.solar.total_kwp, d.regionId);
  if (kwh <= 0) return null;
  // Auch hier: EINE Rundung je Größe, aus der Text und Kachel lesen.
  const tonnen = Math.round(co2Tonnen(kwh));
  const gwh = runde(kwh / 1_000_000, 1);

  // Haushalte als Größenvergleich: 3.000 kWh ist der Verbrauch eines
  // Zwei-Personen-Haushalts nach der Tabelle des Rechners — genannt wird er,
  // damit die Zahl nicht als Versorgungsgrad des Orts gelesen wird.
  const haushalte = Math.round(kwh / HAUSHALT_KWH);

  return {
    kennung: "wirkung",
    kategorie: "G4.4",
    kategorieLabel: KATEGORIE_LABEL["G4.4"],
    titel: `Die Solaranlagen in ${d.name} erzeugen rechnerisch ${gwh.toLocaleString("de-DE", { maximumFractionDigits: 1 })} GWh im Jahr`,
    text:
      `Das entspricht dem Jahresverbrauch von rund ${nf(haushalte)} Zwei-Personen-Haushalten und ` +
      `vermeidet rechnerisch ${nf(tonnen)} Tonnen CO₂. Erzeugt und verbraucht wird nicht ` +
      `gleichzeitig — die Zahl ist eine Jahressumme, kein Versorgungsgrad.`,
    werte: [
      { name: "Erzeugung im Jahr", wert: gwh, einheit: "GWh", haupt: true },
      { name: "vermiedenes CO₂", wert: tonnen, einheit: "t/Jahr" },
      { name: "entspricht Haushalten", wert: haushalte, einheit: "" },
    ],
    grundlage:
      `Geschätzt, nicht gemessen: installierte Leistung × Standort-Ertrag × Praxis-Faktor des ` +
      `Anlagenbestands. Der CO₂-Faktor ist bewusst konservativ — der amtliche Vermeidungsfaktor ` +
      `für Photovoltaik liegt höher.`,
    gewicht: 60,
  };
}

/** Jahresverbrauch, gegen den die Erzeugung veranschaulicht wird.
 *
 *  AUS DER HAUSHALTS-TABELLE DES RECHNERS, nicht hier getippt: Dieselbe Zahl
 *  steht im PV-Rechner und im Bedarfs-Flow, und drei Fassungen davon liefen in
 *  diesem Projekt schon einmal auseinander. Der Zwei-Personen-Haushalt ist auch
 *  sonst der Bezugsfall der Atlas-Rechnungen. */
const HAUSHALT_KWH = PERSONEN.find((p) => p.count === 2)!.verbrauch;

// ─── Der Aufruf ──────────────────────────────────────────────────────────────

/**
 * Die Geschichten über EINEN Ort, stärkste zuerst.
 *
 * Leer ist ein zulässiges Ergebnis — jede Familie prüft ihre eigenen Schranken
 * und meldet sich ab, wenn sie nicht trägt. Eine Oberfläche, die daraufhin
 * nichts zeigt, ist richtig; eine, die eine Aussage erzwingt, wäre es nicht.
 */
export function ortsStories(opts: {
  daten: StoryDaten;
  /** Das laufende Jahr. Hereingereicht, nicht aus der Uhr gelesen — sonst
   *  liefert dieselbe Funktion im Test je nach Kalendertag ein anderes
   *  Ergebnis. */
  heuteJahr: number;
}): OrtsStory[] {
  const { daten, heuteJahr } = opts;
  return [storyAuslauf(daten, heuteJahr), storyEingespielt(daten, heuteJahr), storyWirkung(daten)]
    .filter((s): s is OrtsStory => s !== null)
    .sort((a, b) => b.gewicht - a.gewicht);
}

export { letztesVollesJahr };
