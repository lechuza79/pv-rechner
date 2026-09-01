// Der Fingerabdruck einer Fassung — die EINZIGE Stelle, die ihn rechnet.
//
// Eigenes Modul, obwohl es eine Funktion ist: Es darf `node:crypto` benutzen und
// muss deshalb serverseitig bleiben, soll aber nicht die Datenbank mitbringen.
// Läge es in der Prüfungs-Ablage, könnte kein Test es aufrufen, ohne Supabase zu
// laden — und ein Anker, den man nicht prüfen kann, ist der falsche Anker.
//
// WARUM SHA-256 UND NICHT DIE FRÜHERE PRÜFSUMME: Vorher stand hier eine
// handgeschriebene FNV-1a-Funktion mit 32 Bit plus Textlänge, weil sie im
// Browser laufen musste. Das ist eine Streuspeicher-Funktion aus dem Lehrbuch,
// nicht kollisionsfest: Zu einem freigegebenen Text ließ sich in Sekunden ein
// anderer bauen, der denselben Abdruck ergibt — und damit dessen Freigabe erbt.
// Weil der Text über die Fassungs-Route frei setzbar ist und diese den
// Cron-Schlüssel akzeptiert, war das kein Gedankenspiel. Der ganze Aufbau hängt
// an dem Satz „gleicher Abdruck heißt gleiche Fassung"; mit der alten Funktion
// war dieser Satz schlicht falsch.
//
// WARUM DER BROWSER JETZT NICHT MEHR RECHNET: Eine Prüfsumme, die an zwei Orten
// laufen muss, ist nur so stark wie der schwächere Ort. Der Browser braucht sie
// auch gar nicht — er muss nur wissen, ob sein Entwurf noch dem abgelegten
// Stand entspricht, und das weiß er, weil er die Änderung selbst gemacht hat.
// Den Abdruck des abgelegten Standes reicht der Server herunter.

import { createHash } from "node:crypto";
import { fassungsText, type Fassung } from "./social-pruefung-kern";

export function fassungsAbdruck(fassung: Fassung): string {
  return createHash("sha256").update(fassungsText(fassung), "utf8").digest("hex");
}
