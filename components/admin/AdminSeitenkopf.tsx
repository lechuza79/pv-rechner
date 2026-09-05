import InfoTooltip from "../InfoTooltip";
import { v, space } from "../../lib/theme";

// ─── Der Kopf einer Admin-Seite: der Titel, sonst nichts. ────────────────────
//
// Vier Admin-Seiten trugen bis zum 01.09.2026 denselben dreiteiligen Kopf —
// ein „ADMIN"-Kicker, die Überschrift und darunter ein Absatz, der die Seite
// erklärte. Betreiber-Entscheidung: beides raus. Der Kicker sagt jemandem, der
// im Admin-Bereich steht, nichts Neues, und der Erklärabsatz steht dort, wo man
// ihn nach dem zweiten Besuch überliest — also gerade nicht dort, wo eine Frage
// entsteht.
//
// Was von der Erklärung wirklich gebraucht wird, wandert als „?" an die Stelle,
// die es erklärt: neben die Zahl, neben die Spaltenüberschrift. Der Baustein
// nimmt dafür ein `hilfe` — steht dort nichts, gibt es auch kein Zeichen.
//
// Bewusst KEIN Untertitel-Feld: Das wäre die Beschreibung durch die Hintertür,
// und beim nächsten Mal stünde sie wieder da.

export default function AdminSeitenkopf({
  titel,
  hilfe,
}: {
  titel: string;
  /** Optionale Erklärung zur Seite als Ganzes — erscheint als „?" am Titel. */
  hilfe?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: space.sm, marginBottom: space.xl }}>
      <h1 style={{ fontSize: v("--font-size-h1"), fontWeight: 800, margin: 0 }}>{titel}</h1>
      {hilfe ? (
        <InfoTooltip title={titel} ariaLabel={`Was zeigt „${titel}"?`} exportNote={false}>
          {hilfe}
        </InfoTooltip>
      ) : null}
    </div>
  );
}
