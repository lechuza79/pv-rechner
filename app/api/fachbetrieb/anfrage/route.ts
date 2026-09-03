import { NextResponse } from "next/server";
import { tokens } from "../../../../lib/theme";
import { seiteFuerKennung, anzeigename } from "../../../../lib/fachbetrieb-seite";

/**
 * Der Rückkanal: Ein Nutzer schickt sein Rechenergebnis an den Fachbetrieb,
 * von dessen Website er gekommen ist.
 *
 * ── Der Empfänger kommt aus der DATENBANK, nie aus der Anfrage ──────────────
 * Die Anfrage nennt eine Kennung, keine Adresse. Nähme die Route eine Adresse
 * entgegen, wäre sie ein offener Versandweg: Jeder könnte über unsere Domain
 * beliebige Post an beliebige Empfänger schicken, mit unserem Absender und
 * unserem Ruf darunter. Dieselbe Bauregel wie beim Förder-Abruf, der auch nur
 * eine Programm-Kennung annimmt.
 *
 * ── Was übermittelt wird ───────────────────────────────────────────────────
 * Name, Kontaktweg, Nachricht und ein Link auf die Rechnung — genau das, was
 * dem Nutzer vor dem Absenden angezeigt wurde. Nichts darüber hinaus, und
 * ausdrücklich kein Speichern des Interessenten bei uns: Wir sind der Weg,
 * nicht der Empfänger.
 *
 * ── Rechtsgrundlage ────────────────────────────────────────────────────────
 * Art. 6 Abs. 1 lit. b DSGVO für die Übermittlung (der Nutzer bittet selbst
 * darum). § 7 UWG ist nicht berührt — die Nachricht ist vom Empfänger her
 * gesehen keine unverlangte Werbung, sondern eine Anfrage an ihn.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "Solar Check <onboarding@resend.dev>";

const NAME_MAX = 120;
const KONTAKT_MAX = 200;
const NACHRICHT_MAX = 2000;

// Dieselbe Bauform wie im Kontaktformular: fünf Anfragen je Stunde und
// Adresse. Ein Formular, das eine Mail an einen Dritten auslöst, ohne Bremse
// ins Netz zu stellen, wäre ein Versandwerkzeug für jeden.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (requestLog.size > 500) {
    requestLog.forEach((times, key) => {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(key);
    });
  }
  const stamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (stamps.length >= RATE_LIMIT_MAX) {
    requestLog.set(ip, stamps);
    return true;
  }
  stamps.push(now);
  requestLog.set(ip, stamps);
  return false;
}

function clientIp(req: Request): string {
  const f = req.headers.get("x-forwarded-for");
  if (f) return f.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Nimmt nur Adressen der eigenen Domain an.
 *
 * Der Link kommt aus dem Browser und ist damit vom Absender bestimmbar. Ohne
 * diese Prüfung könnte jemand eine fremde Adresse einschleusen — und die Mail
 * trüge unseren Absender über einem Link, den wir nicht kennen.
 */
function eigenerLink(url: string): string | null {
  const basis = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
  try {
    const u = new URL(url);
    if (u.origin !== new URL(basis).origin) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const kennung = typeof payload.kennung === "string" ? payload.kennung : "";
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, NAME_MAX) : "";
  const kontakt = typeof payload.kontakt === "string" ? payload.kontakt.trim().slice(0, KONTAKT_MAX) : "";
  const nachricht = typeof payload.nachricht === "string" ? payload.nachricht.trim().slice(0, NACHRICHT_MAX) : "";
  const ergebnisUrl = typeof payload.ergebnisUrl === "string" ? eigenerLink(payload.ergebnisUrl) : null;

  if (name.length < 2 || kontakt.length < 5) {
    return NextResponse.json({ error: "Bitte Name und Kontaktweg angeben." }, { status: 400 });
  }

  // Der Empfänger wird aufgelöst, nicht übernommen.
  const seite = await seiteFuerKennung(kennung);
  if (!seite) {
    return NextResponse.json({ error: "Unbekannter Empfänger." }, { status: 404 });
  }

  // Ohne hinterlegte Mailadresse kann die Anfrage nicht zugestellt werden. Das
  // ist ein echter Fall: 15 % der erfassten Betriebe haben nur ein
  // Kontaktformular oder eine Telefonnummer. Der Nutzer erfährt es sofort,
  // statt auf eine Antwort zu warten, die nie kommt.
  const empfaenger = await empfaengerAdresse(seite.domain);
  if (!empfaenger) {
    return NextResponse.json(
      { error: "Für diesen Betrieb liegt uns keine E-Mail-Adresse vor." },
      { status: 409 },
    );
  }

  if (!RESEND_API_KEY) {
    console.error("[Fachbetrieb-Anfrage] RESEND_API_KEY not configured");
    return NextResponse.json({ error: "Versand nicht verfügbar." }, { status: 500 });
  }

  const betrieb = anzeigename(seite);
  // Steuerzeichen raus, bevor der Name in den Betreff geht — dieselbe
  // Absicherung wie im Kontaktformular.
  const sicherName = name.replace(/[\r\n\t]+/g, " ").slice(0, 60);
  const subject = `Anfrage über Ihren PV-Rechner – ${sicherName}`;

  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#3F3F3F">
    <h2 style="margin:0 0 4px">Neue Anfrage über Ihren PV-Rechner</h2>
    <p style="color:#777;margin:0 0 16px;font-size:${tokens["--font-size-small"]}">
      Jemand hat auf der für ${escapeHtml(betrieb)} eingerichteten Rechner-Seite
      eine Anlage durchgerechnet und Ihnen das Ergebnis geschickt.
    </p>
    <p style="font-size:${tokens["--font-size-body"]};line-height:1.7;margin:0 0 12px">
      <strong>Name:</strong> ${escapeHtml(name)}<br>
      <strong>Kontakt:</strong> ${escapeHtml(kontakt)}
    </p>
    ${nachricht ? `<div style="font-size:${tokens["--font-size-body"]};line-height:1.7;margin:0 0 16px">${escapeHtml(nachricht).replace(/\n/g, "<br>")}</div>` : ""}
    ${
      ergebnisUrl
        ? `<p style="margin:0 0 16px"><a href="${escapeHtml(ergebnisUrl)}" style="color:#1F6FEB">Die Rechnung ansehen</a><br>
           <span style="color:#777;font-size:${tokens["--font-size-caption"]}">Der Link öffnet dieselbe Rechnung mit allen Annahmen — Sie können sie weiterdrehen.</span></p>`
        : ""
    }
    <hr style="border:0;border-top:1px solid #E5E5E5;margin:20px 0">
    <p style="color:#777;font-size:${tokens["--font-size-caption"]};line-height:1.6;margin:0">
      Diese Nachricht kommt von solar-check.io. Wir vermitteln nichts und
      speichern die Angaben des Anfragenden nicht — die Anfrage geht
      ausschließlich an Sie. Wenn Sie keine solchen Anfragen mehr erhalten
      möchten, antworten Sie kurz auf diese Mail.
    </p>
  </div>`;

  try {
    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [empfaenger],
        subject,
        html,
        // Antworten gehen direkt an den Interessenten, nicht an uns. Wir sind
        // der Weg, nicht die Zwischenstation.
        reply_to: kontakt.includes("@") ? kontakt : undefined,
      }),
    });
    if (!send.ok) {
      console.error(`[Fachbetrieb-Anfrage] Resend ${send.status}: ${await send.text()}`);
      return NextResponse.json({ error: "Senden fehlgeschlagen." }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[Fachbetrieb-Anfrage] ${err instanceof Error ? err.message : "Unknown"}`);
    return NextResponse.json({ error: "Senden fehlgeschlagen." }, { status: 500 });
  }
}

/** Holt die hinterlegte Mailadresse des Betriebs. */
async function empfaengerAdresse(domain: string): Promise<string | null> {
  const { supabase } = await import("../../../../lib/supabase-server");
  if (!supabase) return null;
  const { data } = await supabase
    .from("fachbetriebe")
    .select("email")
    .eq("domain", domain)
    .maybeSingle();
  const mail = (data as { email?: string | null } | null)?.email?.trim();
  return mail && mail.includes("@") ? mail : null;
}
