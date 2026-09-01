"use client";

import { useMemo, useState } from "react";
import { v, space } from "../../lib/theme";
import { FilterLeiste } from "../admin/FilterLeiste";
import { ThemaPruefen } from "./ThemaPruefen";
import { ArtikelTabelle } from "./ArtikelTabelle";
import type { ArtikelVorhaben } from "../../lib/artikelplan";

// Ein Filter statt drei untereinanderliegender Tabellen (Betreiber-Vorgabe
// 28.08.2026).
//
// Drei Abschnitte hießen: dreimal derselbe Spaltenkopf, dreimal eine eigene
// Sortierung, und wer „Veröffentlicht“ sehen wollte, musste an der
// Warteschlange vorbeiscrollen. Mit einem Filter bleibt die Tabelle an ihrem
// Platz und der Kopf sortiert genau eine Liste.
//
// „Alle“ steht zuerst und ist die Voreinstellung: Der Plan wird meist gelesen,
// um zu vergleichen, und ein Filter, der beim Öffnen schon etwas ausblendet,
// versteckt genau das, was man vergleichen will.

const REIHENFOLGE = ["alle", "geplant", "in-arbeit", "live", "verworfen"] as const;

const LABEL: Record<string, string> = {
  alle: "Alle",
  geplant: "Geplant",
  "in-arbeit": "In Arbeit",
  live: "Veröffentlicht",
  verworfen: "Verworfen",
};

export function ArtikelBereich({
  vorhaben,
  volumen,
  zustandLabel,
}: {
  vorhaben: ArtikelVorhaben[];
  volumen: Record<string, number>;
  zustandLabel: Record<string, string>;
}) {
  const [aktiv, setAktiv] = useState<string>("alle");

  const eintraege = useMemo(
    () =>
      REIHENFOLGE.map((k) => ({
        key: k,
        label: LABEL[k],
        anzahl: k === "alle" ? vorhaben.length : vorhaben.filter((v) => v.zustand === k).length,
      })),
    [vorhaben],
  );

  const gefiltert = useMemo(
    () => (aktiv === "alle" ? vorhaben : vorhaben.filter((v) => v.zustand === aktiv)),
    [vorhaben, aktiv],
  );

  // Die Zusatzspalten der verworfenen Themen (Grund statt Begründung) hängen an
  // der Zeile, nicht am Abschnitt — deshalb reicht der Tabelle die Liste.
  const nurVerworfen = aktiv === "verworfen";

  return (
    <div>
      <FilterLeiste eintraege={eintraege} aktiv={aktiv} onWechsel={setAktiv} />

      {/* Der Weg hinein: erst prüfen, dann aufnehmen. Er steht unter der Liste
          und nicht darüber, weil man ihn seltener braucht als den Überblick —
          aber auf derselben Seite, damit man die Zahlen eines Vorschlags neben
          denen der vorhandenen Themen sieht. */}
      <details style={{ marginBottom: space.xl }}>
        <summary
          style={{
            cursor: "pointer",
            color: v("--color-accent"),
            fontSize: v("--font-size-body"),
            marginBottom: space.md,
          }}
        >
          Neues Thema prüfen
        </summary>
        <ThemaPruefen />
      </details>

      <ArtikelTabelle
        vorhaben={gefiltert}
        volumen={volumen}
        zustandLabel={zustandLabel}
        verworfen={nurVerworfen}
        mitDaten={aktiv === "live"}
      />
    </div>
  );
}
