import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../../components/Header";
import { IconArrowRight, IconChevronRight } from "../../../../components/Icons";
import { v } from "../../../../lib/theme";
import { pageMetadata } from "../../../../lib/seo";
import { bundeslaenderWithCities, citiesInBundesland, cityPath } from "../../../../lib/atlas-cities";
import { getFundingPrograms } from "../../../../lib/funding-data";
import type { FundingProgram, FundingStatus } from "../../../../lib/funding-programs";

// ISR: read live funding data from Supabase, re-render at most hourly.
export const revalidate = 3600;

export function generateStaticParams() {
  return bundeslaenderWithCities().map((bl) => ({ bundesland: bl.slug }));
}

function blName(slug: string): string | undefined {
  return bundeslaenderWithCities().find((bl) => bl.slug === slug)?.name;
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

const STATUS_LABEL: Record<FundingStatus, string> = {
  aktiv: "aktiv", ausgeschoepft: "ausgeschöpft", pausiert: "pausiert", eingestellt: "eingestellt", unsicher: "Status unklar",
};

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "20px 16px" } as React.CSSProperties,
  wrap: { maxWidth: 720, margin: "0 auto" } as React.CSSProperties,
  breadcrumb: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: 6 } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" } as React.CSSProperties,
  intro: { fontSize: 15, lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 22px" } as React.CSSProperties,
  card: { display: "block", background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: "14px 16px", marginBottom: 10, textDecoration: "none", color: "inherit" } as React.CSSProperties,
};

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap" }}>{text}</span>;
}

export default async function BundeslandPage({ params }: { params: { bundesland: string } }) {
  const name = blName(params.bundesland);
  if (!name) notFound();

  const cities = citiesInBundesland(params.bundesland);
  const programs = await getFundingPrograms();
  const byId = new Map(programs.map((p) => [p.id, p]));

  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <nav style={{ ...S.breadcrumb, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }} aria-label="Brotkrümel">
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Solar Check</Link>
          <IconChevronRight size={12} color={v("--color-text-faint")} />
          <Link href="/photovoltaik-foerderung" style={{ color: "inherit", textDecoration: "none" }}>Förderung</Link>
          <IconChevronRight size={12} color={v("--color-text-faint")} />
          <span style={{ color: v("--color-text-primary") }}>{name}</span>
        </nav>

        <h1 style={S.h1}>Photovoltaik-Förderung in {name}</h1>
        <p style={S.intro}>
          In {name} wird Photovoltaik vor allem auf kommunaler Ebene gefördert. Die folgenden Städte haben ein
          eigenes Förderprogramm — wähle deine Stadt, um die Konditionen und eine Beispielrechnung zu sehen.
          Bundesweit gilt zusätzlich die 0 % Mehrwertsteuer auf Kauf und Installation.
        </p>

        {cities.map((c) => {
          const f: FundingProgram | undefined = c.fundingId ? byId.get(c.fundingId) : undefined;
          return (
            <Link key={c.slug} href={cityPath(c)} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</span>
                {f && <Badge text={STATUS_LABEL[f.status]} color={f.status === "aktiv" ? v("--color-positive") : v("--color-text-muted")} />}
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
          Auswahl der wichtigsten Städte mit eigenem Programm — kommunale Förderung ist dezentral und ändert
          sich laufend. Ohne Anspruch auf Vollständigkeit; verbindlich ist die jeweilige offizielle Quelle.
        </p>
      </div>
    </div>
  );
}
