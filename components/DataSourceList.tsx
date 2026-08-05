import { DATA_SOURCES } from "../lib/data-sources";
import { DataSourceNote } from "./PoweredBy";
import { v, space } from "../lib/theme";

/**
 * Every external dataset we build on, rendered from lib/data-sources.ts.
 *
 * Names and licences are never typed here — they come from the register, so the
 * list on /ueber and /lizenz can never say something different from the credit
 * under a chart. Only the purpose ("wofür wir sie benutzen") is written by hand,
 * because the register does not carry it.
 */
const VERWENDUNG: Record<keyof typeof DATA_SOURCES, string> = {
  energyCharts: "Strommix, Stromerzeugung und Grenzflüsse in Echtzeit",
  ember: "Ländervergleich: Zubau von Erneuerbaren und Atomkraft",
  mastr: "Anlagenbestand in Deutschland (Solar-Atlas, Karten, Kennzahlen)",
  openMeteo: "Wetterdaten der Live-Simulation und der Kühlgradstunden",
  pvgis: "Standortabhängiger Solarertrag je Kilowatt-Peak",
  eurostat: "Haushaltsstrompreise im europäischen Vergleich",
  eegVerguetung: "Gesetzliche Einspeisevergütung seit dem Jahr 2000",
  marktwertSolar: "Börsenerlös für Solarstrom, wenn direkt vermarktet wird",
  beg: "Fördersätze der Bundesförderung für effiziente Gebäude",
  iw: "Preisszenarien zum Gebäudemodernisierungsgesetz",
  bkg: "Verwaltungsgrenzen der Karten",
  destatis: "Einwohnerzahlen der Gemeinden",
  uba: "Stromerzeugung und CO₂-Intensität im langen Rückblick seit 1990",
};

export default function DataSourceList() {
  const eintraege = Object.entries(DATA_SOURCES) as [keyof typeof DATA_SOURCES, (typeof DATA_SOURCES)[keyof typeof DATA_SOURCES]][];

  return (
    <ul style={S.list}>
      {eintraege.map(([schluessel, quelle]) => (
        <li key={schluessel} style={S.item}>
          <DataSourceNote source={quelle} label={`${VERWENDUNG[schluessel]}:`} />
        </li>
      ))}
    </ul>
  );
}

const S: Record<string, React.CSSProperties> = {
  list: {
    listStyle: "none",
    padding: 0,
    margin: `0 0 ${space.lg}px`,
    display: "flex",
    flexDirection: "column",
    gap: space.md,
  },
  item: {
    fontSize: v("--font-size-small"),
    lineHeight: 1.6,
    color: v("--color-text-muted"),
    paddingLeft: space.lg,
    borderLeft: `2px solid ${v("--color-border")}`,
  },
};
