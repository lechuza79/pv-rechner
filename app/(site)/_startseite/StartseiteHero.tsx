"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import NeonButton from "../../../components/NeonButton";
import { IconArrowDown, IconArrowRight, IconCheck, IconPause, IconPlay } from "../../../components/Icons";
import { useLocation } from "../../../lib/location";
import partikel from "./szene-partikel.json";
import { heroWetter, BEISPIEL_NAME, type HeroOrt, type HeroWetter } from "./hero-wetter";
import "./startseite-hero.css";

/**
 * The homepage hero: copy and actions are ordinary HTML (rendered on the
 * server, crawlable, readable before any script), the sky and panels behind
 * them are the shared hero stage mounted on top.
 *
 * The stage is the shared engine in public/hero-system (one source, also used
 * by the municipality page). This host owns only what the stage contract
 * leaves to the host: markup, location, weather and the reading next to it.
 *
 * Data rules (handoff 2026-09-18):
 *  - Without a saved postcode the sky follows an EXAMPLE location and says so.
 *  - Missing weather is shown as missing. The sky then keeps the time of day
 *    but no invented clouds or rain.
 */

type Stufe = "laedt" | "bereit" | "fehlt";

type Stage = {
  update(next: { state?: unknown; motion?: boolean }): void;
  dispose(): void;
};

// Kassel: example location until the coordinates arrive (same as the example postcode).
const BEISPIEL: HeroOrt = { plz: null, name: BEISPIEL_NAME, lat: 51.32, lon: 9.49 };

type SzenenZustand = (d: Date, l: { lat: number; lon: number }, w: object) => unknown;

export default function StartseiteHero({
  children,
  simulation,
}: {
  children?: React.ReactNode;
  /** On /pv-simulation the stage carries the postcode step instead of the homepage copy. */
  simulation?: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const zustand = useRef<SzenenZustand | null>(null);
  const [gemountet, setGemountet] = useState(false);
  const { plz, ready } = useLocation();
  const [ort, setOrt] = useState<HeroOrt>(BEISPIEL);
  const [wetter, setWetter] = useState<HeroWetter | null>(null);
  const [stufe, setStufe] = useState<Stufe>("laedt");
  const [pausiert, setPausiert] = useState(false);
  // The panel photograph is only the fallback when the 3D stage cannot run.
  // It is not in the first HTML: in the normal path it would be 221 kB that
  // nobody sees.
  const [ohne3d, setOhne3d] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pruefen = () => setOhne3d(root.dataset.sceneBoot === "failed");
    const beobachter = new MutationObserver(pruefen);
    beobachter.observe(root, { attributes: true, attributeFilter: ["data-scene-boot"] });
    return () => beobachter.disconnect();
  }, []);

  // Location + weather. Refreshed every 10 minutes while the page is open.
  useEffect(() => {
    if (!ready) return;
    let aktiv = true;
    const laden = async () => {
      const ergebnis = await heroWetter(plz);
      if (!aktiv) return;
      setOrt(ergebnis.ort ?? BEISPIEL);
      setWetter(ergebnis.wetter);
      setStufe(ergebnis.wetter ? "bereit" : "fehlt");
    };
    laden();
    const t = setInterval(laden, 10 * 60 * 1000);
    return () => {
      aktiv = false;
      clearInterval(t);
    };
  }, [plz, ready]);

  // Mount the shared stage once; later changes go through update().
  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const [{ mountHeroStage }, { heroInstances }, { sceneState }] = await Promise.all([
        import(/* webpackIgnore: true */ "/hero-system/dist/hero-stage.js" as string),
        import(/* webpackIgnore: true */ "/hero-system/dist/instances.js" as string),
        import("../../../public/hero-system/source/scene-state.js"),
      ]);
      if (abgebrochen || !rootRef.current || !stageRef.current || !sceneRef.current) return;
      stage.current = mountHeroStage({
        root: rootRef.current,
        stage: stageRef.current,
        scene: sceneRef.current,
        state: sceneState(new Date(), BEISPIEL, { cloud: 0, wind: 0, rain: 0, code: 0 }),
        ...heroInstances.homepage,
      });
      zustand.current = sceneState as SzenenZustand;
      setGemountet(true);
    })().catch(() => {
      // The static sky and panel image stay; the page is complete without WebGL.
      if (rootRef.current) rootRef.current.dataset.sceneBoot = "failed";
    });
    return () => {
      abgebrochen = true;
      stage.current?.dispose();
      stage.current = null;
    };
  }, []);

  // Push time, place and weather into the stage whenever they change.
  useEffect(() => {
    if (!stage.current || !zustand.current) return;
    stage.current.update({
      state: zustand.current(new Date(), ort, {
        cloud: wetter?.wolkenProzent ?? 0,
        wind: wetter?.windKmh ?? 0,
        direction: wetter?.windRichtung ?? 270,
        rain: wetter?.regenMmH ?? 0,
        code: wetter?.wetterCode ?? 0,
      }),
    });
  }, [ort, wetter, gemountet]);

  useEffect(() => {
    stage.current?.update({ motion: !pausiert });
  }, [pausiert]);

  return (
    <div ref={rootRef} className={simulation ? "solar-page homepage-study hs-simulation-route hs-journey-open" : "solar-page homepage-study"}>
      <div className="hs-hero-portal">
      <section ref={stageRef} className="hero" aria-labelledby="hero-title">
        <div ref={sceneRef} className="scene" aria-hidden="true">
          <div className="sky sky-day" />
          <div className="sky sky-overcast" />
          <div className="sky sky-dawn" />
          <div className="sky sky-dusk" />
          <div className="sky sky-night" />
          <div className="night-layer" aria-hidden="true" />
          <div className="sun-halo">
            <div className="sun-disc" />
          </div>
          <div className="moon" />
          <div className="clouds">
            <div className="cloud cloud-one" />
            <div className="cloud cloud-two" />
            <div className="cloud cloud-three" />
          </div>
          <div className="stars">{partikel.stars.map((s, i) => <i key={i} style={s} />)}</div>
          <div className="horizon-haze" />
          <div className="mist"><i /><i /></div>
          <div className="sky-life" aria-hidden="true"><div className="passing-fly" /></div>
          <div className="panel-layer">
            {ohne3d && (
              <picture>
                <source media="(max-width:600px)" srcSet="/hero-system/panel-fallback-mobile.webp" />
                {/* eslint-disable-next-line @next/next/no-img-element -- art-directed fallback layer, not a content image */}
                <img src="/hero-system/panel-fallback-0.webp" alt="" width={1536} height={1024} draggable={false} />
              </picture>
            )}
            <div className="panel-light" />
          </div>
          <div className="particles">{partikel.particles.map((s, i) => <i key={i} style={s} />)}</div>
          <div className="rain">{partikel.rain.map((s, i) => <i key={i} style={s} />)}</div>
          <div className="ground-fade" />
        </div>

        {simulation ? (
          <section className="hs-journey hs-scene-simulation" data-simulation-shell aria-label="Simulation für deinen Standort">
            <Link className="hs-journey-back" href="/">
              {/* The frozen stylesheet turns this arrow by 180°. */}
              <IconArrowRight size={16} /> Zur Startseite
            </Link>
            {/* The page's h1 carries the keyword it ranks for; the step below
                keeps the reviewed headline as h2. */}
            <h1 className="sc-eyebrow sc-simulation-h1">PV-Simulation</h1>
            {simulation}
          </section>
        ) : (
          <>
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" /> Dein Dach. Deine Energie.
          </p>
          <h1 id="hero-title">
            <span className="hero-title-desktop">
              Da oben steckt
              <br />
              mehr für dich drin.
            </span>
            <span className="hero-title-mobile">
              Dein Dach.
              <br />
              Deine Energie.
            </span>
          </h1>
          <p className="hero-description">
            Finde heraus, was die Sonne für dich leisten kann.
            <br className="desktop-break" /> Und wann sich eine Solaranlage für dich rechnet.
          </p>
          <div className="hero-actions sc-btn-stapel">
            <NeonButton href="/photovoltaik-rechner">
              Meine Anlage berechnen <IconArrowRight size={16} />
            </NeonButton>
            <NeonButton href="/pv-simulation" variante="secondary">
              <IconPlay size={14} /> Simulation ansehen
            </NeonButton>
          </div>
          <p className="trust-line">
            <IconCheck size={14} /> Kostenlos <span>·</span> Ohne Anmeldung <span>·</span> Ohne Verkaufsanrufe
          </p>
        </div>

        <div className="hero-bottom">
          <a href="#startseite-rechner">
            <IconArrowDown size={16} />
            <span>Entdecke dein Solarpotenzial</span>
          </a>
          <button
            type="button"
            aria-pressed={pausiert}
            aria-label={pausiert ? "Bewegung fortsetzen" : "Bewegung pausieren"}
            onClick={() => setPausiert((p) => !p)}
          >
            {pausiert ? <IconPlay size={14} /> : <IconPause size={14} />}
            <span>{pausiert ? "Fortsetzen" : "Pause"}</span>
          </button>
        </div>

          </>
        )}

        <aside className="dynamic-reading" aria-label="Wetter an deinem Ort">
          <p>{ort.plz ? `PLZ ${ort.plz}` : ort.name}</p>
          <p>
            {stufe === "laedt" && "Wetter wird geladen …"}
            {stufe === "fehlt" && "Aktuelles Wetter gerade nicht verfügbar — der Himmel zeigt nur die Tageszeit."}
            {stufe === "bereit" && wetter && wetter.beschreibung}
          </p>
          {stufe === "bereit" && wetter?.stand && <small>{wetter.stand}</small>}
          {stufe === "bereit" && wetter?.quelle && <small>{wetter.quelle}</small>}
        </aside>
      </section>
      </div>
      {/* The sections below live in the same page shell as the stage, as in the
          reviewed preview: they inherit its surface and ink from there. */}
      {children && <div className="hs-content">{children}</div>}
    </div>
  );
}
