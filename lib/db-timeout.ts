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

// Kurzes Budget für Reads mit HARMLOSEM Rückfall.
//
// Der Unterschied ist nicht die Query, sondern was ein Fehlschlag kostet. Fällt
// eine Atlas-Abfrage aus, gibt es keine Seite — dafür lohnt es zu warten. Fällt
// dagegen die Theming-Überlagerung, der Marktpreis oder der Förderkatalog aus,
// steht sofort ein vollwertiger Ersatz bereit (keine Überlagerung, Config-Preise,
// Code-Seed): Dort ist Warten reine Verzögerung — der Besucher bekommt nach 8 s
// exakt das, was er nach 3 s auch bekommen hätte.
//
// Und genau daran hängt der Verstärker: Diese Reads laufen im Layout und auf den
// meistbesuchten Seiten, also bei JEDEM Aufbau. Acht Sekunden je Aufbau halten
// die Function-Slots besetzt und schieben die nächste Anfrage nach — aus einem
// DB-Schluckauf wird so ein Rückstau, der sich selbst am Leben hält (gemessene
// Kette bei einem Schwesterprojekt am 21.08.2026: überlastete DB, danach 2 Mio
// Anfragen/Stunde der eigenen Functions gegen die bereits tote Datenbank; die DB
// war 20 Minuten vor dem Endpunkt wieder gesund).
export const DB_SOFT_READ_TIMEOUT_MS = 3000;

/**
 * Rennt einen supabase-Query (thenable) gegen einen Timeout. Gewinnt der Timeout,
 * rejectet die Promise mit einer sprechenden Meldung. Der Query selbst läuft
 * serverseitig ggf. weiter — bei einer hängenden Verbindung ist er ohnehin
 * blockiert; wichtig ist, dass der Render-Pfad nicht mitblockiert.
 *
 * `ms` nur setzen, wenn der Aufrufer einen vollwertigen Rückfall hat
 * (DB_SOFT_READ_TIMEOUT_MS); ohne Rückfall bleibt es beim Default.
 */
export function withDbTimeout<T>(
  query: PromiseLike<T>,
  label: string,
  ms: number = DB_READ_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`DB read timeout after ${ms}ms (${label})`)), ms);
  });
  // clearTimeout, damit der Timer die Serverless-Function nach einem schnellen
  // Erfolg nicht bis zum Ablauf wachhält.
  return Promise.race([Promise.resolve(query).finally(() => clearTimeout(timer)), timeout]);
}
