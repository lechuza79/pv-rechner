import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AboErgebnis from "../_ergebnis";
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
// DYNAMISCH, kein Zwischenspeicher: Die Seite schreibt beim Aufruf in die
// Datenbank. Eine zwischengespeicherte Fassung würde die Bestätigung beim
// zweiten Besucher gar nicht erst ausführen und ihm die Bestätigung eines
// fremden Abos zeigen.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anmeldung bestätigen – Solar Check",
  robots: { index: false, follow: false },
};

export default async function Seite(props: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await props.searchParams;
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

  const ergebnis = await aboBestaetigen(befund.aboId, new Date().toISOString());

  if (!ergebnis.ok) {
    return (
      <AboErgebnis
        titel="Das hat gerade nicht geklappt"
        saetze={[
          "Wir konnten die Anmeldung im Moment nicht bestätigen. Versuch es in ein paar Minuten noch einmal — der Link bleibt gültig.",
        ]}
      />
    );
  }

  // ZURÜCK AUF DIE SEITE DES ORTS, nicht auf eine eigene Quittungsseite
  // (Betreiber, 01.09.2026). Eine Seite, die nur „hat geklappt" sagt, ist eine
  // Sackgasse: Wer gerade Meldungen zu einem Ort abonniert hat, will diesen Ort
  // sehen, nicht einen Haken. Die Bestätigung erscheint dort an der Stelle, an
  // der vorher der Anmeldeknopf stand.
  //
  // Und ZU DER GATTUNG, auf der er sich eingetragen hat: Wer über die
  // Förderseite kam, interessiert sich für Zuschüsse und nicht für den
  // Anlagenbestand. Beide Seiten tragen denselben Ortsnamen; die Quittung auf
  // der falschen abzusetzen wäre die Sorte Fehler, die niemand meldet.
  const ziel = await zielPfad(ergebnis.abo.regionId, ergebnis.abo.quelle);
  if (ziel) redirect(`${ziel}?${ABO_BESTAETIGT_PARAM}=1`);

  // Kein Ziel auflösbar (Ort ohne freigeschaltete Seite): Dann bleibt die
  // eigene Quittung — sie ist die Rückfallebene, nicht der Normalfall.
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
