"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { IconArrowRight } from "../../../components/Icons";
import InlineEdit from "../../../components/InlineEdit";
import { calcEigenverbrauch, calcWeightedFeedIn } from "../../../lib/calc";
import { DEGRAD, FEED_IN_YEARS, NO_PLZ_DEFAULT_YIELD, PERSONEN } from "../../../lib/constants";
import { eegReformStandLabel, eegVerfahrenSatz } from "../../../lib/eeg-reform-config";
import {
  FEED_IN_BASIS,
  feedInEndIso,
  feedInRatesForCommissioning,
  type FeedInRates,
} from "../../../lib/feedin-config";
import { useFeedInRates } from "../../../lib/feedin";
import { iconSizes, space, v } from "../../../lib/theme";

const KWP_PRESETS = [5, 8, 10, 15];
const SPEICHER_OPTIONS = [0, 5, 10];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
/** Earliest selectable commissioning year — EEG feed-in for rooftop PV exists
 *  since 2000; older entries would only ever use the manual-rate path anyway. */
const MIN_JAHR = 2000;

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");
const ctFmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Feed-in tariff calculator. New plants read the live rates from /api/feedin
 *  (flips at the statutory Feb-1/Aug-1 cutoffs without a deploy). Existing
 *  plants enter month + year of commissioning: since 30.07.2022 the historical
 *  rate is derived from the statutory chain in feedin-config (anchored against
 *  published BNetzA cells); older plants enter the rate from their Bescheid via
 *  the click-to-edit value, and the lifetime math (earned so far / still to
 *  come until 31.12. of the 20th year, § 25 EEG) works either way. */
export default function EinspeiseRechner() {
  const liveRates = useFeedInRates();
  const heute = useMemo(() => new Date(), []);
  const [kwp, setKwp] = useState(10);
  const [customKwp, setCustomKwp] = useState("");
  const [mode, setMode] = useState<"teil" | "voll">("teil");
  const [personenIdx, setPersonenIdx] = useState(2);
  const [speicherKwh, setSpeicherKwh] = useState(0);
  const [anlage, setAnlage] = useState<"neu" | "bestand">("neu");
  const [ibMonat, setIbMonat] = useState(heute.getMonth() + 1);
  const [ibJahr, setIbJahr] = useState(heute.getFullYear() - 2);
  const [satzOverride, setSatzOverride] = useState<number | null>(null);

  const jahre = useMemo(() => {
    const list: number[] = [];
    for (let y = heute.getFullYear(); y >= MIN_JAHR; y--) list.push(y);
    return list;
  }, [heute]);

  // Mid-month ISO date: precise enough for the half-year rate cutoffs, and it
  // deliberately puts July 2022 (mixed month, base values start on the 30th)
  // on the manual-entry side instead of guessing.
  const ibIso = `${ibJahr}-${String(ibMonat).padStart(2, "0")}-15`;
  const inZukunft = anlage === "bestand" && ibIso > heute.toISOString().slice(0, 10);

  const rates: FeedInRates | null =
    anlage === "neu" || inZukunft ? liveRates : feedInRatesForCommissioning(ibIso);

  const computedSatz = useMemo(() => {
    if (!rates) return null;
    return calcWeightedFeedIn(
      kwp,
      mode === "teil" ? rates.teilUnder10 : rates.vollUnder10,
      mode === "teil" ? rates.teilOver10 : rates.vollOver10,
      rates.thresholdKwp,
    );
  }, [kwp, mode, rates]);

  const satz = satzOverride ?? computedSatz ?? 0;

  const jahresertrag = kwp * NO_PLZ_DEFAULT_YIELD;
  // Self-consumption share only matters for Teileinspeisung — with full feed-in
  // the whole yield is exported by definition.
  const evPct = useMemo(
    () =>
      calcEigenverbrauch({
        personenIdx,
        nutzungIdx: 1, // "Teils zuhause" — HTW-Standardprofil, same default as the PV calculator
        speicherKwh,
        wp: "nein",
        ea: "nein",
        eaKm: 15000,
        kwp,
        ertragKwp: NO_PLZ_DEFAULT_YIELD,
      }),
    [personenIdx, speicherKwh, kwp],
  );
  const einspeisungKwh = mode === "voll" ? jahresertrag : Math.round(jahresertrag * (1 - evPct / 100));
  const jahresverguetung = (einspeisungKwh * satz) / 100;

  // Fixed tariff over FEED_IN_YEARS plant years, production degrading by DEGRAD
  // per year — same horizon assumptions as the main calculator. For existing
  // plants the same series splits into "already received" and "still to come".
  const verlaufJahre = useMemo(() => {
    const list: number[] = [];
    for (let y = 0; y < FEED_IN_YEARS; y++) list.push(jahresverguetung * Math.pow(1 - DEGRAD, y));
    return list;
  }, [jahresverguetung]);
  const summeGesamt = verlaufJahre.reduce((a, b) => a + b, 0);
  const vergangeneJahre =
    anlage === "bestand" && !inZukunft
      ? Math.min(FEED_IN_YEARS, Math.max(0, Math.floor((heute.getTime() - new Date(ibIso).getTime()) / (365.25 * 24 * 3600 * 1000))))
      : 0;
  const bereitsErhalten = verlaufJahre.slice(0, vergangeneJahre).reduce((a, b) => a + b, 0);
  const nochAusstehend = summeGesamt - bereitsErhalten;
  const endJahr = feedInEndIso(ibIso).slice(0, 4);
  const verguetungVorbei = anlage === "bestand" && vergangeneJahre >= FEED_IN_YEARS;

  // Before an old plant's rate is entered, money figures would all read "0 €"
  // and look broken — show a dash until there is a rate to multiply with.
  const geld = (n: number) => (satz === 0 ? "–" : nf(n));

  const commitCustom = () => {
    const parsed = parseFloat(customKwp.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 200) setKwp(Math.round(parsed * 10) / 10);
  };

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "9px 14px",
    borderRadius: v("--radius-md"),
    border: `1px solid ${active ? v("--color-accent") : v("--color-border")}`,
    background: active ? v("--color-bg-accent") : v("--color-bg"),
    color: active ? v("--color-accent") : v("--color-text-secondary"),
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  });
  const label: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: v("--color-text-secondary"),
    marginBottom: space.md,
  };
  const selectStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: v("--radius-md"),
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg-muted"),
    fontSize: 14,
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
  };

  const stichtag = liveRates.validFrom.split("-").reverse().join(".");
  const manuellNoetig = anlage === "bestand" && !inZukunft && rates === null;
  const periodLabel =
    anlage === "neu" || inZukunft
      ? `Inbetriebnahme ab ${stichtag}`
      : manuellNoetig
      ? "Satz aus deinem Bescheid"
      : `Inbetriebnahme ${MONATE[ibMonat - 1]} ${ibJahr}`;

  return (
    <div>
      {/* ── Eingaben ── */}
      <div style={{ border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-lg"), padding: space.xl, marginBottom: space.lg, background: v("--color-bg") }}>
        <div style={label}>Anlage</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.md }}>
          <button type="button" style={chip(anlage === "neu")} onClick={() => { setAnlage("neu"); setSatzOverride(null); }}>Neue Anlage (geplant)</button>
          <button type="button" style={chip(anlage === "bestand")} onClick={() => { setAnlage("bestand"); setSatzOverride(null); }}>Läuft schon</button>
        </div>

        {anlage === "bestand" && (
          <>
            <div style={label}>Wann ging die Anlage in Betrieb?</div>
            <div style={{ display: "flex", gap: space.sm, marginBottom: space.md }}>
              <select
                value={ibMonat}
                onChange={(e) => { setIbMonat(Number(e.target.value)); setSatzOverride(null); }}
                style={selectStyle}
                aria-label="Monat der Inbetriebnahme"
              >
                {MONATE.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={ibJahr}
                onChange={(e) => { setIbJahr(Number(e.target.value)); setSatzOverride(null); }}
                style={selectStyle}
                aria-label="Jahr der Inbetriebnahme"
              >
                {jahre.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {inZukunft && (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-muted"), margin: `0 0 ${space.md}px` }}>
                Das Datum liegt in der Zukunft — gerechnet wird mit den aktuellen Sätzen für Neuanlagen.
              </p>
            )}
          </>
        )}

        <div style={label}>Anlagengröße</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.md }}>
          {KWP_PRESETS.map((p) => (
            <button key={p} type="button" style={chip(kwp === p && customKwp === "")} onClick={() => { setKwp(p); setCustomKwp(""); }}>
              {p} kWp
            </button>
          ))}
          <input
            type="text"
            inputMode="decimal"
            placeholder="eigener Wert"
            value={customKwp}
            onChange={(e) => setCustomKwp(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={(e) => { if (e.key === "Enter") { commitCustom(); (e.target as HTMLInputElement).blur(); } }}
            style={{ width: 110, padding: "9px 12px", borderRadius: v("--radius-md"), border: `1px solid ${customKwp ? v("--color-accent") : v("--color-border")}`, background: v("--color-bg-muted"), fontSize: 14, fontFamily: v("--font-text"), color: v("--color-text-primary") }}
          />
        </div>

        <div style={label}>Einspeise-Art</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.md }}>
          <button type="button" style={chip(mode === "teil")} onClick={() => { setMode("teil"); setSatzOverride(null); }}>Teileinspeisung (Überschuss)</button>
          <button type="button" style={chip(mode === "voll")} onClick={() => { setMode("voll"); setSatzOverride(null); }}>Volleinspeisung</button>
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-muted"), margin: `0 0 ${mode === "teil" ? space.md : 0}px` }}>
          {mode === "teil"
            ? "Teileinspeisung ist der Normalfall: Du verbrauchst selbst, was gerade gebraucht wird, und speist nur den Überschuss ein."
            : "Bei der Volleinspeisung geht der gesamte Strom ins Netz — der Satz ist höher, dafür entfällt die Ersparnis durch Eigenverbrauch komplett."}
        </p>

        {mode === "teil" && (
          <>
            <div style={label}>Personen im Haushalt</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.md }}>
              {PERSONEN.map((p, i) => (
                <button key={p.label} type="button" style={chip(personenIdx === i)} onClick={() => setPersonenIdx(i)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={label}>Batteriespeicher</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm }}>
              {SPEICHER_OPTIONS.map((s) => (
                <button key={s} type="button" style={chip(speicherKwh === s)} onClick={() => setSpeicherKwh(s)}>
                  {s === 0 ? "Kein Speicher" : `${s} kWh`}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Ergebnis ── */}
      <div style={{ background: v("--color-bg-accent"), border: `1px solid ${v("--color-border-accent")}`, borderRadius: v("--radius-lg"), padding: space.xl, marginBottom: space.lg }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-secondary"), marginBottom: 2 }}>
          Dein Vergütungssatz ({periodLabel})
        </div>
        <div style={{ marginBottom: space.md }}>
          <span style={{ fontFamily: v("--font-mono"), fontSize: 34, fontWeight: 700, color: v("--color-accent") }}>
            <InlineEdit
              value={satz}
              unit=" ct/kWh"
              min={0}
              max={80}
              width={96}
              fmt={ctFmt}
              onCommit={(n) => setSatzOverride(n)}
            />
          </span>
        </div>
        {manuellNoetig && satzOverride === null && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary"), margin: `0 0 ${space.md}px` }}>
            Für Inbetriebnahmen vor dem {FEED_IN_BASIS.validFromIso.split("-").reverse().join(".")} gelten
            ältere Vergütungsregeln — klick auf den Wert und trag den Satz aus deinem Bescheid
            oder deiner Abrechnung ein.
          </p>
        )}
        {satzOverride !== null && computedSatz !== null && (
          <p style={{ margin: `0 0 ${space.md}px` }}>
            <button
              type="button"
              onClick={() => setSatzOverride(null)}
              style={{ border: "none", background: "none", padding: 0, color: v("--color-accent"), fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            >
              Zurücksetzen
            </button>
          </p>
        )}
        {satzOverride === null && rates && kwp > rates.thresholdKwp && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary"), margin: `0 0 ${space.md}px` }}>
            Gewichteter Mischsatz: Die ersten {rates.thresholdKwp} kWp bekommen{" "}
            {ctFmt(mode === "teil" ? rates.teilUnder10 : rates.vollUnder10)} ct/kWh, die weiteren{" "}
            {(kwp - rates.thresholdKwp).toLocaleString("de-DE")} kWp{" "}
            {ctFmt(mode === "teil" ? rates.teilOver10 : rates.vollOver10)} ct/kWh.
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.lg, marginTop: space.md }}>
          <div>
            <div style={{ fontSize: 12, color: v("--color-text-muted") }}>Eingespeist pro Jahr</div>
            <div style={{ fontFamily: v("--font-mono"), fontSize: 18, fontWeight: 700, color: v("--color-text-primary") }}>
              {nf(einspeisungKwh)} <span style={{ fontSize: 12, fontWeight: 400 }}>kWh</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: v("--color-text-muted") }}>Vergütung pro Jahr</div>
            <div style={{ fontFamily: v("--font-mono"), fontSize: 18, fontWeight: 700, color: v("--color-positive") }}>
              {geld(jahresverguetung)} <span style={{ fontSize: 12, fontWeight: 400 }}>€</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: v("--color-text-muted") }}>Summe über die {FEED_IN_YEARS} Vergütungsjahre</div>
            <div style={{ fontFamily: v("--font-mono"), fontSize: 18, fontWeight: 700, color: v("--color-positive") }}>
              {geld(summeGesamt)} <span style={{ fontSize: 12, fontWeight: 400 }}>€</span>
            </div>
          </div>
          {mode === "teil" && (
            <div>
              <div style={{ fontSize: 12, color: v("--color-text-muted") }}>Eigenverbrauch (geschätzt)</div>
              <div style={{ fontFamily: v("--font-mono"), fontSize: 18, fontWeight: 700, color: v("--color-text-primary") }}>
                {evPct} <span style={{ fontSize: 12, fontWeight: 400 }}>%</span>
              </div>
            </div>
          )}
          {anlage === "bestand" && !inZukunft && (
            <>
              <div>
                <div style={{ fontSize: 12, color: v("--color-text-muted") }}>Davon bereits erhalten (geschätzt)</div>
                <div style={{ fontFamily: v("--font-mono"), fontSize: 18, fontWeight: 700, color: v("--color-text-primary") }}>
                  {geld(bereitsErhalten)} <span style={{ fontSize: 12, fontWeight: 400 }}>€</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: v("--color-text-muted") }}>Noch ausstehend (geschätzt)</div>
                <div style={{ fontFamily: v("--font-mono"), fontSize: 18, fontWeight: 700, color: v("--color-positive") }}>
                  {geld(nochAusstehend)} <span style={{ fontSize: 12, fontWeight: 400 }}>€</span>
                </div>
              </div>
            </>
          )}
        </div>
        {anlage === "bestand" && !inZukunft && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary"), margin: `${space.md}px 0 0` }}>
            {verguetungVorbei ? (
              <>Die {FEED_IN_YEARS} Vergütungsjahre dieser Anlage sind vorbei — die EEG-Zahlung
              endete am 31.12.{endJahr}. Die Ersparnis durch Eigenverbrauch läuft weiter.</>
            ) : (
              <>Nach {vergangeneJahre} von {FEED_IN_YEARS} Vergütungsjahren. Die Zahlung läuft
              bis zum 31.12.{endJahr} (§ 25 EEG: 20 Jahre, verlängert bis zum Jahresende).</>
            )}
          </p>
        )}
      </div>

      {/* ── Annahmen + Einordnung ── */}
      <p style={{ fontSize: 13, lineHeight: 1.7, color: v("--color-text-muted"), marginBottom: space.lg }}>
        Annahmen: Standort-Ertrag {nf(NO_PLZ_DEFAULT_YIELD)} kWh je kWp (konservativer
        Deutschland-Durchschnitt), Nutzungsprofil „teils zuhause",{" "}
        {(DEGRAD * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % Moduldegradation
        pro Jahr, gerechnet in ganzen Anlagenjahren. Die Vergütung ist nur die halbe Wahrheit:
        Den größeren Teil des Nutzens bringt der Eigenverbrauch. Beides zusammen, mit deinem
        Standort und aktuellen Marktpreisen, rechnet der Photovoltaik-Rechner.
      </p>
      <Link
        href="/photovoltaik-rechner"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 20px", borderRadius: v("--radius-md"), fontSize: 14, fontWeight: 700, background: v("--color-accent"), color: v("--color-text-on-accent"), textDecoration: "none", marginBottom: space.xl }}
      >
        Komplette Rechnung: Lohnt sich die Anlage? <IconArrowRight size={iconSizes.sm} />
      </Link>

      {/* ── Sachstand EEG-Reform (eine Quelle: lib/eeg-reform-config.ts) ── */}
      <div style={{ border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: `${space.lg}px ${space.xl}px`, marginBottom: space.lg, fontSize: 13, lineHeight: 1.7, color: v("--color-text-secondary") }}>
        <span style={{ fontWeight: 700, color: v("--color-text-primary") }}>Geplante EEG-Reform:</span>{" "}
        Für Neuanlagen ab 2027 soll die feste Einspeisevergütung enden — {eegVerfahrenSatz({ kurz: true })}.
        Für Anlagen, die bis Ende 2026 in Betrieb gehen, ändert sich nichts: Ihr Satz bleibt{" "}
        {FEED_IN_YEARS} Jahre garantiert (Bestandsschutz). Stand: {eegReformStandLabel()}.{" "}
        <Link href="/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung" style={{ color: v("--color-accent"), textDecoration: "none", fontWeight: 600 }}>
          Was das bedeutet, steht im Ratgeber.
        </Link>
      </div>

      <p style={{ fontSize: 11, lineHeight: 1.6, color: v("--color-text-muted") }}>
        Sätze seit Februar 2024: Bundesnetzagentur (§§ 48/49/53 EEG); Juli 2022 bis Januar
        2024: eingefrorene Basiswerte des EEG 2023; Laufzeit nach § 25 EEG. Alle Angaben ohne
        Gewähr — verbindlich sind Gesetz, Bundesnetzagentur und dein Vergütungsbescheid. Alle
        aktuellen Werte mit Stand-Datum: <Link href="/datenstand" style={{ color: "inherit", textDecoration: "underline" }}>Datenstand</Link>.
      </p>
    </div>
  );
}
