"use client";

import { useMemo, useState } from "react";
import ChartActionBar from "../../../../components/ChartActionBar";
import { PoweredBy, DataSourceNote } from "../../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../../lib/data-sources";
import { useWidgetTheme } from "../../../../lib/useWidgetTheme";
import { calcBegSubsidy } from "../../../../lib/heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../../../../lib/heatpump-config";

// Förder-Check: a slim, embeddable calculator that answers one question —
// "wie viel BEG-Förderung bekomme ich für eine Wärmepumpe?". A few specs
// (Kosten, alte Heizung, Einkommen) → Fördersumme, then a CTA into the full
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
const EINKOMMEN_OPTIONS: { key: string; label: string; income?: number }[] = [
  { key: "none", label: `über ${nf(STAFFEL[STAFFEL.length - 1].maxIncome)} € / kein Bonus` },
  ...STAFFEL.map((t) => ({
    key: `t${t.maxIncome}`,
    label: `bis ${nf(t.maxIncome)} € (+${Math.round(t.rate * 100)} %)`,
    income: t.maxIncome,
  })),
];
const incomeFor = (key: string) => EINKOMMEN_OPTIONS.find((o) => o.key === key)?.income;

const INVEST_MIN = 10000;
const INVEST_MAX = 45000;

export default function FoerderCheckWidget() {
  const [showEmbed, setShowEmbed] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  useWidgetTheme({
    onSettings: (s) => {
      if (typeof s.embed === "boolean") setShowEmbed(s.embed);
      if (typeof s.branding === "boolean") setShowBranding(s.branding);
    },
  });

  const [invest, setInvest] = useState(22000);
  const [klima, setKlima] = useState(true);
  const [einkommen, setEinkommen] = useState("none");
  const [kind, setKind] = useState(false);

  const beg = useMemo(
    () =>
      calcBegSubsidy("bestand", "lwwp", invest, {
        klimaBonus: klima,
        haushaltseinkommen: incomeFor(einkommen),
        kindImHaushalt: kind,
      }),
    [invest, klima, einkommen, kind],
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
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.2, marginBottom: 2 }}>
        Wärmepumpen-Förderung berechnen
      </div>
      <div style={{ fontSize: 11.5, color: "var(--widget-muted)", marginBottom: 14 }}>
        BEG-Zuschuss der KfW für den Heizungstausch im Bestand.
      </div>

      {/* ── Ergebnis ── */}
      <div
        style={{
          background: "var(--color-bg-muted)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--widget-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
          Deine Förderung
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
            color: "var(--widget-accent)",
            margin: "2px 0 4px",
          }}
        >
          {nf(beg.amount)} €
        </div>
        <div style={{ fontSize: 11.5, color: "var(--widget-muted)" }}>
          {Math.round(beg.rate * 100)} % {capped ? "von max. " : "der "}
          {capped ? `${nf(cfg.begMaxCap)} € förderfähigen Kosten` : "Investition"}
        </div>
        {/* Bonus-Aufschlüsselung */}
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          {beg.breakdown.map((b) => (
            <div
              key={b.label}
              style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--widget-fg)" }}
            >
              <span>{b.label}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--widget-muted)" }}>
                +{Math.round(b.rate * 100)} %
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Eingaben ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
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
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={klima}
            onChange={(e) => setKlima(e.target.checked)}
            style={{ cursor: "pointer", marginTop: 1, accentColor: "var(--widget-accent)" }}
          />
          <span>
            Ich ersetze eine alte fossile Heizung
            <span style={{ color: "var(--widget-muted)" }}> (Öl, Kohle oder Gas ≥ 20 J.) — +{Math.round(cfg.begKlimaBonus * 100)} %</span>
          </span>
        </label>

        <div>
          <div style={{ fontSize: 12, color: "var(--widget-muted)", marginBottom: 4 }}>Haushaltseinkommen (zu versteuern)</div>
          <select
            value={einkommen}
            onChange={(e) => setEinkommen(e.target.value)}
            aria-label="Zu versteuerndes Haushaltsjahreseinkommen"
            style={{
              width: "100%",
              fontSize: 12.5,
              padding: "7px 8px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--widget-fg)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {EINKOMMEN_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {einkommen !== "none" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", marginTop: 7 }}>
              <input
                type="checkbox"
                checked={kind}
                onChange={(e) => setKind(e.target.checked)}
                style={{ cursor: "pointer", accentColor: "var(--widget-accent)" }}
              />
              <span>
                Mind. ein Kind im Haushalt
                <span style={{ color: "var(--widget-muted)" }}> (Grenze +{nf(cfg.begFamilienzuschlag)} €)</span>
              </span>
            </label>
          )}
        </div>
      </div>

      {/* ── CTA ── */}
      <a
        href={CTA_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textAlign: "center",
          marginTop: 16,
          padding: "10px 14px",
          borderRadius: 10,
          background: "var(--widget-accent)",
          color: "var(--widget-accent-fg)",
          fontSize: 13,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Komplett durchrechnen (Ersparnis &amp; Amortisation) →
      </a>

      <div style={{ fontSize: 10.5, color: "var(--widget-muted)", lineHeight: 1.5, marginTop: 10 }}>
        Schätzung nach den aktuellen KfW-Sätzen (gültig ab 21.07.2026) — ohne Gewähr, verbindlich ist der KfW-Zuschussbescheid. Boni hängen von deiner individuellen Situation ab.
      </div>

      {/* ── Footer: Quelle + Marke + Aktionen ── */}
      <div style={{ marginTop: 12 }}>
        <div style={{ height: 1, background: "var(--widget-muted)", opacity: 0.2, marginBottom: 8 }} />
        <div style={{ fontSize: 10.5, color: "var(--widget-muted)", marginBottom: 6 }}>
          <DataSourceNote source={DATA_SOURCES.beg} />
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: "var(--widget-muted)",
            display: "flex",
            justifyContent: showBranding ? "space-between" : "flex-end",
            alignItems: "center",
            gap: 8,
          }}
        >
          {showBranding && <PoweredBy />}
          <ChartActionBar
            variant="menu"
            menuUp
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
