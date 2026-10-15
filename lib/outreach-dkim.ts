// Shared by every send run (municipal letters and the general one in
// scripts/aussendung.ts). Moved out of the municipal run on 07.10.2026 so a
// second run does not get a second copy that misses the next key rotation.

/**
 * Ist DKIM überhaupt aktiv?
 *
 * SPF bricht bei JEDER Weiterleitung, DKIM überlebt sie — und diese
 * Empfängerliste besteht überwiegend aus kleinen Ortsgemeinden, deren
 * `info@`-Adresse an ein anderes Postfach weitergeleitet wird. Ohne DKIM heißt
 * das am Zielsystem `spf=fail, dkim=none, dmarc=fail`, bei einer Absenderdomain,
 * die dort noch nie etwas geschickt hat.
 *
 * DER SELEKTOR MUSS ANGEGEBEN WERDEN, ER LÄSST SICH NICHT RATEN.
 *
 * Erste Fassung fragte fest `default._domainkey` ab — der Konvention nach der
 * naheliegende Name. All-Inkl vergibt aber einen datierten eigenen Selektor
 * (`kas202603240809`), und die Zone von solar-check.io trägt zusätzlich einen
 * Wildcard-Eintrag: Damit ANTWORTET jede beliebige Selektor-Abfrage, nur eben
 * mit dem Wildcard-Ziel statt mit einem Schlüssel. Das Ergebnis las sich wie
 * „DKIM ist halb eingerichtet und kaputt", während es in Wahrheit längst lief.
 *
 * Eine geratene Prüfung ist schlimmer als keine: Sie behauptet einen Befund.
 * Deshalb kommt der Selektor aus der Umgebung (`OUTREACH_DKIM_SELECTOR`, mehrere
 * durch Komma getrennt), und ohne Angabe verweigert die Prüfung die Aussage.
 * Zu finden im KAS unter Tools → DNS-Einstellungen: der TXT-Eintrag, dessen
 * Name auf `._domainkey` endet und dessen Wert mit `v=DKIM1` beginnt.
 */
/**
 * Selectors All-Inkl has used for solar-check.io, newest first. A selector is
 * public DNS, not a secret, so it may live in code. All-Inkl ROTATES the key
 * under a new dated name and drops the old record: on 20.09.2026
 * kas202603240809 became kas202609200150, and the first run after that (06.10.)
 * stopped here because only the old name was configured. When the check fails
 * again, look up the new name (KAS → Tools → DNS-Einstellungen → solar-check.io,
 * TXT record ending in ._domainkey) and add it at the top.
 */
export const BEKANNTE_DKIM_SELEKTOREN = ["kas202609200150", "kas202603240809"];

export async function dkimAktiv(domain: string): Promise<{ ok: boolean; hinweis: string }> {
  const selektoren = [
    ...(process.env.OUTREACH_DKIM_SELECTOR ?? "").split(",").map((s) => s.trim()),
    ...BEKANNTE_DKIM_SELEKTOREN,
  ].filter((s, i, a) => s && a.indexOf(s) === i);
  if (!selektoren.length) {
    return {
      ok: false,
      hinweis:
        "OUTREACH_DKIM_SELECTOR ist nicht gesetzt — welcher Selektor signiert, lässt sich nicht raten " +
        "(ein Wildcard-DNS-Eintrag beantwortet jede Abfrage). Im KAS unter Tools → DNS-Einstellungen den " +
        "TXT-Eintrag suchen, dessen Name auf ._domainkey endet, und den Teil davor eintragen.",
    };
  }
  for (const sel of selektoren) {
    try {
      const res = await fetch(`https://dns.google/resolve?name=${sel}._domainkey.${domain}&type=TXT`, {
        headers: { accept: "application/dns-json" },
      });
      const json = (await res.json()) as { Answer?: { data: string }[] };
      // Der Wert MUSS `v=DKIM1` enthalten — ein Wildcard-Treffer tut das nicht.
      if ((json.Answer ?? []).some((a) => a.data.includes("v=DKIM1"))) {
        return { ok: true, hinweis: `DKIM-Schlüssel veröffentlicht (Selektor ${sel})` };
      }
    } catch (e) {
      return { ok: false, hinweis: `DKIM ließ sich nicht prüfen (${(e as Error).message}) — im Zweifel nicht senden.` };
    }
  }
  return {
    ok: false,
    hinweis: `Unter ${selektoren.map((s) => `${s}._domainkey.${domain}`).join(", ")} steht kein Schlüssel mit v=DKIM1.`,
  };
}

