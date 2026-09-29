import "server-only";

import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

// Where finished videos live.
//
//   production  private Supabase Storage bucket (NOT created yet), handed out
//               through a signed URL that lives for minutes, not days
//   local pilot VIDEO_EXPORT_DIR on disk (never on Vercel)
//
// Object paths are "<widget>/<cache key>.mp4" — derived from the content,
// never from a person.

export const VIDEO_BUCKET = "widget-videos";

function localDir(): string | null {
  const dir = process.env.VIDEO_EXPORT_DIR;
  if (!dir) return null;
  if (process.env.VERCEL) throw new Error("video-export: local storage is not allowed on Vercel");
  return path.resolve(dir);
}

export function objectPath(widget: string, cacheKey: string): string {
  if (!/^[a-z0-9-]+$/.test(widget) || !/^[a-f0-9]{64}$/.test(cacheKey)) throw new Error("video-export: bad object path");
  return `${widget}/${cacheKey}.mp4`;
}

function safeLocal(dir: string, objPath: string): string {
  const full = path.resolve(dir, objPath);
  if (!full.startsWith(dir + path.sep)) throw new Error("video-export: path escapes storage");
  return full;
}

async function client() {
  const { supabase } = await import("./supabase-server");
  if (!supabase) throw new Error("video-export: storage not configured");
  return supabase.storage.from(VIDEO_BUCKET);
}

export async function putVideo(objPath: string, data: Buffer): Promise<void> {
  const dir = localDir();
  if (dir) {
    const full = safeLocal(dir, objPath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return;
  }
  const { error } = await (await client()).upload(objPath, data, { contentType: "video/mp4", upsert: true });
  if (error) throw new Error(`video-export upload: ${error.message}`);
}

/** Local: the bytes. Production: a short-lived signed URL to redirect to. */
export async function openVideo(objPath: string, filename: string): Promise<{ bytes: Buffer } | { url: string }> {
  const dir = localDir();
  if (dir) return { bytes: await readFile(safeLocal(dir, objPath)) };
  const { data, error } = await (await client()).createSignedUrl(objPath, 300, { download: filename });
  if (error || !data) throw new Error(`video-export sign: ${error?.message ?? "no url"}`);
  return { url: data.signedUrl };
}

export async function deleteVideos(objPaths: string[]): Promise<void> {
  if (!objPaths.length) return;
  const dir = localDir();
  if (dir) {
    for (const p of objPaths) await rm(safeLocal(dir, p), { force: true });
    return;
  }
  const { error } = await (await client()).remove(objPaths);
  if (error) throw new Error(`video-export delete: ${error.message}`);
}
