import { fundingStandLabel, type FundingProgram } from "../lib/funding-programs";
import { dashboardDate } from "../lib/dashboard/format";

/** Preserve value age and verification caveats while sharing the site's date syntax. */
export function FundingStand({ program, compact = false }: { program: FundingProgram; compact?: boolean }) {
  const label = fundingStandLabel(program).replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g, (_, day, month, year) => dashboardDate(`${year}-${month}-${day}`));
  const caveat = label.includes(" · ") ? label.slice(label.indexOf(" · ")) : "";
  const verified = program.lastVerified && Number.isFinite(Date.parse(program.lastVerified));
  return <span>{verified ? <>Zuletzt geprüft am <time dateTime={program.lastVerified}>{dashboardDate(program.lastVerified!)}</time></> : "Werte noch nicht nachgeprüft"}{!compact && <> · Werte von {program.stand}</>}{caveat}</span>;
}
