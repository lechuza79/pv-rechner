"use client";
import { useState } from "react";
import { v, space } from "../../../lib/theme";
import OptionCard from "../../../components/OptionCard";
import FlowNav, { flowSelect } from "../../../components/FlowNav";
import AngebotCheck from "../../../components/AngebotCheck";
import { GEWERKE, type GewerkId } from "../../../lib/angebot-gewerk";
import GebaeudeField, { GEBAEUDE_FIELDS } from "../../../components/GebaeudeField";
import ResultSection from "../../../components/ResultSection";
import { calcHeatLoad, auslegungsleistung } from "../../../lib/heatpump-core";
import { HAUSTYP_WP, INSULATION_BESTAND } from "../../../lib/constants";
import type { Heizsystem } from "../../../lib/constants";

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

  // Das Gebäude wird hier NACHGETRAGEN, nicht vorher abgefragt. Wer mit einem
  // Angebot in der Hand kommt, will es prüfen lassen — vier Fragen davor sind
  // eine Hürde vor einem Ergebnis, das auch ohne sie brauchbar ist. Erst wenn
  // die Prüfung steht und die Größe offen bleibt, lohnt sich die Frage.
  //
  // Gerechnet wird mit denselben Funktionen wie im Wärmepumpen-Rechner; eine
  // eigene Heizlast-Formel an dieser Stelle wäre ein zweites Fundament.
  const [gebaeude, setGebaeude] = useState<{
    haustypIdx: number; wohnflaeche: number; insulationIdx: number; heizsystem: Heizsystem;
  } | null>(null);
  const [beantwortet, setBeantwortet] = useState<Set<string>>(new Set());
  const [bearbeitet, setBearbeitet] = useState<string | null>(GEBAEUDE_FIELDS[0]);

  const vollstaendig = gebaeude !== null && GEBAEUDE_FIELDS.every((f) => beantwortet.has(f));
  const heizlastKw = vollstaendig && gebaeude
    ? calcHeatLoad("bestand", gebaeude.wohnflaeche, gebaeude.insulationIdx, HAUSTYP_WP[gebaeude.haustypIdx].faktor)
    : undefined;
  const auslegungKw = heizlastKw != null ? auslegungsleistung(heizlastKw) : undefined;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{
        fontSize: v("--font-size-h1"), fontWeight: 800, letterSpacing: "-0.02em",
        color: v("--color-text-primary"), lineHeight: 1.2,
        marginTop: 0, marginBottom: space.sm,
      }}>
        Angebot prüfen lassen
      </h1>
      <p style={{ fontSize: v("--font-size-lead"), lineHeight: 1.6, color: v("--color-text-muted"), marginTop: 0 }}>
        Du hast ein Angebot vom Handwerker und willst wissen, ob es passt. Lade es hoch — wir sagen
        dir, ob die Anlage zur Größe passt, ob die üblichen Positionen drinstehen und wie der Preis
        im Vergleich liegt. <strong>Ohne Anmeldung, ohne Weitergabe an Betriebe.</strong>
      </p>

      {schritt === 0 && (
        <>
          <h2 style={{
            fontSize: v("--font-size-h2"), fontWeight: 700, color: v("--color-text-primary"),
            marginTop: space.xl, marginBottom: space.md,
          }}>
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
          {gewerk.id === "waermepumpe" && (
            <div style={{ marginBottom: space.lg }}>
              <ResultSection
                title="Dein Gebäude"
                summary={
                  vollstaendig && gebaeude
                    ? `${HAUSTYP_WP[gebaeude.haustypIdx].label} · ${gebaeude.wohnflaeche} m² · ${INSULATION_BESTAND[gebaeude.insulationIdx]?.label}`
                    : "optional — damit wir die Größe beurteilen können"
                }
              >
                <p style={{ fontSize: v("--font-size-small"), lineHeight: 1.6, color: v("--color-text-muted"), marginTop: 0 }}>
                  Ohne diese Angaben prüfen wir Vollständigkeit und Preis. Ob die angebotene
                  Wärmepumpe zu deinem Haus passt, können wir erst sagen, wenn wir wissen, wie
                  viel Wärme es braucht.
                </p>
                <GebaeudeField
                  werte={gebaeude ?? { haustypIdx: 0, wohnflaeche: 140, insulationIdx: 1, heizsystem: "hk_alt" }}
                  setWerte={(patch) =>
                    setGebaeude((alt) => ({
                      ...(alt ?? { haustypIdx: 0, wohnflaeche: 140, insulationIdx: 1, heizsystem: "hk_alt" as Heizsystem }),
                      ...patch,
                    }))
                  }
                  beantwortet={beantwortet}
                  markiereBeantwortet={(key) => {
                    setBeantwortet((alt) => new Set(alt).add(key));
                    setBearbeitet(null);
                  }}
                  bearbeitet={bearbeitet}
                  setBearbeitet={setBearbeitet}
                  daemmstufen={INSULATION_BESTAND}
                />
              </ResultSection>
            </div>
          )}

          <AngebotCheck gewerk={gewerk.id} einheit={gewerk.einheit} heizlastKw={heizlastKw} auslegungKw={auslegungKw} />
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
