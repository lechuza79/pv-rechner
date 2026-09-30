import { FEED_IN_ARCHIV } from "../../../lib/feedin-archiv";
import { fmtCt } from "../../../lib/feedin-config";
import ContentTable from "../../../components/ContentTable";

const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];

function archivMatrix(field: "u10" | "u40"): { year: number; months: (number | null)[] }[] {
  const byYear = new Map<number, (number | null)[]>();
  for (const row of FEED_IN_ARCHIV) {
    const y = Number(row.ym.slice(0, 4));
    const m = Number(row.ym.slice(5, 7));
    if (!byYear.has(y)) byYear.set(y, Array(12).fill(null));
    byYear.get(y)![m - 1] = row[field];
  }
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, months]) => ({ year, months }));
}

export default function ArchivTabelle({ field }: { field: "u10" | "u40" }) {
  const years = archivMatrix(field);
  return <ContentTable matrix id={`archiv-tabelle-${field}`} caption="Monatswerte in ct/kWh">
    <thead><tr><th scope="col">Monat</th>{years.map(year => <th key={year.year} scope="col">{year.year}</th>)}</tr></thead>
    <tbody>{MONTHS.map((month, index) => <tr key={month}>
      <th scope="row">{month}</th>
      {years.map(year => <td key={year.year}>{year.months[index] == null ? "—" : fmtCt(year.months[index])}</td>)}
    </tr>)}</tbody>
  </ContentTable>;
}
