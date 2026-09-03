import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { v, space, pad } from "../../../../lib/theme";
import { seiteFuerKennung, anzeigename, kurzname } from "../../../../lib/fachbetrieb-seite";
import InfoTooltip from "../../../../components/InfoTooltip";
import Logo from "../../../../components/Logo";
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { kennung } = await props.params;
  // Die Adress-Parameter tragen den geteilten Rechenstand. Sie NICHT
  // durchzureichen war der erste Fehler dieser Seite: Ein Link, den jemand von
  // hier aus geteilt hat, landete wieder am Anfang des Frageflusses — die
  // Rechnung war weg, ohne dass es jemandem aufgefallen wäre.
  const searchParams = await props.searchParams;
  const seite = await seiteFuerKennung(kennung);
  if (!seite) notFound();

  const name = anzeigename(seite);
  // Der Kurzname ohne Rechtsform trägt Kopf und Knöpfe — „Ergebnis an Elektro
  // Mustermann GmbH & Co. KG schicken" ist als Beschriftung unbrauchbar.
  const kurz = kurzname(name);
  const istVorschlag = seite.zustand === "vorschlag";

  return (
    <div style={S.page}>
      {/* Betrieb und Herkunft stehen NEBENEINANDER und als Gruppe mittig. Der
          Ort steht nicht mehr dabei — wer über die Website seines Betriebs
          kommt, weiß, wo der sitzt. */}
      <header style={S.kopf}>
        <div style={S.kopfInner}>
          <div style={S.betriebZeile}>
            {seite.logoUrl && (
              /* Das Zeichen des Betriebs. Ohne Herkunftsangabe geladen, damit
                 sein Server nicht erfährt, von welcher Seite der Abruf kommt.
                 Fehlt es, bleibt der Platz leer — ein Ersatzbild würde eine
                 Marke behaupten, die es nicht gibt. */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seite.logoUrl}
                alt=""
                width={28}
                height={28}
                referrerPolicy="no-referrer"
                style={S.betriebLogo}
              />
            )}
            <span style={S.betrieb}>{kurz}</span>
            {istVorschlag && (
              /* Der Hinweis bleibt SICHTBAR und wandert nicht ganz hinter das
                 Fragezeichen: Er muss im ersten sichtbaren Bereich stehen, sonst
                 trägt er den optischen Gesamteindruck nicht (Legal-Judge). Als
                 Kasten über der ganzen Seite war er lauter als der Inhalt — die
                 Plakette sagt dasselbe, die Begründung steht einen Klick daneben. */
              <span style={S.demo}>
                <span style={S.demoWort}>Demo</span>
                <InfoTooltip title="Was diese Seite ist" ariaLabel="Was diese Seite ist" size={12}>
                  Diese Seite haben wir für {name} vorbereitet, um zu zeigen, wie ein
                  unabhängiger Rechner auf der eigenen Website aussehen könnte. Zwischen{" "}
                  {name} und solar-check.io besteht bislang keine Zusammenarbeit und keine
                  Vereinbarung.
                </InfoTooltip>
              </span>
            )}
          </div>
          {/* „Powered by" wie in den eingebetteten Widgets — dieselbe Formel für
              dieselbe Sache: unsere Marke auf einer fremden Kundenreise. */}
          <a href="/" style={S.herkunft} aria-label="Powered by solar-check.io">
            <span style={S.herkunftWort}>Powered by</span>
            <Logo width={88} />
          </a>
        </div>
      </header>


      {/* KEINE eigene Überschrift hier: Der Rechner bringt seine mit
          („Lohnt sich Photovoltaik?"). Eine zweite darüber stand beim ersten
          Bauversuch fast wortgleich daneben. */}
      <div style={S.wrap}>
        <PartnerRechner kennung={seite.kennung} name={kurz} initialParams={searchParams} />
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
    padding: pad("lg", "lg"),
    display: "flex",
    // Nebeneinander und als Gruppe mittig — nicht untereinander gestapelt und
    // nicht an die Ränder gedrückt. Letzteres sah aus wie eine
    // Navigationsleiste ohne Navigation.
    alignItems: "center",
    justifyContent: "center",
    gap: space.xl,
    flexWrap: "wrap" as const,
  },
  betriebZeile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    flexWrap: "wrap" as const,
  },
  betriebLogo: {
    width: 28,
    height: 28,
    objectFit: "contain" as const,
    borderRadius: v("--radius-sm"),
  },
  betrieb: {
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    color: v("--color-text-primary"),
    lineHeight: 1.3,
  },
  herkunft: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    textDecoration: "none",
  },
  herkunftWort: {
    fontSize: v("--font-size-caption"),
    color: v("--color-text-faint"),
  },
  demo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "2px 8px",
    borderRadius: v("--radius-sm"),
    background: v("--color-bg-accent"),
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
    // Mehr Luft unter dem Kopf: Er ist jetzt mittig und wirkt als eigener
    // Block — direkt auf den Rechner gesetzt klebte er daran.
    padding: `${space.xxxl}px 12px ${space.lg}px`,
  },
};
