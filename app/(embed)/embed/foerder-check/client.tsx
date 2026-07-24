"use client";

import { useMemo, useState } from "react";
import ChartActionBar from "../../../../components/ChartActionBar";
import { PoweredBy, DataSourceNote } from "../../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../../lib/data-sources";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { calcBegSubsidy } from "../../../../lib/heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../../../../lib/heatpump-config";

// Förder-Check: a slim, embeddable calculator that answers one question —
// "wie viel BEG-Förderung bekomme ich für eine Wärmepumpe?". A short guided
// flow asks only what actually moves the Fördersatz (Gebäude, alte Heizung,
// Selbstnutzung, Einkommen, Kind), then shows Fördersumme + Aufschlüsselung
// with an editable Investitions-Slider and a CTA into the full
// Wärmepumpen-Rechner. No fetch, no browser storage: it runs entirely on the
// shared BEG engine (calcBegSubsidy) + the geprüfte Config, so it never drifts
// from the calculator. Bracket labels + cap are derived from the config staffel
// so a future BEG change updates the widget automatically.

const cfg = DEFAULT_HEATPUMP_CONFIG;
const CTA_URL = "/waermepumpe-rechner";
const SHARE_URL = "https://solar-check.io/waermepumpe-rechner";
const SHARE_TEXT = "Wärmepumpen-Förderung berechnen – Solar Check";

const nf = (n: number) => n.toLocaleString("de-DE");

// Income options built FROM the config staffel (no hardcoded duplicate).
// Representative income per tier = the tier's upper bound; the engine derives
// the tier + Familienzuschlag from it.
const STAFFEL = cfg.begEinkommensStaffel;
const EINKOMMEN_OPTIONS: { key: string; label: string; sub: string; income?: number }[] = [
  ...STAFFEL.map((t) => ({
    key: `t${t.maxIncome}`,
    label: `bis ${nf(t.maxIncome)} €`,
    sub: `Einkommens-Bonus +${Math.round(t.rate * 100)} %`,
    income: t.maxIncome,
  })),
  { key: "none", label: `über ${nf(STAFFEL[STAFFEL.length - 1].maxIncome)} €`, sub: "kein Einkommens-Bonus" },
];
const incomeFor = (key: string) => EINKOMMEN_OPTIONS.find((o) => o.key === key)?.income;

const INVEST_MIN = 10000;
const INVEST_MAX = 45000;

// ── Flow-Screens ──
// Reihenfolge fragt nur ab, was den Fördersatz wirklich bewegt. Neubau kürzt
// direkt ins Ergebnis ab (keine BEG-WP-Förderung), Vermieter überspringt die
// Einkommensfrage (Einkommens-Bonus gibt es nur für selbstnutzende Eigentümer).
type Screen = "gebaeude" | "heizung" | "alter" | "nutzung" | "einkommen" | "kind" | "result";

export default function FoerderCheckWidget() {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  // First-party embed (onsite=1): our own page carries CTAs' context, source and
  // impressum — so we show the actions as a direct bar and drop "Powered by" +
  // the in-widget source note (page footer credits it). See widget convention.
  const [onsite, setOnsite] = useState(false);
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
      if (typeof s.onsite === "boolean") setOnsite(s.onsite);
    },
  });

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
  const [invest, setInvest] = useState(22000);

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
        haushaltseinkommen: selbstnutzer ? incomeFor(einkommen) : undefined,
        kindImHaushalt: selbstnutzer && kind,
      }),
    [neubau, invest, fossil, selbstnutzer, einkommen, kind],
  );

  const capped = invest > cfg.begMaxCap;

  return (
    <div
      style={{
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: 16,
        boxSizing: "border-box",
        maxWidth: 380,
        margin: "0 auto",
      }}
    >
      {/* ── Kopf: Titel als Überschrift + Trennlinie darunter ── */}
      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.1, lineHeight: 1.2 }}>
        Wärmepumpen-Förderung berechnen
      </div>
      <div style={{ fontSize: 11.5, color: "var(--widget-muted)", marginTop: 3 }}>
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
        <FlowView
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

      {/* ── Footer: Zurück (unten) + Quelle + Marke + Aktionen ── */}
      {/* onsite = First-Party-Embed: direkte Aktionsleiste, kein "Powered by",
          keine Widget-eigene Quelle (die einbettende Seite/der Footer trägt sie). */}
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
              fontSize: 12,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            ← Zurück
          </button>
        )}
        <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2, marginBottom: 8 }} />
        {!onsite && (
          <div style={{ fontSize: 10.5, color: "var(--widget-muted)", marginBottom: 6 }}>
            <DataSourceNote source={DATA_SOURCES.beg} />
          </div>
        )}
        <div
          style={{
            fontSize: 10.5,
            color: "var(--widget-muted)",
            display: "flex",
            justifyContent: showBranding && !onsite ? "space-between" : "flex-end",
            alignItems: "center",
            gap: 8,
          }}
        >
          {showBranding && !onsite && <PoweredBy />}
          <ChartActionBar
            variant={onsite ? "bar" : "menu"}
            menuUp={!onsite}
            showDownload={false}
            size={28}
            onDownload={() => {}}
            onCopyLink={() => navigator.clipboard?.writeText(`${SHARE_TEXT}\n${SHARE_URL}`).catch(() => {})}
            onWhatsApp={() =>
              window.open(`https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT}\n${SHARE_URL}`)}`, "_blank")
            }
            onTwitter={() =>
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`,
                "_blank",
              )
            }
            onEmbed={showEmbed ? () => window.open("/energie-widgets#foerder-check", "_blank", "noopener") : undefined}
            isExporting={false}
            canNativeShare={false}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow: eine Frage pro Screen, Klick wählt und geht weiter.
// ─────────────────────────────────────────────────────────────────────────────
function FlowView({
  screen,
  go,
  setNeubau,
  setFossil,
  setAlterUnbekannt,
  setSelbstnutzer,
  setEinkommen,
  setKind,
}: {
  screen: Screen;
  go: (s: Screen) => void;
  setNeubau: (v: boolean) => void;
  setFossil: (v: boolean) => void;
  setAlterUnbekannt: (v: boolean) => void;
  setSelbstnutzer: (v: boolean) => void;
  setEinkommen: (v: string) => void;
  setKind: (v: boolean) => void;
}) {
  if (screen === "gebaeude") {
    return (
      <Question title="Um welches Gebäude geht es?">
        <OptionRow
          label="Bestandsgebäude"
          sub="Bereits bewohnt, Heizung wird getauscht"
          onClick={() => {
            setNeubau(false);
            go("nutzung");
          }}
        />
        <OptionRow
          label="Neubau"
          sub="Noch nicht fertiggestellt"
          onClick={() => {
            setNeubau(true);
            go("result");
          }}
        />
      </Question>
    );
  }

  if (screen === "heizung") {
    // Klima-Geschwindigkeits-Bonus hängt von der Art der alten Heizung ab:
    //  • Öl / Kohle / Nachtspeicher → immer (kein Mindestalter)
    //  • Gas / Biomasse (Holz, Pellets) → nur ab 20 Jahren → Folgefrage "alter"
    //  • alles andere (schon Strom-WP etc.) → kein Klima-Bonus
    return (
      <Question
        title="Welche Heizung ersetzt du?"
        hint="Die Art der alten Heizung entscheidet über den Klima-Geschwindigkeits-Bonus."
      >
        <OptionRow
          label="Öl, Kohle oder Nachtspeicher"
          sub={`Klima-Bonus +${Math.round(cfg.begKlimaBonus * 100)} % (unabhängig vom Alter)`}
          onClick={() => {
            setFossil(true);
            setAlterUnbekannt(false);
            go("einkommen");
          }}
        />
        <OptionRow
          label="Gasheizung, Holz oder Pellets"
          sub="Klima-Bonus nur ab 20 Jahren – Alter wird gleich gefragt"
          onClick={() => {
            go("alter");
          }}
        />
        <OptionRow
          label="Etwas anderes"
          sub="z. B. bereits eine Strom- oder Wärmepumpenheizung – kein Klima-Bonus"
          onClick={() => {
            setFossil(false);
            setAlterUnbekannt(false);
            go("einkommen");
          }}
        />
      </Question>
    );
  }

  if (screen === "alter") {
    return (
      <Question
        title="Wie alt ist die Heizung?"
        hint="Für den Klima-Geschwindigkeits-Bonus muss eine Gas-, Holz- oder Pelletheizung mindestens 20 Jahre alt sein."
      >
        <OptionRow
          label="20 Jahre oder älter"
          sub={`Klima-Bonus +${Math.round(cfg.begKlimaBonus * 100)} %`}
          onClick={() => {
            setFossil(true);
            setAlterUnbekannt(false);
            go("einkommen");
          }}
        />
        <OptionRow
          label="Jünger als 20 Jahre"
          sub="Kein Klima-Bonus"
          onClick={() => {
            setFossil(false);
            setAlterUnbekannt(false);
            go("einkommen");
          }}
        />
        <OptionRow
          label="Weiß ich nicht"
          sub="Wir rechnen mit Bonus und weisen im Ergebnis darauf hin"
          onClick={() => {
            setFossil(true);
            setAlterUnbekannt(true);
            go("einkommen");
          }}
        />
        <details style={{ marginTop: 4 }}>
          <summary
            style={{
              fontSize: 11,
              color: "var(--widget-accent)",
              cursor: "pointer",
              listStyle: "none",
              fontWeight: 600,
            }}
          >
            Woran erkenne ich das Alter?
          </summary>
          <div style={{ fontSize: 11, color: "var(--widget-muted)", lineHeight: 1.5, marginTop: 6 }}>
            Auf dem Typenschild am Heizkessel steht das Bau- oder Herstellungsjahr. Alternativ findest du das
            Datum im letzten Schornsteinfeger-Protokoll oder auf der Rechnung bzw. dem Übergabeprotokoll der
            Heizungsinstallation.
          </div>
        </details>
      </Question>
    );
  }

  if (screen === "nutzung") {
    // Steht bewusst VOR den Heizungsfragen: Klima- und Einkommens-Bonus setzen beide
    // Selbstnutzung voraus. Für Vermieter bleibt nur die Grundförderung — dann sind
    // Heizungstyp und Alter für die Förderung ohne Wirkung und werden übersprungen.
    return (
      <Question
        title="Bewohnst du das Gebäude selbst?"
        hint="Klima- und Einkommens-Bonus gibt es nur für selbstnutzende Eigentümer."
      >
        <OptionRow
          label="Ja, ich wohne selbst darin"
          sub="Klima- und Einkommens-Bonus möglich"
          onClick={() => {
            setSelbstnutzer(true);
            go("heizung");
          }}
        />
        <OptionRow
          label="Nein, ich vermiete"
          sub="Nur die Grundförderung von 30 %"
          onClick={() => {
            setSelbstnutzer(false);
            go("result");
          }}
        />
      </Question>
    );
  }

  if (screen === "einkommen") {
    return (
      <Question
        title="Zu versteuerndes Haushaltseinkommen?"
        hint="Gemeint ist das gemeinsame zu versteuernde Jahreseinkommen aller im Haushalt."
      >
        {EINKOMMEN_OPTIONS.map((o) => (
          <OptionRow
            key={o.key}
            label={o.label}
            sub={o.sub}
            onClick={() => {
              setEinkommen(o.key);
              // Kind hebt nur bei einer Bonus-Stufe die Grenze — sonst überspringen.
              go(o.income != null ? "kind" : "result");
            }}
          />
        ))}
      </Question>
    );
  }

  if (screen === "kind") {
    return (
      <Question
        title="Lebt mindestens ein minderjähriges Kind im Haushalt?"
        hint={`Schon ein Kind hebt die maßgebliche Einkommensgrenze um ${nf(cfg.begFamilienzuschlag)} € – die Anzahl spielt keine Rolle. Dadurch kann eine höhere Bonusstufe greifen.`}
      >
        <OptionRow
          label="Ja"
          sub={`Einkommensgrenze +${nf(cfg.begFamilienzuschlag)} €`}
          onClick={() => {
            setKind(true);
            go("result");
          }}
        />
        <OptionRow
          label="Nein"
          onClick={() => {
            setKind(false);
            go("result");
          }}
        />
      </Question>
    );
  }

  return null;
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ animation: "fu 0.3s ease-out" }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: hint ? 4 : 10 }}>{title}</div>
      {hint && <div style={{ fontSize: 11, color: "var(--widget-muted)", lineHeight: 1.45, marginBottom: 10 }}>{hint}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function OptionRow({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "11px 13px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        background: "var(--color-bg)",
        color: "var(--widget-fg)",
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--widget-accent)";
        e.currentTarget.style.background = "var(--color-bg-muted)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.background = "var(--color-bg)";
      }}
    >
      <span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ display: "block", fontSize: 11, color: "var(--widget-muted)", marginTop: 1 }}>{sub}</span>}
      </span>
      <span style={{ color: "var(--widget-accent)", fontSize: 13, flexShrink: 0 }}>→</span>
    </button>
  );
}

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
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Für den Neubau kein BEG-Zuschuss</div>
          <div style={{ fontSize: 11, color: "var(--widget-muted)", lineHeight: 1.5 }}>
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
            <div style={{ fontSize: 11, color: "var(--widget-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
              Deine Förderung
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                color: "var(--widget-accent)",
                margin: "2px 0 4px",
              }}
            >
              {nf(beg.amount)} €
            </div>
            <div style={{ fontSize: 11, color: "var(--widget-muted)" }}>
              {Math.round(beg.rate * 100)} % {capped ? "von max. " : "der "}
              {capped ? `${nf(cfg.begMaxCap)} € förderfähigen Kosten` : "Investition"}
            </div>
            {/* Bonus-Aufschlüsselung */}
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
              {beg.breakdown.map((b) => (
                <div
                  key={b.label}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--widget-fg)" }}
                >
                  <span>{b.label}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--widget-muted)" }}>
                    +{Math.round(b.rate * 100)} %
                  </span>
                </div>
              ))}
            </div>
          </div>

          {alterUnbekannt && (
            <div
              style={{
                fontSize: 11,
                color: "var(--widget-fg)",
                lineHeight: 1.5,
                marginBottom: 12,
                padding: "9px 11px",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-bg-muted)",
                borderLeft: "3px solid var(--widget-accent)",
              }}
            >
              Enthält den Klima-Bonus (+{Math.round((cfg.begKlimaBonus) * 100)} %). Der gilt nur, wenn deine Gas-,
              Holz- oder Pelletheizung <strong>mindestens 20 Jahre</strong> alt ist. Prüfe das Baujahr auf dem
              Typenschild am Kessel – ist sie jünger, fällt dieser Anteil weg.
            </div>
          )}

          {!selbstnutzer && (
            <div style={{ fontSize: 11, color: "var(--widget-muted)", lineHeight: 1.5, marginBottom: 12 }}>
              Als Vermieter bleibt es bei der Grundförderung: Klima- und Einkommens-Bonus setzen beide voraus,
              dass du selbst im Gebäude wohnst.
            </div>
          )}

          {/* Investitions-Slider */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
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
                  fontSize: 11,
                  color: "var(--widget-accent)",
                  cursor: "pointer",
                  listStyle: "none",
                  fontWeight: 600,
                }}
              >
                Woher kommt dieser Betrag?
              </summary>
              <div style={{ fontSize: 11, color: "var(--widget-muted)", lineHeight: 1.5, marginTop: 6 }}>
                Der Startwert ist eine typische Komplettinvestition aus Gerät und Einbau für ein
                Einfamilienhaus: grob eine Grundpauschale plus Kosten je Kilowatt Heizleistung, abgeleitet
                aus laufend aktualisierten Marktpreisen. Dein tatsächlicher Preis hängt von Heizlast,
                Gebäude und Angebot ab – schieb den Regler einfach auf dein Angebot.{" "}
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
          fontSize: 13,
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
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Neu berechnen
      </button>

      <div style={{ fontSize: 10.5, color: "var(--widget-muted)", lineHeight: 1.5, marginTop: 10 }}>
        Bezogen auf eine Wohneinheit — bei Mehrfamilienhäusern gelten je weiterer Wohnung eigene Höchstbeträge.
        Schätzung nach den aktuellen KfW-Sätzen (gültig ab 21.07.2026) — ohne Gewähr, verbindlich ist der
        KfW-Zuschussbescheid. Boni hängen von deiner individuellen Situation ab.
      </div>
    </div>
  );
}
