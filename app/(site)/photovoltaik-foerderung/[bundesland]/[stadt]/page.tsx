import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "../../../../../components/Header";
import { IconArrowRight, IconChevronLeft } from "../../../../../components/Icons";
import { v } from "../../../../../lib/theme";
import { pageMetadata } from "../../../../../lib/seo";
import { ATLAS_CITIES, cityBySlug, slugify, type AtlasCity } from "../../../../../lib/atlas-cities";
import { fundingAmount, type FundingProgram } from "../../../../../lib/funding-programs";
import { getFundingPrograms, getFundingProgramById } from "../../../../../lib/funding-data";
import { FundingRates, FundingConditions } from "../../../../../components/FundingProgramParts";
import { buildFundingFaq } from "../../../../../lib/funding-faq";
import { getRegionAtlasData, type RegionAtlas } from "../../../../../lib/mastr-data";
import { calc, calcEigenverbrauch, estimateCost, calcWeightedFeedIn } from "../../../../../lib/calc";
import { DEFAULT_FEED_IN } from "../../../../../lib/feedin-config";

// ISR: read live funding data from Supabase, re-render at most hourly.
export const revalidate = 3600;

export function generateStaticParams() {
  return ATLAS_CITIES.map((c) => ({ bundesland: slugify(c.bundesland), stadt: c.slug }));
}

export async function generateMetadata({ params }: { params: { bundesland: string; stadt: string } }): Promise<Metadata> {
  const city = cityBySlug(params.stadt);
  if (!city || slugify(city.bundesland) !== params.bundesland) return {};
  const f = city.fundingId ? await getFundingProgramById(city.fundingId) : undefined;
  const year = new Date().getFullYear();
  return pageMetadata({
    path: `/photovoltaik-foerderung/${slugify(city.bundesland)}/${city.slug}`,
    title: `Photovoltaik-Förderung ${city.name} ${year} – Zuschüsse & Bestand`,
    description: `Wie viele Solaranlagen gibt es in ${city.name}? Aktueller Anlagenbestand aus dem Marktstammdatenregister${f ? `, das ${f.name}` : ""} und Beispielrechnungen für deine PV-Anlage.`,
    ogImageTitle: `Photovoltaik in ${city.name}`,
    ogImageSubtitle: f ? `Bestand & ${f.name}` : "Anlagenbestand & Beispielrechnungen",
  });
}

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

// Capacity: show kWp below 1 MWp (so small segments don't collapse to "0 MWp"),
// MWp with one decimal up to 10, no decimals above.
function fmtCapacity(kwp: number): string {
  if (kwp < 1000) return `${nf(kwp)} kWp`;
  const mwp = kwp / 1000;
  return `${mwp.toLocaleString("de-DE", { maximumFractionDigits: mwp < 10 ? 1 : 0 })} MWp`;
}

const SEGMENT_LABEL: Record<string, string> = {
  privat_dach: "Private Dächer",
  gewerbe_dach: "Gewerbedächer",
  freiflaeche: "Freiflächen-Parks",
};

type Example = {
  kwp: number;
  spKwh: number;
  brutto: number;
  foerderung: number;
  /** True if a concrete € amount could be derived; false for free-text-only programs. */
  foerderComputable: boolean;
  netto: number;
  amort: number | null;
  total: number;
};

function buildExamples(city: AtlasCity, f: FundingProgram | undefined): Example[] {
  const configs = [
    { kwp: 5, spKwh: 0 },
    { kwp: 10, spKwh: 5 },
    { kwp: 15, spKwh: 10 },
  ];
  return configs.map(({ kwp, spKwh }) => {
    const ertragKwp = city.yieldKwhKwp;
    const ev = calcEigenverbrauch({
      personenIdx: 2, nutzungIdx: 1, speicherKwh: spKwh,
      wp: "nein", ea: "nein", eaKm: 15000, kwp, ertragKwp,
    });
    const brutto = estimateCost(kwp, spKwh);
    const einspeisung = calcWeightedFeedIn(kwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10);
    // Shared funding math (single source of truth, also used by the rechner).
    const fa = fundingAmount(f, kwp, spKwh, brutto);
    const foerderComputable = fa.computable;
    // Nur abziehen, wenn das Programm aktuell auch Anträge annimmt.
    const foerderung = fa.active ? fa.total : 0;
    const netto = Math.max(0, brutto - foerderung);
    // Statische Beispiel-Annahmen (Strompreis 0,34 €/kWh, DEFAULT_PRICES via
    // estimateCost): die Seite wird zur Build-Zeit statisch generiert, daher
    // bewusst keine Live-Preise (usePrices) wie im interaktiven Rechner. Die
    // Zahlen sind illustrativ — der CTA führt in den Rechner mit Live-Werten.
    const result = calc({
      kwp, kosten: netto, strompreis: 0.34, eigenverbrauch: ev,
      einspeisung, stromSteigerung: 0.03, ertragKwp, monthly: null,
    });
    return { kwp, spKwh, brutto, foerderung, foerderComputable, netto, amort: result.be ? result.be.i : null, total: result.total };
  });
}

function ZubauChart({ years }: { years: { year: number; count: number }[] }) {
  const currentYear = new Date().getFullYear();
  // Drop the partial current year and anything pre-2014 (sparse).
  const rows = years.filter((y) => y.year >= 2014 && y.year < currentYear);
  if (rows.length < 3) return null;
  const max = Math.max(...rows.map((r) => r.count));
  const peak = rows.reduce((a, b) => (b.count > a.count ? b : a));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 150 }}>
        {rows.map((r) => (
          <div key={r.year} title={`${r.year}: ${nf(r.count)} neue Anlagen`} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{
              width: "100%",
              height: `${Math.max(2, Math.round((r.count / max) * 100))}%`,
              background: r.year === peak.year ? v("--color-accent") : v("--color-accent-light"),
              borderRadius: "3px 3px 0 0",
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {rows.map((r) => (
          <div key={r.year} style={{ flex: 1, textAlign: "center", fontSize: 9, color: v("--color-text-muted"), fontFamily: v("--font-mono") }}>
            {r.year % 2 === 0 ? `'${String(r.year).slice(2)}` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), color: v("--color-text-primary"), minHeight: "100vh", padding: "20px 16px" } as React.CSSProperties,
  wrap: { maxWidth: 720, margin: "0 auto" } as React.CSSProperties,
  breadcrumb: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: 6 } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" } as React.CSSProperties,
  intro: { fontSize: 15, lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 22px" } as React.CSSProperties,
  strong: { color: v("--color-text-primary"), fontWeight: 600 } as React.CSSProperties,
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 28 } as React.CSSProperties,
  metric: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: 14 } as React.CSSProperties,
  metricLabel: { fontSize: 12, color: v("--color-text-secondary"), marginBottom: 4 } as React.CSSProperties,
  metricValue: { fontFamily: v("--font-mono"), fontSize: 22, fontWeight: 700 } as React.CSSProperties,
  h2: { fontSize: 16, fontWeight: 700, margin: "0 0 4px" } as React.CSSProperties,
  sub: { fontSize: 12, color: v("--color-text-muted"), margin: "0 0 14px" } as React.CSSProperties,
  section: { marginBottom: 28 } as React.CSSProperties,
  card: { background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: "16px 18px" } as React.CSSProperties,
};

export default async function StadtPage({ params }: { params: { bundesland: string; stadt: string } }) {
  const city = cityBySlug(params.stadt);
  // Guard the hierarchy: the Bundesland segment must match the city, otherwise
  // a wrong-Bundesland URL would render a valid page under a bogus parent.
  if (!city || slugify(city.bundesland) !== params.bundesland) notFound();

  let atlas: RegionAtlas | null = null;
  try {
    atlas = await getRegionAtlasData(city.ags);
  } catch {
    atlas = null;
  }

  const programs = await getFundingPrograms();
  const byId = new Map(programs.map((p) => [p.id, p]));
  const f = city.fundingId ? byId.get(city.fundingId) : undefined;
  const examples = buildExamples(city, f);
  // Förderung im Rechner vorab scharf schalten — nur wenn sie sich pauschal
  // berechnen lässt UND aktuell Anträge angenommen werden.
  const ctaFoe = f && f.status === "aktiv" && examples[0]?.foerderComputable ? `&foe=${f.id}` : "";
  const combinable = (f?.combinableWith ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is FundingProgram => Boolean(p));
  const currentYear = new Date().getFullYear();
  const lastFullYear = atlas?.solar.by_year.filter((y) => y.year < currentYear).slice(-1)[0];
  // FAQ aus den Förderdaten generiert (kein separater Datensatz).
  const faq = buildFundingFaq(city.name, f, { amortYears: examples[1]?.amort ?? examples[0]?.amort ?? null });
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };

  return (
    <div style={S.page}>
      <Header />
      <div style={S.wrap}>
        <Link href={`/photovoltaik-foerderung/${slugify(city.bundesland)}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 13, fontWeight: 600, color: v("--color-accent"), textDecoration: "none", marginBottom: 12 }}>
          <IconChevronLeft size={15} /> {city.bundesland}
        </Link>
        <nav style={{ ...S.breadcrumb, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 20 }} aria-label="Brotkrümel">
          <Link href="/photovoltaik-foerderung" style={{ color: "inherit", textDecoration: "none" }}>Förderung</Link>
          <span aria-hidden style={{ width: 14, height: 1, background: v("--color-text-faint"), display: "inline-block" }} />
          <Link href={`/photovoltaik-foerderung/${slugify(city.bundesland)}`} style={{ color: "inherit", textDecoration: "none" }}>{city.bundesland}</Link>
          <span aria-hidden style={{ width: 14, height: 1, background: v("--color-text-faint"), display: "inline-block" }} />
          <span style={{ color: v("--color-text-primary") }}>{city.name}</span>
        </nav>
        <h1 style={S.h1}>Photovoltaik in {city.name}</h1>
        <p style={S.intro}>
          {!f
            ? <>Anlagenbestand und Beispielrechnungen für Photovoltaik in {city.name}.</>
            : f.status === "aktiv"
            ? <>In {city.name} fördert die Stadt neue Solaranlagen über das <span style={S.strong}>{f.name}</span> — zusätzlich zur bundesweiten 0 % Mehrwertsteuer. Was sich damit rechnet:</>
            : <>In {city.name} gibt es mit dem <span style={S.strong}>{f.name}</span> ein kommunales Förderprogramm — {f.status === "pausiert" ? "aktuell aber pausiert (keine neuen Anträge)" : "aktuell aber ausgeschöpft"}. Bundesweit gilt die 0 % Mehrwertsteuer.</>}
        </p>

        {/* ── Förderung (oben) ── */}
        {f && (
          <div style={S.section}>
            <h2 style={S.h2}>Förderung in {city.name}</h2>
            <p style={S.sub}>{f.name} · {f.traeger}</p>
            <div style={{ ...S.card, borderColor: v("--color-positive"), background: v("--color-bg-muted") }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {f.eligibility.map((e) => (
                  <span key={e} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: v("--color-positive"), background: v("--color-bg"), border: `1px solid ${v("--color-positive")}`, borderRadius: 999, padding: "3px 10px" }}>
                    {e === "privat" ? "Privat" : "Gewerblich"}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 13, color: v("--color-text-secondary"), marginBottom: 14 }}>
                Förderfähig: <span style={{ color: v("--color-text-primary"), fontWeight: 600 }}>{f.coveredCosts}</span>
                {f.maxFoerderung ? ` · ${f.maxFoerderung}` : ""}
              </div>
              <div style={{ marginBottom: 14 }}>
                <FundingRates rates={f.rates} bordered />
              </div>
              <FundingConditions conditions={f.conditions} />
              {combinable.length > 0 && (
                <div style={{ fontSize: 13, color: v("--color-text-secondary"), marginTop: 12 }}>
                  Kombinierbar mit:{" "}
                  {combinable.map((p, i) => (
                    <span key={p.id}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent"), textDecoration: "none" }}>{p.name}</a>
                      {i < combinable.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: 12 }}>
                Stand: {f.stand}{f.capped ? " · Topf gedeckelt, vor Antrag prüfen" : ""} ·{" "}
                <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent") }}>Zum Programm</a>
              </div>
            </div>
            <Link href="/photovoltaik-foerderung" style={{ display: "inline-block", marginTop: 10, fontSize: 13, color: v("--color-accent"), textDecoration: "none" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>Alle Förderprogramme im Überblick <IconArrowRight size={11} /></span>
            </Link>
          </div>
        )}

        {/* ── Beispielrechnungen ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Beispielrechnungen für {city.name}</h2>
          <p style={S.sub}>Typische Anlagen, gerechnet mit {nf(city.yieldKwhKwp)} kWh/kWp{f?.status === "aktiv" && examples.some((e) => e.foerderung > 0) ? " inkl. lokaler Förderung" : ""}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {examples.map((ex) => (
              <div key={ex.kwp} style={S.card}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{ex.kwp} kWp</div>
                <div style={{ fontSize: 12, color: v("--color-text-muted"), marginBottom: 12 }}>
                  {ex.spKwh > 0 ? `mit ${ex.spKwh} kWh Speicher` : "ohne Speicher"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: v("--color-text-secondary") }}>Investition</span>
                    <span style={{ fontFamily: v("--font-mono") }}>{nf(ex.brutto)} €</span>
                  </div>
                  {ex.foerderung > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: v("--color-text-secondary") }}>Förderung</span>
                      <span style={{ fontFamily: v("--font-mono"), color: v("--color-positive"), fontWeight: 700 }}>− {nf(ex.foerderung)} €</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${v("--color-border")}`, paddingTop: 6 }}>
                    <span style={{ color: v("--color-text-secondary") }}>Amortisation</span>
                    <span style={{ fontFamily: v("--font-mono"), fontWeight: 700 }}>{ex.amort !== null ? `${ex.amort} Jahre` : "> 25 J."}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: v("--color-text-secondary") }}>Rendite 25 J.</span>
                    <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: ex.total > 0 ? v("--color-positive") : v("--color-negative") }}>{ex.total > 0 ? "+" : ""}{nf(ex.total)} €</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {f && f.status !== "aktiv" ? (
            <p style={{ ...S.sub, marginTop: 12, marginBottom: 0 }}>
              Die Förderung über das {f.name} ist {f.status === "pausiert" ? "aktuell pausiert" : "aktuell ausgeschöpft"} —
              die Beispiele rechnen daher ohne. Status oben prüfen.
            </p>
          ) : f && !examples[0]?.foerderComputable ? (
            <p style={{ ...S.sub, marginTop: 12, marginBottom: 0 }}>
              Die Förderung über das {f.name} hängt vom Anlagentyp ab (siehe oben) und ist hier
              nicht pauschal pro Anlage eingerechnet.
            </p>
          ) : null}
        </div>

        {/* ── CTA ── */}
        <div style={{ ...S.card, background: v("--color-bg-accent"), borderColor: v("--color-border-accent"), marginBottom: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: v("--color-accent"), marginBottom: 4 }}>Was würde sich für dich rechnen?</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary"), marginBottom: 14 }}>
            {city.name} liefert rund {nf(city.yieldKwhKwp)} kWh pro kWp. Rechne mit deinen eigenen Werten.
          </div>
          <Link href={`/photovoltaik-rechner?er=${city.yieldKwhKwp}${ctaFoe}`} style={{ display: "inline-block", textDecoration: "none", padding: "10px 18px", borderRadius: v("--radius-md"), fontSize: 14, fontWeight: 700, background: v("--color-accent"), color: v("--color-text-on-accent") }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{ctaFoe ? `Mit Förderung rechnen` : `Für ${city.name} rechnen`} <IconArrowRight size={13} /></span>
          </Link>
        </div>

        {/* ── FAQ (aus Förderdaten generiert) ── */}
        <div style={S.section}>
          <h2 style={S.h2}>Häufige Fragen zur PV-Förderung in {city.name}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {faq.map((item) => (
              <details key={item.q} style={{ background: v("--color-bg"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: "12px 14px" }}>
                <summary style={{ fontSize: 14, fontWeight: 700, color: v("--color-text-primary"), cursor: "pointer", listStyle: "none" }}>{item.q}</summary>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary"), margin: "8px 0 0" }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        {/* ── Bestand (Trust-Signal, unten) ── */}
        {atlas && atlas.solar.total_count > 0 && (
          <div style={S.section}>
            <h2 style={S.h2}>Photovoltaik in {city.name} in Zahlen</h2>
            <p style={S.sub}>Aktueller Anlagenbestand aus dem Marktstammdatenregister</p>
            <div style={S.metricsGrid}>
              <div style={S.metric}>
                <div style={S.metricLabel}>Solaranlagen</div>
                <div style={S.metricValue}>{nf(atlas.solar.total_count)}</div>
              </div>
              <div style={S.metric}>
                <div style={S.metricLabel}>Installiert</div>
                <div style={S.metricValue}>{fmtCapacity(atlas.solar.total_kwp)}</div>
              </div>
              <div style={S.metric}>
                <div style={S.metricLabel}>Batteriespeicher</div>
                <div style={S.metricValue}>{nf(atlas.speicher.count)}</div>
              </div>
              {lastFullYear && (
                <div style={S.metric}>
                  <div style={S.metricLabel}>Neu in {lastFullYear.year}</div>
                  <div style={S.metricValue}>{nf(lastFullYear.count)}</div>
                </div>
              )}
            </div>

            {atlas.solar.by_year.length >= 4 && (
              <div style={{ marginBottom: 22 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>Zubau pro Jahr</h3>
                <p style={S.sub}>Neu in Betrieb genommene Solaranlagen</p>
                <ZubauChart years={atlas.solar.by_year} />
              </div>
            )}

            {atlas.solar.by_segment.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Wo der Strom erzeugt wird</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {(() => {
                    const maxKwp = Math.max(...atlas.solar.by_segment.map((s) => s.kwp));
                    return atlas.solar.by_segment.map((s) => (
                      <div key={s.segment}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                          <span>{SEGMENT_LABEL[s.segment] ?? s.segment}</span>
                          <span style={{ color: v("--color-text-secondary"), fontFamily: v("--font-mono") }}>{fmtCapacity(s.kwp)} · {nf(s.count)} Anlagen</span>
                        </div>
                        <div style={{ height: 8, background: v("--color-bg-muted"), borderRadius: 4 }}>
                          <div style={{ height: "100%", width: `${Math.max(3, Math.round((s.kwp / maxKwp) * 100))}%`, background: v("--color-accent"), borderRadius: 4 }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Disclaimer ── */}
        <div style={{ fontSize: 11, color: v("--color-text-muted"), lineHeight: 1.6, borderTop: `1px solid ${v("--color-border")}`, paddingTop: 12, marginBottom: 32 }}>
          Bestandsdaten: Marktstammdatenregister (Bundesnetzagentur){atlas?.data_as_of ? `, Stand ${atlas.data_as_of}` : ""}, monatlich aktualisiert.
          {f ? ` Förderdaten redaktionell gepflegt, Stand ${f.stand}.` : ""}
          {" "}Alle Angaben sind Näherungswerte ohne Anspruch auf Richtigkeit, Aktualität oder Vollständigkeit und stellen keine
          Rechts-, Steuer- oder Anlageberatung dar. Förderkonditionen ändern sich und Budgets können erschöpft sein — verbindlich
          ist allein die offizielle Quelle des jeweiligen Programms. Beispielrechnungen sind unverbindliche Schätzungen.
        </div>

      </div>
    </div>
  );
}
