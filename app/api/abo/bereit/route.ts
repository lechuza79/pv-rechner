import { NextRequest, NextResponse } from "next/server";
import { leseSmtpKonfig } from "../../../../lib/outreach-mail";
import { supabase } from "../../../../lib/supabase-server";

// ─── Ist der Abo-Weg in DIESER Umgebung einsatzbereit? ───────────────────────
//
// DER ANLASS (01.09.2026, gemeldet vom Betreiber beim ersten Live-Versuch):
// Das Abo war lokal vollständig getestet — Browser-Tests, echte Mail, echter
// Bestätigungsklick. Auf der Produktion schlug die erste Anmeldung fehl, weil
// dort KEINE der fünf Zugangsdaten des Postfachs gesetzt war. Kein roter Test,
// kein Fehler im Diff, keine kaputte Seite: die Umgebung war nie geprüft
// worden, nur der Code.
//
// DIE FEHLERKLASSE IST ALT UND STEHT IM PROJEKT SCHON DREIMAL: Was niemand
// wiederkehrend MISST, merkt niemand. Der Spaltenabgleich fand denselben Fall
// zwischen Code und Tabelle, die Kostenwache zwischen Mengen und Rechnung —
// hier ist es Code gegen Umgebung. Ein lokaler Lauf kann diese Klasse
// prinzipiell nicht finden.
//
// WAS DIESE ROUTE ZURÜCKGIBT: nur, OB etwas gesetzt ist, nie WAS. Kein Wert,
// kein Anfang eines Werts, keine Länge — eine Länge ist bei einem Passwort
// bereits eine Auskunft. Sie sitzt trotzdem hinter dem Betriebsgeheimnis, weil
// auch die Liste der fehlenden Einstellungen einem Angreifer sagt, wo es
// klemmt.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const erwartet = process.env.CRON_SECRET;
  if (!erwartet || req.headers.get("authorization") !== `Bearer ${erwartet}`) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 401 });
  }

  const fehlt: string[] = [];

  // 1. Die Unterschrift der Anmelde- und Abmeldelinks. Ohne sie verweigert die
  //    Anmeldung den Dienst — absichtlich, ein fester Ersatzwert wäre öffentlich
  //    bekannt und jeder könnte fremde Abos bestätigen.
  const geheim = process.env.ABO_HMAC_SECRET;
  if (!geheim || geheim.length < 16) fehlt.push("Signatur-Geheimnis der Abo-Links");

  // 2. Der Versandweg. Dieselbe Prüfung, die der Versand selbst anwendet — nicht
  //    eine zweite Fassung davon, sonst laufen sie auseinander.
  const smtp = leseSmtpKonfig(process.env);
  if (!smtp.ok) fehlt.push(...smtp.fehler);

  // 3. Die Adresse, die in den Mails steht. Fehlt sie, zeigen alle
  //    Bestätigungslinks auf die Standard-Domain — was im Testbetrieb genau der
  //    Fehler ist, der eine Bestätigung ins Leere laufen lässt.
  if (!process.env.NEXT_PUBLIC_BASE_URL) fehlt.push("Basis-Adresse für die Links in den Mails");

  // 4. Die Ablage. Ohne sie nimmt die Anmeldung nichts entgegen.
  if (!supabase) fehlt.push("Zugang zur Datenbank");

  // 5. Und die Spalten, die der Nachweis braucht — angelegt, nicht nur im Code
  //    vorgesehen. Genau diese Richtung (Code läuft der Tabelle davon) hat das
  //    Speichern einer Berechnung fünf Monate lang stumm gebrochen.
  let spaltenGeprueft = false;
  if (supabase) {
    const { error } = await supabase
      .from("gemeinde_abos")
      .select("einwilligung_version,versand_beleg,aus_verwaltung,techniken")
      .limit(1);
    if (error) fehlt.push(`Spalten der Abo-Tabelle: ${error.message}`);
    else spaltenGeprueft = true;
  }

  return NextResponse.json({
    bereit: fehlt.length === 0,
    fehlt,
    geprueft: {
      signatur: true,
      versandweg: true,
      basisAdresse: true,
      datenbank: true,
      spalten: spaltenGeprueft,
    },
  });
}
