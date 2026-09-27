"use client";

import { useMemo, useState } from "react";
import {
  WidgetFooter,
  WidgetSourceEdge,
  useShareOnlyActions,
} from "../../../../components/WidgetExport";
import { WIDGETS } from "../../../../lib/widget-registry";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import {
  WIDGET_SETTINGS_DEFAULTS,
  type WidgetSettings,
} from "../../../../lib/widget-settings";
import { calcBegSubsidy, calcInvestBrutto } from "../../../../lib/heatpump";
import { begStufeAm } from "../../../../lib/heatpump-config";
import { BegFundingQuestions } from "../../../../components/BegFundingQuestions";
import { begIncomeFor } from "../../../../lib/beg-funding-options";
import { BEG_ANTRAG_KURZ, BEG_ANTRAG_STAND } from "../../../../lib/beg-antrag";

// Das Gültigkeitsdatum des Merkblatts stand hier bis zum 26.08.2026 handgetippt
// — in derselben Datei, die den Hinweistext schon aus dem Modul holt. Beim
// nächsten Merkblatt wäre genau diese eine Zahl stehengeblieben, still.
const GUELTIG_AB = BEG_ANTRAG_STAND.validFrom.split("-").reverse().join(".");

// Förder-Check: a slim, embeddable calculator that answers one question —
// "wie viel BEG-Förderung bekomme ich für eine Wärmepumpe?". A short guided
// flow asks only what actually moves the Fördersatz (Gebäude, alte Heizung,
// Selbstnutzung, Einkommen, Kind), then shows Fördersumme + Aufschlüsselung
// with an editable Investitions-Slider and a CTA into the full
// Wärmepumpen-Rechner. No fetch, no browser storage: it runs entirely on the
// shared BEG engine (calcBegSubsidy) + the geprüfte Config, so it never drifts
// from the calculator. Bracket labels + cap are derived from the config staffel
// so a future BEG change updates the widget automatically.

// Grundsatz, Klimabonus und Höchstbetrag ändern sich zu festen Stichtagen der
// Förderrichtlinie. Die RECHNUNG zieht sie sich ohnehin selbst (calcBegSubsidy
// löst ohne Angabe den heutigen Stand auf); die angezeigten Zahlen daneben
// müssen aus derselben Stufe kommen, sonst erklärt der Text ab dem ersten
// Stichtag eine andere Förderung, als das Widget darunter ausrechnet.
const stufeHeute = begStufeAm(new Date());
// Identität (Titel, Teilen-Ziel, Quelle, nächster Schritt) kommt aus dem
// Register — ein Eintrag speist Fußzeile, Quellen-Kante und Zitat.
const WIDGET = WIDGETS.foerderCheck;
const CTA_URL = WIDGET.cta!.href;

const nf = (n: number) => n.toLocaleString("de-DE");


// Regler-Spanne + Startwert an echten Angeboten (Verbraucherzentrale RLP,
// Auswertung von 160 Luft-Wasser-Angeboten: 20.228–63.061 €, Median 34.979 €).
// Startwert = die Rechner-Investition für die Median-Leistung 10 kW, damit
// Widget und Wärmepumpen-Rechner nicht auseinanderlaufen.
const INVEST_MIN = 15000;
const INVEST_MAX = 60000;

// ── Flow-Screens ──
// Reihenfolge fragt nur ab, was den Fördersatz wirklich bewegt. Neubau kürzt
// direkt ins Ergebnis ab (keine BEG-WP-Förderung), Vermieter überspringt die
// Einkommensfrage (Einkommens-Bonus gibt es nur für selbstnutzende Eigentümer).
type Screen = import("../../../../components/BegFundingQuestions").BegFundingScreen;

export default function FoerderCheckWidget() {
  // First-party embed (onsite=1): our own page carries CTAs' context, source and
  // impressum — so we drop "Powered by" + the in-widget source note (the page
  // footer credits it). See widget convention.
  const [settings, setSettings] = useState<WidgetSettings>(WIDGET_SETTINGS_DEFAULTS);
  useWidgetTheme({
    onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
  });

  // Kein Bild-Export: ein Frage-Ablauf ist kein Chart (`exportable: false` im
  // Register). Teilen-Text und -Ziel kommen trotzdem aus dem Register.
  const actions = useShareOnlyActions(WIDGET);

  // Flow-State
  const [screen, setScreen] = useState<Screen>("gebaeude");
  const [history, setHistory] = useState<Screen[]>([]);

  // Antworten
  const [neubau, setNeubau] = useState(false);
  // fossil = bekommt Klima-Geschwindigkeits-Bonus (funktionierende fossile Heizung raus).
  // alterUnbekannt = bei einer Gas-/Holzheizung wurde "weiß nicht" gewählt → wir rechnen
  // optimistisch mit Bonus, weisen im Ergebnis aber auf die 20-Jahre-Bedingung hin.
  const [fossil, setFossil] = useState(true);
  const [alterUnbekannt, setAlterUnbekannt] = useState(false);
  const [selbstnutzer, setSelbstnutzer] = useState(true);
  const [einkommen, setEinkommen] = useState("none");
  const [kind, setKind] = useState(false);
  const [invest, setInvest] = useState(calcInvestBrutto("lwwp", 10, false));

  const go = (next: Screen) => {
    setHistory((h) => [...h, screen]);
    setScreen(next);
  };
  const back = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setScreen(prev);
      return h.slice(0, -1);
    });
  };
  const reset = () => {
    setNeubau(false);
    setFossil(true);
    setAlterUnbekannt(false);
    setSelbstnutzer(true);
    setEinkommen("none");
    setKind(false);
    setHistory([]);
    setScreen("gebaeude");
  };

  // Klima-Geschwindigkeits-Bonus UND Einkommens-Bonus setzen beide voraus, dass
  // man selbst im Gebäude wohnt (KfW Merkblatt 458). Vermieter bekommen daher nur
  // die Grundförderung — deshalb reichen wir für sie weder Klima- noch Einkommen durch.
  const beg = useMemo(
    () =>
      calcBegSubsidy(neubau ? "neubau" : "bestand", "lwwp", invest, {
        klimaBonus: selbstnutzer && fossil,
        haushaltseinkommen: selbstnutzer ? begIncomeFor(einkommen) : undefined,
        kindImHaushalt: selbstnutzer && kind,
      }),
    [neubau, invest, fossil, selbstnutzer, einkommen, kind],
  );

  const capped = invest > stufeHeute.maxCap;

  return (
    <div
      style={{
        position: "relative",
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: 16,
        paddingRight: 22,
        boxSizing: "border-box",
        maxWidth: 380,
        margin: "0 auto",
      }}
    >
      {/* Quelle vertikal an der rechten Kante (geteilter Baustein), nie als
          horizontaler Block. Auf einer eigenen Seite kreditiert die Seite. */}
      <WidgetSourceEdge widget={WIDGET} visible={!settings.onsite} />
      {/* ── Kopf: Titel als Überschrift + Trennlinie darunter ── */}
      <div style={{ fontSize: "var(--font-size-lead)", fontWeight: 800, letterSpacing: 0.1, lineHeight: 1.2 }}>
        Wärmepumpen-Förderung berechnen
      </div>
      <div style={{ fontSize: "var(--font-size-caption)", color: "var(--widget-muted)", marginTop: 3 }}>
        {screen === "result"
          ? "Dein geschätzter BEG-Zuschuss der KfW."
          : "In wenigen Fragen zum BEG-Zuschuss der KfW."}
      </div>
      <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2, margin: "12px 0 14px" }} />

      {screen === "result" ? (
        <ResultView
          neubau={neubau}
          selbstnutzer={selbstnutzer}
          beg={beg}
          invest={invest}
          setInvest={setInvest}
          capped={capped}
          alterUnbekannt={alterUnbekannt && fossil && selbstnutzer}
          onReset={reset}
        />
      ) : (
        <BegFundingQuestions
          stufe={stufeHeute}
          // Wechselnder key = die Fade-Up-Animation spielt bei JEDEM Schritt neu ab.
          // Ohne ihn behält React dasselbe DOM-Element und die Animation liefe nur
          // beim allerersten Rendern (Konvention siehe lib/theme.ts, sc-swap).
          key={screen}
          screen={screen}
          go={go}
          setNeubau={setNeubau}
          setFossil={setFossil}
          setAlterUnbekannt={setAlterUnbekannt}
          setSelbstnutzer={setSelbstnutzer}
          setEinkommen={setEinkommen}
          setKind={setKind}
        />
      )}

      {/* ── Footer: Zurück (unten) + geteilte Fußzeile ── */}
      <div style={{ marginTop: 14 }}>
        {history.length > 0 && (
          <button
            onClick={back}
            aria-label="Zurück"
            style={{
              border: "none",
              background: "none",
              padding: 0,
              marginBottom: 12,
              cursor: "pointer",
              color: "var(--widget-muted)",
              fontSize: "var(--font-size-small)",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            ← Zurück
          </button>
        )}
        <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2 }} />
        {/* Fußzeile aus dem geteilten Baustein: Aktionen (inkl. „Zitieren")
            und Marke. Der nächste Schritt steht hier bewusst NICHT als Knopf:
            das Ergebnis trägt ihn schon, größer und mit dem konkreten Versprechen
            („Komplett durchrechnen") — ein zweiter, kleinerer Knopf mit demselben
            Ziel wenige Zeilen darunter ist Lärm, kein Schritt. */}
        <WidgetFooter
          widget={WIDGET}
          chartExport={actions}
          share={settings.share}
          branding={settings.branding}
          showEmbed={settings.embed}
          onsite={settings.onsite}
          showCta={false}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow: eine Frage pro Screen, Klick wählt und geht weiter.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Ergebnis
// ─────────────────────────────────────────────────────────────────────────────
function ResultView({
  neubau,
  selbstnutzer,
  beg,
  invest,
  setInvest,
  capped,
  alterUnbekannt,
  onReset,
}: {
  neubau: boolean;
  selbstnutzer: boolean;
  beg: ReturnType<typeof calcBegSubsidy>;
  invest: number;
  setInvest: (n: number) => void;
  capped: boolean;
  alterUnbekannt: boolean;
  onReset: () => void;
}) {
  return (
    <div style={{ animation: "fu 0.3s ease-out" }}>
      {neubau ? (
        <div
          style={{
            background: "var(--color-bg-muted)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: "var(--font-size-small)", fontWeight: 700, marginBottom: 4 }}>Für den Neubau kein BEG-Zuschuss</div>
          <div style={{ fontSize: "var(--font-size-caption)", color: "var(--widget-muted)", lineHeight: 1.5 }}>
            Die BEG-Einzelmaßnahmen-Förderung (Zuschuss) gilt nur für den Heizungstausch im Bestand. Im Neubau läuft die
            Förderung über zinsgünstige KfW-Kredite (Programm „Klimafreundlicher Neubau"), nicht über einen Zuschuss.
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              background: "var(--color-bg-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "14px 16px",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: "var(--font-size-caption)", color: "var(--widget-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
              Deine Förderung
            </div>
            <div
              style={{
                fontSize: "var(--font-size-display-md)",
                fontWeight: 800,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                color: "var(--widget-accent)",
                margin: "2px 0 4px",
              }}
            >
              {nf(beg.amount)} €
            </div>
            <div style={{ fontSize: "var(--font-size-caption)", color: "var(--widget-muted)" }}>
              {Math.round(beg.rate * 100)} % {capped ? "von max. " : "der "}
              {capped ? `${nf(stufeHeute.maxCap)} € förderfähigen Kosten` : "Investition"}
            </div>
            {/* Bonus-Aufschlüsselung */}
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
              {beg.breakdown.map((b) => (
                <div
                  key={b.label}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-caption)", color: "var(--widget-fg)" }}
                >
                  <span>{b.label}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--widget-muted)" }}>
                    +{Math.round(b.rate * 100)} %
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Die Bedingung, unter der es den Betrag darüber überhaupt gibt.
              Wortlaut aus lib/beg-antrag.ts — derselbe Satz steht im
              Wärmepumpen-Rechner; hier bewusst OHNE Link: Das Widget hängt
              onsite unter genau dem Ratgeber, der die Langfassung trägt, und
              extern führt der CTA am Fuß ohnehin dorthin. */}
          <div
            style={{
              fontSize: "var(--font-size-caption)",
              color: "var(--widget-fg)",
              lineHeight: 1.5,
              marginBottom: 12,
              padding: "9px 11px",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-bg-muted)",
              borderLeft: "3px solid var(--color-negative)",
            }}
          >
            {BEG_ANTRAG_KURZ}
          </div>

          {alterUnbekannt && (
            <div
              style={{
                fontSize: "var(--font-size-caption)",
                color: "var(--widget-fg)",
                lineHeight: 1.5,
                marginBottom: 12,
                padding: "9px 11px",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-bg-muted)",
                borderLeft: "3px solid var(--widget-accent)",
              }}
            >
              Enthält den Klima-Bonus (+{Math.round(stufeHeute.klimaBonus * 100)} %). Der gilt nur, wenn deine Gas-,
              Holz- oder Pelletheizung <strong>mindestens 20 Jahre</strong> alt ist. Prüfe das Baujahr auf dem
              Typenschild am Kessel – ist sie jünger, fällt dieser Anteil weg.
            </div>
          )}

          {!selbstnutzer && (
            <div style={{ fontSize: "var(--font-size-caption)", color: "var(--widget-muted)", lineHeight: 1.5, marginBottom: 12 }}>
              Als Vermieter bleibt es bei der Grundförderung: Klima- und Einkommens-Bonus setzen beide voraus,
              dass du selbst im Gebäude wohnst.
            </div>
          )}

          {/* Investitions-Slider */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-small)", marginBottom: 4 }}>
              <span style={{ color: "var(--widget-muted)" }}>Investition Wärmepumpe</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{nf(invest)} €</span>
            </div>
            <input
              type="range"
              min={INVEST_MIN}
              max={INVEST_MAX}
              step={500}
              value={invest}
              onChange={(e) => setInvest(Number(e.target.value))}
              aria-label="Investitionskosten der Wärmepumpe"
              style={{ width: "100%", accentColor: "var(--widget-accent)", cursor: "pointer" }}
            />
            {/* Herkunft des Betrags offenlegen: der Slider ist eine Eingabe, keine
                Schätzung — die echte Kostenermittlung passiert im vollen Rechner. */}
            <details style={{ marginTop: 6 }}>
              <summary
                style={{
                  fontSize: "var(--font-size-caption)",
                  color: "var(--widget-accent)",
                  cursor: "pointer",
                  listStyle: "none",
                  fontWeight: 600,
                }}
              >
                Woher kommt dieser Betrag?
              </summary>
              <div style={{ fontSize: "var(--font-size-caption)", color: "var(--widget-muted)", lineHeight: 1.5, marginTop: 6 }}>
                Der Startwert ist eine typische Komplettinvestition aus Gerät und Einbau für ein
                Einfamilienhaus mit 10 Kilowatt Heizleistung. Er ist an einer Auswertung von 160 echten
                Angeboten durch die Verbraucherzentrale Rheinland-Pfalz kalibriert (Bruttopreise, Median
                rund 35.000 Euro, Spanne 20.000 bis 63.000 Euro). Dein tatsächlicher Preis hängt von
                Heizlast, Gebäude und Angebot ab – schieb den Regler einfach auf dein Angebot.{" "}
                <a
                  href={CTA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--widget-accent)", fontWeight: 600 }}
                >
                  Im Wärmepumpen-Rechner genauer berechnen
                </a>
                .
              </div>
            </details>
          </div>
        </>
      )}

      {/* CTA */}
      <a
        href={CTA_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textAlign: "center",
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: "var(--radius-md)",
          background: "var(--widget-accent)",
          color: "var(--widget-accent-fg)",
          fontSize: "var(--font-size-small)",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Komplett durchrechnen (Ersparnis &amp; Amortisation) →
      </a>

      <button
        onClick={onReset}
        style={{
          display: "block",
          width: "100%",
          marginTop: 8,
          padding: "8px 14px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          background: "none",
          color: "var(--widget-muted)",
          fontSize: "var(--font-size-small)",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Neu berechnen
      </button>

      <div style={{ fontSize: "var(--font-size-micro)", color: "var(--widget-muted)", lineHeight: 1.5, marginTop: 10 }}>
        Bezogen auf eine Wohneinheit — bei Mehrfamilienhäusern gelten je weiterer Wohnung eigene Höchstbeträge.
        Schätzung nach den aktuellen KfW-Sätzen (gültig ab {GUELTIG_AB}) — ohne Gewähr, verbindlich ist die
        Zusage der KfW. Boni hängen von deiner individuellen Situation ab.
      </div>
    </div>
  );
}
