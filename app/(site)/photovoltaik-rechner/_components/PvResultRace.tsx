"use client";
import { useMemo } from 'react';
import RaceChart from '../../../../components/charts/RaceChart';
import { pvResultRace } from '../../../../lib/pv-result-race';
import type { calc } from '../../../../lib/calc';
import { YEAR } from '../../../../lib/constants';
import type { WidgetDef } from '../../../../lib/widget-registry';
const euro = (n: number) => `${Math.round(n).toLocaleString('de-DE')} €`;
const widget: WidgetDef = { id: 'pv-persoenlich', title: 'Deine Stromkosten im Vergleich', kind: 'tool', shareUrl: 'https://solar-check.io/photovoltaik-rechner', shareText: 'Meine Photovoltaik-Rechnung', sources: [{ name: 'Solar Check · PV-Rechenmodell', url: 'https://solar-check.io/methodik' }], embeddable: false };
export default function PvResultRace({ result, consumption, price, rate, monthlyConsumption, autoplay }: { result: ReturnType<typeof calc>; consumption: number; price: number; rate: number; monthlyConsumption: number[]; autoplay: boolean }) {
  const race = useMemo(() => pvResultRace(result, consumption, price, rate, YEAR, monthlyConsumption), [result, consumption, price, rate, monthlyConsumption]);
  // Payback is permanent: a later battery replacement can undo an early crossing.
  let lastNegative = -1;
  for (let day = 0; day <= race.days; day++) if (race.grid[day] < race.solar[day]) lastNegative = day;
  const crossing = lastNegative < race.days ? lastNegative + 1 : -1;
  return <div className="wp-personal-race"><RaceChart showTitle={false} showYAxisLabels={false} valueUnit="€" widget={widget}
    kamera={{ key: 'pv', label: 'Photovoltaik', kurz: 'Photovoltaik', farbe: '--color-accent', werte: race.solar }}
    anderer={{ key: 'netz', label: 'Nur Netzstrom', kurz: 'Netzstrom', farbe: '--color-text-primary', werte: race.grid }}
    startJahr={YEAR} jahre={race.years} ersterTag={race.firstDay} datumVon={race.dateAt}
    ereignisse={[
      { tag: 0, jahr: YEAR, label: 'Die Anschaffung', text: `${euro(-result.years[0].kum)} nach Förderung. Danach senken Eigenverbrauch und Einspeiseerlöse deine Kosten.` },
      ...(crossing > 0 ? [{ tag: crossing, jahr: race.dateAt(crossing).jahr, label: 'Die Anlage hat sich bezahlt gemacht', text: 'Stromersparnis und Einspeiseerlöse gleichen deine Anschaffung aus.', linie: true }] : []),
      { tag: race.days, jahr: YEAR + race.years - 1, label: `Die Bilanz nach ${race.years} Jahren`, text: `${euro(race.solar[race.days])} mit Photovoltaik und ${euro(race.grid[race.days])} nur mit Netzstrom. Anschaffung, Speichertausch und Einspeiseerlöse sind berücksichtigt.` },
    ]}
    fmt={euro} fmtKurz={n => `${(n / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}k €`}
    titelHilfe={{ title: 'Deine Gesamtkosten', ariaLabel: 'Was vergleichen die beiden Linien?', inhalt: 'Anschaffung nach Förderung, Reststrom und gegebenenfalls Speichertausch, abzüglich Einspeiseerlösen. Verglichen wird mit demselben Verbrauch ohne PV.' }}
    zeitraumHilfe={{ title: 'Modellrechnung', ariaLabel: 'Wie genau ist der Verlauf?', inhalt: 'Die Kurve übernimmt die Geldbeträge derselben Rechnung wie das Ergebnis. Mit Standortdaten werden Monatswerte verwendet, sonst gleichmäßig verteilte Jahreswerte. Dazwischen wird interpoliert; das ist keine Wetterprognose.' }}
    ariaLabel={(date, solar, grid) => `Bis ${date}: Photovoltaik ${euro(solar)}, Netzstrom ${euro(grid)}.`}
    exportNote="Modellrechnung aus deinen Angaben. Geldbeträge aus dem PV-Rechenkern, dazwischen interpoliert."
    dateiname="meine-photovoltaik-rechnung" onsite branding={false} actions={false} autoplay={autoplay} initialProgress={0}
    tempo={{ ruhigeTage: 365, msJeTagStart: 10, msJeTagEnde: 1 }} /></div>;
}
