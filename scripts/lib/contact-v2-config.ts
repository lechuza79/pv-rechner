/**
 * Shared paths and rule version of the municipal contact search (second generation).
 *
 * The sender checks every recipient against the stored results; it must compute
 * the rule version exactly as the search does, so both read it from here.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

// Evidence lives in the main checkout's cache, also when this runs from a worktree.
export const MAIN_CHECKOUT = resolve(execSync("git rev-parse --path-format=absolute --git-common-dir", { cwd: REPO_ROOT }).toString().trim(), "..");
export const DEFAULT_AUDIT = resolve(MAIN_CHECKOUT, "scripts/.cache/contact-evidence/municipal-full-audit-2026-09-15-v3");
export const outDir = (audit = DEFAULT_AUDIT) => resolve(audit, "workflow/municipal-v2");

// Extraction and judgement files: a change re-judges everything, fetched pages stay.
export const EXTRACTION_FILES = ["lib/contact-evidence.ts", "lib/mail-deobfuscation.ts", "lib/contact-role-context.ts", "lib/contact-discovery.ts", "lib/personen-fund.ts", "lib/published-joomla-mail.ts", "lib/uri-sicher.ts", "lib/contact-heading-context.ts"];
export const JUDGE_FILES = [...EXTRACTION_FILES, "lib/contact-municipal-judge.ts", "lib/contact-quality-evidence.ts", "lib/gemeindeverband.ts", "scripts/contact-municipal-v2.ts", "scripts/lib/contact-v2-config.ts"];
const digestOf = (files: string[]) => sha(JSON.stringify(files.map(f => [f, sha(readFileSync(resolve(REPO_ROOT, f)))])));
export const extractionVersion = () => digestOf(EXTRACTION_FILES).slice(0, 16);
export const rulesVersion = () => digestOf(JUDGE_FILES).slice(0, 16);

/** A recheck older than this does not authorize a send. */
export const RECHECK_MAX_AGE_DAYS = 3;
