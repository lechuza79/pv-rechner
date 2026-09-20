import type { AusgelesenesAngebot } from "./angebot-check";
import type { Gewerk } from "./angebot-gewerk";

// ─── Was wir aus einem geprüften Angebot behalten ─────────────────────────────
//
// Ziel ist eine Preisstatistik, die es sonst nirgends gibt: was Anlagen dieser
// Größe in echten Angeboten kosten, welche Geräte verbaut werden, was in den
// Angeboten drinsteht und was fehlt.
//
// WAS NIE HIER LANDET — und das ist die ganze Konstruktion:
//   · das Dokument selbst (es wird nach dem Auslesen verworfen),
//   · Name oder Anschrift des Nutzers,
//   · Name oder Anschrift des Handwerksbetriebs (der Meister gibt sie gar nicht
//     erst zurück, seine Anweisung untersagt es),
//   · der Wortlaut der Positionen (er kann eine Anschrift enthalten — behalten
//     wird nur die Kategorie),
//   · die Rückfragen und alles Freitextliche.
//
// Und drei Vergröberungen, die aus einer Zeile eine Statistikzeile machen:
// Region statt Postleitzahl, Monat statt Datum, gerundete Beträge. Einzeln
// könnte jede davon reichen; zusammen bleibt nichts, was auf einen Haushalt
// zurückführt.
//
// WAS DIESE SAMMLUNG NICHT KANN, solange die Anweisung den Betriebsnamen
// verbietet: doppelte Angebote desselben Betriebs erkennen. Für eine
// Veröffentlichung wäre das nötig — sonst kann ein Betrieb, dessen Kunden
// häufiger hier landen, eine Zelle allein füllen. Offene Entscheidung; sie
// verlangt einen Einweg-Fingerabdruck des Namens und damit eine Änderung an der
// Anweisung des Meisters.
//
// RECHTLICHER STAND: Mit dieser Sammlung ist der Datenbestand ein zweiter Zweck.
// Damit wird aus dem kostenlosen Werkzeug ein Verbrauchervertrag über ein
// digitales Produkt — Fernabsatz-Informationen und Widerrufsbelehrung kommen
// hinzu, und der Zweck gehört in die Datenschutzerklärung, bevor das hier
// scharfgeschaltet wird.

// Der Name steht hier und nicht im Datenbank-Modul, weil das `server-only` lädt
// — dieselbe Trennung wie beim Geräte-Katalog: das Bauen der Zeile ist rein und
// ohne Netz prüfbar, nur das Ablegen braucht den Server.
export const SAMMLUNG_TABELLE = "angebots_befunde";

/** Eine Zeile der Sammlung. Bewusst flach — es ist eine Statistiktabelle. */
export interface SammlungsZeile {
  gewerk: string;
  /** Herstellerbezeichnung, so wie sie im Angebot stand. */
  geraet: string | null;
  marke: string | null;
  /** Anlagengröße in der Einheit des Gewerks. */
  groesse: number | null;
  /** Gesamtpreis brutto, auf 100 € gerundet. */
  gesamtpreis: number | null;
  /** Spezifische Kosten je Einheit, auf 10 € gerundet. */
  spez_kosten: number | null;
  /** Kategorien mit eigenem Preis. */
  positionen_mit_preis: string[];
  /** Kategorien, die im Preis stecken, aber keinen eigenen Betrag tragen. */
  positionen_gebuendelt: string[];
  /** Kategorien, die gar nicht auftauchen. */
  positionen_fehlend: string[];
  /** Einzelpreise je Kategorie, gerundet — der eigentliche Schatz. */
  betraege: Record<string, number>;
  /** Zweistelliger Regionalschlüssel des Bundeslands, nie die Postleitzahl. */
  region: string | null;
  /** Monat der Prüfung, nie der Tag. */
  monat: string;
}

const runde = (n: number, auf: number) => Math.round(n / auf) * auf;

/**
 * Baut die Statistikzeile. Rein und ohne Datenbank, damit prüfbar ist, dass
 * wirklich nichts Persönliches durchrutscht — der Test dazu ist die eigentliche
 * Absicherung, nicht der Kommentar oben.
 *
 * `monat` wird hereingereicht und nicht hier gelesen: dieselbe Regel wie beim
 * Förder-Verlauf — eine Funktion, die selbst auf die Uhr sieht, ist nicht
 * prüfbar.
 */
export function zuSammlungsZeile(
  angebot: AusgelesenesAngebot,
  gewerk: Gewerk,
  monat: string,
  region: string | null,
): SammlungsZeile {
  const mitPreis: string[] = [];
  const gebuendelt = new Set<string>();
  const betraege: Record<string, number> = {};

  for (const p of angebot.positionen) {
    if (p.id) {
      if (p.betragEur != null) {
        mitPreis.push(p.id);
        betraege[p.id] = runde(p.betragEur, 10);
      } else {
        gebuendelt.add(p.id);
      }
    }
    for (const z of p.enthaeltAuch) gebuendelt.add(z);
  }

  const gesehen = new Set([...mitPreis, ...gebuendelt]);
  const fehlend = gewerk.positionen.map((p) => p.id).filter((id) => !gesehen.has(id));

  const gesamtpreis = angebot.gesamtpreisEur != null ? runde(angebot.gesamtpreisEur, 100) : null;
  const spez = angebot.gesamtpreisEur != null && angebot.leistungKw
    ? runde(angebot.gesamtpreisEur / angebot.leistungKw, 10)
    : null;

  return {
    gewerk: gewerk.id,
    geraet: angebot.geraet,
    marke: angebot.marke,
    groesse: angebot.leistungKw,
    gesamtpreis,
    spez_kosten: spez,
    positionen_mit_preis: mitPreis,
    positionen_gebuendelt: [...gebuendelt].filter((id) => !mitPreis.includes(id)),
    positionen_fehlend: fehlend,
    betraege,
    region,
    monat,
  };
}
