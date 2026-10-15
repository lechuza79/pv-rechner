/** Read-only: existing sending log and existing Web Analytics, no duplicate stored statistics. */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {MAIN_CHECKOUT} from "./lib/contact-v2-config";
import {aggregat} from "../lib/web-analytics";
import {NEWSLETTER_CAMPAIGNS, NEWSLETTER_VARIANTS, NEWSLETTER_ACTIONS, newsletterBatch, newsletterEventName, type NewsletterCampaign} from "../lib/newsletter-metrics";

async function main() {
  for (const line of readFileSync(resolve(MAIN_CHECKOUT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const campaign = process.argv[2] ?? "september-2026";
  if (!Object.hasOwn(NEWSLETTER_CAMPAIGNS, campaign)) throw new Error("Unbekannte Aussendung");
  const edition = NEWSLETTER_CAMPAIGNS[campaign as NewsletterCampaign];
  const since = `${edition.period}-01T00:00:00.000Z`, until = new Date().toISOString();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Versandprotokoll nicht erreichbar: Zugang fehlt");
  const {createClient} = await import("@supabase/supabase-js");
  const db = createClient(url, key, {auth: {persistSession: false}});
  const events = await aggregat({datensatz: "events", zeitraum: {seit: since, bis: until}, nach: ["eventName"], filter: `startswith(eventName, '${edition.event}_')`, limit: 100});
  if (events.some(row => row.eventName === "Others")) throw new Error("Ereignisantwort unvollständig");
  const rows = [];
  for (const variant of NEWSLETTER_VARIANTS) {
    const {count, error} = await db.from("aussendungen").select("id", {count: "exact", head: true}).eq("schub", newsletterBatch(campaign, variant)).neq("zielgruppe", "test").not("gesendet_am", "is", null).gte("gesendet_am", since).lte("gesendet_am", until);
    if (error || count === null) throw new Error(`Versandzahl fehlt: ${error?.message ?? "keine Antwort"}`);
    const values = Object.fromEntries(NEWSLETTER_ACTIONS.map(action => {
      const row = events.find(row => row.eventName === newsletterEventName(campaign, variant, action));
      const value = row ? Number(row.count) : 0;
      if (!Number.isFinite(value)) throw new Error("Ereigniszahl fehlt in der Statistikantwort");
      return [action, value];
    }));
    rows.push({variante: variant, vom_mailserver_angenommen: count, bild_ankuenfte: values.bild, button_ankuenfte: values.ort, widget_starts: values.start});
  }
  console.log(JSON.stringify({aussendung: edition.label, seit: since, bis: until, varianten: rows, hinweis: "Ereignisse, keine eindeutigen Personen oder Öffnungen. Testlinks ausgeschlossen. Reloads, Weiterleitungen und Linkprüfungen können mitzählen; blockierte Messung fehlt. Frühere Mails ohne Kennzeichnung sind nicht rückwirkend messbar. Versandannahme ist kein Zustellnachweis."}, null, 2));
}
main().catch(error => {console.error(error instanceof Error ? error.message : error); process.exitCode = 1;});
