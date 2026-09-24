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
import { WAERMEPUMPE, type Gewerk } from "./angebot-gewerk";

/** Was der Meister zurückgibt, bevor irgendetwas bewertet wird. */
export type LeseErgebnis =
  | { art: "kein-angebot"; grund: string }
  | { art: "unlesbar"; grund: string }
  | { art: "gelesen"; angebot: AusgelesenesAngebot };

/**
 * Der Modellaufruf. Bekommt das Dokument und die Anweisung, gibt rohen Text
 * zurück. Bewusst so schmal, dass ein Anbieterwechsel diese eine Funktion trifft.
 */
export interface Dokument {
  mediaType: string;
  base64: string;
}

export interface LeseDienst {
  /**
   * Bekommt ALLE Seiten auf einmal, nicht eine nach der anderen. Ein Angebot
   * besteht regelmäßig aus vier bis acht abfotografierten Seiten, und die
   * teuersten Befunde stehen zwischen ihnen: eine Position auf Seite 2, deren
   * Einschränkung im Kleingedruckten auf Seite 4 steht. Wer Seite für Seite
   * liest, findet sie nicht.
   */
  (anweisung: string, dokumente: Dokument[]): Promise<string>;
}

/**
 * Die Anweisung an den Meister.
 *
 * Sie steht als Funktion und nicht als Textkonstante, weil die Positionsliste aus
 * der Referenz kommt — sonst stünden die neun Kategorien ein zweites Mal getippt
 * da und liefen beim nächsten Jahrgang auseinander.
 */
export function meisterAnweisung(gewerk: Gewerk = WAERMEPUMPE): string {
  const kategorien = gewerk.positionen.map((p) => `  - ${p.id}: ${p.name}`).join("\n");
  return `Du bist ein ${gewerk.rolle} und liest ein Angebot für eine ${gewerk.name}.

DEINE AUFGABE IST LESEN, NICHT BEWERTEN. Du sagst, was im Dokument steht. Ob der
Preis angemessen und die Anlage richtig dimensioniert ist, entscheidet jemand
anderes. Schreibe kein Urteil und keine Empfehlung.

Du bekommst unter Umständen MEHRERE SEITEN — abfotografiert oder gescannt, in
beliebiger Reihenfolge. Behandle sie als EIN Dokument: Positionen, Summen und
Einschränkungen gehören zusammen, auch wenn sie auf verschiedenen Seiten stehen.
Widersprechen sich zwei Seiten, gehört das in "unsicher".

ERSTER SCHRITT: Ist das überhaupt ein Angebot für dieses Gewerk (${gewerk.name})?
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
    "leistungKw": <Anlagengröße in ${gewerk.einheit} als Zahl, oder null>,
    "gesamtpreisEur": <Gesamtpreis brutto in Euro als Zahl, oder null>,
    "positionen": [
      {
        "id": "<Kategorie von unten, oder null>",
        "wortlaut": "<die Zeile, wie sie im Angebot steht>",
        "betragEur": <Einzelpreis brutto, oder null>,
        "enthaeltAuch": ["<weitere Kategorien, die in dieser Position stecken>"]
      }
    ],
    "rueckfragen": [
      {
        "text": "<eine konkrete Frage an den Heizungsbauer, für DIESES Angebot>",
        "bezug": "<Kategorie von unten, oder null>"
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
   Empfängers, auch nicht als Beispiel oder Beleg.

7. DIE RÜCKFRAGEN SIND DIE EIGENTLICHE LEISTUNG. Formuliere sie für DIESES
   Angebot, nicht als allgemeine Ratschläge. Was zu fragen ist, lässt sich nicht
   vorwegnehmen — schreib auf, was dir beim Lesen wirklich aufgefallen ist.
   Ein Beispiel für die Sorte Fund, die zählt: Eine Überschrift „Hydraulischer
   Abgleich — für die Förderung Pflicht", unter der alle Posten als Alternative
   oder mit 0,00 € ausgewiesen sind. Das steht in keiner Kategorienliste.

   Vier Regeln dafür, und die erste ist die wichtigste:

   a) KEINE ZAHL IN EINER RÜCKFRAGE. Kein Euro-Betrag, kein Prozentsatz, keine
      Häufigkeit. Was eine fehlende Position üblicherweise kostet und wie oft sie
      fehlt, wird nachher aus einer geprüften Quelle angehängt. Schreibst du
      selbst eine Zahl hin, steht dort ein Wert, den niemand belegt hat.

   b) FRAG NACH DEM DOKUMENT, NICHT ÜBER DEN BETRIEB. „Frag nach, ob der Umbau
      des Zählerschranks enthalten ist" ist richtig. „Dein Heizungsbauer
      verschweigt Kosten" ist falsch — auch dann, wenn es sich aufdrängt.

   c) EINE FRAGE, EINE SACHE. Formuliere so, dass der Nutzer sie wörtlich stellen
      kann. Keine Aufzählung in einem Satz.

   d) HÖCHSTENS SECHS, DIE WICHTIGSTE ZUERST. An einem echten Angebot lassen
      sich fünfzehn Fragen finden; eine Liste dieser Länge stellt niemand.
      Wichtig ist, was Geld kostet oder die Förderung gefährdet — nicht, was
      bloß auffällt. Was du weglässt, ist Teil der Leistung.

   e) NICHTS ZU FRAGEN IST EIN ERGEBNIS. Ist das Angebot vollständig und
      schlüssig, gib eine leere Liste zurück. Erfinde keine Rückfrage, damit
      etwas dasteht.`;
}

/**
 * Enthält der Text eine Zahl, die als Betrag, Prozentsatz oder Häufigkeit
 * durchgehen könnte?
 *
 * Eine Rückfrage, in der eine Zahl steht, wird VERWORFEN statt gesäubert. Das
 * ist Absicht: Wer die Zahl herausschneidet, lässt einen Satz stehen, der sich
 * auf sie bezog („liegt deutlich über dem, was üblich ist" ohne das Übliche).
 * Die belegten Werte hängt der Prüfschritt ohnehin an.
 *
 * Bewusst grob: Auch eine harmlose Zahl kostet die Rückfrage. Lieber eine Frage
 * weniger als eine mit einem Betrag, den niemand belegt hat.
 */
function enthaeltZahl(text: string): boolean {
  return /\d/.test(text);
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
export function leseErgebnisAus(roh: string, gewerk: Gewerk = WAERMEPUMPE): LeseErgebnis {
  const daten = jsonAusAntwort(roh) as Record<string, unknown>;
  const art = daten.art;

  if (art === "kein-angebot" || art === "unlesbar") {
    return { art, grund: textOderNull(daten.grund) ?? "ohne Angabe" };
  }
  if (art !== "gelesen" || typeof daten.angebot !== "object" || daten.angebot === null) {
    throw new Error("unerwartete Antwortform");
  }

  const bekannt = new Set(gewerk.positionen.map((p) => p.id));
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
    rueckfragen: (Array.isArray(a.rueckfragen) ? a.rueckfragen : [])
      .map((r) => {
        const q = (r ?? {}) as Record<string, unknown>;
        const text = textOderNull(q.text);
        if (!text || enthaeltZahl(text)) return null;
        const bezug = textOderNull(q.bezug);
        return { text, bezug: bezug && bekannt.has(bezug) ? bezug : null };
      })
      .filter((r): r is { text: string; bezug: string | null } => !!r),
    unsicher: (Array.isArray(a.unsicher) ? a.unsicher : [])
      .map(textOderNull)
      .filter((s): s is string => !!s),
  };

  return { art: "gelesen", angebot };
}

/** Ein Angebot lesen lassen. Der Dienst wird hereingereicht, nie hier gewählt. */
export async function leseAngebot(
  dienst: LeseDienst,
  dokumente: Dokument[],
  gewerk: Gewerk = WAERMEPUMPE,
): Promise<LeseErgebnis> {
  return leseErgebnisAus(await dienst(meisterAnweisung(gewerk), dokumente), gewerk);
}
