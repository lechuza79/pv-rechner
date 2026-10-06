import { Metadata } from "next";
import Link from "next/link";
import ArticleMeta from "../../../components/ArticleMeta";
import Breadcrumb from "../../../components/Breadcrumb";
import EditorialPage from "../../../components/EditorialPage";
import editorial from "../../../components/EditorialContent.module.css";
import Faq from "../../../components/Faq";
import { DataSourceNote } from "../../../components/PoweredBy";
import RelatedLinks from "../../../components/RelatedLinks";
import { DATA_SOURCES } from "../../../lib/data-sources";
import { neigungswinkelFaq } from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import {
  TILT_OPTIMUM,
  TILT_ORIENTATIONS,
  TILT_REFERENCE,
  TILT_TABLE,
  tiltPct,
} from "../../../lib/tilt-config";
import TiltCheck from "./TiltCheck";

export const metadata: Metadata = pageMetadata({
  path: "/photovoltaik-neigungswinkel",
  title: "Photovoltaik-Neigungswinkel: Tabelle & optimaler Winkel für dein Dach",
  description:
    "Welcher Neigungswinkel ist optimal für Photovoltaik? Tabelle mit dem Ertrag für jede Kombination aus Dachneigung und Ausrichtung — plus Schnell-Check für dein Dach. Aus PVGIS-Daten, kostenlos, ohne Anmeldung.",
  ogImageTitle: "Welcher Neigungswinkel ist optimal?",
  ogImageSubtitle: "Ertrags-Tabelle für jede Dachneigung und Ausrichtung.",
});

// ─── Styles (content-page conventions, same tokens as the Ratgeber) ──────────
// Page-specific comparison and data presentation.
const S = {
  th: {
    textAlign: "right" as const,
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap" as const,
  },
};

export default function NeigungswinkelPage() {
  const faqItems = neigungswinkelFaq();
  return (
    <EditorialPage>

        <Breadcrumb variant="compact"
          items={[
            { label: "Start", href: "/" },
            { label: "Ratgeber", href: "/ratgeber" },
            { label: "Neigungswinkel & Ausrichtung" },
          ]}
          jsonLd
        />
        <ArticleMeta
          headline="Photovoltaik-Neigungswinkel: Tabelle & optimaler Winkel"
          description="Ertrag je Dachneigung und Ausrichtung, als Anteil vom Optimum — mit Schnell-Check."
          path="/photovoltaik-neigungswinkel"
          published="2026-08-04"
          modified="2026-08-04"
        />

        <h1 className={editorial.h1}>Photovoltaik-Neigungswinkel: Was dein Dach wirklich bringt</h1>
        <p className={editorial.subtitle}>
          Die Tabelle zeigt für jede Kombination aus Dachneigung und Ausrichtung, wie viel
          Ertrag im Vergleich zum perfekten Dach übrig bleibt — gerechnet aus den
          Sonnenstandsdaten der EU-Kommission, nicht aus Faustformeln.
        </p>

        <div className={editorial.hero}>
          <span className={editorial.strong}>Die kurze Antwort:</span> Das Optimum liegt bei einem
          Süddach mit {TILT_OPTIMUM.minAngle} bis {TILT_OPTIMUM.maxAngle} Grad Neigung.
          Aber der Spielraum ist groß — zwischen 25 und 50 Grad verliert ein Süddach fast
          nichts, und selbst ein Ost-West-Dach liefert noch rund {tiltPct("ostwest", 30)} Prozent
          je Seite. Ein „falsches" Dach ist fast nie ein Grund, auf Photovoltaik zu verzichten.
        </div>

        <h2 className={editorial.h2}>Die Tabelle: Ertrag nach Neigung und Ausrichtung</h2>
        <p className={editorial.p}>
          Alle Werte in Prozent des optimalen Ertrags (Süd, {TILT_OPTIMUM.minAngle}–{TILT_OPTIMUM.maxAngle}°
          = 100 %). 0° ist ein Flachdach, 90° eine senkrechte Fassade. Südost und Südwest
          sowie Ost und West unterscheiden sich um höchstens einen Punkt und sind deshalb
          zusammengefasst.
        </p>
        <div style={{ overflowX: "auto", marginBottom: 16 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420 }}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign: "left" }}>Neigung</th>
                {TILT_ORIENTATIONS.map((o) => (
                  <th key={o.key} style={S.th}>{o.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TILT_TABLE.map((row) => (
                <tr key={row.angle}>
                  <td style={{ fontSize: v("--font-size-body"), color: v("--color-text-muted"), padding: "8px 6px", borderBottom: `1px solid ${v("--color-border")}` }}>
                    {row.angle}°{row.angle === 0 ? " (flach)" : row.angle === 90 ? " (Fassade)" : ""}
                  </td>
                  {TILT_ORIENTATIONS.map((o) => {
                    const val = row[o.key];
                    return (
                      <td
                        key={o.key}
                        style={{
                          fontFamily: v("--font-mono"),
                          fontSize: v("--font-size-body"),
                          textAlign: "right",
                          padding: "8px 6px",
                          borderBottom: `1px solid ${v("--color-border")}`,
                          color: val === 100 ? v("--color-positive-text") : v("--color-text-primary"),
                          fontWeight: val === 100 ? 700 : 400,
                        }}
                      >
                        {val} %
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={editorial.small} style={{ marginBottom: 24 }}>
          <DataSourceNote source={DATA_SOURCES.pvgis} /> Referenzstandort Mitte Deutschlands
          ({TILT_REFERENCE.method}), Abruf {TILT_REFERENCE.fetchedIso.split("-").reverse().join(".")}.
          Die Prozentwerte gelten in ganz Deutschland nahezu unverändert; der absolute Ertrag
          deines Orts kommt in unseren Rechnern live von PVGIS.
        </p>

        <h2 className={editorial.h2}>Schnell-Check für dein Dach</h2>
        <p className={editorial.p}>
          Ausrichtung und Neigung wählen — der Wert zeigt, wie nah dein Dach am Optimum liegt.
        </p>
        <TiltCheck />

        <h2 className={editorial.h2}>Warum der Winkel weniger wichtig ist, als viele denken</h2>
        <p className={editorial.p}>
          Die Sonne wandert über Tag und Jahr — deshalb gibt es keinen Winkel, der immer
          perfekt ist, sondern nur einen besten Kompromiss übers Jahr. Genau darum ist die
          Kurve um das Optimum so flach: Ob {TILT_OPTIMUM.minAngle}° oder 25°, macht am
          Jahresende nur wenige Prozent aus. Spürbar wird es erst bei steilen Fassaden
          ({tiltPct("sued", 90)} % bei Süd) oder bei Norddächern.
        </p>
        <p className={editorial.p}>
          <span className={editorial.strong}>Wichtiger als der Winkel sind in der Praxis:</span> Verschattung
          (Bäume, Gauben, Nachbargebäude), die nutzbare Fläche — und die Frage, wie viel vom
          Solarstrom du selbst verbrauchst. Eine <Link href="/photovoltaik-rechner" className={editorial.link}>passend
          dimensionierte Anlage</Link> auf einem 90-%-Dach schlägt eine zu kleine Anlage auf dem
          perfekten Dach.
        </p>
        <p className={editorial.p}>
          <span className={editorial.strong}>Ost-West hat einen versteckten Vorteil:</span> Die Erzeugung
          verteilt sich auf Morgen und Abend — also auf die Stunden, in denen zu Hause
          tatsächlich Strom gebraucht wird. Das erhöht den Eigenverbrauch, und der spart pro
          Kilowattstunde rund das Vierfache der Einspeisevergütung.
        </p>

        {/* ── FAQ (visible accordion + FAQPage JSON-LD from the same data) ── */}
        <Faq items={faqItems} title="Häufige Fragen zu Neigung und Ausrichtung" currentPath="/photovoltaik-neigungswinkel" />

        <RelatedLinks
          currentPath="/photovoltaik-neigungswinkel"
          links={[
            { href: "/pv-simulation", label: "PV-Simulation: Was produziert ein Dach gerade?", desc: "Live-Leistung einer PV-Anlage an deinem Standort, gerechnet aus aktuellen Wetterdaten." },
            { href: "/photovoltaik-rechner", label: "PV-Rechner: Welche Anlage passt zu mir?", desc: "In wenigen Fragen zur passenden Anlagengröße — mit Amortisation, Rendite und Begründung." },
            { href: "/balkonkraftwerk/rechner", label: "Balkonkraftwerk-Rechner", desc: "Für Miete oder ohne eigenes Dach: was Steckersolar bringt und wann es sich amortisiert." },
            { href: "/glossar", label: "Glossar" },
          ]}
        />

    </EditorialPage>
  );
}
