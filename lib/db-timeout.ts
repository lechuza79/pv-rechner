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
export const DB_READ_TIMEOUT_MS = 8000;

/**
 * Rennt einen supabase-Query (thenable) gegen einen Timeout. Gewinnt der Timeout,
 * rejectet die Promise mit einer sprechenden Meldung. Der Query selbst läuft
 * serverseitig ggf. weiter — bei einer hängenden Verbindung ist er ohnehin
 * blockiert; wichtig ist, dass der Render-Pfad nicht mitblockiert.
 */
export function withDbTimeout<T>(query: PromiseLike<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`DB read timeout after ${DB_READ_TIMEOUT_MS}ms (${label})`)),
      DB_READ_TIMEOUT_MS,
    );
  });
  // clearTimeout, damit der Timer die Serverless-Function nach einem schnellen
  // Erfolg nicht bis zum Ablauf wachhält.
  return Promise.race([Promise.resolve(query).finally(() => clearTimeout(timer)), timeout]);
}
