import type { Metadata } from "next";
import AboErgebnis from "../../abo/_ergebnis";
import { pruefeAbmeldung } from "../../../../lib/abo-token";
import { wartelisteId } from "../../../../lib/warteliste-links";
import { wartelisteAbmelden } from "../../../../lib/warteliste";

// Leaving the waitlist: no confirmation question, and always the same answer
// (even for a forged token) so this page does not reveal which ids exist.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ausgetragen – Solar Check",
  robots: { index: false, follow: false },
};

export default async function Seite(props: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await props.searchParams;
  const id = wartelisteId(pruefeAbmeldung(t ?? ""));
  if (id) await wartelisteAbmelden(id, new Date().toISOString());
  return (
    <AboErgebnis
      titel="Ausgetragen"
      saetze={[
        "Von uns kommt zu dieser Warteliste keine Mail mehr. Wir halten noch fest, dass du eingetragen warst und dich ausgetragen hast. Das brauchen wir als Nachweis deiner Einwilligung, und es wird für nichts anderes verwendet.",
      ]}
      cta={{ href: "/photovoltaik-rechner", label: "Solaranlage durchrechnen" }}
    />
  );
}
