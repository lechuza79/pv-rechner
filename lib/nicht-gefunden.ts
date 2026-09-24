/**
 * The words of the 404 page — ONE source for both frames it is shown in.
 *
 * A wrong address reaches the visitor in two very different ways, and Next
 * renders them from two different files:
 *   - an address that matches no route at all (app/global-not-found.tsx, a
 *     document of its own — at that point Next has no layout to put it in);
 *   - a page that exists but finds nothing behind it, e.g. an invented place in
 *     the Energie-Atlas (app/(site)/not-found.tsx, inside the React layout).
 * Only the markup differs; the text and the way out must not. Typed twice they
 * would drift, and the drift would be invisible — both pages look fine on their
 * own.
 *
 * The links are the four ways out we actually want to offer. They are written
 * as their CURRENT addresses on purpose: an internal link to a redirected one
 * costs an extra hop (see lib/__tests__/nav-aktiv.test.ts).
 */
export const NICHT_GEFUNDEN = {
  titel: "Seite nicht gefunden – Solar Check",
  beschreibung: "Diese Adresse gibt es bei Solar Check nicht. Hier geht es weiter zu den Rechnern, zum Energie-Atlas und zum Kontakt.",
  augenbraue: "Fehler 404",
  ueberschrift: "Diese Seite gibt es nicht.",
  text: "Vielleicht hat sich die Adresse geändert, oder im Link steckt ein Tippfehler. Von hier aus kommst du weiter:",
  wege: [
    { href: "/", titel: "Startseite", text: "Alle Rechner und Energiedaten auf einen Blick" },
    { href: "/photovoltaik-rechner", titel: "PV-Rechner", text: "Rechnet sich deine Anlage? Ergebnis sofort, ohne Anmeldung" },
    { href: "/solar-atlas", titel: "Energie-Atlas", text: "Solarleistung und Zubau in deiner Region" },
    { href: "/kontakt", titel: "Kontakt", text: "Etwas kaputt oder eine Frage? Schreib uns" },
  ],
} as const;
