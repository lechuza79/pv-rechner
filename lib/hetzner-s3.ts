// Minimal S3 client for the Hetzner Object Storage bucket that holds the landscape scenes.
// Signature V4 by hand: one bucket, three operations, no SDK dependency for that.
import crypto from "node:crypto";

import { SZENEN_HOST, SZENEN_REGION } from "./szenen-speicher";

type Keys = { accessKey: string; secretKey: string };

export function keysFromEnv(env: NodeJS.ProcessEnv = process.env): Keys {
  const accessKey = env.HETZNER_S3_ACCESS_KEY, secretKey = env.HETZNER_S3_SECRET_KEY;
  if (!accessKey || !secretKey) throw new Error("HETZNER_S3_ACCESS_KEY / HETZNER_S3_SECRET_KEY missing");
  return { accessKey, secretKey };
}

const sha = (data: string | Buffer) => crypto.createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) => crypto.createHmac("sha256", key).update(data).digest();
// S3 path encoding: every segment encoded, slashes kept.
const encodePath = (key: string) => "/" + key.split("/").map(encodeURIComponent).join("/");

export async function s3Request(keys: Keys, method: string, key: string, opts: { query?: string; body?: Buffer; headers?: Record<string, string> } = {}) {
  const body = opts.body ?? Buffer.alloc(0);
  const amz = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amz.slice(0, 8);
  const payloadHash = sha(body);
  const headers: Record<string, string> = { host: SZENEN_HOST, "x-amz-content-sha256": payloadHash, "x-amz-date": amz };
  for (const [k, v] of Object.entries(opts.headers ?? {})) headers[k.toLowerCase()] = v;
  const names = Object.keys(headers).sort();
  const canonical = [method, encodePath(key), opts.query ?? "", names.map(n => `${n}:${headers[n].trim()}\n`).join(""), names.join(";"), payloadHash].join("\n");
  const scope = `${day}/${SZENEN_REGION}/s3/aws4_request`;
  const signKey = hmac(hmac(hmac(hmac("AWS4" + keys.secretKey, day), SZENEN_REGION), "s3"), "aws4_request");
  const signature = crypto.createHmac("sha256", signKey).update(["AWS4-HMAC-SHA256", amz, scope, sha(canonical)].join("\n")).digest("hex");
  const { host: _host, ...sent } = headers;
  const response = await fetch(`https://${SZENEN_HOST}${encodePath(key)}${opts.query ? `?${opts.query}` : ""}`, {
    method,
    body: body.length ? new Uint8Array(body) : undefined,
    headers: { ...sent, authorization: `AWS4-HMAC-SHA256 Credential=${keys.accessKey}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}` },
  });
  return response;
}

export async function putObject(keys: Keys, key: string, body: Buffer, headers: Record<string, string>) {
  const response = await s3Request(keys, "PUT", key, { body, headers });
  if (!response.ok) throw new Error(`PUT ${key}: ${response.status} ${await response.text()}`);
}

/** CORS: the site (and local dev) may read scenes cross-origin. */
export function corsXml(origins: string[]) {
  const rules = origins.map(o => `<AllowedOrigin>${o}</AllowedOrigin>`).join("");
  return `<CORSConfiguration><CORSRule>${rules}<AllowedMethod>GET</AllowedMethod><AllowedMethod>HEAD</AllowedMethod><AllowedHeader>*</AllowedHeader><MaxAgeSeconds>86400</MaxAgeSeconds></CORSRule></CORSConfiguration>`;
}

export async function putCors(keys: Keys, origins: string[]) {
  const body = Buffer.from(corsXml(origins));
  const md5 = crypto.createHash("md5").update(body).digest("base64");
  const response = await s3Request(keys, "PUT", "", { query: "cors=", body, headers: { "content-md5": md5, "content-type": "application/xml" } });
  if (!response.ok) throw new Error(`PUT cors: ${response.status} ${await response.text()}`);
}
