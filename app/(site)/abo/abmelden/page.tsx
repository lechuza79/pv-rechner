import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AboErgebnis, { ABO_KNOPF_STIL } from "../_ergebnis";
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
  title: "Meldungen abbestellen – Solar Check",
  robots: { index: false, follow: false },
};

// The step happens on the press, not on opening the link: mail scanners open
// links on their own and would unsubscribe people silently (legal review
// 18.09.). The mailbox one-click route (RFC 8058, POST) stays without a
// question — that request comes from the person's own unsubscribe button.
async function abmelden(formData: FormData) {
  "use server";
  const t = String(formData.get("t") ?? "");
  const befund = pruefeAbmeldung(t);
  if (befund.ok) await aboAbmelden(befund.aboId, new Date().toISOString());
  redirect(`/abo/abmelden?t=${encodeURIComponent(t)}&fertig=1`);
}

export default async function Seite(props: { searchParams: Promise<{ t?: string; fertig?: string }> }) {
  const { t, fertig } = await props.searchParams;
  if (!fertig) {
    return (
      <AboErgebnis
        titel="Meldungen abbestellen?"
        saetze={["Ein Klick genügt, danach kommt zu diesem Ort keine Mail mehr von uns."]}
        aktion={
          <form action={abmelden}>
            <input type="hidden" name="t" value={t ?? ""} />
            <button type="submit" style={ABO_KNOPF_STIL}>
              Abbestellen
            </button>
          </form>
        }
      />
    );
  }

  return (
    <AboErgebnis
      titel="Abgemeldet"
      saetze={[
        "Von uns kommt zu diesem Ort keine Mail mehr. Wir halten noch fest, dass du einmal angemeldet warst und dich abgemeldet hast — das brauchen wir als Nachweis deiner Einwilligung, und es wird für nichts anderes verwendet.",
        "Falls du es dir anders überlegst: Auf der Seite deines Orts steht der Knopf weiterhin, und du müsstest die Anmeldung einmal neu bestätigen.",
      ]}
    />
  );
}
