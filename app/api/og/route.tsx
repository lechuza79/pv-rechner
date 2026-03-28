import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { ANLAGEN, SPEICHER } from "../../../lib/constants";
import { calcEigenverbrauch, estimateCost, calcWeightedFeedIn, calc, paramInt, paramFloat, paramStr } from "../../../lib/calc";
import { DEFAULT_FEED_IN } from "../../../lib/feedin-config";

export const runtime = "edge";

function fmt(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());

  const anlageIdx = paramInt(params, "a", 2, 0, 4);
  const speicherIdx = paramInt(params, "s", 0, 0, 3);
  const personenIdx = paramInt(params, "p", 1, 0, 3);
  const nutzungIdx = paramInt(params, "n", 1, 0, 3);
  const wp = paramStr(params, "wp", "nein", ["nein", "geplant", "ja"]);
  const ea = paramStr(params, "ea", "nein", ["nein", "geplant", "ja"]);
  const eaKm = paramInt(params, "km", 15000, 1000, 50000);
  const customKwp = paramFloat(params, "ck", 12, 1, 50);
  const ertragKwp = paramInt(params, "er", 950, 700, 1400);
  const strompreis = paramFloat(params, "st", 0.34, 0.05, 1.0);
  const einspeisungModus = params.eia === "2" ? "voll" : params.eia === "0" ? "aus" : "teil";
  const plz = params.plz || "";

  const kwp = anlageIdx < 4 ? ANLAGEN[anlageIdx].kwp : customKwp;
  const spKwh = SPEICHER[speicherIdx].kwh;

  const oKosten = params.k ? paramFloat(params, "k", 0, 500, 200000) : null;
  const oEv = params.ev ? paramInt(params, "ev", 0, 5, 95) : null;

  const ev = oEv ?? calcEigenverbrauch({
    personenIdx, nutzungIdx, speicherKwh: spKwh, wp, ea, eaKm, kwp, ertragKwp,
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
    stromSteigerung: 0.03, ertragKwp, monthly: null,
  });

  const amortYears = result.be ? result.be.i : null;
  const rendite25j = result.total;
  const avgSavings = Math.round(rendite25j / 25);

  const jetBrainsMono = await fetch(
    new URL("/fonts/JetBrainsMono-Bold.ttf", req.nextUrl.origin)
  ).then(r => r.arrayBuffer());

  const amortColor = amortYears !== null ? "#1365EA" : "#EF4444";
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
              <span style={{ fontSize: 14, color: "#777777", letterSpacing: 1 }}>RENDITE 25 J.</span>
              <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono", color: rendite25j > 0 ? "#00D950" : "#EF4444" }}>
                {`${renditeStr} \u20AC`}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, color: "#777777", letterSpacing: 1 }}>ERSPARNIS / JAHR</span>
              <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono", color: avgSavings > 0 ? "#00D950" : "#3F3F3F" }}>
                {`${savingsStr} \u20AC`}
              </span>
            </div>
          </div>
          <span style={{ fontSize: 16, color: "#949494" }}>
            Ehrlich berechnet. Ohne Leadfunnel.
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "JetBrains Mono", data: jetBrainsMono, weight: 700 as const },
      ],
    },
  );
}
