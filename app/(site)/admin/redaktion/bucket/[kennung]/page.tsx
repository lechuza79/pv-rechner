import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdminSession } from "../../../../../../lib/admin-guard";
import { leseFund } from "../../../../../../lib/social-fundvorrat";
import { entwurfAus, OFFENE_STELLE } from "../../../../../../lib/social-entwurf";
import { adresseLesbar } from "../../../../../../lib/fachbetrieb-extrakt";
import { socialKennzahlen } from "../../../../../../lib/social-kennzahlen";
import { quellenzeile } from "../../../../../../lib/social-posts";
import { SocialKarte } from "../../../../../../components/social/SocialKarte";
import AdminSeitenkopf from "../../../../../../components/admin/AdminSeitenkopf";
import { v, space, pad } from "../../../../../../lib/theme";

// Der Entwurf zu einem Fund: fertiges Bild, Textrumpf, und sichtbar das, was
// noch fehlt.
//
// DIE OFFENE STELLE IST DER PUNKT DER SEITE. Sie mit einer plausibel
// klingenden Zeile zu füllen wäre leicht und wäre der Fehler: Eine gefüllte
// Lücke merkt niemand, eine offene sieht jeder. Der letzte Absatz eines
// Beitrags ist bei allen bestehenden ein eigener Gedanke — und genau der
// unterscheidet ihn von einer Datenmeldung.
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
  const [vorText, nachText] = entwurf.text.split(OFFENE_STELLE);

  return (
    <>
      <AdminSeitenkopf
        titel="Entwurf"
        hilfe={
          "Aus einem Fund gebaut: Das Bild steht, der Textrumpf auch. Was fehlt, " +
          "ist markiert — vor allem der letzte Absatz. Der Entwurf wird bei jedem " +
          "Aufruf neu gerechnet, trägt also immer den aktuellen Stand."
        }
      />

      <p style={{ fontSize: 13, marginBottom: space.md }}>
        <Link href="/admin/redaktion/bucket" style={{ color: v("--color-accent") }}>
          ← Story-Bucket
        </Link>
        <span style={{ color: v("--color-text-muted") }}> · {fund.kennung}</span>
      </p>

      {/* Was fehlt, steht ÜBER dem Entwurf. Darunter läse es niemand, der den
          Entwurf gerade für fertig hält. */}
      <ul
        style={{
          margin: `0 0 ${space.lg}px`,
          padding: pad("md", "md"),
          listStyle: "none",
          border: `1px solid ${v("--color-border-accent")}`,
          borderRadius: v("--radius-md"),
          background: v("--color-bg-accent"),
          maxWidth: 820,
        }}
      >
        <li style={{ fontWeight: 600, fontSize: 13, marginBottom: space.xs }}>
          Was noch fehlt
        </li>
        {entwurf.offen.map((o, i) => (
          <li key={i} style={{ fontSize: 13, color: v("--color-text-secondary") }}>
            · {o}
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", flexWrap: "wrap", gap: space.xl, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 420px", maxWidth: 560 }}>
          <h2 style={{ fontSize: 15, margin: `0 0 ${space.sm}px` }}>Beitragstext</h2>
          <div
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 14,
              lineHeight: 1.55,
              padding: pad("md", "md"),
              border: `1px solid ${v("--color-border")}`,
              borderRadius: v("--radius-md"),
            }}
          >
            {vorText}
            <mark
              style={{
                display: "inline-block",
                padding: pad("xs", "sm"),
                borderRadius: v("--radius-sm"),
                background: v("--color-accent-dim"),
                color: v("--color-accent-dark"),
                fontWeight: 600,
              }}
            >
              {OFFENE_STELLE}
            </mark>
            {nachText}
          </div>

          <h2 style={{ fontSize: 15, margin: `${space.lg}px 0 ${space.sm}px` }}>
            Was ein Prüfer nachrechnen muss
          </h2>
          <ul style={{ margin: 0, paddingLeft: space.lg, fontSize: 13, lineHeight: 1.6 }}>
            {entwurf.belege.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
            <li style={{ color: v("--color-text-muted") }}>{fund.grundlage}</li>
          </ul>
        </div>

        <div style={{ flex: "0 0 auto" }}>
          <h2 style={{ fontSize: 15, margin: `0 0 ${space.sm}px` }}>Bild</h2>
          {entwurf.bild ? (
            <SocialKarte bild={entwurf.bild} skala={0.42} />
          ) : (
            <p style={{ fontSize: 13, color: v("--color-text-muted"), maxWidth: 320 }}>
              Dieser Fund trägt keine Zahlen, aus denen sich eine Karte bauen ließe — das
              Bild muss von Hand entstehen.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
