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
  /**
   * Funktion der im Impressum benannten OPERATIVEN Stelle, falls vorhanden
   * („Referentin für Öffentlichkeitsarbeit"). Nur dann wird direkt adressiert.
   *
   * Gemessen am 27.07.2026: Von 21 kleinen Gemeinden nannte genau EINE jemand
   * anderen als den Bürgermeister. Die Person, die die Website pflegt, steht
   * dort schlicht nicht öffentlich — deshalb ist der Regelfall NICHT die
   * namentliche Anrede, sondern ein Text, der eine Weiterleitung übersteht.
   */
  funktion?: string | null;
  /** Vorhandene Themenseite der Gemeinde (Solar, Klimaschutz, Mitteilungsblatt)
   *  als überprüfbarer Anknüpfungspunkt statt einer Behauptung. */
  thema?: { begriff: string; url: string } | null;
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

  // Wer die Website betreut, ist bei kleinen Gemeinden nicht ermittelbar (siehe
  // `funktion`). Deshalb steht die Bitte um Weiterleitung GANZ OBEN und nennt
  // die gesuchte Rolle: Das Rathaus verteilt Post ohnehin den ganzen Tag — die
  // Nachricht muss nur erkennen lassen, wohin sie gehört. Ist eine operative
  // Stelle benannt, entfällt der Satz.
  const weiterleitung = c.funktion
    ? ""
    : `\n\nFalls Sie nicht selbst zuständig sind: Diese Nachricht richtet sich an die Kollegin oder den Kollegen, die Ihre Website betreut. Ich wäre Ihnen für eine kurze Weiterleitung dankbar.`;

  // Anknüpfung an eine Seite, die es wirklich gibt — nachprüfbar statt behauptet.
  const anknuepfung = c.thema
    ? `\n\nAuf Ihrer Website führen Sie bereits eine Seite zum Thema („${c.thema.begriff}“). Genau dort würden die Solarzahlen Ihrer Gemeinde gut dazupassen.`
    : "";

  const body = `Sehr geehrte Damen und Herren,${weiterleitung}

${c.einstieg}${anknuepfung}

Den vollständigen Solar-Überblick für ${c.name} — monatlich aus dem amtlichen Marktstammdatenregister aufbereitet — pflege ich auf solar-check.io: ${seiteSatz}

Genau diese Übersicht biete ich Ihnen als kostenloses, einbettbares Widget für die Website von ${c.name} an: cookielos, ohne Anmeldung, automatisch aktuell. Optisch fügt es sich in Ihren Auftritt ein — Farben und Schrift passe ich an Ihre Website an. Ihre Bürgerinnen und Bürger sehen auf einen Blick, wie weit der Solar-Ausbau vor Ort ist — das motiviert erfahrungsgemäß zum Mitmachen.

Das ist kostenlos und ohne Vertrieb dahinter. Der Einbettungscode enthält einen kleinen, sichtbaren Quellenhinweis „Daten von solar-check.io“ unter dem Widget — der bleibt bitte stehen; eine Whitelabel-Variante ohne Hinweis biete ich auf Anfrage an. Wenn Sie mögen, schicke ich Ihnen gern den Einbettungscode und einen Vorschau-Link.

Mit freundlichen Grüßen
${SIGNATURE}

—
${DSGVO_HINWEIS}`;

  return { subject: c.betreff, body };
}
