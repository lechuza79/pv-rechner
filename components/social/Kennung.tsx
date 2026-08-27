"use client";

import { useState } from "react";
import { v, pad } from "../../lib/theme";

// Die Kennung eines Beitrags, zum Kopieren.
//
// Sie ist der einzige Name, der zwischen Ansicht und Code derselbe ist: Der
// Titel steht in der Oberfläche, die Kennung im Quelltext, in der Ablage und in
// der Prüfung. Wer über einen bestimmten Beitrag reden will, braucht genau die —
// „die dritte Kachel von oben" hängt an der Sortierung und stimmt beim nächsten
// Aufruf nicht mehr.
//
// Kopieren statt Markieren: Ein Wort in Monospace lässt sich zwar auswählen,
// aber ein Doppelklick greift bei Bindestrichen nur die Silbe.

export function Kennung({ id }: { id: string }) {
  const [kopiert, setKopiert] = useState(false);

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(id);
      setKopiert(true);
      window.setTimeout(() => setKopiert(false), 1500);
    } catch {
      // Ohne Zwischenablage (unsicherer Kontext, verweigerte Erlaubnis) bleibt
      // die Kennung lesbar und markierbar — das ist der Rückfall, keine Meldung.
    }
  }

  return (
    <button
      type="button"
      onClick={kopieren}
      title="Kennung kopieren"
      style={{
        alignSelf: "flex-start",
        padding: pad("xs", "sm"),
        borderRadius: v("--radius-sm"),
        border: `1px solid ${v("--color-border-muted")}`,
        background: v("--color-bg-muted"),
        color: kopiert ? v("--color-positive-text") : v("--color-text-muted"),
        fontFamily: v("--font-mono"),
        fontSize: v("--font-size-caption"),
        cursor: "pointer",
      }}
    >
      {kopiert ? "kopiert" : id}
    </button>
  );
}
