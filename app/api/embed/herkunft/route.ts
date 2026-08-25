import { NextResponse } from "next/server";
import { hostAusHerkunft, istEmbedWidget, zaehleEinbettung } from "../../../../lib/embed-herkunft";

// ─── Einbettung zählen ───────────────────────────────────────────────────────
//
// Body: { host: string, widget: string }
//   host   = Ursprung der einbettenden Seite (Domain; ein vollständiger
//            Ursprung wird auf die Domain gekürzt)
//   widget = Slug aus der Allowlist, alles andere wird verworfen
//
// Die Route antwortet IMMER 204 — auch auf Unsinn. Ein Zähl-Endpunkt, der
// Auskunft darüber gibt, was er akzeptiert, lädt zum Ausprobieren ein; und der
// Aufrufer im Browser hat mit der Antwort ohnehin nichts vor.
//
// Was hier NICHT passiert: kein Auslesen der IP, kein Setzen und kein Lesen
// von Cookies, keine Kennung. Begründung in lib/embed-herkunft.ts.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Grobe Bremse gegen jemanden, der die Statistik mit einer erfundenen Domain
// vollschreibt. Bewusst großzügig: Hinter EINER Adresse kann eine ganze
// Verwaltung sitzen, und eine zu enge Grenze verlöre echte Einbettungen.
// In-Memory, verfällt beim nächsten Kaltstart — für einen Zähler genügt das.
const LIMIT = 120;
const FENSTER_MS = 60 * 60 * 1000;
const protokoll = new Map<string, number[]>();

function zuOft(schluessel: string): boolean {
  const jetzt = Date.now();
  if (protokoll.size > 500) {
    protokoll.forEach((zeiten, k) => {
      if (zeiten.every(t => jetzt - t >= FENSTER_MS)) protokoll.delete(k);
    });
  }
  const zeiten = (protokoll.get(schluessel) ?? []).filter(t => jetzt - t < FENSTER_MS);
  if (zeiten.length >= LIMIT) {
    protokoll.set(schluessel, zeiten);
    return true;
  }
  zeiten.push(jetzt);
  protokoll.set(schluessel, zeiten);
  return false;
}

const still = () => new NextResponse(null, { status: 204 });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return still();
  }
  if (!body || typeof body !== "object") return still();

  const { host: rohHost, widget } = body as { host?: unknown; widget?: unknown };
  if (!istEmbedWidget(widget)) return still();

  const host = hostAusHerkunft(typeof rohHost === "string" ? rohHost : null);
  if (!host) return still();

  // Die Bremse greift je Domain, nicht je Besucher — wir kennen den Besucher
  // nicht und wollen ihn auch nicht kennen.
  if (zuOft(host)) return still();

  await zaehleEinbettung(host, widget);
  return still();
}
