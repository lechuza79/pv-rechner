import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ATLAS_REVALIDATE_ROUTEN } from "../../../../lib/atlas-revalidate-routen";

/**
 * ATLAS-SEITEN NACH DEM DATENLAUF FÜR UNGÜLTIG ERKLÄREN.
 *
 * WARUM ES DIESE ROUTE ÜBERHAUPT GIBT — das ist der ganze Punkt, und wer sie
 * entfernt, muss zuerst die Haltbarkeit der Atlas-Seiten zurückdrehen:
 *
 * Die Atlas-Seiten hatten bis zum 26.08.2026 eine Haltbarkeit von 24 Stunden,
 * während ihre Daten nur EINMAL IM MONAT kommen (BNetzA-Datenlauf am 5.). Sie
 * verfielen also dreißigmal öfter als nötig, und jeder Verfall bedeutet: der
 * nächste Zugriff rechnet die Seite komplett neu, mit rund zehn Datenbank-
 * Abfragen, einem Cache-Schreibvorgang und einer Übertragung ans
 * Auslieferungsnetz. Bei über 11.000 Gemeindeseiten und dem Maschinen-Verkehr,
 * der auf ihnen liegt, war das der zweitgrößte Posten der Vercel-Rechnung.
 *
 * Die Haltbarkeit auf den Datentakt zu setzen, repariert das — ABER NUR MIT
 * DIESER ROUTE. Denn ein aufgerufener ISR-Eintrag, der noch als gültig gilt,
 * wird NICHT neu gerechnet. Ohne aktives Ungültig-Erklären träfe der
 * Aufwärm-Lauf nach dem Datenlauf lauter „noch gültige" Seiten, rührte sie
 * nicht an, und auf 11.000 Seiten stünden bis zu einen Monat lang die Zahlen
 * des Vormonats. Das wäre exakt der Fehler, den die Projektanweisung als den
 * schwersten des Projekts bezeichnet: eine falsche Zahl, die niemandem auffällt.
 *
 * REIHENFOLGE IM DATENLAUF, und sie ist nicht vertauschbar:
 *   1. Daten hochladen        (mastr:refresh-bnetza)
 *   2. Plausibilität prüfen   (mastr-plausibilitaet.ts) — erst wenn die Zahlen
 *      die Prüfung bestehen, dürfen sie überhaupt sichtbar werden
 *   3. DIESE ROUTE            — alle Atlas-Seiten für ungültig erklären
 *   4. Aufwärmen              (atlas:warm) — baut sie mit den neuen Zahlen neu auf
 * Wer 3 vor 2 stellt, macht ungeprüfte Zahlen sichtbar. Wer 3 weglässt, macht
 * die neuen Zahlen gar nicht sichtbar.
 *
 * WARUM `revalidatePath` MIT ROUTEN-MUSTER UND NICHT JE ADRESSE: Es gibt über
 * 11.000 Gemeindeadressen. Einzeln aufgerufen wären das 11.000 Aufrufe, und die
 * Liste müsste hier ein zweites Mal gepflegt werden. Das Muster mit `"page"`
 * erklärt alle Seiten der Route auf einmal für ungültig — eine Angabe, keine
 * zweite Liste, die veralten kann.
 */

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Die Routen, deren Zahlen am MaStR-Datenlauf hängen — die Liste steht in
 * `lib/atlas-revalidate-routen.ts`, damit ein Test sie gegen den Dateibaum
 * halten kann.
 *
 * Bewusst NICHT dabei sind die Förderseiten: Deren Daten bewegen sich täglich
 * (auslaufende Programme, Vierzehn-Tage-Fristen der Beleg-Prüfung), sie behalten
 * ihre Haltbarkeit von einer Stunde und brauchen kein Ungültig-Erklären. Sie
 * hier aufzunehmen würde eine monatliche Invalidierung suggerieren, wo eine
 * stündliche gilt.
 */
const ATLAS_ROUTEN = ATLAS_REVALIDATE_ROUTEN;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const erledigt: string[] = [];
  const fehler: { route: string; grund: string }[] = [];

  for (const route of ATLAS_ROUTEN) {
    try {
      revalidatePath(route, "page");
      erledigt.push(route);
    } catch (e) {
      // Eine fehlgeschlagene Route darf die anderen nicht mitreißen — und sie
      // muss SICHTBAR scheitern, damit der Datenlauf rot wird. Ein stiller
      // Fehlschlag hier heißt: alte Zahlen bleiben stehen, und niemand merkt es.
      fehler.push({ route, grund: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json(
    {
      ok: fehler.length === 0,
      erledigt,
      fehler,
      hinweis:
        "Die Seiten sind jetzt ungueltig, aber noch nicht neu gebaut. Der Aufwaermlauf baut sie gedrosselt neu auf; bis dahin zahlt der erste Besucher einer Seite den Neuaufbau.",
    },
    { status: fehler.length === 0 ? 200 : 500 }
  );
}
