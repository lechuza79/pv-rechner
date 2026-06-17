import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../../components/Header";
import { IconArrowRight } from "../../../../components/Icons";
import { v } from "../../../../lib/theme";
import { pageMetadata } from "../../../../lib/seo";
import { bundeslaenderWithCities, citiesInBundesland, cityPath, slugify } from "../../../../lib/atlas-cities";
import { getFundingPrograms } from "../../../../lib/funding-data";
import { landProgramBundeslaender, fundingAmount, type FundingProgram } from "../../../../lib/funding-programs";
import { FundingStatusBadge, FundingRates } from "../../../../components/FundingProgramParts";

// ISR: read live funding data from Supabase, re-render at most hourly.
export const revalidate = 3600;

// Bundesländer that get a page: those with cities AND those with a Land-level
// program (e.g. Berlin has no cities here but a landesweites Programm).
function allBundeslaender(): { name: string; slug: string }[] {
  const m = new Map<string, string>();
  for (const b of bundeslaenderWithCities()) m.set(b.slug, b.name);
  for (const b of landProgramBundeslaender()) m.set(b.slug, b.name);
  return Array.from(m, ([slug, name]) => ({ slug, name }));
}

export function generateStaticParams() {
  return allBundeslaender().map((bl) => ({ bundesland: bl.slug }));
}

function blName(slug: string): string | undefined {
  return allBundeslaender().find((bl) => bl.slug === slug)?.name;
}

export async function generateMetadata({ params }: { params: { bundesland: string } }): Promise<Metadata> {
  const name = blName(params.bundesland);
  if (!name) return {};
  const year = new Date().getFullYear();
  return pageMetadata({
    path: `/photovoltaik-foerderung/${params.bundesland}`,
    title: `Photovoltaik-Förderung ${name} ${year} – Programme nach Stadt`,
    description: `Welche Förderung gibt es für Photovoltaik und Speicher in ${name}? Übersicht der Städte mit eigenem Förderprogramm — mit Beträgen und Beispielrechnung.`,
    ogImageTitle: `PV-Förderung in ${name}`,
    ogImageSubtitle: "Programme nach Stadt — mit Beträgen und Beispielrechnung.",
  });
}

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "20px 16px" } as React.CSSProperties,
  wrap: { maxWidth: 720, margin: "0 auto" } as React.CSSProperties,
  breadcrumb: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: 6 } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" } as React.CSSProperties,
  intro: { fontSize: 15, lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 22px" } as React.CSSProperties,
  card: { display: "block", background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: "14px 16px", marginBottom: 10, textDecoration: "none", color: "inherit" } as React.CSSProperties,
};

function LandProgramBox({ p }: { p: FundingProgram }) {
  const a = fundingAmount(p, 10, 5, 20000);
  return (
    <div style={{ ...S.card, borderColor: p.status === "aktiv" ? v("--color-positive") : v("--color-border"), background: v("--color-bg-muted") }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
        <FundingStatusBadge status={p.status} />
      </div>
      <div style={{ fontSize: 12, color: v("--color-text-secondary"), marginBottom: 8 }}>{p.traeger}</div>
      <div style={{ fontSize: 13, color: v("--color-text-secondary"), marginBottom: 8 }}>
        Förderfähig: <span style={{ color: v("--color-text-primary") }}>{p.coveredCosts}</span>
      </div>
      <div style={{ marginBottom: 10 }}>
        <FundingRates rates={p.rates} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", fontSize: 12 }}>
        <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent"), textDecoration: "none" }}>Zur Quelle</a>
        {a.computable && a.active && (
          <Link href={`/photovoltaik-rechner?foe=${p.id}`} style={{ color: v("--color-accent"), textDecoration: "none" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Im Rechner anwenden <IconArrowRight size={11} /></span>
          </Link>
        )}
        <span style={{ color: v("--color-text-muted") }}>Stand: {p.stand}{p.verified ? "" : " · unbestätigt"}</span>
      </div>
    </div>
  );
}

export default async function BundeslandPage({ params }: { params: { bundesland: string } }) {
  const name = blName(params.bundesland);
  if (!name) notFound();

  const cities = citiesInBundesland(params.bundesland);
  const programs = await getFundingPrograms();
  const byId = new Map(programs.map((p) => [p.id, p]));
  const landPrograms = programs.filter(
    (p) => p.level === "land" && p.bundesland != null && slugify(p.bundesland) === params.bundesland,
  );

  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <nav style={{ ...S.breadcrumb, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 20 }} aria-label="Brotkrümel">
          <Link href="/photovoltaik-foerderung" style={{ color: "inherit", textDecoration: "none" }}>Förderung</Link>
          <span aria-hidden style={{ width: 14, height: 1, background: v("--color-text-faint"), display: "inline-block" }} />
          <span style={{ color: v("--color-text-primary") }}>{name}</span>
        </nav>

        <h1 style={S.h1}>Photovoltaik-Förderung in {name}</h1>
        <p style={S.intro}>
          {landPrograms.length > 0 && cities.length > 0
            ? <>In {name} gibt es eine landesweite Förderung; zusätzlich fördern einzelne Städte auf kommunaler Ebene. Bundesweit gilt zusätzlich die 0 % Mehrwertsteuer auf Kauf und Installation.</>
            : landPrograms.length > 0
            ? <>In {name} wird Photovoltaik über ein landesweites Programm gefördert. Bundesweit gilt zusätzlich die 0 % Mehrwertsteuer auf Kauf und Installation.</>
            : <>In {name} wird Photovoltaik vor allem auf kommunaler Ebene gefördert. Die folgenden Städte haben ein eigenes Förderprogramm — wähle deine Stadt, um die Konditionen und eine Beispielrechnung zu sehen. Bundesweit gilt zusätzlich die 0 % Mehrwertsteuer auf Kauf und Installation.</>}
        </p>

        {landPrograms.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>Landesweite Förderung</h2>
            {landPrograms.map((p) => <LandProgramBox key={p.id} p={p} />)}
          </div>
        )}

        {landPrograms.length > 0 && cities.length > 0 && (
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>Förderung nach Stadt</h2>
        )}

        {cities.map((c) => {
          const f: FundingProgram | undefined = c.fundingId ? byId.get(c.fundingId) : undefined;
          return (
            <Link key={c.slug} href={cityPath(c)} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</span>
                {f && <FundingStatusBadge status={f.status} />}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: v("--color-text-secondary") }}>
                  {f ? f.name : "Anlagenbestand und Beispielrechnungen"}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: v("--color-accent"), whiteSpace: "nowrap" }}>
                  Ansehen <IconArrowRight size={12} />
                </span>
              </div>
            </Link>
          );
        })}

        <Link href="/photovoltaik-foerderung" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 14, fontSize: 13, color: v("--color-accent"), textDecoration: "none" }}>
          Alle Förderprogramme im Überblick <IconArrowRight size={11} />
        </Link>

        <p style={{ fontSize: 11, color: v("--color-text-muted"), lineHeight: 1.6, marginTop: 24 }}>
          Auswahl der wichtigsten Programme — Förderung ist dezentral und ändert sich laufend. Alle Angaben
          ohne Gewähr; verbindlich ist die jeweilige offizielle Quelle des Programms.
        </p>
      </div>
    </div>
  );
}
