import type { Metadata } from "next";
import AboErgebnis from "../../abo/_ergebnis";
import { pruefeBestaetigung } from "../../../../lib/abo-token";
import { wartelisteId } from "../../../../lib/warteliste-links";
import { wartelisteBestaetigen } from "../../../../lib/warteliste";

// Second step of a waitlist signup. Writes on every call → dynamic, not
// indexable (the address carries a token).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Warteliste bestätigen – Solar Check",
  robots: { index: false, follow: false },
};

const WEITER = { href: "/photovoltaik-rechner", label: "Solaranlage durchrechnen" };

export default async function Seite(props: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await props.searchParams;
  const befund = pruefeBestaetigung(t ?? "", Date.now());
  const id = wartelisteId(befund);

  if (!id) {
    const abgelaufen = !befund.ok && befund.grund === "abgelaufen";
    return (
      <AboErgebnis
        titel={abgelaufen ? "Der Link ist abgelaufen" : "Dieser Link stimmt nicht"}
        saetze={[
          abgelaufen
            ? "Bestätigungslinks gelten 48 Stunden. Danach lässt sich damit nichts mehr bestätigen, damit eine alte Mail in einem fremden Postfach niemanden eintragen kann."
            : "Der Link ist unvollständig oder wurde verändert. Das passiert am häufigsten, wenn ein Mailprogramm die Adresse über zwei Zeilen umbricht.",
          "Trag dich auf der Seite „Angebot prüfen“ einfach noch einmal ein, dann kommt ein neuer Link.",
        ]}
        cta={WEITER}
      />
    );
  }

  const ergebnis = await wartelisteBestaetigen(id, new Date().toISOString());
  if (!ergebnis.ok) {
    return (
      <AboErgebnis
        titel="Das hat gerade nicht geklappt"
        saetze={["Wir konnten die Anmeldung im Moment nicht bestätigen. Versuch es in ein paar Minuten noch einmal — der Link bleibt 48 Stunden gültig."]}
        cta={WEITER}
      />
    );
  }
  if (ergebnis.eintrag.status === "abgemeldet") {
    return (
      <AboErgebnis
        titel="Du hast dich ausgetragen"
        saetze={["Diese Adresse steht nicht mehr auf der Warteliste. Wenn du doch Bescheid bekommen möchtest, trag dich auf der Seite „Angebot prüfen“ neu ein."]}
        cta={WEITER}
      />
    );
  }
  return (
    <AboErgebnis
      titel="Du stehst auf der Warteliste"
      saetze={[
        "Sobald der Angebotscheck für Photovoltaik und Wärmepumpe startet, schreiben wir dir genau einmal. Kein Newsletter.",
        "Austragen kannst du dich jederzeit über den Link in der Bestätigungsmail.",
      ]}
      cta={WEITER}
    />
  );
}
