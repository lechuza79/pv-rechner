import { ABSCHLIESSENDE_ERGEBNISSE } from "./funding-source-review";

/**
 * Alte Freitext-Urteile in ein abschließendes Ergebnis umdeuten.
 *
 * WARUM (20.09.2026): Eine Quellzeile verlässt den Vorrat nur, wenn ihr
 * Ergebnis eines der acht abschließenden Wörter ist. Seit dem 20.09. weist das
 * Abhak-Werkzeug alles andere ab — der ALTBESTAND blieb davon unberührt:
 * 408 gelesene Zeilen tragen ein Freitext-Urteil und liegen deshalb weiter im
 * Vorrat, ununterscheidbar von nie geöffneten.
 *
 * DIE ZUORDNUNG IST EINE EXAKTE TABELLE, KEIN MUSTER — BLOCKER.
 * Ein Muster über Wörter wie „ausgelaufen" oder „verworfen" trifft Notizen,
 * die es noch nicht gibt, und deutet damit ein fremdes Urteil um, das niemand
 * gelesen hat. Jede Zeile hier stand am 20.09.2026 wörtlich in der Datenbank
 * und wurde einzeln entschieden; was nicht exakt passt, bleibt liegen und
 * kommt in die Hand-Liste.
 *
 * DER WORTLAUT WIRD NIE VERLOREN. Er ist die BEGRÜNDUNG, das neue Wort nur das
 * Urteil — deshalb wandert das alte Ergebnis in die Notiz, bevor es
 * überschrieben wird.
 *
 * NICHT HIER, MIT ABSICHT: die 141 Zeilen, deren Urteil „Adresse entfernt
 * (404/410)" lautet. Das ist eine MESSUNG von damals, keine Aussage über heute
 * — am 20.09.2026 antworteten 104 von 225 als unerreichbar geführten Zeilen
 * (46 %) mit HTTP 200. Sie gehören über den bestehenden Weg `--gelesen … --tot`,
 * der im selben Augenblick misst, nicht über eine Umdeutung.
 *
 * EBENFALLS NICHT HIER: `klaerung` (132), `Fachlich geprüft: blocked` (10) und
 * `unklar` (6). Sie sagen ausdrücklich, dass nichts entschieden ist — sie
 * abzuhaken wäre genau der Fehler, gegen den die Sperre steht, nur andersherum.
 */

export type AltUrteil = { ergebnis: string | null; notiz: string | null };

/** Urteile, die für sich allein eindeutig sind — die Notiz spielt keine Rolle. */
const NACH_ERGEBNIS: Record<string, string> = {
  "keine kommunale solarfoerderung": "keine-foerderung",
  "quelle gehoert einer anderen gemeinde": "keine-foerderung",
  "beendet – gemeinde hat die pv-förderung zum 31.01.2024 nicht verlängert": "ausgelaufen",
  "programm gefunden, ausgelaufen 31.12.2023": "ausgelaufen",
};

/**
 * „verworfen" allein trägt KEIN Urteil — die Notiz trägt es, und sie meint
 * Verschiedenes. Von den 69 Zeilen bedeuten 16 „es gab eine Förderung, sie ist
 * beendet" und 53 „für diese Gemeinde gibt es hier keine". Alle über einen Kamm
 * auf `keine-foerderung` zu schieben — so stand es im Übergabezettel — hätte
 * beendete Programme als „nie dagewesen" ausgewiesen; für die Frage, wie sich
 * der Zubau vor und nach einer Förderung entwickelt, ist gerade das der
 * interessante Fall.
 */
const NACH_NOTIZ: Record<string, string> = {
  "programm gehört der gemeinde berkenthin, nicht diesen orten des amtes": "keine-foerderung",
  "kreisprogramm bernkastel-wittlich, unter dem kreisschlüssel geführt": "keine-foerderung",
  "kreisprogramm trier-saarburg, unter dem kreisschlüssel geführt": "keine-foerderung",
  "programm gehört der ortsgemeinde windhagen, nicht buchholz": "keine-foerderung",
  "klimaschutzfonds nimmt steckersolar ausdrücklich aus": "keine-foerderung",
  "kein kommunales programm, nur hinweis auf ein landesprogramm": "keine-foerderung",
  "gemeinde hat das programm am 04.05.2026 eingestellt": "ausgelaufen",
  "programm zum 31.12.2024 abgelaufen, programmseite entfernt": "ausgelaufen",
  "balkon-förderung 2025 ausgelaufen, kein nachfolger": "ausgelaufen",
  // Führt mit „nur für Vereine", und das ist die Aussage, die unsere Frage
  // beantwortet: für einen privaten Haushalt gab es hier nie etwas. Dass es
  // zusätzlich ausgelaufen ist, steht weiter in der Notiz.
  "programm nur für vereine, zum 31.12.2025 ausgelaufen": "keine-foerderung",
};

/** Das einzige Urteil, das eine AUFNAHME meint: Fritzlar, inzwischen im Katalog. */
const FRITZLAR_URTEIL =
  "programm gelesen: balkonkraftwerk mit speicher, 100 eur je wohneinheit, laufzeit 2026-2027, " +
  "hauptwohnsitz fritzlar. aufnahme im naechsten lauf - die foerderrichtlinie haengt an javascript " +
  "und braucht einen echten browser.";

function schluessel(text: string | null | undefined): string {
  return (text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Liefert das abschließende Ergebnis für ein altes Freitext-Urteil, oder null,
 * wenn keine Regel exakt passt. Bereits abschließende Urteile ergeben ebenfalls
 * null — hier wird nichts angefasst, was den Vorrat schon verlässt.
 */
export function abschliessendesErgebnis(urteil: AltUrteil): string | null {
  const ergebnis = schluessel(urteil.ergebnis);
  if (!ergebnis) return null;
  if (ABSCHLIESSENDE_ERGEBNISSE.has(ergebnis)) return null;
  if (ergebnis === FRITZLAR_URTEIL) return "aufgenommen";
  const direkt = NACH_ERGEBNIS[ergebnis];
  if (direkt) return direkt;
  if (ergebnis === "verworfen") return NACH_NOTIZ[schluessel(urteil.notiz)] ?? null;
  return null;
}

/**
 * Rettet den ursprünglichen Wortlaut in die Notiz. Eine Notiz im JSON-Format
 * behält ihre Struktur — `pendingFundingSources` liest daraus `reviewed_at`,
 * und wer sie in Fließtext verwandelt, ändert still das Wiederaufmach-Verhalten
 * der Zeile.
 */
export function notizMitHerkunft(notiz: string | null, altesErgebnis: string): string {
  const vermerk = `vorheriges Ergebnis: ${altesErgebnis.trim()}`;
  if (notiz) {
    try {
      const geparst = JSON.parse(notiz);
      if (geparst && typeof geparst === "object" && !Array.isArray(geparst)) {
        return JSON.stringify({ ...geparst, vorheriges_ergebnis: altesErgebnis.trim() });
      }
    } catch {
      /* Fließtext-Notiz. */
    }
    return `${notiz} [${vermerk}]`;
  }
  return `[${vermerk}]`;
}
