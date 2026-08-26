/**
 * EINE HALTBARKEIT AUS DEM QUELLTEXT LESEN — an einer Stelle, für alle Tests.
 *
 * Warum das eine eigene Datei ist: Zwei Tests haben am 26.08.2026 unabhängig
 * voneinander denselben Fehler gemacht. Beide lasen die Haltbarkeit mit
 * `/revalidate:\s*(\d+)/` — also die erste Ziffernfolge. Das ergibt:
 *
 *   revalidate = 604800            →  604800  ✓
 *   revalidate = 60 * 60 * 24 * 7  →      60  ✗  (es sind 604.800)
 *   revalidate = 7 * 86400         →       7  ✗  (es sind 604.800)
 *   revalidate = STAMMDATEN_TTL    →    null  ✗  (fällt stumm aus der Prüfung)
 *
 * Ein Test, der so liest, hält eine Sieben-Tage-Angabe für sechzig Sekunden
 * (oder umgekehrt) und urteilt falsch — in beide Richtungen. Gefunden von einem
 * adversarialen Prüfer im ersten Test, und der zweite Test, der daraufhin
 * gebaut wurde, fiel prompt in dieselbe Grube. Deshalb steht das Lesen jetzt
 * hier und nicht mehr in jedem Test einzeln.
 *
 * WAS DIESE DATEI BEWUSST NICHT TUT: raten. Ein Ausdruck, den sie nicht sicher
 * ausrechnen kann, kommt als `unlesbar` zurück — und der aufrufende Test MUSS
 * daran scheitern, statt ihn zu überspringen. Eine übersprungene Angabe ist
 * eine stille Lücke, und genau die sollen diese Tests ja verhindern.
 */

export type Haltbarkeit =
  | { art: "zahl"; sekunden: number }
  | { art: "fehlt" }
  | { art: "unlesbar"; ausdruck: string };

/** Rechnet einen reinen Zahlen-Ausdruck aus: "60 * 60 * 24 * 7" → 604800. */
function rechne(ausdruck: string): number | null {
  const sauber = ausdruck.replace(/_/g, "").trim();
  // Nur Ziffern, Mal-Zeichen und Leerraum — nichts, was Nebenwirkungen hätte.
  if (!/^\d+(\s*\*\s*\d+)*$/.test(sauber)) return null;
  return sauber
    .split("*")
    .map((t) => Number(t.trim()))
    .reduce((a, b) => a * b, 1);
}

/**
 * Liest `revalidate: <ausdruck>` oder `export const revalidate = <ausdruck>`.
 *
 * @param quelle    Quelltext der Datei
 * @param ausschnitt Optionaler Teilausschnitt (z. B. ein einzelner Cache-Aufruf)
 * @param modulQuelle Volltext des Moduls, um Konstanten aufzulösen
 */
export function leseHaltbarkeit(ausschnitt: string, modulQuelle = ausschnitt): Haltbarkeit {
  const m =
    ausschnitt.match(/revalidate:\s*([^,\n}]+)/) ??
    ausschnitt.match(/export\s+const\s+revalidate\s*=\s*([^;\n]+)/);
  if (!m) return { art: "fehlt" };

  const roh = m[1].trim().replace(/;$/, "");

  const direkt = rechne(roh);
  if (direkt !== null) return { art: "zahl", sekunden: direkt };

  // Eine Konstante — ihren Wert im Modul nachschlagen und dort ebenfalls rechnen.
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(roh)) {
    const konst = modulQuelle.match(
      new RegExp(`(?:const|let|var)\\s+${roh}\\s*=\\s*([^;\\n]+)`)
    );
    if (konst) {
      const wert = rechne(konst[1]);
      if (wert !== null) return { art: "zahl", sekunden: wert };
    }
  }

  return { art: "unlesbar", ausdruck: roh };
}
