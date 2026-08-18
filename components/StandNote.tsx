import { STAND } from "../lib/stand";
import StandNoteView from "./StandNoteView";

/**
 * Der Aktualisierungsstand unter einem Rechner, direkt aus dem Pfad — die
 * bequeme Form für SERVER-Komponenten.
 *
 * NUR IN SERVER-KOMPONENTEN VERWENDEN. Über `lib/stand.ts` hängen an diesem
 * Modul sieben Config-Module (Wärmepumpe, Grüngas, CO₂, EEG-Reform,
 * Einspeisung, Balkon, Klima); in einer Client-Komponente wandern sie
 * vollständig ins Browser-Bundle, auch wenn die Seite von keiner davon ein Wort
 * braucht. Ein Rechner, dessen Stand-Zeile innerhalb des Client-Rahmens sitzt,
 * lässt seine Server-Seite `standSeite("/pfad")` lesen und reicht das Ergebnis
 * durch an <StandNoteView>.
 *
 * Die Formulierung steht komplett in <StandNoteView>; hier passiert nur das
 * Nachschlagen.
 */
export default function StandNote({ pfad, style }: { pfad: string; style?: React.CSSProperties }) {
  return <StandNoteView seite={STAND[pfad]} style={style} />;
}
