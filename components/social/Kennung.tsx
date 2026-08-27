"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "../Icons";
import { iconSizes, v, pad } from "../../lib/theme";

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
//
// Als ZEICHEN, nicht als Text: In der Kachel stand die Kennung ausgeschrieben —
// bei einer Handvoll Beiträgen unauffällig, bei hunderten eine zweite
// Titelzeile, die niemand liest und die jede Kachel höher macht. Sie steht
// deshalb unten bei den Aktionen; wer sie braucht, holt sie sich, und wer sie
// nicht braucht, sieht sie nicht. Lesbar bleibt sie über den Tooltip und für
// Screenreader über die Beschriftung.

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
      title={kopiert ? "kopiert" : `Kennung kopieren: ${id}`}
      aria-label={`Kennung kopieren: ${id}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: pad("xs", "sm"),
        borderRadius: v("--radius-sm"),
        border: `1px solid ${v("--color-border")}`,
        background: "transparent",
        color: kopiert ? v("--color-positive-text") : v("--color-text-secondary"),
        cursor: "pointer",
      }}
    >
      {kopiert ? <IconCheck size={iconSizes.md} /> : <IconCopy size={iconSizes.md} />}
    </button>
  );
}
