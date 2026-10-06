import { neonUnterseiteHtml, htmlAntwort } from "../../lib/neon-unterseite";
import { wartelisteFormular } from "../../lib/warteliste-formular";

// Home of the coming offer check (PV and heat pump). Until the check exists
// the page carries only its waitlist and stays out of the index: a page that
// holds nothing but a sign-up form is thin content, and the address is meant
// to rank once the check itself lives here.
//
// The waitlist card is the design package's own (".sc-waitlist" in nav.css,
// built for the menu dialog), placed on the page instead of in a dialog. The
// wording comes from the consent archive, never typed here: what a person
// reads is exactly what their entry stores as consent.
export const dynamic = "force-static";




export function GET() {
  return htmlAntwort(
    neonUnterseiteHtml({
      titel: "Angebot prüfen: Photovoltaik oder Wärmepumpe – Solar Check",
      beschreibung:
        "Bald prüfst du hier dein Photovoltaik- oder Wärmepumpen-Angebot: Preis, Auslegung und Leistungen. Trag dich ein, wir sagen Bescheid, sobald es losgeht.",
      pfad: "/angebot-pruefen",
      krume: "Angebot prüfen",
      ...wartelisteFormular("angebotscheck", "PV oder Wärmepumpe: Ist das Angebot fair?"),
      index: false,
    }),
  );
}
