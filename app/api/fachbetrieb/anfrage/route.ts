import { NextResponse } from "next/server";
import { seiteFuerKennung, kurzname, anzeigename } from "../../../../lib/fachbetrieb-seite";
import { anfrageMailBetreff, anfrageMailHtml } from "../../../../lib/fachbetrieb-anfrage-mail";
import { anfrageMerken, ausErgebnisUrl } from "../../../../lib/fachbetrieb-anfrage-statistik";

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
  // Die Anschrift ist optional und wird bei uns NICHT gespeichert — sie geht
  // durch, damit der Betrieb das Dach vorab ansehen kann, und landet
  // ausdrücklich nicht in der anonymen Statistik: Adresse plus Anlagengröße ist
  // die Beschreibung genau eines Haushalts.
  const feld = (k: string, max: number) =>
    typeof payload[k] === "string" ? (payload[k] as string).trim().slice(0, max) : "";
  // Fotos werden DURCHGEREICHT, nicht gespeichert: Sie gehen als Anhang an den
  // Betrieb und liegen danach nirgends bei uns. Zwei Bilder, je höchstens 5 MB
  // — mehr verträgt eine Mail ohnehin nicht, und ein größeres Bild ist ein Scan
  // oder ein Irrtum.
  const rohFotos = Array.isArray(payload.fotos) ? payload.fotos : [];
  const fotos = rohFotos
    .slice(0, 2)
    .map((f) => (f && typeof f === "object" ? (f as { name?: unknown; inhalt?: unknown }) : {}))
    .filter((f) => typeof f.name === "string" && typeof f.inhalt === "string")
    .map((f) => ({
      // Der Dateiname kommt vom Client. Alles außer Buchstaben, Ziffern, Punkt
      // und Strich fliegt raus — ein Name mit Pfadanteilen hat in einem Anhang
      // nichts verloren.
      filename: (f.name as string).replace(/[^\w.\- ]+/g, "").slice(0, 80) || "foto.jpg",
      content: f.inhalt as string,
    }))
    .filter((f) => f.content.length < 7_000_000);

  const strasse = feld("strasse", 160);
  const plz = feld("plz", 10);
  const ort = feld("ort", 120);
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

  // Die Mail steht in einem eigenen Baustein: Sie ist ein Brief mit Anrede und
  // Unterschrift, kein Datenauszug — und was ein Brief sagt, gehört nicht in
  // eine Versandroute.
  const daten = {
    betriebKurz: kurzname(anzeigename(seite)),
    name,
    kontakt,
    nachricht,
    strasse,
    plz,
    ort,
    fotoAnzahl: fotos.length,
    ergebnisUrl,
  };
  const subject = anfrageMailBetreff(daten);
  const html = anfrageMailHtml(daten);

  try {
    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [empfaenger],
        subject,
        html,
        ...(fotos.length ? { attachments: fotos } : {}),
        // Antworten gehen direkt an den Interessenten, nicht an uns. Wir sind
        // der Weg, nicht die Zwischenstation.
        reply_to: kontakt.includes("@") ? kontakt : undefined,
      }),
    });
    if (!send.ok) {
      console.error(`[Fachbetrieb-Anfrage] Resend ${send.status}: ${await send.text()}`);
      return NextResponse.json({ error: "Senden fehlgeschlagen." }, { status: 502 });
    }
    // Erst NACH dem geglückten Versand merken — eine Statistik über Anfragen,
    // die nie ankamen, beschriebe etwas anderes als ihr Name sagt. Und ohne
    // alles Persönliche: Name, Kontakt und Nachricht bleiben hier draußen.
    await anfrageMerken({
      betriebDomain: seite.domain,
      schritt: "abgeschickt",
      mitNachricht: nachricht.length > 0,
      ...ausErgebnisUrl(ergebnisUrl),
    });
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
