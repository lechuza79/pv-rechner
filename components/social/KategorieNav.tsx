"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuswahlSkipper } from "../AuswahlSkipper";
import { v, space, pad } from "../../lib/theme";
import type { Bereich } from "../../lib/redaktionsplan";

// Die Kategorie-Navigation: ein Wähler je Überkategorie.
//
// Zwanzig Reiter nebeneinander waren zwei volle Zeilen, in denen man die
// gesuchte Familie einzeln absucht. Vier Wähler sind vier Fragen — woraus
// entsteht der Beitrag, und welche Familie darin —, und der aktive Bereich ist
// der einzige, der aufgeklappt etwas zu wählen hat.
//
// Die Pfeile sind der Grund für das eigene Bauteil: Beim Ausarbeiten des Designs
// geht man die Familien der Reihe nach durch, ohne vorher zu wissen, welche als
// Nächstes dran ist. Ein Aufklappfeld allein zwingt bei jedem Schritt zum
// Zielen.

export type NavBereich = {
  schluessel: Bereich;
  name: string;
  eintraege: { wert: string; text: string; zusatz?: string }[];
};

export function KategorieNav({
  bereiche,
  aktiv,
  uebersicht,
  pfad = "/admin/redaktion",
  behalte,
}: {
  bereiche: NavBereich[];
  aktiv: string;
  /** Steht gerade das Raster über alles? Dann ist der Weg zurück der aktive. */
  uebersicht?: boolean;
  /** Wohin die Kategorien führen. */
  pfad?: string;
  /**
   * Angaben, die beim Wechsel der Kategorie stehen bleiben.
   *
   * Hereingereicht, seit die Ansicht auch aus dem Kommunen-Schub gefüllt werden
   * kann: Ohne das fiel die Quellenwahl beim Klick auf eine Kategorie weg, und
   * man landete stillschweigend wieder bei den bundesweiten Beiträgen — der
   * Fehler, den man erst bemerkt, wenn man sich über andere Zahlen wundert.
   *
   * Bewusst ein einfaches Wertepaar-Verzeichnis und KEINE Funktion: Dieses
   * Bauteil läuft im Browser, und eine Funktion lässt sich dorthin nicht
   * übergeben — die Seite antwortet dann mit einem Serverfehler.
   */
  behalte?: Record<string, string | undefined>;
}) {
  const router = useRouter();

  const adresse = (kategorie: string | undefined): string => {
    const q = new URLSearchParams();
    if (kategorie) q.set("k", kategorie);
    for (const [name, wert] of Object.entries(behalte ?? {})) {
      if (name !== "k" && typeof wert === "string" && wert) q.set(name, wert);
    }
    return `${pfad}${q.toString() ? `?${q}` : ""}`;
  };

  return (
    <nav
      aria-label="Kategorien"
      style={{
        display: "flex",
        gap: space.xl,
        flexWrap: "wrap",
        borderBottom: `1px solid ${v("--color-border-muted")}`,
        paddingBottom: space.lg,
        marginBottom: space.xl,
      }}
    >
      {/* Der Weg zurück zum Raster. Er steht in derselben Leiste wie die
          Kategorien, nicht als Pfeil darüber: Von hier aus wählt man, was man
          sieht — „alles" ist eine dieser Wahlen und keine andere Sorte Sprung.
          Ohne ihn kam man aus einer Kategorie nur über das Hauptmenü zurück, und
          dort ist „Entwicklung" bereits als aktiv markiert. */}
      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span
          style={{
            fontSize: v("--font-size-caption"),
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: uebersicht ? v("--color-accent") : v("--color-text-muted"),
          }}
        >
          Übersicht
        </span>
        <Link
          href={adresse(undefined)}
          aria-current={uebersicht ? "page" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 38,
            padding: pad("sm", "lg"),
            borderRadius: v("--radius-md"),
            border: `1px solid ${uebersicht ? v("--color-accent") : v("--color-border")}`,
            background: uebersicht ? v("--color-accent-dim") : v("--color-bg-muted"),
            color: uebersicht ? v("--color-accent") : v("--color-text-secondary"),
            fontSize: v("--font-size-body"),
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Alle Beiträge
        </Link>
      </div>

      {bereiche.map((b) => {
        // Der Bereich, in dem die gewählte Familie liegt, zeigt sie an; die
        // übrigen stehen auf ihrem ersten Eintrag. Sie deshalb auszugrauen wäre
        // falsch — sie sind bedienbar, nur nicht aktiv.
        const eigener = !uebersicht && b.eintraege.some((e) => e.wert === aktiv);
        return (
          <div key={b.schluessel} style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
            <span
              style={{
                fontSize: v("--font-size-caption"),
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: eigener ? v("--color-accent") : v("--color-text-muted"),
              }}
            >
              {b.name}
            </span>
            <AuswahlSkipper
              eintraege={b.eintraege}
              wert={eigener ? aktiv : b.eintraege[0].wert}
              onWaehle={(w) => router.push(adresse(w))}
              ariaLabel={`Kategorie im Bereich ${b.name}`}
              maxWidth={b.eintraege.length > 3 ? 260 : 200}
            />
          </div>
        );
      })}
    </nav>
  );
}
