"use client";

import { useEffect, useMemo, useState } from "react";

// ─── Configuration ──────────────────────────────────────────────────────────
// Polling cadence — keep this in sync with the API cache (300s).
const POLL_INTERVAL_MS = 5 * 60 * 1000;

// Origins permitted to override the widget theme via postMessage.
const ALLOWED_ORIGINS = [
  "https://sebastianschaeder.de",
  "https://www.sebastianschaeder.de",
  "http://localhost:4321",
  "http://localhost:4322",
];

// CSS variables a parent page may override. Anything outside this list is ignored.
const ALLOWED_VARS = [
  "--widget-bg",
  "--widget-fg",
  "--widget-muted",
  "--widget-accent",
  "--widget-accent-fg",
  "--widget-border-radius",
  "--widget-font-family",
];

// ─── Types ──────────────────────────────────────────────────────────────────
interface StrommixData {
  updatedAt: string;
  mix: {
    solar: number;
    wind: number;
    gas: number;
    kohle: number;
    sonstige: number;
  };
  co2PerKwh: number;
}

type SegmentKey = keyof StrommixData["mix"];

// ─── Energy palette (hardcoded — not theme variables) ────────────────────────
// Solar uses --widget-accent so brand color drives the highlight value.
// All other segments are fixed energy-source colors.
const SEGMENT_COLORS: Record<Exclude<SegmentKey, "solar">, string> = {
  wind: "#66BB6A",
  gas: "#BC8F6F",
  kohle: "#5D4037",
  sonstige: "#BDBDBD",
};

const SEGMENT_LABELS: Record<SegmentKey, string> = {
  solar: "Solar",
  wind: "Wind",
  gas: "Gas",
  kohle: "Kohle",
  sonstige: "Sonstige",
};

// Order in donut + legend
const SEGMENT_ORDER: SegmentKey[] = [
  "solar",
  "wind",
  "gas",
  "kohle",
  "sonstige",
];

// ─── Component ──────────────────────────────────────────────────────────────
export default function StrommixWidget() {
  const [data, setData] = useState<StrommixData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Theme override listener
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (ALLOWED_ORIGINS.indexOf(event.origin) === -1) return;
      const payload = event.data as
        | { type?: unknown; vars?: unknown }
        | undefined;
      if (!payload || payload.type !== "widget:theme") return;

      const vars =
        payload.vars && typeof payload.vars === "object"
          ? (payload.vars as Record<string, unknown>)
          : {};
      const root = document.documentElement;

      if (Object.keys(vars).length === 0) {
        ALLOWED_VARS.forEach((k) => root.style.removeProperty(k));
        return;
      }

      Object.keys(vars).forEach((k) => {
        const val = vars[k];
        if (ALLOWED_VARS.indexOf(k) !== -1 && typeof val === "string") {
          root.style.setProperty(k, val);
        }
      });
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Data fetcher with polling
  useEffect(() => {
    let stopped = false;

    async function load() {
      try {
        const res = await fetch("/api/embed/strommix", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as StrommixData;
        if (!stopped) {
          setData(json);
          setError(null);
          setLoaded(true);
        }
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : "Fehler");
          setLoaded(true);
        }
      }
    }

    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: 280,
        display: "flex",
        flexDirection: "column",
        background: "var(--widget-bg)",
        color: "var(--widget-fg)",
        borderRadius: "var(--widget-border-radius)",
        fontFamily: "var(--widget-font-family)",
        padding: 20,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <Header />

      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {!loaded && <Skeleton />}
        {loaded && error && !data && <ErrorState message={error} />}
        {data && <Body data={data} />}
      </div>

      <Footer />
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────
function Header() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 8,
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.2,
        }}
      >
        Strommix Deutschland
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--widget-muted)",
        }}
      >
        live
      </div>
    </div>
  );
}

// ─── Body ───────────────────────────────────────────────────────────────────
function Body({ data }: { data: StrommixData }) {
  const segments = useMemo(
    () =>
      SEGMENT_ORDER.map((key) => ({
        key,
        label: SEGMENT_LABELS[key],
        value: data.mix[key],
        color:
          key === "solar"
            ? "var(--widget-accent)"
            : SEGMENT_COLORS[key as Exclude<SegmentKey, "solar">],
      })).filter((s) => s.value > 0),
    [data],
  );

  const updated = formatUpdated(data.updatedAt);

  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        alignItems: "center",
        width: "100%",
      }}
    >
      <Donut
        segments={segments}
        co2={data.co2PerKwh}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 0,
        }}
      >
        {segments.map((s) => (
          <LegendRow
            key={s.key}
            color={s.color}
            label={s.label}
            value={s.value}
          />
        ))}
        <div
          style={{
            marginTop: 6,
            fontSize: 10.5,
            color: "var(--widget-muted)",
          }}
        >
          Stand {updated}
        </div>
      </div>
    </div>
  );
}

// ─── Donut ──────────────────────────────────────────────────────────────────
interface Segment {
  key: SegmentKey;
  label: string;
  value: number;
  color: string;
}

function Donut({ segments, co2 }: { segments: Segment[]; co2: number }) {
  const size = 140;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const totalPct = segments.reduce((sum, s) => sum + s.value, 0) || 100;

  let offset = 0;
  const arcs = segments.map((s) => {
    const len = (s.value / totalPct) * circumference;
    const arc = (
      <circle
        key={s.key}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={stroke}
        strokeDasharray={`${len} ${circumference - len}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
    offset += len;
    return arc;
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0 }}
      role="img"
      aria-label="Strommix Donut"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--widget-muted)"
        strokeOpacity={0.15}
        strokeWidth={stroke}
      />
      {arcs}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="20"
        fontWeight={700}
        fill="var(--widget-fg)"
      >
        {co2}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="9.5"
        fill="var(--widget-muted)"
      >
        g CO₂/kWh
      </text>
    </svg>
  );
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12.5,
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          background: color,
          borderRadius: 2,
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1 }}>{label}</span>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
        }}
      >
        {formatPercent(value)}
      </span>
    </div>
  );
}

// ─── Skeleton + Error ───────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div
      style={{
        width: "100%",
        textAlign: "center",
        color: "var(--widget-muted)",
        fontSize: 12,
      }}
    >
      Lade Strommix…
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        width: "100%",
        textAlign: "center",
        color: "var(--widget-muted)",
        fontSize: 12,
      }}
    >
      Daten gerade nicht verfügbar.
      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{message}</div>
    </div>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 8,
        borderTop: "1px solid currentColor",
        borderTopColor: "var(--widget-muted)",
        opacity: 0.95,
        fontSize: 10.5,
        color: "var(--widget-muted)",
        textAlign: "right",
      }}
    >
      Powered by{" "}
      <a
        href="https://solar-check.io"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "var(--widget-accent)",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Solar-Check.io
      </a>
    </div>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────────────
function formatPercent(v: number): string {
  if (v >= 10) return `${Math.round(v)} %`;
  return `${v.toFixed(1).replace(".", ",")} %`;
}

function formatUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
  } catch {
    return iso;
  }
}
