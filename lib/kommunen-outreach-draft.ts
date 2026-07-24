// Template-basierter Anschreiben-Generator für den Kommunen-Outreach.
//
// Bewusst KEIN LLM: das Projekt hat keine LLM-Anbindung, und die Personalisierung
// kommt aus den echten Zahlen der Gemeinde — der Mensch editiert vor dem Senden
// ohnehin. Eine reine Funktion (server + testbar), keine DB-/Next-Importe.
//
// Aufhänger = das kostenlose, einbettbare Gemeinde-Solar-Widget (Backlink/Reichweite).
// Der Betreff ist ein rang-abhängiger Catcher (immer eine WAHRE Aussage — nur wo
// die Gemeinde wirklich vorne liegt, wird gelobt). Signatur folgt den Outreach-
// Leitplanken (Klarname, „Betreiber solar-check.io", Impressum + Datenschutz).

import { fmtPvLeistung } from "./atlas-format";

export type DraftContext = {
  name: string;
  /** Installierte Gesamtleistung (kWp, inkl. Freifläche). */
  kwpAlle: number;
  population: number | null;
  /** Volle URL der Atlas-Seite der Gemeinde (oder null, wenn kein Slug). */
  pageUrl: string | null;
  /** Perzentil Dach-Leistung pro Kopf bundesweit (0–100) — park-immun. */
  perzentil: number | null;
  /** Rang im Landkreis (1 = höchste Dach-Leistung pro Kopf). */
  rangKreis: number | null;
  /** Anzahl Gemeinden im Landkreis (für die Plausibilität des Rangs). */
  kreisGemeinden: number | null;
};

export type OutreachDraft = { subject: string; body: string };

const SIGNATURE = `Sebastian Schäder
Betreiber solar-check.io
Impressum: https://solar-check.io/impressum · Datenschutz: https://solar-check.io/datenschutz`;

// Rang-abhängiger Betreff. Reihenfolge = stärkster wahrer Aufhänger zuerst.
function buildSubject(c: DraftContext): string {
  // Landkreis-Sieger nur bei echten Landkreisen (kreisfreie Städte haben nur
  // sich selbst → kreisGemeinden < 3, fällt durch auf das Perzentil).
  if (c.rangKreis === 1 && (c.kreisGemeinden ?? 0) >= 3) {
    return `Solar-Spitzenreiter in Ihrem Landkreis: ${c.name} auf Ihrer Website zeigen`;
  }
  if (c.perzentil != null && c.perzentil >= 90) {
    return `${c.name} gehört beim Solardach zu den Top 10 % in Deutschland`;
  }
  if (c.perzentil != null && c.perzentil >= 75) {
    return `${c.name}: beim Solardach unter den Top 25 % in Deutschland`;
  }
  return `So steht ${c.name} beim Solar-Ausbau da — kostenloses Widget für Ihre Website`;
}

export function renderOutreachDraft(c: DraftContext): OutreachDraft {
  const subject = buildSubject(c);

  // Eröffnung mit echter Zahl — Einheit NUR aus dem Atlas-Formatter (kWp/MWp),
  // nie handgeschrieben (Zahlen-Korrektheit-BLOCKER). Bewusst die GESAMT-Leistung
  // (wie die Atlas-Seite), KEINE Pro-Kopf-Angabe im Body: pro Kopf inkl. Freifläche
  // wäre bei Park-Gemeinden ein Artefakt. Die vergleichende Aussage trägt der
  // Betreff (park-immun, Dach pro Kopf).
  const opener = c.kwpAlle > 0
    ? `in ${c.name} sind bereits rund ${fmtPvLeistung(c.kwpAlle)} Photovoltaik am Netz.`
    : `beim Solar-Ausbau ist in ${c.name} noch viel Luft nach oben — und genau das lässt sich sichtbar machen.`;

  // Link auf die Gemeinde-Atlas-Seite (wenn vorhanden) — die Gemeinde sieht so
  // sofort, was sie einbetten würde.
  const seiteSatz = c.pageUrl
    ? `hier die Seite Ihrer Gemeinde: ${c.pageUrl}`
    : `mit einer Übersicht des Solar-Ausbaus Ihrer Gemeinde`;

  const body = `Sehr geehrte Damen und Herren,

${opener} Diese Zahlen halte ich auf solar-check.io tagesaktuell — ${seiteSatz}

Genau diese Übersicht biete ich Ihnen als kostenloses, einbettbares Widget für die Website von ${c.name} an: cookielos, ohne Anmeldung, automatisch aktuell. Optisch fügt es sich in Ihren Auftritt ein — Farben und Schrift passe ich an Ihre Website an. Ihre Bürgerinnen und Bürger sehen auf einen Blick, wie weit der Solar-Ausbau vor Ort ist — das motiviert erfahrungsgemäß zum Mitmachen.

Das ist kostenlos und ohne Vertrieb dahinter; über einen Quellenlink zurück freue ich mich, aber mehr braucht es nicht. Wenn Sie mögen, schicke ich Ihnen gern den Einbettungscode und einen Vorschau-Link.

Mit freundlichen Grüßen
${SIGNATURE}`;

  return { subject, body };
}
