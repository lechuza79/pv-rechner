import { NextRequest, NextResponse } from "next/server";
import { aboAnlegen, normalisiereEmail, siehtNachEmailAus, type AboQuelle } from "../../../../lib/gemeinde-abo";
import { bestaetigungsToken } from "../../../../lib/abo-token";
import { aboBestaetigungsMail } from "../../../../lib/abo-mail";
import { sendeAboMail } from "../../../../lib/abo-versand";
import { getRegionById } from "../../../../lib/atlas";

// ─── Anmeldung zu einem Gemeinde-Abo ─────────────────────────────────────────
//
// Öffentlich erreichbar, nimmt eine E-Mail-Adresse entgegen — damit gilt hier
// dasselbe Schutzmuster wie beim Kontaktformular: Ratenbegrenzung je Herkunft
// plus ein unsichtbares Feld gegen Maschinen.
//
// DIE ANTWORT IST IMMER DIESELBE, egal ob die Adresse neu ist, schon
// angemeldet war oder gerade bestätigt werden muss. Das ist kein Versehen: Wer
// hier verschiedene Antworten bekommt, kann die Adresse durchprobieren und
// erfährt, wer welchen Ort abonniert hat. Eine Anmeldemaske, die „diese
// Adresse ist bereits angemeldet" sagt, ist ein Abfragedienst für fremde
// Abos.

export const runtime = "nodejs";

const FENSTER_MS = 60 * 60 * 1000;
const MAX_JE_FENSTER = 5;
const versuche = new Map<string, number[]>();

function herkunft(req: NextRequest): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unbekannt";
}

/**
 * Ratenbegrenzung im Arbeitsspeicher.
 *
 * Reicht hier und ist absichtlich nicht mehr: Der Zähler lebt je Instanz und
 * ist nach einem Neustart weg. Gegen eine entschlossene Maschine hilft er
 * nicht — gegen den Fall, für den er da ist, schon: dass jemand über das
 * Formular eine fremde Adresse mit Bestätigungsmails belegt. Der Aufwand einer
 * Ablage in der Datenbank stünde in keinem Verhältnis; die Bestätigungsmail
 * selbst ist die eigentliche Bremse, weil ohne Klick nie eine zweite Mail
 * folgt.
 */
function zuOft(ip: string, jetzt: number): boolean {
  const liste = (versuche.get(ip) ?? []).filter((t) => jetzt - t < FENSTER_MS);
  if (liste.length >= MAX_JE_FENSTER) {
    versuche.set(ip, liste);
    return true;
  }
  liste.push(jetzt);
  versuche.set(ip, liste);
  return false;
}

/** Eine Antwort für alle Fälle — siehe Kopf. */
const OK = NextResponse.json({
  ok: true,
  hinweis: "Wenn die Adresse stimmt, liegt gleich eine Bestätigungsmail im Postfach.",
});

export async function POST(req: NextRequest) {
  const jetzt = Date.now();
  if (zuOft(herkunft(req), jetzt)) {
    return NextResponse.json({ error: "Zu viele Versuche. Bitte später erneut." }, { status: 429 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Unsichtbares Feld. Maschinen füllen alles aus; Menschen sehen es nicht.
  // Antwort trotzdem freundlich — sonst lernt die Maschine, es zu überspringen.
  if (typeof payload.website === "string" && payload.website.trim()) return OK;

  const regionId = typeof payload.ags === "string" ? payload.ags.trim() : "";
  const emailRoh = typeof payload.email === "string" ? payload.email : "";
  const email = normalisiereEmail(emailRoh);

  // FÜNF ODER ACHT STELLEN, nicht nur acht — und das ist kein Aufweichen der
  // Prüfung, sondern die Korrektur eines Fehlers: Das Ortsverzeichnis führt
  // fünfstellige Schlüssel für kreisfreie Städte und Landkreise, achtstellige
  // für kreisangehörige Gemeinden. Die Förderseiten tragen beide Formen. Mit
  // der engeren Prüfung wäre die Anmeldung auf jeder kreisfreien Stadt stumm
  // gescheitert — die Seite hätte funktioniert, nur der Knopf nicht.
  //
  // Die eigentliche Prüfung ist ohnehin die nächste: Ob es den Ort GIBT,
  // beantwortet das Verzeichnis, nicht die Länge der Zahl.
  if (!/^\d{5}$|^\d{8}$/.test(regionId)) {
    return NextResponse.json({ error: "Kein gültiger Gemeindeschlüssel." }, { status: 400 });
  }
  if (!siehtNachEmailAus(email)) {
    return NextResponse.json({ error: "Diese E-Mail-Adresse sieht nicht richtig aus." }, { status: 400 });
  }

  // Gibt es den Ort? Ohne diese Prüfung ließen sich Abos auf erfundene
  // Schlüssel anlegen — Zeilen, die nie eine Mail bekommen, und ein Ortsname,
  // den die Bestätigungsmail nicht nennen könnte.
  const region = await getRegionById(regionId);
  if (!region) {
    return NextResponse.json({ error: "Diesen Ort kennen wir nicht." }, { status: 400 });
  }

  // Herkunft: WO wurde angemeldet, und kam der Aufruf über ein Anschreiben.
  // Beides kommt aus dem Aufruf, wird aber nicht ungeprüft übernommen — ein
  // Freitext aus dem Browser landete sonst in der Datenbank.
  const quelle: AboQuelle = payload.quelle === "foerderung" ? "foerderung" : "gemeinde";
  const ueberBrief = payload.ueberBrief === true;

  const ergebnis = await aboAnlegen({
    regionId,
    email,
    jetztIso: new Date(jetzt).toISOString(),
    quelle,
    ueberBrief,
  });

  if (ergebnis.art === "keine-db") {
    return NextResponse.json({ error: "Gerade nicht möglich. Bitte später erneut." }, { status: 503 });
  }
  // Schon bestätigt: keine zweite Mail. Nach außen dieselbe Antwort.
  if (ergebnis.art === "schon-angemeldet") return OK;

  const basis = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
  const token = bestaetigungsToken(ergebnis.abo.id, jetzt);
  const mail = aboBestaetigungsMail({
    ortName: region.name,
    bestaetigenUrl: `${basis}/abo/bestaetigen?t=${encodeURIComponent(token)}`,
  });

  const versand = await sendeAboMail({ an: email, subject: mail.subject, html: mail.html, text: mail.text });
  if (!versand.ok) {
    // Der Eintrag steht schon, die Mail kam nicht raus. Nach außen bleibt es
    // beim freundlichen Hinweis — im Protokoll steht der Grund, denn das ist
    // ein Betriebsproblem und keines des Nutzers.
    console.error("[Abo] Bestätigungsmail nicht versendet:", versand.fehler);
    return NextResponse.json(
      { error: "Die Bestätigungsmail konnte gerade nicht verschickt werden. Bitte später erneut." },
      { status: 503 },
    );
  }

  return OK;
}
