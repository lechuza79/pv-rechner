// Template-basierter Anschreiben-Generator für den Kommunen-Outreach.
//
// Bewusst KEIN LLM: das Projekt hat keine LLM-Anbindung, und die Personalisierung
// kommt aus den echten Solar-Zahlen der Gemeinde — der Mensch editiert vor dem
// Senden ohnehin. Eine reine Funktion (server + testbar), keine DB-/Next-Importe.
//
// Aufhänger = das kostenlose, einbettbare Gemeinde-Solar-Widget (Backlink/Reichweite).
// Signatur folgt den Outreach-Leitplanken (Klarname, „Betreiber solar-check.io",
// Impressum + Datenschutz-Link) — siehe CLAUDE.md Legal-Checkliste #6.

import { fmtPvLeistung, fmtWattProKopf } from "./atlas-format";

export type GemeindeKpi = {
  name: string;
  /** Installierte Gesamtleistung (kWp, inkl. Freifläche). */
  kwpAlle: number;
  population: number | null;
};

export type OutreachDraft = { subject: string; body: string };

const SIGNATURE = `Sebastian Schäder
Betreiber solar-check.io
Impressum: https://solar-check.io/impressum · Datenschutz: https://solar-check.io/datenschutz`;

export function renderOutreachDraft(g: GemeindeKpi): OutreachDraft {
  const subject = `Kostenloses Solar-Widget für die Website von ${g.name}`;

  // Eröffnung mit echter Zahl — Einheiten NUR aus den Atlas-Formattern (kWp/Wp),
  // nie handgeschrieben (Zahlen-Korrektheit-BLOCKER).
  const hatLeistung = g.kwpAlle > 0;
  const proKopf =
    hatLeistung && g.population && g.population > 0
      ? fmtWattProKopf(Math.round((g.kwpAlle * 1000) / g.population))
      : null;

  const opener = !hatLeistung
    ? `beim Solar-Ausbau ist in ${g.name} noch viel Luft nach oben — und genau das lässt sich sichtbar machen.`
    : proKopf
      ? `in ${g.name} sind bereits rund ${fmtPvLeistung(g.kwpAlle)} Photovoltaik am Netz — das sind ${proKopf} je Einwohnerin und Einwohner.`
      : `in ${g.name} sind bereits rund ${fmtPvLeistung(g.kwpAlle)} Photovoltaik am Netz.`;

  const body = `Sehr geehrte Damen und Herren,

${opener} Diese Zahlen halte ich auf solar-check.io tagesaktuell — mit einer Übersicht des Solar-Ausbaus Ihrer Gemeinde.

Für die Website von ${g.name} biete ich Ihnen das als kostenloses, einbettbares Widget an: cookielos, ohne Anmeldung, automatisch aktuell. Ihre Bürgerinnen und Bürger sehen auf einen Blick, wie weit der Solar-Ausbau vor Ort ist — das motiviert erfahrungsgemäß zum Mitmachen.

Kein Vertrieb, keine Kosten; einzige Bedingung ist eine Quellenangabe mit Link. Wenn das für Sie interessant ist, schicke ich Ihnen gern den Einbettungscode und einen Vorschau-Link.

Mit freundlichen Grüßen
${SIGNATURE}`;

  return { subject, body };
}
