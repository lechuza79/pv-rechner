"use client";
import { useState } from "react";
import { v, space } from "../../../lib/theme";
import OptionCard from "../../../components/OptionCard";
import FlowNav, { flowSelect } from "../../../components/FlowNav";
import AngebotCheck from "../../../components/AngebotCheck";
import { GEWERKE, type GewerkId } from "../../../lib/angebot-gewerk";

// ─── Angebot prüfen als eigener Weg ───────────────────────────────────────────
//
// Derselbe Baustein wie im Wärmepumpen-Ergebnis, nur ohne Rechner davor. Der
// Unterschied ist nicht kosmetisch: Wer hier ankommt, hat sein Angebot schon und
// will es einordnen — ihn erst durch fünf Fragen zum Gebäude zu schicken, um
// eine Prüfung zu bekommen, die auch ohne sie funktioniert, wäre eine Hürde ohne
// Gegenwert. Fehlt die Gebäudegröße, entfällt allein das Größen-Urteil; die
// Vollständigkeit und der Preis stehen trotzdem.

const REIHENFOLGE: GewerkId[] = ["waermepumpe", "pv"];

const UNTERZEILE: Record<GewerkId, string> = {
  waermepumpe: "Luft/Wasser oder Sole/Wasser",
  pv: "Module, Wechselrichter, Speicher",
};

export default function AngebotPruefenClient() {
  const [schritt, setSchritt] = useState(0);
  const [gewerkId, setGewerkId] = useState<GewerkId | null>(null);
  const gewerk = gewerkId ? GEWERKE[gewerkId] : null;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, lineHeight: 1.25, marginTop: 0, marginBottom: space.sm }}>
        Angebot prüfen lassen
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: v("--color-text-secondary"), marginTop: 0 }}>
        Du hast ein Angebot vom Handwerker und willst wissen, ob es passt. Lade es hoch — wir sagen
        dir, ob die Anlage zur Größe passt, ob die üblichen Positionen drinstehen und wie der Preis
        im Vergleich liegt. <strong>Ohne Anmeldung, ohne Weitergabe an Betriebe.</strong>
      </p>

      {schritt === 0 && (
        <>
          <h2 style={{ fontSize: 18, marginTop: space.xl, marginBottom: space.md }}>
            Worum geht es in deinem Angebot?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.sm }}>
            {REIHENFOLGE.map((id) => (
              <OptionCard
                key={id}
                selected={gewerkId === id}
                onClick={() => { setGewerkId(id); flowSelect(() => setSchritt(1)); }}
                label={GEWERKE[id].name}
                sub={UNTERZEILE[id]}
              />
            ))}
          </div>
          <FlowNav
            weiterAktiv={gewerkId !== null}
            onWeiter={() => setSchritt(1)}
            zurueckSichtbar={false}
            inaktivHinweis="Bitte erst wählen, worum es geht."
          />
        </>
      )}

      {schritt === 1 && gewerk && (
        <div style={{ marginTop: space.xl }}>
          <AngebotCheck gewerk={gewerk.id} einheit={gewerk.einheit} />
          <div style={{ marginTop: space.xl }}>
            <FlowNav
              weiterAktiv={false}
              onWeiter={() => {}}
              onZurueck={() => setSchritt(0)}
              weiterLabel="Weiter"
              inaktivHinweis="Lade oben dein Angebot hoch."
            />
          </div>
        </div>
      )}
    </div>
  );
}
