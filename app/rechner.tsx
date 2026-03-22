"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

const YEAR = 2026;
const YEARS = 25;
const DEGRAD = 0.005;

const ANLAGEN = [
  { kwp: 5, label: "5 kWp", sub: "Klein · ~12 Module", icon: "🔆" },
  { kwp: 8, label: "8 kWp", sub: "Mittel · ~19 Module", icon: "🔆" },
  { kwp: 10, label: "10 kWp", sub: "Standard · ~24 Module", icon: "☀️" },
  { kwp: 15, label: "15 kWp", sub: "Groß · ~36 Module", icon: "☀️" },
];

const SPEICHER = [
  { kwh: 0, label: "Kein Speicher", sub: "Nur Direktverbrauch", icon: "—" },
  { kwh: 5, label: "5 kWh", sub: "Kompakt", icon: "🔋" },
  { kwh: 10, label: "10 kWh", sub: "Standard", icon: "🔋" },
  { kwh: 15, label: "15 kWh", sub: "Groß", icon: "🔋" },
];

const PERSONEN = [
  { label: "1", verbrauch: 1800 },
  { label: "2", verbrauch: 2800 },
  { label: "3–4", verbrauch: 3800 },
  { label: "5+", verbrauch: 5000 },
];

const NUTZUNG = [
  { label: "Tagsüber weg", sub: "Klassisch berufstätig", tagQuote: 0.25 },
  { label: "Teils zuhause", sub: "1–2 Tage Homeoffice", tagQuote: 0.40 },
  { label: "Homeoffice", sub: "Überwiegend daheim", tagQuote: 0.55 },
  { label: "Immer zuhause", sub: "Rente, Elternzeit …", tagQuote: 0.65 },
];

const TRI = [
  { id: "nein", label: "Nein" },
  { id: "geplant", label: "Geplant" },
  { id: "ja", label: "Vorhanden" },
];

const EA_KM_PRESETS = [10000, 15000, 20000];

const SCENARIOS = [
  { id: "pessimistic", label: "Pessimistisch", color: "#ef4444", strom: 0.01, evDelta: -5 },
  { id: "realistic", label: "Realistisch", color: "#22c55e", strom: 0.03, evDelta: 0 },
  { id: "optimistic", label: "Optimistisch", color: "#3b82f6", strom: 0.05, evDelta: 5 },
];

function estimateCost(kwp: number, spKwh: number): number {
  const pv = kwp <= 10 ? kwp * 1500 : 10 * 1500 + (kwp - 10) * 1350;
  const sp = spKwh > 0 ? 2000 + spKwh * 650 : 0;
  return Math.round((pv + sp) / 500) * 500;
}

function calcEigenverbrauch({ personenIdx, nutzungIdx, speicherKwh, wp, ea, eaKm, kwp, ertragKwp }: { personenIdx: number; nutzungIdx: number; speicherKwh: number; wp: string; ea: string; eaKm: number; kwp: number; ertragKwp: number }): number {
  const jahresertrag = kwp * ertragKwp;
  const grundverbrauch = PERSONEN[personenIdx].verbrauch;
  const tagQuote = NUTZUNG[nutzungIdx].tagQuote;
  let extra = 0;
  if (wp !== "nein") extra += 3500;
  if (ea !== "nein") extra += Math.round(eaKm * 0.18);
  const gesamt = grundverbrauch + extra;
  // Verhältnis Anlagengröße zu Verbrauch (kWp pro MWh)
  const x = kwp / (gesamt / 1000);
  // Basis-Eigenverbrauch: empirisches Power-Law (angelehnt an HTW Berlin Studien)
  // Größere Anlage relativ zum Verbrauch → niedrigerer EV-Anteil
  // tagQuote skaliert nach Nutzungsprofil (mehr zuhause → mehr Direktverbrauch)
  const evBase = tagQuote * Math.pow(x, -0.6);
  // Speicher-Boost: verschiebt Nachtverbrauch auf Solar
  // Sättigungseffekt bei größerem Speicher relativ zur Anlage
  const batteryRatio = speicherKwh / kwp;
  const evBoost = speicherKwh > 0
    ? 0.35 * Math.pow(x, -0.45) * (1 - Math.exp(-batteryRatio * 1.5))
    : 0;
  // Physikalische Grenze: max. Eigenverbrauch = Gesamtverbrauch / Jahresertrag
  const evMax = gesamt / jahresertrag;
  const ev = Math.round(Math.min(evBase + evBoost, evMax, 0.90) * 100);
  return Math.max(10, Math.min(ev, 90));
}

function calc({ kwp, kosten, strompreis, eigenverbrauch, einspeisung, stromSteigerung, ertragKwp }: { kwp: number; kosten: number; strompreis: number; eigenverbrauch: number; einspeisung: number; stromSteigerung: number; ertragKwp: number }) {
  const years = [];
  let kum = -kosten;
  for (let i = 0; i <= YEARS; i++) {
    const ertrag = kwp * ertragKwp * Math.pow(1 - DEGRAD, i);
    const eigenKwh = ertrag * (eigenverbrauch / 100);
    const einspKwh = ertrag - eigenKwh;
    const sp = strompreis * Math.pow(1 + stromSteigerung, i);
    const j = i === 0 ? 0 : eigenKwh * sp + einspKwh * (einspeisung / 100);
    kum += j;
    years.push({ year: YEAR + i, i, kum: Math.round(kum), j: Math.round(j) });
  }
  const be = years.find((y, idx) => idx > 0 && y.kum >= 0);
  return { years, be, total: years[YEARS].kum };
}

// ─── Editable inline value ───────────────────────────────────────────────────
function InlineEdit({ value, onCommit, unit, step = 1, min = 0, max = 99999, width = 72, fmt }: { value: number; onCommit: (v: number) => void; unit: string; step?: number; min?: number; max?: number; width?: number; fmt?: (v: number) => string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const commit = () => {
    const raw = draft.replace(",", ".");
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= min && n <= max) {
      onCommit(Math.round(n * 1000) / 1000);
    }
    setEditing(false);
  };

  const display = fmt ? fmt(value) : (typeof value === "number" && value >= 1000 ? value.toLocaleString("de-DE") : String(value));

  if (!editing) {
    return (
      <span
        onClick={startEdit}
        style={{
          cursor: "pointer", borderBottom: "1px dashed #555",
          padding: "2px 0 3px", display: "inline-flex", alignItems: "baseline", gap: 2,
          color: "#fff", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
          fontSize: "inherit", minHeight: 24, lineHeight: 1.4,
        }}
        title="Klicken zum Bearbeiten"
      >
        {display}{unit && <span style={{ color: "#888", fontWeight: 500 }}>{unit}</span>}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") setEditing(false); }}
        style={{
          width, textAlign: "right", fontSize: "inherit", fontWeight: 700,
          fontFamily: "'JetBrains Mono',monospace", color: "#22c55e",
          background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e",
          borderRadius: 6, padding: "3px 6px", outline: "none",
        }}
      />
      {unit && <span style={{ color: "#888", fontWeight: 500 }}>{unit}</span>}
    </span>
  );
}

// ─── Chart ───────────────────────────────────────────────────────────────────
function Chart({ scenarios, kosten }: { scenarios: { id: string; color: string; data: { years: { i: number; kum: number }[]; be: { i: number; kum: number } | undefined } }[]; kosten: number }) {
  const W = 640, H = 280;
  const P = { t: 24, r: 16, b: 32, l: 52 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const allV = scenarios.flatMap(s => s.data.years.map(y => y.kum));
  const yMin = Math.floor(Math.min(...allV, -kosten) / 5000) * 5000;
  const yMax = Math.ceil(Math.max(...allV) / 5000) * 5000;
  const yR = yMax - yMin || 1;
  const x = (i: number) => P.l + (i / YEARS) * cW;
  const y = (v: number) => P.t + cH - ((v - yMin) / yR) * cH;
  const tStep = yR <= 30000 ? 5000 : yR <= 60000 ? 10000 : 20000;
  const yTicks = [];
  for (let v = yMin; v <= yMax; v += tStep) yTicks.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x={P.l} y={y(yMax)} width={cW} height={y(0) - y(yMax)} fill="rgba(34,197,94,0.05)" />
      <rect x={P.l} y={y(0)} width={cW} height={y(yMin) - y(0)} fill="rgba(239,68,68,0.05)" />
      {yTicks.map(v => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#555" : "#252525"} strokeWidth={v === 0 ? 1.5 : 0.5} />
          <text x={P.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#666" fontFamily="'JetBrains Mono',monospace">{(v / 1000).toFixed(0)}k</text>
        </g>
      ))}
      {[0, 5, 10, 15, 20, 25].map(i => (
        <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize={10} fill="#666" fontFamily="'JetBrains Mono',monospace">{YEAR + i}</text>
      ))}
      {scenarios.map(s => {
        const pts = s.data.years.map((yr, i) => `${x(i)},${y(yr.kum)}`).join(" ");
        return (
          <g key={s.id}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" opacity={s.id === "realistic" ? 1 : 0.45} />
            {s.data.be && (
              <>
                <circle cx={x(s.data.be.i)} cy={y(s.data.be.kum)} r={4.5} fill={s.color} stroke="#111" strokeWidth={2} />
                <text x={x(s.data.be.i)} y={y(s.data.be.kum) - 11} textAnchor="middle" fontSize={11} fontWeight="700" fill={s.color} fontFamily="'JetBrains Mono',monospace">{s.data.be.i}J</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Reusable components ─────────────────────────────────────────────────────
function OptionCard({ selected, onClick, icon = null, label, sub }: { selected: boolean; onClick: () => void; icon?: string | null; label: string; sub: string }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "14px 8px", borderRadius: 14, cursor: "pointer",
      background: selected ? "rgba(34,197,94,0.1)" : "#161616",
      border: selected ? "2px solid #22c55e" : "2px solid #2a2a2a",
      color: "#f0f0f0", textAlign: "center", minHeight: 78, width: "100%",
    }}>
      {icon && <div style={{ fontSize: 18, marginBottom: 3 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#888", marginTop: 2, lineHeight: 1.3 }}>{sub}</div>}
    </button>
  );
}

function TriToggle({ options, value, onChange, label }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {options.map(o => (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            flex: 1, padding: "10px 8px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: "pointer", textAlign: "center",
            background: value === o.id ? "rgba(34,197,94,0.1)" : "#161616",
            border: value === o.id ? "2px solid #22c55e" : "2px solid #2a2a2a",
            color: value === o.id ? "#22c55e" : "#999",
          }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

// ─── URL param helpers ────────────────────────────────────────────────────────
const SHARE_KEYS = ["a", "s", "p", "n", "wp", "ea", "k", "ev", "st", "ei", "eia", "er", "ck", "km"];

function paramInt(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: number, min = 0, max = 99): number {
  const v = params?.[key];
  if (typeof v === "string") { const n = parseInt(v); if (!isNaN(n) && n >= min && n <= max) return n; }
  return fallback;
}

function paramFloat(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: number, min = 0, max = 99999): number {
  const v = params?.[key];
  if (typeof v === "string") { const n = parseFloat(v); if (!isNaN(n) && isFinite(n) && n >= min && n <= max) return n; }
  return fallback;
}

function paramStr(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: string, allowed: string[]): string {
  const v = params?.[key];
  if (typeof v === "string" && allowed.includes(v)) return v;
  return fallback;
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function PVRechner({ initialParams }: { initialParams?: Record<string, string | string[] | undefined> }) {
  const hasShare = initialParams && SHARE_KEYS.some(k => k in initialParams);

  const [step, setStep] = useState(hasShare ? 4 : 0);
  const [anlage, setAnlage] = useState(hasShare ? paramInt(initialParams, "a", 2, 0, 4) : 2);
  const [customKwp, setCustomKwp] = useState(hasShare ? paramInt(initialParams, "ck", 12, 1, 50) : 12);
  const [speicher, setSpeicher] = useState(hasShare ? paramInt(initialParams, "s", 0, 0, 3) : 0);
  const [personen, setPersonen] = useState(hasShare ? paramInt(initialParams, "p", 1, 0, 3) : 1);
  const [nutzung, setNutzung] = useState(hasShare ? paramInt(initialParams, "n", 1, 0, 3) : 1);
  const [wp, setWp] = useState(hasShare ? paramStr(initialParams, "wp", "nein", ["nein", "geplant", "ja"]) : "nein");
  const [ea, setEa] = useState(hasShare ? paramStr(initialParams, "ea", "nein", ["nein", "geplant", "ja"]) : "nein");
  const [eaKm, setEaKm] = useState(hasShare ? paramInt(initialParams, "km", 15000, 1000, 50000) : 15000);

  // Editable overrides (null = use auto-calculated)
  const [oKosten, setOKosten] = useState<number | null>(hasShare && initialParams?.k ? (() => { const n = Number(initialParams.k); return isFinite(n) && n >= 1000 && n <= 200000 ? n : null; })() : null);
  const [oEv, setOEv] = useState<number | null>(hasShare && initialParams?.ev ? (() => { const n = Number(initialParams.ev); return isFinite(n) && n >= 5 && n <= 95 ? n : null; })() : null);
  const [oStrom, setOStrom] = useState(hasShare ? paramFloat(initialParams, "st", 0.34, 0.05, 1.0) : 0.34);
  const [oEinsp, setOEinsp] = useState(hasShare ? paramFloat(initialParams, "ei", 8.03, 0, 20) : 8.03);
  const [einspeisungAn, setEinspeisungAn] = useState(hasShare ? initialParams?.eia !== "0" : true);
  const [oErtrag, setOErtrag] = useState(hasShare ? paramInt(initialParams, "er", 950, 700, 1200) : 950);

  // Share state
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && !!navigator.share); }, []);

  const kwp = anlage <= 3 ? ANLAGEN[anlage].kwp : customKwp;
  const spKwh = SPEICHER[speicher].kwh;
  const kosten = oKosten !== null ? oKosten : estimateCost(kwp, spKwh);
  const autoEv = calcEigenverbrauch({ personenIdx: personen, nutzungIdx: nutzung, speicherKwh: spKwh, wp, ea, eaKm, kwp, ertragKwp: oErtrag });
  const effEv = oEv !== null ? oEv : autoEv;
  const jahresertrag = kwp * oErtrag;

  const scenarioData = useMemo(() =>
    SCENARIOS.map(s => ({
      ...s,
      data: calc({ kwp, kosten, strompreis: oStrom, eigenverbrauch: Math.min(effEv + s.evDelta, 95), einspeisung: einspeisungAn ? oEinsp : 0, stromSteigerung: s.strom, ertragKwp: oErtrag }),
    })), [kwp, kosten, oStrom, effEv, oEinsp, einspeisungAn, oErtrag, eaKm]);

  const real = scenarioData.find(s => s.id === "realistic")!;
  const be = real.data.be;

  const STEPS = ["Wie groß soll die Anlage werden?", "Batteriespeicher?", "Dein Haushalt", "Großverbraucher"];
  const isResult = step >= STEPS.length;
  const next = () => step < STEPS.length && setStep(step + 1);
  const back = () => step > 0 && setStep(step - 1);
  const restart = () => { setStep(0); setOKosten(null); setOEv(null); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname); };

  const buildShareUrl = () => {
    const p = new URLSearchParams();
    p.set("a", String(anlage));
    p.set("s", String(speicher));
    p.set("p", String(personen));
    p.set("n", String(nutzung));
    p.set("wp", wp);
    p.set("ea", ea);
    if (ea !== "nein") p.set("km", String(eaKm));
    if (anlage === 4) p.set("ck", String(customKwp));
    if (oKosten !== null) p.set("k", String(oKosten));
    if (oEv !== null) p.set("ev", String(oEv));
    p.set("st", String(oStrom));
    p.set("ei", String(oEinsp));
    p.set("eia", einspeisungAn ? "1" : "0");
    p.set("er", String(oErtrag));
    return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
  };

  const shareText = `Meine PV-Anlage (${kwp} kWp) amortisiert sich in ${be ? be.i : ">25"} Jahren.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { prompt("Link kopieren:", buildShareUrl()); }
  };

  const handleNativeShare = async () => {
    try { await navigator.share({ title: "PV Rechner – Mein Ergebnis", text: shareText, url: buildShareUrl() }); } catch {}
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + buildShareUrl())}`, "_blank");
  };

  return (
    <div style={{ background: "#0c0c0c", fontFamily: "'DM Sans',system-ui,sans-serif", color: "#f0f0f0", minHeight: "100vh", padding: "20px 16px" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type=number]{-moz-appearance:textfield}
        @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fu .3s ease-out}
      `}</style>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>PV Rechner</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.2 }}>Lohnt sich Photovoltaik?</h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Ehrlich berechnet. Ohne Leadfunnel.</p>
        </div>

        {/* Progress */}
        {!isResult && (
          <div style={{ display: "flex", gap: 4, marginBottom: 28 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? "#22c55e" : "#282828", transition: "background 0.3s" }} />
            ))}
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {!isResult && (
          <div className="fu" key={step}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, color: "#fff" }}>{STEPS[step]}</h2>

            {step === 0 && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {ANLAGEN.map((a, i) => (
                    <OptionCard key={i} selected={anlage === i} onClick={() => { setAnlage(i); setOKosten(null); setOEv(null); }} label={a.label} sub={a.sub} icon={a.icon} />
                  ))}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginTop: 14, fontSize: 13, color: "#666",
                }}>
                  <span>oder</span>
                  <InlineEdit value={customKwp} onCommit={v => { setCustomKwp(Math.round(v)); setAnlage(4); setOKosten(null); setOEv(null); }} unit=" kWp" step={1} min={1} max={50} width={48} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {SPEICHER.map((s, i) => (
                  <OptionCard key={i} selected={speicher === i} onClick={() => { setSpeicher(i); setOKosten(null); }} label={s.label} sub={s.sub} icon={s.icon} />
                ))}
              </div>
            )}

            {step === 2 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#999", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Personen im Haushalt</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 20 }}>
                  {PERSONEN.map((p, i) => (
                    <button key={i} onClick={() => { setPersonen(i); setOEv(null); }} style={{
                      padding: "10px 4px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "center",
                      background: personen === i ? "rgba(34,197,94,0.1)" : "#161616",
                      border: personen === i ? "2px solid #22c55e" : "2px solid #2a2a2a",
                      color: personen === i ? "#22c55e" : "#ccc",
                    }}>{p.label}</button>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#999", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Nutzungsprofil</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {NUTZUNG.map((n, i) => (
                    <OptionCard key={i} selected={nutzung === i} onClick={() => { setNutzung(i); setOEv(null); }} label={n.label} sub={n.sub} />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <TriToggle label="⚡ Wärmepumpe" options={TRI} value={wp} onChange={v => { setWp(v); setOEv(null); }} />
                <TriToggle label="🚗 Elektroauto" options={TRI} value={ea} onChange={v => { setEa(v); setOEv(null); }} />
                {ea !== "nein" && (
                  <div style={{ marginBottom: 18, marginTop: -10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#777", marginBottom: 6 }}>Laufleistung ca.</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {EA_KM_PRESETS.map(km => (
                        <button key={km} onClick={() => { setEaKm(km); setOEv(null); }} style={{
                          padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: eaKm === km ? "rgba(34,197,94,0.1)" : "#161616",
                          border: eaKm === km ? "1.5px solid #22c55e" : "1.5px solid #2a2a2a",
                          color: eaKm === km ? "#22c55e" : "#999",
                        }}>{(km / 1000).toFixed(0)}k</button>
                      ))}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input
                          value={EA_KM_PRESETS.includes(eaKm) ? "" : String(eaKm)}
                          placeholder="km"
                          onChange={e => {
                            const n = parseInt(e.target.value.replace(/\D/g, ""));
                            if (!isNaN(n) && n >= 1000 && n <= 50000) { setEaKm(n); setOEv(null); }
                          }}
                          style={{
                            width: 56, textAlign: "center", fontSize: 12, fontWeight: 600,
                            fontFamily: "'JetBrains Mono',monospace",
                            color: !EA_KM_PRESETS.includes(eaKm) ? "#22c55e" : "#666",
                            background: !EA_KM_PRESETS.includes(eaKm) ? "rgba(34,197,94,0.1)" : "#161616",
                            border: !EA_KM_PRESETS.includes(eaKm) ? "1.5px solid #22c55e" : "1.5px solid #2a2a2a",
                            borderRadius: 8, padding: "7px 4px", outline: "none",
                          }}
                        />
                        <span style={{ fontSize: 11, color: "#666" }}>km</span>
                      </span>
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#666", marginTop: 4, lineHeight: 1.5 }}>
                  Beides erhöht den Eigenverbrauch deutlich — weniger Einspeisung, mehr Ersparnis.
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              {step > 0 ? (
                <button onClick={back} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, background: "transparent", border: "1px solid #333", color: "#888", cursor: "pointer" }}>Zurück</button>
              ) : <div />}
              <button onClick={next} style={{ padding: "10px 32px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: "#22c55e", border: "none", color: "#000", cursor: "pointer" }}>
                {step === STEPS.length - 1 ? "Berechnen ✦" : "Weiter →"}
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {isResult && (
          <div className="fu">
            {/* Hero with amortisation */}
            <div style={{
              textAlign: "center", padding: "24px 20px 20px", marginBottom: 16,
              background: "#111", borderRadius: 20, border: "1px solid #1e3a1e",
            }}>
              <div style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
                Deine PV-Anlage amortisiert sich in
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, color: "#22c55e", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
                {be ? be.i : ">25"}<span style={{ fontSize: 22, fontWeight: 600, marginLeft: 4 }}>Jahren</span>
              </div>

              {/* Editable parameters grid */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px",
                marginTop: 18, padding: "14px 16px", background: "rgba(255,255,255,0.03)",
                borderRadius: 12, textAlign: "left", fontSize: 13,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#777" }}>Investition</span>
                  <InlineEdit value={kosten} onCommit={v => setOKosten(v)} unit=" €" step={500} min={3000} max={80000} width={68} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#777" }}>Eigenverbr.</span>
                  <InlineEdit value={effEv} onCommit={v => setOEv(v)} unit="%" step={1} min={10} max={90} width={40} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#777" }}>Strompreis</span>
                  <InlineEdit value={oStrom} onCommit={setOStrom} unit=" €" step={0.01} min={0.15} max={0.60} width={52} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#777" }}>Einspeisung</span>
                    <span onClick={() => setEinspeisungAn(!einspeisungAn)} style={{
                      width: 32, height: 18, borderRadius: 9, padding: 2, cursor: "pointer",
                      background: einspeisungAn ? "#22c55e" : "#333", transition: "background 0.2s",
                      display: "inline-flex", alignItems: "center", flexShrink: 0,
                    }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: "50%", background: "#fff",
                        transform: einspeisungAn ? "translateX(14px)" : "translateX(0)",
                        transition: "transform 0.2s",
                      }} />
                    </span>
                  </span>
                  {einspeisungAn ? (
                    <InlineEdit value={oEinsp} onCommit={setOEinsp} unit=" ct" step={0.01} min={4} max={12} width={48} />
                  ) : (
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#555", fontSize: 13 }}>aus</span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#777" }}>Ertrag</span>
                  <InlineEdit value={oErtrag} onCommit={setOErtrag} unit=" kWh/kWp" step={10} min={700} max={1200} width={48} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#777" }}>Anlage</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#fff", fontSize: 13 }}>
                    {kwp} kWp{spKwh > 0 ? ` + ${spKwh} kWh` : ""}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#555", marginTop: 10 }}>
                Werte anklicken zum Anpassen
              </div>
            </div>

            {/* Quick Settings */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Was wäre wenn?</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => { setWp(wp === "nein" ? "ja" : "nein"); setOEv(null); setOKosten(null); }} style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: wp !== "nein" ? "rgba(34,197,94,0.1)" : "#151515",
                  border: wp !== "nein" ? "1.5px solid #22c55e" : "1.5px solid #2a2a2a",
                  color: wp !== "nein" ? "#22c55e" : "#888",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  ⚡ Wärmepumpe
                  {wp !== "nein" && <span style={{ fontSize: 10, opacity: 0.7 }}>✓</span>}
                </button>
                <button onClick={() => { setEa(ea === "nein" ? "ja" : "nein"); setOEv(null); setOKosten(null); }} style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: ea !== "nein" ? "rgba(34,197,94,0.1)" : "#151515",
                  border: ea !== "nein" ? "1.5px solid #22c55e" : "1.5px solid #2a2a2a",
                  color: ea !== "nein" ? "#22c55e" : "#888",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  🚗 E-Auto
                  {ea !== "nein" && <span style={{ fontSize: 10, opacity: 0.7 }}>✓</span>}
                </button>
                <button onClick={() => { setSpeicher(speicher === 0 ? 2 : 0); setOKosten(null); setOEv(null); }} style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: speicher > 0 ? "rgba(34,197,94,0.1)" : "#151515",
                  border: speicher > 0 ? "1.5px solid #22c55e" : "1.5px solid #2a2a2a",
                  color: speicher > 0 ? "#22c55e" : "#888",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  🔋 Speicher
                  {speicher > 0 && <span style={{ fontSize: 10, opacity: 0.7 }}>{spKwh} kWh ✓</span>}
                </button>
              </div>
              {ea !== "nein" && (
                <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", paddingLeft: 4 }}>
                  <span style={{ fontSize: 11, color: "#666" }}>Laufleistung:</span>
                  {EA_KM_PRESETS.map(km => (
                    <button key={km} onClick={() => { setEaKm(km); setOEv(null); }} style={{
                      padding: "5px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: eaKm === km ? "rgba(34,197,94,0.1)" : "#151515",
                      border: eaKm === km ? "1px solid #22c55e" : "1px solid #2a2a2a",
                      color: eaKm === km ? "#22c55e" : "#777",
                    }}>{(km / 1000).toFixed(0)}k</button>
                  ))}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <input
                      value={EA_KM_PRESETS.includes(eaKm) ? "" : String(eaKm)}
                      placeholder="km"
                      onChange={e => {
                        const n = parseInt(e.target.value.replace(/\D/g, ""));
                        if (!isNaN(n) && n >= 1000 && n <= 50000) { setEaKm(n); setOEv(null); }
                      }}
                      style={{
                        width: 48, textAlign: "center", fontSize: 11, fontWeight: 600,
                        fontFamily: "'JetBrains Mono',monospace",
                        color: !EA_KM_PRESETS.includes(eaKm) ? "#22c55e" : "#555",
                        background: !EA_KM_PRESETS.includes(eaKm) ? "rgba(34,197,94,0.1)" : "#151515",
                        border: !EA_KM_PRESETS.includes(eaKm) ? "1px solid #22c55e" : "1px solid #2a2a2a",
                        borderRadius: 6, padding: "5px 4px", outline: "none",
                      }}
                    />
                    <span style={{ fontSize: 10, color: "#555" }}>km</span>
                  </span>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "#151515", borderRadius: 14, padding: "14px 16px", border: "1px solid #252525" }}>
                <div style={{ fontSize: 11, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Rendite 25 Jahre</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: real.data.total >= 0 ? "#22c55e" : "#ef4444", marginTop: 4 }}>
                  {real.data.total > 0 ? "+" : ""}{real.data.total.toLocaleString("de-DE")} €
                </div>
              </div>
              <div style={{ background: "#151515", borderRadius: 14, padding: "14px 16px", border: "1px solid #252525" }}>
                <div style={{ fontSize: 11, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>⌀ Ersparnis / Jahr</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: "#f0f0f0", marginTop: 4 }}>
                  {Math.round((real.data.total + kosten) / YEARS).toLocaleString("de-DE")} €
                </div>
              </div>
            </div>

            {/* Chart */}
            <div style={{ background: "#131313", borderRadius: 16, padding: "14px 10px 6px", marginBottom: 16, border: "1px solid #222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 6px", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ddd" }}>Amortisation</span>
                <div style={{ display: "flex", gap: 12 }}>
                  {SCENARIOS.map(s => (
                    <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#888" }}>
                      <span style={{ width: 8, height: 3, borderRadius: 2, background: s.color, display: "inline-block", opacity: s.id === "realistic" ? 1 : 0.5 }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
              <Chart scenarios={scenarioData} kosten={kosten} />
            </div>

            {/* Scenario pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {scenarioData.map(s => (
                <div key={s.id} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center",
                  background: "#151515", borderTop: `3px solid ${s.color}`,
                }}>
                  <div style={{ fontSize: 10, color: s.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: "#f0f0f0", margin: "4px 0 2px" }}>{s.data.be ? `${s.data.be.i} J.` : ">25 J."}</div>
                  <div style={{ fontSize: 10, color: "#666" }}>Strom +{(s.strom * 100).toFixed(0)}%/a</div>
                </div>
              ))}
            </div>

            {/* Methodology note */}
            <div style={{
              background: "#131313", borderRadius: 12, padding: "12px 16px", marginBottom: 16,
              border: "1px solid #222", fontSize: 12, color: "#666", lineHeight: 1.6,
            }}>
              <span style={{ fontWeight: 700, color: "#888" }}>Transparent: </span>
              Degradation 0,5%/Jahr · Einspeisevergütung fix 20 J. · Wartungskosten nicht einberechnet (~150–250 €/Jahr empfohlen)
            </div>

            {/* Share */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={handleCopy} style={{
                flex: 1, padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: copied ? "rgba(34,197,94,0.15)" : "#161616",
                border: copied ? "1px solid #22c55e" : "1px solid #2a2a2a",
                color: copied ? "#22c55e" : "#999", cursor: "pointer",
                transition: "all 0.2s",
              }}>
                {copied ? "✓ Kopiert!" : "🔗 Link kopieren"}
              </button>
              {canShare && (
                <button onClick={handleNativeShare} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: "#161616", border: "1px solid #2a2a2a", color: "#999", cursor: "pointer",
                }}>
                  📤 Teilen
                </button>
              )}
              <button onClick={handleWhatsApp} style={{
                flex: 1, padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: "#161616", border: "1px solid #2a2a2a", color: "#999", cursor: "pointer",
              }}>
                💬 WhatsApp
              </button>
            </div>

            {/* Restart */}
            <button onClick={restart} style={{
              width: "100%", padding: "12px", borderRadius: 12, fontSize: 13, fontWeight: 600,
              background: "transparent", border: "1px solid #333", color: "#888", cursor: "pointer",
            }}>↺ Neu berechnen</button>

            <div style={{ textAlign: "center", fontSize: 11, color: "#444", padding: "20px 0 8px", lineHeight: 1.6 }}>
              Keine Datensammlung · Keine Werbung<br />
              Alle Angaben ohne Gewähr · Keine Steuer- oder Anlageberatung
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "24px 0 16px" }}>
          <Link href="/impressum" style={{ fontSize: 11, color: "#555", textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: 11, color: "#555", textDecoration: "none" }}>Datenschutz</Link>
        </div>
      </div>
    </div>
  );
}
