import type { Metadata } from "next";
import AboErgebnis from "../_ergebnis";
import { pruefeBestaetigung } from "../../../../lib/abo-token";
import { aboBestaetigen } from "../../../../lib/gemeinde-abo";
import { getRegionById } from "../../../../lib/atlas";
import { atlasPathForRegionId } from "../../../../lib/atlas";

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

  const region = await getRegionById(ergebnis.abo.regionId);
  const pfad = region ? await atlasPathForRegionId(ergebnis.abo.regionId) : null;
  const ort = region?.name;

  return (
    <AboErgebnis
      titel={ort ? `Angemeldet für ${ort}` : "Angemeldet"}
      saetze={[
        ort
          ? `Du bekommst jetzt eine Nachricht, wenn sich bei den Solaranlagen in ${ort} etwas Nennenswertes tut — ein neues Förderprogramm, ein auslaufender Vergütungsjahrgang, der Zubau eines Jahres.`
          : "Du bekommst jetzt eine Nachricht, wenn sich in deinem Ort etwas Nennenswertes tut.",
        "Höchstens eine Mail im Monat, und nur wenn es wirklich etwas zu berichten gibt. Abmelden kannst du dich mit einem Klick am Fuß jeder Mail.",
      ]}
      ortHref={pfad ?? undefined}
      ortName={ort}
    />
  );
}
