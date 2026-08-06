// Balkenchart des Vergütungs-Verlaufs 2000–heute, in Jahres-Sektionen:
// 2000–2011 ein Jahresbalken (SFV-Jahresanfangswerte), ab 04/2012 zwölf
// Monatsbalken je Jahr (BNetzA-Archiv, ab 08/2022 die gesetzliche Kette).
// Server-gerendertes SVG ohne Client-JS — exakte Werte je Balken über native
// <title>-Tooltips (Hover); fürs Nachschlagen (auch mobil) stehen dieselben
// Werte in den aufklappbaren Jahreszeilen direkt unter dem Chart.
// Metrik wie lib/feedin-history: kleinste Dachanlagen-Klasse, ab 30.07.2022
// Teileinspeisung — EINE Einheit (ct/kWh) im ganzen Chart.
import { FEED_IN_ARCHIV, FEED_IN_ARCHIV_START } from "../../../lib/feedin-archiv";
import { feedInRatesForCommissioning } from "../../../lib/feedin-config";
import {
  FEEDIN_HISTORY_VALUES,
  FEEDIN_HISTORY_YEARS,
} from "../../../lib/feedin-history";
import { v } from "../../../lib/theme";

export const MONAT_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export interface VerlaufJahr {
  year: number;
  /** Ein Eintrag = Jahresbalken (2000–2011); zwölf = Monatsbalken (null = kein Satz in diesem Modell, z. B. Jan–Mär 2012). */
  bars: (number | null)[];
}

const archivByYm = new Map(FEED_IN_ARCHIV.map((r) => [r.ym, r.u10]));

/** Monatswert der kleinsten Klasse: Archiv (04/2012–07/2022), danach Kette. */
function monatswert(year: number, month1: number): number | null {
  const ym = `${year}-${String(month1).padStart(2, "0")}`;
  if (ym < FEED_IN_ARCHIV_START) return null;
  const archiv = archivByYm.get(ym);
  if (archiv != null) return archiv;
  return feedInRatesForCommissioning(`${ym}-15`)?.teilUnder10 ?? null;
}

/** Jahres-Sektionen für Chart und Aufklapp-Zeilen — eine Quelle für beide. */
export function verlaufJahre(now: Date = new Date()): VerlaufJahr[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const jahre: VerlaufJahr[] = [];
  for (let year = FEEDIN_HISTORY_YEARS[0]; year <= currentYear; year++) {
    if (year < 2012) {
      const idx = FEEDIN_HISTORY_YEARS.indexOf(year);
      jahre.push({ year, bars: [FEEDIN_HISTORY_VALUES[idx]] });
      continue;
    }
    const months = year === currentYear ? currentMonth : 12;
    const bars: (number | null)[] = [];
    for (let m = 1; m <= 12; m++) bars.push(m <= months ? monatswert(year, m) : null);
    jahre.push({ year, bars });
  }
  return jahre;
}

const ct = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2 });

// Geometrie: kompakte Sektionen, damit die GANZE Kurve 2000–heute auf der
// 640px-Leseseite ohne Scrollen sichtbar ist ("auf einen Blick" ist der Zweck
// dieses Charts — exaktes Nachschlagen übernehmen die Zeilen darunter). Auf
// schmalen Displays scrollt der Container wie die Tabellen der Seite.
const SECTION_W = 21;
const AXIS_W = 30;
const PLOT_H = 170;
const LABEL_H = 22;
const TOP_PAD = 14;
const Y_MAX = 60; // ct/kWh — über dem Spitzenwert 57,40 (2004)

export default function VerlaufsChart({ jahre }: { jahre: VerlaufJahr[] }) {
  const width = AXIS_W + jahre.length * SECTION_W + 6;
  const height = TOP_PAD + PLOT_H + LABEL_H;
  const y = (val: number) => TOP_PAD + PLOT_H - (val / Y_MAX) * PLOT_H;
  const gridSteps = [0, 10, 20, 30, 40, 50, 60];
  return (
    <div style={{ overflowX: "auto", marginBottom: 8 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label="Einspeisevergütung für kleine Dachanlagen seit 2000 in Cent pro Kilowattstunde, als Balken je Jahr bzw. je Monat"
        style={{ display: "block", fontFamily: v("--font-text") }}
      >
        {gridSteps.map((g) => (
          <g key={g}>
            <line
              x1={AXIS_W}
              x2={width - 4}
              y1={y(g)}
              y2={y(g)}
              stroke={v("--color-border")}
              strokeWidth={1}
              strokeDasharray={g === 0 ? undefined : "2 3"}
            />
            <text
              x={AXIS_W - 5}
              y={y(g) + 3}
              textAnchor="end"
              fontSize={9}
              fill={v("--color-text-muted")}
            >
              {g}
            </text>
          </g>
        ))}
        <text x={2} y={TOP_PAD - 4} fontSize={9} fill={v("--color-text-muted")}>
          ct/kWh
        </text>
        {jahre.map((j, yi) => {
          const x0 = AXIS_W + yi * SECTION_W;
          const isYearBar = j.bars.length === 1;
          const slotW = isYearBar ? SECTION_W - 6 : (SECTION_W - 4) / 12;
          return (
            <g key={j.year}>
              {j.bars.map((val, mi) => {
                if (val == null) return null;
                const x = isYearBar ? x0 + 3 : x0 + 2 + mi * slotW;
                const label = isYearBar
                  ? `${j.year} (Jahresbeginn): ${ct(val)} ct/kWh`
                  : `${MONAT_KURZ[mi]} ${j.year}: ${ct(val)} ct/kWh`;
                return (
                  <g key={mi}>
                    <rect
                      x={x}
                      y={y(val)}
                      width={Math.max(slotW - 0.35, 0.9)}
                      height={TOP_PAD + PLOT_H - y(val)}
                      fill={v("--color-accent")}
                    />
                    {/* Unsichtbare Hover-Fläche über die volle Höhe der
                        Monatsspalte — 1,4px schmale Balken wären sonst kaum
                        zu treffen; der Browser-Tooltip (<title>) hängt hier. */}
                    <rect x={x} y={TOP_PAD} width={slotW} height={PLOT_H} fill="transparent">
                      <title>{label}</title>
                    </rect>
                  </g>
                );
              })}
              {yi % 2 === 0 && (
                <text
                  x={x0 + SECTION_W / 2}
                  y={TOP_PAD + PLOT_H + 14}
                  textAnchor="middle"
                  fontSize={8}
                  fill={v("--color-text-secondary")}
                >
                  {j.year}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
