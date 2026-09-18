import "server-only";
import { neonUnterseiteHtml, htmlAntwort } from "./neon-unterseite";
import { esc } from "./neon-seite";

/** Result page of a waitlist step (confirm, unsubscribe) in the new design. */
export function wartelisteErgebnis(
  pfad: string,
  titel: string,
  saetze: string[],
  /** A button that POSTs the token back: the step happens on the press. */
  knopf?: { label: string; token: string },
): Response {
  const form = knopf
    ? `<form method="post" action="${esc(pfad)}" class="sc-waitlist" style="margin:0;background:none;padding:0"><input type="hidden" name="t" value="${esc(knopf.token)}"><button type="submit">${esc(knopf.label)}</button></form>`
    : "";
  const inhalt =
    `<div class="intro"><h1>${esc(titel)}</h1>` +
    saetze.map((s) => `<p>${esc(s)}</p>`).join("") +
    form +
    `<p><a href="/angebot-pruefen" style="text-decoration:underline">Zur Seite „Angebot prüfen“</a></p></div>`;
  return htmlAntwort(
    neonUnterseiteHtml({ titel: `${titel} – Solar Check`, beschreibung: titel, pfad, krume: "Warteliste", inhalt, index: false }),
  );
}
