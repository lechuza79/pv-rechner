/**
 * Der Katalog: wie aus einem erhobenen Medium und einem Kontakt eine Zeile wird.
 *
 * Diese Datei ist die EINE Quelle für die Spaltennamen, die Beschriftungen und
 * die drei abgeleiteten Größen (passende Geschichten, Aufhänger, Priorität).
 * Der Erhebungslauf gibt damit seine Datei aus, die Ansicht im Adminbereich
 * ihren Export — beide dieselbe Zeile.
 *
 * WARUM NICHT IM LAUF: Die Spaltennamen sind ab dem ersten gelieferten Katalog
 * eine Schnittstelle. Läge der Aufbau im Lauf und die Ansicht baute ihn nach,
 * hätten wir zwei Fassungen derselben Tabelle — und die erste Abweichung fiele
 * niemandem auf, weil beide für sich plausibel aussehen. Dieselbe Systematik
 * wie beim Anschreiben an die Gemeinden, das aus genau einem Grund an einer
 * Stelle entsteht.
 *
 * Kein Netzzugriff, keine Datenbank.
 */

import type { Themenfund } from "./presse-extrakt";

// ─── Was aus der Datenbank kommt ─────────────────────────────────────────────

export interface MediumZeile {
  /** In welche Ansprache das Medium fällt — bestimmt den AUFHÄNGER, nicht die
   *  Eignung. Werte und Beschriftungen in `RUBRIK_TEXT` (lib/presse-stand.ts). */
  rubrik?: string | null;
  /** Der Beitrag, mit dem ein Anschreiben anfangen kann: Überschrift wörtlich,
   *  Adresse, an der er gelesen wurde, ein Satz Einordnung und der Prüftag.
   *  Fehlt der Titel bei gesetztem Datum, heißt das „gelesen, kein Thema" —
   *  nicht „nicht angesehen". */
  beleg_titel?: string | null;
  beleg_url?: string | null;
  beleg_notiz?: string | null;
  beleg_am?: string | null;
  /** Trägt der Beitrag? Entschieden am gelesenen VOLLTEXT, nicht an der
   *  Überschrift — und daran, ob eines unserer Werkzeuge die Frage beantwortet,
   *  die der Beitrag offenlässt. */
  beleg_traegt?: string | null;
  /** Was der Beitrag offenlässt und welches Werkzeug es füllt. Das ist der
   *  Satz, aus dem das Anschreiben entsteht. */
  beleg_traegt_grund?: string | null;
  /** Der eine Satz, was der Beitrag offenlässt — kurz genug fürs Anschreiben. */
  beleg_luecke?: string | null;
  /** Schlüssel aus der Werkzeugliste; als Liste, damit die Zuordnung prüfbar ist. */
  werkzeug?: string[] | null;
  /** Alter des Beitrags in Tagen am Prüftag. Ein Aufhänger, der Jahre alt ist,
   *  trägt inhaltlich und taugt trotzdem nicht für einen Erstkontakt. */
  anknuepfung_tage?: number | null;
  domain: string;
  saat_name: string | null;
  saat_typ: string | null;
  saat_schwerpunkt: string | null;
  saat_gebiet: string | null;
  gruppe: string | null;
  paket: number;
  notiz: string | null;
  titel: string | null;
  medientyp: string[] | null;
  themen: Themenfund[] | null;
  geschichten: string[] | null;
  reichweite: string | null;
  reichweite_quelle?: string | null;
  ist_medium: string | null;
  medium_grund: string | null;
  medium_merkmale?: string[] | null;
  seiten?: Record<string, string> | null;
  formular_url: string | null;
  impressum_url?: string | null;
  prioritaet: string | null;
  gattung?: string | null;
  /** Von Hand gesetzt — schlägt die Messung und überlebt jeden Erhebungslauf. */
  gattung_hand?: string | null;
  woerter?: number | null;
  aufhaenger: string | null;
  hinweis: string | null;
  /** Handurteil über das Medium: lohnt eine Ansprache? Nie vom Lauf gesetzt. */
  eignung?: string | null;
  /** Von Hand gesetzt — schlägt die Messung und überlebt jeden Lauf. */
  eignung_hand?: string | null;
  eignung_grund?: string | null;
  /** Die Seite, auf der das Urteil steht — ohne sie ist es eine Behauptung. */
  eignung_beleg?: string | null;
  eignung_zitat?: string | null;
  profil_at: string | null;
  fehler: string | null;
}

export interface KontaktZeile {
  domain: string;
  schluessel: string;
  name: string | null;
  funktion: string | null;
  rang: number;
  mail: string | null;
  mail_art: string | null;
  formular_url: string | null;
  quelle_url: string;
  seitenart: string | null;
  anker: string | null;
  fundstelle: string | null;
  geprueft_am: string;
  stand?: string | null;
  notiz?: string | null;
  stand_at?: string | null;
}

// ─── Spalten ─────────────────────────────────────────────────────────────────

/** Stabile Spaltennamen — ab dem ersten gelieferten Katalog eine Schnittstelle
 *  und ab da nicht mehr zu ändern. */
export const SPALTEN = [
  "medium",
  "website",
  "medientyp",
  "schwerpunkt",
  "gebiet",
  "reichweite",
  "redaktion_oder_person",
  "funktion",
  "kontakt",
  "kontakt_art",
  "quelle_url",
  "geprueft_am",
  "passende_geschichten",
  "aufhaenger",
  "prioritaet",
  "gattung",
  "mediengruppe",
  "paket",
  "arbeitsstand",
  "eignung",
  "eignung_grund",
  "eignung_beleg",
  "notizen",
] as const;

// ─── Ableitungen ─────────────────────────────────────────────────────────────

/**
 * Wie das Medium im Katalog heißt.
 *
 * Gemessen schlägt angenommen — mit EINER Ausnahme, und die ist ebenfalls
 * gemessen: energiezukunft.eu trägt als Seitentitel „EWS Schönau" (den Namen
 * seines Herausgebers), springerprofessional.de „Springer Professional". Beides
 * ist wahr und im Verteiler unbrauchbar: Wer die Zeile liest, sucht das Medium,
 * nicht den Verlag. Teilt der gemessene Titel kein tragendes Wort mit dem Namen
 * aus der Saat oder mit der Adresse, gilt der Name aus der Saat — und der
 * gemessene Titel steht in den Notizen, damit die Abweichung nicht verschwindet.
 */
export function mediumName(m: MediumZeile): string {
  if (!m.titel) return m.saat_name ?? m.domain;
  if (!m.saat_name) return m.titel;
  if (teiltWort(m.titel, `${m.saat_name} ${m.domain}`)) return m.titel;
  return m.saat_name;
}

function teiltWort(a: string, b: string): boolean {
  const zerlege = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[^a-zäöüß0-9]+/)
        .filter((w) => w.length >= 4),
    );
  const eins = zerlege(a);
  for (const w of zerlege(b)) if (eins.has(w)) return true;
  return false;
}

/**
 * Fachmedium oder Publikumsmedium — die Handentscheidung schlägt die Messung.
 *
 * Die Messung sieht EINE Startseite an EINEM Tag. Sie trennt die klaren Fälle
 * (eine Tageszeitung kommt nie über zwei Kerntreffer je tausend Wörter, ein
 * Fachtitel selten unter vier), aber ein Fachtitel, der an diesem Tag über
 * etwas anderes schreibt, fällt durch. Deshalb entscheidet am Ende ein Mensch,
 * und seine Entscheidung wird nicht überschrieben.
 */
export function gattungEffektiv(m: MediumZeile): string | null {
  return m.gattung_hand ?? m.gattung ?? null;
}

export function gattungText(m: MediumZeile): string {
  const g = gattungEffektiv(m);
  const wort = g === "fach" ? "Fachmedium" : g === "publikum" ? "Publikumsmedium" : "nicht gemessen";
  return m.gattung_hand ? `${wort} (von Hand gesetzt)` : wort;
}

/** Das Urteil, das gilt: die Handentscheidung, sonst die Messung. */
export function eignungEffektiv(m: MediumZeile): string | null {
  return m.eignung_hand ?? m.eignung ?? null;
}

export function themenText(t: Themenfund[] | null): string | null {
  if (!t || !t.length) return null;
  return t
    .filter((x) => x.treffer >= 2)
    .slice(0, 5)
    .map((x) => `${x.name} (${x.treffer})`)
    .join(" · ");
}

/** Gemessenes schlägt Vorannahme — und was nur aus der Saat kommt, trägt den
 *  Vermerk. Ohne ihn wäre eine Behauptung von einer Messung nicht zu
 *  unterscheiden, und genau das verbietet die Vorgabe. */
export function feldMitVermerk(gemessen: string | null, saat: string | null): string {
  if (gemessen) return gemessen;
  return saat ? `${saat} (ungeprüft)` : "ungeprüft";
}

export function kontaktArt(k: KontaktZeile | null, mediumHatFormular: boolean): string {
  if (!k) return "kein Kontakt gefunden";
  if (k.mail_art === "person") return "persönliche Adresse";
  if (k.mail_art === "redaktion") return "Redaktionspostfach";
  if (k.mail_art === "allgemein") return "allgemeines Postfach";
  if (k.mail_art === "werblich") return "nur Werbekontakt gefunden";
  if (k.mail_art === "formular") return "Kontaktformular";
  if (k.mail_art === "person-ohne-namen") return "persönliche Adresse, Name nicht zugeordnet";
  // Die Person ist benannt, die Adresse fehlt — dann steht in der Kontaktspalte
  // das Formular DES MEDIUMS. Das muss dranstehen: „Person ohne Adresse" neben
  // einer Adresse in derselben Zeile ist genau die Sorte Beschriftung, die etwas
  // anderes sagt als der Wert daneben.
  if (k.name) {
    return mediumHatFormular
      ? "Person benannt — erreichbar über das Kontaktformular des Mediums"
      : "Person benannt, keine Adresse veröffentlicht";
  }
  return "ungeprüft";
}

export const AUSLAND =
  /\b(?:France|Australia|Brasil|Brazil|Italia|Italy|España|Spain|India|China|Japan|Mexico|Chile|Argentina|USA|U\.S\.|America|UK|Ireland|Poland|Polska|Nederland|Netherlands|Türkiye|Turkey|Frankreich|Australien|Brasilien|Italien|Spanien|Indien|Polen|Niederlande|Türkei)\b/i;

/**
 * Die Priorität der ZEILE, nicht des Mediums.
 *
 * Ein A-Medium kann einen C-Kontakt tragen: Bei pv magazine steht die
 * Australien-Redaktion auf derselben Seite wie die deutsche. Wer die Zeile nach
 * der Medien-Priorität abarbeitet, schreibt einer Kollegin in Sydney über den
 * Zubau in Nordrhein-Westfalen.
 */
export function zeilenPrioritaet(medium: string | null, k: KontaktZeile | null): string {
  const p = medium ?? "C";
  if (!k) return p;
  if (AUSLAND.test(k.funktion ?? "")) return "C";
  // Eine Verlagsgeschäftsführung ist nie der Adressat einer Datengeschichte.
  if (k.rang <= 20) return p === "A" ? "B" : "C";
  return p;
}

export function notizen(
  m: MediumZeile,
  k: KontaktZeile | null,
  mailKommtVor: Map<string, string[]>,
): string {
  const teile: string[] = [];
  // Die von Hand eingetragene Notiz steht VORN, nicht am Ende der abgeleiteten
  // Beobachtungen: Sie ist das einzige Stück in dieser Zeile, das ein Mensch
  // geschrieben hat („Kontakt besteht über LinkedIn"), und hinter sieben
  // Maschinenbefunden liest sie niemand mehr.
  if (m.notiz) teile.push(m.notiz);
  if (m.fehler) teile.push(`Abruf: ${m.fehler}`);
  if (m.hinweis) teile.push(m.hinweis);
  if (m.ist_medium === "unklar") teile.push("redaktionelles Angebot nicht eindeutig belegt");
  if (m.ist_medium === "kein-medium") teile.push(`kein redaktionelles Angebot (${m.medium_grund})`);
  if (k && k.name && !k.mail) teile.push("Person benannt, Adresse nur über Postfach/Formular");
  if (k && k.mail_art === "werblich") teile.push("kein redaktioneller Weg gefunden");
  if (k?.funktion && AUSLAND.test(k.funktion)) {
    teile.push("Auslandsredaktion — berichtet nicht über Deutschland");
  }
  if (k?.mail) {
    const auch = (mailKommtVor.get(k.mail) ?? []).filter((d) => d !== m.domain);
    if (auch.length) teile.push(`dieselbe Adresse auch unter ${auch.join(", ")}`);
  }
  if (!m.titel) teile.push("Name des Mediums aus der Saat (ungeprüft)");
  else if (mediumName(m) !== m.titel) teile.push(`Seitentitel lautet abweichend: „${m.titel}"`);
  if (k?.notiz) teile.push(`Notiz: ${k.notiz}`);
  if (m.gruppe) teile.push(`Mediengruppe: ${m.gruppe}`);
  return teile.join("; ");
}

// ─── Eine Zeile ──────────────────────────────────────────────────────────────

export function katalogZeile(
  m: MediumZeile,
  k: KontaktZeile | null,
  mailKommtVor: Map<string, string[]>,
): string[] {
  return [
    mediumName(m),
    `https://${m.domain}`,
    feldMitVermerk(m.medientyp?.join(" · ") ?? null, m.saat_typ),
    feldMitVermerk(themenText(m.themen), m.saat_schwerpunkt),
    `${m.saat_gebiet ?? ""} (ungeprüft)`,
    m.reichweite ?? "ungeprüft",
    k?.name ??
      (k?.mail_art === "person-ohne-namen"
        ? "Person (Name auf der Seite nicht zuzuordnen)"
        : k?.mail
          ? "Redaktion (Postfach)"
          : m.fehler
            ? ""
            : "ungeprüft"),
    k?.funktion ?? "",
    k?.mail ?? k?.formular_url ?? m.formular_url ?? "",
    kontaktArt(k, !!m.formular_url),
    k?.quelle_url ?? "",
    k?.geprueft_am ?? (m.profil_at ? m.profil_at.slice(0, 10) : ""),
    (m.geschichten ?? []).join(" · "),
    m.aufhaenger ?? "",
    zeilenPrioritaet(m.prioritaet, k),
    gattungText(m),
    m.gruppe ?? "",
    String(m.paket),
    k?.stand && k.stand !== "offen" ? k.stand : "",
    (() => {
      const e = eignungEffektiv(m);
      return e && e !== "offen" ? (m.eignung_hand ? `${e} (von Hand)` : e) : "";
    })(),
    m.eignung_grund ?? "",
    m.eignung_beleg ?? "",
    notizen(m, k, mailKommtVor),
  ];
}

/** Wo dieselbe Adresse unter mehreren Domains steht — für die Dublettennotiz.
 *  Nicht löschen (beide Titel sind echt), aber benennen: Wer beide anschreibt,
 *  schreibt demselben Menschen zweimal. */
export function adressenNachDomain(kontakte: KontaktZeile[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const k of kontakte) {
    if (!k.mail) continue;
    out.set(k.mail, [...(out.get(k.mail) ?? []), k.domain]);
  }
  return out;
}

export function csvFeld(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Der ganze Katalog als CSV — dieselbe Ausgabe für den Lauf und für den
 *  Export-Knopf in der Ansicht. */
export function alsCsv(
  medien: MediumZeile[],
  kontakte: KontaktZeile[],
  opts: { nurBesterKontakt?: boolean } = {},
): string {
  const jeDomain = new Map<string, KontaktZeile[]>();
  for (const k of kontakte) jeDomain.set(k.domain, [...(jeDomain.get(k.domain) ?? []), k]);
  const mailKommtVor = adressenNachDomain(kontakte);

  const zeilen: string[] = [SPALTEN.join(",")];
  const sortiert = [...medien].sort((a, b) => {
    const p = (x: string | null) => (x === "A" ? 0 : x === "B" ? 1 : 2);
    return p(a.prioritaet) - p(b.prioritaet) || mediumName(a).localeCompare(mediumName(b), "de");
  });
  for (const m of sortiert) {
    const ks = (jeDomain.get(m.domain) ?? []).sort((a, b) => b.rang - a.rang);
    const auszugeben = ks.length ? (opts.nurBesterKontakt ? ks.slice(0, 1) : ks) : [null];
    for (const k of auszugeben) {
      zeilen.push(katalogZeile(m, k, mailKommtVor).map(csvFeld).join(","));
    }
  }
  return zeilen.join("\n");
}

/** Ein Adressat für ein Anschreiben: an wen es geht und wie es dorthin kommt. */
export interface Adressat {
  /** Name für die Anrede — nur gesetzt, wenn er BELEGT ist. */
  name: string | null;
  funktion: string | null;
  /** Der Versandweg: Adresse oder Formular. */
  weg: string | null;
  wegArt: "mail" | "formular" | null;
  /** Stehen Name und Weg in DERSELBEN Fundstelle? Nur dann gehören sie
   *  nachweislich zusammen. */
  ausEinerHand: boolean;
}

/**
 * WER WIRD ANGESCHRIEBEN — und mit welcher Anrede.
 *
 * Die Falle, gegen die das gebaut ist: Eine Zeile trägt einen Namen, eine
 * andere eine Adresse, und wer beides nebeneinander setzt, erzeugt einen
 * Adressaten, den es nicht gibt. Im Bestand stand so „Robert Reisch
 * (Geschäftsführer) · weinhold@erneuerbareenergien.de" — zwei Menschen, eine
 * Zeile. Eine falsche Anrede ist schlimmer als gar keine: Sie ist das erste,
 * was der Empfänger liest.
 *
 * Deshalb die Rangfolge:
 *   1. Eine Zeile, die Name UND Weg trägt — die einzige, bei der beides
 *      nachweislich zusammengehört.
 *   2. Sonst ein Postfach OHNE Anrede, und der bekannte Name steht daneben als
 *      das, was er ist: ein Hinweis, kein Adressat.
 */
export function adressatVon(kontakte: KontaktZeile[]): Adressat {
  const nachRang = [...kontakte].sort((a, b) => (b.rang ?? 0) - (a.rang ?? 0));
  const ausEiner = nachRang.find((k) => k.name && (k.mail || k.formular_url));
  if (ausEiner) {
    return {
      name: ausEiner.name ?? null,
      funktion: ausEiner.funktion ?? null,
      weg: ausEiner.mail ?? ausEiner.formular_url ?? null,
      wegArt: ausEiner.mail ? "mail" : "formular",
      ausEinerHand: true,
    };
  }
  const weg = nachRang.find((k) => k.mail) ?? nachRang.find((k) => k.formular_url);
  return {
    name: null,
    funktion: null,
    weg: weg?.mail ?? weg?.formular_url ?? null,
    wegArt: weg?.mail ? "mail" : weg?.formular_url ? "formular" : null,
    ausEinerHand: false,
  };
}
