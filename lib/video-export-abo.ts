import "server-only";

import { mkdir, writeFile } from "fs/promises";
import path from "path";


// Explicit subscription opt-in is confirmed by the same redeemed mail token.
// Local pilots record the handoff without touching production subscriptions.

export async function handOffSubscription(o: { ags: string; email: string; consentVersion: string; ip: string | null }): Promise<"handed_off" | "recorded_locally" | "failed"> {
  if (process.env.VIDEO_EXPORT_DATABASE_URL && !process.env.VERCEL) {
    const sink = process.env.VIDEO_MAIL_SINK;
    if (sink) {
      await mkdir(path.resolve(sink), { recursive: true });
      await writeFile(path.join(path.resolve(sink), `${new Date().toISOString().replace(/[:.]/g, "-")}-abo-handoff.json`),
        JSON.stringify({ kind: "abo-handoff", to: o.email, body: { ags: o.ags, email: o.email, quelle: "gemeinde", einwilligung: o.consentVersion }, executed: false }, null, 2));
    }
    return "recorded_locally";
  }
  try {
    // Called only after the one-time video confirmation token was redeemed.
    // The opt-in is stored independently and never inferred from a download.
    const { aboAnlegen, aboBestaetigen } = await import("./gemeinde-abo");
    const { ABO_TECHNIKEN } = await import("./abo-technik");
    const now = new Date().toISOString();
    const result = await aboAnlegen({regionId:o.ags, email:o.email, jetztIso:now,
      quelle:"gemeinde", ueberBrief:false, technikenGewaehlt:ABO_TECHNIKEN,
      ausVerwaltung:false, einwilligungVersion:o.consentVersion});
    if (result.art === "schon-angemeldet") return "handed_off";
    if (result.art !== "bestaetigung-noetig") return "failed";
    const confirmed = await aboBestaetigen(result.abo.id, now);
    return confirmed.ok ? "handed_off" : "failed";
  } catch (e) {
    console.error(`video-export abo handoff failed: ${e instanceof Error ? e.message : String(e)}`);
    return "failed";
  }
}
