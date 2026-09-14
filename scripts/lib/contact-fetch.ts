import { abortableContactRead } from "./contact-deadline";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { contactCandidates, type ContactCandidate } from "../../lib/contact-evidence";

export type PageObservation = {
  requestedUrl: string; finalUrl: string | null; observedAt: string;
  status: "read" | "blocked" | "failed" | "not-html" | "needs-rendering";
  rendered?: boolean;
  error: string | null; candidates: ContactCandidate[];
};
export type PageResult = { observation: PageObservation; html: string | null };
const runId = randomUUID();

/** The timeout covers headers AND body. A 200 challenge is not a readable page. */
export async function fetchContactPage(url: string, options: {
  fetcher?: typeof fetch; timeoutMs?: number; userAgent?: string; organizationDomain?: string;
  render?: (url: string) => Promise<string>;
  record?: (observation: PageObservation) => void;
} = {}): Promise<PageResult> {
  const observation: PageObservation = { requestedUrl: url, finalUrl: null, observedAt: new Date().toISOString(), status: "failed", error: null, candidates: [] };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
  let html: string | null = null;
  try {
    const response = await abortableContactRead((options.fetcher ?? fetch)(url, { redirect: "follow", signal: controller.signal,
      headers: { "User-Agent": options.userAgent ?? "solar-check.io contact-research/1.0 (+https://solar-check.io)", Accept: "text/html,application/xhtml+xml" } }), controller.signal);
    observation.finalUrl = response.url || url;
    if (!response.ok) { observation.status = [403, 429].includes(response.status) ? "blocked" : "failed"; observation.error = `HTTP ${response.status}`; }
    else if (!/html/i.test(response.headers.get("content-type") ?? "")) { observation.status = "not-html"; observation.error = "Not HTML"; }
    else {
      const bytes = await abortableContactRead(response.arrayBuffer(), controller.signal);
      const charset = /charset=["']?([\w-]+)/i.exec(response.headers.get("content-type") ?? "")?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(new TextDecoder("latin1").decode(bytes.slice(0, 4096)))?.[1] ?? "utf-8";
      try { html = new TextDecoder(charset).decode(bytes); } catch { html = new TextDecoder().decode(bytes); }
      if (/cf-chl-|<title>\s*(just a moment|access denied|attention required)/i.test(html)) {
        observation.status = "blocked"; observation.error = "Challenge page"; html = null;
      } else {
        observation.status = "read";
        if (/email hidden; JavaScript is required|data-cfemail|hivelogic_enkoder|<hrencrypted|data-encrypted/i.test(html)) {
          observation.status = "needs-rendering";
          observation.error = "Contact address requires browser rendering";
          if (options.render) {
            try {
              const rendered = await options.render(observation.finalUrl);
              if (/email hidden; JavaScript is required|<hrencrypted(?:\s|>)/i.test(rendered)) throw new Error("Hidden contact remains unresolved");
              html = rendered;
              observation.status = "read"; observation.error = null; observation.rendered = true;
            } catch (error) { observation.error = `Rendering incomplete: ${String(error).slice(0,180)}`; }
          }
        }
        observation.candidates = contactCandidates(html, observation.finalUrl, options.organizationDomain ?? new URL(url).hostname.replace(/^www\./, ""));
      }
    }
  } catch (e) { observation.error = controller.signal.aborted ? "Timeout" : String(e).slice(0, 200); }
  finally { clearTimeout(timer); }
  // A failed evidence write must fail the run rather than pretend it was recorded.
  options.record?.(observation);
  return { html, observation };
}

export function contactEvidenceDirectory(): string {
  if (process.env.CONTACT_EVIDENCE_DIR) return resolve(process.env.CONTACT_EVIDENCE_DIR);
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim();
  return resolve(dirname(common), "scripts/.cache/contact-evidence");
}

/** Private append-only evidence in the main checkout, surviving worktree removal. */
export function recordContactPage(dataset: string, observation: PageObservation): void {
  const dir = resolve(contactEvidenceDirectory(), "pages");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  appendFileSync(resolve(dir, `${dataset}-${runId}.jsonl`), JSON.stringify({ dataset, runId, ...observation }) + "\n", { mode: 0o600 });
}
