// Schulferien je Bundesland — die Sperre für den Kommunen-Versand.
//
// WARUM DAS EINE CODE-DATEI IST UND KEIN MERKSATZ: „Nie in den Schulferien des
// Ziel-Bundeslands senden" stand als Regel in einer Notiz. Eine Notiz hält
// niemanden auf; sie wird beim übernächsten Schub von jemandem gelesen, der
// gerade eine Liste vor sich hat, in der das Bundesland nur als zweistellige
// Zahl vorkommt. Der Versand fragt deshalb diese Tabelle und verweigert — die
// Regel ist damit nicht mehr davon abhängig, dass jemand an sie denkt.
//
// Der Grund für die Regel selbst: In den Ferien ist die Pressestelle einer
// kleinen Verwaltung entweder nicht besetzt oder in Notbesetzung. Eine Mail,
// die dort in ein Postfach fällt, wird nicht schlecht beantwortet — sie wird
// gar nicht gelesen, und die Gemeinde ist für einen zweiten Versuch verbraucht
// (Nachfassen per Mail ist ausgeschlossen, siehe Rechtsrahmen).
//
// QUELLE: Kultusministerkonferenz, „Ferien im Schuljahr 2025/2026" und
// „… 2026/2027", beide Stand 09.10.2025, abgerufen und Zelle für Zelle
// übertragen am 19.08.2026. Angegeben ist jeweils der ERSTE und der LETZTE
// Ferientag — die Zeiträume hier sind deshalb beidseitig einschließlich.
//
// Bewegliche schul-/unterrichtsfreie Einzeltage (im Original kursiv) sind
// mitgenommen, wo sie an einen Zeitraum anschließen (Baden-Württemberg 31.10.)
// oder den Zeitraum selbst bilden (Bayern Herbst 2026). Zu viel zu sperren
// kostet einen Tag Versand, zu wenig kostet die Gemeinde.

export type Ferienzeitraum = {
  /** Erster Ferientag, ISO. */
  von: string;
  /** Letzter Ferientag, ISO — einschließlich. */
  bis: string;
  name: string;
};

export const SCHULFERIEN_QUELLE = {
  titel: "Ferien im Schuljahr 2025/2026 und 2026/2027",
  herausgeber: "Sekretariat der Kultusministerkonferenz",
  url: "https://www.kmk.org/service/ferien.html",
  standDerQuelle: "2025-10-09",
  geprueftIso: "2026-08-19",
} as const;

/**
 * Bis zu welchem Tag die Tabelle vollständig ist.
 *
 * Das ist das Ende der zuletzt erfassten Sommerferien im FRÜHESTEN Land
 * (Hessen/Rheinland-Pfalz/Saarland, 06.08.2027). Danach beginnt für diese
 * Länder ein Schuljahr, dessen Termine hier nicht stehen — und eine leere
 * Tabelle sagt „keine Ferien", also genau das Gegenteil dessen, was sie weiß.
 * Der Versand verweigert ab diesem Datum, statt still durchzulaufen.
 */
export const SCHULFERIEN_ABGEDECKT_BIS = "2027-08-06";

/** Schlüssel ist der zweistellige amtliche Gemeindeschlüssel des Landes. */
export const SCHULFERIEN: Record<string, Ferienzeitraum[]> = {
  // Schleswig-Holstein
  "01": [
    { von: "2026-07-04", bis: "2026-08-15", name: "Sommer 2026" },
    { von: "2026-10-12", bis: "2026-10-24", name: "Herbst 2026" },
    { von: "2026-12-21", bis: "2027-01-06", name: "Weihnachten 2026/27" },
    { von: "2027-03-30", bis: "2027-04-10", name: "Ostern 2027" },
    { von: "2027-05-07", bis: "2027-05-07", name: "Pfingsten 2027" },
    { von: "2027-07-03", bis: "2027-08-14", name: "Sommer 2027" },
  ],
  // Hamburg
  "02": [
    { von: "2026-07-09", bis: "2026-08-19", name: "Sommer 2026" },
    { von: "2026-10-19", bis: "2026-10-30", name: "Herbst 2026" },
    { von: "2026-12-21", bis: "2027-01-01", name: "Weihnachten 2026/27" },
    { von: "2027-01-29", bis: "2027-01-29", name: "Winter 2027" },
    { von: "2027-03-01", bis: "2027-03-12", name: "Frühjahr 2027" },
    { von: "2027-05-07", bis: "2027-05-14", name: "Pfingsten 2027" },
    { von: "2027-07-01", bis: "2027-08-11", name: "Sommer 2027" },
  ],
  // Niedersachsen
  "03": [
    { von: "2026-07-02", bis: "2026-08-12", name: "Sommer 2026" },
    { von: "2026-10-12", bis: "2026-10-24", name: "Herbst 2026" },
    { von: "2026-12-23", bis: "2027-01-09", name: "Weihnachten 2026/27" },
    { von: "2027-02-01", bis: "2027-02-02", name: "Winter 2027" },
    { von: "2027-03-22", bis: "2027-04-03", name: "Ostern 2027" },
    { von: "2027-05-07", bis: "2027-05-07", name: "Himmelfahrt 2027" },
    { von: "2027-05-18", bis: "2027-05-18", name: "Pfingsten 2027" },
    { von: "2027-07-08", bis: "2027-08-18", name: "Sommer 2027" },
  ],
  // Bremen
  "04": [
    { von: "2026-07-02", bis: "2026-08-12", name: "Sommer 2026" },
    { von: "2026-10-12", bis: "2026-10-24", name: "Herbst 2026" },
    { von: "2026-12-23", bis: "2027-01-09", name: "Weihnachten 2026/27" },
    { von: "2027-02-01", bis: "2027-02-02", name: "Winter 2027" },
    { von: "2027-03-22", bis: "2027-04-03", name: "Ostern 2027" },
    { von: "2027-05-07", bis: "2027-05-07", name: "Himmelfahrt 2027" },
    { von: "2027-05-18", bis: "2027-05-18", name: "Pfingsten 2027" },
    { von: "2027-07-08", bis: "2027-08-18", name: "Sommer 2027" },
  ],
  // Nordrhein-Westfalen
  "05": [
    { von: "2026-07-20", bis: "2026-09-01", name: "Sommer 2026" },
    { von: "2026-10-17", bis: "2026-10-31", name: "Herbst 2026" },
    { von: "2026-12-23", bis: "2027-01-06", name: "Weihnachten 2026/27" },
    { von: "2027-03-22", bis: "2027-04-03", name: "Ostern 2027" },
    { von: "2027-05-18", bis: "2027-05-18", name: "Pfingsten 2027" },
    { von: "2027-07-19", bis: "2027-08-31", name: "Sommer 2027" },
  ],
  // Hessen
  "06": [
    { von: "2026-06-29", bis: "2026-08-07", name: "Sommer 2026" },
    { von: "2026-10-05", bis: "2026-10-17", name: "Herbst 2026" },
    { von: "2026-12-23", bis: "2027-01-12", name: "Weihnachten 2026/27" },
    { von: "2027-03-22", bis: "2027-04-02", name: "Ostern 2027" },
    { von: "2027-06-28", bis: "2027-08-06", name: "Sommer 2027" },
  ],
  // Rheinland-Pfalz
  "07": [
    { von: "2026-06-29", bis: "2026-08-07", name: "Sommer 2026" },
    { von: "2026-10-05", bis: "2026-10-16", name: "Herbst 2026" },
    { von: "2026-12-23", bis: "2027-01-08", name: "Weihnachten 2026/27" },
    { von: "2027-03-22", bis: "2027-04-02", name: "Ostern 2027" },
    { von: "2027-06-28", bis: "2027-08-06", name: "Sommer 2027" },
  ],
  // Baden-Württemberg
  "08": [
    { von: "2026-07-30", bis: "2026-09-12", name: "Sommer 2026" },
    { von: "2026-10-26", bis: "2026-10-31", name: "Herbst 2026" },
    { von: "2026-12-23", bis: "2027-01-09", name: "Weihnachten 2026/27" },
    { von: "2027-03-25", bis: "2027-03-25", name: "Frühjahr 2027" },
    { von: "2027-03-30", bis: "2027-04-03", name: "Ostern 2027" },
    { von: "2027-05-18", bis: "2027-05-29", name: "Pfingsten 2027" },
    { von: "2027-07-29", bis: "2027-09-11", name: "Sommer 2027" },
  ],
  // Bayern
  "09": [
    { von: "2026-08-03", bis: "2026-09-14", name: "Sommer 2026" },
    { von: "2026-11-02", bis: "2026-11-06", name: "Herbst 2026" },
    { von: "2026-12-24", bis: "2027-01-08", name: "Weihnachten 2026/27" },
    { von: "2027-02-08", bis: "2027-02-12", name: "Frühjahr 2027" },
    { von: "2027-03-22", bis: "2027-04-02", name: "Ostern 2027" },
    { von: "2027-05-18", bis: "2027-05-28", name: "Pfingsten 2027" },
    { von: "2027-08-02", bis: "2027-09-13", name: "Sommer 2027" },
  ],
  // Saarland
  "10": [
    { von: "2026-06-29", bis: "2026-08-07", name: "Sommer 2026" },
    { von: "2026-10-05", bis: "2026-10-16", name: "Herbst 2026" },
    { von: "2026-12-21", bis: "2026-12-31", name: "Weihnachten 2026/27" },
    { von: "2027-02-08", bis: "2027-02-12", name: "Winter 2027" },
    { von: "2027-03-30", bis: "2027-04-09", name: "Ostern 2027" },
    { von: "2027-06-28", bis: "2027-08-06", name: "Sommer 2027" },
  ],
  // Berlin
  "11": [
    { von: "2026-07-09", bis: "2026-08-22", name: "Sommer 2026" },
    { von: "2026-10-19", bis: "2026-10-31", name: "Herbst 2026" },
    { von: "2026-12-23", bis: "2027-01-02", name: "Weihnachten 2026/27" },
    { von: "2027-02-01", bis: "2027-02-06", name: "Winter 2027" },
    { von: "2027-03-22", bis: "2027-04-02", name: "Ostern 2027" },
    { von: "2027-05-07", bis: "2027-05-07", name: "Himmelfahrt 2027" },
    { von: "2027-05-18", bis: "2027-05-19", name: "Pfingsten 2027" },
    { von: "2027-07-01", bis: "2027-08-14", name: "Sommer 2027" },
  ],
  // Brandenburg
  "12": [
    { von: "2026-07-09", bis: "2026-08-22", name: "Sommer 2026" },
    { von: "2026-10-19", bis: "2026-10-30", name: "Herbst 2026" },
    { von: "2026-12-23", bis: "2027-01-02", name: "Weihnachten 2026/27" },
    { von: "2027-02-01", bis: "2027-02-06", name: "Winter 2027" },
    { von: "2027-03-22", bis: "2027-04-03", name: "Ostern 2027" },
    { von: "2027-05-18", bis: "2027-05-18", name: "Pfingsten 2027" },
    { von: "2027-07-01", bis: "2027-08-14", name: "Sommer 2027" },
  ],
  // Mecklenburg-Vorpommern
  "13": [
    { von: "2026-07-13", bis: "2026-08-22", name: "Sommer 2026" },
    { von: "2026-10-15", bis: "2026-10-24", name: "Herbst 2026" },
    { von: "2026-12-21", bis: "2027-01-02", name: "Weihnachten 2026/27" },
    { von: "2027-02-08", bis: "2027-02-19", name: "Winter 2027" },
    { von: "2027-03-24", bis: "2027-04-02", name: "Ostern 2027" },
    { von: "2027-05-07", bis: "2027-05-07", name: "Himmelfahrt 2027" },
    { von: "2027-05-14", bis: "2027-05-18", name: "Pfingsten 2027" },
    { von: "2027-07-05", bis: "2027-08-14", name: "Sommer 2027" },
  ],
  // Sachsen
  "14": [
    { von: "2026-07-04", bis: "2026-08-14", name: "Sommer 2026" },
    { von: "2026-10-12", bis: "2026-10-24", name: "Herbst 2026" },
    { von: "2026-12-23", bis: "2027-01-02", name: "Weihnachten 2026/27" },
    { von: "2027-02-08", bis: "2027-02-19", name: "Winter 2027" },
    { von: "2027-03-26", bis: "2027-04-02", name: "Ostern 2027" },
    { von: "2027-05-07", bis: "2027-05-07", name: "Himmelfahrt 2027" },
    { von: "2027-05-15", bis: "2027-05-18", name: "Pfingsten 2027" },
    { von: "2027-07-10", bis: "2027-08-20", name: "Sommer 2027" },
  ],
  // Sachsen-Anhalt
  "15": [
    { von: "2026-07-04", bis: "2026-08-14", name: "Sommer 2026" },
    { von: "2026-10-19", bis: "2026-10-30", name: "Herbst 2026" },
    { von: "2026-12-21", bis: "2027-01-02", name: "Weihnachten 2026/27" },
    { von: "2027-02-01", bis: "2027-02-06", name: "Winter 2027" },
    { von: "2027-03-22", bis: "2027-03-27", name: "Ostern 2027" },
    { von: "2027-05-15", bis: "2027-05-22", name: "Pfingsten 2027" },
    { von: "2027-07-10", bis: "2027-08-20", name: "Sommer 2027" },
  ],
  // Thüringen
  "16": [
    { von: "2026-07-04", bis: "2026-08-14", name: "Sommer 2026" },
    { von: "2026-10-12", bis: "2026-10-24", name: "Herbst 2026" },
    { von: "2026-12-23", bis: "2027-01-02", name: "Weihnachten 2026/27" },
    { von: "2027-02-01", bis: "2027-02-06", name: "Winter 2027" },
    { von: "2027-03-22", bis: "2027-04-03", name: "Ostern 2027" },
    { von: "2027-05-07", bis: "2027-05-07", name: "Himmelfahrt 2027" },
    { von: "2027-07-10", bis: "2027-08-20", name: "Sommer 2027" },
  ],
};

/**
 * Gesetzliche Feiertage, die auf einen Versandtag (Di–Do) fallen können.
 *
 * Die Ferientabelle kennt sie NICHT: Fronleichnam ist in Hessen, Rheinland-Pfalz
 * und im Saarland gesetzlicher Feiertag, fällt immer auf einen Donnerstag und
 * steht in keiner Ferienliste. Dasselbe gilt für den 1. Mai und den 3. Oktober,
 * wenn sie auf Dienstag bis Donnerstag fallen. In diesem Schub kostet das noch
 * nichts — beim nächsten wäre es ein still verlorener Versandtag.
 *
 * Bundesweite Feiertage stehen unter dem Schlüssel „*", länderspezifische unter
 * dem Landesschlüssel. Erfasst bis zum selben Datum wie die Ferien.
 */
export const FEIERTAGE: Record<string, { tag: string; name: string }[]> = {
  "*": [
    { tag: "2026-10-03", name: "Tag der Deutschen Einheit" },
    { tag: "2026-12-25", name: "1. Weihnachtstag" },
    { tag: "2027-01-01", name: "Neujahr" },
    { tag: "2027-03-26", name: "Karfreitag" },
    { tag: "2027-03-29", name: "Ostermontag" },
    { tag: "2027-05-01", name: "Tag der Arbeit" },
    { tag: "2027-05-06", name: "Christi Himmelfahrt" },
    { tag: "2027-05-17", name: "Pfingstmontag" },
    { tag: "2027-10-03", name: "Tag der Deutschen Einheit" },
  ],
  // Fronleichnam: Baden-Württemberg, Bayern, Hessen, Nordrhein-Westfalen,
  // Rheinland-Pfalz, Saarland.
  "06": [{ tag: "2027-05-27", name: "Fronleichnam" }],
  "07": [{ tag: "2027-05-27", name: "Fronleichnam" }],
  "10": [
    { tag: "2027-05-27", name: "Fronleichnam" },
    { tag: "2026-08-15", name: "Mariä Himmelfahrt" },
    { tag: "2027-08-15", name: "Mariä Himmelfahrt" },
  ],
  "08": [{ tag: "2027-05-27", name: "Fronleichnam" }],
  "09": [
    { tag: "2027-05-27", name: "Fronleichnam" },
    { tag: "2026-08-15", name: "Mariä Himmelfahrt" },
    { tag: "2027-08-15", name: "Mariä Himmelfahrt" },
  ],
  "05": [{ tag: "2027-05-27", name: "Fronleichnam" }],
};

export function feiertagAm(blAgs: string, iso: string): string | null {
  const bl = blAgs.slice(0, 2);
  const treffer =
    FEIERTAGE["*"].find((f) => f.tag === iso) ?? (FEIERTAGE[bl] ?? []).find((f) => f.tag === iso);
  return treffer?.name ?? null;
}

/** Ferien, in die ein Datum fällt — oder null. Beide Grenzen zählen mit. */
export function ferienAm(blAgs: string, iso: string): Ferienzeitraum | null {
  const liste = SCHULFERIEN[blAgs.slice(0, 2)];
  if (!liste) return null;
  return liste.find((f) => iso >= f.von && iso <= f.bis) ?? null;
}

export type Versandfenster =
  | { frei: true }
  | { frei: false; grund: string; wiederFrei: string | null };

/**
 * Darf an diesem Tag in dieses Bundesland gesendet werden?
 *
 * Drei Verweigerungsgründe, und der dritte ist der wichtigste: Läuft die
 * Tabelle aus, sagt sie nicht „keine Ferien", sondern „ich weiß es nicht".
 * Eine Ferientabelle, die still leer wird, ist gefährlicher als gar keine.
 */
export function versandfenster(blAgs: string, iso: string): Versandfenster {
  const bl = blAgs.slice(0, 2);
  if (!SCHULFERIEN[bl]) {
    return { frei: false, grund: `Bundesland ${bl} steht nicht in der Ferientabelle.`, wiederFrei: null };
  }
  if (iso > SCHULFERIEN_ABGEDECKT_BIS) {
    return {
      frei: false,
      grund: `Ferientermine sind nur bis ${SCHULFERIEN_ABGEDECKT_BIS} erfasst — neuen KMK-Kalender eintragen (${SCHULFERIEN_QUELLE.url}).`,
      wiederFrei: null,
    };
  }
  const f = ferienAm(bl, iso);
  if (f) {
    return { frei: false, grund: `Schulferien ${f.name} (${f.von} bis ${f.bis})`, wiederFrei: naechsterTag(f.bis) };
  }
  const feiertag = feiertagAm(bl, iso);
  if (feiertag) {
    return { frei: false, grund: `Feiertag: ${feiertag}`, wiederFrei: naechsterTag(iso) };
  }
  return { frei: true };
}

function naechsterTag(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
