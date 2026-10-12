"use client";
import { useAboConfirmation } from "../lib/use-abo-confirmation";

import "./gemeinde/section-nav.css";
import { IconShare } from "./Icons";
import ActionButton, { ActionLink } from "./ActionButton";
import { useEffect, useRef, useState } from "react";
import { v } from "../lib/theme";
import { createPortal } from "react-dom";
import { usePageActionLayout } from "./calculator/usePageActionLayout";
import { ModalSticky, useInModal } from "./Modal";

/**
 * Klebende Aktionsleiste am unteren Rand — die ein bis zwei Wege, die eine lange
 * Seite anbietet, bleiben in Reichweite.
 *
 * Sie verschwindet, sobald das Seitenende (der Merker) in Sicht kommt, damit sie
 * nie den Fuß mit den Rechtshinweisen überdeckt, und fährt beim Zurückscrollen
 * wieder ein.
 *
 * ALLGEMEIN GEMACHT AM 26.08.2026, vorher fest für den Wärmepumpen-Ratgeber
 * verdrahtet (zwei feste Beschriftungen, ein fester Sprungpunkt). Als die
 * Förder-Stadtseiten dieselbe Leiste brauchten, war die Versuchung, eine zweite
 * zu bauen — und die hätte sich in Verlauf, Sicherheitszone und Ausblenden am
 * Seitenende sofort unterschieden. Ein Baustein, zwei Aufrufer.
 *
 * Der Aufrufer rendert den Merker selbst: `<div id="sc-cta-sentinel" />` am Ende
 * seines Inhalts.
 */
/** Ab hier gilt es als „der Nutzer liest weiter unten". */
const AB_SCROLL_PX = 260;

export default function StickyCta({
  primaer,
  sekundaer,
  dritte,
  startId,
  share,
  surface = "fade",
}: {
  /** Optional section threshold; existing consumers keep the scroll default. */
  startId?: string;
  surface?: "fade" | "floating";
  /** Public canonical page URL, excluding preview and calculator state. */
  share?: { url: string; title: string };
  primaer: { href: string; label: string };
  /**
   * Zweite Aktion — entfällt, wo es nur einen nächsten Schritt gibt.
   * `ereignis` statt `href`, wo das Ziel kein Ort ist, sondern ein Fenster
   * (der Förder-Check öffnet sich, statt irgendwohin zu springen).
   */
  sekundaer?: {
    href?: string;
    ereignis?: string;
    label: string;
    extern?: boolean;
    /**
     * Zeichen vor der Beschriftung.
     *
     * Als ReactNode statt als Name aus einer Liste: Der Baustein soll nicht
     * wissen müssen, welche Symbole es gibt. Die Klasse für einen Effekt
     * (`.sc-glocke`) reicht der Aufrufer über `klasse` mit.
     */
    icon?: React.ReactNode;
    /** Zusätzliche Klasse am Knopf — für Effekte, die am Aufrufer hängen. */
    klasse?: string;
  };
  /**
   * Dritter Weg — als SYMBOL, nicht als dritter Textknopf.
   *
   * Drei gleichwertige Knöpfe passen nicht: Auf 375 px bleiben je rund 110 px,
   * und darin steht keine Beschriftung mehr, die man lesen kann. Ein Symbol
   * braucht die Breite nicht und nimmt den beiden anderen nichts weg; auf
   * breiten Schirmen tritt die Beschriftung daneben (CSS: .sc-cta-dritte).
   *
   * Deshalb ist `label` hier Pflicht, auch wenn es meist unsichtbar ist: Für
   * eine Vorlesehilfe ist ein Knopf mit nur einem Symbol sonst namenlos.
   */
  dritte?: { ereignis: string; label: string; icon: React.ReactNode; klasse?: string };
}) {
  const [shareStatus, setShareStatus] = useState("");
  const [sharing, setSharing] = useState(false);
  const sharePage = async () => {
    if (!share) return;
    setSharing(true);
    setShareStatus("");
    try {
      if (navigator.share) await navigator.share(share);
      else { await navigator.clipboard.writeText(share.url); setShareStatus("Link kopiert."); }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setShareStatus("Teilen nicht möglich. Bitte die Seitenadresse kopieren.");
    } finally { setSharing(false); }
  };
  const aboConfirmed = useAboConfirmation();
  const [hidden, setHidden] = useState(false);
  const [gescrollt, setGescrollt] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const layout = usePageActionLayout(ref);
  const inModal = useInModal();

  useEffect(() => {
    // ZWEI Halte-Marken, und die zweite ist die verlässliche.
    //
    // Der Merker, den der Aufrufer selbst rendert, steht dort, wo die Seite
    // inhaltlich endet — gibt es ihn nicht oder sitzt er zu früh, läuft die
    // Leiste bis zuletzt mit und liegt auf dem dunklen Fuß. Der Vertrauensblock
    // ist dagegen auf JEDER Seite der Anfang des dunklen Bereichs; sobald er
    // ins Bild kommt, gehört die Leiste weg. Zusammen: Sie verschwindet beim
    // Ersten von beidem.
    const marken = [document.getElementById("sc-cta-sentinel"), document.querySelector(".sc-trust")].filter(
      (n): n is Element => n != null,
    );
    if (!marken.length) return;
    const sichtbare = new Set<Element>();
    const io = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          if (e.isIntersecting) sichtbare.add(e.target);
          else sichtbare.delete(e.target);
        }
        setHidden(sichtbare.size > 0);
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    marken.forEach((m) => io.observe(m));
    return () => io.disconnect();
  }, []);

  // ERST BEIM SCROLLEN (26.08.2026). Vorher stand die Leiste vom ersten Moment
  // an da — und damit doppelt: Der primäre Knopf steht oben in Sichtweite, die
  // Leiste bot denselben Weg zwei Zentimeter tiefer noch einmal an. Ein zweiter
  // identischer Knopf neben dem ersten ist Lärm; sinnvoll wird er erst, wenn der
  // erste weggescrollt ist.
  useEffect(() => {
    const pruefe = () => {
      const start = startId ? document.getElementById(startId) : null;
      setGescrollt(startId ? !!start && start.getBoundingClientRect().top <= 24 : window.scrollY > AB_SCROLL_PX);
    };
    pruefe();
    window.addEventListener("scroll", pruefe, { passive: true });
    window.addEventListener("resize", pruefe);
    return () => {
      window.removeEventListener("scroll", pruefe);
      window.removeEventListener("resize", pruefe);
    };
  }, [startId]);

  const sichtbar = gescrollt && !hidden;

  const base: React.CSSProperties = { flex: 1, minWidth: share ? 120 : 0, whiteSpace: "normal", textAlign: "center" };

  const bar = (
    <div
      className={layout?.className}
      aria-hidden={!sichtbar}
      inert={!sichtbar}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        // Nach oben ausblendender Hintergrund statt harter Kante — der Inhalt
        // scrollt weich darunter durch. Der deckende Teil reicht bis knapp über
        // die Knöpfe, darüber löst er sich auf; `color-mix` hält ihn
        // theme-fähig, also auch auf den dunklen Tagesstufen richtig.
        background: `linear-gradient(to top, color-mix(in srgb, ${v("--color-bg")} 90%, transparent) 0%, color-mix(in srgb, ${v("--color-bg")} 90%, transparent) 55%, color-mix(in srgb, ${v("--color-bg")} 50%, transparent) 78%, transparent 100%)`,
        // KEIN backdrop-filter (26.08.2026). Er wirkt auf die GANZE Box, also
        // auch dort, wo der Verlauf längst durchsichtig ist — der Text darüber
        // wurde unscharf, und genau das sah aus wie ein Hintergrund, der nicht
        // ausblendet. Der Verlauf allein reicht, wenn er lang genug ist:
        // 64 px Auslauf über den Knöpfen statt 24.
        padding: "64px 12px calc(12px + env(safe-area-inset-bottom))",
        ...layout?.style,
        ...(layout?.style.width ? { paddingInline: 0 } : {}),
        ...(surface === "floating" ? { background:"transparent", padding:"0 0 env(safe-area-inset-bottom)", bottom:12 } : {}),
        transform: sichtbar ? "none" : "translateY(130%)",
        transition: "transform 0.28s ease",
        pointerEvents: sichtbar ? "auto" : "none",
        ...(inModal ? { position: "static", left: "auto", right: "auto", transform: "none", padding: 0 } : {}),
      }}
    >
      <div className={surface === "floating" ? "sc-floating-actions" : undefined} style={{ maxWidth: layout?.style.width ? "none" : 640, margin: "0 auto", display: "flex", gap: 8, flexWrap: share ? "wrap" : undefined, justifyContent: "center" }}>
        <ActionLink href={primaer.href} style={base}>{primaer.label}</ActionLink>
        {sekundaer && (sekundaer.ereignis
          ? <ActionButton className={sekundaer.klasse} style={{...base, flex:share ? 1.2 : 1}} onClick={() => window.dispatchEvent(new Event(sekundaer.ereignis!))}>{sekundaer.icon}{sekundaer.label}</ActionButton>
          : <ActionLink variant="secondary" href={sekundaer.href} style={base} {...(sekundaer.extern ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{sekundaer.label}</ActionLink>)}
        {(dritte || share) && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {dritte && !aboConfirmed && <ActionButton iconOnly className={dritte.klasse} title={dritte.label} aria-label={dritte.label} onClick={() => window.dispatchEvent(new Event(dritte.ereignis))}>{dritte.icon}</ActionButton>}
        {share && <ActionButton iconOnly title="Seite teilen" aria-label="Seite teilen" disabled={sharing} onClick={sharePage}><IconShare /></ActionButton>}
        </div>}

      </div>
      {shareStatus && <p role="status" style={{ textAlign: "center", margin: "8px 0 0", fontSize: "var(--font-size-small)" }}>{shareStatus}</p>}
    </div>
  );
  return <><div ref={ref} hidden />{inModal ? (sichtbar ? <ModalSticky>{bar}</ModalSticky> : null) : layout && createPortal(bar, document.body)}</>;
}
