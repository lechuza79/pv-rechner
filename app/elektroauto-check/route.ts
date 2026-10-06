import { neonUnterseiteHtml, htmlAntwort } from "../../lib/neon-unterseite";
import { wartelisteFormular } from "../../lib/warteliste-formular";

export const dynamic = "force-static";

export function GET() {
  return htmlAntwort(neonUnterseiteHtml({
    titel: "Elektroauto-Check: Demnächst – Solar Check",
    beschreibung: "Passt ein Elektroauto zu deinem Alltag? Trag dich in die Warteliste für den kommenden Elektroauto-Check ein.",
    pfad: "/elektroauto-check",
    krume: "Elektroauto-Check",
    index: false,
    ...wartelisteFormular("elektroauto", "Dein nächstes Auto fährt elektrisch?"),
  }));
}
