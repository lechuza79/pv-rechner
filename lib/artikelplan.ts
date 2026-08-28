/**
 * Der Artikelplan: welcher Ratgeber-Artikel als nächstes, auf welche Frage er
 * zielt — und was gemessen und trotzdem verworfen wurde.
 *
 * WARUM ES DAS GIBT (27.08.2026)
 * ──────────────────────────────
 * Ein Artikel, der noch nicht geschrieben ist, hatte im Projekt nirgends einen
 * Platz. Die Ratgeber-Registry (lib/ratgeber.ts) kennt nur, was live ist; der
 * Releaseplan steuert Seitengattungen mit Ortsnamen, nicht einzelne Themen. Die
 * Folge: Die Suchvolumen-Messungen lagen in Berichten unter docs/seo/ und waren
 * nach ein paar Wochen niemandem mehr zuzuordnen — die vom 03.08.2026 wurde am
 * 27.08. neu erhoben, weil niemand wusste, was davon noch galt.
 *
 * WAS DIESE DATEI FESTHÄLT, WAS EIN BERICHT NICHT KANN
 * ────────────────────────────────────────────────────
 * 1. Die MESSUNG mit Datum. Suchvolumen altert; eine Zahl ohne Erhebungstag ist
 *    eine Behauptung. Dieselbe Regel wie beim Prüfdatum der Förderprogramme:
 *    nur stempeln, was wirklich gemessen wurde.
 * 2. Die VERWORFENEN samt Grund. Das ist der eigentliche Wert. Ohne sie schlägt
 *    in drei Monaten jemand wieder „balkonkraftwerk test" vor (2.900 Suchen bei
 *    Schwierigkeit 0 — und trotzdem verboten, weil wir keine Geräte messen).
 *    Systematik übernommen von `gelesen_am` im Förderkatalog: Was einmal
 *    beurteilt wurde, bleibt beurteilt.
 * 3. Die BEGRÜNDUNG, warum ein Thema zu uns passt. Ein hohes Suchvolumen allein
 *    ist kein Grund — „photovoltaik versicherung" hat 880 Suchen bei
 *    Schwierigkeit 0 und ist bei uns trotzdem ein Fremdkörper, weil es nichts
 *    zu rechnen gibt.
 *
 * WAS ER NICHT IST
 * ────────────────
 * Keine Freigabe. Ein Eintrag hier veröffentlicht nichts — er hält fest, was
 * gemessen und entschieden wurde. Die beiden Fragen aus CLAUDE.md („Zwei Fragen
 * vor jedem Livegang einer Seitengattung") bleiben je Seite zu beantworten; der
 * Plan liefert nur die Antwort auf die erste (wird danach gesucht?).
 *
 * Und keine zweite Wahrheit über die Live-Artikel: Was live ist, steht in
 * lib/ratgeber.ts. Ein Vorhaben im Zustand „live" MUSS dort einen Eintrag haben,
 * sonst wird der Test rot.
 *
 * Erzwungen von lib/__tests__/artikelplan.test.ts.
 */

import { RATGEBER } from "./ratgeber";

/** Wie weit ein Vorhaben ist. */
export type ArtikelZustand = "geplant" | "in-arbeit" | "live" | "verworfen";

export const ZUSTAND_LABEL: Record<ArtikelZustand, string> = {
  geplant: "geplant",
  "in-arbeit": "in Arbeit",
  live: "live",
  verworfen: "verworfen",
};

/**
 * Was die Suchdaten zu einem Thema sagen — mit dem Tag, an dem sie erhoben
 * wurden.
 *
 * `schwierigkeit` ist die Keyword Difficulty (0–100, DataForSEO): die geschätzte
 * Chance auf eine Top-10-Platzierung. Niedrig heißt „schwach besetzt", nicht
 * „leicht" — eine junge Domain ohne Verweise rankt auch auf 0 nicht von selbst.
 */
export interface Messung {
  /** Der Begriff so, wie ein Nutzer ihn tippt — nicht unser Slug. */
  begriff: string;
  /** Ø Suchanfragen pro Monat, Google Deutschland. */
  volumen: number;
  /** Keyword Difficulty 0–100. */
  schwierigkeit: number;
  /** Erhebungstag (YYYY-MM-DD). Pflicht — eine Zahl ohne Datum gilt nicht. */
  gemessenAm: string;
  /** Weitere Begriffe, die dieselbe Seite mitbedient. */
  nebenbegriffe?: { begriff: string; volumen: number; schwierigkeit: number }[];
}

export interface ArtikelVorhaben {
  /** Arbeitstitel — nicht zwingend der spätere Seitentitel. */
  thema: string;
  /** Geplante oder tatsächliche Adresse. Bei „verworfen" leer. */
  slug?: string;
  zustand: ArtikelZustand;
  messung: Messung;
  /** Warum das Thema zu uns passt — oder bei „verworfen": warum nicht. */
  begruendung: string;
  /**
   * Bei „verworfen" Pflicht: der Grund in einem Satz, der auch in drei Monaten
   * noch trägt. Ein Test erzwingt ihn.
   */
  verworfenWeil?: string;
  /** Was gebaut sein muss, bevor der Artikel gehen kann. */
  voraussetzung?: string;
}

/**
 * Die Vorhaben, gemessen am 27.08.2026 gegen den Wettbewerber
 * solarcheck-deutschland.de (docs/seo/wettbewerb-solarcheck-deutschland.md).
 * Reihenfolge = empfohlene Bearbeitungsreihenfolge.
 */
export const ARTIKELPLAN: ArtikelVorhaben[] = [
  {
    thema: "Nulleinspeisung — Photovoltaik ohne Einspeisung",
    slug: "/ratgeber/nulleinspeisung",
    zustand: "geplant",
    messung: {
      begriff: "nulleinspeisung",
      volumen: 1300,
      schwierigkeit: 0,
      gemessenAm: "2026-08-27",
      nebenbegriffe: [
        { begriff: "photovoltaik ohne einspeisung", volumen: 70, schwierigkeit: 0 },
      ],
    },
    begruendung:
      "Reine Rechenfrage, und der Rechner beantwortet sie bereits: Die Einspeisung ist im " +
      "Ergebnis dreistufig schaltbar (Aus / Teil / Voll). Es fehlt nur die Seite, die den Fall " +
      "erklärt und mit gerechneten Zahlen zeigt, wann sich der Verzicht trägt.",
  },
  {
    thema: "Solarertrag nach Bundesland — wo die Sonne wirklich zahlt",
    slug: "/ratgeber/solarertrag-bundeslaender",
    zustand: "geplant",
    messung: {
      begriff: "sonnenstunden deutschland",
      volumen: 1600,
      schwierigkeit: 23,
      gemessenAm: "2026-08-27",
    },
    begruendung:
      "Die einzige Seite des Wettbewerbers, die inhaltlich etwas kann, das wir nicht haben — " +
      "und wir hätten die bessere Fassung. Ihre Werte sind Spannen aus einem Klimamodell, " +
      "unsere sind gemessene Standortabrufe je Ort, aus denen sich Bestes und Schlechtestes " +
      "je Land wirklich ausrechnen lässt.",
    voraussetzung:
      "Die Standorterträge liegen je Ort vor (gemeindeGeo + yieldKwhKwp); die Aggregation " +
      "auf Bundesland-Ebene gibt es noch nicht.",
  },
  {
    thema: "Solaranlage mieten oder kaufen",
    slug: "/ratgeber/solaranlage-mieten-oder-kaufen",
    zustand: "geplant",
    messung: {
      begriff: "solaranlage mieten",
      volumen: 480,
      schwierigkeit: 0,
      gemessenAm: "2026-08-27",
      nebenbegriffe: [
        { begriff: "photovoltaik mieten oder kaufen", volumen: 20, schwierigkeit: 0 },
      ],
    },
    begruendung:
      "Höchster Wert je Besucher der ganzen Messung (Klickpreis 12,74 €) — dort wird Geld " +
      "verdient, entsprechend einseitig ist das Umfeld. Miete gegen Kauf ist eine Rechenfrage, " +
      "und ehrlich gerechnet fällt sie meist gegen die Miete aus. Genau die Aussage, die eine " +
      "Seite mit Vermittlungsgeschäft nicht treffen kann.",
  },
  {
    thema: "Wann sich Photovoltaik NICHT lohnt",
    slug: "/ratgeber/photovoltaik-lohnt-sich-nicht",
    zustand: "geplant",
    messung: {
      begriff: "photovoltaik lohnt sich nicht",
      volumen: 170,
      schwierigkeit: 0,
      gemessenAm: "2026-08-27",
    },
    begruendung:
      "Klein, billig, und trifft die Positionierung im Kern: Wir sind die Seite, die " +
      "auch einmal abrät. Jeder andere Treffer auf dieser Anfrage will am Ende doch verkaufen.",
  },
  {
    thema: "Solarpflicht je Bundesland",
    slug: "/ratgeber/solarpflicht",
    zustand: "geplant",
    messung: {
      begriff: "solarpflicht",
      volumen: 480,
      schwierigkeit: 19,
      gemessenAm: "2026-08-27",
      nebenbegriffe: [{ begriff: "solarpflicht nrw", volumen: 480, schwierigkeit: 0 }],
    },
    begruendung:
      "Rechtsthema mit Bundesland-Achse — passt auf das vorhandene Gerüst der Förderseiten. " +
      "Allein Nordrhein-Westfalen trägt noch einmal dasselbe Volumen; die übrigen 15 Länder " +
      "sind ungemessen.",
    voraussetzung:
      "Braucht einen Wächter, bevor die Seite live geht: Landesbauordnungen ändern sich, und " +
      "ein datierter Rechtsstand ohne täglichen Lauf wird still falsch (CLAUDE.md, " +
      "Faktenprüfung Regel 10).",
  },
  {
    thema: "Anlagengröße: wie viel kWp brauche ich",
    slug: "/pv-bedarf-berechnen",
    zustand: "in-arbeit",
    messung: {
      begriff: "wie viel kwp brauche ich",
      volumen: 170,
      schwierigkeit: 0,
      gemessenAm: "2026-08-27",
      nebenbegriffe: [
        { begriff: "solaranlage größe berechnen", volumen: 90, schwierigkeit: 4 },
      ],
    },
    begruendung:
      "Kein neues Thema: Die Seite existiert und rankt trotzdem nicht auf der Frage, die sie " +
      "beantwortet. Eine Überarbeitung von Titel, Einstieg und interner Verlinkung, kein " +
      "neuer Artikel.",
  },

  // ─── Gemessen und bewusst verworfen ──────────────────────────────────────
  // Diese Einträge sind der eigentliche Grund für diese Datei. Sie verhindern,
  // dass ein hohes Suchvolumen in ein paar Monaten dieselbe Diskussion neu
  // auslöst.

  {
    thema: "Balkonkraftwerk-Test / Gerätevergleich",
    zustand: "verworfen",
    messung: {
      begriff: "balkonkraftwerk test",
      volumen: 2900,
      schwierigkeit: 0,
      gemessenAm: "2026-08-27",
    },
    begruendung:
      "Größter Einzelposten der gesamten Messung — und trotzdem nicht machbar.",
    verworfenWeil:
      "Wer das Wort Test verwendet, behauptet, Geräte gemessen zu haben — irreführende Werbung " +
      "(§ 5 UWG). Der Speicher-Ratgeber löst das Suchinteresse bereits richtig, indem er sagt, " +
      "was ein Gerätetest beantwortet und was nur der eigene Haushalt beantworten kann.",
  },
  {
    thema: "Marktstammdatenregister-Anmeldung (eigene Seite)",
    zustand: "verworfen",
    messung: {
      begriff: "marktstammdatenregister anmelden",
      volumen: 1900,
      schwierigkeit: 52,
      gemessenAm: "2026-08-27",
    },
    begruendung:
      "Hohes Volumen, und die Anmeldung ist eine echte Hürde, an der Leute hängenbleiben — " +
      "inhaltlich also durchaus unser Thema.",
    verworfenWeil:
      "Schwierigkeit 52 ist für eine Domain ohne eine einzige Top-10-Platzierung zu hoch, und " +
      "der Anmelde-Ratgeber im Balkon-Bereich deckt den Kern bereits ab. Wieder aufmachen, " +
      "wenn wir Verweise haben.",
  },
  {
    thema: "Photovoltaik-Versicherung",
    slug: "/ratgeber/photovoltaik-versicherung",
    zustand: "geplant",
    messung: {
      begriff: "photovoltaik versicherung",
      volumen: 880,
      schwierigkeit: 0,
      gemessenAm: "2026-08-27",
      nebenbegriffe: [{ begriff: "solaranlage versichern", volumen: 720, schwierigkeit: 15 }],
    },
    begruendung:
      "Zusammen 1.600 Suchen bei sehr niedriger Schwierigkeit, und die Frage gehört sachlich " +
      "zur Anlage: Wer 15.000 Euro aufs Dach legt, will wissen, was passiert, wenn Hagel " +
      "kommt. Der Betreiber hat das Thema am 27.08.2026 aufgenommen — als Ratgeber mit " +
      "Vermittlungsanteil, nicht als reine Textseite.",
    voraussetzung:
      "Vor dem Livegang: Die Zusage „Keine Werbung“ wird präzisiert — der Betreiber hat am " +
      "27.08.2026 entschieden, dass wir empfehlen dürfen, was dem Ratsuchenden nützt. Sie " +
      "steht über die Vertrauensleiste auf jeder Seite und muss deshalb an einer Stelle " +
      "geändert werden, bevor die erste bezahlte Empfehlung online geht. Offen bleiben zwei " +
      "Fachfragen: die Kennzeichnung bezahlter Empfehlungen und ob eine Versicherungs" +
      "empfehlung schon erlaubnispflichtige Vermittlung ist.",
  },
  {
    thema: "Photovoltaik und Steuer",
    zustand: "verworfen",
    messung: {
      begriff: "photovoltaik steuer",
      volumen: 320,
      schwierigkeit: 39,
      gemessenAm: "2026-08-27",
      nebenbegriffe: [
        { begriff: "photovoltaik einkommensteuer", volumen: 110, schwierigkeit: 23 },
      ],
    },
    begruendung: "Naheliegend, weil der Nullsteuersatz im Balkon-Bereich ohnehin erklärt wird.",
    verworfenWeil:
      "Steuerberatung im Einzelfall dürfen wir nicht leisten, und alles darunter ist entweder " +
      "trivial oder falsch. Der Nullsteuersatz bleibt dort, wo er hingehört: als Randbedingung " +
      "an der Rechnung.",
  },
  {
    thema: "Wechselrichter",
    slug: "/ratgeber/wechselrichter",
    zustand: "geplant",
    messung: {
      begriff: "wechselrichter photovoltaik",
      volumen: 1300,
      schwierigkeit: 1,
      gemessenAm: "2026-08-27",
    },
    begruendung:
      "Hohes Volumen bei praktisch unbesetztem Umfeld — und das Gerät steckt in unserer " +
      "Rechnung ohnehin: Der 800-Watt-Deckel beim Balkonkraftwerk ist eine " +
      "Wechselrichtergrenze, und die Drosselung wird im Ergebnis sichtbar gemacht. Wir " +
      "können also erklären, was die Größe für den Ertrag bedeutet, statt Geräte " +
      "aufzuzählen. Vom Betreiber am 27.08.2026 aufgenommen.",
    voraussetzung:
      "Die Suchabsicht ist Kauf, unsere Antwort ist Auslegung. Die Seite muss die Frage " +
      "beantworten, die hinter dem Kauf steht (welche Größe passt zu meiner Anlage, was " +
      "kostet mich eine Drosselung), sonst steht sie zwischen den Händlern und verliert.",
  },
  {
    thema: "Stadtseiten nach Wettbewerber-Muster",
    zustand: "verworfen",
    messung: {
      begriff: "solaranlage <stadt>",
      volumen: 0,
      schwierigkeit: 0,
      gemessenAm: "2026-08-27",
    },
    begruendung:
      "Der Wettbewerber hat 51 davon — geprüft an Augsburg: Textbausteine mit eingesetztem " +
      "Ortsnamen, kein kommunales Förderprogramm, kein lokaler Bestand.",
    verworfenWeil:
      "Wir haben dieselbe Fläche längst besser abgedeckt: Förder-Stadtseiten mit echten " +
      "Programmen und Atlas-Ortsseiten mit echtem Anlagenbestand. Eine dritte eigene " +
      "Seitenfamilie auf denselben Ortsnamen würde nur die eigenen Positionen teilen.",
  },
];

/** Vorhaben, an denen gearbeitet werden kann — in der Reihenfolge des Plans. */
export function offeneVorhaben(): ArtikelVorhaben[] {
  return ARTIKELPLAN.filter((v) => v.zustand === "geplant" || v.zustand === "in-arbeit");
}

/** Was gemessen und abgelehnt wurde. Nicht löschen — das ist der Gedächtnisteil. */
export function verworfeneVorhaben(): ArtikelVorhaben[] {
  return ARTIKELPLAN.filter((v) => v.zustand === "verworfen");
}

/**
 * Summe der monatlichen Suchanfragen eines Vorhabens (Hauptbegriff plus
 * Nebenbegriffe). Bewusst eine schlichte Summe und keine Traffic-Prognose:
 * Wie viel davon bei uns ankommt, hängt an der Platzierung, und die kennt
 * niemand vorher.
 */
export function volumenGesamt(v: ArtikelVorhaben): number {
  return v.messung.volumen + (v.messung.nebenbegriffe ?? []).reduce((s, n) => s + n.volumen, 0);
}

/** Ist der geplante Slug schon als Ratgeber live? */
export function istLive(v: ArtikelVorhaben): boolean {
  return !!v.slug && RATGEBER.some((r) => r.slug === v.slug);
}

/**
 * Der älteste Erhebungstag im Plan — daran hängt, wann neu gemessen werden
 * sollte. Suchvolumen sind Jahresdurchschnitte und altern langsam, aber nicht
 * gar nicht; ein Jahr ist die Grenze, an der eine Zahl nichts mehr aussagt.
 */
export function aeltesteMessung(): string {
  return ARTIKELPLAN.map((v) => v.messung.gemessenAm).sort()[0];
}
