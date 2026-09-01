import { NextRequest, NextResponse } from "next/server";
import {
  aboAnlegen,
  normalisiereEmail,
  siehtNachEmailAus,
  versandBelegSetzen,
  type AboQuelle,
} from "../../../../lib/gemeinde-abo";
import { techniken } from "../../../../lib/abo-technik";
import { bestaetigungsToken } from "../../../../lib/abo-token";
import { aboBestaetigungsMail } from "../../../../lib/abo-mail";
import { sendeAboMail } from "../../../../lib/abo-versand";
import { getRegionById } from "../../../../lib/atlas";
import { AKTUELLE_EINWILLIGUNG, einwilligungsFassung } from "../../../../lib/abo-einwilligung";

// ─── Anmeldung zu einem Gemeinde-Abo ─────────────────────────────────────────
//
// Öffentlich erreichbar, nimmt eine E-Mail-Adresse entgegen. DREI Bremsen,
// und sie greifen an verschiedenen Stellen — keine ersetzt die andere:
//
//   1. Ein unsichtbares Feld gegen Maschinen (hier).
//   2. Fünf Versuche je Stunde und Herkunft (hier, im Arbeitsspeicher).
//   3. Höchstens fünf offene Anmeldungen je ADRESSE, und keine zweite
//      Bestätigung binnen zwei Minuten (in der Datenschicht, gegen die
//      Datenbank).
//
// Die dritte ist die einzige, die gegen einen verteilten Angriff trägt, und
// deshalb gehört sie dorthin: Sie zählt Zeilen in der Datenbank statt in einem
// Prozessgedächtnis, das jede Instanz für sich führt und jeder Neustart
// verliert.
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
 * Erste, billige Hürde: Versuche je Herkunft, gezählt im Arbeitsspeicher.
 *
 * WAS SIE NICHT KANN, und das ist wichtig, damit sich niemand auf sie
 * verlässt: Der Zähler lebt je Instanz und ist nach einem Neustart weg. Auf
 * einer Plattform, die Anfragen über mehrere Instanzen verteilt, kommt ein
 * Skript beliebig oft durch, indem es einfach weiterfeuert. Sie hält einen
 * Menschen auf, der zwanzigmal klickt — mehr nicht.
 *
 * Die Bremse, die wirklich trägt, sitzt deshalb in der Datenschicht und zählt
 * an der E-MAIL-ADRESSE statt an der Herkunft. Das ist zusätzlich die
 * treffendere Größe: Geschützt werden soll der Mensch, dessen Postfach
 * zugeschüttet wird, nicht ein Anschluss. Und eine dauerhafte Zählung je
 * IP-Adresse müsste diese speichern — was die Datenschutzerklärung
 * ausdrücklich ausschließt.
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
  // Nur bekannte Techniken; alles andere fällt weg. Leer heißt „alle" — wer
  // nichts abwählt, will alles wissen, und ein Abo ohne jede Technik bekäme nie
  // eine Mail.
  const technikenGewaehlt = techniken(payload.techniken);
  // Selbstauskunft, streng auf `true` geprüft: Jeder andere Wert — auch ein
  // wahrheitsfähiger String wie "ja" — gilt als nein. Sie steuert nur den Ton
  // einer künftigen Meldung, nie einen Zugang, deshalb ist die vorsichtige
  // Richtung hier kostenlos.
  const ausVerwaltung = payload.ausVerwaltung === true;

  // WOZU eingewilligt wurde. Der Browser meldet die Fassung, die er ausgeliefert
  // hat — geprüft wird sie trotzdem: Eine unbekannte Kennung würde auf einen
  // Wortlaut zeigen, den es nie gab, und das wäre ein Nachweis, der schlechter
  // ist als keiner. Kennt das Archiv sie nicht, gilt die heutige Fassung; das
  // ist die einzige, die der Server mit Sicherheit ausliefert.
  const gemeldet = typeof payload.einwilligung === "string" ? payload.einwilligung : null;
  const einwilligungVersion = einwilligungsFassung(gemeldet)
    ? gemeldet!
    : AKTUELLE_EINWILLIGUNG.version;

  const ergebnis = await aboAnlegen({
    regionId,
    email,
    jetztIso: new Date(jetzt).toISOString(),
    quelle,
    ueberBrief,
    technikenGewaehlt,
    ausVerwaltung,
    einwilligungVersion,
  });

  if (ergebnis.art === "keine-db") {
    return NextResponse.json({ error: "Gerade nicht möglich. Bitte später erneut." }, { status: 503 });
  }
  // Schon bestätigt: keine zweite Mail. Nach außen dieselbe Antwort.
  if (ergebnis.art === "schon-angemeldet") return OK;
  // Zu viele offene Anmeldungen für diese Adresse, oder gerade eben schon eine
  // Bestätigung geschickt: Es geht nichts hinaus, die Antwort bleibt trotzdem
  // dieselbe. Eine eigene Meldung („Sie haben zu viele offene Anmeldungen")
  // verriete, welche Adressen bereits eingetragen sind — genau die Auskunft,
  // die diese Route sonst überall vermeidet.
  if (ergebnis.art === "still") return OK;

  const basis = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";
  const token = bestaetigungsToken(ergebnis.abo.id, jetzt);
  const mail = aboBestaetigungsMail({
    ortName: region.name,
    bestaetigenUrl: `${basis}/abo/bestaetigen?t=${encodeURIComponent(token)}`,
  });

  const versand = await sendeAboMail({
    an: email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    art: "bestaetigung",
  });
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

  // DASS die Bestätigungsmail hinausging, wird am Abo vermerkt — nachträglich,
  // weil der Beleg erst nach dem Versand existiert. Schlägt das Nachtragen
  // fehl, ist die Mail trotzdem draußen: Der Nutzer bekommt sein OK, und der
  // fehlende Beleg steht im Protokoll. Ihn hier zum Blocker zu machen hieße,
  // eine erfolgreiche Anmeldung wegen eines Nachweises zu verwerfen.
  if (versand.beleg) {
    try {
      await versandBelegSetzen(ergebnis.abo.id, versand.beleg);
    } catch (e) {
      console.error("[Abo] Versandbeleg nicht gespeichert:", e);
    }
  }

  return OK;
}
