import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { v, space, pad } from "../../../../lib/theme";
import { seiteFuerKennung, anzeigename } from "../../../../lib/fachbetrieb-seite";
import InfoTooltip from "../../../../components/InfoTooltip";
import PartnerRechner from "./PartnerRechner";

/**
 * Die betriebseigene Rechner-Seite.
 *
 * Warum es sie gibt, warum die Adresse eine Kennung trägt und warum sie nicht
 * indexiert wird: `lib/fachbetrieb-seite.ts`.
 *
 * Kein `loading.tsx` in dieser Route und kein Vorziehen des Datenteils vor die
 * Routing-Entscheidung: Eine Suspense-Grenze um die ganze Route legt den
 * Statuscode fest, BEVOR feststeht, ob es die Kennung überhaupt gibt — eine
 * erfundene Adresse antwortete dann mit 200 und der 404-Seite im Text (die
 * Soft-404-Falle, die den Atlas schon einmal getroffen hat).
 */

// Kein Vorrendern: Die Kennungen entstehen aus einem Geheimnis, das zur
// Bauzeit nicht gebraucht werden soll, und die Seiten sind Einzelaufrufe.
export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ kennung: string }>;
}): Promise<Metadata> {
  const { kennung } = await props.params;
  const seite = await seiteFuerKennung(kennung);
  const name = seite ? anzeigename(seite) : "Fachbetrieb";
  return {
    title: `PV-Rechner für ${name} – Solar Check`,
    // Die Sperre ist der Kern des Angebots, nicht Vorsicht: Diese Seite darf
    // bei Google niemals gegen die Website des Betriebs antreten.
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function FachbetriebSeite(props: {
  params: Promise<{ kennung: string }>;
}) {
  const { kennung } = await props.params;
  const seite = await seiteFuerKennung(kennung);
  if (!seite) notFound();

  const name = anzeigename(seite);
  const istVorschlag = seite.zustand === "vorschlag";

  return (
    <div style={S.page}>
      {/* Der Kopf trägt den NAMEN, nicht das Logo. Vor einer Freigabe ist die
          Logo-Verwendung markenrechtlich nicht gedeckt, und der Name trägt den
          Zweck ebenso gut (zwei Legal-Judges, 01.09.2026). */}
      <header style={S.kopf}>
        <div style={S.kopfInner}>
          <div>
            <div style={S.betrieb}>{name}</div>
            {(seite.ort || seite.plz) && (
              <div style={S.ort}>
                {[seite.plz, seite.ort].filter(Boolean).join(" ")}
              </div>
            )}
            {istVorschlag && (
              /* Der Hinweis bleibt SICHTBAR und wandert nicht ganz hinter das
                 Fragezeichen: Er muss im ersten sichtbaren Bereich stehen, sonst
                 trägt er den optischen Gesamteindruck nicht (Legal-Judge). Als
                 Kasten über der ganzen Seite war er allerdings lauter als der
                 Inhalt — die kurze Zeile sagt dasselbe, die Begründung steht
                 einen Klick daneben. */
              <div style={S.demo}>
                <span style={S.demoWort}>Demo-Ansicht</span>
                <InfoTooltip title="Was diese Seite ist" ariaLabel="Was diese Seite ist" size={12}>
                  Diese Seite haben wir für {name} vorbereitet, um zu zeigen, wie ein
                  unabhängiger Rechner auf der eigenen Website aussehen könnte. Zwischen{" "}
                  {name} und solar-check.io besteht bislang keine Zusammenarbeit und keine
                  Vereinbarung.
                </InfoTooltip>
              </div>
            )}
          </div>
          {/* Die Herkunft steht im ersten sichtbaren Bereich, nicht im Fuß —
              sonst trägt der Hinweis den optischen Gesamteindruck nicht. */}
          <div style={S.herkunft}>
            Rechner von{" "}
            <a href="/" style={S.herkunftLink}>
              solar-check.io
            </a>
          </div>
        </div>
      </header>


      {/* KEINE eigene Überschrift hier: Der Rechner bringt seine mit
          („Lohnt sich Photovoltaik?"). Eine zweite darüber stand beim ersten
          Bauversuch fast wortgleich daneben. */}
      <div style={S.wrap}>
        <PartnerRechner kennung={seite.kennung} />
      </div>
    </div>
  );
}

const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
  },
  kopf: {
    borderBottom: `1px solid ${v("--color-border")}`,
    background: v("--color-bg-muted"),
  },
  kopfInner: {
    maxWidth: v("--content-max-width"),
    margin: "0 auto",
    padding: pad("md", "lg"),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    flexWrap: "wrap" as const,
  },
  betrieb: {
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    lineHeight: 1.3,
  },
  ort: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    marginTop: 2,
  },
  herkunft: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
  },
  herkunftLink: {
    color: v("--color-accent"),
    textDecoration: "none",
    fontWeight: 600,
  },
  demo: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  demoWort: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-faint"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    fontWeight: 700,
  },
  wrap: {
    maxWidth: v("--content-max-width"),
    margin: "0 auto",
    padding: pad("lg", "lg"),
  },
};
