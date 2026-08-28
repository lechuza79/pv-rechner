// ─── Der Meister-Agent: ein Angebot lesen ─────────────────────────────────────
//
// Liest ein hochgeladenes Wärmepumpen-Angebot und gibt zurück, was drinsteht —
// mehr nicht. Die URTEILE fällt angebot-check.ts, ohne Modell und ohne Netz.
// Diese Trennung ist der Kern: Ein Modell, das gleichzeitig liest und bewertet,
// bewertet auch dann, wenn es schlecht gelesen hat.
//
// PROVIDER-GRENZE: `LeseDienst` ist die einzige Stelle, an der ein Modell
// aufgerufen wird. Gemessen am 27.08.2026: Anthropic bietet KEINE EU-Region an
// (`inference_geo` kennt nur "us" und "global", Speicherort ausschließlich USA).
// Ein Aufruf direkt gegen die Anthropic-API ist damit eine Drittlandübermittlung
// und braucht Standardvertragsklauseln plus eigene Risikoprüfung; ein Claude über
// Amazon in Frankfurt oder Google in Europa vermeidet sie. Beides ist eine
// Vertragsentscheidung des Betreibers — deshalb ist der Dienst hier ein Parameter
// und keine feste Verdrahtung.

import type { AusgelesenesAngebot } from "./angebot-check";
import { ANGEBOTS_POSITIONEN } from "./angebot-check-config";

/** Was der Meister zurückgibt, bevor irgendetwas bewertet wird. */
export type LeseErgebnis =
  | { art: "kein-angebot"; grund: string }
  | { art: "unlesbar"; grund: string }
  | { art: "gelesen"; angebot: AusgelesenesAngebot };

/**
 * Der Modellaufruf. Bekommt das Dokument und die Anweisung, gibt rohen Text
 * zurück. Bewusst so schmal, dass ein Anbieterwechsel diese eine Funktion trifft.
 */
export interface LeseDienst {
  (anweisung: string, dokument: { mediaType: string; base64: string }): Promise<string>;
}

/**
 * Die Anweisung an den Meister.
 *
 * Sie steht als Funktion und nicht als Textkonstante, weil die Positionsliste aus
 * der Referenz kommt — sonst stünden die neun Kategorien ein zweites Mal getippt
 * da und liefen beim nächsten Jahrgang auseinander.
 */
export function meisterAnweisung(): string {
  const kategorien = ANGEBOTS_POSITIONEN.map((p) => `  - ${p.id}: ${p.name}`).join("\n");
  return `Du bist ein erfahrener Heizungsbaumeister und liest ein Angebot für eine Wärmepumpe.

DEINE AUFGABE IST LESEN, NICHT BEWERTEN. Du sagst, was im Dokument steht. Ob der
Preis angemessen und die Anlage richtig dimensioniert ist, entscheidet jemand
anderes. Schreibe kein Urteil und keine Empfehlung.

ERSTER SCHRITT: Ist das überhaupt ein Angebot für eine Heizung oder Wärmepumpe?
Wenn nicht — eine Rechnung, ein Kontoauszug, ein Lohnzettel, ein Datenblatt ohne
Preise, irgendetwas anderes — brich sofort ab und gib zurück:
{"art":"kein-angebot","grund":"<ein Satz, was es stattdessen ist>"}

Wenn das Dokument ein Angebot ist, aber unlesbar (zu schlechter Scan, fehlende
Seiten):
{"art":"unlesbar","grund":"<ein Satz>"}

Sonst gib genau dieses JSON zurück, ohne Text davor oder danach:

{
  "art": "gelesen",
  "angebot": {
    "geraet": "<Herstellerbezeichnung wörtlich, oder null>",
    "marke": "<Hersteller, oder null>",
    "leistungKw": <Heizleistung in kW als Zahl, oder null>,
    "gesamtpreisEur": <Gesamtpreis brutto in Euro als Zahl, oder null>,
    "positionen": [
      {
        "id": "<Kategorie von unten, oder null>",
        "wortlaut": "<die Zeile, wie sie im Angebot steht>",
        "betragEur": <Einzelpreis brutto, oder null>,
        "enthaeltAuch": ["<weitere Kategorien, die in dieser Position stecken>"]
      }
    ],
    "unsicher": ["<was du nicht sicher lesen konntest>"]
  }
}

KATEGORIEN:
${kategorien}

REGELN, die alle gleich wichtig sind:

1. ERFINDE KEINE ZAHL. Steht ein Preis nicht da, ist er null. Rechne nichts aus,
   schätze nichts, leite nichts aus einem Datenblatt ab. Eine fehlende Zahl ist
   ein brauchbares Ergebnis, eine erfundene ist der schwerste Fehler.

2. "enthaeltAuch" IST DER WICHTIGSTE TEIL. Steht da "Wärmepumpe inkl.
   Hydraulikmodul, Regelung und Inbetriebnahme — 14.200 €", dann ist das eine
   Geräteposition, die noch anderes enthält. Ohne diese Angabe hält jemand den
   Betrag später für einen reinen Gerätepreis und vergleicht ihn mit einem
   Onlinepreis. Im Zweifel lieber eine Kategorie zu viel eintragen.

3. NENNE, WAS DU NICHT SICHER WEISST, in "unsicher" — im Klartext, ganze Sätze,
   für einen Laien verständlich. Beispiele: "Die Leistung steht nur im Gerätenamen,
   nicht als eigene Angabe", "Auf Seite 3 ist der Scan an der Preisspalte
   abgeschnitten", "Unklar, ob die 2.400 € für den Pufferspeicher brutto oder
   netto sind". Eine leere Liste behauptet, du hättest alles zweifelsfrei gelesen.

4. BRUTTO ODER NETTO: Trage Bruttobeträge ein. Sind im Angebot Nettopreise
   ausgewiesen, rechne mit dem im Dokument genannten Steuersatz um und schreibe
   das in "unsicher". Findest du keinen Steuersatz, trage null ein.

5. SCHREIBE NICHTS ÜBER DEN BETRIEB. Kein Name, keine Anschrift, keine Bewertung
   seiner Arbeit — weder in "unsicher" noch sonstwo. Du liest ein Dokument, du
   beurteilst kein Unternehmen.

6. PERSONENDATEN GEHÖREN NICHT IN DIE ANTWORT. Weder Name noch Anschrift des
   Empfängers, auch nicht als Beispiel oder Beleg.`;
}

/** Zieht das JSON aus der Antwort, auch wenn ein Modell es in einen Codeblock packt. */
function jsonAusAntwort(roh: string): unknown {
  const ohneZaun = roh.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = ohneZaun.indexOf("{");
  const ende = ohneZaun.lastIndexOf("}");
  if (start < 0 || ende <= start) throw new Error("keine JSON-Antwort");
  return JSON.parse(ohneZaun.slice(start, ende + 1));
}

const zahlOderNull = (w: unknown): number | null =>
  typeof w === "number" && Number.isFinite(w) ? w : null;
const textOderNull = (w: unknown): string | null =>
  typeof w === "string" && w.trim() ? w.trim() : null;

/**
 * Prüft und säubert, was das Modell zurückgegeben hat.
 *
 * Ein Modell darf sich in der Form irren; alles, was danach kommt, darf sich auf
 * die Form verlassen. Unbekannte Kategorie-Schlüssel werden auf null gesetzt statt
 * durchgereicht — sonst erfindet ein Modell eine zehnte Kategorie, und die
 * Vollständigkeitsprüfung zählt gegen eine Liste, die es nicht gibt.
 */
export function leseErgebnisAus(roh: string): LeseErgebnis {
  const daten = jsonAusAntwort(roh) as Record<string, unknown>;
  const art = daten.art;

  if (art === "kein-angebot" || art === "unlesbar") {
    return { art, grund: textOderNull(daten.grund) ?? "ohne Angabe" };
  }
  if (art !== "gelesen" || typeof daten.angebot !== "object" || daten.angebot === null) {
    throw new Error("unerwartete Antwortform");
  }

  const bekannt = new Set(ANGEBOTS_POSITIONEN.map((p) => p.id));
  const a = daten.angebot as Record<string, unknown>;
  const rohPositionen = Array.isArray(a.positionen) ? a.positionen : [];

  const angebot: AusgelesenesAngebot = {
    geraet: textOderNull(a.geraet),
    marke: textOderNull(a.marke),
    leistungKw: zahlOderNull(a.leistungKw),
    gesamtpreisEur: zahlOderNull(a.gesamtpreisEur),
    positionen: rohPositionen.map((p) => {
      const q = (p ?? {}) as Record<string, unknown>;
      const id = textOderNull(q.id);
      return {
        id: id && bekannt.has(id) ? id : null,
        wortlaut: textOderNull(q.wortlaut) ?? "",
        betragEur: zahlOderNull(q.betragEur),
        enthaeltAuch: (Array.isArray(q.enthaeltAuch) ? q.enthaeltAuch : [])
          .map(textOderNull)
          .filter((s): s is string => !!s && bekannt.has(s)),
      };
    }),
    unsicher: (Array.isArray(a.unsicher) ? a.unsicher : [])
      .map(textOderNull)
      .filter((s): s is string => !!s),
  };

  return { art: "gelesen", angebot };
}

/** Ein Angebot lesen lassen. Der Dienst wird hereingereicht, nie hier gewählt. */
export async function leseAngebot(
  dienst: LeseDienst,
  dokument: { mediaType: string; base64: string },
): Promise<LeseErgebnis> {
  return leseErgebnisAus(await dienst(meisterAnweisung(), dokument));
}
