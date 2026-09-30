import Script from "next/script";
import GemeindeAbschnittNav from "../../../components/gemeinde/GemeindeAbschnittNav";
import { IconArrowRight } from "../../../components/Icons";
import { Metadata } from "next";
import Link from "next/link";
import ArticleMeta from "../../../components/ArticleMeta";
import Breadcrumb from "../../../components/Breadcrumb";
import Faq from "../../../components/Faq";
import GlossaryTerm from "../../../components/GlossaryTerm";
import { DataSourceNote } from "../../../components/PoweredBy";
import ArticleTeasers from "../../../components/ArticleTeasers";
import { DATA_SOURCES } from "../../../lib/data-sources";
import {
  EEG_REFORM_VORHABEN_SATZ,
  eegBestandsschutzSatz,
  einspeiseverguetungTabelleFaq,
  FEEDIN_DEGRESSION_SATZ,
  feedInGarantieSatz,
} from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import styles from "../../../components/EditorialContent.module.css";
import StickyCta from "../../../components/StickyCta";
import EditorialPage from "../../../components/EditorialPage";
import type { CSSProperties } from "react";
import ExampleCard from "../../../components/ExampleCard";
import ContentTable from "../../../components/ContentTable";
import { FEED_IN_YEARS, NATIONAL_AVG_YIELD, PERSONEN } from "../../../lib/constants";
import {
  feedInEndIso,
  feedInPeriodsSince2022,
  feedInRatesFor,
  feedInRatesForCommissioning,
  fmtCt,
  naechsteDegressionIso,
} from "../../../lib/feedin-config";
import {
  FEEDIN_HISTORY_VALUES,
  FEEDIN_HISTORY_YEARS,
} from "../../../lib/feedin-history";
import { eegDatum, eegReformStandLabel, eegVerfahrenSatz } from "../../../lib/eeg-reform-config";
import { MARKTWERT_SOLAR_HISTORIE } from "../../../lib/marktwert-config";
import { fetchMarketPrices } from "../../../lib/prices-server";
import { heuteInBerlin } from "../../../lib/zeit";
import { verlaufJahre } from "./VerlaufsChart";
import VerlaufMitMeilensteinen from "./VerlaufMitMeilensteinen";
import ArchivTabelle from "./ArchivTabellen";
import { FeedinExamples } from "./NextSteps";
import PvConsumerExample from "../../../components/PvConsumerExample";

// Jede Zahl auf dieser Seite kommt live aus den geprüften Modulen
// (feedin-config-Kette, BNetzA-Monatsarchiv, SFV-Jahresreihe) — nichts ist
// handgetippt (Zahlen-Korrektheit-BLOCKER). ISR statt Rebuild, damit der
// Stichtags-Plan (1.2./1.8.) und der Strompreis von selbst aktuell bleiben.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  // The searcher wants the number; it belongs in the search result, from the
  // SAME chain as the short answer on the page (SEO audit 27.09.2026: position
  // 8, 144 impressions for "einspeisevergütung tabelle", zero clicks). German
  // calendar day, like the page below — otherwise the title shows the old rate
  // for two hours after each cut-off.
  const todayIso = heuteInBerlin(new Date());
  const year = todayIso.slice(0, 4);
  const rates = feedInRatesForCommissioning(todayIso) ?? feedInRatesFor(todayIso);
  return pageMetadata({
    path: "/einspeiseverguetung-tabelle",
    title: `Einspeisevergütung ${year}: ${fmtCt(rates.teilUnder10)} ct – Tabelle seit 2000`,
    description: `Aktuell ${fmtCt(rates.teilUnder10)} ct/kWh bei Teileinspeisung bis 10 kWp, ${fmtCt(rates.vollUnder10)} ct bei Volleinspeisung. Dazu alle Sätze seit 2000 als Tabelle, auch für Bestandsanlagen.`,
    ogImageTitle: "Einspeisevergütung: die komplette Tabelle",
    ogImageSubtitle: "Aktuelle Sätze und alle historischen Werte seit 2000.",
  });
}




// ─── Formatierung (deutsche Zahlen, Datumsangaben) ───────────────────────────
const ct = fmtCt;
const dd = (iso: string) => iso.split("-").reverse().join(".");

export default async function EinspeiseverguetungTabellePage() {
  const now = new Date();
  // Deutscher Kalendertag, nicht Weltzeit: Die Stichtage der Vergütung sind
  // deutsche Daten, und am Stichtag selbst zeigte die Tabelle zwischen 00:00 und
  // 02:00 sonst noch die alten Sätze (siehe tagInBerlin in lib/zeit.ts).
  const todayIso = heuteInBerlin(now);
  const year = Number(todayIso.slice(0, 4));
  // Aktuelle Sätze aus der GERECHNETEN Kette — derselben Quelle wie die
  // Perioden-Tabelle darunter. Der Stichtags-Plan (feedInRatesFor) bleibt
  // Fallback; mit zwei Quellen widersprächen sich Kurzantwort und erste
  // Tabellenzeile am ersten Stichtag nach dem letzten Schedule-Eintrag
  // (Fakten-Check 06.08.2026, Befund 4).
  const rates = feedInRatesForCommissioning(todayIso) ?? feedInRatesFor(todayIso);
  const prices = await fetchMarketPrices();
  const strompreisCt = (prices.electricityPrice * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const priceRatio = Math.round((prices.electricityPrice * 100) / rates.teilUnder10);
  const naechsteAbsenkung = eegDatum(naechsteDegressionIso(todayIso));
  const REFORM_STAND = eegReformStandLabel();
  // Intra-Monats-Bruch Juli 2022: bis 29.07. galt der Archivwert, ab dem
  // 30.07. die EEG-2023-Anhebung — beide live aus derselben Kette.
  const juliAlt = feedInRatesForCommissioning("2022-07-29")!.teilUnder10;
  const eeg2023Start = feedInRatesForCommissioning("2022-07-30")!.teilUnder10;

  // Halbjahres-Perioden seit dem 30.07.2022 — Grenzen und Sätze aus der
  // geprüften Kette (feedInPeriodsSince2022, Anker-Test in feedin-config.test).
  const perioden = feedInPeriodsSince2022(todayIso);

  // Jahreswerte vor 2012 (SFV-Reihe) + Spitzenwert für den Einstieg.
  const vor2012 = FEEDIN_HISTORY_YEARS
    .map((y, i) => ({ year: y, value: FEEDIN_HISTORY_VALUES[i] }))
    .filter((r) => r.year <= 2011);
  const maxWert = Math.max(...FEEDIN_HISTORY_VALUES);
  const maxJahr = FEEDIN_HISTORY_YEARS[FEEDIN_HISTORY_VALUES.indexOf(maxWert)];
  const wert2012 = FEEDIN_HISTORY_VALUES[FEEDIN_HISTORY_YEARS.indexOf(2012)];

  // Jüngster amtlicher Jahresmarktwert Solar (ÜNB) aus der geteilten Quelle.
  const marktwert = MARKTWERT_SOLAR_HISTORIE[MARKTWERT_SOLAR_HISTORIE.length - 1];

  // Chart-Sektionen (2000–heute) für den Verlaufs-Chart.
  const chartJahre = verlaufJahre(now);

  // § 25 EEG live gerechnet: welcher Jahrgang läuft gerade aus?
  const jahrgangEnde = year - FEED_IN_YEARS; // Vergütung endet am 31.12. dieses Jahres
  const endeDatum = dd(feedInEndIso(`${jahrgangEnde}-01-01`));

  const faqItems = einspeiseverguetungTabelleFaq();

  return (
    <EditorialPage>
        <Breadcrumb
          variant="compact"
          items={[
            { label: "Start", href: "/" },
            { label: "Ratgeber", href: "/ratgeber" },
            { label: "Einspeisevergütung: Tabelle" },
          ]}
          jsonLd
        />

        <ArticleMeta
          headline={`Einspeisevergütung ${year}: aktuelle Sätze & Tabelle seit 2000`}
          description="Aktuelle EEG-Vergütungssätze plus die komplette historische Tabelle — Monatswerte 2012–2022, Halbjahres-Sätze seit 2022, Jahreswerte seit 2000."
          path="/einspeiseverguetung-tabelle"
          published="2026-08-04"
          modified="2026-09-30"
        />
        <h1 className={styles.h1}>Einspeisevergütung: Tabelle {year} und Vorjahre</h1>

        <p className={styles.subtitle}>
          Die Einspeisevergütung hängt davon ab, wann eine Anlage in Betrieb gegangen ist.
          Die Tabellen zeigen die aktuellen Sätze und die historischen Werte seit 2000;
          der Verlauf ordnet die Entwicklung ein.
        </p>
        {/* ── Kurzantwort ── */}
        <div className={styles.hero}>
          <span className={styles.label}>Die Kurzantwort</span>
          Für neue Anlagen bis {rates.thresholdKwp} kWp gibt es aktuell{" "}
          <strong className={styles.strong}>{ct(rates.teilUnder10)} ct/kWh</strong> bei{" "}
          Teileinspeisung (Überschusseinspeisung) und{" "}
          <strong className={styles.strong}>{ct(rates.vollUnder10)} ct/kWh</strong> bei
          Volleinspeisung.
        <p className={`${styles.p} ${styles.answerContext}`}>
          Entscheidend ist das Inbetriebnahmedatum deiner Anlage:
          {" "}<a href="#aktuelle-saetze" className={styles.link}>ab 30. Juli 2022</a>,
          {" "}<a href="#bestandsanlage" className={styles.link}>April 2012 bis Juli 2022</a> oder
          {" "}<a href="#anfangsjahre" className={styles.link}>2000 bis 2011</a>.
          Für Anfang 2012 gelten die Hinweise an der Monatstabelle.
        </p>
        </div>

        <GemeindeAbschnittNav theme="light" actions={false} links={[
          {href:"#aktuelle-saetze",label:"Aktuelle Sätze"},
          {href:"#beispiele",label:"Beispiele in Euro"},
          {href:"#bestandsanlage",label:"Ältere Anlage"},
          {href:"#verlauf",label:"Verlauf seit 2000"},
        ]} />
        <Script src="/gemeinde/ankernav.js" strategy="afterInteractive" />

        {/* ── Halbjahres-Tabelle seit 30.07.2022 (neueste zuerst — die erste
             Zeile SIND die aktuellen Sätze; die eigene Aktuell-Tabelle entfiel
             bewusst, weil /einspeiseverguetung-rechner diesen Block trägt) ── */}
        <h2 id="aktuelle-saetze" tabIndex={-1} className={styles.h2}>Einspeisevergütung {year}: aktuelle Sätze und Vorjahre</h2>
        <ContentTable matrix id="aktuelle-verguetungstabelle" caption="Vergütung in ct/kWh" align="center" rowLabelWidth={124} columnWidth={94} columnLabel="Tarifspalte">
            <thead>
              <tr>
                <th scope="col">Inbetriebnahme</th>
                <th scope="col">Teil<br />≤{rates.thresholdKwp} kWp</th>
                <th scope="col">Teil<br />&gt;{rates.thresholdKwp} kWp*</th>
                <th scope="col">Voll<br />≤{rates.thresholdKwp} kWp</th>
                <th scope="col">Voll<br />&gt;{rates.thresholdKwp} kWp*</th>
              </tr>
            </thead>
            <tbody>
              {[...perioden].reverse().map((p) => {
                const aktuell = p.toIso === null;
                // Bewusst KEINE Daten-Balken je Zeile: Die Sätze dieser Ära
                // liegen nur ~6 % auseinander — null-basierte Balken wären
                // ununterscheidbar (reine Deko), nicht-null-basierte würden
                // die Unterschiede dramatisieren (Betreiber-Review 07.08.2026).
                return (
                  <tr key={p.fromIso} data-current={aktuell || undefined}>
                    <th scope="row">
                      {aktuell ? <>seit {dd(p.fromIso)}<br />(aktuell)</> : <>{dd(p.fromIso)} –<br />{dd(p.toIso as string)}</>}
                    </th>
                    <td>{ct(p.rates.teilUnder10)}</td>
                    <td>{ct(p.rates.teilOver10)}</td>
                    <td>{ct(p.rates.vollUnder10)}</td>
                    <td>{ct(p.rates.vollOver10)}</td>
                  </tr>
                );
              })}
            </tbody>
        </ContentTable>
        <p className={styles.p}>
          Mit dem EEG 2023 (Sätze ab 30. Juli 2022) wurde die Vergütung erstmals seit
          Langem wieder angehoben und in{" "}
          <GlossaryTerm id="teileinspeisung">Teileinspeisung</GlossaryTerm> (der Normalfall:{" "}
          <GlossaryTerm id="eigenverbrauch">Eigenverbrauch</GlossaryTerm> plus Überschuss
          ins Netz) und <GlossaryTerm id="volleinspeisung">Volleinspeisung</GlossaryTerm>{" "}
          geteilt. Maßgeblich ist das Inbetriebnahme-Halbjahr, der Satz bleibt dann{" "}
          {FEED_IN_YEARS} Jahre fest — die erste Zeile ist also der aktuelle Stand. Die
          Werte folgen der gesetzlichen Kette aus §§ 48, 49 und 53 EEG.
        </p>
        <p className={`${styles.p} ${styles.paragraphGap}`}>
          Alle Werte in ct/kWh, feste Einspeisevergütung für Gebäudeanlagen. *Satz für den
          Anlagenteil über {rates.thresholdKwp} kWp (Klasse bis 40 kWp); bei größeren
          Anlagen ergibt sich daraus ein gewichteter Mischsatz, den der{" "}
          <Link href="/einspeiseverguetung-rechner" className={styles.link}>Einspeisevergütungs-Rechner</Link>{" "}
          für deine Anlagengröße ausweist. {FEEDIN_DEGRESSION_SATZ} Nach geltendem Recht
          folgt die nächste <GlossaryTerm id="degression">Absenkung</GlossaryTerm> zum{" "}
          {naechsteAbsenkung}. Vom 30.07.2022 bis zum 31.01.2024 setzte die Absenkung
          gesetzlich aus, deshalb gilt für diesen Zeitraum eine gemeinsame Zeile. Alle
          aktuellen Werte mit Stand-Datum stehen auf der{" "}
          <Link href="/datenstand" className={styles.link}>Datenstand-Seite</Link>.
        </p>

        <p className={`${styles.p} ${styles.flushEnd}`}>
          Die aktuellen Sätze und die historischen Archivwerte haben unterschiedliche
          Bezugszeiträume. Achte beim Nachschlagen auf das Datum und die Größenklasse
          im Tabellenkopf. Quellen und Hinweise stehen bei der jeweiligen Tabelle.
        </p>
        <FeedinExamples dateIso={todayIso} electricityPrice={prices.electricityPrice} />

        {/* ── Monatstabelle 04/2012–07/2022 (BNetzA-Archiv) ── */}
        <h2 id="bestandsanlage" tabIndex={-1} className={styles.h2}>Einspeisevergütung 2012–2022: Monatstabellen für Bestandsanlagen</h2>
        <div className={`sc-feature-list ${styles.cardList}`}>
          <ExampleCard title="Welcher Satz gilt für deine Anlage?" motif="house">
            <p>Mit Inbetriebnahme-Datum und Anlagengröße findest du deinen Vergütungssatz – und siehst, wie viel bereits ausgezahlt wurde und noch aussteht.</p>
            <Link href="/einspeiseverguetung-rechner" className="sc-feature-action">Meinen Satz berechnen <IconArrowRight /></Link>
          </ExampleCard>
        </div>
        <p className={styles.p}>Oder direkt nachschlagen: seit 2022 in der <a href="#aktuelle-saetze" className={styles.link}>Tabelle oben</a>,
          April 2012 bis Juli 2022 in den Monatstabellen, davor in den <a href="#anfangsjahre" className={styles.link}>Jahreswerten seit 2000</a>.</p>
        <p className={styles.p}>
          Zwischen April 2012 und Juli 2022 änderte sich die Vergütung für neue Anlagen
          meist von Monat zu Monat — überwiegend nach unten, zeitweise stand sie still.
          Für Bestandsanlagen aus dieser Zeit zählt deshalb der{" "}
          <strong className={styles.strong}>Inbetriebnahme-Monat</strong>. Die Tabelle zeigt die
          feste Einspeisevergütung für Dachanlagen auf Wohngebäuden aus den
          Archivtabellen der Bundesnetzagentur; eine getrennte (höhere)
          Volleinspeisungs-Vergütung gab es in dieser Ära noch nicht — es galt ein Satz
          je Größenklasse.
        </p>
        <h3 className={styles.h3}>So liest du die Monatstabellen</h3>
        <p className={styles.p}>Wähle die passende Größenklasse und das Inbetriebnahmejahr. Die Jahre stehen zum Vergleich nebeneinander. Wische auf kleinen Bildschirmen seitlich zu weiteren Jahren; die Monatsspalte bleibt sichtbar. Am Schnittpunkt von Monat und Jahr findest du deinen Satz in ct/kWh.</p>
        <h3 className={styles.h3}>Anlagen bis 10 kWp</h3>
        <ArchivTabelle field="u10" />
        <h3 className={styles.h3}>Anlagenteil über 10 bis 40 kWp</h3>
        <ArchivTabelle field="u40" />
        <p className={`${styles.p} ${styles.paragraphGap}`}>
          Alle Werte in ct/kWh. Januar bis März 2012 gehören noch zur älteren
          Vergütungslogik (zu Jahresbeginn 2012: {ct(wert2012)} ct/kWh). Der
          Juli-2022-Wert gilt nur für Inbetriebnahmen bis zum 29.07. — zum Stichtag
          30.07.2022 hob das EEG 2023 den Satz auf {ct(eeg2023Start)} ct/kWh an (statt{" "}
          {ct(juliAlt)}, Klasse bis 10 kWp); ab da gilt die Halbjahres-Tabelle oben. Wie
          viel eine Bestandsanlage mit ihrem Satz übers Jahr und über die Laufzeit
          einnimmt, rechnet der{" "}
          <Link href="/einspeiseverguetung-rechner" className={styles.link}>Einspeisevergütungs-Rechner</Link> aus.
        </p>

        {/* ── Jahreswerte 2000–2011 ── */}
        <h2 id="anfangsjahre" tabIndex={-1} className={styles.h2}>Die Anfangsjahre: 2000 bis 2011</h2>
        <p className={styles.p}>
          In den Anfangsjahren des EEG lag die Vergütung um ein Vielfaches höher — in der
          Spitze bei {ct(maxWert)} ct/kWh ({maxJahr}). Die Werte sind Jahresanfangs-Stände
          für die kleinste Dachanlagen-Klasse; für die exakte Vergütung einer konkreten
          Altanlage ist der Bescheid bzw. die Abrechnung des Netzbetreibers maßgeblich —
          aus dieser Zeit gibt es hier bewusst keine Monatswerte.
        </p>
        <ContentTable compact showCaption={false} caption="Vergütung in ct/kWh · Inbetriebnahme zum Jahresbeginn">
            <thead>
              <tr>
                <th scope="col">Inbetriebnahme<br />(Jahresbeginn)</th>
                <th scope="col">Vergütung (ct/kWh)</th>
              </tr>
            </thead>
            <tbody>
              {vor2012.map((r) => (
                <tr key={r.year}>
                  <th scope="row">{r.year}</th>
                  <td data-bar style={{ "--table-bar-size": `${r.value / maxWert * 100}%` } as CSSProperties}>{ct(r.value)}</td>
                </tr>
              ))}
            </tbody>
        </ContentTable>
        <p className={`${styles.p} ${styles.paragraphGap}`}>
          Klasse: bis 2008 Dachanlagen bis 30 kW (die 10-kWp-Klasse existierte noch
          nicht), ab April 2012 bis 10 kWp.{" "}
          <DataSourceNote source={DATA_SOURCES.eegVerguetung} /> Wie der fallende Satz und
          der Zubau zusammenhängen, zeigt die{" "}
          <Link href="/photovoltaik-zubau-deutschland" className={styles.link}>PV-Zubau-Datenstory</Link>{" "}
          mit dem interaktiven Chart seit 2000.
        </p>

        {/* ── Verlaufs-Chart 2000–2027 mit Ereignis-Timeline (Zubau-Muster) ──
             Der Chart beantwortet „wie ist der Verlauf und warum?", die
             Tabellen oben „was gilt für mich?" — beides sichtbar. Die
             Meilensteine sind die kuratierten ZUBAU_EVENTS (eine Quelle). ── */}
        <h2 id="verlauf" tabIndex={-1} className={styles.h2}>Wie hat sich die Einspeisevergütung seit 2000 entwickelt?</h2>
        <p className={styles.p}>
          Von {ct(maxWert)} ct/kWh in der Spitze ({maxJahr}) auf {ct(rates.teilUnder10)} ct
          heute: Bis 2011 zeigt der Chart Jahresbalken, ab April 2012 läuft die
          monatliche Reihe als Linie weiter — jeder Wert ist der Satz, der für
          Anlagen dieses Inbetriebnahme-Zeitraums {FEED_IN_YEARS} Jahre fest gilt. Beim
          Überfahren oder Antippen erscheint der exakte Wert; die Punkte darunter
          markieren wichtige politische Entscheidungen. Tippe ein Ereignis an,
          um den Hintergrund zu lesen.
        </p>
        <VerlaufMitMeilensteinen jahre={chartJahre} />
        <p className={`${styles.p} ${styles.paragraphGap} ${styles.contextGap}`}>
          Kleinste Dachanlagen-Klasse (bis März 2012: bis 30 kW, ab April 2012: bis 10 kWp), ab dem
          30.07.2022 Teileinspeisung; 2000–2011 Jahresanfangswerte. Der sichtbare Sprung
          im Juli 2022 ist die EEG-2023-Anhebung zum Stichtag 30.07.2022 — real, kein
          Datenfehler; die Linie zeigt für Juli 2022 den bis zum 29.07. gültigen Satz.
        </p>

        {/* ── EEG-Reform: Sachstand (geteilte Quelle, kein eigener Rechtssatz) ── */}
        <aside className={styles.note} aria-labelledby="eeg-reform-hinweis">
          <header><span className={styles.small}>Stand: {REFORM_STAND}</span><h3 id="eeg-reform-hinweis">Geplante EEG-Reform 2027</h3></header>
          <p className={styles.p}>{EEG_REFORM_VORHABEN_SATZ}.</p>
          <p className={styles.p}>{eegVerfahrenSatz()}</p>
          <p className={styles.p}>{eegBestandsschutzSatz()} — an den Tabellen auf dieser Seite ändert der Entwurf nichts.</p>
          <p className={styles.p}>Was die Reform für neue Anlagen bedeutet, steht im Ratgeber <Link href="/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung" className={styles.link}>„Lohnt sich PV ohne Einspeisevergütung?"</Link></p>
        </aside>

        <p className={styles.p}>
          Der Satz, mit dem eine Anlage in Betrieb geht, bleibt{" "}
          {FEED_IN_YEARS} Jahre fest — deshalb steht in den Tabellen für jeden
          Inbetriebnahme-Zeitraum ein eigener Wert, in der Spitze{" "}
          {ct(maxWert)} ct/kWh ({maxJahr}). Selbst verbrauchter Strom spart mit
          rund {strompreisCt} ct/kWh heute etwa das {priceRatio}-Fache der Vergütung.
        </p>

        {/* ── Wie lange wird gezahlt ── */}
        <h2 className={styles.h2}>Wie lange wird die Einspeisevergütung gezahlt?</h2>
        <p className={styles.p}>
          {feedInGarantieSatz()} Konkret: Eine Anlage, die {jahrgangEnde} in Betrieb
          ging, wird noch bis zum {endeDatum} vergütet; Anlagen mit Inbetriebnahme bis
          Ende {jahrgangEnde - 1} sind bereits aus der Vergütung gelaufen.
        </p>
        <p className={styles.p}>
          Nach dem Ende der Vergütung läuft die Ersparnis durch{" "}
          <GlossaryTerm id="eigenverbrauch">Eigenverbrauch</GlossaryTerm> unverändert
          weiter — unser <Link href="/photovoltaik-rechner" className={styles.link}>PV-Rechner</Link>{" "}
          kalkuliert genau so: Vergütung nur {FEED_IN_YEARS} Jahre, danach null, die
          Eigenverbrauchs-Ersparnis über die gesamte Laufzeit.
        </p>

        {/* ── Nach der festen Vergütung: Marktwert Solar ──────────────────────
             Bewusst kurz (3–4 Sätze): die Rechnung dazu lebt im interaktiven
             Block des Reform-Ratgebers — dieselbe Frage zweimal zu beantworten
             wäre Thin Content gegen uns selbst. Zahl + Quelle kommen aus
             lib/marktwert-config.ts (eine Quelle, Realitäts-Anker im Repo);
             Entwurfs-Geldwerte stehen hier KEINE (Council-Vorbehalt). ── */}
        <h2 className={styles.h2}>Was kommt nach der festen Vergütung: der Marktwert Solar</h2>
        <p className={styles.p}>
          Wo keine feste Einspeisevergütung fließt — nach den {FEED_IN_YEARS} Jahren, oder
          falls die geplante Reform die feste Vergütung für Neuanlagen beendet —, bleibt
          für den Überschuss die Direktvermarktung: Ein Dienstleister verkauft den Strom
          an der Börse, du erhältst den Marktpreis abzüglich einer Gebühr. Maßstab dafür
          ist der <GlossaryTerm id="marktwert-solar">Marktwert Solar</GlossaryTerm>, den
          die Übertragungsnetzbetreiber veröffentlichen: {marktwert.jahr} lag er bei{" "}
          <strong className={styles.strong}>{ct(marktwert.ctKwh)} ct/kWh</strong> — gegenüber{" "}
          {ct(rates.teilUnder10)} ct fester Vergütung und rund {strompreisCt} ct
          Haushaltsstrompreis. Er liegt strukturell unter dem mittleren Börsenpreis, weil
          Solarstrom überall zur selben Zeit anfällt und das große Mittagsangebot den
          Preis genau dann drückt. Wie sich das auf Amortisation und Rendite auswirkt,
          zeigt der interaktive Renditevergleich im Ratgeber{" "}
          <Link href="/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung" className={styles.link}>
            „Lohnt sich PV ohne Einspeisevergütung?"
          </Link>
          .
        </p>
        <p className={`${styles.small} ${styles.source} ${styles.paragraphGap}`}>
          <DataSourceNote source={DATA_SOURCES.marktwertSolar} /> Jahresmarktwert{" "}
          {marktwert.jahr}, Stand siehe <Link href="/datenstand" className={styles.link}>Datenstand-Seite</Link>.
        </p>

        <section id="sc-cta-sentinel">
          <PvConsumerExample initialSystem={{kwp:10,spKwh:10,verbrauch:PERSONEN[2].verbrauch,ertrag:NATIONAL_AVG_YIELD,strom:prices.electricityPrice}} />
        </section>

        {/* ── FAQ (visible accordion + FAQPage JSON-LD from the same data) ── */}
        <Faq items={faqItems} title="Häufige Fragen zur Einspeisevergütung" currentPath="/einspeiseverguetung-tabelle" />

        <ArticleTeasers title="Weiterlesen"
          currentPath="/einspeiseverguetung-tabelle"
          items={[
            { href: "/einspeiseverguetung-rechner", title: "Einspeisevergütung-Rechner", teaser: "Satz für dein Inbetriebnahme-Datum plus Lebenslauf-Rechnung: schon erhalten und noch ausstehend." },
            { href: "/photovoltaik-rechner", title: "Photovoltaik-Rechner", teaser: "Amortisation, Rendite und Eigenverbrauch für deine Anlage — alle Annahmen transparent und anpassbar." },
            { href: "/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung", title: "Lohnt sich PV ohne Einspeisevergütung?", teaser: "Was die geplante EEG-Reform für neue Anlagen bedeutet — und warum Eigenverbrauch die Rechnung trägt." },
            { href: "/photovoltaik-zubau-deutschland", title: "PV-Zubau in Deutschland seit 2000", teaser: "Die Datenstory: Wie Einspeisevergütung, Strompreis und Zubau zusammenhängen — mit interaktivem Chart." },
            { href: "/datenstand", title: "Aktuelle Werte & Annahmen", teaser: "Datenstände und Grundlagen unserer Berechnungen." },
            { href: "/glossar", title: "Glossar", teaser: "Begriffe rund um Photovoltaik verständlich erklärt." },
          ]}
        />
        <p className={`${styles.small} ${styles.closingNote}`}>
          Die aktuellen Sätze folgen automatisch den gesetzlichen Stichtagen, die
          historischen Tabellen sind amtliche Archivstände. Ohne Gewähr; verbindlich sind
          Gesetz und Bescheid.
        </p>
        <StickyCta
          startId="bestandsanlage"
          primaer={{ href: "/einspeiseverguetung-rechner", label: "Vergütung berechnen" }}
          sekundaer={{ href: "/photovoltaik-rechner", label: "PV durchrechnen" }}
        />
</EditorialPage>
  );
}
