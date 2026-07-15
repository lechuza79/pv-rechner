import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../../components/Header";
import Breadcrumb from "../../../../components/Breadcrumb";
import { IconArrowRight } from "../../../../components/Icons";
import { v } from "../../../../lib/theme";
import { pageMetadata } from "../../../../lib/seo";
import { publishedBundeslaender, publishedCitiesInBundesland, cityPath, slugify } from "../../../../lib/atlas-cities";
import { getFundingPrograms } from "../../../../lib/funding-data";
import { landProgramBundeslaender, fundingAmount, fundingStandLabel, type FundingProgram } from "../../../../lib/funding-programs";
import { FundingStatusBadge, FundingRates } from "../../../../components/FundingProgramParts";
import { BUNDESLAENDER } from "../../../../lib/mastr-regions";
import { getRegionSummary, type RegionSummary } from "../../../../lib/mastr-data";

// ISR: read live funding data from Supabase, re-render at most hourly.
export const revalidate = 3600;
// Only Bundesländer with at least one live (active) program get a page.
export const dynamicParams = false;

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

// Capacity: kWp below 1 MWp, MWp (one decimal up to 10, else none), GWp above 1 GWp.
function fmtCapacity(kwp: number): string {
  if (kwp < 1000) return `${nf(kwp)} kWp`;
  const mwp = kwp / 1000;
  if (mwp < 1000) return `${mwp.toLocaleString("de-DE", { maximumFractionDigits: mwp < 10 ? 1 : 0 })} MWp`;
  const gwp = mwp / 1000;
  return `${gwp.toLocaleString("de-DE", { maximumFractionDigits: 1 })} GWp`;
}

/** 2-digit Bundesland AGS for the MaStR stock query, matched by name. */
function bundeslandAgs(name: string): string | undefined {
  return BUNDESLAENDER.find((b) => b.name === name)?.ags;
}

// Bundesländer that get a page: those with published cities (live or archived)
// AND those with a Land-level program (e.g. Berlin has no cities here but a
// landesweites Programm).
function allBundeslaender(): { name: string; slug: string }[] {
  const m = new Map<string, string>();
  for (const b of publishedBundeslaender()) m.set(b.slug, b.name);
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
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, margin: "10px 0 14px" } as React.CSSProperties,
  metric: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: 14 } as React.CSSProperties,
  metricLabel: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: 4 } as React.CSSProperties,
  metricValue: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700 } as React.CSSProperties,
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
        <span style={{ color: v("--color-text-muted") }}>{fundingStandLabel(p)}</span>
      </div>
    </div>
  );
}

export default async function BundeslandPage({ params }: { params: { bundesland: string } }) {
  const name = blName(params.bundesland);
  if (!name) notFound();

  const cities = publishedCitiesInBundesland(params.bundesland);
  const programs = await getFundingPrograms();
  const byId = new Map(programs.map((p) => [p.id, p]));
  const landPrograms = programs.filter(
    (p) => p.level === "land" && p.status === "aktiv" && p.bundesland != null && slugify(p.bundesland) === params.bundesland,
  );

  // Aggregate solar stock for the whole Bundesland (MaStR), as a trust signal.
  let solar: RegionSummary | null = null;
  const blAgs = bundeslandAgs(name);
  if (blAgs) {
    try {
      solar = await getRegionSummary(blAgs, "solar");
    } catch {
      solar = null;
    }
  }

  // Active municipal programs that currently pay out a computable grant — named
  // in the intro so the page leads with the concrete benefit.
  const activeCityNames = cities
    .map((c) => (c.fundingId ? byId.get(c.fundingId) : undefined))
    .filter((p): p is FundingProgram => Boolean(p) && p!.status === "aktiv" && fundingAmount(p!, 10, 5, 20000).computable)
    .map((p) => p.region);

  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <Breadcrumb
          items={[{ label: "Förderung", href: "/photovoltaik-foerderung" }, { label: name }]}
        />

        <h1 style={S.h1}>Photovoltaik-Förderung in {name}</h1>
        <p style={S.intro}>
          {landPrograms.length > 0 && cities.length > 0
            ? <>In {name} gibt es eine landesweite Förderung; zusätzlich fördern einzelne Städte auf kommunaler Ebene. Bundesweit gilt zusätzlich die 0 % Mehrwertsteuer auf Kauf und Installation.</>
            : landPrograms.length > 0
            ? <>In {name} wird Photovoltaik über ein landesweites Programm gefördert. Bundesweit gilt zusätzlich die 0 % Mehrwertsteuer auf Kauf und Installation.</>
            : <>In {name} wird Photovoltaik vor allem auf kommunaler Ebene gefördert. Die folgenden Städte und Kreise haben ein eigenes Förderprogramm — wähle deinen Ort, um die Konditionen und eine Beispielrechnung zu sehen. Bundesweit gilt zusätzlich die 0 % Mehrwertsteuer auf Kauf und Installation.</>}
        </p>
        {(cities.length > 0 || solar) && (
          <p style={S.intro}>
            {cities.length > 0 && (
              <>Wir haben {cities.length === 1 ? "einen Ort" : `${cities.length} Orte`} in {name} im Blick
              {activeCityNames.length > 0
                ? <> — aktuell zahlt {activeCityNames.length === 1 ? <><span style={{ color: v("--color-text-primary"), fontWeight: 600 }}>{activeCityNames[0]}</span> einen kommunalen Zuschuss</> : <>in {activeCityNames.slice(0, 3).join(", ")} ein kommunaler Zuschuss</>}.</>
                : <>. Eigene kommunale Zuschüsse sind hier derzeit selten — die Seiten zeigen den Anlagenbestand und ehrliche Beispielrechnungen.</>}
              {" "}</>
            )}
            {solar && solar.total_count > 0 && (
              <>In {name} sind bereits rund <span style={{ color: v("--color-text-primary"), fontWeight: 600 }}>{nf(solar.total_count)}</span> Solaranlagen mit zusammen {fmtCapacity(solar.total_kwp)} in Betrieb.</>
            )}
          </p>
        )}

        {landPrograms.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>Landesweite Förderung</h2>
            {landPrograms.map((p) => <LandProgramBox key={p.id} p={p} />)}
          </div>
        )}

        {landPrograms.length > 0 && cities.length > 0 && (
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 10px" }}>Förderung nach Ort</h2>
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

        {solar && solar.total_count > 0 && (
          <div style={{ marginTop: 26 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 2px" }}>Photovoltaik in {name} in Zahlen</h2>
            <p style={{ fontSize: 12, color: v("--color-text-muted"), margin: "0 0 4px" }}>Anlagenbestand aus dem Marktstammdatenregister</p>
            <div style={S.metricsGrid}>
              <div style={S.metric}>
                <div style={S.metricLabel}>Solaranlagen</div>
                <div style={S.metricValue}>{nf(solar.total_count)}</div>
              </div>
              <div style={S.metric}>
                <div style={S.metricLabel}>Installiert</div>
                <div style={S.metricValue}>{fmtCapacity(solar.total_kwp)}</div>
              </div>
            </div>
          </div>
        )}

        <Link href="/photovoltaik-foerderung" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 14, fontSize: 13, color: v("--color-accent"), textDecoration: "none" }}>
          Alle Förderprogramme im Überblick <IconArrowRight size={11} />
        </Link>

        <p style={{ fontSize: 11, color: v("--color-text-muted"), lineHeight: 1.6, marginTop: 24 }}>
          Auswahl der wichtigsten Programme — Förderung ist dezentral und ändert sich laufend. Alle Angaben
          ohne Gewähr; verbindlich ist die jeweilige offizielle Quelle des Programms.
          {solar && solar.total_count > 0 && (
            <>
              {" "}Bestandsdaten: Marktstammdatenregister (Bundesnetzagentur), Stand {solar.data_as_of}, Datenlizenz{" "}
              <a
                href="https://www.govdata.de/dl-de/by-2-0"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                dl-de/by-2-0
              </a>{" "}
              (Daten aggregiert).
            </>
          )}
        </p>
      </div>
    </div>
  );
}
