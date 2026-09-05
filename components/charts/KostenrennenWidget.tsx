"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import InfoTooltip from "../InfoTooltip";
import {
  ExportBox,
  ExportNotesProvider,
  ExportOnly,
  WidgetFooter,
  WidgetSourceEdge,
  WidgetExportFooter,
  type ExportLegendEntry,
} from "../WidgetExport";
import { IconPause, IconPlay, IconRefresh } from "../Icons";
import { useChartExport } from "../../lib/useChartExport";
import { EXPORT_IGNORE_ATTR } from "../../lib/export-markers";
import { WIDGETS } from "../../lib/widget-registry";
import { v, space } from "../../lib/theme";
import { fmtEuroVoll, formatDataAsOf } from "../../lib/atlas-format";
import { PERSONEN } from "../../lib/constants";
import type { Kostenrennen } from "../../lib/kostenrennen";

// Das Stromkosten-Rennen: ein Balken je Haushalt, die Jahre laufen durch, die
// Balken wachsen und sortieren sich um. Wer oben steht, hat bis dahin am
// meisten für Strom ausgegeben. Der PV-Haushalt startet mit der Anschaffung
// vorn und wird irgendwann überholt — dieses Überholjahr IST die Amortisation
// des Rechners (lib/kostenrennen.ts rechnet mit denselben Funktionen).
//
// Selbst-enthaltende Karte nach dem Muster von GruengasWidget: dasselbe Bauteil
// steht unter /embed/pv-kostenrennen und direkt gerendert im Ratgeber (onsite).
// Alles Interaktive (Abspielen, Schieberegler) trägt data-sc-export-ignore; das
// Bild zeigt den gerade eingestellten Stand als Text.

const SCHRITT_MS = 380;
const REIHE_H = 62;
const BALKEN_H = 22;

// Farbfolge der Läufer: Referenz (ohne Anlage) neutral, Anlagen im Akzent.
// Semantisch, nicht themebar: dieselbe Zuordnung in jedem Farbschema.
const FARBEN = ["var(--color-text-primary)", "var(--color-accent)", "var(--color-accent-light)", "var(--color-positive)"];

interface Props {
  rennen: Kostenrennen;
  onsite?: boolean;
  branding?: boolean;
  showEmbed?: boolean;
  /** Läuft von selbst los, sobald die Karte im Bild ist (nicht bei reduzierter Bewegung). */
  autoplay?: boolean;
  /** Stichtag der Preise (ISO), für die Quellen-Kante. */
  preiseStandIso?: string;
}

export default function KostenrennenWidget(props: Props) {
  return (
    <ExportNotesProvider>
      <KostenrennenCard {...props} />
    </ExportNotesProvider>
  );
}

function KostenrennenCard({ rennen, onsite = false, branding = true, showEmbed = false, autoplay = true, preiseStandIso }: Props) {
  const [idx, setIdx] = useState(0);
  const [spielt, setSpielt] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [ruhig, setRuhig] = useState(false);
  const gestartet = useRef(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width:560px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onRm = () => setRuhig(rm.matches);
    onRm();
    rm.addEventListener("change", onRm);
    return () => { mq.removeEventListener("change", on); rm.removeEventListener("change", onRm); };
  }, []);

  // Von selbst loslaufen, wenn die Karte zum ersten Mal sichtbar wird — einmal.
  // Bei reduzierter Bewegung bleibt sie stehen; die Jahre wählt man dann selbst.
  useEffect(() => {
    if (!autoplay || ruhig || gestartet.current || !hostRef.current) return;
    const el = hostRef.current;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !gestartet.current) {
        gestartet.current = true;
        setSpielt(true);
        io.disconnect();
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [autoplay, ruhig]);

  useEffect(() => {
    if (!spielt) return;
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= rennen.jahre) { setSpielt(false); return i; }
        return i + 1;
      });
    }, SCHRITT_MS);
    return () => clearInterval(t);
  }, [spielt, rennen.jahre]);

  const jahr = rennen.startJahr + idx;
  const referenz = rennen.laeufer.find((l) => l.key === rennen.referenzKey)!;
  const farbe = (key: string) => FARBEN[rennen.laeufer.findIndex((l) => l.key === key) % FARBEN.length];

  // Rang je Läufer zum aktuellen Jahr: größter Betrag oben.
  const sortiert = useMemo(
    () => [...rennen.laeufer].sort((a, b) => b.kumuliert[idx] - a.kumuliert[idx]),
    [rennen.laeufer, idx],
  );
  const rang = new Map(sortiert.map((l, i) => [l.key, i]));
  // Skala folgt dem Spitzenreiter — so bleibt der längste Balken immer voll,
  // die anderen zeigen ihr Verhältnis dazu.
  const maxWert = Math.max(1, ...rennen.laeufer.map((l) => l.kumuliert[idx]));

  const { chartRef, downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare } =
    useChartExport({
      context: { title: `${WIDGETS.kostenrennen.title} — nach ${idx} Jahren` },
      filename: "stromkosten-rennen-pv",
      shareText: WIDGETS.kostenrennen.shareText,
      shareUrl: WIDGETS.kostenrennen.shareUrl,
      mode: "node",
    });

  const uebergang = ruhig ? "none" : `width ${SCHRITT_MS}ms linear, transform ${SCHRITT_MS}ms ease`;

  // Der Satz unter dem Rennen: Stand des PV-Haushalts gegen die Referenz.
  const pvLaeufer = rennen.laeufer.filter((l) => l.hatPv);
  const status = (() => {
    if (pvLaeufer.length !== 1) return null;
    const pv = pvLaeufer[0];
    const diff = pv.kumuliert[idx] - referenz.kumuliert[idx];
    const ueberholt = rennen.ueberholJahr[pv.key];
    if (idx === 0) return `Start: Der PV-Haushalt hat ${fmtEuroVoll(pv.investition)} für die Anlage ausgegeben, der andere noch nichts.`;
    if (ueberholt !== null && idx >= ueberholt) {
      return idx === ueberholt
        ? `Jahr ${idx}: Die Anlage hat sich bezahlt gemacht — ab jetzt liegt der PV-Haushalt vorn.`
        : `Der PV-Haushalt hat bis hier ${fmtEuroVoll(-diff)} weniger für Strom ausgegeben.`;
    }
    return `Der PV-Haushalt liegt noch ${fmtEuroVoll(diff)} hinten — die Anschaffung ist noch nicht zurück.`;
  })();

  const haushalt = PERSONEN[2];
  const lblStyle: React.CSSProperties = { fontSize: v("--font-size-caption"), fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: v("--color-text-muted") };
  const knopf: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 32, minWidth: 32, padding: `0 ${space.lg}px`, borderRadius: v("--radius-md"),
    border: `1px solid ${v("--color-border")}`, background: v("--color-bg"), color: v("--color-text-primary"),
    fontSize: v("--font-size-small"), fontWeight: 700, cursor: "pointer",
  };

  const legend: ExportLegendEntry[] = rennen.laeufer.map((l) => ({ color: farbe(l.key), label: l.label, shape: "box" }));

  return (
    <div
      ref={(el) => { (chartRef as React.RefObject<HTMLDivElement | null> as { current: HTMLDivElement | null }).current = el; hostRef.current = el; }}
      onMouseEnter={() => setShowCredit(true)}
      onMouseLeave={() => setShowCredit(false)}
      onFocusCapture={() => setShowCredit(true)}
      style={{
        position: "relative",
        background: v("--color-bg"),
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-lg"),
        padding: `${space.xl}px ${space.xxl}px ${space.lg}px ${space.xl}px`,
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: v("--font-size-body"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: space.xxs }}>
        {WIDGETS.kostenrennen.title}
      </div>
      <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.5, marginBottom: space.lg }}>
        Zwei gleiche Haushalte, {rennen.jahre} Jahre: Wer hat am Ende mehr für Strom bezahlt?{" "}
        <span style={{ verticalAlign: "middle" }}>
          <InfoTooltip title="Der Beispielhaushalt" ariaLabel="Angaben zum Beispielhaushalt">
            {haushalt.label} Personen mit {haushalt.verbrauch.toLocaleString("de-DE")} kWh Jahresverbrauch, teils im Homeoffice.
            Die Anlage: {pvLaeufer.map((l) => `${l.kwp} kWp${l.speicherKwh > 0 ? ` mit ${l.speicherKwh} kWh Speicher` : " ohne Speicher"}`).join(", ")},
            Ertrag {rennen.annahmen.ertragKwp.toLocaleString("de-DE")} kWh je kWp (deutscher Schnitt bei optimaler Ausrichtung), Teileinspeisung zu{" "}
            {rennen.annahmen.einspeisungCt.toLocaleString("de-DE")} ct/kWh über 20 Jahre. Strompreis {rennen.annahmen.strompreisCt.toLocaleString("de-DE")} ct/kWh,
            Anstieg {rennen.annahmen.steigerungPct.toLocaleString("de-DE")} % pro Jahr — Näherungswerte ohne Gewähr.
          </InfoTooltip>
        </span>
      </div>

      {/* Jahr + Zustand */}
      <div style={{ display: "flex", alignItems: "baseline", gap: space.md, marginBottom: space.md }}>
        <span style={{ fontFamily: v("--font-mono"), fontSize: v("--font-size-display-md"), fontWeight: 800, color: v("--color-text-primary"), lineHeight: 1 }}>{jahr}</span>
        <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
          {idx === 0 ? "Start" : idx === 1 ? "nach 1 Jahr" : `nach ${idx} Jahren`}
        </span>
      </div>

      <ExportBox>
        <div style={{ display: "flex", alignItems: "center", gap: space.xs, marginBottom: space.sm }}>
          <span style={lblStyle}>Stromkosten seit {rennen.startJahr}</span>
          <InfoTooltip title="Was hier zählt" ariaLabel="Was als Stromkosten zählt">
            Alles, was der Haushalt für Strom ausgegeben hat: die Stromrechnung mit steigendem Preis, beim PV-Haushalt dazu die
            Anschaffung der Anlage, abzüglich der Einspeisevergütung. Wer oben steht, hat bis zu diesem Jahr am meisten bezahlt.
          </InfoTooltip>
        </div>

        <div style={{ position: "relative", height: rennen.laeufer.length * REIHE_H }} role="list" aria-label={`Stromkosten je Haushalt, ${jahr}`}>
          {rennen.laeufer.map((l) => {
            const wert = l.kumuliert[idx];
            const r = rang.get(l.key) ?? 0;
            const ueberholt = rennen.ueberholJahr[l.key];
            const bezahlt = l.hatPv && ueberholt !== null && idx >= ueberholt;
            return (
              <div
                key={l.key}
                role="listitem"
                style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${r * REIHE_H}px)`, transition: uebergang }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: space.md, marginBottom: space.xs }}>
                  <span style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-primary"), display: "inline-flex", alignItems: "center", gap: space.sm, whiteSpace: "nowrap" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: farbe(l.key), flexShrink: 0 }} />
                    {narrow ? l.kurz : l.label}
                    {bezahlt && (
                      <span style={{ fontSize: v("--font-size-caption"), fontWeight: 700, color: v("--color-positive-text"), border: `1px solid ${v("--color-positive")}`, borderRadius: 6, padding: `0 ${space.sm}px`, background: `color-mix(in srgb, ${v("--color-positive")} 12%, transparent)` }}>
                        Anlage bezahlt
                      </span>
                    )}
                  </span>
                  <span style={{ fontFamily: v("--font-mono"), fontWeight: 800, fontSize: v("--font-size-body"), color: v("--color-text-primary"), whiteSpace: "nowrap" }}>
                    {fmtEuroVoll(wert)}
                  </span>
                </div>
                <div style={{ height: BALKEN_H, background: `color-mix(in srgb, ${v("--color-text-muted")} 12%, transparent)`, borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(0.5, (wert / maxWert) * 100)}%`, height: "100%", background: farbe(l.key), borderRadius: 6, transition: uebergang }} />
                </div>
              </div>
            );
          })}
        </div>

        {status && (
          <div style={{ marginTop: space.lg, fontSize: v("--font-size-small"), color: v("--color-text-secondary"), lineHeight: 1.5, minHeight: 36 }}>
            {status}
          </div>
        )}
      </ExportBox>

      {/* Steuerung — nur auf der Seite, nie im Bild */}
      <div {...{ [EXPORT_IGNORE_ATTR]: "" }} style={{ display: "flex", alignItems: "center", gap: space.lg, marginTop: space.lg }}>
        <button
          type="button"
          onClick={() => {
            if (spielt) { setSpielt(false); return; }
            if (idx >= rennen.jahre) setIdx(0);
            gestartet.current = true;
            setSpielt(true);
          }}
          aria-label={spielt ? "Anhalten" : idx >= rennen.jahre ? "Noch einmal abspielen" : "Abspielen"}
          style={{ ...knopf, background: v("--color-accent"), color: v("--color-text-on-accent"), border: "none" }}
        >
          {spielt ? <IconPause size={14} /> : idx >= rennen.jahre ? <IconRefresh size={14} /> : <IconPlay size={14} />}
          <span>{spielt ? "Pause" : idx >= rennen.jahre ? "Noch einmal" : idx === 0 ? "Rennen starten" : "Weiter"}</span>
        </button>
        <input
          type="range"
          min={0}
          max={rennen.jahre}
          step={1}
          value={idx}
          onChange={(e) => { setSpielt(false); gestartet.current = true; setIdx(Number(e.target.value)); }}
          aria-label="Jahr wählen"
          aria-valuetext={`${jahr}, nach ${idx} Jahren`}
          style={{ flex: 1, accentColor: v("--color-accent"), minWidth: 0 }}
        />
      </div>

      {/* Im Bild: der eingestellte Stand steht schon im Kopf (Jahr + „nach n
          Jahren"); hier nur der Hinweis, dass das Bild einen Zwischenstand zeigt. */}
      {idx < rennen.jahre && (
        <ExportOnly style={{ marginTop: space.md }}>
          <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
            Zwischenstand nach {idx} von {rennen.jahre} Jahren
          </span>
        </ExportOnly>
      )}

      <WidgetFooter
        widget={WIDGETS.kostenrennen}
        chartExport={{ downloadPng, sharePng, shareWhatsApp, shareTwitter, isExporting, canNativeShare }}
        onsite={onsite}
        branding={branding}
        showEmbed={showEmbed}
        narrow={narrow}
      />

      <WidgetSourceEdge
        widget={WIDGETS.kostenrennen}
        visible={!onsite || showCredit}
        stand={preiseStandIso ? formatDataAsOf(preiseStandIso) : undefined}
      />

      <WidgetExportFooter
        widget={WIDGETS.kostenrennen}
        legend={legend}
        note="Beispielhaushalt, Modellrechnung von solar-check.io · Näherungswerte, ohne Gewähr"
      />
    </div>
  );
}
