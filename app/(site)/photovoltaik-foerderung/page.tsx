import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowRight } from "../../../components/Icons";
import { v, iconSizes } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { ATLAS_CITIES, cityPath, slugify, liveBundeslaender, type AtlasCity } from "../../../lib/atlas-cities";
import { fundingAmount, fundingStandLabel, landProgramBundeslaender, type FundingProgram } from "../../../lib/funding-programs";
import { getFundingPrograms } from "../../../lib/funding-data";
import { FundingStatusBadge, FundingRates } from "../../../components/FundingProgramParts";

// ISR: SEO pages read the live dataset from Supabase but re-render at most
// hourly, so admin/verification edits appear without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  path: "/photovoltaik-foerderung",
  title: `PV-Förderung ${new Date().getFullYear()} – Übersicht aller Programme nach Bundesland`,
  description:
    "Welche Förderung gibt es für Photovoltaik und Batteriespeicher? Übersicht der Programme von Bund, Ländern und Kommunen — mit Beträgen, Bedingungen und Status.",
  ogImageTitle: "PV-Förderung im Überblick",
  ogImageSubtitle: "Bund, Länder & Kommunen — Beträge, Bedingungen, Status.",
});

const LEVEL_LABEL: Record<FundingProgram["level"], string> = {
  bund: "Bund", land: "Land", landkreis: "Landkreis", kommune: "Kommune",
};

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "20px 16px" } as React.CSSProperties,
  wrap: { maxWidth: 720, margin: "0 auto" } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" } as React.CSSProperties,
  intro: { fontSize: 15, lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 20px" } as React.CSSProperties,
  nav: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 } as React.CSSProperties,
  navLink: { fontSize: 12, color: v("--color-accent"), background: v("--color-bg-accent"), border: `1px solid ${v("--color-border-accent")}`, borderRadius: 999, padding: "4px 12px", textDecoration: "none" } as React.CSSProperties,
  h2: { fontSize: 18, fontWeight: 800, margin: "28px 0 12px", scrollMarginTop: 16 } as React.CSSProperties,
  card: { background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: "14px 16px", marginBottom: 10 } as React.CSSProperties,
  label: { fontSize: 12, color: v("--color-text-secondary") } as React.CSSProperties,
};

function ProgramCard({ p, city }: { p: FundingProgram; city?: AtlasCity }) {
  const a = fundingAmount(p, 10, 5, 20000);
  const inRechner = a.computable && a.active;
  // Primary CTA = the program's own page: the regional city page where one
  // exists, otherwise the official funding source.
  const primaryHref = city ? cityPath(city) : p.url;
  const primaryExternal = !city;
  const primaryLabel = city ? `Förderung in ${city.name} ansehen` : "Zur offiziellen Förderseite";
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
        <FundingStatusBadge status={p.status} />
      </div>
      <div style={{ ...S.label, marginBottom: 8 }}>{LEVEL_LABEL[p.level]} · {p.traeger}</div>
      <div style={{ fontSize: 13, color: v("--color-text-secondary"), marginBottom: 8 }}>
        Förderfähig: <span style={{ color: v("--color-text-primary") }}>{p.coveredCosts}</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <FundingRates rates={p.rates} />
      </div>

      {/* Primary CTA → program page (or official source) */}
      <Link
        href={primaryHref}
        {...(primaryExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
          background: v("--color-accent"), color: v("--color-text-on-accent"),
          fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: v("--radius-md"),
        }}
      >
        {primaryLabel} <IconArrowRight size={iconSizes.sm} color={v("--color-text-on-accent")} />
      </Link>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", fontSize: 12, marginTop: 10 }}>
        {city && (
          <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent"), textDecoration: "none" }}>Zur Quelle</a>
        )}
        {inRechner && (
          <Link href={`/photovoltaik-rechner?foe=${p.id}`} style={{ color: v("--color-accent"), textDecoration: "none" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Im Rechner anwenden <IconArrowRight size={iconSizes.xs} /></span>
          </Link>
        )}
        <span style={{ color: v("--color-text-muted") }}>{fundingStandLabel(p)}</span>
      </div>
    </div>
  );
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
  // Bundesländer mit eigener Seite: mit Städten ODER mit Landesprogramm.
  const blWithPage = new Set([...liveBundeslaender(), ...landProgramBundeslaender()].map((b) => b.slug));

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>PV-Förderung im Überblick</h1>
        <p style={S.intro}>
          Förderung für Photovoltaik und Speicher gibt es auf drei Ebenen: Bund, Land und Kommune.
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
              <Link href={`/photovoltaik-foerderung/${slugify(bl)}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: v("--color-accent"), textDecoration: "none", marginBottom: 10 }}>
                {liveBundeslaender().some((b) => b.slug === slugify(bl)) ? `Alle Städte in ${bl}` : `${bl}-Förderung im Detail`} <IconArrowRight size={iconSizes.xs} />
              </Link>
            )}
            {byLand.get(bl)!.map((p) => <ProgramCard key={p.id} p={p} city={cityByFundingId.get(p.id)} />)}
          </div>
        ))}

        <p style={{ fontSize: 12, color: v("--color-text-muted"), lineHeight: 1.6, marginTop: 24 }}>
          Auswahl der wichtigsten Programme — kommunale Förderung ist dezentral und ändert sich laufend.
          Ohne Anspruch auf Vollständigkeit; verbindlich ist die jeweilige offizielle Quelle.
        </p>
      </div>
    </div>
  );
}
