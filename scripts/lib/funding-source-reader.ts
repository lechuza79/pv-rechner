import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sourceFailure, retryAt } from "../../lib/funding-source-policy";

export const EVIDENCE_RUN = process.env.FUNDING_RUN_ID ?? `local-${new Date().toISOString().replace(/[:.]/g, "-")}`;
export const EVIDENCE_DIR = resolve(process.env.FUNDING_EVIDENCE_DIR ?? `scripts/.cache/funding-evidence/${EVIDENCE_RUN}`);
type State = { url: string; next_retry_at: string | null; failure_reason: string | null };

export function recordStage(stage: string, data: Record<string, unknown>): void {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  appendFileSync(resolve(EVIDENCE_DIR, `${stage}.jsonl`), JSON.stringify({ run: EVIDENCE_RUN, stage, ...data }) + "\n");
}

/** No evaluation is allowed to replace the timestamp or bytes of an observation. */
export class FundingSourceReader {
  private state = new Map<string, State>();
  private loaded = false;
  private context = new AsyncLocalStorage<string[]>();
  async withEvidence<T>(work: () => Promise<T>): Promise<{ value: T; unreadable: string[] }> {
    const unreadable: string[] = [];
    const value = await this.context.run(unreadable, work);
    return { value, unreadable: [...new Set(unreadable)] };
  }
  private inFlight = new Map<string, Promise<Response>>();
  constructor(private db: SupabaseClient, private stage: string, private dry = false) {}
  async ready(): Promise<void> {
    if (this.loaded) return;
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await this.db.from("funding_source_state").select("url,next_retry_at,failure_reason").range(offset, offset + 999);
      if (error) { process.exitCode = 1; throw new Error(`Source evidence unavailable: ${error.message}`); }
      for (const row of data ?? []) this.state.set(row.url, row);
      if (!data || data.length < 1000) break;
    }
    this.loaded = true;
  }
  due(url: string): boolean {
    const until = this.state.get(url)?.next_retry_at;
    return !until || Date.parse(until) <= Date.now();
  }
  async fetch(input: string, init?: RequestInit): Promise<Response> {
    const existing = this.inFlight.get(input);
    if (existing) {
      try { return (await existing).clone(); } catch (error) { this.context.getStore()?.push(input); throw error; }
    }
    const pending = this.read(input, init);
    this.inFlight.set(input, pending);
    try { return (await pending).clone(); } catch (error) { this.context.getStore()?.push(input); throw error; } finally { this.inFlight.delete(input); }
  }
  private async read(input: string, init?: RequestInit): Promise<Response> {
    await this.ready();
    if (!this.due(input)) throw new Error("Source retry deferred; previous observation preserved");
    const attemptedAt = new Date().toISOString();
    let response: Response | undefined;
    let body = "";
    let bytes = new Uint8Array();
    try { response = await fetch(input, init); bytes = new Uint8Array(await response.clone().arrayBuffer()); body = new TextDecoder().decode(bytes); } catch { /* recorded as network failure */ }
    const reason = sourceFailure(response?.status ?? 0, response?.headers.get("content-type") ?? "", body, input, response?.url || input);
    const hash = createHash("sha256").update(bytes).digest("hex");
    mkdirSync(resolve(EVIDENCE_DIR, "bodies"), { recursive: true });
    // Content-addressed originals, including unreadable responses, retained in
    // the run artifact. Identical bytes can share a file, observations cannot.
    writeFileSync(resolve(EVIDENCE_DIR, "bodies", hash), bytes, { flag: "w" });
    const observation = { url: input, final_url: response?.url || input, attempted_at: attemptedAt, status: response?.status ?? 0,
      content_type: response?.headers.get("content-type") ?? null, sha256: hash, failure_reason: reason, readable: !reason };
    recordStage(this.stage, observation);
    const state = { url: input, next_retry_at: reason ? retryAt(reason, attemptedAt) : null, failure_reason: reason };
    this.state.set(input, state);
    if (!this.dry) {
      const { error } = await this.db.from("funding_source_state").upsert({ ...state, attempted_at: attemptedAt, final_url: observation.final_url, sha256: hash });
      if (error) { process.exitCode = 1; throw new Error(`Source observation not saved: ${error.message}`); }
    }
    if (reason || !response) throw new Error(`Source unreadable: ${reason}`);
    return response;
  }
}
