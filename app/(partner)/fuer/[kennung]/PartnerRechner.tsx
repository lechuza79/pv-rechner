"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { v, space, pad } from "../../../../lib/theme";
import type { StandSeite } from "../../../../lib/stand-format";

/**
 * Was auf der betriebseigenen Seite gerechnet wird — und in welcher Reihenfolge.
 *
 * ── Warum der EMPFEHLUNGSWEG der Standard ist ──────────────────────────────
 * Wer über die Website eines Fachbetriebs kommt, weiß in aller Regel nicht,
 * welche Anlage er braucht (Betreiber, 03.09.2026: „in der regel weiß man ja
 * nicht was man braucht"). Der direkte Rechner setzt genau das voraus — er
 * fragt als Erstes nach der Anlagengröße in Kilowatt-Peak. Auf unserer eigenen
 * Seite ist das vertretbar, weil dort beide Wege nebeneinander im Menü stehen;
 * hier gibt es kein Menü.
 *
 * ── Beide Wege, EINE Adresse ───────────────────────────────────────────────
 * Es gibt keinen Umschalter im Sinne einer Einstellung. Was gezeigt wird,
 * ergibt sich aus dem Zustand in der Adresse — dieselbe Systematik, mit der
 * die beiden Wege auf unserer Seite längst auf derselben Ergebnisseite enden:
 *
 *   nichts gesetzt          → Empfehlungsweg („was passt zu mir?")
 *   `direkt=1`              → Rechner von vorn, für die, die ihre Anlage kennen
 *   `flow=emp` (o. Ergebnis)→ Rechner mit dem Ergebnis des Empfehlungswegs
 *
 * Der Empfehlungsweg springt am Ende NICHT auf unseren Rechner, sondern
 * bleibt auf dieser Adresse (`zielPfad`). Ohne das hätte er den Besucher
 * mitten im Vorgang auf solar-check.io abgesetzt — mit dem Ergebnis, aber
 * ohne den Betrieb, der ihn geschickt hat.
 */

const PVRechner = dynamic(() => import("../../../(site)/photovoltaik-rechner/rechner"), {
  ssr: false,
  loading: () => <Laedt />,
});

const Empfehlung = dynamic(() => import("../../../(site)/pv-bedarf-berechnen/empfehlung"), {
  ssr: false,
  loading: () => <Laedt />,
});

function Laedt() {
  return (
    <div
      style={{
        padding: "48px 0",
        textAlign: "center",
        color: v("--color-text-muted"),
        fontSize: v("--font-size-small"),
      }}
    >
      Rechner wird geladen …
    </div>
  );
}

export default function PartnerRechner({
  kennung,
  name,
  initialParams,
  stand,
}: {
  kennung: string;
  name: string;
  initialParams?: Record<string, string | string[] | undefined>;
  stand?: StandSeite;
}) {
  const params = useSearchParams();
  const pfad = `/fuer/${kennung}`;

  // Gelesen wird aus der Adresse, nicht aus einem Zustand: Ein geteilter Link
  // muss beim Empfänger dasselbe zeigen wie beim Absender.
  const direkt = params.get("direkt") === "1";
  const ausEmpfehlung = params.get("flow") === "emp";

  if (direkt || ausEmpfehlung) {
    return (
      <>
        {/* Der Rückweg steht nur da, wo jemand ihn absichtlich gewählt hat.
            Nach dem Empfehlungsweg wäre er ein Angebot, gerade Erarbeitetes
            wegzuwerfen. */}
        {direkt && !ausEmpfehlung && (
          <Wechsel
            href={pfad}
            frage="Noch unsicher, was du brauchst?"
            aktion="Passende Anlage finden"
          />
        )}
        <PVRechner
          sharePfad={pfad}
          partner={{ kennung, name }}
          initialParams={initialParams}
        />
      </>
    );
  }

  return (
    <>
      <Wechsel
        href={`${pfad}?direkt=1`}
        frage="Du weißt schon, welche Anlage du willst?"
        aktion="Direkt durchrechnen"
      />
      {/* `zielPfad` hält den Empfehlungsweg auf dieser Seite — siehe oben. */}
      <Empfehlung stand={stand} zielPfad={pfad} heimPfad={null} eigenerPfad={pfad} />
    </>
  );
}

/**
 * Der Wechsel zwischen beiden Wegen. Bewusst eine Textzeile und keine Reiter:
 * Reiter verlangen eine Entscheidung, bevor man weiß, was dahinter steckt —
 * und wer nicht weiß, was er braucht, kann sie nicht treffen. Die Zeile fragt
 * stattdessen und bietet den anderen Weg als Antwort an.
 */
function Wechsel({ href, frage, aktion }: { href: string; frage: string; aktion: string }) {
  return (
    <div style={S.wechsel}>
      <span style={S.frage}>{frage}</span>
      <Link href={href} style={S.aktion}>
        {aktion} →
      </Link>
    </div>
  );
}

const S = {
  wechsel: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: space.xs,
    flexWrap: "wrap" as const,
    padding: pad("sm", "md"),
    fontSize: v("--font-size-small"),
  },
  frage: {
    color: v("--color-text-secondary"),
  },
  aktion: {
    color: v("--color-accent"),
    fontWeight: 600,
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
  },
} as const;
