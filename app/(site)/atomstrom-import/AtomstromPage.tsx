import {heuteInBerlin} from '../../../lib/zeit';
import {getYearTrade} from '../../../lib/electricity-trade-server';
import { recordPageContent } from '../../../lib/page-content-state';
import CountryElectricityMixRaceWidget from '../../../components/energy/CountryElectricityMixRaceWidget';
import ElectricityTradeWidget from '../../../components/energy/ElectricityTradeWidget';
import AnnualMixWidget from './AnnualMixWidget';
import VisibleWidget from '../../../components/VisibleWidget';
import historicalTradeSnapshot from '../../../data/atomstrom/trade-daily-2025.json';
import type {TradeResult} from '../../../lib/electricity-trade';
const historicalTrade: TradeResult = {...historicalTradeSnapshot, mode: 'year'};
import { ARCHIVE_YEARS, getAnnualVariant } from "./annual-variant";
import NuclearYearWidget from "../../../components/energy/NuclearYearWidget";
import StorySlider from "../../../components/StorySlider";
import SidebarPageLayout from "../../../components/SidebarPageLayout";
import { IMPORT_COUNTRIES } from "../../../lib/atomstrom-year";
import countryRaceData from "../../../data/country-electricity-per-capita-race.json";
import { getSeoVariant } from "./seo-variant";
import { YEARS_ZUBAU, ZUBAU_BY_COUNTRY } from "../../../lib/country-comparison";
import { WidgetPresentationProvider } from "../../../components/dashboard/WidgetPresentationContext";
import ScrollIndicator from "../../../components/ScrollIndicator";
import WorldCapacityRaceWidget from "../../../components/energy/WorldCapacityRaceWidget";
import NuclearDailyWidget from "../../../components/energy/NuclearDailyWidget";
import NuclearShareWidget from "../../../components/energy/NuclearShareWidget";
import { getStrommixYtd } from "../../../lib/strommix-ytd";
import foundation from "../../../components/social/atlas-foundations.module.css";
import stage from "./AtomstromStage.module.css";
import { Metadata } from "next";
import Link from "next/link";
import LiveDataStatus from "../../../components/LiveDataStatus";
import AtomHeroCarousel from "./AtomHeroCarousel";
import SharedSiteHeader from "../../../components/SharedSiteHeader";
import Breadcrumb from "../../../components/Breadcrumb";
import RelatedLinks from "../../../components/RelatedLinks";
import { EnergyMonitor } from "../../../components/dashboard/EnergyMonitor";
import SiteFuss from "../../../components/SiteFuss";
import DataSourcesSection from "../../../components/DataSourcesSection";
import DataSourceList from "../../../components/DataSourceList";
import Faq from "../../../components/Faq";
import MetricValue from "../../../components/MetricValue";
import EditorialPage from "../../../components/EditorialPage";
import editorial from "../../../components/EditorialContent.module.css";
import { pageMetadata } from "../../../lib/seo";
import { jsonLdHtml } from "../../../lib/json-ld";
import AtomstromWidget from "./AtomstromWidget";
import AutoHeightIframe from "../../../components/AutoHeightIframe";
import { importFaqs, strommixFaqs, zubauFaqs, weitereFaqs, toFaqEntry, type FaqItem } from "./faq-data";
import { getNuclearImport, nf0, nf1, dateLong, PAGE_URL, BASE_URL } from "./figure";

// ISR: re-render hourly so the headline figure stays current without a deploy.
// The page reads from the SAME computeNuclearImport() the live dashboard and the
// API route use, so the number can never drift from what the dashboard shows.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  // The answer (seven-day average, the same figure as the first FAQ) belongs in
  // the search result: position 7–10 on four "how much" queries, zero clicks
  // (SEO audit 27.09.2026). The title stays number-free — it is rewritten less
  // often than the description and must not carry a figure that moves daily.
  const { result } = await getNuclearImport();
  const avgGw = result?.avg_gw ?? null;
  return pageMetadata({
    path: "/atomstrom-import",
    title: "Atomstrom-Import: Wie viel Kernstrom bezieht Deutschland?",
    description: avgGw != null
      ? `Rund ${nf1(avgGw)} GW Atomstrom (etwa ${nf0(avgGw * 24)} GWh pro Tag) bezieht Deutschland rechnerisch aus dem Ausland, im Sieben-Tage-Schnitt. Mit Herkunftsländern und Methodik.`
      : "Wie viel Atomstrom importiert Deutschland rechnerisch aus seinen Nachbarländern? Aktueller Wert, Herkunftsländer und Methodik, berechnet aus Grenzflüssen.",
    ogImageTitle: "Atomstrom-Import",
    ogImageSubtitle: "Wie viel Kernstrom Deutschland aus dem Ausland bezieht.",
  });
}

export default async function AtomstromImportPage({ hero = true, seoVariant = false, year }: { hero?: boolean; seoVariant?: boolean; year?: number } = {}) {
  const archive = year ? getAnnualVariant(year) : null;
  const annual = archive?.annual;
  const currentPath = year ? `/atomstrom-import/${year}` : "/atomstrom-import";
  const currentLink = process.env.NODE_ENV === 'development' ? '/atomstrom-import?variante=seo' : '/atomstrom-import';
  const { result, chartResult, asOf } = annual
    ? { result: null, chartResult: null, asOf: new Date(annual.modifiedAt) }
    : await getNuclearImport();
  const avgGw = result?.avg_gw ?? null;
  const gwhPerDay = avgGw != null ? avgGw * 24 : null;
  const standStr = dateLong(asOf);
  const latestObservation = result?.data.at(-1)?.ts;
  const worldGrowth = ZUBAU_BY_COUNTRY.find(country => country.code === "WELT")!;
  const growthYear = YEARS_ZUBAU.at(-1)!;
  const windSolarGrowth = worldGrowth.windsolar.at(-1)!;
  const nuclearGrowth = worldGrowth.nuclear.at(-1)!;
  const seo = archive ?? (seoVariant ? await getSeoVariant() : null);
  const ytd = seo ? seo.ytd : hero ? await getStrommixYtd(asOf) : null;
  const tradeYear = String(year ?? asOf.getFullYear());
  // Read the same cached endpoint and year as the detailed trade chart.
  const trade = archive ? historicalTrade : hero ? await getYearTrade(Number(tradeYear)).catch(() => null) : null;

  const countryYear = year ? countryRaceData.history.find(row => row.year === year) : countryRaceData.history.at(-1);
  const topOrigin = annual ? Object.entries(annual.countries).sort((a, b) => b[1] - a[1])[0] : null;
  const completeMonths = annual?.months.filter(month => month.coveredHours === month.expectedHours) ?? [];
  const highestMonth = [...completeMonths].sort((a, b) => b.nuclearGwh - a.nuclearGwh)[0];
  const lowestMonth = [...completeMonths].sort((a, b) => a.nuclearGwh - b.nuclearGwh)[0];
  const monthName = (month: string) => new Date(`${month}-15T12:00:00Z`).toLocaleDateString('de-DE', {month:'long', timeZone:'Europe/Berlin'});
  const germany = countryYear?.rows.find(row => row.id === "DEU");
  const france = countryYear?.rows.find(row => row.id === "FRA");
  const renewable = ytd?.segments.find(segment => segment.key === "renewable");
  const fossil = ytd?.segments.find(segment => segment.key === "fossil");
  const tradeImports = trade?.totals.importMwh;
  const tradeExports = trade?.totals.exportMwh;
  const tradeReady = tradeImports != null && tradeExports != null && Number.isFinite(tradeImports) && Number.isFinite(tradeExports) && Boolean(trade?.asOf);
  const tradeDifference = tradeReady ? tradeImports - tradeExports : null;

  // Methodology FAQs use the same live figure as the opening answer.
  const methodikFaqs: FaqItem[] = [
    {
      q: "Wie viel Atomstrom importiert Deutschland?",
      long: avgGw != null
        ? `Im Durchschnitt der letzten sieben Tage bezieht Deutschland rechnerisch rund ${nf1(avgGw)} GW Atomstrom aus seinen Nachbarländern (Stand ${standStr}). Das sind etwa ${nf0(gwhPerDay!)} GWh pro Tag. Der Wert schwankt je nach Grenzflüssen und der Kernkraft-Auslastung der Nachbarn.`
        : "Deutschland importiert je nach Grenzflüssen und der Kernkraft-Auslastung der Nachbarländer rechnerisch Atomstrom aus Frankreich, Tschechien, der Schweiz, Schweden, Belgien und den Niederlanden.",
    },
    {
      q: "Aus welchen Ländern kommt der importierte Atomstrom?",
      long: seoVariant ? "Die Berechnung berücksichtigt Stromflüsse aus Frankreich, Tschechien, der Schweiz, Schweden, Belgien und den Niederlanden. Die Zuordnung erfolgt über den jeweiligen nationalen Strommix; sie weist nicht den tatsächlichen Weg des Stroms von einem einzelnen Kraftwerk nach." : "Aus den sechs Nachbarländern mit aktiven Kernkraftwerken, die Strom nach Deutschland exportieren: Frankreich, Tschechien, Schweiz, Schweden, Belgien und Niederlande.",
    },
    {
      q: "Ist der Wert physisch gemessen?",
      long: "Nein, er ist rechnerisch. Strom trägt kein Etikett, sobald er im Netz ist. Wir gewichten den physischen Stromfluss aus jedem Nachbarland mit dem Kernkraft-Anteil im Strommix dieses Landes zur selben Stunde. So ergibt sich der rechnerische Atomstrom-Anteil der Importe.",
    },
  ];

  // Visible groups. Each renders through the shared FAQ component without its
  // own schema; the page publishes ONE FAQPage over all groups below.
  const focusedFaqs: FaqItem[] = [
    { q: "Wie viel Atomstrom importiert Deutschland?", long: `${seo?.yearAnswer ?? ""} ${seo?.dayAnswer ?? ""} ${annual ? "Die Jahresauswertung bezieht sich auf das Kalenderjahr und verwendet für Import und deutsche Erzeugung dieselben auswertbaren Zeitintervalle." : "Die Jahresansicht basiert auf Wochenwerten, die Tagesansicht auf einzelnen Messintervallen. Beide Zeiträume werden getrennt ausgewiesen."}` },
    methodikFaqs[1], methodikFaqs[2],
    { q: "Worauf bezieht sich der Atomstrom-Anteil?", long: "Der Anteil bezieht sich auf die deutsche Stromerzeugung zuzüglich des rechnerisch importierten Atomstroms. Andere Importe und Exporte werden in dieser Bezugsgröße nicht verrechnet. Er ist deshalb weder der Atomstrom-Anteil am gesamten deutschen Verbrauch noch der Anteil an allen Stromimporten." },
    { q: "Warum importiert Deutschland Strom?", long: "Im gemeinsamen europäischen Strommarkt wird laut Bundesnetzagentur in aller Regel importiert, wenn Strom aus dem Ausland günstiger ist als zusätzliche inländische Erzeugung. Stromhandel kann damit Kosten senken. Aus einer Importmenge allein lässt sich nicht ableiten, dass Deutschland diese Menge technisch nicht selbst erzeugen könnte." },
    { q: "Beweisen Stromimporte eine Abhängigkeit nach dem Atomausstieg?", long: "Eine Importbilanz allein beantwortet diese Frage nicht. Für die Versorgungssicherheit zählen unter anderem verfügbare Kraftwerke, Netze und Reserven, besonders in Stunden mit hoher Nachfrage. Der Atomstrom-Anteil ist eine rechnerische Herkunftszuordnung und kein Nachweis einer Versorgungslücke." },
    { q: annual ? "Warum ist die Jahresmenge als Teilmenge gekennzeichnet?" : "Warum sind manche Tageswerte unvollständig?", long: "Die Quelldaten können verzögert eintreffen oder Lücken enthalten. Dann zeigen wir nur die erfasste Strommenge als Teilmenge. Fehlende Intervalle werden weder als null behandelt noch auf einen ganzen Tag hochgerechnet." },
  ];
  const faqGroups = (seo ? [{ title: "Atomstrom-Import: die wichtigsten Fragen", items: focusedFaqs }] : [
    { title: "Woher kommt der importierte Atomstrom?", items: methodikFaqs },
    { title: "Fragen zum Stromimport", items: importFaqs },
    { title: "Strommix und Ausbau verstehen", items: [...strommixFaqs, ...zubauFaqs] },
    { title: "Weitere Fragen zur Atomkraft", items: weitereFaqs },
  ]).map((group) => ({ ...group, items: group.items.map(toFaqEntry) }));

  // Only complete successful reads can advance the semantic content version.
  // Failed refreshes and new retrieval clocks alone are not content changes.
  const contentModifiedAt = annual?.modifiedAt ?? (seo && ytd && chartResult?.data.length && tradeReady
    ? await recordPageContent('/atomstrom-import', {
        version: 'atomstrom-editorial-v1',
        ytd,
        days: seo.daily.days.map(day => ({ date: day.date, gwh: day.gwh, partial: day.partial })),
        trade: { year: tradeYear, totals: trade!.totals, days: trade!.days },
        worldGrowth, countryYear,
      }, asOf.toISOString())
    : undefined);
  const pageJsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    '@id': `${BASE_URL}${currentPath}#webpage`, url: `${BASE_URL}${currentPath}`,
    name: year ? `Atomstrom-Import Deutschland ${year}: Jahresrückblick und Herkunft` : `Atomstrom-Import Deutschland ${ytd?.year ?? asOf.getFullYear()}: aktuelle Zahlen`,
    ...(contentModifiedAt ? { dateModified: contentModifiedAt } : {}),
    ...(seo ? { description: `${seo.yearAnswer} ${seo.dayAnswer}` } : {}),
  };

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Atomstrom-Import Deutschland",
    description:
      "Rechnerischer Import von Kernkraft-Strom nach Deutschland aus den sechs Nachbarländern mit Kernkraftwerken (Frankreich, Tschechien, Schweiz, Schweden, Belgien, Niederlande), abgeleitet aus physischen Grenzflüssen gewichtet mit dem Kernkraft-Anteil des jeweiligen Exportlandes.",
    url: year ? `${BASE_URL}${currentPath}` : PAGE_URL,
    ...(annual ? { temporalCoverage: `${year}-01-01/${year}-12-31` } : {}),
    ...(contentModifiedAt ? { dateModified: contentModifiedAt } : {}),
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "Solar Check", url: BASE_URL },
    isBasedOn: "https://api.energy-charts.info",
    keywords: ["Atomstrom", "Stromimport", "Kernenergie", "Deutschland", "Strommix"],
    ...(seo ? (seo.ytd ? { variableMeasured: { "@type": "PropertyValue", name: annual ? `Rechnerischer Atomstrom-Import ${year} (erfasste Teilmenge)` : `Rechnerischer Atomstrom-Import (${seo.ytd.weeks} erfasste Wochen ${seo.ytd.year})`, value: seo.ytd.nuclearGwh, unitText: "GWh" } } : {}) : avgGw != null
      ? {
          variableMeasured: {
            "@type": "PropertyValue",
            name: "Atomstrom-Import (7-Tage-Mittel)",
            value: avgGw,
            unitText: "GW",
          },
        }
      : {}),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqGroups.flatMap((group) => group.items).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(pageJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(datasetJsonLd) }}
      />
      {!seo && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqJsonLd) }} />}
        {hero && <div className={`${stage.header} ${stage.standaloneHeader} ${foundation.foundation}`} data-story-scheme="dark"><SharedSiteHeader aktiv="energie" /></div>}
        {hero && <div className={`${stage.breadcrumbBand} ${foundation.foundation}`} data-story-scheme="dark">
          <div className={stage.breadcrumb}>
            <Breadcrumb variant="compact" items={[{label:"Energiemonitor Deutschland",href:"/strommix-deutschland"}, ...(year ? [{label:"Atomstrom-Import",href:currentLink},{label:String(year)}] : [{label:"Atomstrom-Import"}])]} jsonLd />
          </div>
        </div>}
        <SidebarPageLayout enabled={Boolean(seo)} darkHero={hero} alignWith=".atom-hero-tiles" label="Atomstrom-Import: Zeitraum" activeHref={year ? `/atomstrom-import/${year}` : currentLink} links={[{href:currentLink,label:'Aktuelle Atomstrom-Importe'}, ...ARCHIVE_YEARS.map(value=>({href:`/atomstrom-import/${value}`,label:`Kernenergie-Import ${value}`}))]}>
        {hero && <section className={`${stage.stage} ${foundation.foundation}`} data-story-scheme="dark" aria-labelledby="atom-hero-title">
          <div className={stage.heroBackdrop}>
          <div className={stage.heroBody}>
            <div className={stage.intro}>
              {!annual && <p className={stage.dataDate}><LiveDataStatus observedAt={latestObservation} retrievedAt={result ? asOf.toISOString() : undefined} renderedAt={new Date().toISOString()} /></p>}
              <h1 id="atom-hero-title">{year ? `Wie viel Atomstrom importierte Deutschland ${year}?` : "Wie viel Atomstrom importiert Deutschland?"}</h1>
              <p>{seo ? <>{seo.yearAnswer} {seo.dayAnswer}</> : ytd ? <>Rechnerisch importierter Atomstrom macht {ytd.year} bislang {nf1(ytd.nuclearShare)} % der deutschen Stromerzeugung plus Atomstrom-Import aus. Andere Importe sind in dieser Bezugsgröße nicht enthalten.</> : <>Deutschland importiert über das europäische Netz auch Strom aus Kernenergie. Wie viel das ist, hängt von den Stromflüssen und dem Strommix der Nachbarländer ab.</>}</p>


              <ScrollIndicator href="#vergleich">Zahlen einordnen</ScrollIndicator>
            </div>
            <EnergyMonitor scheme="dark" className={`${stage.teasers} atom-hero-tiles`} kpis={
              annual ? <WidgetPresentationProvider appearance={{theme:'dark'}}><StorySlider variant="hero" ariaLabel={`Atomstrom ${year} im Überblick`} labels={[`Atomstrom-Anteil ${year}`, `Monatsmengen ${year}`, `Zukauf und Verkauf ${year}`]}><NuclearShareWidget ytd={ytd} variant="teaser" /><NuclearYearWidget data={annual} teaser /><ElectricityTradeWidget presentation="hero" today={`${year}-12-31`} year={String(year)} period="year" onsite variant="radial" initialData={historicalTrade} /></StorySlider></WidgetPresentationProvider> : <AtomHeroCarousel ytd={ytd} nuclear={chartResult} trade={trade}
                asOf={asOf.toISOString()} updatedAt={{ daily: result ? asOf.toISOString() : undefined }}
                targets={{ share: '#einordnung', daily: '#tagesmengen', trade: '#stromhandel' }} />
            } />
          </div>
          </div>
          <section className={stage.heroRace} id="vergleich" aria-labelledby="hero-race-title">
            <h2 className={editorial.h2} id="hero-race-title">Wind und Solar legen beim Ausbau vor</h2>
            <p className={editorial.subtitle}>Weltweit kamen {growthYear} netto {nf1(windSolarGrowth)} GW Wind- und Solarleistung hinzu. Bei der Kernenergie {nuclearGrowth < 0 ? `sank die installierte Leistung um ${nf1(Math.abs(nuclearGrowth))} GW` : `wuchs die installierte Leistung um ${nf1(nuclearGrowth)} GW`}.</p>
            <div className={stage.raceChart}><WidgetPresentationProvider appearance={{theme:"dark"}}><WorldCapacityRaceWidget /></WidgetPresentationProvider></div>

          </section>

        </section>}
        <div data-sidebar-light-start><EditorialPage wide>
        {hero && <div className={stage.raceAfter}>
          <h2 className={editorial.h2}>Das Wichtigste zum weltweiten Ausbau</h2>
            <div className={stage.raceInsights}>
              <article className={editorial.hero}>
                <span className={editorial.label}>Ausbautempo</span>
                <h3 className={editorial.h3}>Rund {nf0(windSolarGrowth / worldGrowth.windsolar[0])}-mal so viel wie {YEARS_ZUBAU[0]}</h3>
                <p className={editorial.p}>Der jährliche Nettozubau von Wind und Solar stieg weltweit von {nf1(worldGrowth.windsolar[0])} GW auf {nf1(windSolarGrowth)} GW im Jahr {growthYear}. Der Vergleich betrifft die neu hinzugekommene Leistung, nicht den gesamten Anlagenbestand.</p>
              </article>
              <article className={editorial.hero}>
                <span className={editorial.label}>Jüngste Entwicklung</span>
                <h3 className={editorial.h3}>{nf0((windSolarGrowth / worldGrowth.windsolar.at(-2)! - 1) * 100)} % mehr Zubau als im Vorjahr</h3>
                <p className={editorial.p}>Auch gegenüber {growthYear - 1} legten Wind und Solar zu: Der jährliche Nettozubau wuchs um {nf1(windSolarGrowth - worldGrowth.windsolar.at(-2)!)} GW. Das Wachstum beschränkt sich also nicht auf den Vergleich mit dem deutlich kleineren Ausgangsniveau von {YEARS_ZUBAU[0]}.</p>
              </article>
              <article className={editorial.hero}>
                <span className={editorial.label}>Kernenergie</span>
                <h3 className={editorial.h3}>Neue Reaktoren bedeuten nicht automatisch mehr Gesamtleistung</h3>
                <p className={editorial.p}>Neue Kapazitäten und Stilllegungen wirken gegeneinander. In der Datenreihe liegt die weltweite Kernkraftleistung {growthYear} netto um {nf1(Math.abs(nuclearGrowth))} GW {nuclearGrowth < 0 ? "unter" : "über"} dem Vorjahreswert. Einzelne neue Reaktoren sagen deshalb wenig über die Entwicklung des gesamten Bestands aus.</p>
              </article>
              <article className={editorial.hero}>
                <span className={editorial.label}>Einordnung</span>
                <h3 className={editorial.h3}>Mehr Leistung ist noch kein Strommengenvergleich</h3>
                <p className={editorial.p}>Wie viel Strom Anlagen erzeugen, hängt zusätzlich von ihren Betriebsstunden und ihrer Auslastung ab. Der starke Ausbau zeigt deshalb einen Kapazitätstrend. Er beantwortet für sich allein weder, wie viel Atomstrom Deutschland importiert, noch ob Stromimporte notwendig sind.</p>
              </article>
            </div>
        </div>}
        {!hero && <>
          <Breadcrumb variant="compact" items={[{ label: "Start", href: "/" }, { label: "Atomstrom-Import" }]} jsonLd />
          <div className={editorial.reading}>
            <span className={editorial.label}>Energiemonitor Deutschland · Atomstrom-Import</span>
            <p className={editorial.small}>Datenstand (7-Tage-Wert): {standStr}</p>
            <h1 className={editorial.h1}>Wie viel Atomstrom importiert Deutschland?</h1>
            <p className={editorial.subtitle}>Deutschland hat seine eigenen Kernkraftwerke abgeschaltet. Es bezieht über das europäische Stromnetz aber weiterhin Strom aus Ländern, die Kernkraft nutzen.</p>
          </div>
          <EnergyMonitor scheme="light" topics={[{id:"anteil",title:"Atomstrom im Überblick",layout:"pair",widgets:<>        <aside className={editorial.hero} aria-label="Atomstrom-Import · letzte 7 Tage">
          <span className={editorial.label}>Atomstrom-Import · letzte 7 Tage</span>
          {avgGw != null ? (
            <>
              <MetricValue value={avgGw} unit="GW" maximumFractionDigits={1} />
              <p className={editorial.flushEnd}>
                Rechnerisch importierter Atomstrom, im Durchschnitt der letzten sieben Tage. Das entspricht etwa{' '}
                <strong>{nf0(gwhPerDay!)} GWh pro Tag</strong>.
              </p>
              <p className={`${editorial.small} ${editorial.answerContext}`}>
                Stand: {standStr}. Berechnet aus den Stromflüssen und dem Kernkraft-Anteil
                der Herkunftsländer; kein separat gemessener Atomstrom-Import.
              </p>
            </>
          ) : (
            <p className={editorial.flushEnd}>
              Der aktuelle Sieben-Tage-Wert ist gerade nicht verfügbar. Wie wir den
              Atomstrom-Anteil der Importe berechnen und aus welchen Ländern er stammt,
              erklären wir unten.
            </p>
          )}
        </aside>
<div><AutoHeightIframe src="/embed/strommix-anteil?onsite=1" title="Kernenergie im deutschen Strommix" fallbackHeight={400} /><p className={editorial.small}>Basis: deutsche Erzeugung plus berechneter Atomstrom-Import; übrige Importe sind hier nicht enthalten.</p></div></>}]} />
        </>}
        {hero && <EnergyMonitor scheme="light" sectionStyle="product" topics={[
          { id:"einordnung", title:"Wie groß ist der Atomstrom-Anteil?", chartSide:"right",
            description:<><p>{seo && ytd ? <>{annual ? `In den auswertbaren Zeitabschnitten ${year}` : `In den ${ytd.weeks} erfassten Wochen ${ytd.year}`} entfielen <strong>{nf1(ytd.nuclearShare)} %</strong> der dargestellten Strommenge auf rechnerisch importierten Atomstrom. {renewable && <>Erneuerbare kamen auf {nf1(renewable.share)} %.</>}</> : <>Rechnerisch importierter Atomstrom macht {ytd ? `${nf1(ytd.nuclearShare)} %` : "einen Teil"} der hier erfassten Strommenge aus.</>}</p><p>Die Bezugsgröße umfasst deutsche Erzeugung plus berechneten Atomstrom-Import. Andere Importe sind nicht enthalten. Der Wert ist deshalb kein Anteil am gesamten deutschen Stromverbrauch.</p></>,
            widgets:<NuclearShareWidget ytd={ytd} variant={annual ? "teaser" : "full"} /> },
          { id:"tagesmengen", title: annual ? "Wie verlief der Atomstrom-Import im Jahresverlauf?" : "Der Atomstrom-Import schwankt täglich", chartSide:"left",
            description:<>{annual ? <><p>{highestMonth && lowestMonth && <>Unter den vollständig auswertbaren Monaten lag {monthName(highestMonth.month)} mit <strong>{nf1(highestMonth.nuclearGwh)} GWh</strong> am höchsten, {monthName(lowestMonth.month)} mit {nf1(lowestMonth.nuclearGwh)} GWh am niedrigsten.</>}</p></> : seo && <p>{seo.dayAnswer} {seo.dayComparison}</p>}<p>Wie viel Kernenergie rechnerisch nach Deutschland gelangt, hängt von den Stromflüssen und dem zeitgleichen Erzeugungsmix der Nachbarländer ab. </p></>,
            widgets:annual ? <NuclearYearWidget data={annual} /> : <NuclearDailyWidget data={chartResult} metric="energy" asOf={asOf.toISOString()} updatedAt={result ? asOf.toISOString() : undefined} variant="full" /> },
          ...(annual ? [{ id: 'herkunft', title: `Aus welchen Ländern kam der Atomstrom ${year}?`, chartSide: 'right' as const,
            description: <><p>{topOrigin && <>Der größte rechnerische Beitrag kam aus {IMPORT_COUNTRIES[topOrigin[0] as keyof typeof IMPORT_COUNTRIES]}: <strong>{nf1(topOrigin[1] / 1000)} TWh</strong> beziehungsweise {nf1(topOrigin[1] / annual.nuclearGwh * 100)} % der erfassten Atomstrom-Importmenge.</>}</p><p>Die Zuordnung beruht auf dem Strommix des jeweiligen Nachbarlandes und seinen Stromflüssen nach Deutschland. Sie weist keine Lieferung eines bestimmten Kraftwerks nach.</p></>,
            widgets: <NuclearYearWidget data={annual} view="countries" /> }] : []),
        ]} />}
        <div className={stage.details}>
        <EnergyMonitor scheme="light" sectionStyle="product" topics={[
          ...(!annual ? [{
            id: "laendervergleich",
            title: "Wie viel Strom erzeugen andere Länder je Einwohner?",
            chartSide: "right" as const,
            description: seo ? <><p>{germany && france && countryYear ? <>Deutschland erzeugte {countryYear.year} aus erneuerbaren Quellen <strong>{nf0(germany.segments[0])} kWh je Einwohner</strong>, Frankreich {nf0(france.segments[0])} kWh. Bei der Kernenergie waren es in Frankreich {nf0(france.segments[1])} kWh je Einwohner, in Deutschland {nf0(germany.segments[1])} kWh.</> : "Die aktuellen Jahreswerte des Ländervergleichs sind gerade nicht verfügbar."}</p><p>Der Vergleich umfasst die inländische Erzeugung, nicht den persönlichen Verbrauch. Importierter Atomstrom wird Deutschland hier nicht als eigene Erzeugung zugerechnet.</p></> : <p>Große Länder erzeugen oft mehr Strom. Der Vergleich je Einwohner setzt die Erzeugung ins Verhältnis zur Bevölkerung. Das Rennen zeigt Erneuerbare und Kernenergie in zehn ausgewählten Ländern. Es zeigt keine weltweite Rangliste und nicht den persönlichen Stromverbrauch.</p>,
            widgets: <VisibleWidget minHeight={680}><WidgetPresentationProvider appearance={{theme:"light"}}><CountryElectricityMixRaceWidget onsite metric="per-capita" /></WidgetPresentationProvider></VisibleWidget>,
          }] : []),
          {
            id: "verlauf",
            title: annual ? `Wie setzte sich der deutsche Strommix ${year} zusammen?` : "Wie verändert sich der deutsche Strommix?",
            chartSide: "left",
            description: seo ? <><p>{ytd && renewable && fossil ? <>{annual ? `In den auswertbaren Zeitabschnitten ${year}` : `In den ${ytd.weeks} erfassten Wochen ${ytd.year}`} lieferten erneuerbare Quellen <strong>{nf1(renewable.gwh / 1000)} TWh</strong>, fossile Quellen {nf1(fossil.gwh / 1000)} TWh. {renewable.gwh > fossil.gwh ? "Damit erzeugten Erneuerbare mehr Strom als fossile Quellen." : renewable.gwh < fossil.gwh ? "Damit erzeugten fossile Quellen mehr Strom als Erneuerbare." : "Beide Gruppen erzeugten gleich viel Strom."}</> : "Die Jahresmengen nach Energiequelle sind gerade nicht verfügbar."}</p><p>Anders als beim Ausbau geht es hier um tatsächlich erzeugte Strommengen. Der rechnerische Atomstrom-Import wird zusätzlich zur deutschen Erzeugung ausgewiesen.</p></> : <p>Der deutsche Strommix verändert sich im Jahresverlauf. Der Vergleich der erzeugten Strommengen ergänzt den Blick auf neu installierte Leistung. Importierte Kernenergie bleibt dabei eine rechnerische Zuordnung.</p>,
            widgets: annual ? <AnnualMixWidget data={ytd!} /> : <AtomstromWidget annual={Boolean(seo)} />,
          },
          {
            id: "stromhandel",
            title: "Wie viel Strom importiert und exportiert Deutschland?",
            chartSide: "right",
            description: <>{seo && <p>{tradeReady ? <>{annual ? `Im Kalenderjahr ${year}` : `Vom 1. Januar ${tradeYear} bis zum ${new Date(trade!.asOf!).toLocaleDateString("de-DE", {day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Berlin"})}`} erfasst der kommerzielle Stromhandel <strong>{nf1(tradeImports / 1e6)} TWh Import</strong> und <strong>{nf1(tradeExports / 1e6)} TWh Export</strong>. {tradeDifference === 0 ? "Die Bilanz ist ausgeglichen." : `Damit wurden ${nf1(Math.abs(tradeDifference!) / 1e6)} TWh mehr ${tradeDifference! > 0 ? "eingekauft als verkauft" : "verkauft als eingekauft"}.`} {trade?.partial && "Der laufende Zeitraum ist noch nicht abgeschlossen."}</> : "Für den gewählten Jahreszeitraum liegen derzeit keine vollständig auswertbaren Handelsmengen vor. Ein belastbarer Saldo lässt sich daraus nicht nennen."}</p>}<p>Deutschland kauft und verkauft Strom im europäischen Markt. Ob mehr Strom zugekauft oder verkauft wird, verändert sich im Jahresverlauf. Erst die Bilanz eines gemeinsamen Zeitraums zeigt, welche Richtung überwiegt.</p><p>Der Vergleich umfasst den gesamten kommerziellen Stromhandel, nicht nur Atomstrom. Importe können wirtschaftlich sinnvoll sein, wenn Strom aus dem Ausland günstiger ist als zusätzliche inländische Erzeugung. Der Saldo allein belegt keine Versorgungsabhängigkeit.</p></>,
            widgets: <WidgetPresentationProvider appearance={{theme:"light"}}><ElectricityTradeWidget today={heuteInBerlin()} year={tradeYear} period="year" onsite variant="radial" initialData={annual ? historicalTrade : trade} /></WidgetPresentationProvider>,
          },
        ]} />
        </div>

        <div className={editorial.reading}>
        <h2 className={editorial.h2}>Apropos: Was ist dran?</h2>
        <p className={editorial.p}>
          Die Berechnung berücksichtigt Frankreich, Tschechien, die Schweiz, Schweden,
          Belgien und die Niederlande. Entscheidend sind die Stromflüsse nach Deutschland
          und der Kernkraft-Anteil des jeweiligen Landes zur selben Stunde.
        </p>
        {faqGroups.map((group) => (
          <Faq key={group.title} items={group.items} title={group.title} currentPath={currentPath} jsonLd={false} />
        ))}

        <RelatedLinks
          currentPath={currentPath}
          links={[...(seo ? [{href: year ? currentLink : '/atomstrom-import/2025', label: year ? 'Aktuelle Importzahlen' : 'Atomstrom-Import 2025', desc: year ? 'Aktuelle Tagesmengen und die Entwicklung im laufenden Jahr.' : 'Monatsverlauf, rechnerische Herkunft und Einordnung für 2025.'}] : []), {
            href: "/strommix-deutschland",
            label: "Live-Verlauf im Strommix-Dashboard",
            desc: "Aktuelle Stromerzeugung und die Anteile der einzelnen Energiequellen in Deutschland.",
          }]}
        />

        </div>
    </EditorialPage></div>
    </SidebarPageLayout>
    <div data-page-footer>
      {/* The one sources area of this page: import, capacity growth and trade.
          Widgets keep their own credits for exported images. */}
      <SiteFuss zwischen={<DataSourcesSection>
        <p>{annual
          ? 'Die Jahresauswertung integriert Originalintervalle eines Kalenderjahres. Die aktuelle Jahresübersicht verwendet dagegen den wöchentlich aggregierten Datenbestand. Wegen unterschiedlicher Zeitabdeckung und Aggregation wird daraus kein direkter Vorjahresvergleich berechnet.'
          : 'Die Tagesmengen werden stündlich neu abgerufen. Jahresmenge und Jahresanteil verwenden den wöchentlich aktualisierten Datenbestand. Die Archivseiten integrieren Originalintervalle eines Kalenderjahres; wegen unterschiedlicher Zeitabdeckung und Aggregation wird daraus kein direkter Vorjahresvergleich berechnet.'}</p>
        <DataSourceList
          tone="inherit"
          only={["energyCharts", "ember"]}
          purposes={{
            energyCharts: "Atomstrom-Import: Grenzflüsse und nationale Strommixe",
            ember: "Ausbau von Wind, Solar und Kernenergie im Ländervergleich",
          }}
        />
        {/* SMARD has no register entry yet, see lib/data-sources.ts. */}
        <p>Stromhandel: {seo ? <a href="https://www.smard.de/page/home/wiki-article/446/548/grenzueberschreitender-stromhandel">Bundesnetzagentur | SMARD.de</a> : "Bundesnetzagentur | SMARD.de"}, kommerzielle Import- und Exportmengen (CC BY 4.0). Berechnung und Darstellung: Solar Check.</p>
        {seo && <p>Einordnung der Importe: <a href="https://www.smard.de/page/home/wiki-article/522/214274/energietraegerscharfer-aussenhandel">SMARD: Energieträgerscharfer Außenhandel</a>.</p>}
        <p>{annual ? <>Die Jahresauswertung verwendet die Originalintervalle vom 1. Januar bis 31. Dezember {year}. {archive?.coverageNote} Für den Anteil werden Import und deutsche Erzeugung auf dieselben verfügbaren Intervalle begrenzt. Ausländische Stundenwerte werden innerhalb ihrer Stunde den Viertelstunden-Flüssen zugeordnet. Die Kernenergieanteile beziehen sich auf die gemeldete positive Erzeugung; fehlende einzelne Erzeugungsarten können die Näherung beeinflussen. Deshalb wird hier kein Vergleich mit älteren, anders aggregierten Wochensummen ausgewiesen.</> : 'Der Sieben-Tage-Wert wird stündlich abgerufen, die Jahresansicht nutzt die verfügbaren Wochenwerte.'}
          Atomstrom-Importe sind rechnerische Näherungen. Formel, Grenzen der Berechnung und ein zitierfähiger
          Baustein (CC BY 4.0): <Link href="/atomstrom-import/methodik">Methodik &amp; Quellenangabe</Link>.</p>
      </DataSourcesSection>} />
    </div>
    </>
  );
}
