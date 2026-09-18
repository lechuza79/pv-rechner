import { NextRequest } from "next/server";
import { pruefeBestaetigung } from "../../../lib/abo-token";
import { wartelisteId } from "../../../lib/warteliste-links";
import { wartelisteBestaetigen } from "../../../lib/warteliste";
import { wartelisteErgebnis } from "../../../lib/warteliste-seite";

// Second step of a waitlist signup. Writes on every call → dynamic; the
// address carries a token, so the page is noindex.
export const dynamic = "force-dynamic";
const PFAD = "/warteliste/bestaetigen";
const NOCHMAL = "Trag dich auf der Seite „Angebot prüfen“ einfach noch einmal ein, dann kommt ein neuer Link.";

export async function GET(req: NextRequest) {
  const befund = pruefeBestaetigung(req.nextUrl.searchParams.get("t") ?? "", Date.now());
  const id = wartelisteId(befund);
  if (!id) {
    const abgelaufen = !befund.ok && befund.grund === "abgelaufen";
    return wartelisteErgebnis(PFAD, abgelaufen ? "Der Link ist abgelaufen" : "Dieser Link stimmt nicht", [
      abgelaufen
        ? "Bestätigungslinks gelten 48 Stunden. Danach lässt sich damit nichts mehr bestätigen, damit eine alte Mail in einem fremden Postfach niemanden eintragen kann."
        : "Der Link ist unvollständig oder wurde verändert. Das passiert am häufigsten, wenn ein Mailprogramm die Adresse über zwei Zeilen umbricht.",
      NOCHMAL,
    ]);
  }
  const ergebnis = await wartelisteBestaetigen(id, new Date().toISOString()).catch(() => null);
  if (!ergebnis || !ergebnis.ok) {
    return wartelisteErgebnis(PFAD, "Das hat gerade nicht geklappt", [
      "Wir konnten die Anmeldung im Moment nicht bestätigen. Versuch es in ein paar Minuten noch einmal, der Link bleibt 48 Stunden gültig.",
    ]);
  }
  if (ergebnis.eintrag.status === "abgemeldet") {
    return wartelisteErgebnis(PFAD, "Du hast dich ausgetragen", [
      "Diese Adresse steht nicht mehr auf der Warteliste. Wenn du doch Bescheid bekommen möchtest, trag dich auf der Seite „Angebot prüfen“ neu ein.",
    ]);
  }
  return wartelisteErgebnis(PFAD, "Du stehst auf der Warteliste", [
    "Sobald der Angebotscheck für Photovoltaik und Wärmepumpe startet, schreiben wir dir. Darüber hinaus schreiben wir dir nicht, kein Newsletter.",
    "Austragen kannst du dich jederzeit über den Link in der Bestätigungsmail.",
  ]);
}
