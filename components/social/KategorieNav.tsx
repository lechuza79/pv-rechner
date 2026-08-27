"use client";

import { useRouter } from "next/navigation";
import { AuswahlSkipper } from "../AuswahlSkipper";
import { v, space } from "../../lib/theme";
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

export function KategorieNav({ bereiche, aktiv }: { bereiche: NavBereich[]; aktiv: string }) {
  const router = useRouter();

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
      {bereiche.map((b) => {
        // Der Bereich, in dem die gewählte Familie liegt, zeigt sie an; die
        // übrigen stehen auf ihrem ersten Eintrag. Sie deshalb auszugrauen wäre
        // falsch — sie sind bedienbar, nur nicht aktiv.
        const eigener = b.eintraege.some((e) => e.wert === aktiv);
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
              onWaehle={(w) => router.push(`/admin/redaktion?k=${w}`)}
              ariaLabel={`Kategorie im Bereich ${b.name}`}
              maxWidth={b.eintraege.length > 3 ? 260 : 200}
            />
          </div>
        );
      })}
    </nav>
  );
}
