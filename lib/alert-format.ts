// ─── Wächter-Meldungen: Form und Zustellentscheidung ─────────────────────────
//
// WARUM ES DIESE DATEI GIBT (28.07.2026): Die Wächter schickten ihren kompletten
// Lauf-Bericht an den Betreiber — sieben Mails „Handlungsbedarf" in drei Tagen,
// in denen die eine Frage, die wirklich bei ihm lag (eine 30-€-Studie kaufen?),
// zwischen mehreren Bildschirmseiten Rechenschaft stand. Eine Mail, die den
// Handlungsbedarf nicht in den ersten drei Zeilen zeigt, wird nach zwei Wochen
// weggefiltert, und dann geht auch die eine unter, die zählt.
//
// Die Antwort ist nicht „kürzer schreiben" (das hält keine Woche), sondern eine
// Form, die Kürze erzwingt und die Zustellung an eine Bedingung knüpft:
//
//   decisions[]  Was MUSS der Betreiber entscheiden? Nur das rechtfertigt eine
//                Mail. Leer = kein Versand, egal wie aufregend der Lauf war.
//   done[]       Was hat der Wächter selbst geändert — eine Zeile je Änderung.
//                Zum Sehen, nicht zum Abnicken (Gate, Teil 2).
//   details      Der ganze Bericht. Wandert ans Ende und ist eingeklappt.
//
// Die Längenbegrenzungen sind Absicht: Wer seine Entscheidung nicht in vier
// Zeilen sagen kann, hat sie noch nicht verstanden. Gekürzt wird sichtbar, nie
// stillschweigend — und abgelehnt wird nie, sonst ginge eine echte Frage
// verloren, nur weil ihr Autor zu viel geschrieben hat.

/** Länge, ab der eine einzelne Entscheidung sichtbar gekürzt wird. */
const MAX_DECISION_CHARS = 400;
const MAX_DECISIONS = 5;
/** Eine erledigte Änderung ist eine Zeile — der Beleg steht im Commit. */
const MAX_DONE_CHARS = 220;
const MAX_DONE = 8;
const MAX_DETAILS_CHARS = 20000;
const MAX_SUBJECT_CHARS = 140;

export type AlertPayload = {
  subject?: unknown;
  /** Was der Betreiber entscheiden muss. Ohne Eintrag hier: kein Versand. */
  decisions?: unknown;
  /** Was der Wächter selbst geändert hat — je eine Zeile. */
  done?: unknown;
  /** Der vollständige Bericht; in der Mail eingeklappt. */
  details?: unknown;
  /** "claude" = an die nächste Modell-Sitzung adressiert, nie an den Betreiber. */
  audience?: unknown;
  /** Nur für den Wochenbericht: senden, obwohl nichts zu entscheiden ist. */
  force?: unknown;
  /** Alter Aufrufweg (Fließtext). Wird weiter zugestellt. */
  body?: unknown;
  tag?: unknown;
};

export type Delivery = {
  send: boolean;
  /** Klartext, warum (nicht) gesendet wird — landet im Aufrufer-Protokoll. */
  reason: string;
  /** Gesetzt, wenn die Anfrage selbst unbrauchbar ist → 400. */
  problem?: string;
};

function asLines(v: unknown, max: number, maxChars: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((s) => (s.length > maxChars ? `${s.slice(0, maxChars)} […]` : s));
}

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Wurde der neue, strukturierte Weg benutzt? */
export function isStructured(p: AlertPayload): boolean {
  return Array.isArray(p.decisions) || Array.isArray(p.done) || typeof p.details === "string";
}

/**
 * Senden oder nicht — die einzige Stelle, an der das entschieden wird.
 *
 * Der alte Aufrufweg (nur `body`) wird weiter zugestellt, damit ein Wächter,
 * der noch nicht umgestellt ist, nicht still verstummt. Er ist der Übergang,
 * nicht das Ziel.
 */
export function decideDelivery(p: AlertPayload): Delivery {
  const subject = asText(p.subject);
  if (!subject) return { send: false, reason: "ungültig", problem: "subject is required" };

  const structured = isStructured(p);
  if (!structured && !asText(p.body)) {
    return { send: false, reason: "ungültig", problem: "body or decisions/done/details required" };
  }

  // An Claude adressiert heißt: Der Betreiber kann daran nichts tun. Ihn trotzdem
  // zu benachrichtigen wäre eine Sackgasse — er programmiert nicht.
  if (asText(p.audience) === "claude") {
    return { send: false, reason: "an Claude adressiert, nicht an den Betreiber" };
  }

  if (!structured) return { send: true, reason: "Fließtext-Meldung (alter Aufrufweg)" };

  const decisions = asLines(p.decisions, MAX_DECISIONS, MAX_DECISION_CHARS);
  if (decisions.length) return { send: true, reason: `${decisions.length} Entscheidung(en)` };
  if (p.force === true) return { send: true, reason: "ausdrücklich angefordert (force)" };

  return { send: false, reason: "nichts zu entscheiden" };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Die drei Zeilen, die im Postfach sichtbar sind, bevor irgendjemand klickt.
 * Sie beantworten in dieser Reihenfolge: Muss ich ran? Was ist ohne mich
 * passiert? Wo steht der Rest?
 */
export function buildSummaryLines(p: AlertPayload): string[] {
  const decisions = asLines(p.decisions, MAX_DECISIONS, MAX_DECISION_CHARS);
  const done = asLines(p.done, MAX_DONE, MAX_DONE_CHARS);
  return [
    decisions.length
      ? `Deine Entscheidung: ${decisions.length} Punkt${decisions.length === 1 ? "" : "e"}`
      : "Deine Entscheidung: nichts",
    done.length ? `Selbst erledigt: ${done.length}` : "Selbst erledigt: nichts",
  ];
}

export function buildAlertMail(p: AlertPayload): { subject: string; html: string } {
  const decisions = asLines(p.decisions, MAX_DECISIONS, MAX_DECISION_CHARS);
  const done = asLines(p.done, MAX_DONE, MAX_DONE_CHARS);
  const details = asText(p.details).slice(0, MAX_DETAILS_CHARS) || asText(p.body).slice(0, MAX_DETAILS_CHARS);
  const tag = asText(p.tag).slice(0, 40);
  const rawSubject = asText(p.subject).slice(0, MAX_SUBJECT_CHARS);

  // Der Betreff sagt, ob jemand ran muss — nicht, wie der Wächter heißt. Bisher
  // stand über jeder Meldung „Handlungsbedarf", auch wenn der Handlungsbedarf
  // bei Claude lag; genau das entwertet das Wort.
  const subject = decisions.length
    ? `Solar Check – Entscheidung: ${rawSubject}`
    : `Solar Check – Wächter: ${rawSubject}`;

  const kopf = buildSummaryLines(p);

  const block = (title: string, items: string[], ordered: boolean) =>
    items.length
      ? `<h3 style="font-size:14px;margin:20px 0 6px">${escapeHtml(title)}</h3>
         <${ordered ? "ol" : "ul"} style="margin:0;padding-left:20px;font-size:14px;line-height:1.7">
           ${items.map((i) => `<li style="margin-bottom:6px">${escapeHtml(i)}</li>`).join("")}
         </${ordered ? "ol" : "ul"}>`
      : "";

  const detailsBlock = details
    ? `<details style="margin-top:24px">
         <summary style="cursor:pointer;font-size:13px;color:#777">Alle Einzelheiten des Laufs</summary>
         <div style="font-size:13px;line-height:1.7;color:#777;margin-top:10px">${escapeHtml(details).replace(/\n/g, "<br>")}</div>
       </details>`
    : "";

  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#3F3F3F">
    <h2 style="margin:0 0 4px;font-size:18px">${escapeHtml(rawSubject)}</h2>
    <p style="color:#777;margin:0 0 16px;font-size:13px">${kopf.map(escapeHtml).join(" · ")}${tag ? ` · ${escapeHtml(tag)}` : ""}</p>
    ${block("Deine Entscheidung", decisions, true)}
    ${block("Selbst erledigt (nichts zu tun)", done, false)}
    ${detailsBlock}
    <p style="color:#949494;font-size:12px;margin-top:24px">Automatisch erzeugt von einem solar-check.io-Wächter. Diese Mail kommt nur, wenn eine Entscheidung bei dir liegt — alles andere steht im Sonntags-Wochenbericht.</p>
  </div>`;

  return { subject, html };
}
