import GemeindeSolarWidget from "../gemeinde-solar/client";
import GemeindeErneuerbareWidget from "../../../../components/atlas/GemeindeErneuerbareWidget";
import Shot from "./shot";

// TEMPORÄR — Prüfaufbau für die Breiten-Kontrolle der Gemeinde-Widgets ohne
// Datenbank. Vor dem Merge wieder löschen.
export const dynamic = "force-static";

export default function ZzPreview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 12 }}>
      <Shot />
      <div data-shot>
      <GemeindeSolarWidget
        name="Riedstadt"
        bundesland="Hessen"
        population={24917}
        count={1842}
        kwp={41800}
        kwpDach={41820}
        speicherKwh={9900}
        dataAsOf="2026-07-01"
        ags="06433011"
        atlasPath="/solar-atlas/hessen/gross-gerau/riedstadt"
      />
      </div>
      <div data-shot>
      <GemeindeErneuerbareWidget
        name="Nidda"
        solarKwp={16400}
        generators={{
          wind: { count: 4, kwp: 3700 },
          biomasse: { count: 2, kwp: 410 },
          wasser: { count: 1, kwp: 41 },
        }}
        speicherKwh={5600}
        liveUrl="https://solar-check.io/solar-atlas/hessen/wetteraukreis/nidda"
      />
      </div>
    </div>
  );
}
