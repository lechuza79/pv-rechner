import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { fingerprintOf, markiert, type Abrufweg } from "../../../../lib/funding-fingerprint";

// ─── Abruf einer Amtsseite aus unserer eigenen Produktion ────────────────────
//
// WARUM ES DIESE ROUTE GIBT (17.08.2026): Der Seiten-Wächter läuft in GitHub
// Actions. Deren Runner hängen an Azure-Rechenzentrumsadressen, und genau die
// sperren viele Anbieter pauschal — gemessen: web.archive.org antwortet von dort
// mit 503/523 auf jedem Weg, während dieselben Abrufe von einem normalen
// Anschluss mit 200 durchgehen. Damit war die Rückfallebene für bot-geblockte
// Träger (Frankfurt) ausgerechnet dort tot, wo sie gebraucht wird.
//
// Diese Route dreht die Richtung um: Nicht der Runner ruft ab, sondern unsere
// Vercel-Function in Frankfurt (fra1) — eine Adresse, die echten Web-Verkehr
// ausliefert und deshalb nicht wie ein CI-Rechenzentrum behandelt wird. Der
// Wächter fragt nur noch nach dem Ergebnis. Kostet nichts extra: Die Function
// läuft ohnehin.
//
// KEIN OFFENER PROXY — BLOCKER. Die Route nimmt KEINE beliebige Adresse
// entgegen, sondern nur die Kennung eines Programms, das wir führen; die
// Adresse kommt aus unserer eigenen Datenbank. Andernfalls wäre das eine
// Abruf-Maschine, mit der Fremde über unseren Namen beliebige Server anfragen
// könnten. Zusätzlich abgesichert über CRON_SECRET.
//
// Sie gibt bewusst NUR den Fingerabdruck zurück, nicht den Seiteninhalt: Für die
// Frage „hat sich etwas bewegt?" reicht das, und eine Route, die fremde Inhalte
// weiterreicht, wäre eine Urheberrechts- und Missbrauchsfrage mehr.

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

type Versuch = { weg: string; status: number | string };

async function hole(url: string, ms: number, headers: Record<string, string> = {}): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9", ...headers },
      redirect: "follow",
      signal: AbortSignal.timeout(ms),
    });
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabase.from("funding_programs").select("data").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "unknown program" }, { status: 404 });

  const url = (data.data as { url?: string })?.url;
  if (!url) return NextResponse.json({ error: "program has no url" }, { status: 400 });

  const versuche: Versuch[] = [];

  // 1) Die Amtsseite direkt, mit mehreren Anläufen und kurzen Pausen.
  //
  // Gemessen am 17.08.2026 an frankfurt.de aus dieser Function: 403, 403, dann
  // 200 mit 171 KB. Die Sperre ist eine Laune der Bot-Erkennung, kein Zustand —
  // sie kippt beim Nachfassen. Zwei Anläufe waren dafür zu wenig; mit vieren
  // löst sich der Fall in derselben Anfrage statt erst am nächsten Tag.
  for (const n of [0, 1, 2, 3]) {
    if (n > 0) await new Promise((r) => setTimeout(r, 2_500 * n));
    const res = await hole(url, 15_000 + n * 5_000);
    versuche.push({ weg: "direkt", status: res?.status ?? "keine Antwort" });
    if (res?.ok) {
      const html = await res.text();
      return NextResponse.json({
        id, url, ok: true, weg: "live" as Abrufweg,
        fingerprint: markiert("live", fingerprintOf(html)),
        laenge: html.length, versuche,
      });
    }
  }

  // 2) Archiv lesen, dann das Archiv bitten, die Seite zu holen. Von hier aus
  //    erreichbar — der Runner scheiterte genau daran.
  const jahr = new Date().getFullYear();
  for (const ziel of [
    `https://web.archive.org/web/${jahr}id_/${url}`,
    `https://web.archive.org/save/${url}`,
  ]) {
    const res = await hole(ziel, ziel.includes("/save/") ? 45_000 : 25_000);
    versuche.push({ weg: ziel.includes("/save/") ? "archiv-holen" : "archiv-lesen", status: res?.status ?? "keine Antwort" });
    if (res?.ok) {
      const html = await res.text();
      // Kurze Antworten sind Fehlerseiten des Archivs, keine Amtsseite.
      if (html.length > 2_000) {
        return NextResponse.json({
          id, url, ok: true, weg: "archiv" as Abrufweg,
          fingerprint: markiert("archiv", fingerprintOf(html)),
          laenge: html.length, versuche,
        });
      }
    }
  }

  return NextResponse.json({ id, url, ok: false, versuche });
}
