/**
 * Reader for Vercel Web Analytics.
 *
 * WHY THIS FILE EXISTS AT ALL: the figures were repeatedly declared
 * unreachable. They never were. The Vercel MCP tool `get_web_analytics`
 * answers EVERY call with `404 Web Analytics not found` — measured on
 * 02.09.2026 with the correct project and team id, and with the account's
 * second project as a control, so it is not a project-level problem. The
 * documented REST endpoints answer HTTP 200 with the same ids and the same
 * credential. The tool is broken; access was never the issue.
 *
 * Nor is it a plan question. This is unrelated to "Observability Plus", which
 * gates the BILLING metrics used by lib/kostenwache.ts. Web Analytics is
 * enabled on the project (`webAnalytics.enabledAt`, 04.08.2026) and has data.
 *
 * Do not route this through the MCP tool again, and do not re-test the tool
 * hoping for a different answer.
 *
 * CREDENTIAL: `VERCEL_TOKEN` if set (that is how CI runs), otherwise the login
 * of the Vercel command line on this machine. The second path is what makes
 * this usable in a session without touching .env files.
 *
 * ONE LIMIT WORTH KNOWING: production only, and only since Web Analytics was
 * switched on. Anything before 04.08.2026 does not exist here — not as zero,
 * but as nothing at all.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASIS = "https://api.vercel.com/v1/query/web-analytics";

/** Project and team of solar-check.io, from .vercel/project.json. */
export const PROJEKT_ID = "prj_O8t2QRE8Ky0qNdPlvwy0k8vI12QJ";
export const TEAM_ID = "team_BaBCnU1MNXhDN7CQFJutbrFm";

/** Day Web Analytics started collecting. Nothing before this exists. */
export const ANALYTICS_SEIT = "2026-08-04";

/**
 * Where the Vercel command line keeps its login, per platform. Read, never
 * printed — the token must not reach a log or the shell history.
 */
function zugangAusCli(): string | null {
  const orte =
    process.platform === "darwin"
      ? [join(homedir(), "Library", "Application Support", "com.vercel.cli", "auth.json")]
      : [
          join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "com.vercel.cli", "auth.json"),
          join(homedir(), ".config", "com.vercel.cli", "auth.json"),
        ];
  for (const ort of orte) {
    try {
      const token = JSON.parse(readFileSync(ort, "utf8"))?.token;
      if (typeof token === "string" && token) return token;
    } catch {
      // Nicht vorhanden oder unlesbar — der nächste Ort ist dran.
    }
  }
  return null;
}

export function analyticsZugang(): string {
  const token = process.env.VERCEL_TOKEN || zugangAusCli();
  if (!token) {
    throw new Error(
      "Kein Vercel-Zugang: weder VERCEL_TOKEN gesetzt noch die Vercel-Kommandozeile angemeldet (`npx vercel login`).",
    );
  }
  return token;
}

export type Zeitraum = { seit: string; bis: string };

type Abfrage = {
  /** "visits" für Seitenaufrufe, "events" für die eigenen Ereignisse. */
  datensatz: "visits" | "events";
  zeitraum: Zeitraum;
  /** Eine oder zwei Dimensionen, z. B. ["requestPath"] oder ["eventName"]. */
  nach: string[];
  /** OData-Ausdruck, z. B. `startswith(requestPath, '/solar-atlas/')`. */
  filter?: string;
  /** Höchstens 100; alles darüber fasst Vercel selbst zu "Others" zusammen. */
  limit?: number;
};

export type Gruppe = Record<string, string | number>;

/**
 * Eine Aggregat-Abfrage. Gibt die Zeilen zurück, wie Vercel sie liefert — je
 * Zeile die Dimensionswerte plus `visitors` und `count` bzw. `pageviews`.
 *
 * "Others" bleibt drin. Sie herauszuwerfen würde eine Vollständigkeit
 * behaupten, die die Antwort nicht hat: Bei mehr als `limit` verschiedenen
 * Werten steckt der Rest genau dort.
 */
export async function aggregat({ datensatz, zeitraum, nach, filter, limit = 100 }: Abfrage): Promise<Gruppe[]> {
  const params = new URLSearchParams({
    projectId: PROJEKT_ID,
    teamId: TEAM_ID,
    since: zeitraum.seit,
    until: zeitraum.bis,
    limit: String(limit),
  });
  for (const d of nach) params.append("by", d);
  if (filter) params.set("filter", filter);

  const res = await fetch(`${BASIS}/${datensatz}/aggregate?${params}`, {
    headers: { Authorization: `Bearer ${analyticsZugang()}` },
  });
  if (!res.ok) {
    throw new Error(`Web Analytics antwortete ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return ((await res.json()) as { data: Gruppe[] }).data ?? [];
}

/** Seitenaufrufe je Adresse unterhalb eines Präfixes. */
export function aufrufeJeSeite(praefix: string, zeitraum: Zeitraum, limit = 100): Promise<Gruppe[]> {
  return aggregat({
    datensatz: "visits",
    zeitraum,
    nach: ["requestPath"],
    filter: `startswith(requestPath, '${praefix}')`,
    limit,
  });
}

/** Eigene Ereignisse je Name. */
export function ereignisseJeName(zeitraum: Zeitraum, limit = 100): Promise<Gruppe[]> {
  return aggregat({ datensatz: "events", zeitraum, nach: ["eventName"], limit });
}
