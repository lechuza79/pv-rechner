"use client";
import { useMemo } from 'react';
import RaceChart from '../charts/RaceChart';
import { balkonRace } from '../../lib/balkon-race';
import type { BalkonResult } from '../../lib/balkon';
import { YEAR } from '../../lib/constants';
import type { WidgetDef } from '../../lib/widget-registry';
const euro = (value: number) => `${Math.round(value).toLocaleString('de-DE')} €`;
const widget: WidgetDef = { id: 'balkon-persoenlich', title: 'Deine Stromkosten im Vergleich', kind: 'tool', shareUrl: 'https://solar-check.io/balkonkraftwerk/rechner', shareText: 'Meine Balkonkraftwerk-Rechnung', sources: [{ name: 'Solar Check · Balkonkraftwerk-Rechenmodell', url: 'https://solar-check.io/methodik' }], embeddable: false };
export default function BalkonRace({ result, autoplay }: { result: BalkonResult; autoplay: boolean }) {
  const race = useMemo(() => balkonRace(result, YEAR), [result]);
  const paybackDay = race.grid.findIndex((cost, day) => day > 0 && cost >= race.balcony[day]);
  const events = [
    { tag: 0, jahr: YEAR, label: 'Am Anfang steht die Anschaffung', text: `${euro(result.invest)} für dein Balkonkraftwerk nach Förderung. Danach sinkt dein Strombezug aus dem Netz.` },
    ...(paybackDay > 0 ? [{ tag: paybackDay, jahr: race.dateAt(paybackDay).jahr, label: 'Die Anschaffung ist ausgeglichen', text: 'Die eingesparten Stromkosten haben den Eigenanteil nach Förderung eingespielt.', linie: true }] : []),
    { tag: race.days, jahr: YEAR + race.years - 1, label: `Die Bilanz nach ${race.years} Jahren`, text: `${euro(race.balcony[race.days])} mit Balkonkraftwerk und ${euro(race.grid[race.days])} nur mit Netzstrom. Anschaffung und Reststrom sind eingerechnet.` },
  ];
  return <div className="wp-personal-race"><RaceChart showTitle={false} showYAxisLabels={false} valueUnit="€" widget={widget}
    kamera={{ key: 'balkon', label: 'Balkonkraftwerk', kurz: 'Balkonkraftwerk', farbe: '--color-accent', werte: race.balcony }}
    anderer={{ key: 'netz', label: 'Nur Netzstrom', kurz: 'Netzstrom', farbe: '--color-text-primary', werte: race.grid }}
    startJahr={YEAR} jahre={race.years} ersterTag={race.firstDay} datumVon={race.dateAt} ereignisse={events}
    fmt={euro} fmtKurz={value => `${(value / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}k €`}
    titelHilfe={{ title: 'Deine Gesamtkosten', ariaLabel: 'Was vergleichen die beiden Linien?', inhalt: 'Balkonkraftwerk inklusive Anschaffung und Reststrom gegenüber reinem Netzbezug. Je niedriger die Linie, desto geringer die Kosten.' }}
    zeitraumHilfe={{ title: 'Modellrechnung', ariaLabel: 'Wie genau ist der Verlauf?', inhalt: 'Die Monatswerte stammen aus derselben Solar- und Verbrauchssimulation wie das Ergebnis. Innerhalb eines Monats wird gleichmäßig interpoliert. Sommer und Winter sind berücksichtigt. Preisentwicklung, Moduldegradation und begrenzte Speicherlebensdauer sind enthalten; der Verlauf ist keine Wetterprognose.' }}
    ariaLabel={(stand, balcony, grid) => `Bis ${stand}: Balkonkraftwerk ${euro(balcony)}, Netzstrom ${euro(grid)}.`}
    exportNote="Modellrechnung aus deinen Angaben, saisonale Monatswerte der Solar- und Verbrauchssimulation, innerhalb der Monate interpoliert. Keine Wetterprognose."
    dateiname="mein-balkonkraftwerk-vergleich" onsite branding={false} actions={false} autoplay={autoplay} initialProgress={0}
    tempo={{ ruhigeTage: 365, msJeTagStart: 10, msJeTagEnde: 1 }} /></div>;
}
