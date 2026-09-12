import { simpleParser } from "mailparser";
import type { RohMail } from "../../lib/outreach-ruecklauf";

/** Decode MIME before classification; raw Base64 is not a human reply. */
export async function readMail(source: Buffer | string): Promise<RohMail> {
  const mail = await simpleParser(source, { skipHtmlToText: false, skipTextToHtml: true, skipImageLinks: true });
  const headers: Record<string, string> = {};
  for (const h of mail.headerLines) headers[h.key.toLowerCase()] = h.line.replace(/^[^:]+:\s*/, "").replace(/\r?\n\s+/g, " ");
  return { von: mail.from?.value[0]?.address?.toLowerCase() ?? "", betreff: mail.subject ?? "", text: mail.text ?? "", kopf: headers };
}
