import foundation from "../../../../../components/social/atlas-foundations.module.css";
import { createHash } from "node:crypto";
import { fundingPromotion } from "../../../../../lib/funding-promotion";
import InfoTooltip from "../../../../../components/InfoTooltip";
import ExampleCard from "../../../../../components/ExampleCard";
import Script from "next/script";
import EditorialPage from "../../../../../components/EditorialPage";
import { fundingExampleAssumptions, buildLocalFundingCases, buildBalconyFundingExample } from "../../../../../lib/funding-examples";
import { FundingLocalHero, FundingProgramSection } from "../../../../../components/FundingPageShell";
import { stadtseiteThema, STADTSEITE_UEBERSCHRIFT } from "../../../../../lib/foerder-stadt-meta";
import editorial from "../../../../../components/EditorialContent.module.css";
import type { StoryConcept } from "../../../../../lib/story-konzepte";
import MunicipalStoryPreview from "../../../../../components/gemeinde/GemeindeInsights";
import { ladeGemeindePaket } from "../../../../../lib/gemeinde-paket-server";
import Faq from "../../../../../components/Faq";
import DataSourcesSection from "../../../../../components/DataSourcesSection";
import SiteFuss from "../../../../../components/SiteFuss";
import { ActionLink } from "../../../../../components/ActionButton";
import { dashboardDate } from "../../../../../lib/dashboard/format";
import OptionalDisclosure from "../../../../../components/OptionalDisclosure";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { IconArrowRight } from "../../../../../components/Icons";
import ArticleTeasers from "../../../../../components/ArticleTeasers";
import { v, iconSizes, space, sectionGap } from "../../../../../lib/theme";
import { pageMetadata } from "../../../../../lib/seo";
import { atlasRobots } from "../../../../../lib/atlas-index";
import { cityBySlug, slugify, isCityPublished, ATLAS_CITIES, cityIndexFreigegeben, foerderStadtUmleitung, fundingListFrom } from "../../../../../lib/atlas-cities";
import { technikenVon, foerdertDach, foerdertTechnik, fundingAmount, fundingStandLabel, fundingZaehlt, type FundingProgram } from "../../../../../lib/funding-programs";
import { getFundingPrograms } from "../../../../../lib/funding-data";
import { getFundingHistoryFor } from "../../../../../lib/funding-history";
import FundingHistory from "../../../../../components/FundingHistory";
import { FundingCaseCards, ExampleCards, FUNDING_STATUS_NOTE } from "../../../../../components/FundingProgramParts";
import { FundingProgramDetails } from "../../../../../components/FundingDetailModal";
import StickyCta from "../../../../../components/StickyCta";
import { FundingAboButton, ABO_OEFFNEN } from "../../../../../components/atlas/GemeindeAboBox";
import { IconGlocke } from "../../../../../components/Icons";
import PvRechnerModal, { PV_RECHNER_HASH } from "../../../../../components/PvRechnerModal";
import FoerderCheckStarter, { FOERDER_CHECK_OEFFNEN } from "../../../../../components/FoerderCheckStarter";
import { buildFundingExamples } from "../../../../../lib/funding-examples";
import { foerderStadtMeta, leitProgramm, stadtseiteFall } from "../../../../../lib/foerder-stadt-meta";
import { FUNDING_STATUS_LABEL } from "../../../../../lib/funding-programs";
import { heuteInBerlin } from "../../../../../lib/zeit";
import { buildFundingFaq } from "../../../../../lib/funding-faq";
import { getRegionAtlasData, type RegionAtlas } from "../../../../../lib/mastr-data";
import { atlasPathForRegionId, getEinzelgemeinden } from "../../../../../lib/atlas";
import { DATA_SOURCES } from "../../../../../lib/data-sources";

// ISR: read live funding data from Supabase, re-render at most hourly.
export const revalidate = 3600;
// EVERY known city gets a route; unknown slugs stay a hard 404 (no on-demand
// rendering of arbitrary addresses). A known city without a published page
// redirects to its Bundesland page (foerderStadtUmleitung) instead of 404ing —
// next.config.js points ~300 historic flat URLs at these addresses, and whether
// a page exists there changes with the program status (audit 28.09.2026: about
// 185 of them ended on a 404). The decision is re-made on every revalidation,
// so a program that becomes active again gets its page back without a deploy
// of the redirect list.
export const dynamicParams = false;

export function generateStaticParams() {
  return ATLAS_CITIES.map((c) => ({ bundesland: slugify(c.bundesland), stadt: c.slug }));
}

export async function generateMetadata(props: { params: Promise<{ bundesland: string; stadt: string }>; searchParams?: Promise<{ variante?: string }> }): Promise<Metadata> {
  const params = await props.params;
  const city = cityBySlug(params.stadt);
  if (!city || slugify(city.bundesland) !== params.bundesland || !isCityPublished(city)) return {};
  // Auch der Seitentitel muss über die abgeleitete Zuordnung gehen — sonst
  // verspricht die Überschrift „Zuschüsse", während die Seite darunter ein
  // eingestelltes Programm zeigt.
  // Every programme of the place (06.10.2026), not only the most specific one.
  const liste = fundingListFrom(await getFundingPrograms(), city);
  const f = leitProgramm(liste);
  const meta = foerderStadtMeta(city.name, liste, heuteInBerlin(new Date()).slice(0, 4));
  return {
    ...pageMetadata({
      path: `/photovoltaik-foerderung/${slugify(city.bundesland)}/${city.slug}`,
      title: meta.title,
      description: meta.description,
      ogImageTitle: `${STADTSEITE_UEBERSCHRIFT[stadtseiteThema(liste)]} in ${city.name}`,
      ...{ogImage: `https://solar-check.io/api/og/funding?stadt=${city.slug}&v=${createHash("sha256").update(JSON.stringify({rates:f?.rates,status:f?.status,checked:f?.lastVerified,promotion:fundingPromotion(f)})).digest("hex").slice(0,12)}`},
      ogImageSubtitle: liste.length > 1 ? `Bestand & ${liste.length} Förderprogramme` : f ? `Bestand & ${f.name}` : "Anlagenbestand & Beispielrechnungen",
    }),
    // Gebaut, aber noch nicht freigegeben → noindex. Dieselbe eine Frage wie in
    // der Sitemap (cityIndexFreigegeben), damit robots-Angabe und Sitemap nicht
    // Gegenteiliges behaupten können.
    robots: atlasRobots(cityIndexFreigegeben(city)),
  };
}

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

// Capacity: show kWp below 1 MWp (so small segments don't collapse to "0 MWp"),
// MWp with one decimal up to 10, no decimals above.
function fmtCapacity(kwp: number): string {
  if (kwp < 1000) return `${nf(kwp)} kWp`;
  const mwp = kwp / 1000;
  return `${mwp.toLocaleString("de-DE", { maximumFractionDigits: mwp < 10 ? 1 : 0 })} MWp`;
}

const S = {
  // Basis-Schriftgröße für die ganze Seite aus dem Token: Alles darunter erbt
  // sie, statt dass jede Stelle ihre eigene Größe mitbringt.
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 28 } as React.CSSProperties,
  metric: { background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: 14 } as React.CSSProperties,
  metricLabel: { fontSize: "var(--font-size-small)", color: v("--color-text-secondary"), marginBottom: 4 } as React.CSSProperties,
  metricValue: { fontFamily: v("--font-mono"), fontSize: v("--font-size-display-sm"), fontWeight: 700 } as React.CSSProperties,
  h2: { fontSize: "var(--font-size-h3)", fontWeight: 700, margin: "0 0 4px" } as React.CSSProperties,
  sub: { fontSize: "var(--font-size-small)", color: v("--color-text-muted"), margin: "0 0 14px" } as React.CSSProperties,
  section: { marginBottom: sectionGap } as React.CSSProperties,
};

export default async function StadtPage(props: { params: Promise<{ bundesland: string; stadt: string }>; searchParams?: Promise<{ variante?: string }> }) {
  const compact = true;
  const params = await props.params;
  const city = cityBySlug(params.stadt);
  // Guard the hierarchy: the Bundesland segment must match the city, otherwise
  // a wrong-Bundesland URL would render a valid page under a bogus parent.
  if (!city || slugify(city.bundesland) !== params.bundesland) notFound();
  // Publish policy: a known city without a page goes to its Bundesland page
  // (temporary — the page returns once the program qualifies again). Routing
  // decision BEFORE any data read, so the status code is still ours to set.
  const umleitung = foerderStadtUmleitung(city);
  if (umleitung) redirect(umleitung);

  let atlas: RegionAtlas | null = null;
  try {
    atlas = await getRegionAtlasData(city.ags);
  } catch {
    atlas = null;
  }

  // Only expose widgets backed by this place's existing weather package.
  const singleTown = city.ags.length === 5 ? (await getEinzelgemeinden(city.ags.slice(0, 2)))[city.ags] : null;
  const widgetAgs = singleTown ? `${city.ags}000` : city.ags;
  const localPackage = await ladeGemeindePaket(widgetAgs).catch(error => {
    console.error("Funding page local widgets unavailable", error);
    return null;
  });
  const localStories = ["feed-in-value", "radial", "electricity-value", "verlauf"]
    .flatMap(template => localPackage?.charts?.charts.filter(item => item.template === template).map(item => item.story as StoryConcept) ?? []);
  const rankingStory = (localPackage?.stories as StoryConcept[] | undefined)?.find(story => story.rankSummary?.length);
  if (rankingStory) localStories.push(rankingStory);

  // Adresse der Atlas-Ortsseite — ABGELEITET, nicht getippt (26.08.2026).
  //
  // Sie setzt sich aus den Slugs der Region und ihrer Eltern zusammen, und die
  // stehen im Melderegister: Der Wetteraukreis heißt dort
  // „landkreis-wetteraukreis", nicht „wetteraukreis". Eine von Hand gebaute
  // Adresse trifft das bei jedem zweiten Kreis nicht — geprüft, indem genau
  // dieser Fehler beim ersten Versuch passiert ist und eine 404 erzeugte, die
  // wie eine gesperrte Seite aussah. Der Kommunen-Brief benutzt dieselbe
  // Ableitung; zwei Wege zu derselben Adresse wären zwei Fehlerquellen.
  let atlasPfad: string | null = null;
  try {
    atlasPfad = await atlasPathForRegionId(city.ags);
  } catch {
    atlasPfad = null;
  }

  const programs = await getFundingPrograms();
  const byId = new Map(programs.map((p) => [p.id, p]));
  // ALLE Programme dieses Orts (06.10.2026) — eigene Gemeinde,
  // Verbandsgemeinde/Amt, Landkreis. Die Seite führt mit dem Programm, dessen
  // Fall die Weiche meldet (leitProgramm), die übrigen folgen als eigene
  // Karten. Jede Karte trägt ihre Bedingungen und ihren Höchstbetrag selbst —
  // nichts wird über Programme hinweg zusammengezählt oder gemischt.
  const liste = fundingListFrom(programs, city);
  const f = leitProgramm(liste);
  const weitere = liste.filter((p) => p !== f);
  const fall = stadtseiteFall(liste);
  const balconyOnly = stadtseiteThema(liste) === "balkon";
  const balconyExample = balconyOnly ? buildBalconyFundingExample(city.yieldKwhKwp, f) : null;
  const calculatorHref = balconyOnly ? "/balkonkraftwerk/rechner" : PV_RECHNER_HASH;
  const calculatorLabel = compact ? (balconyOnly ? "Balkonkraftwerk planen" : "Solaranlage planen") : balconyOnly ? "Balkonkraftwerk durchrechnen" : "Anlage durchrechnen";
  const examples = buildFundingExamples(city.yieldKwhKwp, f);
  const categoryCases = compact ? buildLocalFundingCases(city.yieldKwhKwp, f) : null;
  // Förderung im Rechner vorab scharf schalten — nur wenn sie sich pauschal
  // berechnen lässt UND sie überhaupt noch zählt (Anträge offen + Quellenbeleg
  // frisch, siehe fundingZaehlt). Über den rohen Status zu gehen würde einen
  // Knopf anbieten, der eine Förderung vorbelegt, die der Rechner daneben nicht
  // mehr abzieht.
  const ctaFoe = fundingZaehlt(f) && fundingAmount(f, { technik: "pv", kwp: 5, speicherKwh: 0, kosten: examples[0].brutto }).computable ? `&foe=${f!.id}` : "";
  const kombinierbarMit = (p: FundingProgram): FundingProgram[] =>
    (p.combinableWith ?? [])
      .map((id) => byId.get(id))
      .filter((k): k is FundingProgram => Boolean(k) && technikenVon(p).some(t => foerdertTechnik(k!, t)));
  // Der Förder-Check fragt nach Dachanlage, Speicher oder Balkonkraftwerk —
  // ein reines Wärmepumpen-Programm gehört nicht hinein.
  const checkProgramme = [
    ...new Map(
      liste
        .filter((p) => foerdertDach(p) || foerdertTechnik(p, "balkon"))
        .flatMap((p) => [p, ...kombinierbarMit(p)])
        .map((p) => [p.id, p] as const),
    ).values(),
  ];
  const currentYear = new Date().getFullYear();
  const lastFullYear = atlas?.solar.by_year.filter((y) => y.year < currentYear).slice(-1)[0];
  // Verlauf des Programms: was wir seit Aufzeichnungsbeginn an Wechseln
  // festgestellt haben. Ohne Programm gibt es nichts zu verfolgen; ohne
  // Datenbank oder vor dem ersten Setup kommt eine leere Liste zurück und der
  // Abschnitt blendet sich aus.
  const historien = await Promise.all(liste.map(async (p) => ({ p, eintraege: await getFundingHistoryFor(p.id) })));
  // FAQ aus den Förderdaten generiert (kein separater Datensatz).
  const faq = buildFundingFaq(city.name, liste, { amortYears: examples[1]?.amort ?? examples[0]?.amort ?? null });


  // Keep each programme and its confirmed combinations together.
  const programmKarte = (p: FundingProgram) => (
    <div data-foerderprogramm={p.id}>
      <FundingProgramDetails context="page" variant={compact ? "compact" : "default"}
        programActions={compact && p.id === f?.id ? <>
          <ActionLink href={calculatorHref}>{calculatorLabel}</ActionLink>
          {checkProgramme.length > 0 && <FoerderCheckStarter programme={checkProgramme} ortName={city.name} variant="secondary" showArrow={false} />}
          </> : undefined}
        updatesAction={compact && p.id === f?.id ? <FundingAboButton name={`Förderung · ${city.name}`} scope={`funding:region:${city.ags}`} label="Abonnieren" variant="text" listenForPageAction /> : undefined}
        selected={{ programm: p, standLabel: fundingStandLabel(p), zaehlt: fundingZaehlt(p), geltungsbereich: p.region || city.name }}
        ort={city.name} relatedPrograms={kombinierbarMit(p).map(({id, name, url}) => ({id, name, url}))} />
    </div>
  );

  return (
    <>
    <FundingLocalHero compact={compact} title={`${STADTSEITE_UEBERSCHRIFT[stadtseiteThema(liste)]} in ${city.name}`}>
        {compact && fundingPromotion(f) && <p className={editorial.subtitle}>{fundingPromotion(f)!.text} · je nach Vorhaben</p>}
        {!compact && <p className={editorial.subtitle} data-sc-contrast>
          {f ? <>{f.status !== "aktiv" && <>{FUNDING_STATUS_LABEL[f.status]}: </>}{f.coveredCosts}.{!compact && <> Die Voraussetzungen und den Weg zum Antrag findest du beim jeweiligen Programm.</>}</> : <>Anlagenbestand und Beispielrechnungen für Photovoltaik in {city.name}.</>}
          {!compact && weitere.length > 0 && <> Hier gelten {liste.length} erfasste Programme. Die Beträge und Voraussetzungen werden getrennt dargestellt.</>}
        </p>}
      {!compact && <FundingAboButton name={`Förderung · ${city.name}`} scope={`funding:region:${city.ags}`} label="Updates abonnieren" listenForPageAction />}
    </FundingLocalHero>
    <FundingProgramSection>
        {/* ── Förderung (oben) ── */}
        {f && (
          <div style={S.section}>
            {programmKarte(f)}
            {weitere.map((p) => (
              <div key={p.id} style={{ marginTop: space.lg }}>
                {programmKarte(p)}
              </div>
            ))}
            {!compact && <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.md }}>
              <ActionLink href={calculatorHref}>{calculatorLabel}</ActionLink>
              {checkProgramme.length > 0 && <FoerderCheckStarter programme={checkProgramme} ortName={city.name} variant="secondary" />}
            </div>}

          </div>
        )}

    </FundingProgramSection>
    <EditorialPage>
        <div style={{ marginBlock: historien.some(({eintraege}) => eintraege.length > 0) ? space.xl : 0 }}>
          {historien.some(({eintraege}) => eintraege.length > 0) && <OptionalDisclosure label="Bisherige Änderungen am Förderprogramm">
            {historien.filter(({ eintraege }) => eintraege.length > 0).map(({ p, eintraege }) => (
              <FundingHistory key={p.id} eintraege={eintraege} programmName={p.name} programmUrl={p.url} />
            ))}
          </OptionalDisclosure>}
        </div>

        {/* ── Beispielrechnungen ── */}
        <div id="foerder-beispiele" style={S.section}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:compact ? space.xl : 0}}><h2 style={S.h2}>{balconyOnly ? "Balkonkraftwerk-Beispiel" : "Beispielrechnungen"} für {city.name}</h2>
          {compact && !balconyExample && <InfoTooltip title="Grundlagen der Beispiele" ariaLabel="Wie sind die Beispielrechnungen berechnet?">
            <p style={{marginBlock:8}}><strong>Standortertrag</strong><br />Dach-PV mit {nf(city.yieldKwhKwp)} kWh/kWp pro Jahr.</p>
            {examples.find(example => example.assumption)?.assumption && <p style={{marginBlock:8}}><strong>Voraussetzungen</strong><br />{examples.find(example => example.assumption)?.assumption}</p>}
            {examples.some(e => e.foerderung > 0) && f && <p style={{marginBlock:8}}><strong>Enthaltene Förderung</strong><br />Ausschließlich der Zuschuss aus „{f.name}“. Weitere Programme sind nicht addiert.</p>}
          <p style={{marginBlock:8}}><strong>Rechenannahmen für Dach-PV</strong><br />{fundingExampleAssumptions(city.yieldKwhKwp)}</p>
          </InfoTooltip>}</div>
          {balconyExample ? <>
            <p className={editorial.p}>Beispiel für ein förderfähiges Set ohne Speicher am Südbalkon. Alle Programmvoraussetzungen, Bewilligung und verfügbare Mittel sind vorausgesetzt.</p>
            <ExampleCard title={`${balconyExample.set.moduleWp} Wp ohne Speicher`} motif="balcony-modern">
              <p>Investition ohne Zuschuss: {nf(balconyExample.baseline.invest)} €</p>
              <p><strong>{balconyExample.grant > 0 ? `Zuschuss im Beispiel: ${nf(balconyExample.grant)} €` : "Ohne angesetzten Zuschuss"}</strong><br />Verbleibende Investition: {nf(balconyExample.result.invest)} €</p>
              <p>Geschätzte Ersparnis: {nf(balconyExample.result.savingPerYear)} € pro Jahr<br />Amortisation: {Number.isFinite(balconyExample.result.amortYears) ? `${balconyExample.result.amortYears.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Jahre` : "nicht innerhalb des Rechenzeitraums"}</p>
            </ExampleCard>
            {balconyExample.grant > 0 && f ? <p className={editorial.p}>Enthalten ist ausschließlich der Zuschuss aus „{f.name}“.</p> : <p className={editorial.p}>Ein kommunaler Zuschuss ist hier nicht eingerechnet: Für dieses Set und den aktuellen Prüfstand liegt kein anrechenbarer Betrag vor.</p>}
            <OptionalDisclosure label="Annahmen der Beispielrechnung"><p className={editorial.p}>Südbalkon, tagsüber teilweise zuhause, {nf(balconyExample.householdKwh)} kWh Haushaltsstrom pro Jahr, kein Speicher. Standortertrag {nf(city.yieldKwhKwp)} kWh/kWp; Setpreis und Strompreis aus den gemeinsamen Rechner-Annahmen. Unvergütete Einspeisung. Modellrechnung, keine Ertragsgarantie.</p></OptionalDisclosure>
            <Script src="/illustrations-motion/solar-illustrations.js" strategy="afterInteractive" />
          </> : <>
          {!compact && <><p style={S.sub}>Dach-PV-Beispiele, gerechnet mit {nf(city.yieldKwhKwp)} kWh/kWp{f?.status === "aktiv" && examples.some((e) => e.foerderung > 0) ? " inkl. lokaler Förderung" : ""}</p>
          {examples.find(example => example.assumption)?.assumption && <p className={editorial.p}>
            <strong>Angenommen für diese Beispiele: </strong>{examples.find(example => example.assumption)?.assumption}
          </p>}
          {examples.some(e => e.foerderung > 0) && f && <p className={editorial.p}>Enthalten ist ausschließlich der Zuschuss aus „{f.name}“. Weitere Programme sind nicht addiert.</p>}</>}
          {categoryCases ? <><FundingCaseCards cases={categoryCases} calculatorHref={calculatorHref} /><p style={{fontSize:"var(--font-size-caption)",color:"var(--color-text-secondary)",textAlign:"center",margin:"16px auto 0",lineHeight:1.6}}>{categoryCases.length > 1 ? "Eigenständige Förderbeispiele, nicht addiert." : "Beispiel für das genannte Förderprogramm."} Förderfähigkeit, Bewilligung und verfügbare Mittel vorausgesetzt.</p></> : compact && city.slug === "heidelberg" ? <p className={editorial.p}>Die Förderbeispiele für Dach-PV, Fassade und Mieterstrom sind gerade nicht verfügbar, weil der geprüfte Förderstand fehlt oder sich die Konditionen geändert haben. Bitte lade die Seite erneut.</p> : <ExampleCards examples={compact ? examples.slice(0, 1) : examples} illustrated comparison={compact} />}
          {!compact && <OptionalDisclosure label="Annahmen der Beispielrechnungen"><p className={editorial.p}>{fundingExampleAssumptions(city.yieldKwhKwp)}</p></OptionalDisclosure>}
          {f && f.status !== "aktiv" ? (
            <p className={editorial.p} style={{ marginTop: space.md }}>
              Die Förderung über das Programm „{f.name}“ ist {FUNDING_STATUS_NOTE[f.status]} —
              die Beispiele rechnen daher ohne. Aktuellen Status vor einem Antrag direkt beim Programm prüfen.
            </p>
          ) : f && !examples.some(e => e.foerderung > 0) ? (
            <p className={editorial.p} style={{ marginTop: space.md }}>
              Diese Dach-PV-Beispiele enthalten keinen Zuschuss aus „{f.name}“. {!fundingZaehlt(f) ? "Der aktuelle Prüfstand reicht für eine Anrechnung nicht aus." : fall === "ohneDach" ? "Das Programm fördert keine Dachanlage." : fall === "darlehen" ? "Ein Darlehen muss zurückgezahlt werden und wird deshalb nicht als Zuschuss abgezogen." : "Für diese Anlagen ist kein verlässlich berechenbarer Zuschuss hinterlegt."}
            </p>
          ) : null}
          </>}
        </div>

        {/* Der Rechner-Einstieg stand hier ein zweites Mal — die Förderkarte
            oben führt bereits dorthin, und die Beispielrechnungen dazwischen
            beantworten dieselbe Frage schon mit konkreten Zahlen. */}

        {/* ── FAQ (aus Förderdaten generiert) ── */}
        <div style={compact ? {paddingBottom:64} : undefined}><Faq items={faq} title={`Häufige Fragen zur ${balconyOnly ? "Balkonkraftwerk" : "PV"}-Förderung in ${city.name}`} currentPath={`/photovoltaik-foerderung/${slugify(city.bundesland)}/${city.slug}`} /></div>

        {/* ── Bestand (Trust-Signal, unten) ── */}
        {atlas && atlas.solar.total_count > 0 && (
          <div className={foundation.foundation} data-story-scheme="dark" style={{...S.section, background:"var(--atlas-surface)", width:"100vw", marginLeft:"calc(50% - 50vw)", boxSizing:"border-box", padding:"64px max(24px, calc((100vw - var(--content-max-width)) / 2))", overflow:"clip"}}>
            <h2 style={S.h2}>Photovoltaik in {city.name} in Zahlen</h2>
            <p className={editorial.p}>
              {localStories.length ? "Wie sich Solarenergie vor Ort entwickelt: Erzeugung, Zubau und Vergleich. Die Eurobeträge sind modellierte Summen für alle Anlagen im Ort, keine Fördersätze oder persönlichen Einnahmen." : "Aktueller Anlagenbestand aus dem Marktstammdatenregister"}
              {/* Der Nenner gehört sichtbar an die Zahl: Diese Seiten stehen
                  neben Kreis- und Landesseiten mit denselben Beschriftungen,
                  und eine Kreiszahl unter einem Ortsnamen wäre der schwerste
                  Fehler, den diese Seite machen kann. */}
              {city.kreis ? <> — nur {city.name}, nicht {city.kreis}</> : null}
            </p>
            {localStories.length ? <MunicipalStoryPreview
              stories={localStories}
              name={city.name} embedded showHeader={false} surfaceScheme="dark" visualScheme="dark"
            /> : <div style={S.metricsGrid}>
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
            </div>}
            <ActionLink variant="text" href={atlasPfad ?? `/solar-atlas/${params.bundesland}`} style={{ marginTop: space.xl, whiteSpace: "normal", textAlign: "left" }}>
              {atlasPfad ? <>Alle Zahlen zu {city.name} im Energie-Atlas</> : <>Im Energie-Atlas {city.bundesland} vergleichen</>}
              <IconArrowRight size={iconSizes.sm} />
            </ActionLink>
          </div>
        )}

        {/* ── Weiterlesen: verbindet die Förderseiten mit Ratgebern + Tools ── */}
        <ArticleTeasers title="Weiterlesen"
          currentPath={`/photovoltaik-foerderung/${slugify(city.bundesland)}/${city.slug}`}
          items={[
            { href: `/photovoltaik-foerderung/${slugify(city.bundesland)}`, title: `Förderung in ${city.bundesland}`, teaser: "Landesprogramme und weitere Orte mit erfasster Förderung." },
            { href: "/photovoltaik-foerderung", title: "Bundesweite und regionale Förderung", teaser: "Zuschüsse, Kredite und steuerliche Angebote im Überblick." },
            { href: "/ratgeber/lohnt-sich-pv-mit-speicher", title: "Lohnt sich PV mit Speicher?", teaser: "Kosten, Eigenverbrauch und Wirtschaftlichkeit für dein Vorhaben einordnen." },
          ]}
        />



        {/* Merker fürs Ende: Sobald er in Sicht kommt, fährt die klebende Leiste
            aus — sie darf die Rechtshinweise darunter nie überdecken. */}
        <div id="sc-cta-sentinel" style={{ height: 1 }} aria-hidden />
      {/* Der Rechner wohnt in einem Fenster auf dieser Seite: vorbefüllt mit dem
          gemessenen Standort-Ertrag und dem lokalen Programm, damit die Zahl
          sofort zu diesem Ort passt. Der Teilen-Link zeigt trotzdem auf den
          Rechner selbst — sonst landete der Empfänger hier. */}
      <PvRechnerModal
        initialParams={{ er: String(city.yieldKwhKwp), ...(ctaFoe ? { foe: f!.id } : {}) }}
      />
      {f && (
        <StickyCta surface="floating" share={{url: `https://solar-check.io/photovoltaik-foerderung/${slugify(city.bundesland)}/${city.slug}`, title: `Photovoltaik-Förderung in ${city.name}`}} startId={compact && f ? "foerder-programm-aktionen-ende" : "foerder-beispiele"}
          /* Öffnet den Rechner im Fenster statt die Seite zu verlassen —
             derselbe Weg wie im Wärmepumpen-Ratgeber. */
          primaer={{ href: calculatorHref, label: calculatorLabel }}
          /* Der Förder-Check statt der Amtsseite: Er ist der zweite Weg, der
             auf DIESER Seite weiterhilft — die Amtsseite führt hinaus und steht
             ohnehin in der Herkunftszeile der Karte. */
          sekundaer={checkProgramme.length ? { ereignis: FOERDER_CHECK_OEFFNEN, label: "Förder-Check starten" } : undefined}
          /* Das Abo als DRITTER Weg — auf schmalen Schirmen nur die Glocke
             (Betreiber, 31.08.2026). So muss keiner der beiden anderen weichen:
             Ein Symbol braucht die Breite nicht, die ein dritter Textknopf
             genommen hätte. */
          dritte={{
            ereignis: ABO_OEFFNEN,
            label: `${city.name} abonnieren`,
            icon: <IconGlocke size={16} />,
            klasse: "sc-glocke",
          }}
        />
      )}
    </EditorialPage>
      <div data-page-footer><SiteFuss zwischen={<DataSourcesSection><p>
          Bestandsdaten: Marktstammdatenregister (Bundesnetzagentur){atlas?.data_as_of ? `, Stand ${dashboardDate(atlas.data_as_of)}` : ""}, monatlich aktualisiert, Datenlizenz{" "}
          <a
            href="https://www.govdata.de/dl-de/by-2-0"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            dl-de/by-2-0
          </a>{" "}
          (Daten aggregiert).
          {f ? " Förderdaten: offizielle Programmseiten und Richtlinien der genannten Fördergeber. Prüfdatum und Werte-Stand stehen beim jeweiligen Programm." : ""}
          {" "}Der angegebene Standort-Ertrag (kWh/kWp) stammt von{" "}
          <a href={DATA_SOURCES.pvgis.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
            PVGIS
          </a>{" "}
          (Europäische Kommission).
          {" "}Alle Angaben sind Näherungswerte ohne Anspruch auf Richtigkeit, Aktualität oder Vollständigkeit und stellen keine
          Rechts-, Steuer- oder Anlageberatung dar. Förderkonditionen ändern sich und Budgets können erschöpft sein — verbindlich
          ist allein die offizielle Quelle des jeweiligen Programms. Beispielrechnungen sind unverbindliche Schätzungen.
      </p></DataSourcesSection>} /></div>
    </>
  );
}
