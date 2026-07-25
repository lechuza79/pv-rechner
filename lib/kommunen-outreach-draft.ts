// Template-basierter Anschreiben-Generator für den Kommunen-Outreach.
//
// Bewusst KEIN LLM: das Projekt hat keine LLM-Anbindung, und die Personalisierung
// kommt aus den echten Zahlen der Gemeinde — der Mensch editiert vor dem Senden
// ohnehin. Eine reine Funktion (server + testbar), keine DB-/Next-Importe.
//
// Aufhänger = das kostenlose, einbettbare Gemeinde-Solar-Widget (Backlink/Reichweite).
// Betreff + Einstieg kommen aus der Award-Hook-Logik (lib/award-hook.ts) — DIESELBE
// Quelle wie die Anschreiben-Vorschau (/admin/awards/anschreiben). Damit kann der
// echte Brief nie von der Vorschau abweichen, und ein Wording-Fix wirkt überall.
// Signatur folgt den Outreach-Leitplanken (Klarname, „Betreiber solar-check.io",
// Impressum + Datenschutz).

export type DraftContext = {
  name: string;
  /** Volle URL der Atlas-Seite der Gemeinde (oder null, wenn kein Slug). */
  pageUrl: string | null;
  /** Betreff aus der Hook-Logik (rang-abhängiger, wahrer Catcher). */
  betreff: string;
  /** Einstiegssatz aus der Hook-Logik. */
  einstieg: string;
};

export type OutreachDraft = { subject: string; body: string };

const SIGNATURE = `Sebastian Schäder
Betreiber solar-check.io
Impressum: https://solar-check.io/impressum · Datenschutz: https://solar-check.io/datenschutz`;

// Art.-14-DSGVO-Pflichthinweis: die Kontaktdaten stammen aus Drittquellen
// (öffentliche Gemeinde-Website), nicht von der Gemeinde selbst → Herkunft, Zweck
// und Widerspruchsrecht müssen genannt werden (Legal-Checkliste #6).
const DSGVO_HINWEIS = `Datenschutz-Hinweis (Art. 14 DSGVO): Ihre öffentlich verfügbaren Kontaktdaten (Website Ihrer Gemeinde) nutze ich einmalig für dieses Angebot. Herkunft, Zweck und Ihr Widerspruchsrecht: https://solar-check.io/datenschutz`;

export function renderOutreachDraft(c: DraftContext): OutreachDraft {
  // Link auf die Gemeinde-Atlas-Seite (wenn vorhanden) — die Gemeinde sieht so
  // sofort, was sie einbetten würde.
  const seiteSatz = c.pageUrl
    ? `hier die Seite Ihrer Gemeinde: ${c.pageUrl}`
    : `mit einer Übersicht des Solar-Ausbaus Ihrer Gemeinde`;

  const body = `Sehr geehrte Damen und Herren,

${c.einstieg}

Den vollständigen Solar-Überblick für ${c.name} — monatlich aus dem amtlichen Marktstammdatenregister aufbereitet — pflege ich auf solar-check.io: ${seiteSatz}

Genau diese Übersicht biete ich Ihnen als kostenloses, einbettbares Widget für die Website von ${c.name} an: cookielos, ohne Anmeldung, automatisch aktuell. Optisch fügt es sich in Ihren Auftritt ein — Farben und Schrift passe ich an Ihre Website an. Ihre Bürgerinnen und Bürger sehen auf einen Blick, wie weit der Solar-Ausbau vor Ort ist — das motiviert erfahrungsgemäß zum Mitmachen.

Das ist kostenlos und ohne Vertrieb dahinter; über einen Quellenlink zurück freue ich mich, aber mehr braucht es nicht. Wenn Sie mögen, schicke ich Ihnen gern den Einbettungscode und einen Vorschau-Link.

Mit freundlichen Grüßen
${SIGNATURE}

—
${DSGVO_HINWEIS}`;

  return { subject: c.betreff, body };
}
