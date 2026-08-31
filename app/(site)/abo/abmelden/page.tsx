import type { Metadata } from "next";
import AboErgebnis from "../_ergebnis";
import { pruefeAbmeldung } from "../../../../lib/abo-token";
import { aboAbmelden } from "../../../../lib/gemeinde-abo";

// Der sichtbare Abmeldeweg — der Link im Fuß jeder Meldungsmail.
//
// OHNE RÜCKFRAGE. Wer hier ankommt, hat sich entschieden; ihm eine „sind Sie
// sicher"-Schaltfläche vorzusetzen ist der Anfang eines Verteilers, aus dem man
// nicht herauskommt. Genau das schließt die Zusage neben dem Anmeldeknopf aus.
//
// Der Ein-Klick-Weg der Postfächer läuft nicht hierher, sondern auf die
// zugehörige Schnittstellen-Adresse, die auf POST antwortet (RFC 8058). Beide
// tun dasselbe; diese hier sagt es zusätzlich einem Menschen.
//
// DIE ANTWORT IST IMMER „ABGEMELDET", auch bei einem gefälschten Token. Sonst
// verrät diese Seite, welche Kennungen es gibt.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Abgemeldet – Solar Check",
  robots: { index: false, follow: false },
};

export default async function Seite(props: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await props.searchParams;
  const befund = pruefeAbmeldung(t ?? "");
  if (befund.ok) {
    await aboAbmelden(befund.aboId, new Date().toISOString());
  }

  return (
    <AboErgebnis
      titel="Abgemeldet"
      saetze={[
        "Von uns kommt zu diesem Ort keine Mail mehr. Deine Adresse bleibt als abgemeldet vermerkt, damit sie nicht versehentlich wieder auf die Liste gerät. Mehr steht dort nicht.",
        "Falls du es dir anders überlegst: Auf der Seite deines Orts steht der Knopf weiterhin, und du müsstest die Anmeldung einmal neu bestätigen.",
      ]}
    />
  );
}
