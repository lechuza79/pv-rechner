import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AboErgebnis, { ABO_KNOPF_STIL } from "../_ergebnis";
import { pruefeBestaetigung } from "../../../../lib/abo-token";
import { aboBestaetigen } from "../../../../lib/gemeinde-abo";
import { atlasPathForRegionId } from "../../../../lib/atlas";
import { ATLAS_CITIES, cityPath, isCityPublished } from "../../../../lib/atlas-cities";
import { ABO_BESTAETIGT_PARAM } from "../../../../lib/abo-bestaetigt";

// Der zweite Schritt der Anmeldung: Der Klick aus der Bestätigungsmail landet
// hier.
//
// NICHT INDEXIERBAR und nicht in der Sitemap. Die Adresse trägt ein Token,
// jeder Aufruf ist einmalig, und ein Suchergebnis „Anmeldung bestätigt" wäre
// für niemanden von Nutzen.
//
// DYNAMISCH, kein Zwischenspeicher: Der Knopf schreibt in die Datenbank. Eine zwischengespeicherte Fassung würde die Bestätigung beim
// zweiten Besucher gar nicht erst ausführen und ihm die Bestätigung eines
// fremden Abos zeigen.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anmeldung bestätigen – Solar Check",
  robots: { index: false, follow: false },
};

// OPENING THE LINK CONFIRMS NOTHING — only the press of the button does.
// Mail scanners in company and council mailboxes open links on their own; a
// confirmation they trigger is not a person's consent (legal review 18.09.).
async function bestaetigen(formData: FormData) {
  "use server";
  const t = String(formData.get("t") ?? "");
  const zurueck = `/abo/bestaetigen?t=${encodeURIComponent(t)}`;
  const befund = pruefeBestaetigung(t, Date.now());
  if (!befund.ok) redirect(zurueck);
  const ergebnis = await aboBestaetigen(befund.aboId, new Date().toISOString()).catch(() => null);
  if (!ergebnis || !ergebnis.ok) redirect(`${zurueck}&fehler=1`);
  // Back to the town page of the kind the person signed up on (see zielPfad).
  const ziel = await zielPfad(ergebnis.abo.regionId, ergebnis.abo.quelle);
  redirect(ziel ? `${ziel}?${ABO_BESTAETIGT_PARAM}=1` : `${zurueck}&fertig=1`);
}

export default async function Seite(props: {
  searchParams: Promise<{ t?: string; fehler?: string; fertig?: string }>;
}) {
  const { t, fehler, fertig } = await props.searchParams;
  const befund = pruefeBestaetigung(t ?? "", Date.now());

  if (!befund.ok) {
    return (
      <AboErgebnis
        titel={befund.grund === "abgelaufen" ? "Der Link ist abgelaufen" : "Dieser Link stimmt nicht"}
        saetze={
          befund.grund === "abgelaufen"
            ? [
                "Bestätigungslinks gelten 48 Stunden. Danach lässt sich damit nichts mehr anmelden — das ist Absicht, damit eine alte Mail in einem fremden Postfach niemanden anmelden kann.",
                "Trag die Adresse auf der Seite deines Orts einfach noch einmal ein, dann kommt ein frischer Link.",
              ]
            : [
                "Der Link ist unvollständig oder wurde verändert. Das passiert am häufigsten, wenn ein Mailprogramm die Adresse über zwei Zeilen umbricht.",
                "Trag die Adresse auf der Seite deines Orts noch einmal ein, dann kommt ein neuer Link.",
              ]
        }
      />
    );
  }

  if (fertig) {
    // No resolvable town page (not released): the own receipt is the fallback.
    return (
      <AboErgebnis
        titel="Angemeldet"
        saetze={[
          "Du bekommst jetzt eine Nachricht, wenn sich in deinem Ort etwas Nennenswertes tut.",
          "Es kommt nur etwas, wenn es etwas zu berichten gibt. Abmelden kannst du dich mit einem Klick am Fuß jeder Mail.",
        ]}
      />
    );
  }

  return (
    <AboErgebnis
      titel={fehler ? "Das hat gerade nicht geklappt" : "Noch ein Klick"}
      saetze={[
        fehler
          ? "Wir konnten die Anmeldung im Moment nicht bestätigen. Versuch es in ein paar Minuten noch einmal, der Link bleibt 48 Stunden gültig."
          : "Bestätige hier, dass du die Meldungen bekommen möchtest. Erst dann schicken wir dir etwas.",
      ]}
      aktion={
        <form action={bestaetigen}>
          <input type="hidden" name="t" value={t ?? ""} />
          <button type="submit" style={ABO_KNOPF_STIL}>
            Ja, Meldungen bekommen
          </button>
        </form>
      }
    />
  );
}

/**
 * Wohin nach der Bestätigung?
 *
 * Die Förderseite gibt es nur, wenn der Ort im Katalog steht UND freigeschaltet
 * ist — das entscheidet der Releaseplan, nicht die Existenz eines Programms.
 * Ist sie nicht da, fällt auch ein Förder-Abo auf die Atlas-Seite zurück: Eine
 * Weiterleitung auf eine Adresse, die 404 wirft, wäre schlimmer als die
 * Quittungsseite.
 */
async function zielPfad(regionId: string, quelle: "gemeinde" | "foerderung"): Promise<string | null> {
  if (quelle === "foerderung") {
    const stadt = ATLAS_CITIES.find((c) => c.ags === regionId);
    if (stadt && isCityPublished(stadt)) return cityPath(stadt);
  }
  return atlasPathForRegionId(regionId);
}
