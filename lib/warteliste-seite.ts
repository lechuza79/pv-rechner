import "server-only";
import { neonUnterseiteHtml, htmlAntwort } from "./neon-unterseite";
import { esc } from "./neon-seite";

/** Result page of a waitlist step (confirm, unsubscribe) in the new design. */
export function wartelisteErgebnis(pfad: string, titel: string, saetze: string[]): Response {
  const inhalt =
    `<div class="intro"><h1>${esc(titel)}</h1>` +
    saetze.map((s) => `<p>${esc(s)}</p>`).join("") +
    `<p><a href="/angebot-pruefen" style="text-decoration:underline">Zur Seite „Angebot prüfen“</a></p></div>`;
  return htmlAntwort(
    neonUnterseiteHtml({ titel: `${titel} – Solar Check`, beschreibung: titel, pfad, krume: "Warteliste", inhalt, index: false }),
  );
}
