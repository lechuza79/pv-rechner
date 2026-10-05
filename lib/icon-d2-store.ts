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
const RETRY_TTL = 30 * 1000;
const files = new Map<string, { value: unknown; retryAt: number }>();
const pending = new Map<string, Promise<unknown>>();

/**
 * One JSON file from the weather store, by its path in the bucket.
 * `WEATHER_SNAPSHOT_DIR` points local runs at files written with `--lokal`;
 * the path's last segment is the file name there.
 */
export async function loadSnapshotFile<T>(path: string): Promise<T | null> {
  const hit = files.get(path);
  if (hit && Date.now() < hit.retryAt) return hit.value as T | null;
  const active = pending.get(path);
  if (active) return active as Promise<T | null>;
  const loading = readSnapshotFile<T>(path).finally(() => pending.delete(path));
  pending.set(path, loading);
  return loading;
}

async function readSnapshotFile<T>(path: string): Promise<T | null> {
  const hit = files.get(path);
  let value: T | null = null;
  const localDir = process.env.WEATHER_SNAPSHOT_DIR;
  if (localDir) {
    const local = `${localDir}/${path.replace(/^icon-d2\//, "")}`;
    value = await readFile(local, "utf8").then((text) => JSON.parse(text) as T).catch(() => null);
  } else if(supabase) {
    try {
      if(path === "icon-d2/park-wind.json") {
        const {data,error}=await withDbTimeout(
          supabase.from("park_weather_snapshot").select("payload").eq("singleton",true).maybeSingle(),
          "park weather snapshot", DB_SOFT_READ_TIMEOUT_MS,
        );
        if(!error && data) value=data.payload as T;
      } else {
      const { data, error } = await withDbTimeout(
        supabase.storage.from(SNAPSHOT_BUCKET).download(path),
        "weather snapshot",
        DB_SOFT_READ_TIMEOUT_MS,
      );
      if (!error && data) value = JSON.parse(await data.text()) as T;
      }
    } catch {
      value = null;
    }
  }
  // Keep the last good file over a failed read; a failed read is not "no sky".
  const loaded = value !== null;
  if (!value && hit?.value) value = hit.value as T;
  files.set(path, { value, retryAt: Date.now() + (loaded ? TTL : RETRY_TTL) });
  return value;
}

const previewFiles=new Map<string,{value:IconD2Shard|null;at:number}>();
/** Partial local previews are opt-in per postcode and never hide the shared shard. */
export async function loadIconD2Shard(key:string,postcode?:string){
  const dir=process.env.WEATHER_PREVIEW_SNAPSHOT_DIR;
  if(dir&&postcode){
    const filename=`${dir}/${key}.json`,now=Date.now();
    let cached=previewFiles.get(filename);
    if(!cached||now-cached.at>300000){
      const value=await readFile(filename,'utf8').then(text=>JSON.parse(text) as IconD2Shard).catch(()=>null);
      cached={value,at:now};previewFiles.set(filename,cached);
    }
    const local=cached.value,age=local?now-Date.parse(local.runInit):NaN;
    if(local?.points?.[postcode]&&age>=-60000&&age<=12*3600000)return local;
  }
  return loadSnapshotFile<IconD2Shard>(`icon-d2/${key}.json`);
}
