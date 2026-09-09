// Die echten Kennzahlen einmal abholen und ablegen.
//
// Wozu: Bildformen lassen sich nicht an erfundenen Verteilungen beurteilen. Ob
// eine Rangliste über sechzehn Länder trägt, entscheidet sich daran, wie weit
// die realen Werte auseinanderliegen — bei gleichmäßig verteilten Testzahlen
// sieht jede Form gut aus.
//
// Bewusst DIESELBE Rechnung wie die Ansicht (`rechne` aus lib/social-kennzahlen),
// nicht eine eigene Abfrage daneben: Sonst beurteilt die Werkbank eine andere
// Verteilung als die, die später im Beitrag steht.

import { writeFileSync } from "node:fs";
import { rechne } from "../lib/social-kennzahlen";

const ziel = process.argv[2] ?? "/tmp/social-kennzahlen.json";

rechne()
  .then((k) => {
    writeFileSync(ziel, JSON.stringify(k, null, 2));
    console.log(`Kennzahlen abgelegt: ${ziel}`);
    console.log(`Datenstand ${k.standIso.slice(0, 10)} · ${k.laender.length} Länder`);
  })
  .catch((e) => {
    console.error("Fehlgeschlagen:", (e as Error).message);
    process.exit(1);
  });
