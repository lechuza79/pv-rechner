"use client";
import { useMemo } from 'react';
import RaceChart, { type RaceEreignis } from '../../../../components/charts/RaceChart';
import { heatPumpRace } from '../../../../lib/heatpump-race';
import type { HeatPumpResult } from '../../../../lib/heatpump';
import { YEAR } from '../../../../lib/constants';
import type { WidgetDef } from '../../../../lib/widget-registry';

const euro = (value: number) => `${Math.round(value).toLocaleString('de-DE')} €`;
const widget: WidgetDef = {
  id: 'waermepumpe-persoenlich', title: 'Zwei Heizungen. Deine Kosten.', kind: 'tool',
  shareUrl: 'https://solar-check.io/waermepumpe-rechner', shareText: 'Meine Heizkosten im Vergleich',
  sources: [{ name: 'Solar Check · Wärmepumpen-Rechenmodell', url: 'https://solar-check.io/methodik' }],
  embeddable: false,
};

export default function PersonalHeatRace({ result, reference, autoplay = true }: { result: HeatPumpResult; reference: string; autoplay?: boolean }) {
  const race = useMemo(() => heatPumpRace(result, YEAR), [result]);
  const events: RaceEreignis[] = [
    { tag: 0, jahr: YEAR, label: 'Am Anfang steht die Anschaffung', text: `Wärmepumpe nach Förderung: ${euro(result.investNetto)}. ${reference}: ${euro(result.gasInvest)}. Laufende Kosten kommen über die Jahre dazu.` },
  ];
  if (result.amortisationsJahre !== null && result.amortisationsJahre > 0 && result.amortisationsJahre < race.years) {
    const year = result.amortisationsJahre;
    const day = Math.round((Date.UTC(YEAR + year, 0, 1) - Date.UTC(YEAR, 0, 1)) / 86_400_000);
    events.push({ tag: day, jahr: YEAR + year - 1, label: `Mehrkosten nach ${year} Jahren ausgeglichen`, text: 'Zum Ende dieses Rechenjahres bleibt die Wärmepumpe laut Modell insgesamt günstiger. Gemeint sind die Mehrkosten gegenüber der Vergleichsheizung, nicht die gesamte Anschaffung.', linie: true });
  }
  events.push({ tag: race.days, jahr: YEAR + race.years - 1, label: `Die Bilanz nach ${race.years} Jahren`, text: `${euro(result.tcoWp)} mit Wärmepumpe und ${euro(result.tcoGas)} mit ${reference}. Enthalten sind Anschaffung, Förderung und laufende Kosten sowie gegebenenfalls der angerechnete PV-Nutzen.` });
  return <div className="wp-personal-race">
    <RaceChart key={`${result.tcoWp}-${result.tcoGas}-${result.investNetto}-${reference}`}
      showTitle={false}
      showYAxisLabels={false}
      valueUnit="€"
      widget={widget}
      kamera={{ key: 'wp', label: 'Wärmepumpe', kurz: 'Wärmepumpe', farbe: '--color-accent', werte: race.wp }}
      anderer={{ key: 'fossil', label: reference, kurz: reference, farbe: '--color-text-primary', werte: race.fossil }}
      startJahr={YEAR} jahre={race.years} ersterTag={race.firstDay} datumVon={race.dateAt}
      ereignisse={events} fmt={euro} fmtKurz={value => `${(value / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}k €`}
      titelHilfe={{ title: 'Deine Gesamtkosten', ariaLabel: 'Was vergleichen die beiden Linien?', inhalt: 'Beide Linien verwenden deine Eingaben und die gewählte Preisannahme. Je niedriger eine Linie, desto weniger kostet die Heizung insgesamt.' }}
      zeitraumHilfe={{ title: 'Jahreswerte im Zeitverlauf', ariaLabel: 'Wie genau ist der Verlauf?', inhalt: 'Der Rechner ermittelt Jahreskosten. Die Heizkosten folgen historischen Temperaturdaten: mehr im Winter, weniger im Sommer. Warmwasser, Nebenkosten und der angerechnete PV-Nutzen werden gleichmäßig verteilt. Die Jahressummen bleiben unverändert. Der Verlauf ist keine tagesgenaue Prognose; Wetter und künftige Energiepreise sind nicht vorhergesagt.' }}
      ariaLabel={(stand, wp, fossil) => `Modellrechnung bis ${stand}: Wärmepumpe ${euro(wp)}, ${reference} ${euro(fossil)}.`}
      exportNote="Modellrechnung aus deinen Eingaben. Saisonaler Heizverlauf anhand historischer Temperaturdaten bei unveränderten Jahressummen. Keine Wetterprognose."
      dateiname="mein-heizkostenvergleich" onsite branding={false} actions={false} autoplay={autoplay} initialProgress={0}
      tempo={{ ruhigeTage: 365, msJeTagStart: 10, msJeTagEnde: 1 }}
    />
  </div>;
}
