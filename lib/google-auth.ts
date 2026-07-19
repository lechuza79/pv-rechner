// Google API — Service-Account OAuth2 (dependency-frei, nur node:crypto).
// Übernommen aus dem life-is-a-binge-Projekt: derselbe Service-Account (webmasters-
// Scope) lässt sich für mehrere Properties nutzen — er muss nur in der jeweiligen
// Search-Console-Property als Nutzer hinzugefügt werden.
//
// Setup:
//   1. Google Cloud Console: Projekt + "Search Console API" aktiviert, Service-
//      Account, JSON-Key heruntergeladen.
//   2. Search Console (solar-check.io): Service-Account-E-Mail als Nutzer hinzufügen.
//   3. Vercel: `base64 -i key.json | tr -d '\n'` → Env GOOGLE_SERVICE_ACCOUNT_JSON.
//   4. Lokal: Env leer lassen — Aufrufer überspringen dann still.

import crypto from "node:crypto";

const SCOPE = "https://www.googleapis.com/auth/webmasters";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKEN_LIFETIME_S = 3600;
const TOKEN_REFRESH_BUFFER_S = 300;

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

// Token-Cache auf Modulebene (lebt so lange wie die warme Serverless-Instanz).
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

export function getServiceAccountCredentials(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const json = JSON.parse(Buffer.from(raw, "base64").toString());
    if (!json.client_email || !json.private_key) {
      console.warn("[google-auth] Service-Account-JSON ohne client_email/private_key");
      return null;
    }
    return { client_email: json.client_email, private_key: json.private_key };
  } catch {
    console.warn("[google-auth] GOOGLE_SERVICE_ACCOUNT_JSON nicht parsebar");
    return null;
  }
}

function buildJwt(creds: ServiceAccountKey): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ iss: creds.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + TOKEN_LIFETIME_S }),
  );
  const signInput = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signInput);
  return `${signInput}.${signer.sign(creds.private_key, "base64url")}`;
}

export async function getGoogleAccessToken(creds: ServiceAccountKey): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.accessToken;

  const jwt = buildJwt(creds);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token exchange failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in - TOKEN_REFRESH_BUFFER_S) * 1000,
  };
  return data.access_token;
}
