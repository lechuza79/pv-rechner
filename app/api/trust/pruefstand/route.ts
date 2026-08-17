import { NextResponse } from "next/server";
import { getLetztePruefung } from "../../../../lib/trust-pruefstand";

// Zeitpunkt der jüngsten Quellenprüfung für die Vertrauens-Leiste im Footer.
//
// WARUM ÜBER EINE ROUTE UND NICHT IM LAYOUT: Die Leiste steht unter jeder Seite,
// und ein Großteil der (site)-Seiten wird vollstatisch ausgeliefert (Startseite,
// Rechner, Methodik, Impressum — kein `revalidate`). Ein serverseitig
// gerendertes Prüfdatum würde dort beim Build einfrieren: Der Verfall nach
// TRUST_PRUEFUNG_MAX_ALTER_TAGE könnte nie greifen, und drei Wochen nach dem
// letzten Deploy stünde weiter "zuletzt geprüft am …" da — genau die stille
// Falschaussage, gegen die der Verfall gebaut ist. Deshalb bleibt die Seite
// statisch und der Punkt kommt clientseitig nach; dasselbe Muster wie bei der
// Admin-Erkennung (useIsAdmin → /api/admin/status), die aus demselben Grund
// nicht im Layout sitzt.
//
// force-dynamic: argumentlose GET-Route mit DB-Read — ohne die Angabe backt
// Next die Antwort in den Build.
export const dynamic = "force-dynamic";

export async function GET() {
  const iso = await getLetztePruefung();
  return NextResponse.json(
    { iso },
    {
      headers: {
        // Das Ergebnis ist ein Datum, keine Uhrzeit: Sechs Stunden CDN-Cache
        // reichen völlig und halten die Datenbank aus dem Besucherverkehr
        // heraus. stale-while-revalidate, damit kein Besucher auf den Refresh
        // wartet.
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    },
  );
}
