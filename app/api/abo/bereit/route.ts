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

  // 6. UND DIE WIRKUNG, nicht nur die Einstellung. Alles oben fragt, ob etwas
  //    GESETZT ist. Ein falsch getipptes Passwort ist gesetzt und trotzdem
  //    wirkungslos — dann meldet diese Route grün, während jede Anmeldung
  //    scheitert. Gemessen wird deshalb zusätzlich am Ergebnis.
  const versandOhneBeleg = await zaehleOhneVersandbeleg();

  return NextResponse.json({
    bereit: fehlt.length === 0,
    fehlt,
    // BEWUSST NEBEN `bereit`, nicht darin: „ist eingerichtet" und „hat
    // gewirkt" sind zwei Aussagen. Eine hängende Anmeldung in `bereit`
    // einzurechnen hieße zu behaupten, es fehle eine Einstellung — und der
    // ganze Witz dieses Punktes ist ja, dass keine fehlt.
    versandOhneBeleg,
    geprueft: {
      signatur: true,
      versandweg: true,
      basisAdresse: true,
      datenbank: true,
      spalten: spaltenGeprueft,
      wirkung: versandOhneBeleg !== null,
    },
  });
}

/** Karenz zwischen Anlegen und Beleg — siehe `zaehleOhneVersandbeleg`. */
const KARENZ_MS = 15 * 60 * 1000;
/** Beobachtungsfenster — siehe `zaehleOhneVersandbeleg`. */
const FENSTER_MS = 6 * 60 * 60 * 1000;

/**
 * Wie viele Anmeldungen warten auf eine Bestätigungsmail, die nie hinausging?
 *
 * Eine offene Anmeldung ohne Versandbeleg heißt: Die Zeile steht, die Mail hat
 * den Server nicht verlassen (oder — der seltenere Fall — sie ging hinaus und
 * das Nachtragen des Belegs schlug fehl; die Anmelde-Route lässt das bewusst
 * durchgehen). Beide Lesarten gehören in die Meldung; „Mail gescheitert" allein
 * behauptet mehr, als die Zahl misst.
 *
 * `null` heißt „konnte nicht nachsehen" und ist KEIN Befund — dieselbe Trennung
 * wie überall sonst zwischen „ist kaputt" und „Abruf kam nicht durch".
 *
 * Zwei Grenzen, beide aus dem Ablauf der Anmelde-Route hergeleitet:
 *
 *   KARENZ — die Zeile steht VOR dem Versand, der Beleg wird danach
 *   nachgetragen; dazwischen liegen Sekunden. Ein Lauf, der genau in dieses
 *   Fenster fällt, hielte eine gesunde Anmeldung für einen Befund.
 *
 *   FENSTER — nur die letzten SECHS Stunden, und die Zahl ist hergeleitet, nicht
 *   gegriffen: Der Gesundheitscheck läuft alle drei Stunden, sechs Stunden decken
 *   also zwei Läufe und damit einen ausgefallenen ab. Der erste Entwurf nahm 24
 *   Stunden und war damit falsch — nicht bloß großzügig: Die Meldung daneben
 *   spricht von „eingerichtet und wirkt trotzdem nicht", und über 24 Stunden
 *   zählt sie Anmeldungen aus einer Zeit mit, in der noch gar nichts
 *   eingerichtet war. Genau so gemessen am 02.09.2026: zwei Anmeldungen vom
 *   Vortag, entstanden als die Zugangsdaten des Postfachs nachweislich fehlten,
 *   gemeldet als Beleg dafür, dass der eingerichtete Versand nicht wirke. Das
 *   Fenster muss kurz genug sein, dass der vorige Lauf die Einrichtung bereits
 *   bestätigt hatte — sonst behauptet die Beschriftung etwas anderes, als die
 *   Zahl misst. Nebenbei fällt damit auch der zweite Fehler weg: Über 24 Stunden
 *   meldete eine liegengebliebene Zeile einen Tag lang bei jedem Lauf, und eine
 *   Warnung, die dauernd angeht, filtert man weg und verpasst dann die echte.
 *
 * Gezählt wird nur `ausstehend`. Wer bestätigt hat, hat seine Mail
 * offensichtlich bekommen — dort fehlt höchstens der Nachweis, nicht die
 * Wirkung. Und die Bremsen der Anmelde-Route legen keine Zeile an: Wer
 * abgewiesen wird, weil zu viele Anmeldungen offen sind oder die Zwei-Minuten-
 * Sperre greift, hinterlässt nichts, das hier mitgezählt würde.
 */
async function zaehleOhneVersandbeleg(): Promise<number | null> {
  if (!supabase) return null;
  const jetzt = Date.now();
  const { count, error } = await supabase
    .from("gemeinde_abos")
    .select("id", { count: "exact", head: true })
    .eq("status", "ausstehend")
    .is("versand_beleg", null)
    .lt("erstellt_am", new Date(jetzt - KARENZ_MS).toISOString())
    .gt("erstellt_am", new Date(jetzt - FENSTER_MS).toISOString());
  if (error) return null;
  return count ?? 0;
}
