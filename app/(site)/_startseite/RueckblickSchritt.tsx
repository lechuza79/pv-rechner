"use client";

import { useEffect, useRef, useState } from "react";
import NeonButton from "../../../components/NeonButton";
import { IconArrowRight } from "../../../components/Icons";
import { euroVollTeile } from "../../../lib/atlas-format";
import { isValidPlz, useLocation, writeLocation } from "../../../lib/location";

/**
 * The simulation's foreground: postcode in, ten-year retrospective out.
 *
 * The figures are PRECOMPUTED per postcode (see lib/solar-rueckblick-server)
 * and only read here. "Not available yet" is its own state — never zero euros.
 * The chosen postcode goes into the site-wide location store, so the sky of the
 * stage behind follows the same place.
 *
 * Wording rule: this is an energy-cost advantage before purchase and running
 * costs — never "Gewinn" (reserved for the calculator's 25-year figure).
 */

type Ergebnis = { vorteilOhneWp: number; vorteilMitWp: number; wetterquelle: string };
type Zustand =
  | { art: "eingabe"; meldung?: string; wiederholen?: boolean }
  | { art: "laedt" }
  | { art: "ergebnis"; plz: string; ort: string; werte: Ergebnis };

/** Rounded to 100 € — the model does not carry more precision than that. */
function betrag(euro: number) {
  const t = euroVollTeile(Math.round(euro / 100) * 100);
  return (
    <strong>
      <span className="hs-count-number">{t.value}</span> <span className="hs-currency">{t.unit}</span>
    </strong>
  );
}

export default function RueckblickSchritt({ rennenAnker }: { rennenAnker: string }) {
  const { plz: gespeichert, ready } = useLocation();
  const [eingabe, setEingabe] = useState("");
  const [zustand, setZustand] = useState<Zustand>({ art: "eingabe" });
  const [hilfe, setHilfe] = useState(false);
  const [ortung, setOrtung] = useState(false);
  const ueberschrift = useRef<HTMLHeadingElement>(null);
  const erstesMal = useRef(true);

  async function berechnen(plz: string) {
    setZustand({ art: "laedt" });
    try {
      const [r, o] = await Promise.all([fetch(`/api/solar-rueckblick?plz=${plz}`), fetch(`/api/ort?plz=${plz}`)]);
      if (r.status === 404 && o.ok) {
        setZustand({ art: "eingabe", meldung: `Für ${plz} liegt der Rückblick noch nicht vor. Wir rechnen ihn gerade für alle Postleitzahlen nach.` });
        return;
      }
      if (o.status === 404) {
        setZustand({ art: "eingabe", meldung: "Diese Postleitzahl kennen wir nicht. Bitte prüfe die Eingabe." });
        return;
      }
      if (!r.ok || !o.ok) throw new Error(String(r.status));
      const werte = (await r.json()) as Ergebnis;
      const ort = (await o.json()) as { name: string | null };
      writeLocation(plz);
      setZustand({ art: "ergebnis", plz, ort: ort.name ?? `PLZ ${plz}`, werte });
    } catch {
      setZustand({ art: "eingabe", meldung: "Die Berechnung ist gerade nicht erreichbar.", wiederholen: true });
    }
  }

  // A postcode the visitor already gave anywhere on the site is used directly.
  useEffect(() => {
    if (!ready || !erstesMal.current) return;
    erstesMal.current = false;
    if (gespeichert) {
      setEingabe(gespeichert);
      berechnen(gespeichert);
    }
  }, [ready, gespeichert]);

  // Move focus to the new heading when the state changes (not on first paint).
  const vorheriger = useRef(zustand.art);
  useEffect(() => {
    if (vorheriger.current !== zustand.art && zustand.art !== "laedt") ueberschrift.current?.focus();
    vorheriger.current = zustand.art;
  }, [zustand.art]);

  function standortVerwenden() {
    if (!("geolocation" in navigator)) {
      setZustand({ art: "eingabe", meldung: "Dein Browser gibt keinen Standort heraus. Gib bitte deine Postleitzahl ein." });
      return;
    }
    setOrtung(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch("/api/ort", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // ~1 km is enough to find the postcode; nothing finer leaves the browser.
            body: JSON.stringify({ lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100 }),
          });
          if (!r.ok) throw new Error("outside");
          const { plz } = (await r.json()) as { plz: string };
          setEingabe(plz);
          await berechnen(plz);
        } catch {
          setZustand({ art: "eingabe", meldung: "Für deinen Standort haben wir keine deutsche Postleitzahl gefunden. Gib sie bitte ein." });
        } finally {
          setOrtung(false);
        }
      },
      () => {
        setOrtung(false);
        setZustand({ art: "eingabe", meldung: "Ohne Freigabe des Standorts geht es mit der Postleitzahl weiter." });
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  if (zustand.art === "ergebnis") {
    const { werte, ort } = zustand;
    return (
      <div className="hs-retro hs-retro-hero">
        <h2 ref={ueberschrift} tabIndex={-1}>
          So viel hättest du in{" "}
          <button type="button" className="hs-place-edit" onClick={() => setZustand({ art: "eingabe" })} aria-label={`${ort} – Ort ändern`}>
            {ort}
          </button>{" "}
          in 10 Jahren gespart.
          <button
            type="button"
            className="hs-inline-help"
            aria-label="Berechnungsdetails"
            aria-expanded={hilfe}
            aria-controls="hs-retro-explanation"
            onClick={() => setHilfe((h) => !h)}
          >
            ?
          </button>
        </h2>
        <div className="hs-retro-help" id="hs-retro-explanation" hidden={!hilfe}>
          <div>
            <p>
              <strong>Das Modell:</strong> 10 kWp ohne Speicher, Süddach mit 35° Neigung und 3.800 kWh Haushaltsstrom pro Jahr.
              Start: Januar 2016.
            </p>
            <p>
              <strong>Mit Wärmepumpe:</strong> derselbe Haushalt, zusätzlich eine Luft-Wärmepumpe für 140 m² im teilsanierten
              Haus. Beide Werte vergleichen jeweils mit und ohne PV – keinen Heizungswechsel.
            </p>
            <p>
              <strong>Die Werte:</strong> gerundete Energiekostenersparnis 2016–2025 inklusive Einspeisevergütung, vor
              Anschaffung und laufenden Anlagenkosten. Grundlage: stündliche Wetterdaten ({werte.wetterquelle}) und historische{" "}
              <a href="https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table" target="_blank" rel="noopener noreferrer">
                Durchschnittsstrompreise (Eurostat)
              </a>
              . Dein Ergebnis kann abweichen.
            </p>
          </div>
        </div>
        <div className="hs-retro-values">
          <p>
            <span className="hs-retro-label">Mit Solarstrom</span>
            {betrag(werte.vorteilOhneWp)}
          </p>
          <p>
            <span className="hs-retro-label">Solarstrom im Haushalt mit Wärmepumpe</span>
            {betrag(werte.vorteilMitWp)}
          </p>
        </div>
        <div className="hs-retro-actions">
          <NeonButton href="/photovoltaik-rechner" className="hs-profit-cta">
            Für deinen Haushalt berechnen <IconArrowRight size={16} />
          </NeonButton>
          <a className="hs-retro-secondary hs-scroll-invitation is-ready" href={`#${rennenAnker}`}>
            Und in 20 Jahren?{" "}
            <span className="hs-down-arrow" aria-hidden="true">
              <IconArrowRight size={16} />
            </span>
          </a>
        </div>
      </div>
    );
  }

  const gueltig = isValidPlz(eingabe);
  return (
    <div className="hs-location-step">
      <h2 ref={ueberschrift} tabIndex={-1}>
        Zehn Jahre Sonne. <br />
        Was hast du verpasst?
      </h2>
      <p className="hs-location-explanation">
        Entdecke, was Solarstrom von 2016 bis 2025 bei dir eingespart hätte. Berechnet mit historischen Wetter- und
        Energiepreisdaten.
      </p>
      <form
        className="hs-location-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (gueltig) berechnen(eingabe);
        }}
      >
        <label htmlFor="hs-location-plz">Postleitzahl</label>
        <div>
          <input
            id="hs-location-plz"
            name="plz"
            inputMode="numeric"
            enterKeyHint="go"
            autoComplete="postal-code"
            pattern="[0-9]{5}"
            maxLength={5}
            required
            placeholder="PLZ eingeben"
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value.replace(/\D/g, "").slice(0, 5))}
          />
          <button
            type="button"
            className="hs-locate"
            aria-label="Meinen Standort verwenden"
            title="Meinen Standort verwenden"
            onClick={standortVerwenden}
            disabled={ortung}
            aria-busy={ortung || undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <button
            className="hs-location-submit"
            type="submit"
            aria-label="Berechnen"
            title="Berechnen"
            hidden={!gueltig}
            disabled={!gueltig || zustand.art === "laedt"}
            aria-busy={zustand.art === "laedt" || undefined}
          >
            <IconArrowRight size={18} />
          </button>
        </div>
        <p className="hs-location-status" role="status">
          {zustand.art === "laedt" ? "Wird berechnet …" : zustand.meldung ?? ""}
        </p>
        {zustand.art === "eingabe" && zustand.wiederholen && (
          <button className="hs-location-retry" type="button" onClick={() => gueltig && berechnen(eingabe)}>
            Erneut prüfen
          </button>
        )}
      </form>
    </div>
  );
}
