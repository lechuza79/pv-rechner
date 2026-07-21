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
