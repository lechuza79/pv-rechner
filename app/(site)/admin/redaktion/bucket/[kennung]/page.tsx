import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdminSession } from "../../../../../../lib/admin-guard";
import { leseFund } from "../../../../../../lib/social-fundvorrat";
import { entwurfAus } from "../../../../../../lib/social-entwurf";
import { adresseLesbar } from "../../../../../../lib/fachbetrieb-extrakt";
import { socialKennzahlen } from "../../../../../../lib/social-kennzahlen";
import { quellenzeile } from "../../../../../../lib/social-posts";
import { fassungsAbdruck } from "../../../../../../lib/social-pruefung";
import { pruefeMechanisch } from "../../../../../../lib/social-mechanik";
import { StoryListe } from "../../../../../../components/social/StoryListe";
import AdminSeitenkopf from "../../../../../../components/admin/AdminSeitenkopf";
import { v, space, pad } from "../../../../../../lib/theme";

// Der Entwurf zu einem Fund — im selben Tisch wie jeder andere Beitrag.
//
// KEINE ZWEITE OBERFLÄCHE. Ein Entwurf sieht aus wie ein Beitrag, weil er einer
// ist: derselbe Text, dasselbe Bild, dieselbe Vorschau, dieselbe mechanische
// Prüfung. Eine eigene Bastelansicht daneben wäre eine zweite Fassung derselben
// Sache — und man merkt die Drift erst, wenn der Entwurf anders aussieht als
// der Beitrag, der aus ihm wird.
//
// Der Unterschied steht ÜBER dem Tisch und nicht darin: was noch fehlt, allen
// voran der letzte Absatz.
//
// Der Entwurf wird bei jedem Aufruf NEU aus dem Fund gebaut, nicht abgelegt.
// Ein abgelegter Entwurf trüge die Zahlen von damals; nach dem nächsten
// Suchlauf stünde dort eine Zahl, die die Daten widerlegen.

export const metadata = {
  title: "Redaktion – Entwurf",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EntwurfSeite({
  params,
}: {
  params: Promise<{ kennung: string }>;
}) {
  const { kennung } = await params;
  if (!(await isAdminSession())) redirect(`/login?next=/admin/redaktion/bucket/${kennung}`);

  // Über die Schutzfunktion: Eine kaputt kodierte Adresse lässt den direkten
  // Aufruf werfen, und der Wächter im Projekt verbietet ihn deshalb — er hat
  // diese Stelle hier gefangen.
  const fund = await leseFund(adresseLesbar(kennung));
  if (!fund) notFound();

  const k = await socialKennzahlen();
  const entwurf = entwurfAus(fund, quellenzeile(k.standIso, false));

  return (
    <>
      <AdminSeitenkopf
        titel="Entwurf"
        hilfe={
          "Aus einem Fund gebaut und im selben Tisch wie jeder andere Beitrag: " +
          "Das Bild steht, der Textrumpf auch. Was fehlt, steht darüber — vor " +
          "allem der letzte Absatz. Der Entwurf wird bei jedem Aufruf neu " +
          "gerechnet, trägt also immer den aktuellen Stand."
        }
      />

      <p style={{ fontSize: 13, marginBottom: space.md }}>
        <Link href="/admin/redaktion/bucket" style={{ color: v("--color-accent") }}>
          ← Story-Bucket
        </Link>
        <span style={{ color: v("--color-text-muted") }}> · {fund.kennung}</span>
      </p>

      {/* Was fehlt, steht ÜBER dem Tisch. Darunter läse es niemand, der den
          Entwurf gerade für fertig hält. */}
      <ul
        style={{
          margin: `0 0 ${space.lg}px`,
          padding: pad("md", "md"),
          listStyle: "none",
          border: `1px solid ${v("--color-border-accent")}`,
          borderRadius: v("--radius-md"),
          background: v("--color-bg-accent"),
          maxWidth: 760,
        }}
      >
        <li style={{ fontWeight: 600, fontSize: 13, marginBottom: space.xs }}>Was noch fehlt</li>
        {entwurf.offen.map((o, i) => (
          <li key={i} style={{ fontSize: 13, color: v("--color-text-secondary") }}>
            · {o}
          </li>
        ))}
      </ul>

      <StoryListe
        eintraege={[
          {
            post: entwurf,
            // Ein Entwurf hat keine Freigabe und ist nie gesendet worden —
            // beides leer, statt etwas vorzutäuschen.
            pruefungen: [],
            abdruck: fassungsAbdruck({ text: entwurf.text, bild: entwurf.bild }),
            befunde: pruefeMechanisch(entwurf, k),
            gesendetAm: {},
          },
        ]}
      />
    </>
  );
}
