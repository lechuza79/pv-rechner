/**
 * Reading the hourly model snapshot on the server — the one place that does.
 *
 * Live weather, the day curves and the solar gauge all read the same files;
 * a second loader would keep its own cache and its own idea of "stale".
 */
import { readFile } from "node:fs/promises";
import { supabase } from "./supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "./db-timeout";
import { SNAPSHOT_BUCKET, type IconD2Shard } from "./icon-d2";

/** Snapshot files change hourly; ten minutes in memory keeps reads rare. */
const TTL = 10 * 60 * 1000;
const files = new Map<string, { value: unknown; at: number }>();

/**
 * One JSON file from the weather store, by its path in the bucket.
 * `WEATHER_SNAPSHOT_DIR` points local runs at files written with `--lokal`;
 * the path's last segment is the file name there.
 */
export async function loadSnapshotFile<T>(path: string): Promise<T | null> {
  const hit = files.get(path);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T | null;
  let value: T | null = null;
  const localDir = process.env.WEATHER_SNAPSHOT_DIR;
  if (localDir) {
    const local = `${localDir}/${path.replace(/^icon-d2\//, "")}`;
    value = await readFile(local, "utf8").then((text) => JSON.parse(text) as T, () => null);
  } else if (supabase) {
    try {
      const { data, error } = await withDbTimeout(
        supabase.storage.from(SNAPSHOT_BUCKET).download(path),
        "weather snapshot",
        DB_SOFT_READ_TIMEOUT_MS,
      );
      if (!error && data) value = JSON.parse(await data.text()) as T;
    } catch {
      value = null;
    }
  }
  // Keep the last good file over a failed read; a failed read is not "no sky".
  if (!value && hit?.value) value = hit.value as T;
  files.set(path, { value, at: Date.now() });
  return value;
}

export const loadIconD2Shard = (key: string) => loadSnapshotFile<IconD2Shard>(`icon-d2/${key}.json`);
