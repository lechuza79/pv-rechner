import type { FullConfig } from "@playwright/test";
import { ALLE_PFADE } from "./routen";

// Alle Adressen EINMAL nacheinander aufrufen, bevor der erste Test startet.
//
// Warum: Der Entwicklungsserver übersetzt jede Route erst beim ersten Aufruf.
// Lösen mehrere Arbeiter das gleichzeitig für verschiedene Routen aus, scheitert
// das serverseitige Rendern mit „__webpack_modules__[moduleId] is not a
// function" — dieselbe Wettrennen-Klasse, die im Projekt schon auftrat, als
// Dev-Server und Build sich ein Ausgabeverzeichnis teilten.
//
// Aufgefallen ist es, als der Rundgang die Zahl der Adressen von 6 auf 33
// erhöhte: Danach flatterten auch die vier alten Flow-Tests. Die Ursache lag
// also nicht am neuen Test, aber er hat sie sichtbar gemacht.
//
// Der Weg über einen Wiederholungsversuch wäre der falsche: Ein Test, der beim
// zweiten Mal grün wird, gewöhnt einen daran, Rot nicht ernst zu nehmen — und
// dann geht auch der echte Befund unter. Hier wird stattdessen die Ursache
// beseitigt: nacheinander übersetzen, danach laufen alle Tests auf warmen
// Routen.
//
// Kosten: ein Durchlauf, rund eine Minute. Er ersetzt keine Prüfung — die
// Antworten werden bewusst nicht bewertet, das ist Aufgabe der Tests.
async function globalSetup(config: FullConfig) {
  const basis = config.projects[0]?.use?.baseURL ?? "http://localhost:3045";
  const start = Date.now();
  let bereit = 0;

  for (const pfad of ALLE_PFADE) {
    try {
      const res = await fetch(`${basis}${pfad}`, {
        headers: { "user-agent": "solar-check-e2e-warmup" },
        signal: AbortSignal.timeout(90_000),
      });
      await res.arrayBuffer(); // vollständig lesen, sonst ist die Übersetzung evtl. nicht fertig
      if (res.ok) bereit++;
    } catch {
      // Ein Fehlschlag beim Vorwärmen ist KEIN Abbruch: Ob eine Seite in Ordnung
      // ist, entscheidet der Test, nicht dieser Aufruf. Hier geht es nur darum,
      // dass die Route übersetzt ist.
    }
  }

  const dauer = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`[Vorwärmen] ${bereit}/${ALLE_PFADE.length} Adressen in ${dauer} s übersetzt.`);
}

export default globalSetup;
