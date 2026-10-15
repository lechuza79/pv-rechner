import type { FundingProgram } from "./funding-programs";

/** A source fetch or unchanged verification is not a revision of our content. */
export function fundingContentDate(programs: FundingProgram[]): Date | undefined {
  const dates = programs.flatMap(p => p.contentUpdatedAt && Number.isFinite(Date.parse(p.contentUpdatedAt)) && Date.parse(p.contentUpdatedAt) <= Date.now() ? [Date.parse(p.contentUpdatedAt)] : []);
  return dates.length ? new Date(Math.max(...dates)) : undefined;
}
