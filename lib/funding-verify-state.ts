// ─── Prüfstand je Förderprogramm: was wurde wirklich an der Amtsquelle gelesen ──
//
// WARUM ES DIESE DATEI GIBT (16.08.2026): Der Förder-Wächter trug im Auftrag den
// Satz „merke dir, welche Programme du nur sekundär belegen konntest, und arbeite
// sie in den Folgeläufen per Browser ab". Das konnte er nie: Jeder Lauf ist eine
// frische Sitzung ohne Gedächtnis. Es gab keinen Ort, an dem „hier bin ich nicht
// rangekommen" steht — also fiel jeder geblockte Träger stillschweigend hinten
// runter, und das Datum „Zuletzt geprüft" alterte auf der Seite vor sich hin,
// ohne dass irgendetwas anschlug.
//
// Die Tabelle dafür gab es seit Juli (`funding_checks`, angelegt in
// /api/funding/setup) — sie wurde nur von niemandem beschrieben und von niemandem
// gelesen. Dieses Modul ist die Leseseite: aus den protokollierten Versuchen wird
// der Arbeitsvorrat für den nächsten Lauf.
//
// DIE ZENTRALE UNTERSCHEIDUNG: Ein Versuch endet in genau einem von fünf
// Zuständen, und **nur „traeger" zählt als geprüft**. Gemessen am 16.08.2026 an
// frankfurt.de: Der direkte Abruf liefert 403, der skriptgesteuerte Browser
// landet auf der Cloudflare-Prüfseite (unsichtbar UND sichtbar gestartet), der
// echte Browser kam eine Stunde später ohne jede Prüfung durch. Es ist also keine
// Mauer, sondern eine Laune — ein einzelner Versuch ist Glückssache, über viele
// Läufe kommt man durch. Was fehlte, war das Buchführen.
//
// Das Archiv (web.archive.org) belegt den INHALT, nicht die AKTUALITÄT. Eine
// Förderung, die im Juli lief, kann im September gestoppt sein. Deshalb setzt ein
// Archiv-Treffer die Uhr NICHT zurück — er ist Beleg für die Werte und ein
// besserer Notnagel als jedes Vergleichsportal, aber kein Prüfdatum.

import type { FundingProgram } from "./funding-programs";

/** Wie weit ein Prüfversuch gekommen ist. Nur `traeger` zählt als geprüft. */
export type Erreichbarkeit =
  /** Amtsseite des Trägers selbst gelesen (Abruf, PDF oder echter Browser). */
  | "traeger"
  /** Nur das Archiv der Amtsseite — belegt den Inhalt, nicht die Aktualität. */
  | "archiv"
  /** Nur Dritte (Portale, Presse). Für „geprüft" nie ausreichend. */
  | "sekundaer"
  /** Auf einer Bot-Prüfseite hängengeblieben (Cloudflare o. ä.). */
  | "pruefseite"
  /** Hart gesperrt: 403/404 auf allen Wegen, auch im echten Browser. */
  | "gesperrt";

export type PruefVersuch = {
  programId: string;
  /** ISO-Datum oder Zeitstempel des Versuchs. */
  checkedAt: string;
  erreichbarkeit: Erreichbarkeit;
};

/**
 * Nach so vielen Tagen ohne Blick auf die Amtsquelle gilt ein Programm als
 * fällig. Der Quartals-Voll-Lauf fährt alle 90 Tage; wer danach noch offen ist,
 * ist durchs Raster gefallen.
 */
export const PRUEF_INTERVALL_TAGE = 90;

/**
 * So viele Läufe in Folge dürfen die Amtsquelle verfehlen, bevor das Programm in
 * die sichere Richtung fällt. Drei, nicht einer: Die Prüfseite ist eine Laune,
 * kein Zustand — beim ersten Fehlversuch abzuschalten würde Förderungen
 * wegnehmen, die es gibt.
 */
export const ESKALATION_AB_FEHLVERSUCHEN = 3;

/** Nur der direkte Blick auf die Amtsseite setzt das Prüfdatum. */
export function zaehltAlsGeprueft(e: Erreichbarkeit): boolean {
  return e === "traeger";
}

function tageZwischen(vonIso: string, bisIso: string): number {
  const von = Date.parse(vonIso.slice(0, 10));
  const bis = Date.parse(bisIso.slice(0, 10));
  if (Number.isNaN(von) || Number.isNaN(bis)) return Number.POSITIVE_INFINITY;
  return Math.round((bis - von) / 86_400_000);
}

export type Pruefstand = {
  programId: string;
  /** ISO-Datum des letzten Blicks auf die Amtsquelle; null = noch nie. */
  letzteQuellenpruefung: string | null;
  /** Tage seit diesem Blick; Infinity, wenn es ihn nie gab. */
  tageSeitQuellenpruefung: number;
  /** Versuche seit dem letzten Erfolg, die die Amtsquelle NICHT erreicht haben. */
  fehlversuche: number;
  /** Liegt ein Archiv-Beleg vor, seit die Amtsquelle nicht mehr erreichbar ist? */
  archivBeleg: boolean;
  /** Überfällig — gehört in den Arbeitsvorrat. */
  faellig: boolean;
  /** Genug Fehlversuche für den Fall in die sichere Richtung. */
  eskalation: boolean;
};

/**
 * Zustand eines einzelnen Programms aus seinen protokollierten Versuchen.
 *
 * `lastVerified` aus der Datenbank zählt als Erfolg mit — die Reihe der Versuche
 * beginnt erst mit diesem Mechanismus, die Prüfdaten davor sind echt und dürfen
 * nicht schlagartig alle als „nie geprüft" gelten.
 */
export function pruefstandFuer(
  program: Pick<FundingProgram, "id" | "lastVerified">,
  versuche: PruefVersuch[],
  heuteIso: string,
): Pruefstand {
  const eigene = versuche
    .filter((v) => v.programId === program.id)
    .slice()
    .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));

  const letzterErfolg = [...eigene].reverse().find((v) => zaehltAlsGeprueft(v.erreichbarkeit));
  const letzteQuellenpruefung = letzterErfolg?.checkedAt.slice(0, 10) ?? program.lastVerified ?? null;

  const seitErfolg = letzterErfolg
    ? eigene.slice(eigene.indexOf(letzterErfolg) + 1)
    : eigene;

  const fehlversuche = seitErfolg.filter((v) => !zaehltAlsGeprueft(v.erreichbarkeit)).length;
  const archivBeleg = seitErfolg.some((v) => v.erreichbarkeit === "archiv");

  const tageSeitQuellenpruefung = letzteQuellenpruefung
    ? tageZwischen(letzteQuellenpruefung, heuteIso)
    : Number.POSITIVE_INFINITY;

  return {
    programId: program.id,
    letzteQuellenpruefung,
    tageSeitQuellenpruefung,
    fehlversuche,
    archivBeleg,
    faellig: tageSeitQuellenpruefung >= PRUEF_INTERVALL_TAGE,
    eskalation: fehlversuche >= ESKALATION_AB_FEHLVERSUCHEN,
  };
}

/**
 * Der Arbeitsvorrat für den nächsten Lauf — das, was die Anweisung „merk dir das"
 * ersetzt.
 *
 * Reihenfolge: erst die, an denen wir hängen (Fehlversuche, absteigend), dann die
 * ältesten. Bundesprogramme bleiben außen vor, die prüft der BEG-Wächter.
 * **Wer am längsten nicht an der Amtsquelle war, kommt zuerst dran — nicht
 * zuletzt.** Genau andersherum lief es vorher: Der Lauf arbeitete die Liste von
 * oben ab und die Dauerblockierer standen immer hinten.
 */
export function arbeitsvorrat(
  programs: Pick<FundingProgram, "id" | "level" | "lastVerified">[],
  versuche: PruefVersuch[],
  heuteIso: string,
): Pruefstand[] {
  return programs
    .filter((p) => p.level !== "bund")
    .map((p) => pruefstandFuer(p, versuche, heuteIso))
    .filter((s) => s.faellig || s.fehlversuche > 0)
    .sort(
      (a, b) =>
        b.fehlversuche - a.fehlversuche ||
        b.tageSeitQuellenpruefung - a.tageSeitQuellenpruefung ||
        a.programId.localeCompare(b.programId),
    );
}

/**
 * Was der Wächter mit einem eskalierten Programm tut.
 *
 * Sichere Richtung heißt hier: `unsicher`. Nur `status: "aktiv"` wird in der
 * Berechnung abgezogen — ein Programm auf `unsicher` verschwindet also aus der
 * Rechnung, bleibt aber mit Hinweis sichtbar. Lieber rechnet jemand ohne eine
 * Förderung, die es vielleicht doch noch gibt, als mit einer, die es nicht mehr
 * gibt: Der erste Fall kostet eine angenehme Überraschung, der zweite kostet
 * Vertrauen (siehe CLAUDE.md, „Zahlen und Einheiten").
 *
 * Abschalten darf der Wächter selbst (Befugnis „sichere Richtung", Wächter-Gate
 * Teil 3) — wieder einschalten nie. Deshalb gehört zu jeder Eskalation eine
 * Entscheidungszeile an den Betreiber.
 */
export function eskalationsVorschlag(
  program: Pick<FundingProgram, "id" | "name" | "region" | "status">,
  stand: Pruefstand,
): { statusNeu: "unsicher"; entscheidung: string } | null {
  if (!stand.eskalation || program.status !== "aktiv") return null;

  const seit = stand.letzteQuellenpruefung
    ? `zuletzt belegt am ${stand.letzteQuellenpruefung}`
    : "nie an der Amtsquelle belegt";
  const archiv = stand.archivBeleg
    ? " Ein Archiv-Stand der Amtsseite liegt vor, er belegt aber nur den Inhalt von damals, nicht dass die Förderung heute noch läuft."
    : "";

  return {
    statusNeu: "unsicher",
    entscheidung:
      `${program.name} (${program.region}) ist in ${stand.fehlversuche} Läufen nicht an der ` +
      `Amtsquelle prüfbar gewesen, ${seit}. Ich habe die Förderung aus der Berechnung genommen ` +
      `(Status „unsicher"), sie bleibt mit Hinweis sichtbar.${archiv} ` +
      `Soll ich bei der Stelle nachfragen — Anfrage von mir vorbereitet, abgeschickt von dir?`,
  };
}
