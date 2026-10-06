import ResultSection from "../../../components/ResultSection";
import { IconArrowRight } from "../../../components/Icons";
import Script from "next/script";
import ExampleCard, { ExampleAmount, ExampleSize } from "../../../components/ExampleCard";
import { feedinExamples, FEEDIN_EXAMPLE_HOUSEHOLD } from "../../../lib/feedin-examples";
import { NATIONAL_AVG_YIELD } from "../../../lib/constants";
import editorial from "../../../components/EditorialContent.module.css";

const number = (n: number) => Math.round(n).toLocaleString("de-DE");
export function FeedinExamples({ dateIso, electricityPrice }: { dateIso: string; electricityPrice: number }) {
  return <section aria-labelledby="beispiele" >
    <link rel="stylesheet" href="/design-system/feature-card.css" precedence="default" />
    <Script src="/illustrations-motion/solar-illustrations.js" strategy="afterInteractive" />
    <h2 id="beispiele" className={editorial.h2}>Früher hohe Vergütung, heute günstiger eigener Strom.</h2>
    <p className={editorial.p}>Frühe Solaranlagen erhielten deutlich mehr Geld für eingespeisten Strom, waren aber auch erheblich teurer. Heute entsteht der Nutzen aus zwei Quellen: gesparten Stromkosten und der Vergütung für Überschüsse.</p>
    <p className={editorial.p}>Die drei Beispiele zeigen beides für neue Anlagen im ersten Jahr – vor Anschaffungs- und Betriebskosten.</p>
    <div className={`sc-feature-list ${editorial.cardList}`}>
      {feedinExamples(dateIso, electricityPrice).map(example => <ExampleCard key={example.kwp} title={<ExampleSize value={example.kwp} unit="kWp" />} titleLabel={`${example.kwp} kWp`} motif={example.kwp <= 5 ? "pv-modules-small" : example.kwp <= 10 ? "pv-modules-medium" : "pv-modules-large"}>
        <ExampleAmount amount={number(example.feedIn + example.saving)} period="im ersten Jahr" />
        <p>{number(example.feedIn)} € Einspeisevergütung und {number(example.saving)} € gesparte Stromkosten durch Eigenverbrauch.</p>
        <a className="sc-feature-action" href={`/photovoltaik-rechner?direkt=1&eingabe=1&a=4&ck=${example.kwp}&sk=0&vb=${FEEDIN_EXAMPLE_HOUSEHOLD}`}>Meine Anlage durchrechnen <IconArrowRight /></a>
      </ExampleCard>)}
    </div>
    <div className={editorial.p}><ResultSection title="Annahmen der Beispiele" summary={null}>
      <p>Gleicher Haushalt mit {number(FEEDIN_EXAMPLE_HOUSEHOLD)} kWh Jahresverbrauch, teils tagsüber zu Hause, ohne Speicher, Wärmepumpe oder E-Auto. Beispielertrag: {number(NATIONAL_AVG_YIELD)} kWh je kWp und Jahr bei optimaler Ausrichtung. Strompreis: {(electricityPrice * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} ct/kWh. Teileinspeisung mit den aktuellen Sätzen; über 10 kWp anteilig gewichtet. Eigenverbrauch aus dem bestehenden Rechenmodell. Gerundete Beträge, vor Anschaffungs- und Betriebskosten; keine Gewinnprognose.</p>
    </ResultSection></div>

  </section>;
}
