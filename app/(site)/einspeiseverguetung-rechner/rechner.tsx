"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { IconArrowRight } from "../../../components/Icons";
import InlineEdit from "../../../components/InlineEdit";
import FlowNav, { flowSelect } from "../../../components/FlowNav";
import OptionCard from "../../../components/OptionCard";
import SelectField from "../../../components/SelectField";
import StandortField from "../../../components/StandortField";
import DachField from "../../../components/DachField";
import ResultSection from "../../../components/ResultSection";
import { calcEigenverbrauch, calcWeightedFeedIn } from "../../../lib/calc";
import { dachErtragHinweis, dachErtragKwp, dachNeigungsFaktor } from "../../../lib/dach-ertrag";
import { DACHARTEN, DEGRAD, FEED_IN_YEARS, NO_PLZ_DEFAULT_YIELD, PERSONEN } from "../../../lib/constants";
import { eegReformStandLabel, eegVerfahrenSatz } from "../../../lib/eeg-reform-config";
import {
  FEED_IN_BASIS,
  feedInEndIso,
  feedInRatesForCommissioning,
  type FeedInRates,
} from "../../../lib/feedin-config";
import { useFeedInRates } from "../../../lib/feedin";
import { useSharedPlz } from "../../../lib/location";
import { TILT_ORIENTATIONS, type TiltOrientation } from "../../../lib/tilt-config";
import { iconSizes, space, v } from "../../../lib/theme";

const KWP_PRESETS = [
  { kwp: 5, sub: "Kleines Dach" },
  { kwp: 8, sub: "Kompakt" },
  { kwp: 10, sub: "Standard" },
  { kwp: 15, sub: "Groß" },
];
const SPEICHER_OPTIONS = [0, 5, 10];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
/** Earliest selectable commissioning year — EEG feed-in for rooftop PV exists
 *  since 2000; older vintages use the manual-rate path anyway. */
const MIN_JAHR = 2000;

type StepKey = "anlage" | "datum" | "groesse" | "art" | "haushalt";

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");
const ctFmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Feed-in tariff calculator as a step flow (same pattern as the other
 *  calculators: option cards, progress bar, result on the same page).
 *  Rates: new plants live from /api/feedin (flips at the statutory cutoffs);
 *  plants commissioned since 04/2012 from the BNetzA monthly archive /
 *  EEG-2023 chain in feedin-config; older plants enter the rate from their
 *  Bescheid via the click-to-edit value in the result. */
export default function EinspeiseRechner() {
  const liveRates = useFeedInRates();
  const heute = useMemo(() => new Date(), []);
  const [stepIdx, setStepIdx] = useState(0);
  const [anlage, setAnlage] = useState<"neu" | "bestand" | null>(null);
  const [ibMonat, setIbMonat] = useState<number | null>(null);
  const [ibJahr, setIbJahr] = useState<number | null>(null);
  const [kwp, setKwp] = useState<number | null>(null);
  const [customKwp, setCustomKwp] = useState("");
  const [mode, setMode] = useState<"teil" | "voll" | null>(null);
  const [personenIdx, setPersonenIdx] = useState<number | null>(null);
  // Etabliertes Muster aus dem PV-Rechner: Personen schätzen ODER den
  // Jahresverbrauch von der Stromrechnung direkt eintragen (baseKwh).
  const [verbrauchMode, setVerbrauchMode] = useState(false);
  const [oVerbrauch, setOVerbrauch] = useState<number | null>(null);
  const [speicherKwh, setSpeicherKwh] = useState<number | null>(null);
  const [satzOverride, setSatzOverride] = useState<number | null>(null);
  // Klick auf den inaktiven Weiter-Button (FlowNav.onInaktivKlick): die
  // OPTIONEN des Schritts pulsieren — nicht der Button, der trägt den Tooltip.
  const [optionsNudge, setOptionsNudge] = useState(false);
  // ── "Ergebnis verfeinern": Standort (geteilte PLZ, wie überall) + Dach ──
  const [plz, setPlz] = useState("");
  const [plzLoading, setPlzLoading] = useState(false);
  const [plzConfirmed, setPlzConfirmed] = useState(false);
  const [standortYield, setStandortYield] = useState<number | null>(null);
  const [ausrichtung, setAusrichtung] = useState<TiltOrientation | null>(null);
  const [dachartIdx, setDachartIdx] = useState<number | null>(null);
  // Neigung: null = nicht angegeben → typische Neigung der Dachform.
  const [neigungGrad, setNeigungGrad] = useState<number | null>(null);
  const [dachAnswered, setDachAnswered] = useState<Set<string>>(new Set());
  const [dachEditing, setDachEditing] = useState<string | null>(null);
  const markDachAnswered = (key: string) => {
    setDachAnswered(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
    setDachEditing(null);
  };
  // Der gewählte Zustand als Kopfzeile des Abschnitts — zugeklappt ist das die
  // einzige Stelle, an der man sieht, worauf der gerechnete Ertrag beruht.
  const dachZusammenfassung = () =>
    dachartIdx !== null && ausrichtung !== null
      ? `${DACHARTEN[dachartIdx].label} · ${TILT_ORIENTATIONS.find(o => o.key === ausrichtung)?.label}`
        + (neigungGrad !== null ? ` · ${neigungGrad}°` : "")
      : "noch nicht angegeben";

  const fetchPvgis = useCallback(async (inputPlz: string) => {
    if (!/^\d{5}$/.test(inputPlz)) return;
    setPlzLoading(true);
    try {
      const plzRes = await fetch("/plz.json");
      const plzData: Record<string, [number, number]> = await plzRes.json();
      const coords = plzData[inputPlz];
      if (coords) {
        const res = await fetch(`/api/pvgis?lat=${coords[0]}&lon=${coords[1]}&plzPrefix=${inputPlz.slice(0, 2)}`);
        const data = await res.json();
        if (typeof data.annual === "number") setStandortYield(data.annual);
        setPlzConfirmed(true);
      }
    } catch { /* Fallback (Bundesschnitt) bleibt */ }
    setPlzLoading(false);
  }, []);
  useSharedPlz(plz, (shared) => { setPlz(shared); fetchPvgis(shared); });
  const onPlzChange = (raw: string) => { setPlz(raw); setPlzConfirmed(false); };

  // Ertrag = Standort-Optimum × Dach. Die Regel steht in lib/dach-ertrag.ts und
  // gilt für alle Rechner gleich — hier wird sie nur aufgerufen.
  const neigungsFaktor = dachNeigungsFaktor(dachartIdx, ausrichtung, neigungGrad);
  const ertragKwp = dachErtragKwp(standortYield ?? NO_PLZ_DEFAULT_YIELD, dachartIdx, ausrichtung, neigungGrad);

  const jahre = useMemo(() => {
    const list: number[] = [];
    for (let y = heute.getFullYear(); y >= MIN_JAHR; y--) list.push(y);
    return list;
  }, [heute]);

  // Mid-month ISO date: precise enough for the rate cutoffs, and it puts the
  // mixed month July 2022 (EEG-2023 base values start on the 30th) on the
  // archive side with an explicit boundary hint below. Null, solange im
  // Datum-Schritt noch nichts gewählt ist (kein Vorauswahl-Standard).
  const datumGesetzt = ibMonat !== null && ibJahr !== null;
  const ibIso = datumGesetzt ? `${ibJahr}-${String(ibMonat).padStart(2, "0")}-15` : null;
  const inZukunft = anlage === "bestand" && ibIso !== null && ibIso > heute.toISOString().slice(0, 10);

  const rates: FeedInRates | null =
    anlage !== "bestand" || inZukunft
      ? liveRates
      : ibIso === null
      ? null
      : feedInRatesForCommissioning(ibIso);
  // Commissioning before the EEG-2023 base values: ONE rate per class — the
  // Teil/Voll choice with distinct tariffs only exists since 30.07.2022.
  const historisch = anlage === "bestand" && !inZukunft && ibIso !== null && ibIso < FEED_IN_BASIS.validFromIso && rates !== null;
  const manuellNoetig = anlage === "bestand" && !inZukunft && datumGesetzt && rates === null;
  const effMode: "teil" | "voll" = historisch || manuellNoetig ? "teil" : mode ?? "teil";

  // ── Step order depends on the chosen path ──────────────────────────────────
  const order = useMemo<StepKey[]>(() => {
    const arr: StepKey[] = ["anlage"];
    if (anlage === "bestand") arr.push("datum");
    arr.push("groesse");
    if (!(historisch || manuellNoetig)) arr.push("art");
    if (effMode === "teil") arr.push("haushalt");
    return arr;
  }, [anlage, historisch, manuellNoetig, effMode]);
  const isResult = stepIdx >= order.length;
  const stepKey: StepKey | null = isResult ? null : order[stepIdx];
  const next = () => { setOptionsNudge(false); setStepIdx((i) => i + 1); };
  const back = () => { setOptionsNudge(false); setStepIdx((i) => Math.max(0, i - 1)); };
  const restart = () => { setStepIdx(0); setSatzOverride(null); };

  // ── Rechnung (identisch zur bisherigen Fassung) ────────────────────────────
  const computedSatz = useMemo(() => {
    if (!rates) return null;
    return calcWeightedFeedIn(
      kwp ?? 10,
      effMode === "teil" ? rates.teilUnder10 : rates.vollUnder10,
      effMode === "teil" ? rates.teilOver10 : rates.vollOver10,
      rates.thresholdKwp,
    );
  }, [kwp, effMode, rates]);
  const satz = manuellNoetig ? satzOverride ?? 0 : satzOverride ?? computedSatz ?? 0;
  // Interne Fallbacks für die Mathe, solange Schritte noch offen sind — das
  // Ergebnis ist ohne getroffene Auswahl nicht erreichbar (FlowNav sperrt).
  const kwpVal = kwp ?? 10;
  const personenVal = personenIdx ?? 2;
  const speicherVal = speicherKwh ?? 0;

  const jahresertrag = kwpVal * ertragKwp;
  // Self-consumption share only matters for Teileinspeisung — with full feed-in
  // the whole yield is exported by definition.
  const evPct = useMemo(
    () =>
      calcEigenverbrauch({
        personenIdx: personenVal,
        nutzungIdx: 1, // "Teils zuhause" — HTW-Standardprofil, same default as the PV calculator
        speicherKwh: speicherVal,
        wp: "nein",
        ea: "nein",
        eaKm: 15000,
        kwp: kwpVal,
        ertragKwp,
        baseKwh: verbrauchMode ? oVerbrauch : null,
      }),
    [personenVal, speicherVal, kwpVal, verbrauchMode, oVerbrauch, ertragKwp],
  );
  const einspeisungKwh = effMode === "voll" ? jahresertrag : Math.round(jahresertrag * (1 - evPct / 100));
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
    anlage === "bestand" && !inZukunft && ibIso !== null
      ? Math.min(FEED_IN_YEARS, Math.max(0, Math.floor((heute.getTime() - new Date(ibIso as string).getTime()) / (365.25 * 24 * 3600 * 1000))))
      : 0;
  const bereitsErhalten = verlaufJahre.slice(0, vergangeneJahre).reduce((a, b) => a + b, 0);
  const nochAusstehend = summeGesamt - bereitsErhalten;
  const endJahr = ibIso !== null ? feedInEndIso(ibIso).slice(0, 4) : "";
  const verguetungVorbei = anlage === "bestand" && vergangeneJahre >= FEED_IN_YEARS;
  // Before an old plant's rate is entered, money figures would all read "0 €"
  // and look broken — show a dash until there is a rate to multiply with.
  const geld = (n: number) => (satz === 0 ? "–" : nf(n));

  const customKwpGueltig = () => {
    const parsed = parseFloat(customKwp.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 200;
  };
  const commitCustom = () => {
    if (!customKwpGueltig()) return false;
    setKwp(Math.round(parseFloat(customKwp.replace(",", ".")) * 10) / 10);
    return true;
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
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
  const h2: React.CSSProperties = { fontSize: 18, fontWeight: 700, marginBottom: 18, color: v("--color-text-primary") };
  const zurueckBtn: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: v("--radius-md"),
    fontSize: 14,
    fontWeight: 600,
    background: "transparent",
    border: `1px solid ${v("--color-border-muted")}`,
    color: v("--color-text-secondary"),
    cursor: "pointer",
  };

  const stichtag = liveRates.validFrom.split("-").reverse().join(".");
  const periodLabel =
    anlage !== "bestand" || inZukunft
      ? `Inbetriebnahme ab ${stichtag}`
      : manuellNoetig
      ? "Satz aus deinem Bescheid"
      : `Inbetriebnahme ${ibMonat !== null ? MONATE[ibMonat - 1] : ""} ${ibJahr ?? ""}`;

  return (
    <div>
      {/* ── Fortschritt ── */}
      {!isResult && (
        <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
          {order.map((k, i) => (
            <div key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= stepIdx ? v("--color-accent") : v("--color-progress-inactive"), transition: "background 0.3s" }} />
          ))}
        </div>
      )}

      {/* ── Schritte ── */}
      {stepKey === "anlage" && (
        <div className="fu">
          <h2 style={h2}>Worum geht es?</h2>
          <div className={optionsNudge ? "sc-flow-nudge" : undefined} onAnimationEnd={() => setOptionsNudge(false)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md, borderRadius: v("--radius-md") }}>
            <OptionCard
              selected={anlage === "neu"}
              onClick={() => { setAnlage("neu"); setSatzOverride(null); flowSelect(next); }}
              icon="☀️"
              label="Neue Anlage"
              sub="Ich plane oder kaufe gerade"
            />
            <OptionCard
              selected={anlage === "bestand"}
              onClick={() => { setAnlage("bestand"); setSatzOverride(null); flowSelect(next); }}
              icon="🏠"
              label="Läuft schon"
              sub="Bestandsanlage nachrechnen"
            />
          </div>
          <div style={{ marginTop: space.lg }}>
            <FlowNav weiterAktiv={anlage !== null} onWeiter={next} zurueckSichtbar={false} onZurueck={back} onInaktivKlick={() => setOptionsNudge(true)} />
          </div>
        </div>
      )}

      {stepKey === "datum" && (
        <div className="fu">
          <h2 style={h2}>Wann ging die Anlage in Betrieb?</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-muted"), margin: `0 0 ${space.lg}px` }}>
            Das ungefähre Jahr reicht schon — der Monat macht den Satz nur genauer. Beides
            steht auch auf deinem Vergütungsbescheid oder der Jahresabrechnung.
          </p>
          <div className={optionsNudge ? "sc-flow-nudge" : undefined} onAnimationEnd={() => setOptionsNudge(false)} style={{ display: "flex", gap: space.sm, marginBottom: space.lg, borderRadius: v("--radius-md") }}>
            <SelectField value={ibMonat ?? ""} onChange={(e) => { setIbMonat(Number(e.target.value)); setSatzOverride(null); }} maxWidth={180} ariaLabel="Monat der Inbetriebnahme">
              <option value="" disabled>Monat</option>
              {MONATE.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </SelectField>
            <SelectField value={ibJahr ?? ""} onChange={(e) => { setIbJahr(Number(e.target.value)); setSatzOverride(null); }} maxWidth={140} ariaLabel="Jahr der Inbetriebnahme">
              <option value="" disabled>Jahr</option>
              {jahre.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </SelectField>
          </div>
          {ibJahr === 2022 && ibMonat === 7 && (
            <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-muted"), margin: `0 0 ${space.lg}px` }}>
              Grenzmonat: Anlagen, die am 30. oder 31. Juli 2022 in Betrieb gingen, bekommen
              bereits die höheren EEG-2023-Sätze — wähle dann August 2022.
            </p>
          )}
          {manuellNoetig && (
            <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-muted"), margin: `0 0 ${space.lg}px` }}>
              Vor April 2012 galten ältere Vergütungsmodelle (zeitweise wurde sogar der selbst
              verbrauchte Strom vergütet) — deinen Satz trägst du gleich im Ergebnis aus deinem
              Bescheid ein, den Rest rechnen wir.
            </p>
          )}
          {inZukunft && (
            <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-muted"), margin: `0 0 ${space.lg}px` }}>
              Das Datum liegt in der Zukunft — gerechnet wird mit den aktuellen Sätzen für Neuanlagen.
            </p>
          )}
          <FlowNav
            weiterAktiv={datumGesetzt}
            onWeiter={next}
            onZurueck={back}
            inaktivHinweis="Bitte Monat und Jahr wählen."
            onInaktivKlick={() => setOptionsNudge(true)}
          />
        </div>
      )}

      {stepKey === "groesse" && (
        <div className="fu">
          <h2 style={h2}>Wie groß ist die Anlage?</h2>
          <div className={optionsNudge ? "sc-flow-nudge" : undefined} onAnimationEnd={() => setOptionsNudge(false)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md, marginBottom: space.lg, borderRadius: v("--radius-md") }}>
            {KWP_PRESETS.map((p) => (
              <OptionCard
                key={p.kwp}
                selected={kwp === p.kwp && customKwp === ""}
                onClick={() => { setKwp(p.kwp); setCustomKwp(""); flowSelect(next); }}
                label={`${p.kwp} kWp`}
                sub={p.sub}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: space.md, marginBottom: space.lg }}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="eigener Wert in kWp"
              value={customKwp}
              onChange={(e) => setCustomKwp(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && commitCustom()) next(); }}
              onBlur={() => { if (customKwp !== "") commitCustom(); }}
              style={{ width: 160, padding: "10px 12px", borderRadius: v("--radius-md"), border: `1px solid ${customKwp ? v("--color-accent") : v("--color-border")}`, background: v("--color-bg-muted"), fontSize: 14, fontFamily: v("--font-text"), color: v("--color-text-primary") }}
            />
          </div>
          <FlowNav
            weiterAktiv={customKwp !== "" ? customKwpGueltig() : kwp !== null}
            onWeiter={() => { if (customKwp === "" || commitCustom()) next(); }}
            onZurueck={back}
            onInaktivKlick={() => setOptionsNudge(true)}
          />
        </div>
      )}

      {stepKey === "art" && (
        <div className="fu">
          <h2 style={h2}>Wie wird eingespeist?</h2>
          <div className={optionsNudge ? "sc-flow-nudge" : undefined} onAnimationEnd={() => setOptionsNudge(false)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md, marginBottom: space.lg, borderRadius: v("--radius-md") }}>
            <OptionCard
              selected={mode === "teil"}
              onClick={() => { setMode("teil"); setSatzOverride(null); flowSelect(next); }}
              icon="🔌"
              label="Teileinspeisung"
              sub="Nur der Überschuss geht ins Netz — der Normalfall"
            />
            <OptionCard
              selected={mode === "voll"}
              onClick={() => { setMode("voll"); setSatzOverride(null); flowSelect(next); }}
              icon="🔋"
              label="Volleinspeisung"
              sub="Alles geht ins Netz — z. B. Scheunendach ohne Verbrauch"
            />
          </div>
          <FlowNav weiterAktiv={mode !== null} onWeiter={next} onZurueck={back} onInaktivKlick={() => setOptionsNudge(true)} />
        </div>
      )}

      {stepKey === "haushalt" && (
        <div className="fu">
          <h2 style={h2}>Wer verbraucht den Strom?</h2>
          <div className={optionsNudge ? "sc-flow-nudge" : undefined} onAnimationEnd={() => setOptionsNudge(false)} style={{ borderRadius: v("--radius-md") }}>
          {/* Umschalter wie im PV-Rechner: Personen schätzen vs. Verbrauch direkt */}
          <div style={{ display: "flex", gap: 4, marginBottom: space.lg, background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: 3, border: `1px solid ${v("--color-border")}` }}>
            {[
              { m: false, lab: "Nach Personen" },
              { m: true, lab: "Verbrauch kenne ich" },
            ].map((opt) => (
              <button
                key={String(opt.m)}
                type="button"
                onClick={() => { if (opt.m !== verbrauchMode) { setVerbrauchMode(opt.m); if (!opt.m) setOVerbrauch(null); } }}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: v("--radius-sm"), fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: verbrauchMode === opt.m ? v("--color-accent") : "transparent",
                  border: "none",
                  color: verbrauchMode === opt.m ? v("--color-text-on-accent") : v("--color-text-muted"),
                  transition: "all 0.15s",
                }}
              >
                {opt.lab}
              </button>
            ))}
          </div>
          {!verbrauchMode ? (
            <>
              <div style={label}>Personen im Haushalt</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg }}>
                {PERSONEN.map((p, i) => (
                  <button key={p.label} type="button" style={chip(personenIdx === i)} onClick={() => setPersonenIdx(i)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ marginBottom: space.lg }}>
              <div style={label}>Jahresverbrauch Haushalt</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.md, background: v("--color-bg-muted"), borderRadius: v("--radius-md"), padding: "14px 16px", border: `1.5px solid ${v("--color-accent")}` }}>
                <span style={{ fontSize: 13, color: v("--color-text-secondary") }}>Dein Stromverbrauch pro Jahr</span>
                <InlineEdit value={oVerbrauch ?? PERSONEN[2].verbrauch} onCommit={(val) => setOVerbrauch(Math.round(val))} unit=" kWh" step={100} min={500} max={30000} width={72} />
              </div>
              <div style={{ fontSize: 12, color: v("--color-text-muted"), marginTop: space.md, lineHeight: 1.5 }}>
                Der Wert von deiner Stromrechnung — er bestimmt, wie viel vom Solarstrom im Haus
                bleibt statt eingespeist zu werden.
              </div>
            </div>
          )}
          <div style={label}>Batteriespeicher</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg }}>
            {SPEICHER_OPTIONS.map((s) => (
              <button key={s} type="button" style={chip(speicherKwh === s)} onClick={() => setSpeicherKwh(s)}>
                {s === 0 ? "Kein Speicher" : `${s} kWh`}
              </button>
            ))}
          </div>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-muted"), margin: `0 0 ${space.lg}px` }}>
            Daraus schätzen wir den Eigenverbrauch — was du selbst verbrauchst, wird nicht
            eingespeist und taucht deshalb nicht in der Vergütung auf.
          </p>
          <FlowNav weiterAktiv={(verbrauchMode ? oVerbrauch !== null : personenIdx !== null) && speicherKwh !== null} onWeiter={next} onZurueck={back} weiterLabel="Ergebnis anzeigen" inaktivHinweis={verbrauchMode ? "Bitte Verbrauch eintragen und Speicher wählen." : "Bitte Personen und Speicher wählen."} onInaktivKlick={() => setOptionsNudge(true)} />
        </div>
      )}

      {/* ── Ergebnis ── */}
      {isResult && (
        <div className="fu">
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
            {historisch && (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary"), margin: `0 0 ${space.md}px` }}>
                Für diesen Jahrgang gab es einen einheitlichen Vergütungssatz — die Wahl zwischen
                Teil- und Volleinspeisung mit eigenen Sätzen kam erst mit dem EEG 2023.
              </p>
            )}
            {manuellNoetig && satzOverride === null && (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary"), margin: `0 0 ${space.md}px` }}>
                Für Inbetriebnahmen vor April 2012 gelten ältere Vergütungsmodelle — ein
                automatischer Wert wäre hier oft falsch. Klick auf den Wert und trag den Satz
                aus deinem Bescheid oder deiner Abrechnung ein.
              </p>
            )}
            {satzOverride !== null && computedSatz !== null && !manuellNoetig && (
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
            {satzOverride === null && !manuellNoetig && rates && kwpVal > rates.thresholdKwp && (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: v("--color-text-secondary"), margin: `0 0 ${space.md}px` }}>
                Gewichteter Mischsatz: Die ersten {rates.thresholdKwp} kWp bekommen{" "}
                {ctFmt(effMode === "teil" ? rates.teilUnder10 : rates.vollUnder10)} ct/kWh, die weiteren{" "}
                {(kwpVal - rates.thresholdKwp).toLocaleString("de-DE")} kWp{" "}
                {ctFmt(effMode === "teil" ? rates.teilOver10 : rates.vollOver10)} ct/kWh.
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
              {effMode === "teil" && (
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

          <div style={{ display: "flex", gap: space.md, marginBottom: space.xl }}>
            <button type="button" onClick={back} style={zurueckBtn}>Zurück</button>
            <button type="button" onClick={restart} style={zurueckBtn}>Neu berechnen</button>
          </div>

          <p style={{ fontSize: 13, lineHeight: 1.7, color: v("--color-text-muted"), marginBottom: space.lg }}>
            Annahmen: Standort-Ertrag {nf(ertragKwp)} kWh je kWp
            {standortYield !== null ? " (dein Standort)" : " (konservativer Deutschland-Durchschnitt)"}
            {neigungsFaktor < 1 ? ", inklusive Dachneigung und Ausrichtung" : ""}, Nutzungsprofil „teils zuhause",{" "}
            {(DEGRAD * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % Moduldegradation
            pro Jahr, gerechnet in ganzen Anlagenjahren. Die Vergütung ist nur die halbe Wahrheit:
            Den größeren Teil des Nutzens bringt der Eigenverbrauch. Beides zusammen, mit deinem
            Standort und aktuellen Marktpreisen, rechnet der Photovoltaik-Rechner.
          </p>
          {/* Standort und Dach — im geteilten Ergebnis-Abschnitt, wie in jedem
               anderen Rechner. Vorher war das ein handgebauter Aufklapper mit
               eigenem Chevron und eigenem Öffnen-Zustand; drei Fassungen
               desselben Musters waren der Grund für ResultSection. */}
          <ResultSection
            title="Standort und Dach"
            summary={dachZusammenfassung()}
          >
            <div style={{ fontSize: 13, marginBottom: space.lg }}>
              <StandortField plz={plz} onPlzChange={onPlzChange} loading={plzLoading} confirmed={plzConfirmed} onSubmit={() => fetchPvgis(plz)} />
            </div>
            <div style={{ borderTop: `1px solid ${v("--color-border")}`, margin: `0 0 ${space.lg}px` }} />
            <DachField
              dachartIdx={dachartIdx}
              setDachartIdx={setDachartIdx}
              ausrichtung={ausrichtung}
              setAusrichtung={setAusrichtung}
              neigungGrad={neigungGrad}
              setNeigungGrad={setNeigungGrad}
              beantwortet={dachAnswered}
              markiereBeantwortet={markDachAnswered}
              bearbeitet={dachEditing}
              setBearbeitet={setDachEditing}
              hinweis={dachErtragHinweis(ertragKwp, dachartIdx, ausrichtung, standortYield !== null, neigungGrad)}
            />
          </ResultSection>

          {anlage === "neu" && (
            <Link
              href="/photovoltaik-rechner"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 20px", borderRadius: v("--radius-md"), fontSize: 14, fontWeight: 700, background: v("--color-accent"), color: v("--color-text-on-accent"), textDecoration: "none", marginBottom: space.xl }}
            >
              Komplette Rechnung: Lohnt sich die Anlage? <IconArrowRight size={iconSizes.sm} />
            </Link>
          )}

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
            2024: eingefrorene Basiswerte des EEG 2023; April 2012 bis Juli 2022: Archivtabellen
            der Bundesnetzagentur (feste Einspeisevergütung für Dachanlagen); Laufzeit nach
            § 25 EEG. Alle Angaben ohne Gewähr — verbindlich sind Gesetz, Bundesnetzagentur und
            dein Vergütungsbescheid. Alle aktuellen Werte mit Stand-Datum:{" "}
            <Link href="/datenstand" style={{ color: "inherit", textDecoration: "underline" }}>Datenstand</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
