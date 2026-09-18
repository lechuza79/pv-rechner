import { NextRequest, NextResponse } from "next/server";
import { normalisiereEmail, siehtNachEmailAus } from "../../../../lib/gemeinde-abo";
import { wartelisteBelegSetzen, wartelisteEintragen } from "../../../../lib/warteliste";
import { WARTELISTE_FASSUNGEN, wartelisteFassung } from "../../../../lib/warteliste-einwilligung";
import { wartelisteAbmeldeLink, wartelisteBestaetigenLink } from "../../../../lib/warteliste-links";
import { wartelisteBestaetigungsMail } from "../../../../lib/warteliste-mail";
import { sendeAboMail } from "../../../../lib/abo-versand";

// ─── Sign up for a waitlist (header menu: "Angebot prüfen · Demnächst") ──────
//
// Called by public/shared-nav/nav.js with
//   { email, website (honeypot), elapsedMs, consent }
// and reads `error` from the JSON on failure; on success it shows its own
// "please confirm" text.
//
// Brakes, same as the town subscription: honeypot, a minimum fill time,
// five attempts per hour and origin (in memory), and in the data layer one
// entry per address with a resend window. THE ANSWER IS THE SAME whether the
// address is new, pending or already confirmed — otherwise this form tells
// anyone who is on the list.

export const runtime = "nodejs";

const FENSTER_MS = 60 * 60 * 1000;
const MAX_JE_FENSTER = 5;
/** Faster than this from opening the dialog to submitting is not a person. */
const MIN_AUSFUELLZEIT_MS = 1500;
const versuche = new Map<string, number[]>();

function zuOft(ip: string, jetzt: number): boolean {
  const liste = (versuche.get(ip) ?? []).filter((t) => jetzt - t < FENSTER_MS);
  const voll = liste.length >= MAX_JE_FENSTER;
  if (!voll) liste.push(jetzt);
  versuche.set(ip, liste);
  return voll;
}

const OK = () => NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  const jetzt = Date.now();
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
  if (zuOft(ip, jetzt)) {
    return NextResponse.json({ error: "Zu viele Versuche. Bitte später erneut." }, { status: 429 });
  }

  let p: Record<string, unknown>;
  try {
    p = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Machines: same friendly answer, so they do not learn to skip the trap.
  if (typeof p.website === "string" && p.website.trim()) return OK();
  if (typeof p.elapsedMs === "number" && p.elapsedMs < MIN_AUSFUELLZEIT_MS) return OK();

  const email = normalisiereEmail(typeof p.email === "string" ? p.email : "");
  if (!siehtNachEmailAus(email)) {
    return NextResponse.json({ error: "Diese E-Mail-Adresse sieht nicht richtig aus." }, { status: 400 });
  }

  // The wording the browser showed. Unknown versions fall back to the newest
  // one the server ships — a stored version must point at a real wording.
  const fassung = wartelisteFassung(p.consent) ?? WARTELISTE_FASSUNGEN[WARTELISTE_FASSUNGEN.length - 1];

  let ergebnis;
  try {
    ergebnis = await wartelisteEintragen({
      liste: fassung.liste,
      email,
      jetztIso: new Date(jetzt).toISOString(),
      einwilligungVersion: fassung.version,
    });
  } catch (e) {
    console.error("[Warteliste]", e);
    return NextResponse.json({ error: "Die Anmeldung klappt gerade nicht. Bitte später erneut versuchen." }, { status: 503 });
  }
  if (ergebnis.art === "keine-db") {
    return NextResponse.json({ error: "Die Anmeldung klappt gerade nicht. Bitte später erneut versuchen." }, { status: 503 });
  }
  if (ergebnis.art === "still") return OK();

  const basis = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
  // Signing throws without ABO_HMAC_SECRET; the form must still get JSON back
  // (it reads `error`), not an HTML error page.
  let versand: Awaited<ReturnType<typeof sendeAboMail>>;
  try {
    const mail = wartelisteBestaetigungsMail({
      liste: fassung.liste,
      bestaetigenUrl: wartelisteBestaetigenLink(basis, ergebnis.eintrag.id, jetzt),
      abmeldeUrl: wartelisteAbmeldeLink(basis, ergebnis.eintrag.id),
    });
    versand = await sendeAboMail({ an: email, subject: mail.subject, html: mail.html, text: mail.text, art: "bestaetigung" });
  } catch (e) {
    versand = { ok: false, fehler: (e as Error).message };
  }
  if (!versand.ok) {
    console.error("[Warteliste] Bestätigungsmail nicht versendet:", versand.fehler);
    return NextResponse.json(
      { error: "Die Bestätigungsmail konnte gerade nicht verschickt werden. Bitte später erneut versuchen." },
      { status: 503 },
    );
  }
  if (versand.beleg) await wartelisteBelegSetzen(ergebnis.eintrag.id, versand.beleg);
  return OK();
}
