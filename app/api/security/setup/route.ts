import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import {
  EXEC_SQL_DDL,
  CALCULATIONS_RLS_DDL,
  SECURITY_POSTURE_DDL,
  SECURITY_DDL,
  auditPosture,
  type SecurityPosture,
} from "../../../../lib/security-sql";

// Stellt die Sicherheitsgrenze der Datenbank wieder her und prueft danach
// nach, ob sie tatsaechlich steht: die Rechte auf exec_sql und die
// Zeilenregeln auf calculations. Beides lebte bis zum 29.07.2026 nur in der
// laufenden Datenbank — Begruendung in lib/security-sql.ts.
//
// Aufruf: GET mit Authorization: Bearer $CRON_SECRET. Mehrfach ausfuehrbar.
// Mit ?verify=1 wird nur gemessen und nichts geschrieben.
//
// Henne-Ei: Die Route spielt exec_sql ueber exec_sql ein. Fehlt die Funktion
// komplett (frisches Projekt, Wiederherstellung ohne Funktionen), kommt sie
// hier nicht mehr rein — die Antwort enthaelt dann das SQL zum einmaligen
// Einfuegen in den Supabase-SQL-Editor. Gegen den Fall, um den es hier
// eigentlich geht (jemand ersetzt die Funktion und verliert dabei die
// Rechtevergabe), reicht die Route: exec_sql existiert dann ja noch.

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";

type Step = { step: string; status: "ok" | "error"; error?: string };

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabase;
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const verifyOnly = req.nextUrl.searchParams.get("verify") === "1";
  const steps: Step[] = [];

  if (!verifyOnly) {
    const parts: Array<[string, string]> = [
      ["exec_sql: Definition und Rechte", EXEC_SQL_DDL],
      ["calculations: Zeilenschutz und Regeln", CALCULATIONS_RLS_DDL],
      ["sc_security_posture: Selbstauskunft", SECURITY_POSTURE_DDL],
    ];

    for (const [step, sql] of parts) {
      const { error } = await db.rpc("exec_sql", { sql });
      steps.push({ step, status: error ? "error" : "ok", error: error?.message });

      // Bricht der allererste Schritt weg, ist exec_sql selbst das Problem.
      // Dann sind die Folgeschritte sinnlos und die Antwort traegt das SQL
      // fuer den Weg von Hand.
      if (error && step.startsWith("exec_sql")) {
        return NextResponse.json(
          {
            ok: false,
            steps,
            bootstrap:
              "exec_sql ist nicht aufrufbar — diese Route kann sich nicht selbst reparieren. " +
              "Das SQL unter `sql` einmalig im Supabase-SQL-Editor ausfuehren, danach diese Route erneut aufrufen.",
            sql: SECURITY_DDL,
          },
          { status: 500 }
        );
      }
    }

    // Neue und geaenderte Funktionen sieht PostgREST erst nach einem
    // Schema-Reload — ohne ihn antwortet sc_security_posture mit 404.
    await db.rpc("exec_sql", { sql: "NOTIFY pgrst, 'reload schema';" });
    await new Promise(r => setTimeout(r, 2000));
  }

  // Nachmessen statt annehmen: Ein "ok" auf das Einspielen sagt nur, dass das
  // SQL durchlief — nicht, dass die Rechte danach so stehen wie gedacht.
  const { data, error } = await db.rpc("sc_security_posture");
  if (error) {
    steps.push({ step: "Nachmessen", status: "error", error: error.message });
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  const posture = data as SecurityPosture;
  const verdict = auditPosture(posture);

  return NextResponse.json(
    {
      ok: verdict.ok,
      mode: verifyOnly ? "nur gemessen" : "eingespielt und gemessen",
      steps,
      problems: verdict.problems,
      posture,
    },
    { status: verdict.ok ? 200 : 500 }
  );
}
