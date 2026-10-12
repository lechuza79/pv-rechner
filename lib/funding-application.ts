import { FUNDING_TECHNIK_LABEL, bedingungenFuer, type FundingProgram, type FundingTechnik } from "./funding-programs";

/** Reviewed programme instructions. Source observations alone never populate this field. */
export type FundingApplication = {
  checkedAt: string;
  sources: { url: string; title: string; quote: string }[];
  steps: {
    title: string;
    text: string;
    kind: "before-contract" | "application" | "approval" | "implementation" | "payment";
    evidenceUrls: string[];
    nur?: FundingTechnik[];
  }[];
  documents?: { text: string; evidenceUrls: string[]; nur?: FundingTechnik[] }[];
  contact?: { text: string; evidenceUrls: string[] };
  portal?: { url: string; label: string; evidenceUrls: string[] };
};

const text = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0;
const url = (s: unknown): s is string => {
  try { return text(s) && ["https:", "http:"].includes(new URL(s).protocol); } catch { return false; }
};

/** Structural evidence gate, not a substitute for reading or independent review. */
export function validFundingApplication(input: unknown, now = new Date()): input is FundingApplication {
  if (!input || typeof input !== "object") return false;
  const a = input as FundingApplication;
  if (!text(a.checkedAt) || !/^\d{4}-\d{2}-\d{2}T/.test(a.checkedAt) || !Number.isFinite(Date.parse(a.checkedAt)) || Date.parse(a.checkedAt) > now.getTime()) return false;
  if (!Array.isArray(a.sources) || !a.sources.length || !a.sources.every(s => s && url(s.url) && text(s.title) && text(s.quote))) return false;
  const evidence = (f: { evidenceUrls?: string[]; nur?: FundingTechnik[] }) => Array.isArray(f.evidenceUrls) && f.evidenceUrls.length > 0 && f.evidenceUrls.every(u => a.sources.some(s => s.url === u))
    && (f.nur === undefined || (Array.isArray(f.nur) && f.nur.length > 0 && f.nur.every(t => ["pv", "balkon", "waermepumpe"].includes(t))));
  if (!Array.isArray(a.steps) || !a.steps.length || !a.steps.every(s => s && text(s.title) && text(s.text) && ["before-contract", "application", "approval", "implementation", "payment"].includes(s.kind) && evidence(s))) return false;
  if (a.documents !== undefined && (!Array.isArray(a.documents) || !a.documents.every(d => d && text(d.text) && evidence(d)))) return false;
  if (a.contact !== undefined && (!a.contact || !text(a.contact.text) || !evidence(a.contact))) return false;
  if (a.portal !== undefined && (!a.portal || !url(a.portal.url) || !text(a.portal.label) || !evidence(a.portal))) return false;
  return true;
}

/** A changed source invalidates an older application walkthrough, not the rest of the page. */
export function fundingApplication(program: FundingProgram, technology?: FundingTechnik) {
  const a = program.application;
  if (!validFundingApplication(a) || (program.changedSinceIso && Date.parse(program.changedSinceIso) > Date.parse(a.checkedAt))) return null;
  const applies = (s: { nur?: FundingTechnik[] }) => !technology || !s.nur || s.nur.includes(technology);
  const steps = a.steps.filter(applies);
  return steps.length ? { ...a, steps, documents: a.documents?.filter(applies) } : null;
}

/** Reorganize existing wording without inventing order, timing, documents or eligibility. */
export function fundingConditionGroups(program: FundingProgram, technology?: FundingTechnik) {
  const all = bedingungenFuer(program.conditions, technology);
  const application = all.filter(c => /antrag|bewilligung|beauftragung|vorhabenbeginn|vertragsabschluss|liefer.*vertrag|leistungsvertrag|verwendungsnachweis|auszahlung/i.test(c));
  return { application, eligibility: all.filter(c => !application.includes(c)) };
}

export function fundingApplicationAnswer(program: FundingProgram): string {
  const application = fundingApplication(program);
  const timing = application?.steps.filter(s => s.kind === "before-contract" || s.kind === "application" || s.kind === "approval");
  if (timing?.length) return timing.map(s => `${s.nur?.length ? s.nur.map(t => FUNDING_TECHNIK_LABEL[t]).join(" / ") + ": " : ""}${s.text}`).join(" ");
  const notes = fundingConditionGroups(program).application;
  return notes.length ? notes.join(" ") : `Der Zeitpunkt ist für „${program.name}“ noch nicht verlässlich erfasst. Kläre vor Kauf oder Beauftragung bei ${program.traeger}, wann der Antrag gestellt werden muss und ob eine Bewilligung abzuwarten ist.`;
}
