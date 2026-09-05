import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { ANLAGEN, SPEICHER, PERSONEN, INSULATION_BESTAND, HAUSTYP_WP, DACHARTEN, NATIONAL_AVG_YIELD, SCENARIOS, YEARS } from "../../../lib/constants";
import { dachErtragKwp } from "../../../lib/dach-ertrag";
import { type TiltOrientation } from "../../../lib/tilt-config";
import { calcEigenverbrauch, estimateCost, calcWeightedFeedIn, calc, batteryReplaceCost, paramInt, paramFloat, paramStr } from "../../../lib/calc";
import { calcWpAnnualElectricity } from "../../../lib/heatpump";
import { DEFAULT_FEED_IN } from "../../../lib/feedin-config";
import { DEFAULT_PRICES } from "../../../lib/prices-config";
import { tokens } from "../../../lib/theme";
import { zeitpunktInBerlin } from "../../../lib/zeit";

// The OG image is a fixed light-brand render (satori has no CSS variables), so
// colours are read as raw literals from the single source (theme.ts base tokens)
// rather than re-typed hex — same values, no drift.
const C_POSITIVE = tokens["--color-positive"];
const C_ACCENT = tokens["--color-accent"];
const C_NEGATIVE = tokens["--color-negative"];
const C_TEXT = tokens["--color-text-primary"];

export const runtime = "edge";

function fmt(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

type RadialData = { frac: number[]; currentGW: number; standIso: string | null };

/**
 * Der Zeitpunkt der Messung, wie er im Bild steht.
 *
 * Die Formatierung liegt in lib/zeit.ts — Next lässt aus einer Route nur die
 * vorgesehenen Felder heraus und bricht den Build bei jedem anderen Export ab.
 * Sie dort zu halten ist ohnehin richtig: Die Zeitzone ist die eigentliche Falle
 * (Messwerte kommen in Weltzeit), und nur so lässt sie sich prüfen.
 */
function standText(iso: string | null): string | null {
  const t = zeitpunktInBerlin(iso);
  return t ? `${t} UHR` : null;
}

// Fetch the last 24h of renewable generation and reduce it to N normalized bars
// plus the current GW value. Mirrors the live-radial widget, including the
// solar-latency trim (newest points have solar=null; cutting them keeps the
// snapshot coherent). Returns null on any failure so the OG can fall back.
async function loadEnergyRadial(origin: string, bars: number): Promise<RadialData | null> {
  try {
    const res = await fetch(new URL("/api/energy/generation?hours=24", origin));
    if (!res.ok) return null;
    const raw = await res.json();
    const pts: Array<Record<string, number | string | null>> = Array.isArray(raw)
      ? raw
      : (raw.data ?? []);
    if (!pts.length) return null;
    const gesamt = (p: Record<string, number | string | null>): number | null => {
      const xs = [
        p.solar, p.wind_onshore, p.wind_offshore,
        p.biomass, p.hydro_run_of_river, p.hydro_water_reservoir,
      ].filter((x): x is number => typeof x === "number");
      return xs.length ? xs.reduce((s, x) => s + x, 0) : null;
    };
    let last = pts.length - 1;
    while (last >= 0 && typeof pts[last].solar !== "number") last--;
    const usable = last >= 0 ? pts.slice(0, last + 1) : pts;
    const series = usable.map(gesamt).filter((x): x is number => x !== null);
    if (!series.length) return null;
    const max = Math.max(...series, 1);
    const frac: number[] = [];
    for (let i = 0; i < bars; i++) {
      frac.push(series[Math.floor((i / bars) * series.length)] / max);
    }
    // Der Zeitstempel des zuletzt VERWENDETEN Punkts, nicht der des letzten
    // gelieferten: Die neuesten Punkte tragen noch keinen Solarwert und werden
    // oben abgeschnitten. Ein Stand, der eine Viertelstunde weiter ist als die
    // Zahl daneben, wäre wieder eine Beschriftung, die etwas anderes sagt.
    const letzter = usable[usable.length - 1];
    const standIso = typeof letzter?.ts === "string" ? letzter.ts : null;
    return { frac, currentGW: series[series.length - 1] / 1000, standIso };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());

  const jetBrainsMono = await fetch(
    new URL("/fonts/JetBrainsMono-Bold.ttf", req.nextUrl.origin)
  ).then(r => r.arrayBuffer());
  const fonts = [
    { name: "JetBrains Mono", data: jetBrainsMono, weight: 700 as const },
  ];

  // Branded card for non-calculator pages (Wärmepumpe, Energie, Simulation …).
  // Title/subtitle come from the page via lib/seo.ts brandOgImage().
  if (params.view === "brand") {
    const title = (params.t || "Solar Check").slice(0, 80);
    const subtitle = (params.s || "").slice(0, 120);
    return new ImageResponse(
      (
        <div style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "56px 64px",
          background: "#FFFFFF", color: "#3F3F3F",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#3F3F3F" }}>Solar Check</span>
            <span style={{ fontSize: 20, color: "#949494" }}>solar-check.io</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 58, fontWeight: 700, color: "#1365EA", lineHeight: 1.15 }}>
              {title}
            </span>
            {subtitle ? (
              <span style={{ fontSize: 28, color: "#777777", lineHeight: 1.4, marginTop: 20 }}>
                {subtitle}
              </span>
            ) : null}
          </div>
          <span style={{ fontSize: 18, color: "#949494" }}>
            Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.
          </span>
        </div>
      ),
      { width: 1200, height: 630, fonts },
    );
  }

  // Live energy snapshot card (homepage): radial of the last 24h renewable
  // generation with the current GW in the center. CDN-revalidated so it stays
  // current; falls back to a text card if the live data is unavailable.
  if (params.view === "energy") {
    const N = 72;
    const data = await loadEnergyRadial(req.nextUrl.origin, N);

    if (!data) {
      return new ImageResponse(
        (
          <div style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "column",
            justifyContent: "space-between", padding: "56px 64px",
            background: "#FFFFFF", color: "#3F3F3F",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#3F3F3F" }}>Solar Check</span>
              <span style={{ fontSize: 20, color: "#949494" }}>solar-check.io</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 58, fontWeight: 700, color: "#1365EA", lineHeight: 1.15 }}>
                Energie ehrlich berechnet.
              </span>
              <span style={{ fontSize: 28, color: "#777777", lineHeight: 1.4, marginTop: 20 }}>
                {/* Hier stand „Fünf Tools" — es sind acht. Der Beleg dafür, dass
                    eine getippte Anzahl still veraltet: Dieses Rückfallbild
                    erscheint nur, wenn die Live-Daten ausfallen, und niemandem
                    ist es aufgefallen. Deshalb jetzt ohne Zahl. */}
                Ohne Anmeldung, ohne Verkaufsanrufe.
              </span>
            </div>
            <span style={{ fontSize: 18, color: "#949494" }}>Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.</span>
          </div>
        ),
        { width: 1200, height: 630, fonts, headers: { "cache-control": "public, max-age=0, s-maxage=300" } },
      );
    }

    const cx = 190, cy = 190, innerR = 78, maxLen = 95, minLen = 5;
    const startDeg = -90, sweepDeg = 340;
    const lines = data.frac.map((f, i) => {
      const a = ((startDeg + sweepDeg * (i / (N - 1))) * Math.PI) / 180;
      const len = minLen + f * maxLen;
      return {
        x1: cx + innerR * Math.cos(a),
        y1: cy + innerR * Math.sin(a),
        x2: cx + (innerR + len) * Math.cos(a),
        y2: cy + (innerR + len) * Math.sin(a),
        color: i === N - 1 ? C_POSITIVE : C_ACCENT,
      };
    });
    const gwStr = data.currentGW.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const stand = standText(data.standIso);

    return new ImageResponse(
      (
        <div style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "44px 56px",
          background: "#FFFFFF", color: "#3F3F3F",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#3F3F3F" }}>Solar Check</span>
            <span style={{ fontSize: 20, color: "#949494" }}>solar-check.io</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", width: 560 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: C_POSITIVE, marginRight: 10 }} />
                <span style={{ fontSize: 17, color: "#777777", letterSpacing: 1 }}>
                  {stand ? `ERNEUERBARE · ${stand}` : "ERNEUERBARE"}
                </span>
              </div>
              <span style={{ fontSize: 50, fontWeight: 700, color: "#1365EA", lineHeight: 1.15, marginTop: 14 }}>
                Energie ehrlich berechnet.
              </span>
              <span style={{ fontSize: 23, color: "#777777", lineHeight: 1.4, marginTop: 16 }}>
                Live-Stromdaten, PV- und Wärmepumpen-Rechner. Ohne Anmeldung.
              </span>
            </div>

            <div style={{ display: "flex", position: "relative", width: 380, height: 380, alignItems: "center", justifyContent: "center" }}>
              <svg width="380" height="380" viewBox="0 0 380 380">
                <circle cx={cx} cy={cy} r={innerR + maxLen} fill="none" stroke="#EFEFEF" strokeWidth="1" />
                <circle cx={cx} cy={cy} r={innerR + maxLen * 0.55} fill="none" stroke="#F3F3F3" strokeWidth="1" />
                {lines.map((l, i) => (
                  <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth="3.4" strokeLinecap="round" />
                ))}
              </svg>
              <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 58, fontWeight: 700, fontFamily: "JetBrains Mono", color: "#3F3F3F", lineHeight: 1 }}>
                  {gwStr}
                </span>
                <span style={{ fontSize: 22, color: "#777777", marginTop: 4 }}>GW</span>
              </div>
            </div>
          </div>

          <span style={{ fontSize: 16, color: "#949494" }}>
            {/* „letzte 24 Stunden" ist relativ und wird in einem eingefrorenen
                Bild ebenso falsch wie „gerade eben" darüber. Der Verlauf selbst
                umfasst 24 Stunden — das bleibt wahr, der Bezugspunkt steht oben. */}
            Erneuerbare Erzeugung in Deutschland · 24-Stunden-Verlauf
          </span>
        </div>
      ),
      { width: 1200, height: 630, fonts, headers: { "cache-control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400" } },
    );
  }

  const anlageIdx = paramInt(params, "a", 2, 0, 4);
  const speicherIdx = paramInt(params, "s", 0, 0, 3);
  const personenIdx = paramInt(params, "p", 1, 0, 3);
  const nutzungIdx = paramInt(params, "n", 1, 0, 3);
  const wp = paramStr(params, "wp", "nein", ["nein", "geplant", "ja"]);
  const ea = paramStr(params, "ea", "nein", ["nein", "geplant", "ja"]);
  const eaKm = paramInt(params, "km", 15000, 1000, 50000);
  const customKwp = paramFloat(params, "ck", 12, 1, 50);
  // `er` ist das Standort-OPTIMUM (PVGIS mit optimaler Neigung nach Süden);
  // `da`/`az` machen daraus den Ertrag DIESES Dachs. Ohne diesen Schritt zeigt
  // das Vorschaubild eines Ost/West-Links die Amortisation eines Süddachs —
  // dieselbe Regel wie im Rechner (lib/dach-ertrag.ts).
  const ertragOptimum = paramInt(params, "er", NATIONAL_AVG_YIELD, 700, 1400);
  const ogDachart = params.da !== undefined ? paramInt(params, "da", -1, 0, DACHARTEN.length - 1) : -1;
  const ogAusrichtung = paramStr(params, "az", "", ["sued", "suedostwest", "ostwest", "nord"]) as TiltOrientation | "";
  const ertragKwp = dachErtragKwp(ertragOptimum, ogDachart >= 0 ? ogDachart : null, ogAusrichtung || null);
  const strompreis = paramFloat(params, "st", DEFAULT_PRICES.electricityPrice, 0.05, 1.0);
  const einspeisungModus = params.eia === "2" ? "voll" : params.eia === "0" ? "aus" : "teil";
  const plz = params.plz || "";

  const kwp = anlageIdx < 4 ? ANLAGEN[anlageIdx].kwp : customKwp;
  const spKwh = SPEICHER[speicherIdx].kwh;

  const oKosten = params.k ? paramFloat(params, "k", 0, 500, 200000) : null;
  const oEv = params.ev ? paramInt(params, "ev", 0, 5, 95) : null;

  // WP-Jahresstrom aus den Gebäudedaten (gleiche Physik wie der Rechner), damit
  // das Vorschaubild bei WP-Links dieselbe Amortisation zeigt wie die Seite.
  const wpKwh = wp !== "nein"
    ? calcWpAnnualElectricity({
        situation: "bestand",
        wohnflaeche: paramInt(params, "wf", 140, 20, 1000),
        insulationIdx: paramInt(params, "wi", 1, 0, INSULATION_BESTAND.length - 1),
        personen: PERSONEN[personenIdx].count,
        heizsystem: paramStr(params, "wh", "hk_neu", ["fbh", "hk_neu", "hk_alt"]) as "fbh" | "hk_neu" | "hk_alt",
        wpType: "lwwp",
        haustypFaktor: HAUSTYP_WP[paramInt(params, "wht", 0, 0, HAUSTYP_WP.length - 1)].faktor,
      })
    : null;

  const ev = oEv ?? calcEigenverbrauch({
    personenIdx, nutzungIdx, speicherKwh: spKwh, wp, ea, eaKm, wpKwh, kwp, ertragKwp,
  });
  const kosten = oKosten ?? estimateCost(kwp, spKwh);
  const oEinsp = params.ei ? paramFloat(params, "ei", 0, 0, 20) : null;
  const autoEinsp = einspeisungModus === "voll"
    ? calcWeightedFeedIn(kwp, DEFAULT_FEED_IN.vollUnder10, DEFAULT_FEED_IN.vollOver10)
    : calcWeightedFeedIn(kwp, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10);
  const einsp = einspeisungModus === "aus" ? 0 : (oEinsp ?? autoEinsp);
  const effEv = einspeisungModus === "voll" ? 0 : ev;

  const result = calc({
    kwp, kosten, strompreis, eigenverbrauch: effEv, einspeisung: einsp,
    // Dasselbe Szenario wie die Seite ohne Reiterwahl (realistisch). Hier stand
    // 0,03 — das Bild im Chat zeigte 13.241 € Gewinn, die Seite 11.485 €.
    // Was strukturell bleibt: Das Bild läuft ohne Datenbank, also ohne Live-
    // Preise und ohne Monatsprofil; die Formeln sind dieselben, die Eingaben
    // nicht vollständig.
    stromSteigerung: SCENARIOS.find((s) => s.id === "realistic")!.strom, ertragKwp, monthly: null,
    batteryReplace: batteryReplaceCost(spKwh),
  });

  const amortYears = result.be ? result.be.i : null;
  const rendite25j = result.total;
  // Dieselbe Formel wie „⌀ Ersparnis / Jahr" auf der Seite: mittlerer
  // Jahresnutzen, nicht Gewinn durch 25 (das war um die Investition zu klein).
  const avgSavings = Math.round((rendite25j + kosten) / YEARS);

  const amortColor = amortYears !== null ? C_ACCENT : C_NEGATIVE;
  const amortText = amortYears !== null ? `${amortYears}` : ">25";
  const renditeStr = `${rendite25j > 0 ? "+" : ""}${fmt(rendite25j)}`;
  const savingsStr = `${avgSavings > 0 ? "+" : ""}${fmt(avgSavings)}`;

  const cards = [
    { value: `${kwp} kWp`, label: "ANLAGE" },
    { value: spKwh > 0 ? `${spKwh} kWh` : "Ohne", label: "SPEICHER" },
    { value: `${ev}%`, label: "EIGENVERBR." },
  ];
  if (plz) cards.push({ value: plz, label: "STANDORT" });

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "space-between", padding: "48px 56px",
        background: "#FFFFFF", color: "#3F3F3F",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#3F3F3F" }}>Solar Check</span>
          <span style={{ fontSize: 20, color: "#949494" }}>solar-check.io</span>
        </div>

        {/* Main metric */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 22, color: "#777777", letterSpacing: 1 }}>
            AMORTISATION IN
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 96, fontWeight: 700, color: amortColor, fontFamily: "JetBrains Mono", lineHeight: 1 }}>
              {amortText}
            </span>
            <span style={{ fontSize: 36, color: amortColor, fontWeight: 600 }}>
              Jahren
            </span>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          {cards.map((card) => (
            <div key={card.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "16px 28px", background: "#F8F8F8",
              border: "1px solid #E9E9E9", borderRadius: 12, minWidth: 120,
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "JetBrains Mono", color: "#3F3F3F" }}>
                {card.value}
              </span>
              <span style={{ fontSize: 14, color: "#777777", marginTop: 4, letterSpacing: 1 }}>
                {card.label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom stats + tagline */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, color: "#777777", letterSpacing: 1 }}>GEWINN 25 J.</span>
              <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono", color: rendite25j > 0 ? C_POSITIVE : C_NEGATIVE }}>
                {`${renditeStr} \u20AC`}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, color: "#777777", letterSpacing: 1 }}>ERSPARNIS / JAHR</span>
              <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono", color: avgSavings > 0 ? C_POSITIVE : C_TEXT }}>
                {`${savingsStr} \u20AC`}
              </span>
            </div>
          </div>
          <span style={{ fontSize: 16, color: "#949494" }}>
            Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
