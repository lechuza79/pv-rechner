import type { Metadata } from "next";
import Link from "next/link";
import Header from "../../../components/Header";
import { IconArrowRight } from "../../../components/Icons";
import { v } from "../../../lib/theme";
import { pageMetadata } from "../../../lib/seo";
import { ATLAS_CITIES } from "../../../lib/atlas-cities";
import { fundingAmount, type FundingProgram, type FundingStatus } from "../../../lib/funding-programs";
import { getFundingPrograms } from "../../../lib/funding-data";

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

const STATUS_LABEL: Record<FundingStatus, string> = {
  aktiv: "aktiv", ausgeschoepft: "ausgeschöpft", pausiert: "pausiert", eingestellt: "eingestellt", unsicher: "Status unklar",
};

function statusColor(s: FundingStatus): string {
  return s === "aktiv" ? v("--color-positive") : v("--color-text-muted");
}

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

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>{text}</span>
  );
}

function ProgramCard({ p, citySlug }: { p: FundingProgram; citySlug?: string }) {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
        <Badge text={STATUS_LABEL[p.status]} color={statusColor(p.status)} />
      </div>
      <div style={{ ...S.label, marginBottom: 8 }}>{LEVEL_LABEL[p.level]} · {p.traeger}</div>
      <div style={{ fontSize: 13, color: v("--color-text-secondary"), marginBottom: 8 }}>
        Förderfähig: <span style={{ color: v("--color-text-primary") }}>{p.coveredCosts}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {p.rates.map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
            <span style={{ color: v("--color-text-secondary") }}>{r.label}</span>
            <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, textAlign: "right" }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", fontSize: 12 }}>
        <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent"), textDecoration: "none" }}>Zur Quelle</a>
        {(() => {
          const a = fundingAmount(p, 10, 5, 20000);
          return a.computable && a.active ? (
            <Link href={`/photovoltaik-rechner?foe=${p.id}`} style={{ color: v("--color-accent"), textDecoration: "none" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Im Rechner anwenden <IconArrowRight size={11} /></span>
            </Link>
          ) : null;
        })()}
        {citySlug && (
          <Link href={`/photovoltaik-foerderung/${citySlug}`} style={{ color: v("--color-accent"), textDecoration: "none" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Stadt-Seite <IconArrowRight size={11} /></span>
          </Link>
        )}
        <span style={{ color: v("--color-text-muted") }}>Stand: {p.stand}{p.verified ? "" : " · unbestätigt"}</span>
      </div>
    </div>
  );
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function FoerderungPage() {
  const programs = await getFundingPrograms();
  const cityByFundingId = new Map(ATLAS_CITIES.filter((c) => c.fundingId).map((c) => [c.fundingId!, c.slug]));

  const bund = programs.filter((p) => p.level === "bund");
  const regional = programs.filter((p) => p.level !== "bund");
  const byLand = new Map<string, FundingProgram[]>();
  for (const p of regional) {
    const bl = p.bundesland ?? "Sonstige";
    const list = byLand.get(bl) ?? [];
    list.push(p);
    byLand.set(bl, list);
  }
  const laender = Array.from(byLand.keys()).sort((a, b) => a.localeCompare(b, "de"));

  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <h1 style={S.h1}>PV-Förderung im Überblick</h1>
        <p style={S.intro}>
          Förderung für Photovoltaik und Speicher gibt es auf drei Ebenen — Bund, Land und Kommune.
          Sie lässt sich meist <strong style={{ color: v("--color-text-primary"), fontWeight: 600 }}>kombinieren</strong>,
          aber kommunale Töpfe sind oft gedeckelt. Antrag fast immer <strong style={{ color: v("--color-text-primary"), fontWeight: 600 }}>vor</strong> Kauf oder Montage.
        </p>

        <div style={S.nav}>
          <a href="#bundesweit" style={S.navLink}>Bundesweit</a>
          {laender.map((bl) => (
            <a key={bl} href={`#${slugify(bl)}`} style={S.navLink}>{bl}</a>
          ))}
        </div>

        <h2 id="bundesweit" style={S.h2}>Bundesweit</h2>
        {bund.map((p) => <ProgramCard key={p.id} p={p} citySlug={cityByFundingId.get(p.id)} />)}

        {laender.map((bl) => (
          <div key={bl}>
            <h2 id={slugify(bl)} style={S.h2}>{bl}</h2>
            {byLand.get(bl)!.map((p) => <ProgramCard key={p.id} p={p} citySlug={cityByFundingId.get(p.id)} />)}
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
