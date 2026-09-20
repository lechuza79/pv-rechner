import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ContactDataset } from "../../lib/contact-discovery";
export type BatchTarget = { dataset: ContactDataset; organization_id: string; website: string | null; priorClassification?: string | null };
export const targetKey = (target: BatchTarget) => `${target.dataset}:${target.organization_id}`;
export const targetFilename = (target: BatchTarget) => createHash("sha256").update(targetKey(target)).digest("hex") + ".json";
export function atomicJson(path: string, value: unknown) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2), {mode:0o600});
  renameSync(temporary, path);
}

/** Immutable target inventory and one durable result per target make omissions
 * and interruption recovery measurable. A failed crawl is never an empty one. */
export async function runContactBatch(options: {
  targets: BatchTarget[]; directory: string; concurrency: number;
  run: (target: BatchTarget) => Promise<Record<string, unknown>>;
  progress?: (completed: number, total: number) => void;
}) {
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) throw Error("concurrency must be 1..8");
  if (new Set(options.targets.map(targetKey)).size !== options.targets.length) throw Error("Duplicate organization in inventory");
  mkdirSync(options.directory, {recursive:true, mode:0o700});
  let next = 0; let completed = 0;
  let fatal: unknown = null;
  const hostLocks = new Map<string, Promise<void>>();
  const worker = async () => {
    while (!fatal && next < options.targets.length) {
      try {
      const target = options.targets[next++];
      const path = resolve(options.directory, targetFilename(target));
      if (existsSync(path)) {
        const saved = JSON.parse(readFileSync(path, "utf8"));
        if (saved.dataset !== target.dataset || saved.organization_id !== target.organization_id || typeof saved.status !== "string") throw Error("Invalid saved result; refusing silent skip");
        options.progress?.(++completed, options.targets.length); continue;
      }
      let host = targetKey(target);
      try { host = new URL(/^https?:/i.test(target.website ?? "") ? target.website! : `https://${target.website}`).hostname; } catch { /* No site. */ }
      const previous = hostLocks.get(host) ?? Promise.resolve();
      let release!: () => void;
      const lock = new Promise<void>(done => { release = done; });
      hostLocks.set(host, lock);
      await previous;
      try {
        let result: Record<string, unknown>;
        try { result = await options.run(target); }
        catch (error) { result = {status:"run-failed", error:String(error).slice(0,500), pages:[], candidates:[], pending_urls:[]}; }
        atomicJson(path, {...result, dataset:target.dataset, organization_id:target.organization_id, source:target});
        options.progress?.(++completed, options.targets.length);
      } finally { release(); if (hostLocks.get(host) === lock) hostLocks.delete(host); }
      } catch (error) { fatal ??= error; }
    }
  };
  await Promise.all(Array.from({length:options.concurrency}, worker));
  if (fatal) throw fatal;
  return { attempted:completed, expected:options.targets.length };
}
