// Auflösung der Search-Console-Property. Eine Quelle für alle GSC-Module
// (Search Analytics, Index-Status) — eine zweite Kopie der Auflösung wäre ein
// Fehler, kein Duplikat.
//
// Property: GSC_SITE_URL (Default: die Domain-Property "sc-domain:solar-check.io").
// Ist es eine URL-Präfix-Property, GSC_SITE_URL="https://solar-check.io/" setzen.

export const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";

let resolvedSite: string | null = null;

export async function resolveGscSiteUrl(token: string): Promise<string> {
  if (process.env.GSC_SITE_URL) return process.env.GSC_SITE_URL;
  if (resolvedSite) return resolvedSite;

  const res = await fetch(`${GSC_API_BASE}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC sites.list fehlgeschlagen: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { siteEntry?: { siteUrl: string; permissionLevel: string }[] };
  const sites = data.siteEntry ?? [];
  const match =
    sites.find((s) => s.siteUrl === "sc-domain:solar-check.io") ??
    sites.find((s) => s.siteUrl === "https://solar-check.io/") ??
    sites.find((s) => s.siteUrl.includes("solar-check.io"));
  if (!match) {
    throw new Error(
      `Service-Account hat auf keine solar-check.io-Property Zugriff. Sichtbare Properties: ${
        sites.map((s) => s.siteUrl).join(", ") || "(keine)"
      }. In der Search Console die SA-E-Mail als Nutzer der solar-check.io-Property hinzufügen.`,
    );
  }
  resolvedSite = match.siteUrl;
  return match.siteUrl;
}
