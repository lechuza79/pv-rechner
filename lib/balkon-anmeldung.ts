// Anmeldung eines Steckersolargeräts im Marktstammdatenregister.
//
// EINE Quelle für die Ratgeber-Seite (/balkonkraftwerk/anmelden), ihren
// Fristen-Check und das FAQ. Die Rechtsaussagen selbst — Anmeldeweg, Frist,
// Ordnungswidrigkeit, Nullsteuersatz — stehen in BALKON_RECHT
// (lib/balkon-config.ts) und werden hier NICHT dupliziert; dieses Modul
// ergänzt nur, was zum Anmelden praktisch gebraucht wird.
//
// GEPRÜFT AM 16./17.08.2026 GEGEN PRIMÄRQUELLEN:
//   § 5 Abs. 1 S. 1 MaStRV   — Registrierungspflicht, Adressat ist der Betreiber
//   § 5 Abs. 5 S. 1 MaStRV   — Frist: ein Monat nach Inbetriebnahme
//   § 5 Abs. 2 Nr. 1 MaStRV  — Ausnahme nur für echten Inselbetrieb
//   § 2 Nr. 11 MaStRV        — bei Solaranlagen ist jedes Modul eine eigene Einheit
//   Anlage zu § 6 MaStRV     — Kategorie „SSA | Steckerfertige Solaranlage"
//   MaStR-Webhilfe (BNetzA)  — Definition der Inbetriebnahme, wörtlich unten
//   BNetzA-PM vom 28.03.2024 — Reduktion von rund 20 auf 5 Geräte-Angaben,
//                              Wegfall der Netzbetreiber-Meldung (Solarpaket I,
//                              in Kraft 16.05.2024)
//
// BEWUSST KEINE KLICK-ANLEITUNG. Die Bundesnetzagentur hat das Formular 2024
// umgebaut und wird es wieder tun. Deshalb beschreiben die Schritte unten, WAS
// zu tun ist und WORAN es hakt — nie Knopfnamen, Feldbezeichnungen oder
// Reihenfolgen im Formular. Ein Test verbietet solche Wörter, weil sie still
// veralten und niemandem auffallen (CLAUDE.md: keine tickenden Bomben).

/** Wie das Register die Geräte führt. Das Wort „Balkonkraftwerk" kommt dort
 *  nicht vor — der häufigste Grund, warum Leute im falschen Formular landen. */
export const MASTR_KATEGORIE = "Steckerfertige Solaranlage";

/** Was das Solarpaket I zum 16.05.2024 gestrichen hat. Als Satzbaustein, weil
 *  derselbe Halbsatz im FAQ und im Seitentext steht. */
export const SOLARPAKET_ENTFALLEN = "die Meldung beim Netzbetreiber";

/** Wörtliche Definition der Bundesnetzagentur. Als Zitat geführt: Jede
 *  Umschreibung wird sofort ungenau — „aufgebaut" oder „montiert" wäre schon
 *  falsch, es zählt das erste Einspeisen. */
export const INBETRIEBNAHME_DEFINITION =
  "der Zeitpunkt, zu dem die Anlage das erste Mal Wechselstrom in das Hausnetz einspeist";

/** Frist in Monaten nach Inbetriebnahme (§ 5 Abs. 5 S. 1 MaStRV). */
export const ANMELDE_FRIST_MONATE = 1;

export interface AnmeldeSchritt {
  titel: string;
  /** Was in diesem Schritt zu tun ist. */
  was: string;
  /** Die Stelle, an der es typischerweise hakt. */
  falle?: string;
}

/** Der Weg durch die Anmeldung — auf der Ebene „welche Information", nicht
 *  „welches Eingabefeld". Vier der fünf Schritte haben eine bekannte Falle. */
export const ANMELDE_SCHRITTE: AnmeldeSchritt[] = [
  {
    titel: "Benutzerkonto im Marktstammdatenregister anlegen",
    was: "Die Registrierung läuft nur online und nur über ein eigenes Konto. Es kostet nichts, und die Bestätigung kommt per E-Mail.",
    falle:
      "Das Konto gehört dem Betreiber, nicht dem Käufer. Wenn der Vermieter das Gerät bezahlt und du es betreibst, meldest du es an — nicht er.",
  },
  {
    titel: "Sich selbst als Marktakteur eintragen",
    was: "Vor der Anlage wird die Person erfasst, die sie betreibt: Name und Adresse, Rolle „Anlagenbetreiber“.",
    falle:
      "Hier steht als Auswahl auch „Anlagenbetreiber (Unternehmen)“. Für ein Balkongerät am eigenen Wohnhaus ist die natürliche Person richtig.",
  },
  {
    titel: "Die Anlage als steckerfertige Solaranlage anlegen",
    was: `Das Register führt die Geräte als „${MASTR_KATEGORIE}“. Diese Variante fragt nur wenige Angaben ab.`,
    falle:
      "Wer stattdessen eine normale Solaranlage anlegt, landet im langen Formular für Dachanlagen — mit Feldern, die es für ein Balkongerät gar nicht gibt.",
  },
  {
    titel: "Technische Angaben eintragen",
    was: "Gebraucht werden die Leistung der Module in Wattpeak, die Leistung des Wechselrichters in Watt, der Standort und die Nummer deines Stromzählers. Die Leistungen stehen auf den Typenschildern.",
    falle:
      "Modul- und Wechselrichterleistung sind zwei verschiedene Zahlen und dürfen auseinanderliegen: Module dürfen mehr leisten, als der Wechselrichter durchlässt. Bei den Modulen zählt die Summe, nicht ein einzelnes.",
  },
  {
    titel: "Inbetriebnahmedatum setzen und abschicken",
    was: `Gemeint ist ${INBETRIEBNAHME_DEFINITION} — also der Tag, an dem der Stecker das erste Mal in der Dose war.`,
    falle:
      "Nicht das Kauf- oder Lieferdatum. Wer das Bestelldatum einträgt, trägt ein falsches Datum ins Register und verschiebt sich die Frist selbst.",
  },
];

export interface FristStand {
  /** Letzter fristgerechter Tag als ISO-Tag (YYYY-MM-DD). */
  endeIso: string;
  /** Verbleibende volle Tage; negativ, wenn die Frist vorbei ist. */
  tageUebrig: number;
  /** true, sobald der Stichtag vorbei ist (am Stichtag selbst noch false). */
  ueberfaellig: boolean;
}

/** Kalendertag aus einem ISO-Tag, ohne Zeitzonen-Rutsch. */
function ausIso(iso: string): { j: number; m: number; t: number } {
  const [j, m, t] = iso.split("-").map(Number);
  return { j, m, t };
}

function alsIso(j: number, m: number, t: number): string {
  return `${j}-${String(m).padStart(2, "0")}-${String(t).padStart(2, "0")}`;
}

/** Tage im Monat (m = 1–12). */
function tageImMonat(j: number, m: number): number {
  return new Date(Date.UTC(j, m, 0)).getUTCDate();
}

/**
 * Stichtag und Restzeit aus dem Inbetriebnahmedatum.
 *
 * Rechnet KALENDARISCH (ein Monat später, gleicher Tag), nicht über 30 Tage:
 * § 5 Abs. 5 S. 1 MaStRV sagt „innerhalb eines Monats“, und ein Monat ist mal
 * 28, mal 31 Tage. Fällt der Tag im Zielmonat aus (31.01. → 31.02.), rutscht
 * der Stichtag auf den letzten Tag des Monats — dieselbe Auslegung wie bei
 * sonstigen Monatsfristen (§ 188 Abs. 3 BGB).
 *
 * Beide Daten kommen als ISO-Tag herein und werden über UTC-Mittag verglichen.
 * Das ist kein Detail: Mit lokalen Mitternachts-Daten verschiebt der
 * Sommerzeit-Wechsel das Ergebnis um einen Tag, und eine Frist, die einmal im
 * Jahr einen Tag falsch anzeigt, fällt niemandem auf.
 */
export function fristStand(inbetriebnahmeIso: string, heuteIso: string): FristStand {
  const { j, m, t } = ausIso(inbetriebnahmeIso);

  let zielJ = j;
  let zielM = m + ANMELDE_FRIST_MONATE;
  while (zielM > 12) {
    zielM -= 12;
    zielJ += 1;
  }
  const zielT = Math.min(t, tageImMonat(zielJ, zielM));
  const endeIso = alsIso(zielJ, zielM, zielT);

  const mittag = (iso: string) => {
    const p = ausIso(iso);
    return Date.UTC(p.j, p.m - 1, p.t, 12);
  };
  const tagMs = 24 * 60 * 60 * 1000;
  const tageUebrig = Math.round((mittag(endeIso) - mittag(heuteIso)) / tagMs);

  return { endeIso, tageUebrig, ueberfaellig: tageUebrig < 0 };
}
