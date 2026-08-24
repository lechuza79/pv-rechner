// Fast-Fail für Datenbank-Reads im Render-Pfad.
//
// Ohne Timeout wartet ein supabase-Query bei einer kränkelnden Instanz (522,
// Überlast) so lange, bis die Vercel-Function nach 300 s stirbt — aus einem
// DB-Schluckauf wird ein 5-Minuten-Totalausfall. Mit dem Wrapper bricht der Read
// nach wenigen Sekunden ab, der Aufrufer wirft, und die Seite kann eine ruhige
// „gerade nicht verfügbar"-Seite zeigen (app/(site)/solar-atlas/error.tsx) statt
// zu hängen.
//
// Bewusst NICHT im supabase-server-Client global gesetzt: den teilen sich auch
// Setup-/Cron-Routen, die absichtlich lange laufen (exec_sql, Rollup-Aufbau).
// Der Timeout gehört nur in den Seiten-Lesepfad.

// Die Function-Region gehört zu diesem Timeout: `regions: ["fra1"]` in
// vercel.json hält die Functions in Frankfurt, wo auch Supabase steht
// (eu-central-1). Auf Vercels Default iad1 (Washington) kostete JEDER
// Roundtrip ~90 ms Atlantik-Latenz, und eine Atlas-Seite macht Dutzende davon:
// der Kaltrender lag bei 6,8–8,1 s und kippte damit reihenweise in genau diesen
// Fast-Fail (2.300+ Timeouts / 500er quer über den Atlas, 24.–26.07.2026). Wer
// die Region wieder aus der EU zieht, muss diesen Timeout mit anheben — sonst
// kommen die 500er zurück. (Der Grund steht hier und nicht in vercel.json:
// Vercel validiert die Datei strikt gegen ein Schema und lehnt einen Deploy mit
// unbekanntem Schlüssel — auch einem reinen Kommentar-Key — komplett ab.)
//
// Überwacht wird der Abstand zu diesem Wert von scripts/health-check.ts (läuft
// als GitHub-Action alle 3 h und nach jedem inhaltlichen Push): der Check baut
// echte Atlas-Gemeindeseiten frisch auf und schlägt an, sobald die langsamste
// über 5 s braucht — also lange bevor hier jemand in den Fast-Fail läuft. Wer
// DB_READ_TIMEOUT_MS ändert, muss die Schwellen dort mit anpassen.
export const DB_READ_TIMEOUT_MS = 8000;

/**
 * Rennt einen supabase-Query (thenable) gegen einen Timeout. Gewinnt der Timeout,
 * rejectet die Promise mit einer sprechenden Meldung. Der Query selbst läuft
 * serverseitig ggf. weiter — bei einer hängenden Verbindung ist er ohnehin
 * blockiert; wichtig ist, dass der Render-Pfad nicht mitblockiert.
 */
export function withDbTimeout<T>(query: PromiseLike<T>, label: string): Promise<T> {
  if (schutzschalterOffen()) {
    // Abgelehntes Versprechen, KEIN synchroner Wurf: Die Aufrufer fangen den
    // Fehler durchweg mit .catch() bzw. await ab. Ein synchroner Wurf flöge an
    // dieser Behandlung vorbei und würde aus einer gedämpften Störung einen
    // ungefangenen Fehler machen — also genau das Gegenteil dessen, wofür der
    // Schalter da ist.
    return Promise.reject(new Error(`DB read skipped, circuit open (${label})`));
  }
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`DB read timeout after ${DB_READ_TIMEOUT_MS}ms (${label})`)),
      DB_READ_TIMEOUT_MS,
    );
  });
  // clearTimeout, damit der Timer die Serverless-Function nach einem schnellen
  // Erfolg nicht bis zum Ablauf wachhält.
  return Promise.race([Promise.resolve(query).finally(() => clearTimeout(timer)), timeout])
    .then(
      (wert) => { erfolgMelden(); return wert; },
      (fehler) => { fehlschlagMelden(); throw fehler; },
    );
}

// ─── Schutzschalter gegen die Selbstverstärkung ──────────────────────────────
//
// Der Timeout oben verhindert, dass EIN Aufruf hängenbleibt. Er verhindert
// nicht, dass tausend Aufrufe nacheinander dasselbe tote Ziel anfahren — und
// genau das ist die Fehlerklasse, die am 21.08.2026 ein Nachbarprojekt zwei
// Stunden lang lahmgelegt hat (gemeldet von der dortigen Sitzung): Die Datenbank
// war unter Crawler-Last überlastet, die eigenen Server feuerten in der
// Spitzenstunde 2,08 Mio Anfragen gegen sie, und der Ausfall hielt sich dadurch
// selbst am Leben — die Datenbank war zwanzig Minuten früher wieder gesund als
// die Seite.
//
// Der Schalter macht aus vielen Fehlversuchen wenige: Nach `FEHLER_BIS_OFFEN`
// Fehlschlägen in Folge wird für `OFFEN_MS` gar nicht mehr angefragt, sondern
// sofort geworfen. Der Aufrufer sieht denselben Fehler wie bisher und zeigt
// dieselbe ruhige Seite — nur ohne die Datenbank weiter zu belasten. Ein
// einzelner Erfolg schließt den Schalter wieder.
//
// Bewusst schlicht gehalten: Der Zustand lebt im Speicher einer Server-Instanz
// und ist nicht geteilt. Das reicht — jede Instanz dämpft ihre eigene Last, und
// eine geteilte Ablage bräuchte ausgerechnet die Datenbank, die gerade das
// Problem ist.
const FEHLER_BIS_OFFEN = 3;
const OFFEN_MS = 10_000;

let fehlerInFolge = 0;
let offenBis = 0;

function schutzschalterOffen(): boolean {
  return Date.now() < offenBis;
}

function fehlschlagMelden(): void {
  fehlerInFolge += 1;
  if (fehlerInFolge >= FEHLER_BIS_OFFEN) {
    offenBis = Date.now() + OFFEN_MS;
  }
}

function erfolgMelden(): void {
  fehlerInFolge = 0;
  offenBis = 0;
}

/** Nur für Tests: setzt den Schalter in den Ausgangszustand zurück. */
export function schutzschalterZuruecksetzen(): void {
  fehlerInFolge = 0;
  offenBis = 0;
}

/** Nur für Tests und Diagnose: aktueller Zustand des Schalters. */
export function schutzschalterZustand(): { offen: boolean; fehlerInFolge: number } {
  return { offen: schutzschalterOffen(), fehlerInFolge };
}
