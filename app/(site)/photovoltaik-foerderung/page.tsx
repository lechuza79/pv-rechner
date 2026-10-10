import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "../../../components/Icons";
import { v, iconSizes } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { ATLAS_CITIES, cityPath, slugify, foerderBundeslaender, publishedBundeslaender, type AtlasCity } from "../../../lib/atlas-cities";
import { ortPraeposition } from "../../../lib/atlas-orte";
import { fundingZaehlt, fundingStandLabel, type FundingProgram } from "../../../lib/funding-programs";
import { getFundingPrograms } from "../../../lib/funding-data";
import FundingOverviewCard from "../../../components/FundingOverviewCard";

// ISR: SEO pages read the live dataset from Supabase but re-render at most
// hourly, so admin/verification edits appear without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  path: "/photovoltaik-foerderung",
  title: `Photovoltaik-Förderung ${new Date().getFullYear()}: alle Programme nach Bundesland`,
  description:
    "Welche Förderung gibt es für Photovoltaik und Batteriespeicher? Übersicht der Programme von Bund, Ländern und Kommunen — mit Beträgen, Bedingungen und Status.",
  ogImageTitle: "PV-Förderung im Überblick",
  ogImageSubtitle: "Bund, Länder & Kommunen — Beträge, Bedingungen, Status.",
});

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "0 16px 20px" } as React.CSSProperties,
  wrap: { maxWidth: 720, margin: "0 auto" } as React.CSSProperties,
  h1: { margin: "0 0 8px" } as React.CSSProperties,
  intro: { fontSize: v("--font-size-body"), lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 20px" } as React.CSSProperties,
  nav: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 } as React.CSSProperties,
  navLink: { fontSize: v("--font-size-small"), color: v("--color-accent"), background: v("--color-bg-accent"), border: `1px solid ${v("--color-border-accent")}`, borderRadius: 999, padding: "4px 12px", textDecoration: "none" } as React.CSSProperties,
  h2: { margin: "28px 0 12px", scrollMarginTop: 16 } as React.CSSProperties,
};

function ProgramCard({ p, city }: { p: FundingProgram; city?: AtlasCity }) {
  return <FundingOverviewCard selected={{programm: p, standLabel: fundingStandLabel(p), zaehlt: fundingZaehlt(p),
    geltungsbereich: p.level === "bund" ? "Bundesweit" : p.region || (p.level === "land" ? p.bundesland : p.traeger) || p.traeger}}
    ort={city?.name ?? p.region ?? p.bundesland ?? "Deutschland"} detailHref={city ? cityPath(city) : undefined} />;
}

export default async function FoerderungPage() {
  const programs = await getFundingPrograms();
  const cityByFundingId = new Map(ATLAS_CITIES.filter((c) => c.fundingId).map((c) => [c.fundingId!, c]));

  // Policy: nur Programme zeigen, die aktuell Anträge annehmen (status "aktiv").
  // Inaktive bleiben im Datensatz (Archiv), erscheinen aber nicht in der Übersicht.
  const bund = programs.filter((p) => p.level === "bund" && p.status === "aktiv");
  const regional = programs.filter((p) => p.level !== "bund" && p.status === "aktiv");
  const byLand = new Map<string, FundingProgram[]>();
  for (const p of regional) {
    const bl = p.bundesland ?? "Sonstige";
    const list = byLand.get(bl) ?? [];
    list.push(p);
    byLand.set(bl, list);
  }
  const laender = Array.from(byLand.keys()).sort((a, b) => a.localeCompare(b, "de"));
  // Bundesländer mit eigener Seite — dieselbe Liste, aus der die Landesseite
  // ihre Adressen baut. Die frühere Fassung fragte die Städte mit aktivem
  // Programm; ein Land, dessen Programme nur Balkonkraftwerke fördern (das
  // Saarland), bekam so einen Link auf eine 404 (Audit 27.09.2026).
  const blWithPage = new Set(foerderBundeslaender().map((b) => b.slug));
  const blMitStaedten = new Set(publishedBundeslaender().map((b) => b.slug));

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>Photovoltaik-Förderung im Überblick</h1>
        <p style={S.intro}>
          Photovoltaik-Förderung gibt es auf drei Ebenen: Bund, Land und Kommune — für die Anlage selbst und oft auch für den Speicher.
          Die Programme lassen sich meist <strong style={{ color: v("--color-text-primary"), fontWeight: 600 }}>miteinander kombinieren</strong>,
          die kommunalen Töpfe sind aber oft gedeckelt. Der Antrag muss in der Regel <strong style={{ color: v("--color-text-primary"), fontWeight: 600 }}>vor dem Kauf oder der Montage</strong> gestellt werden.
        </p>

        <div style={S.nav}>
          <a href="#bundesweit" style={S.navLink}>Bundesweit</a>
          {laender.map((bl) => (
            <a key={bl} href={`#${slugify(bl)}`} style={S.navLink}>{bl}</a>
          ))}
        </div>

        <h2 id="bundesweit" style={S.h2}>Bundesweit</h2>
        {bund.map((p) => <ProgramCard key={p.id} p={p} city={cityByFundingId.get(p.id)} />)}

        {laender.map((bl) => (
          <div key={bl}>
            <h2 id={slugify(bl)} style={S.h2}>{bl}</h2>
            {blWithPage.has(slugify(bl)) && (
              <Link href={`/photovoltaik-foerderung/${slugify(bl)}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: v("--font-size-small"), color: v("--color-accent"), textDecoration: "none", marginBottom: 10 }}>
                {blMitStaedten.has(slugify(bl)) ? `Alle Städte ${ortPraeposition(bl)} ${bl}` : `${bl}-Förderung im Detail`} <IconArrowRight size={iconSizes.xs} />
              </Link>
            )}
            {byLand.get(bl)!.map((p) => <ProgramCard key={p.id} p={p} city={cityByFundingId.get(p.id)} />)}
          </div>
        ))}

        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6, marginTop: 24 }}>
          Auswahl der wichtigsten Programme — kommunale Förderung ist dezentral und ändert sich laufend.
          Ohne Anspruch auf Vollständigkeit; verbindlich ist die jeweilige offizielle Quelle.
        </p>
      </div>
    </div>
  );
}
