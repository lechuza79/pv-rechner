import { NextResponse } from "next/server";
import { POST as alertHandler } from "../../alert/route";
import {
  deuteMeldung,
  pruefeSignatur,
  schalteFilmprojekt,
  PAUSE_ZIEL,
  type Entscheidung,
  type SchaltErgebnis,
} from "../../../../lib/vercel-budget";

// ─── Vercels Ausgaben-Webhook: gezielte Bremse statt Not-Aus ─────────────────
//
// Vercel ruft diese Adresse bei 50, 75 und 100 Prozent des eingestellten
// Ausgabenbetrags auf sowie am Ende des Abrechnungszeitraums. Bei 100 Prozent
// wird das Filmprojekt pausiert, am Zyklusende wieder freigegeben; die beiden
// Vorwarnungen landen nur in der Ablage.
//
// Die Begründung, warum dieser Empfänger im Solar-Check-Repo wohnt und warum die
// Projekt-Kennung eine Konstante und keine Umgebungsvariable ist, steht in
// lib/vercel-budget.ts — dort, wo die Entscheidungen fallen.
//
// ÖFFENTLICH ERREICHBAR, ALSO SIGNATURPFLICHT. Vercel kann keinen eigenen
// Kopfzeilen-Wert mitgeben; die einzige Absicherung ist die Signatur über den
// rohen Anfragetext. Ohne sie könnte jeder, der die Adresse kennt, das
// Filmprojekt abschalten.
//
// Umgebungsvariablen (beide auf Vercel, nur Production):
//   VERCEL_BUDGET_WEBHOOK_SECRET  Prüfsumme, die Vercel beim Speichern des
//                                 Webhooks einmalig anzeigt
//   VERCEL_TOKEN                  Zugriffstoken mit Schreibrecht auf Projekte
//
// Fehlt eine davon, greift die Bremse NICHT — und genau das wird gemeldet
// (siehe unten). Ein Sicherheitsnetz, das still nicht hält, ist schlimmer als
// keins.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Wohin die Meldung geht. Die Adresse wird nur noch GEBAUT, nicht mehr
 * ABGERUFEN: Die Schleuse läuft seit 21.09.2026 im selben Prozess.
 *
 * Vorher holte diese Funktion ihre eigene öffentliche Adresse über HTTP. Seit
 * der Bot-Schutz scharf steht (08.09.2026) kann er den Abruf einer Function
 * selbst beantworten — am 21.09.2026 gemessen: eine neutrale Kennung bekommt
 * auf solar-check.io HTML statt Daten. Getroffen hätte das ausgerechnet die
 * Meldung der Ausgabenbremse, also genau den Teil, der laut Bauplan dieser
 * Datei nie stumm ausfallen darf. Dass die 50-Prozent-Meldung am 05.09.2026
 * ankam, belegt nichts: Der Bot-Schutz war da noch nicht scharf, und er
 * entscheidet ohnehin von Fall zu Fall.
 *
 * Die Adresse bleibt als Kennung der Anfrage stehen — die Schleuse liest aus
 * ihr den Trockenlauf-Parameter.
 */
const ALERT_URL = "https://solar-check.io/api/alert";

type Meldung = {
  subject: string;
  decisions: string[];
  done: string[];
  details: string;
};

/**
 * Meldet über die vorhandene Schleuse. Sie entscheidet selbst, ob daraus eine
 * Mail wird: Einträge in `decisions` erreichen den Betreiber, alles andere
 * landet stumm in der Ablage.
 *
 * Die Meldung darf das Schalten nie aufhalten — sie läuft danach, und ein
 * Fehlschlag wird nur protokolliert. Lieber eine pausierte Anlage ohne Mail als
 * eine Mail ohne Pause.
 */
async function melden(m: Meldung, anClaude: boolean): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[Ausgabenbremse] CRON_SECRET fehlt — keine Meldung abgelegt.");
    return;
  }
  try {
    // IN-PROCESS, nicht über die eigene öffentliche Adresse — siehe ALERT_URL.
    // Die Schleuse nimmt ein schlichtes Request entgegen und liest daraus
    // Kopfzeilen, Rumpf und Abfrageteil; mehr braucht sie nicht.
    //
    // DAS ZEITLIMIT MUSS BLEIBEN, und es kommt jetzt von hier: Ein Abruf trug
    // seines selbst, ein Funktionsaufruf tut das nicht. Dahinter liegen eine
    // Schreibung in die Ablage und der Mailversand — beides kann hängen, und
    // die Meldung darf das Schalten nie aufhalten.
    const res = await Promise.race([
      alertHandler(new Request(ALERT_URL, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          subject: m.subject,
          decisions: m.decisions,
          done: m.done,
          details: m.details,
          audience: anClaude ? "claude" : "operator",
          tag: "ausgabenbremse",
        }),
      })),
      new Promise<never>((_, ab) => setTimeout(() => ab(new Error("Zeitlimit 10 s")), 10_000).unref?.()),
    ]);
    if (!res.ok) console.error(`[Ausgabenbremse] Meldung fehlgeschlagen: ${res.status}`);
  } catch (err) {
    console.error(`[Ausgabenbremse] Meldung fehlgeschlagen: ${err instanceof Error ? err.message : "unbekannt"}`);
  }
}

function betragstext(e: Entscheidung): string {
  if (e.budget === undefined && e.ausgegeben === undefined) return "";
  return ` (${e.ausgegeben ?? "?"} von ${e.budget ?? "?"} $)`;
}

function schalttext(r: SchaltErgebnis): string {
  return r.ok ? `erfolgreich (HTTP ${r.status})` : `FEHLGESCHLAGEN (${r.status}${r.detail ? `: ${r.detail}` : ""})`;
}

export async function POST(req: Request) {
  // Der rohe Text, unverändert — die Signatur gilt genau diesen Bytes. Wer hier
  // erst JSON parst und danach wieder zusammensetzt, prüft eine andere
  // Zeichenkette als die, die Vercel signiert hat.
  const rawBody = await req.text();

  const signatur = pruefeSignatur(rawBody, req.headers.get("x-vercel-signature"), process.env.VERCEL_BUDGET_WEBHOOK_SECRET);
  if (!signatur.ok) {
    console.warn(`[Ausgabenbremse] Abgewiesen: ${signatur.grund}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let nutzdaten: unknown;
  try {
    nutzdaten = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const e = deuteMeldung(nutzdaten);
  console.log(`[Ausgabenbremse] ${e.aktion}: ${e.grund}`);

  if (e.aktion === "protokollieren") {
    await melden(
      {
        subject: `Ausgaben-Vorwarnung: ${e.grund}`,
        decisions: [],
        done: [],
        details: `${e.grund}${betragstext(e)}. Nichts geschaltet — pausiert wird erst bei 100 %.`,
      },
      true,
    );
    return NextResponse.json({ ok: true, aktion: e.aktion, schwelle: e.schwelle });
  }

  if (e.aktion === "unklar") {
    // Eine Meldung mit gültiger Signatur, die wir nicht einordnen können, ist
    // entweder ein geänderter Nutzdaten-Aufbau bei Vercel oder ein falsch
    // eingetragener Empfänger. Beides heißt: Die Bremse greift gerade nicht.
    await melden(
      {
        subject: "Ausgabenbremse versteht die Meldung nicht",
        decisions: [
          `Vercel hat eine Ausgaben-Meldung geschickt, die die Bremse nicht einordnen kann (${e.grund}). Sie hat deshalb NICHTS geschaltet — die Kostenbremse greift bis zur Klärung nicht. Soll ich mir den geänderten Aufbau ansehen?`,
        ],
        done: [],
        details: `Grund: ${e.grund}\n\nNutzdaten:\n${rawBody.slice(0, 2000)}`,
      },
      false,
    );
    return NextResponse.json({ ok: true, aktion: e.aktion, grund: e.grund });
  }

  const schalten = e.aktion === "pausieren" ? "pause" : "unpause";
  const ergebnis = await schalteFilmprojekt(schalten, process.env.VERCEL_TOKEN);
  console.log(`[Ausgabenbremse] ${schalten} ${PAUSE_ZIEL}: ${schalttext(ergebnis)}`);

  if (e.aktion === "pausieren") {
    await melden(
      {
        subject: ergebnis.ok
          ? "Ausgabengrenze erreicht — Filmprojekt ist offline"
          : "Ausgabengrenze erreicht — Abschalten hat NICHT geklappt",
        decisions: ergebnis.ok
          ? [
              `Die Ausgabengrenze ist erreicht${betragstext(e)}. Das Filmprojekt (life-is-a-binge) ist jetzt offline, solar-check.io läuft weiter. Am Ende des Abrechnungszeitraums geht es von selbst wieder an. Soll es früher zurück — dann müsstest du die Grenze im Vercel-Dashboard anheben?`,
            ]
          : [
              `Die Ausgabengrenze ist erreicht${betragstext(e)}, aber das Abschalten des Filmprojekts ist fehlgeschlagen (${schalttext(ergebnis)}). Die Kosten laufen also weiter. Wahrscheinlichster Grund: Das hinterlegte Vercel-Zugriffstoken fehlt oder ist abgelaufen — es müsste im Dashboard neu erzeugt werden.`,
            ],
        done: ergebnis.ok ? ["Filmprojekt pausiert (solar-check.io unberührt)"] : [],
        details: `${e.grund}${betragstext(e)}\nZiel: ${PAUSE_ZIEL}\nErgebnis: ${schalttext(ergebnis)}`,
      },
      false,
    );
  } else {
    await melden(
      {
        subject: ergebnis.ok ? "Neuer Abrechnungszeitraum — Filmprojekt ist wieder online" : "Filmprojekt konnte NICHT entpaust werden",
        decisions: ergebnis.ok
          ? []
          : [
              `Der Abrechnungszeitraum ist vorbei, aber das Filmprojekt wieder anzuschalten ist fehlgeschlagen (${schalttext(ergebnis)}). Es bleibt bis auf Weiteres offline. Wahrscheinlichster Grund: Das hinterlegte Vercel-Zugriffstoken fehlt oder ist abgelaufen.`,
            ],
        done: ergebnis.ok ? ["Filmprojekt entpaust"] : [],
        details: `${e.grund}\nZiel: ${PAUSE_ZIEL}\nErgebnis: ${schalttext(ergebnis)}`,
      },
      !!ergebnis.ok,
    );
  }

  return NextResponse.json({ ok: true, aktion: e.aktion, geschaltet: ergebnis.ok, status: ergebnis.status });
}
