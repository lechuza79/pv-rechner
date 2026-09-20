import type { Metadata } from "next";
import { Suspense } from "react";
import { v, space } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { strommixFaq } from "../../../lib/faq";
import Faq from "../../../components/Faq";
import RelatedLinks from "../../../components/RelatedLinks";
import EnergieClient from "./client";

export const metadata: Metadata = pageMetadata({
  path: "/strommix-deutschland",
  title: "Strommix Deutschland aktuell – Live: Solar, Wind, Kohle | Solar Check",
  description:
    "Der deutsche Strommix live und aktuell: wie viel Solar, Wind, Kohle und Gas gerade im Netz sind — heute, im Monat und im Jahresvergleich. Daten: Fraunhofer ISE.",
  ogImageTitle: "Deutschlands Strommix — live",
  ogImageSubtitle: "Solar, Wind, Gas, Kohle — stündlich aktuell. Quelle: Fraunhofer ISE.",
  keywords: [
    "Strommix Deutschland",
    "Strommix Deutschland aktuell",
    "Strommix Deutschland live",
    "Stromerzeugung Deutschland aktuell",
    "Erneuerbare Energien Anteil",
  ],
});

// Reading-flow styles for the explainer below the interactive chart.
const S = {
  h2: {
    fontSize: v("--font-size-lead"),
    fontWeight: 800 as const,
    letterSpacing: "-0.01em",
    margin: `${space.xxl}px 0 ${space.md}px`,
  },
  p: {
    fontSize: v("--font-size-body"),
    lineHeight: 1.7,
    color: v("--color-text-secondary"),
    margin: `0 0 ${space.md}px`,
  },
};

export default function EnergiePage() {
  return (
    <div
      style={{
        background: v("--color-bg"),
        fontFamily: v("--font-text"),
        color: v("--color-text-primary"),
        minHeight: "100vh",
        padding: "0 16px 20px",
      }}
    >
      <Suspense fallback={null}>
        <EnergieClient />
      </Suspense>

      {/* Server-rendered explainer + FAQ: the SEO substance under the live tool. */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <section>
          <h2 style={S.h2}>So liest du den Strommix</h2>
          <p style={S.p}>
            Die Grafik zeigt die öffentliche Nettostromerzeugung in Deutschland —
            also allen Strom, der ins öffentliche Netz eingespeist wird —
            aufgeschlüsselt nach Energieträgern und in 15-Minuten-Schritten
            aktualisiert. Grün ist erneuerbar (Wind, Solar, Wasser, Biomasse),
            Grau ist fossil (Kohle, Gas, Öl).
          </p>
          <p style={S.p}>
            Der Tagesrhythmus ist gut erkennbar: Solarstrom baut sich am Vormittag
            auf, erreicht mittags seine Spitze und fällt zum Abend wieder auf
            null. Wind kennt dagegen keinen festen Rhythmus — er liefert mal
            tagelang viel, mal fast nichts. Nachts und bei Flaute schließen
            steuerbare Kraftwerke, Importe und zunehmend große Batteriespeicher
            die Lücke.
          </p>
          <p style={S.p}>
            Übers Jahr gesehen ergänzen sich Sonne und Wind: Solar liefert den
            Großteil seines Ertrags im Sommerhalbjahr, Wind ist in den
            Wintermonaten am stärksten. Genau deshalb lohnt der Blick auf ganze
            Jahre über die Zeitraum-Auswahl oben — einzelne Tage sagen wenig
            über das System.
          </p>
        </section>

        <Faq
          items={strommixFaq()}
          title="Häufige Fragen zum Strommix"
          currentPath="/strommix-deutschland"
        />

        <RelatedLinks
          currentPath="/strommix-deutschland"
          links={[
            {
              href: "/atomstrom-import",
              label: "Wie viel Atomstrom importiert Deutschland?",
              desc: "Die Auswertung zeigt, welcher Teil der Stromimporte rechnerisch aus Kernkraft stammt.",
            },
            {
              href: "/photovoltaik-zubau-deutschland",
              label: "PV-Zubau in Deutschland",
              desc: "Wie schnell die installierte Solarleistung wächst — und was das für den Strommix bedeutet.",
            },
            {
              href: "/pv-simulation",
              label: "PV-Live-Simulation",
              desc: "Was eine eigene Solaranlage an deinem Standort gerade jetzt erzeugen würde.",
            },
          ]}
        />
      </div>
    </div>
  );
}
