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
// HIER STEHT NUR, WAS DER STORY-SUCHLAUF NICHT HAT. Seit dessen Merge
// (05.09.2026) führt lib/social-funde.ts die Muster des Katalogs zentral —
// Ausreißer, Kontrast, Umkehrung, Toplisten, Flächenmix, Kohorte, Anomalie —
// und lib/social-fundvorrat.ts liest sie JE ORT aus dem Vorrat. Diese Datei
// baut davon nichts nach; sie ergänzt zwei Familien, die der Suchlauf nicht
// kennt, weil sie keinen Vergleich zwischen Orten brauchen, sondern die
// Vergütungsreihe des eigenen Bestands:
//
//   G4.1  Was der Ort eingespielt hat — Einspeisevergütung seit 2000
//   G4.2  Der Auslauf-Jahrgang — wem die Vergütung dieses Jahr endet
//
// Alles Übrige kommt aus dem Vorrat und wird hier nur in dieselbe Form
// gebracht (siehe `ausFund`). Wer eine dritte Familie ergänzt, prüft zuerst,
// ob der Suchlauf sie schon hat.
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

import { FEED_IN_YEARS } from "./constants";
import { fmtPvLeistung } from "./atlas-format";
import { eigenverbrauchAnteilRegion, einspeiseCt, erzeugungKwh } from "./atlas-impact";
import type { VorratsFund } from "./social-fundvorrat";

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
  /**
   * Zubau je Monat, die letzten gut zwei Jahre — aus der eigenen Monatstabelle.
   *
   * Der Jahresbestand ist dafür zu grob: Ein Ort, in dem binnen dreier Monate
   * auffällig viel ans Netz geht, sieht in der Jahreszahl aus wie jeder andere.
   * Fehlt die Angabe, entfallen die beiden Monatsfamilien — kein Rückfall auf
   * das Jahr, das wäre eine andere Aussage.
   */
  monate?: { monat: string; segment: string; count: number }[];
  /**
   * Wohnungen nach Gebäudegröße aus dem Zensus — der Nenner, den das
   * Anlagenregister nicht kennt.
   */
  wohnungen?: { gesamt: number; einZwei: number } | null;
};

// ─── Was herauskommt ─────────────────────────────────────────────────────────

/** Die Familie aus dem Katalog, aus der die Geschichte kommt. */
export type StoryKategorie =
  | "G2.zubau"
  | "G3.vergleich"
  | "G4.1"
  | "G4.2"
  | "G10"
  | "G14"
  | "G15"
  | "G16"
  | "fund";

/** Was die Kategorie dem Leser sagt — nie das Kürzel. */
export const KATEGORIE_LABEL: Record<StoryKategorie, string> = {
  "G4.1": "Was der Ort eingespielt hat",
  "G4.2": "Stichtag",
  "G2.zubau": "Was sich bewegt",
  G10: "Auffällig",
  G15: "Wo noch nichts steht",
  "G3.vergleich": "Im Vergleich",
  G14: "Wo der Strom herkommt",
  G16: "Wie sich die Anlagen verändert haben",
  // Ein Fund bringt seine eigene Kategorie mit (der Suchlauf setzt sie je
  // Muster) — dieses Label greift nur, wo sie fehlt.
  fund: "Aus den Daten",
};

export type StoryWert = {
  name: string;
  wert: number;
  einheit: string;
  /** Die tragende Zahl der Geschichte. Höchstens EINE je Geschichte — sie steht
   *  im Bild groß, die übrigen klein daneben. */
  haupt?: boolean;
};

/**
 * Die Bildform, in der diese Geschichte gezeigt wird.
 *
 * Nicht frei gewählt, sondern aus den fünf abgenommenen Formen des
 * Beitrags-Registers (lib/social-bildformen.ts) — und nach DEREN Regeln:
 *
 *  · „Balken" trägt nur, wenn die Längen wirklich auseinandergehen.
 *  · „Ringpaar" braucht ein Ganzes; ohne eines behauptet der leere Rest etwas,
 *    das es nicht gibt.
 *  · „Säule" ist der Fall ZWEI Werte OHNE Ganzes — der Unterschied ist die
 *    überragende Fläche.
 *  · „Einzelkennzahl" für alles, wo ein Vergleich nichts zeigt.
 *
 * Die Form steht an der Geschichte und nicht in der Oberfläche: Wer eine
 * Familie ergänzt, entscheidet damit auch, wie sie aussieht — sonst rät die
 * Karte, und Raten heißt hier, eine Aussage über die Daten zu treffen.
 */
export type StoryBildform = "vergleich" | "kennzahl" | "donut" | "saeule";

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
  /** Wie sie gezeigt wird — siehe {@link StoryBildform}. */
  bildform: StoryBildform;
  /**
   * Das Ganze, auf das sich die Werte beziehen — nur bei Anteilen.
   *
   * Es entscheidet über die Form: Mit Ganzem darf der Ring stehen, ohne eines
   * nicht. Fehlt es fälschlich, sagt das Bild etwas über einen Rest, den es
   * nicht gibt.
   */
  ganzes?: number;
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
    bildform: "kennzahl",
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
    bildform: "kennzahl",
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

// G4.4 „Die Wirkungsbilanz" (Erzeugung und vermiedenes CO₂) stand hier und ist
// am 05.09.2026 auf Ansage des Betreibers wieder verschwunden: rechenbar, aber
// als Satz auf einer Ortsseite unverständlich. Die Zahlen dafür gibt es
// weiterhin (lib/atlas-impact.ts) — es fehlt eine Form, in der sie jemandem
// etwas sagen, nicht die Rechnung.

// ─── G16 — Die Kohorte ───────────────────────────────────────────────────────

/**
 * Wie sich die typische Anlage dieses Orts über die Jahrgänge verändert hat.
 *
 * DIE FAMILIE AUS DEM KATALOG, MIT ORTSGROSSER SCHWELLE. Der bundesweite
 * Suchlauf verlangt 1.000 Anlagen je Baujahr — keine einzige Gemeinde kommt
 * dorthin, die Familie fiele auf Ortsebene also ersatzlos aus. Gefragt wird
 * dieselbe Frage („was ist heute anders als früher"), gemessen wird sie an der
 * Grundmenge, die ein Ort hat.
 *
 * NUR PRIVATE DÄCHER: Ein einzelner Gewerbebau oder eine Freifläche verschiebt
 * den Mittelwert eines Jahrgangs um ein Vielfaches — die Aussage wäre dann
 * nicht „die typische Anlage", sondern „es gab ein Projekt".
 */
function storyKohorte(d: StoryDaten): OrtsStory | null {
  const letztes = letztesVollesJahr(d.standIso);
  const jeJahr = new Map<number, { count: number; kwp: number }>();
  for (const z of d.solar.by_year_segment) {
    if (z.segment !== "privat_dach" || z.year < 2000 || z.year > letztes) continue;
    const e = jeJahr.get(z.year) ?? { count: 0, kwp: 0 };
    e.count += z.count;
    e.kwp += z.kwp;
    jeJahr.set(z.year, e);
  }
  // Zwei Jahrgänge, die je für sich tragen — der früheste und der letzte volle.
  const brauchbar = [...jeJahr.entries()]
    .filter(([, e]) => e.count >= MIN_ANLAGEN_FUER_KOHORTE && e.kwp > 0)
    .sort((a, b) => a[0] - b[0]);
  if (brauchbar.length < 2) return null;
  const [frueh, frE] = brauchbar[0];
  const [spaet, spE] = brauchbar[brauchbar.length - 1];
  if (spaet - frueh < MIN_ABSTAND_JAHRE) return null;

  const alt = runde(frE.kwp / frE.count, 1);
  const neu = runde(spE.kwp / spE.count, 1);
  if (alt <= 0 || neu <= 0) return null;
  const faktor = runde(neu / alt, 1);
  if (faktor < MIN_WACHSTUM_KOHORTE) return null;

  return {
    kennung: "kohorte",
    bildform: "saeule",
    kategorie: "G16",
    kategorieLabel: KATEGORIE_LABEL.G16,
    titel: `Die typische Dachanlage in ${d.name} ist ${faktor.toLocaleString("de-DE")}-mal so groß wie ${frueh}`,
    text:
      `${frueh} hatte eine neue private Dachanlage in ${d.name} im Schnitt ${alt.toLocaleString("de-DE")} kWp, ` +
      `${spaet} waren es ${neu.toLocaleString("de-DE")} kWp. Größere Module, mehr Fläche — und ein Dach, ` +
      `das heute für Wärmepumpe und Auto mitgedacht wird.`,
    werte: [
      { name: `${spaet} im Schnitt`, wert: neu, einheit: "kWp", haupt: true },
      { name: `${frueh} im Schnitt`, wert: alt, einheit: "kWp" },
    ],
    grundlage:
      `Mittelwert über die privaten Dachanlagen des jeweiligen Baujahrs — nur Jahrgänge mit ` +
      `mindestens ${MIN_ANLAGEN_FUER_KOHORTE} Anlagen, sonst beschreibt der Mittelwert einen Einzelfall. ` +
      `Gewerbe und Freifläche bleiben draußen: Ein einzelnes Projekt verschöbe den Schnitt um ein Vielfaches.`,
    gewicht: 70,
  };
}

/** Ab so vielen Anlagen trägt der Mittelwert eines Jahrgangs. */
export const MIN_ANLAGEN_FUER_KOHORTE = 5;
/** So weit müssen die verglichenen Jahrgänge auseinanderliegen. */
const MIN_ABSTAND_JAHRE = 5;
/** Unter diesem Faktor ist es keine Veränderung, sondern Rauschen. */
const MIN_WACHSTUM_KOHORTE = 1.3;

// ─── G14 — Die Flächenfrage ──────────────────────────────────────────────────

/**
 * Worauf der Solarstrom dieses Orts steht — Dach, Gewerbe oder Freifläche.
 *
 * Der Katalog nennt die Familie „kommunalpolitisch heiß"; der Betreiber hat sie
 * am 05.09.2026 als unkritisch eingestuft. Sie bleibt trotzdem streng
 * beschreibend: Anteile, keine Bewertung, keine Empfehlung.
 *
 * ERZÄHLT WIRD NUR EIN DEUTLICHES BILD. Eine Verteilung nahe am Üblichen ist
 * keine Nachricht — und der Ring auf der Seite zeigt die Anteile ohnehin. Ein
 * Satz entsteht erst, wenn eine Form klar dominiert.
 */
function storyFlaeche(d: StoryDaten): OrtsStory | null {
  const kwp = (seg: string) => d.solar.by_segment.find((x) => x.segment === seg)?.kwp ?? 0;
  const frei = kwp("freiflaeche");
  const gewerbe = kwp("gewerbe_dach");
  const privat = kwp("privat_dach");
  const summe = frei + gewerbe + privat;
  if (summe <= 0 || d.solar.total_count < MIN_ANLAGEN_FUER_GELD) return null;

  const anteile = [
    { name: "Freifläche", wert: frei },
    { name: "Gewerbedächer", wert: gewerbe },
    { name: "private Dächer", wert: privat },
  ].sort((a, b) => b.wert - a.wert);
  const top = anteile[0];
  const anteil = Math.round((top.wert / summe) * 100);
  if (anteil < MIN_ANTEIL_FUER_FLAECHE) return null;

  return {
    kennung: "flaeche",
    bildform: "vergleich",
    kategorie: "G14",
    kategorieLabel: KATEGORIE_LABEL.G14,
    titel: `${anteil} % der Solarleistung in ${d.name} stehen auf ${top.name === "private Dächer" ? "privaten Dächern" : top.name}`,
    text:
      `Von ${fmtPvLeistung(summe)} installierter Leistung entfallen ${anteil} % auf ${top.name}. ` +
      `Die drei Formen sagen Verschiedenes: Ein privates Dach gehört jemandem im Ort, eine Freifläche ` +
      `meist einem Investor von außerhalb.`,
    werte: [
      { name: top.name, wert: anteil, einheit: "%", haupt: true },
      ...anteile.slice(1).map((a) => ({
        name: a.name,
        wert: Math.round((a.wert / summe) * 100),
        einheit: "%",
      })),
    ],
    grundlage:
      `Anteile an der installierten Leistung, nicht an der Zahl der Anlagen — nach Stückzahl ` +
      `dominieren immer die kleinen. Balkonkraftwerke bleiben draußen; sie zählen zur Leistung ` +
      `kaum und verschöben nur die Prozentzahlen.`,
    gewicht: 65,
  };
}

/** Ab diesem Anteil dominiert eine Form deutlich genug für einen Satz. */
const MIN_ANTEIL_FUER_FLAECHE = 45;

// ─── G15 — Was nicht gebaut wurde ────────────────────────────────────────────

/**
 * Wie viele Dächer es hier überhaupt gibt — und auf wie vielen etwas steht.
 *
 * DER NENNER IST DIE GANZE AUSSAGE. Das Anlagenregister kennt Anlagen, keine
 * Gebäude; ohne die Zahl der Dächer lässt sich „hier wurde wenig gebaut" nicht
 * von „hier gibt es kaum eigene Dächer" unterscheiden. Der Zensus liefert je
 * Gemeinde die Wohnungen nach Gebäudegröße.
 *
 * GERECHNET WIRD MIT WOHNUNGEN, NICHT MIT GEBÄUDEN, und das steht auch so da:
 * Der Zensus führt in dieser Tabelle Wohnungen. Ein Zweifamilienhaus zählt
 * darin zweimal, hat aber ein Dach — die Quote ist deshalb eine Untergrenze,
 * und die Richtung des Fehlers gehört an die Zahl.
 */
function storyWohnform(d: StoryDaten): OrtsStory | null {
  const w = d.wohnungen;
  if (!w || w.gesamt < MIN_WOHNUNGEN) return null;
  const anteil = Math.round((w.einZwei / w.gesamt) * 100);
  const anlagen = segSumme(d, "privat_dach").count;
  if (anlagen < MIN_ANLAGEN_FUER_GELD) return null;

  return {
    kennung: "wohnform",
    bildform: "donut",
    kategorie: "G15",
    kategorieLabel: KATEGORIE_LABEL.G15,
    titel: `${anteil} % der Wohnungen in ${d.name} liegen in Häusern mit ein oder zwei Wohnungen`,
    text:
      `Das sind ${nf(w.einZwei)} von ${nf(w.gesamt)} Wohnungen — dort ist ein eigenes Dach die Regel. ` +
      `Auf privaten Dächern stehen bisher ${anlagenWort(anlagen)}. In einer Großstadt ist dieses ` +
      `Verhältnis umgekehrt: Dort liegt die Mehrheit der Wohnungen in Gebäuden, auf denen praktisch ` +
      `nichts steht.`,
    werte: [
      { name: "in Ein- und Zweifamilienhäusern", wert: w.einZwei, einheit: "", haupt: true },
      { name: "in größeren Gebäuden", wert: w.gesamt - w.einZwei, einheit: "" },
    ],
    ganzes: w.gesamt,
    grundlage:
      `Wohnungen nach Gebäudegröße aus dem Zensus 2022, Anlagen aus dem Marktstammdatenregister. ` +
      `Gezählt werden WOHNUNGEN, nicht Gebäude: Ein Zweifamilienhaus zählt zweimal, hat aber ein ` +
      `Dach — der Anteil ist deshalb eine Untergrenze für den Anteil der Häuser mit eigenem Dach.`,
    gewicht: 75,
  };
}

/** Unter so vielen Wohnungen ist der Anteil ein Zufallswert. */
const MIN_WOHNUNGEN = 200;

// ─── G2 — Der Zubau des letzten Monats ───────────────────────────────────────

/**
 * Was im letzten abgeschlossenen Monat ans Netz ging.
 *
 * ABSOLUTZAHL UND PRO-KOPF-WERT ZUSAMMEN — das ist die Schranke des Katalogs
 * (G2.1: „Absolutwert statt Prozent, Prozent auf kleiner Grundmenge erzeugt
 * Scheinsieger"). Zwei Anlagen in einem 300-Einwohner-Dorf sind pro Kopf ein
 * Spitzenwert und als Nachricht nichts; nebeneinander sagen beide Zahlen die
 * Wahrheit.
 *
 * DER LETZTE MONAT IST NICHT DER JÜNGSTE IN DER TABELLE: Anlagen werden nach
 * der Inbetriebnahme gemeldet, die jüngsten Monate sind also untererfasst. Es
 * zählt der jüngste Monat, der weit genug zurückliegt.
 */
function storyMonat(d: StoryDaten): OrtsStory | null {
  const reif = reifeMonate(d);
  if (reif.length === 0) return null;
  const letzter = reif[reif.length - 1];
  if (letzter.count < MIN_ANLAGEN_MONAT) return null;

  const proTausend =
    d.population && d.population > 0 ? runde((letzter.count / d.population) * 1000, 1) : null;

  return {
    kennung: `monat-${letzter.monat}`,
    bildform: "kennzahl",
    kategorie: "G2.zubau",
    kategorieLabel: KATEGORIE_LABEL["G2.zubau"],
    titel: `${anlagenWort(letzter.count)} gingen in ${d.name} im ${monatsName(letzter.monat)} ans Netz`,
    text:
      `Das ist der jüngste Monat, für den die Meldungen weitgehend vollständig sind — Anlagen ` +
      `werden nach der Inbetriebnahme registriert, die letzten Wochen sind deshalb immer ` +
      `untererfasst.` +
      (proTausend !== null
        ? ` Auf die Einwohnerzahl umgelegt sind das ${proTausend.toLocaleString("de-DE")} je 1.000.`
        : ""),
    werte: [
      { name: `neu im ${monatsName(letzter.monat)}`, wert: letzter.count, einheit: "", haupt: true },
      ...(proTausend !== null
        ? [{ name: "je 1.000 Einwohner", wert: proTausend, einheit: "" }]
        : []),
    ],
    grundlage:
      `Zubau nach Anschlussmonat aus dem Marktstammdatenregister. Die absolute Zahl steht ` +
      `bewusst zuerst: Auf kleiner Grundmenge macht eine Pro-Kopf-Zahl aus zwei Anlagen einen ` +
      `Spitzenwert. Die jüngsten Monate sind untererfasst und bleiben deshalb außen vor.`,
    gewicht: 85,
  };
}

// ─── G10 — Die Anomalie ──────────────────────────────────────────────────────

/**
 * Ein Monat, der aus der eigenen Reihe dieses Orts herausfällt.
 *
 * VERGLICHEN WIRD MIT DER EIGENEN GESCHICHTE, nicht mit anderen Orten —
 * dieselbe Rechnung wie im bundesweiten Suchlauf: der Median aller übrigen
 * Fenster desselben Orts. Ein Ort, der sonst nichts baut, bekommt dabei eine
 * Untergrenze von eins als Vergleichswert; „unendlich mal so viel" ist keine
 * Zahl.
 *
 * NUR NACH OBEN. Ein negativer Ausschlag wäre eine Bloßstellung, und der
 * Katalog verbietet ihn ausdrücklich.
 */
function storyAnomalie(d: StoryDaten): OrtsStory | null {
  const reif = reifeMonate(d);
  if (reif.length < 8) return null;
  const werte = reif.map((m) => m.count);

  let besteI = -1;
  let besterFaktor = 0;
  for (let i = 0; i < werte.length; i++) {
    const andere = werte.filter((_, j) => Math.abs(j - i) > 1);
    if (andere.length < 4) continue;
    const median = medianVon(andere);
    const basis = Math.max(1, median);
    const faktor = werte[i] / basis;
    if (faktor > besterFaktor) {
      besterFaktor = faktor;
      besteI = i;
    }
  }
  if (besteI < 0) return null;
  const m = reif[besteI];
  if (m.count < MIN_ANLAGEN_ANOMALIE || besterFaktor < MIN_FAKTOR_ANOMALIE) return null;

  const faktor = runde(besterFaktor, 1);
  return {
    kennung: `anomalie-${m.monat}`,
    bildform: "saeule",
    kategorie: "G10",
    kategorieLabel: KATEGORIE_LABEL.G10,
    titel: `Im ${monatsName(m.monat)} gingen in ${d.name} ${faktor.toLocaleString("de-DE")}-mal so viele Anlagen ans Netz wie sonst`,
    text:
      `${anlagenWort(m.count)} in einem Monat, während es in den übrigen Monaten dieses Zeitraums ` +
      `im Mittel deutlich weniger waren. Woran das lag, sagen die Daten nicht — ein Förderprogramm, ` +
      `eine Sammelbestellung, ein Bericht in der Zeitung.`,
    werte: [
      { name: `im ${monatsName(m.monat)}`, wert: m.count, einheit: "", haupt: true },
      { name: "so viel wie sonst", wert: faktor, einheit: "-mal" },
    ],
    grundlage:
      `Verglichen wird der Monat mit den übrigen Monaten DESSELBEN Orts (Median), nicht mit ` +
      `anderen Gemeinden. Nur Ausschläge nach oben; ein schwacher Monat ist keine Nachricht, ` +
      `sondern eine Bloßstellung. Die jüngsten Monate bleiben außen vor, weil sie untererfasst sind.`,
    gewicht: 88,
  };
}

/** Ab so vielen Anlagen ist ein Monatswert eine Aussage. */
const MIN_ANLAGEN_MONAT = 3;
/** Ab so vielen Anlagen trägt ein Ausschlag. */
const MIN_ANLAGEN_ANOMALIE = 5;
/** Ab diesem Vielfachen ist es ein Ausschlag und kein Rauschen. */
const MIN_FAKTOR_ANOMALIE = 2.5;
/**
 * So viele Monate am aktuellen Rand bleiben außen vor.
 *
 * Anlagen dürfen bis zu einen Monat nach Inbetriebnahme gemeldet werden, und in
 * der Praxis dauert es länger. Zwei Monate sind die Vorsicht, mit der auch die
 * Zubau-Story ihr laufendes Jahr kennzeichnet.
 */
const UNREIFE_MONATE = 2;

/** Die Monate, deren Meldungen weitgehend vollständig sind — aufsteigend. */
function reifeMonate(d: StoryDaten): { monat: string; count: number }[] {
  if (!d.monate?.length) return [];
  const summe = new Map<string, number>();
  for (const z of d.monate) summe.set(z.monat, (summe.get(z.monat) ?? 0) + z.count);
  const sortiert = [...summe.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return sortiert.slice(0, Math.max(0, sortiert.length - UNREIFE_MONATE)).map(([monat, count]) => ({ monat, count }));
}

const MONATSNAMEN = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** "2026-07" oder "2026-07-01" → "Juli 2026". */
function monatsName(monat: string): string {
  const [j, m] = monat.split("-");
  const i = Number(m) - 1;
  return `${MONATSNAMEN[i] ?? m} ${j}`;
}

function medianVon(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ─── Der Aufruf ──────────────────────────────────────────────────────────────

/**
 * Wo der Ort unter seinesgleichen steht — je Messgröße, innerhalb seiner
 * Größenklasse, im Landkreis und im Bundesland.
 *
 * DAS IST DIE FAMILIE, DIE JEDER ORT HAT. Die gespeicherten Funde des
 * Suchlaufs treffen naturgemäß nur das Auffällige — gemessen am 05.09.2026:
 * 313 Funde auf 197 von 11.000 Gemeinden. Eine Platzierung dagegen hat jeder,
 * auch im Mittelfeld, und genau das ist auf der eigenen Ortsseite eine
 * Aussage: „Unter den kleinen Gemeinden im Landkreis stehen wir auf Platz 11
 * von 20."
 *
 * DREI SCHRANKEN, alle aus dem Award-Kern übernommen statt neu gesetzt:
 *  · Verdachtsfälle (`spike`) und zu dünner Bestand (`thin`) fallen raus —
 *    dieselben Merker, an denen der Kommunen-Aufhänger sie schon aussortiert.
 *  · Die Vergleichsgruppe muss tragen (MIN_GRUPPE_FUER_RANG); „Platz 2 von 3"
 *    ist keine Einordnung.
 *  · Die Kategorie, die der Auszeichnungs-Kasten oben schon zeigt, kommt hier
 *    NICHT noch einmal — sonst steht dieselbe Aussage zweimal auf der Seite.
 *
 * KEIN LOB UND KEINE SCHELTE: Der Satz nennt Rang, Gruppengröße und Wert und
 * bewertet nicht. Über die EIGENE Gemeinde ist ein hinterer Platz keine
 * Bloßstellung — sie steht auf ihrer eigenen Seite; über fremde Orte fällt
 * hier ohnehin kein Wort.
 */
function storyVergleich(d: StoryDaten, p: VergleichsPlatz): OrtsStory {
  const spitze = p.rang === 1;
  return {
    kennung: `vergleich-${p.kategorie}-${p.ebene}-${p.klasseSlug}`,
    bildform: "kennzahl",
    kategorie: "G3.vergleich",
    kategorieLabel: KATEGORIE_LABEL["G3.vergleich"],
    titel: spitze
      ? `${d.name} steht bei ${p.messgroesse} an der Spitze — ${p.gruppe}`
      : `${d.name} steht bei ${p.messgroesse} auf Platz ${nf(p.rang)} von ${nf(p.ausN)} — ${p.gruppe}`,
    text:
      `Verglichen wird innerhalb der eigenen Größenklasse: ${p.gruppe}. ` +
      `Der Wert liegt bei ${p.wert}.`,
    werte: [
      { name: `von ${nf(p.ausN)}`, wert: p.rang, einheit: "Platz", haupt: true },
      { name: p.messgroesse, wert: p.rohwert, einheit: p.einheit },
    ],
    grundlage:
      `Rang innerhalb der Größenklasse „${p.klasseLabel}" ${p.gebiet}, aus dem ` +
      `Anlagenregister gerechnet. Die Größenklasse steht dabei, weil ein Rang ohne ` +
      `sie eine andere Gruppe behauptet — verglichen wird nie mit allen Orten des ` +
      `Gebiets, sondern mit den gleich großen.`,
    gewicht: spitze ? 95 : 80,
  };
}

/** Was der Aufrufer aus dem Award-Kern hereinreicht — schon gefiltert. */
export type VergleichsPlatz = {
  kategorie: string;
  ebene: string;
  klasseSlug: string;
  klasseLabel: string;
  /** „Kleine Gemeinden im Landkreis Hersfeld-Rotenburg" */
  gruppe: string;
  /** „im Landkreis Hersfeld-Rotenburg" */
  gebiet: string;
  messgroesse: string;
  rang: number;
  ausN: number;
  /** Fertig formatiert, mit Einheit — aus derselben Quelle wie die Rangliste. */
  wert: string;
  rohwert: number;
  einheit: string;
};

/**
 * Ein Fund des Story-Suchlaufs in der Form dieser Datei.
 *
 * ES WIRD NICHTS UMFORMULIERT. Satz, Werte und Grundlage kommen unverändert aus
 * dem Fund — er hat seine eigenen Schranken (Mindestgruppe, Mindestmenge, nur
 * nach oben) schon durchlaufen, und ein zweiter Wortlaut daneben wäre genau die
 * doppelte Fassung, gegen die der gemeinsame Vorrat gebaut ist.
 *
 * Die Schlagzeile ist der Satz selbst: Ein Fund trägt keine getrennte
 * Überschrift, und eine hier erfundene wäre nicht gerechnet.
 */
function ausFund(f: VorratsFund): OrtsStory {
  return {
    kennung: f.kennung,
    kategorie: "fund",
    // Ein Fund bringt zwei Werte ohne Ganzes mit — das ist der Säulen-Fall.
    // Trägt er nur einen, fällt die Karte auf die Einzelkennzahl zurück.
    bildform: (f.werte?.length ?? 0) >= 2 ? "saeule" : "kennzahl",
    kategorieLabel: f.kategorie,
    titel: f.satz,
    text: f.grundlage,
    werte: f.werte.map((w, i) => ({ ...w, haupt: i === 0 })),
    grundlage: f.grundlage,
    // Die Stärke des Fundes ist eine Rangzahl des Suchlaufs, kein Gewicht in
    // unserer Skala. Unter die beiden Geld-Geschichten gesetzt, weil die einen
    // Termin bzw. eine Summe über den ganzen Ort tragen; innerhalb der Funde
    // bleibt die Reihenfolge des Suchlaufs erhalten.
    gewicht: 50 - Math.min(f.staerke, 40),
  };
}

/**
 * Die Geschichten über EINEN Ort, stärkste zuerst.
 *
 * Leer ist ein zulässiges Ergebnis — jede Familie prüft ihre eigenen Schranken
 * und meldet sich ab, wenn sie nicht trägt. Eine Oberfläche, die daraufhin
 * nichts zeigt, ist richtig; eine, die eine Aussage erzwingt, wäre es nicht.
 */
export function ortsStories(opts: {
  daten: StoryDaten;
  /**
   * Was der Story-Suchlauf über DIESEN Ort im Vorrat hat — redaktionell
   * vorgemerkt, nicht roh.
   *
   * Ein Fund im Zustand „offen" ist ein Kandidat, den noch niemand angesehen
   * hat; er gehört nicht auf eine öffentliche Seite. Welche Zustände der
   * Aufrufer durchlässt, entscheidet er beim Lesen — hier kommt an, was
   * gezeigt werden darf.
   */
  funde?: VorratsFund[];
  /** Platzierungen dieses Orts, schon gefiltert (siehe `storyVergleich`). */
  plaetze?: VergleichsPlatz[];
  /** Das laufende Jahr. Hereingereicht, nicht aus der Uhr gelesen — sonst
   *  liefert dieselbe Funktion im Test je nach Kalendertag ein anderes
   *  Ergebnis. */
  heuteJahr: number;
}): OrtsStory[] {
  const { daten, heuteJahr, funde = [], plaetze = [] } = opts;
  return [
    storyAuslauf(daten, heuteJahr),
    storyEingespielt(daten, heuteJahr),
    ...plaetze.map((p) => storyVergleich(daten, p)),
    storyAnomalie(daten),
    storyMonat(daten),
    storyWohnform(daten),
    storyKohorte(daten),
    storyFlaeche(daten),
    ...funde.map(ausFund),
  ]
    .filter((s): s is OrtsStory => s !== null)
    .sort((a, b) => b.gewicht - a.gewicht);
}

export { letztesVollesJahr };
