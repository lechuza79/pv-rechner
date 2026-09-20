import { ordneAnfrageZu, type Anfrage } from "./funding-anfragen";
import { ordneEin, ohneZitat, type RohMail } from "./outreach-ruecklauf";

export type FundingReplyMail = RohMail & { roh: string; receivedAt: string };

/** Reuse the mailbox classifier; receipt, delivery and absence notices are not answers. */
export function fundingReplyCandidates(
  mails: FundingReplyMail[],
  inquiries: Anfrage[],
  subjects: Map<string, string>,
) {
  const latest = new Map<string, { programId: string; receivedAt: string; von: string; text: string; previousReplyAt: string | null }>();
  for (const mail of mails) {
    if (ordneEin(mail) !== "antwort") continue;
    const programId = ordneAnfrageZu(mail, inquiries, subjects);
    if (!programId) continue;
    const inquiry = inquiries.find((row) => row.programId === programId)!;
    const received = Date.parse(mail.receivedAt);
    const sent = Date.parse(inquiry.gesendetAm);
    if (!Number.isFinite(received) || !Number.isFinite(sent) || received < sent) continue;
    if (inquiry.antwortAm && received <= Date.parse(inquiry.antwortAm)) continue;
    const previous = latest.get(programId);
    if (previous && received <= Date.parse(previous.receivedAt)) continue;
    const own = ohneZitat(mail.text).trim();
    if (!own) continue;
    latest.set(programId, {
      programId, receivedAt: new Date(received).toISOString(), von: mail.von,
      text: own.length > 2000 ? own.slice(0, 1996) + " […]" : own,
      previousReplyAt: inquiry.antwortAm,
    });
  }
  return [...latest.values()];
}
