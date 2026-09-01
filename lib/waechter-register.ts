// ─── Wächter-Register: welche Läufe gibt es, und woran sehen wir, dass sie laufen ──
//
// WARUM ES DAS BRAUCHT (24.08.2026): Wir haben drei Bausteine, die je einen Teil
// der Frage „läuft noch alles" beantworten — die Ablage der Berichte
// (`waechter_reports`), den Prüfstand (`lib/pruefstand.ts`) und den
// Gesundheitscheck (`scripts/health-check.ts`). Was fehlte, ist die Liste, gegen
// die man sie hält: **wer sollte überhaupt laufen.**
//
// Ohne diese Liste ist ein ausgefallener Lauf strukturell unsichtbar. Die Ablage
// kennt nur Läufe, die gemeldet haben; ein Wächter, der seit Wochen nicht mehr
// startet, taucht dort nicht als Lücke auf, sondern gar nicht. Gemessen am
// 24.08.2026: Von 16 Aufträgen für dieses Projekt hatten **acht** noch nie einen
// Bericht abgelegt — darunter der Preis-Wächter, der an demselben Morgen
// nachweislich gelaufen war. Eine Seite, die nur die Ablage anzeigt, hätte
// sieben grüne Zeilen gezeigt und über neun geschwiegen.
//
// DIE ZENTRALE UNTERSCHEIDUNG: „zuletzt gemeldet" ist NICHT „zuletzt gelaufen".
// Die meisten Wächter melden nur, wenn es etwas zu melden gibt (so steht es in
// ihren Aufträgen, und so soll es bleiben — die Schleuse in `/api/alert` ist
// genau dafür da). Eine Lücke in der Ablage beweist bei ihnen nichts. Deshalb
// trägt jeder Eintrag hier, WORAN sein Lebenszeichen abzulesen ist (`beleg`):
//
//   • "meldung"    — der Lauf legt auch ohne Befund ab („grün, nichts zu tun").
//                    Dann ist eine Lücke in der Ablage ein echter Ausfall.
//   • "pruefdatum" — der Lauf stempelt ein Prüfdatum im Code (Gate-Regel 9:
//                    das Datum wandert mit JEDEM erreichten Lauf). Das ist das
//                    belastbarste Zeichen, weil es nur ein Lauf setzen kann, der
//                    seine Quellen wirklich erreicht hat.
//   • "datenbank"  — der Stand liegt je Zeile in Supabase (Marktpreise,
//                    Förderkatalog), nicht im Code.
//   • "keiner"     — wir können es nicht sehen. Das ist ein Befund, kein
//                    Normalzustand, und gehört deshalb sichtbar auf die Seite
//                    statt weggelassen.
//
// WOHER DIE ANGABEN KOMMEN: Rhythmus und Kennung sind am 24.08.2026 aus der
// Auftragsliste selbst abgelesen (`list_scheduled_tasks`), die Tag-Namen aus dem
// `--arg t` der jeweiligen Aufträge. Die Aufträge liegen unter
// `~/.claude/scheduled-tasks/*/SKILL.md` und damit AUSSERHALB des Repos — ein
// Test kann sie nicht gegenprüfen (dieselbe Einschränkung notiert schon
// `lib/pruefstand.ts` beim Feld `waechter`). Wer hier einen Eintrag anfasst,
// liest ihn dort nach, statt ihn zu erinnern.

import { PRUEFSTAND, tageZwischen, type PruefEintrag } from "./pruefstand";

/** Wo läuft er — und damit: wovon hängt sein Ausfall ab? */
export type WaechterArt =
  /** Modell-Lauf als scheduled task. Läuft NUR, wenn die App auf dem Rechner des Betreibers offen ist. */
  | "auftrag"
  /** GitHub Action. Läuft unabhängig vom Rechner des Betreibers. */
  | "action";

export type BelegArt = "meldung" | "pruefdatum" | "datenbank" | "keiner";

/** Stand, der nicht im Code steht, sondern je Zeile in Supabase. */
export type DbQuelle = "marktpreise" | "foerderkatalog" | "kostenwache";

export interface WaechterJob {
  /** Ordnername des Auftrags bzw. Dateiname des Workflows — die Kennung, unter der man ihn findet. */
  id: string;
  titel: string;
  /** Ein Satz Klartext: wofür er da ist. */
  zweck: string;
  art: WaechterArt;
  /** Rhythmus im Klartext, so wie er im Auftrag steht. */
  rhythmus: string;
  /**
   * Ab so vielen Tagen ohne Lebenszeichen stimmt etwas mit dem Lauf nicht.
   * Regel wie im Prüfstand: der Rhythmus plus Luft für EINEN ausgefallenen Lauf.
   * Täglich 3 · wöchentlich 10 · monatlich 45 · quartalsweise 120 ·
   * halbjährlich 210 · jährlich 400.
   *
   * NUR für `beleg: "meldung"` und `"datenbank"`. Wo das Prüfdatum der Beleg
   * ist, steht die Grenze bereits im Prüfstand (`maxAlterTage`) und wird von
   * dort geholt — sie beantwortet dieselbe Frage („hat der Lauf stattgefunden"),
   * und eine zweite Zahl daneben ist keine Absicherung, sondern eine zweite
   * Wahrheit. Siehe `toleranzTage()`.
   */
  stummAbTage?: number;
  /** Tag, unter dem er in `waechter_reports` ablegt. `null`: er legt nirgends ab. */
  tag: string | null;
  /** Woran das Lebenszeichen abzulesen ist. Siehe Kopfkommentar. */
  beleg: BelegArt;
  /**
   * Was der Beleg NICHT beweist. Pflicht überall dort, wo das Signal nur
   * mittelbar an diesem Lauf hängt — etwa weil ein zweiter Lauf dasselbe Feld
   * stempelt oder weil ein Automatismus den Wert schreibt, den der Wächter nur
   * beaufsichtigt. Ohne diesen Satz liest sich Grün als „er lief", obwohl es
   * nur heißt: „das, wofür er da ist, ist in Ordnung".
   */
  belegHinweis?: string;
  /** Prüfstand-Felder, die dieser Lauf bewegt (Werte aus `PruefEintrag.feld`). */
  pruefFelder: string[];
  /** Nur wo `beleg: "datenbank"`. */
  dbQuelle?: DbQuelle;
  runbook?: string;
  /**
   * Warum wir ihn nicht sehen können — Pflicht bei `beleg: "keiner"`, damit ein
   * blinder Fleck nicht als Versehen durchgeht, sondern als benannter Zustand.
   */
  blindWeil?: string;
  /**
   * Ein anderer Lauf sieht diesem hier zu. Bei den GitHub-Actions macht das der
   * Gesundheitscheck über `GEPLANTE_LAEUFE` — drei erfolglose Läufe in Folge
   * gehen als Befund an Claude.
   */
  beobachtetVon?: string;
}

export const WAECHTER: WaechterJob[] = [
  // ── täglich ───────────────────────────────────────────────────────────────
  {
    id: "foerder-news-waechter",
    titel: "Förder-, CO₂-, BEG- und EEG-News",
    zweck: "Sucht täglich nach Rechtsänderungen und Programmstopps und korrigiert, was eindeutig ist.",
    art: "auftrag",
    rhythmus: "täglich",
    tag: "foerder-news-waechter",
    // Er meldet NICHT jeden Tag (gemessen am 24.08.2026: 11 Berichte in 22
    // Tagen). Sein Lebenszeichen ist der Rechtsstand, den er stempelt — und
    // dessen Grenze steht im Prüfstand bei 14 Tagen, weil ein täglich geprüfter
    // Stand, der zwei Wochen steht, nichts über das Gesetz sagt und alles über
    // den Lauf.
    beleg: "pruefdatum",
    pruefFelder: ["GREEN_GAS_CONFIG.geprueftRechtIso", "EEG_REFORM_STAND.geprueftIso"],
    runbook: "scripts/gruengas-verify.md",
  },
  {
    id: "solar-check-error-triage-daily",
    titel: "Fehler-Triage",
    zweck: "Liest Fehler und Antwortzeiten der Produktion, behebt selbst, was eindeutig ist.",
    art: "auftrag",
    rhythmus: "täglich",
    stummAbTage: 3,
    tag: "solar-check-error-triage-daily",
    // Legt auch ohne Befund ab („grün, nichts zu tun") — deshalb ist eine Lücke
    // hier aussagekräftig. Genau so ist die Urlaubswoche im August sichtbar:
    // 08.08. → 15.08. keine einzige Zeile.
    beleg: "meldung",
    pruefFelder: [],
  },
  {
    id: "foerder-watch.yml",
    titel: "Förder-Erfassung (Seiten-Wächter, Suche, Screening)",
    zweck: "Ruft nachts alle Amtsseiten ab, sucht neue Förderseiten und legt den Tagesbericht ab.",
    art: "action",
    rhythmus: "täglich",
    stummAbTage: 3,
    tag: "foerder-erfassung",
    beleg: "meldung",
    pruefFelder: [],
    beobachtetVon: "Gesundheitscheck (drei erfolglose Läufe in Folge gehen an Claude)",
    runbook: "scripts/foerder-verify.md",
  },
  {
    id: "health-check.yml",
    titel: "Gesundheitscheck",
    zweck: "Misst alle drei Stunden Erreichbarkeit, Antwortzeiten, Cache und Function-Region.",
    art: "action",
    rhythmus: "alle drei Stunden",
    // Alle drei Stunden: ein Tag ohne Zeile heißt acht ausgefallene Läufe.
    stummAbTage: 1,
    tag: "health-check",
    beleg: "meldung",
    pruefFelder: [],
  },
  {
    id: "kostenwache",
    titel: "Kostenwache: Mengen je Projekt",
    zweck:
      "Legt täglich Aufbauten und verschiedene Adressen je Projekt ab und meldet, wenn eine der beiden Größen deutlich über dem eigenen Vortagesniveau liegt.",
    // Sie ist kein eigener Auftrag, sondern ein Abschnitt des Gesundheitschecks
    // — bewusst dort und nicht als geplanter Auftrag: Die laufen nur, wenn die
    // App auf dem Rechner des Betreibers offen ist.
    art: "action",
    rhythmus: "täglich (im Gesundheitscheck, der alle drei Stunden läuft)",
    // Täglich, plus Luft für einen ausgefallenen Tag. Enger wäre falsch: Der
    // Wert entsteht erst, wenn der Vortag vollständig ist.
    stummAbTage: 3,
    tag: null,
    // Ihr Lebenszeichen ist der jüngste abgelegte Tageswert. Eine Meldung taugt
    // nicht dafür: Sie meldet nur bei einem Sprung, und „kein Sprung“ ist der
    // Normalfall — eine leere Ablage wäre dort kein Ausfall.
    beleg: "datenbank",
    belegHinweis:
      "Der jüngste Tageswert belegt, dass die ERFASSUNG lief. Er sagt nicht, dass ein Urteil möglich war: In den ersten sieben Tagen sammelt die Wache nur und urteilt ausdrücklich nicht.",
    dbQuelle: "kostenwache",
    pruefFelder: [],
  },
  {
    id: "flows-nightly.yml",
    titel: "Nächtlicher Flow-Läufer",
    zweck: "Klickt nachts alle Kombinationen der Frage-Flows durch.",
    art: "action",
    rhythmus: "nächtlich",
    tag: null,
    beleg: "keiner",
    pruefFelder: [],
    blindWeil:
      "Er legt keinen Bericht ab und stempelt kein Prüfdatum. Sein Ausfall fällt trotzdem auf: Der Gesundheitscheck sieht seinen Workflow-Läufen zu und meldet drei erfolglose in Folge an Claude.",
    beobachtetVon: "Gesundheitscheck (drei erfolglose Läufe in Folge gehen an Claude)",
  },

  // ── wöchentlich ───────────────────────────────────────────────────────────
  {
    id: "solar-check-preis-waechter",
    titel: "Preis-Pipeline",
    zweck: "Prüft, ob die Marktpreise noch gescrapt werden, und heilt die Pipeline selbst.",
    art: "auftrag",
    rhythmus: "wöchentlich, montags",
    stummAbTage: 45,
    tag: "solar-check-preis-waechter",
    // Er meldet ausdrücklich NUR bei echter Sackgasse — in der Ablage steht
    // deshalb seit Bestehen keine einzige Zeile, obwohl er nachweislich läuft
    // (Auftragsliste, 24.08.2026). Bleibt der Preisstand in der Datenbank.
    // Der ist monatlich, nicht wöchentlich: Die Grenze folgt dem SCRAPE, den er
    // beaufsichtigt, nicht seinem eigenen Takt.
    beleg: "datenbank",
    belegHinweis:
      "Den Preisstand setzt der monatliche Scrape, nicht der Wächter. Ein frisches Datum belegt, dass die Pipeline läuft — also genau das, wofür er da ist. Dass ER lief, sagt es nicht.",
    dbQuelle: "marktpreise",
    pruefFelder: ["market_prices (Supabase), Rückfall: DEFAULT_PRICES.validFrom"],
    runbook: "scripts/preise-verify.md",
  },
  {
    id: "solar-atlas-welle-monitor",
    titel: "Solar-Atlas: Index-Wellen",
    zweck: "Prüft Indexierungsstatus und Sitemap-Frische und empfiehlt die nächste Freigabe-Welle.",
    art: "auftrag",
    rhythmus: "wöchentlich, montags",
    stummAbTage: 10,
    tag: "solar-atlas-welle-monitor",
    beleg: "meldung",
    pruefFelder: [],
  },
  {
    id: "solar-check-auto-aenderungen-wochenbericht",
    titel: "Wochenbericht: was die Wächter selbst geändert haben",
    zweck: "Legt einmal pro Woche offen, welche Werte ohne Zutun des Betreibers bewegt wurden.",
    art: "auftrag",
    rhythmus: "wöchentlich, sonntags",
    stummAbTage: 10,
    tag: "auto-aenderungen-wochenbericht",
    // Einer der beiden Läufe mit `force: true`: Hier IST „nichts zu melden" die
    // Nachricht, also meldet er immer.
    beleg: "meldung",
    pruefFelder: [],
  },

  // ── monatlich ─────────────────────────────────────────────────────────────
  {
    id: "co2-prognose-monitor",
    titel: "CO₂-Preis: Prognose-Scan",
    zweck: "Sucht monatlich nach neuen Prognosen für den CO₂-Preispfad.",
    art: "auftrag",
    rhythmus: "monatlich, am 3.",
    tag: "co2-prognose-monitor",
    beleg: "pruefdatum",
    pruefFelder: ["CO2_PRICE.geprueftIso"],
    runbook: "scripts/co2-preis-verify.md",
  },
  {
    id: "solar-check-rechenmodell-council",
    titel: "Rechenmodell-Council",
    zweck: "Lässt drei Prüfer die Rechenmodelle widerlegen — der Ersatz für eine Abnahme, die niemand leisten kann.",
    art: "auftrag",
    rhythmus: "monatlich, am 12.",
    stummAbTage: 45,
    tag: "rechenmodell-council",
    beleg: "meldung",
    pruefFelder: [],
    runbook: "scripts/rechenmodell-verify.md",
  },
  {
    id: "solar-check-seo-waechter",
    titel: "SEO-Sichtbarkeit",
    zweck: "Misst monatlich Rankings und Indexstatus und legt einen Schnappschuss ab.",
    art: "auftrag",
    rhythmus: "monatlich, am 2.",
    tag: null,
    beleg: "keiner",
    pruefFelder: [],
    blindWeil:
      "Er legt keinen Bericht in der Ablage ab und stempelt kein Prüfdatum. Sein Ergebnis ist ein Schnappschuss unter docs/seo/ — im Repo nachlesbar, aber von hier aus nicht als Lebenszeichen zu sehen. Ein Tag in seinem Auftrag würde ihn sichtbar machen.",
    runbook: "scripts/seo-verify.md",
  },

  // ── quartalsweise ─────────────────────────────────────────────────────────
  {
    id: "foerder-vollpruefung-quartal",
    titel: "Förderdaten: Voll-Verifikation",
    zweck: "Liest die Amtsseiten der Förderprogramme im Volltext und setzt das Prüfdatum je Programm.",
    art: "auftrag",
    rhythmus: "quartalsweise, am 1. Januar/April/Juli/Oktober",
    // Die Grenze folgt dem KATALOG, nicht dem Quartalslauf: Ein Prüfdatum wird
    // hier ständig gesetzt, und stünde wochenlang keines mehr, wäre das der
    // Befund — nicht erst nach einem verpassten Quartal.
    stummAbTage: 45,
    tag: "foerder-vollpruefung-quartal",
    beleg: "datenbank",
    belegHinweis:
      "Das jüngste Prüfdatum im Katalog kann auch der tägliche News-Wächter gesetzt haben. Es belegt, dass Programme geprüft werden, nicht dass dieser Quartalslauf stattgefunden hat. Ein gemeinsames Prüfdatum über alle Programme gibt es bewusst nicht — jedes trägt sein eigenes.",
    dbQuelle: "foerderkatalog",
    pruefFelder: ["funding_programs.last_verified (Supabase)"],
    runbook: "scripts/foerder-verify.md",
  },
  {
    id: "waermepumpe-werte-verify-jaehrlich",
    titel: "Wärmepumpe: Anschaffung, Tarife, BEG",
    zweck: "Prüft Investitionswerte und Förderung gegen Leitquelle und KfW-Merkblatt.",
    art: "auftrag",
    rhythmus: "quartalsweise, am 20. Januar/April/Juli/Oktober",
    tag: "waermepumpe-werte-verify",
    beleg: "pruefdatum",
    pruefFelder: [
      "DEFAULT_HEATPUMP_CONFIG.geprueftIso",
      "DEFAULT_HEATPUMP_CONFIG.geprueftFoerderungIso",
    ],
    runbook: "scripts/waermepumpe-verify.md",
  },
  {
    id: "solar-check-geraete-config-verify-jaehrlich",
    titel: "Geräte-Configs: Balkonkraftwerk und Klimaanlage",
    zweck: "Prüft Set-Preise, Effizienzen und die Rechtsaussagen zum Balkonkraftwerk.",
    art: "auftrag",
    rhythmus: "quartalsweise, am 15. Januar/April/Juli/Oktober",
    tag: "solar-check-geraete-config-verify-jaehrlich",
    beleg: "pruefdatum",
    pruefFelder: [
      "DEFAULT_AIRCON_CONFIG.geprueftIso",
      "DEFAULT_BALKON_CONFIG.geprueftIso",
      "BALKON_RECHT.geprueftIso",
    ],
    runbook: "scripts/klimaanlage-verify.md",
  },
  {
    id: "solar-check-legal-waechter",
    titel: "Legal-Wächter",
    zweck: "Prüft Gesetzes- und Lizenzänderungen — und zuerst, ob unsere Rechtstexte noch zu unserem Code passen.",
    art: "auftrag",
    rhythmus: "quartalsweise, am 15. Februar/Mai/August/November",
    tag: "legal-waechter",
    beleg: "pruefdatum",
    // Glossar und Rechtsbelege kamen mit der Inhalts-Inventur (25.08.2026) in
    // den Prüfstand und hingen bis zum 26.08. an keinem Lauf — genau der Fall,
    // den der Test „lässt keinen Prüfstand-Wert ohne zuständigen Lauf" fängt.
    // Der Prüfstand nennt für beide diesen Wächter; hier stand er nur nicht.
    pruefFelder: [
      "RECHTSTEXTE_GEPRUEFT_ISO",
      "GREEN_GAS_CONFIG.geprueftIso",
      "GLOSSAR_GEPRUEFT_ISO",
      "RECHTSBELEGE (ältester Eintrag)",
    ],
    runbook: "scripts/rechtstexte-verify.md",
  },

  // ── seltener ──────────────────────────────────────────────────────────────
  {
    id: "eeg-verguetung-verify-halbjaehrlich",
    titel: "EEG-Vergütungssätze und Börsenerlös",
    zweck: "Rechnet die Sätze aus dem Gesetz nach und prüft den Marktwert Solar.",
    art: "auftrag",
    rhythmus: "halbjährlich, am 28. Januar und 28. Juli",
    tag: "eeg-verguetung-verify-halbjaehrlich",
    beleg: "pruefdatum",
    pruefFelder: ["FEED_IN_GEPRUEFT_ISO", "MARKTWERT_GEPRUEFT_ISO"],
    runbook: "scripts/eeg-verify.md",
  },
  {
    id: "solar-check-freiflaeche-verify",
    titel: "Freiflächen-Zuschlagswerte",
    zweck: "Führt die Zuschlagswerte der Ausschreibungen nach — der Rhythmus folgt den Gebotsterminen.",
    art: "auftrag",
    rhythmus: "dreimal jährlich, am 25. Januar/April/August",
    tag: null,
    beleg: "pruefdatum",
    pruefFelder: ["FREIFLAECHE_GEPRUEFT_ISO"],
    runbook: "scripts/freiflaeche-verify.md",
  },
  {
    id: "co2-preis-verify-jaehrlich",
    titel: "CO₂-Preispfad: Voll-Prüfung",
    zweck: "Prüft den Pfad einmal jährlich im Dezember, nach dem Haushaltsbeschluss.",
    art: "auftrag",
    rhythmus: "jährlich, am 8. Dezember",
    tag: "co2-preis-verify-jaehrlich",
    // Er stempelt DASSELBE Feld wie der monatliche Prognose-Scan. Ein bewegtes
    // Datum beweist damit nur, dass EINER der beiden lief — und der Monats-Scan
    // läuft zwölfmal so oft. Das Feld als sein Lebenszeichen auszugeben wäre
    // eine Behauptung, die die Zahl nicht trägt.
    beleg: "keiner",
    pruefFelder: ["CO2_PRICE.geprueftIso"],
    blindWeil:
      "Sein Prüfdatum setzt auch der monatliche Prognose-Scan — ein bewegtes Datum beweist nur, dass einer von beiden lief. Nicht dringend: Der Wert steht dadurch nicht unbeaufsichtigt, er wird ohnehin jeden Monat gescannt. Sichtbar würde dieser Lauf durch ein eigenes Prüfdatum oder eine Ablage-Meldung.",
    runbook: "scripts/co2-preis-verify.md",
  },
];

// ─── Urteil ──────────────────────────────────────────────────────────────────

export type Zustand =
  /** Lebenszeichen jünger als die Toleranz. */
  | "laeuft"
  /** Lebenszeichen älter als die Toleranz — der Lauf hat nicht stattgefunden oder vergessen zu stempeln. */
  | "stillstand"
  /** Es gibt ein Lebenszeichen-Feld, aber wir konnten es nicht lesen (Datenbank weg). */
  | "unbekannt"
  /** Wir haben gar kein Lebenszeichen. */
  | "blind";

/** Was wir über einen Lauf sehen — von der Seite eingesammelt, hier nur bewertet. */
export interface Beobachtung {
  /** Jüngster Bericht seines Tags (ISO-Zeitstempel), `null`: keiner in der Ablage. */
  letzteMeldung?: string | null;
  /** Jüngstes Prüfdatum unter `pruefFelder` (ISO-Datum). */
  pruefdatum?: string | null;
  /** Stand aus der Datenbank (ISO-Datum). */
  datenbankStand?: string | null;
  /** Konnte die Ablage überhaupt gelesen werden? Sonst darf nichts grün sein. */
  ablageLesbar: boolean;
}

export interface Urteil {
  zustand: Zustand;
  /** Das Datum, auf das sich das Urteil stützt (ISO), `null` bei blind/unbekannt. */
  belegDatum: string | null;
  /** Tage seit diesem Datum. */
  alterTage: number | null;
  /** Ein Satz Klartext — was wir sehen und woraus. */
  satz: string;
}

const BELEG_NAME: Record<Exclude<BelegArt, "keiner">, string> = {
  meldung: "zuletzt gemeldet",
  pruefdatum: "Prüfdatum",
  datenbank: "Stand in der Datenbank",
};

/**
 * Ab wie vielen Tagen ohne Lebenszeichen dieser Lauf auffällig ist.
 *
 * EINE Quelle je Beleg-Art, nie zwei nebeneinander: Wo das Prüfdatum der Beleg
 * ist, steht die Grenze bereits im Prüfstand (`maxAlterTage`) und wird von dort
 * geholt — beide beantworten dieselbe Frage („hat der Lauf stattgefunden"), und
 * eine zweite Zahl im Register würde dagegen driften. Bei mehreren Feldern gilt
 * das ENGSTE: Das jüngste Datum ist das Lebenszeichen, also entscheidet die
 * schärfste Erwartung, die daran hängt.
 */
export function toleranzTage(job: WaechterJob, stand: PruefEintrag[] = PRUEFSTAND): number {
  if (job.beleg === "pruefdatum") {
    const grenzen = pruefEintraege(job, stand)
      .filter((e) => !e.standAusDb)
      .map((e) => e.maxAlterTage);
    if (!grenzen.length) {
      throw new Error(
        `Wächter „${job.id}“ nennt das Prüfdatum als Beleg, bewegt aber kein Prüfstand-Feld mit eigenem Datum.`,
      );
    }
    return Math.min(...grenzen);
  }
  if (job.stummAbTage === undefined) {
    throw new Error(`Wächter „${job.id}“ braucht ein stummAbTage — sein Beleg ist „${job.beleg}“.`);
  }
  return job.stummAbTage;
}

/**
 * Läuft dieser Wächter noch?
 *
 * Reine Funktion, Stichtag wird hereingereicht — sie soll ohne Netz und ohne Uhr
 * prüfbar sein. Bewusst wird NUR der Beleg bewertet, den der Eintrag als
 * maßgeblich benennt: Bei einem Lauf, der nur im Ernstfall meldet, wäre eine
 * leere Ablage kein Ausfall, sondern der Normalfall — sie trotzdem zu bewerten
 * hieße, Stillstand zu behaupten, wo keiner ist. Die übrigen Signale zeigt die
 * Seite als Zusatz an, sie entscheiden nichts.
 */
export function beurteile(job: WaechterJob, b: Beobachtung, heuteIso: string): Urteil {
  if (job.beleg === "keiner") {
    return {
      zustand: "blind",
      belegDatum: null,
      alterTage: null,
      satz: job.blindWeil ?? "Kein Lebenszeichen, das wir von hier aus sehen könnten.",
    };
  }

  const roh =
    job.beleg === "meldung" ? b.letzteMeldung : job.beleg === "pruefdatum" ? b.pruefdatum : b.datenbankStand;

  // Bei der Meldung heißt „nichts da" zweierlei: nie gemeldet, oder wir kamen
  // nicht an die Ablage. Das auseinanderzuhalten ist der Unterschied zwischen
  // einem Befund und einem Messfehler.
  if (!roh) {
    if (!b.ablageLesbar) {
      return {
        zustand: "unbekannt",
        belegDatum: null,
        alterTage: null,
        satz: "Nicht nachgesehen — die Ablage war nicht erreichbar.",
      };
    }
    return {
      zustand: "stillstand",
      belegDatum: null,
      alterTage: null,
      satz: `Kein einziges Lebenszeichen (${BELEG_NAME[job.beleg]}) — seit Bestehen nichts.`,
    };
  }

  const datum = roh.slice(0, 10);
  const alterTage = tageZwischen(datum, heuteIso, "prueftag");
  const grenze = toleranzTage(job);
  const zustand: Zustand = alterTage > grenze ? "stillstand" : "laeuft";
  return {
    zustand,
    belegDatum: datum,
    alterTage,
    satz:
      zustand === "laeuft"
        ? `${BELEG_NAME[job.beleg]} vor ${tageText(alterTage)}.`
        : `${BELEG_NAME[job.beleg]} vor ${tageText(alterTage)} — erwartet wäre höchstens ${grenze}.`,
  };
}

/** Singular/Plural gehört zur Richtigkeit, auch in einer Nebenzeile. */
export function tageText(tage: number): string {
  if (tage <= 0) return "weniger als einem Tag";
  return tage === 1 ? "einem Tag" : `${tage} Tagen`;
}

/** Die Prüfstand-Einträge, die dieser Lauf bewegt — aufgelöst über das Feld. */
export function pruefEintraege(job: WaechterJob, stand: PruefEintrag[] = PRUEFSTAND): PruefEintrag[] {
  return job.pruefFelder
    .map((f) => stand.find((e) => e.feld === f))
    .filter((e): e is PruefEintrag => Boolean(e));
}

/**
 * Reihenfolge auf der Seite: das Schlimmste zuerst, danach der Takt.
 * Blind vor Stillstand — ein Lauf, den wir gar nicht sehen, ist schlechter dran
 * als einer, von dem wir wissen, dass er steht.
 */
const RANG: Record<Zustand, number> = { blind: 0, stillstand: 1, unbekannt: 2, laeuft: 3 };

export function sortiere<T extends { urteil: Urteil; job: WaechterJob }>(zeilen: T[]): T[] {
  // Zweitkriterium ist die Reihenfolge in WAECHTER — die Liste ist nach Takt
  // gruppiert (täglich zuerst). Bewusst keine zweite Takt-Zahl im Eintrag: Sie
  // müsste gepflegt werden und wäre die dritte Stelle, an der derselbe Rhythmus
  // steht (neben dem Klartext und der Toleranz).
  const platz = new Map(WAECHTER.map((j, i) => [j.id, i]));
  return [...zeilen].sort(
    (a, b) =>
      RANG[a.urteil.zustand] - RANG[b.urteil.zustand] ||
      (platz.get(a.job.id) ?? 0) - (platz.get(b.job.id) ?? 0),
  );
}
