"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { v, space, pad } from "../../lib/theme";

// Die Ortswahl eines Versandschubs — ein Suchfeld, keine Kachelwand.
//
// DER ANLASS (Betreiber, 06.09.2026, an einem Bildschirmfoto): Die erste
// Fassung rasterte alle Gemeinden einer Kampagne als gleich aussehende Kacheln,
// jede mit ihrem Versandstatus, und die Geschichten lagen hinter einem zweiten
// Klick. Das ist eine Adressliste. Ein Redaktionstisch zeigt BEITRÄGE; der Ort
// ist der Filter davor, nicht der Inhalt.
//
// WAS DIE ZEILE SAGT, IST REDAKTIONELL, nicht postalisch: ob an diesem Ort
// schon jemand etwas eingestellt hat. „kontaktiert" gehört ins Kommunen-
// Cockpit — hier stand es an hundert Kacheln und sagte über die Arbeit nichts.

export type OrtEintrag = {
  regionId: string;
  name: string;
  /** Hat an diesem Ort schon jemand eine Fassung gespeichert? */
  angefasst: boolean;
  /** Ist der Brief raus? Nur als Reihenfolge — nicht als Beschriftung an jedem Eintrag. */
  raus: boolean;
};

/** Wie viele Treffer die Liste höchstens zeigt. */
const MAX_TREFFER = 12;

export function OrtWaehler({
  orte,
  aktiv,
  basisPfad,
}: {
  orte: OrtEintrag[];
  aktiv: string | undefined;
  /** Adresse ohne den Ortsschlüssel, z. B. „/admin/redaktion/kommunen?schub=x". */
  basisPfad: string;
}) {
  const router = useRouter();
  const [suche, setSuche] = useState("");

  const treffer = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const passend = q ? orte.filter((o) => o.name.toLowerCase().includes(q)) : orte;
    return passend.slice(0, MAX_TREFFER);
  }, [orte, suche]);

  const offen = orte.filter((o) => !o.angefasst).length;

  return (
    <div style={S.wrap}>
      <div style={S.zeile}>
        <input
          type="search"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder={`Ort suchen — ${orte.length} im Schub`}
          aria-label="Gemeinde suchen"
          style={S.feld}
        />
        {/* Die einzige Zahl, die hier etwas sagt: was noch niemand angesehen hat. */}
        <span style={S.zaehler}>
          {offen === 0
            ? "alle durchgesehen"
            : `${offen} ${offen === 1 ? "Ort" : "Orte"} noch nicht angefasst`}
        </span>
      </div>

      <div style={S.treffer}>
        {treffer.map((o) => {
          const an = o.regionId === aktiv;
          return (
            <button
              key={o.regionId}
              type="button"
              onClick={() => router.push(`${basisPfad}&ags=${o.regionId}`)}
              style={{ ...S.knopf, ...(an ? S.knopfAktiv : null) }}
              aria-pressed={an}
            >
              {o.name}
              {/* Ein Punkt statt eines Wortes: Bei zwölf Einträgen nebeneinander
                  ist „noch nicht angefasst" an jedem eine Textwand. */}
              {!o.angefasst && <span style={S.punkt} aria-label="noch nicht angefasst" />}
            </button>
          );
        })}
        {treffer.length === 0 && <span style={S.leer}>Kein Ort dieses Namens im Schub.</span>}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { marginBottom: space.xl },
  zeile: { display: "flex", alignItems: "center", gap: space.md, flexWrap: "wrap" },
  feld: {
    flex: "1 1 260px",
    maxWidth: 360,
    padding: pad("sm", "md"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    fontSize: v("--font-size-body"),
  },
  zaehler: { fontSize: v("--font-size-small"), color: v("--color-text-muted") },
  treffer: { display: "flex", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
  knopf: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: pad("xs", "md"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-sm"),
    background: v("--color-bg"),
    color: v("--color-text-secondary"),
    fontSize: v("--font-size-small"),
    cursor: "pointer",
    font: "inherit",
  },
  knopfAktiv: {
    background: v("--color-accent"),
    borderColor: v("--color-accent"),
    color: v("--color-bg"),
    fontWeight: 600,
  },
  punkt: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: v("--color-highlight"),
    flexShrink: 0,
  },
  leer: { fontSize: v("--font-size-small"), color: v("--color-text-muted") },
};
