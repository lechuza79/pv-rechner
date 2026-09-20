import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fundingPdfText, fundingContentGap, renderFundingSource, htmlText } from "./funding-document";
import { sourceFailure, retryAt, type SourceFailure } from "../../lib/funding-source-policy";

export const EVIDENCE_RUN = process.env.FUNDING_RUN_ID ?? `local-${new Date().toISOString().replace(/[:.]/g, "-")}`;
export const EVIDENCE_DIR = resolve(process.env.FUNDING_EVIDENCE_DIR ?? `scripts/.cache/funding-evidence/${EVIDENCE_RUN}`);
type State = { url: string; next_retry_at: string | null; failure_reason: string | null };

export function recordStage(stage: string, data: Record<string, unknown>): void {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  appendFileSync(resolve(EVIDENCE_DIR, `${stage}.jsonl`), JSON.stringify({ run: EVIDENCE_RUN, stage, ...data }) + "\n");
}

type PersistenceError = { message: string; code?: string; details?: string; hint?: string };
export class FundingPersistenceError extends Error {}

/**
 * Warum nicht nur `Error`: Ein Aufrufer muss „die Adresse ist WEG" von „ich
 * konnte sie nicht lesen" unterscheiden können, und zwar ohne eine
 * Fehlermeldung zu zerlegen. Nur `missing` (HTTP 404/410) ist eine Aussage
 * ÜBER die Quelle; `blocked`, `shell`, `network` und `server` sind Aussagen
 * über unseren Versuch. Wer beides gleich behandelt, hakt irgendwann eine
 * Förderseite ab, die bloß gerade nicht antwortete.
 */
export class FundingSourceUnreadable extends Error {
  constructor(readonly reason: SourceFailure | null, readonly url: string) {
    super(`Source unreadable: ${reason}`);
    this.name = "FundingSourceUnreadable";
  }
}

/** Retry only transient failures of idempotent database writes. */
export async function persistFundingWrite(
  work: () => PromiseLike<{ error: PersistenceError | null; status?: number }>,
  context: { operation: string; url: string; source_stage?: string; observed_at?: string },
): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let error: PersistenceError | null;
    let status: number | undefined;
    try { ({ error, status } = await work()); }
    catch (caught) { error = { message: caught instanceof Error ? caught.message : String(caught) }; }
    if (!error) {
      if (attempt > 1) recordStage("persistence", { ...context, outcome: "recovered", attempts: attempt });
      return;
    }
    const transient = status === 429 || (status !== undefined && status >= 500) ||
      /^(40001|40P01|53300|57P01|57014)$/.test(error.code ?? "") ||
      /fetch failed|failed to fetch|network|ECONN|ETIMEDOUT|socket|connection.*(?:closed|reset)|timeout|timed out/i.test(error.message);
    const retry = transient && attempt < 3;
    recordStage("persistence", { ...context, outcome: retry ? "retry" : "failed", attempt, status,
      code: error.code ?? null, message: error.message, details: error.details ?? null });
    if (!retry) {
      process.exitCode = 1;
      const message = `Funding persistence failed (${context.operation}, ${context.url}): ${error.code ?? ""} ${error.message}`;
      console.error(message);
      throw new FundingPersistenceError(message);
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 250));
  }
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
  constructor(private db: SupabaseClient, private stage: string, private dry = false, private enhanced = true) {}
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
    const previous = this.state.get(url);
    if (this.enhanced && previous?.failure_reason === "unsupported" && /\.pdf(?:$|\?)|[?&](?:ext|format)=pdf/i.test(url)) return true;
    const until = previous?.next_retry_at;
    return !until || Date.parse(until) <= Date.now();
  }
  async fetch(input: string, init?: RequestInit, navigation = false): Promise<Response> {
    const key = `${input}|${navigation}`;
    const existing = this.inFlight.get(key);
    if (existing) {
      try { return (await existing).clone(); } catch (error) { this.context.getStore()?.push(input); throw error; }
    }
    const pending = this.read(input, init, navigation);
    this.inFlight.set(key, pending);
    try { return (await pending).clone(); } catch (error) { this.context.getStore()?.push(input); throw error; } finally { this.inFlight.delete(key); }
  }
  /**
   * Eine Quelle für eine PRÜFUNG lesen, nicht für den Crawl — BLOCKER.
   *
   * Der Unterschied ist nicht die Abfrage, sondern was ein Fehlschlag KOSTET.
   * Ein Crawl-Abruf, der scheitert, sperrt die Adresse eine Woche; das ist dort
   * richtig, weil sonst jede Nacht dieselbe tote Seite gehämmert wird. Eine
   * Prüfung ist das Gegenteil: Ein Mensch hat die Seite bereits gelesen und
   * will seinen Beleg quittieren. Scheitert dabei unser Abruf, ist das „ich
   * konnte nicht gegenlesen" — keine Beobachtung über die Quelle.
   *
   * Gemessen am 20.09.2026: Der Abhak-Befehl rief den Reader OHNE die
   * Browser-Kennung auf, die jeder andere Aufrufer mitgibt. herzogenaurach.de
   * antwortet darauf mit 403 und mit Kennung mit 200 (130 kB). Der Abhaken
   * schrieb diesen 403 als Crawl-Beobachtung fort und sperrte sich damit FÜNF
   * Adressen bis zum 27.09. selbst — für eine Gemeinde, deren Programm längst
   * im Katalog stand. Der Vorrat wuchs also durch das Werkzeug, das ihn
   * abbauen soll.
   *
   * Deshalb: kein Schreiben in den Quellen-Zustand, und eine bestehende Sperre
   * hält diesen Weg nicht auf. Der Beleg-Abgleich beim Aufrufer bleibt davon
   * unberührt — was hier nicht gelesen werden kann, wird auch nicht quittiert.
   */
  async verify(input: string, init?: RequestInit): Promise<Response> {
    return this.read(input, init, false, true);
  }
  private async read(input: string, init?: RequestInit, navigation = false, verifying = false): Promise<Response> {
    await this.ready();
    if (!verifying && !this.due(input)) throw new Error("Source retry deferred; previous observation preserved");
    const attemptedAt = new Date().toISOString();
    let response: Response | undefined;
    let body = "";
    let bytes = new Uint8Array();
    try { response = await fetch(input, init); bytes = new Uint8Array(await response.clone().arrayBuffer()); body = new TextDecoder().decode(bytes); } catch { /* recorded as network failure */ }
    let reason = sourceFailure(response?.status ?? 0, response?.headers.get("content-type") ?? "", body, input, response?.url || input);
    const hash = createHash("sha256").update(bytes).digest("hex");
    mkdirSync(resolve(EVIDENCE_DIR, "bodies"), { recursive: true });
    // Content-addressed originals, including unreadable responses, retained in
    // the run artifact. Identical bytes can share a file, observations cannot.
    writeFileSync(resolve(EVIDENCE_DIR, "bodies", hash), bytes, { flag: "w" });
    let derived: { method: string; sha256: string; evaluated_at: string } | null = null;
    let content = body;
    if (this.enhanced && response?.ok) {
      try {
        let method = "";
        if (/application\/pdf/i.test(response.headers.get("content-type") ?? "") || Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-") {
          content = htmlText(await fundingPdfText(bytes)); method = "pdf-text";
        } else if (reason !== "blocked" && fundingContentGap(body) === "loading-shell") {
          content = await renderFundingSource(response.url || input); method = "browser-dom";
        }
        if (method) {
          reason = sourceFailure(response.status, "text/html", content, input, response.url || input);
          const derivedHash = createHash("sha256").update(content).digest("hex");
          writeFileSync(resolve(EVIDENCE_DIR, "bodies", derivedHash), content);
          derived = { method, sha256: derivedHash, evaluated_at: new Date().toISOString() };
        }
        if (!reason && fundingContentGap(content)) reason = "shell";
      } catch { reason = "shell"; }
    }
    const observation = { url: input, final_url: response?.url || input, attempted_at: attemptedAt, status: response?.status ?? 0,
      content_type: response?.headers.get("content-type") ?? null, sha256: hash, failure_reason: reason, readable: !reason, derived };
    recordStage(this.stage, observation);
    const state = { url: input, next_retry_at: reason ? retryAt(reason, attemptedAt) : null, failure_reason: reason };
    if (!this.dry && !verifying) {
      await persistFundingWrite(() => this.db.from("funding_source_state").upsert({ ...state, attempted_at: attemptedAt, final_url: observation.final_url, sha256: hash }),
        { operation: "source-state", url: input, source_stage: this.stage, observed_at: attemptedAt });
    }
    if (!verifying) this.state.set(input, state);
    const navigableShell = this.enhanced && reason === "shell" && navigation && response;
    if (navigableShell) this.context.getStore()?.push(input);
    if ((reason && !navigableShell) || !response) throw new FundingSourceUnreadable(reason, input);
    // The network signal may close the original stream while persistence runs.
    // Serve the already captured bytes, not a clone of that live stream.
    const payload = derived ? content : Buffer.from(bytes);
    const headers = new Headers(response.headers);
    if (derived) headers.set("content-type", "text/html; charset=utf-8");
    headers.delete("content-encoding");
    headers.delete("content-length");
    const captured = (): Response => {
      const result = new Response(payload, { status: response.status, headers });
      Object.defineProperty(result, "url", { value: response.url || input });
      Object.defineProperty(result, "clone", { value: captured });
      return result;
    };
    return captured();
  }
}
