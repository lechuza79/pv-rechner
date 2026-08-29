"use client";

import { v, space, pad } from "../../lib/theme";
import InfoTooltip from "../InfoTooltip";
import { ferienJeLand, type FreiBand } from "../../lib/social-kalendertage";

// Die Ereigniszeile einer Kalenderwoche: Ferien und Feiertage.
//
// EINE ZEILE, NICHT ZWEI. Der erste Anlauf legte Bänder und Punkte in zwei
// Spuren, weil ein Feiertag mitten in den Ferien sonst unter dem Band
// verschwand. Die Trennung löste das Sichtbarkeitsproblem und erzeugte ein
// größeres: Zwei Zeilen behaupten zwei unabhängige Ereignisse, dabei ist der
// Feiertag IN den Ferien — Mariä Himmelfahrt liegt im August in jedem zweiten
// Bundesland mitten in den Sommerferien. Der Punkt gehört auf das Band.
//
// SIE LIEGT AUF DEMSELBEN RASTER wie die Tage — sieben gleich breite Spalten.
// Nur so steht der Bandanfang wirklich unter dem Tag, an dem der Zeitraum
// beginnt; eine eigene Breitenrechnung wäre eine zweite Wahrheit, die beim
// nächsten Umbau danebenläuft.
//
// DIE ECKEN SAGEN ETWAS: rund dort, wo der Zeitraum wirklich anfängt oder
// aufhört, gerade dort, wo er über den Wochenrand weiterläuft. Ein Band, das an
// beiden Enden rund ist, obwohl die Ferien noch zwei Wochen gehen, behauptet ein
// Ende, das es nicht gibt.
//
// DER HINWEIS IST DER GETEILTE TOOLTIP, nicht das eingebaute `title` des
// Browsers. Das feuert auf Tastgeräten überhaupt nicht und braucht auf dem
// Schreibtisch rund eine Sekunde — bei einem neun Pixel großen Punkt merkt
// niemand, dass da etwas wäre. Der Baustein positioniert am Rand, schließt per
// Escape und ist mit der Tastatur erreichbar.

const RUND = 999;

export function FreiBaender({ baender, raster, onDetail }: {
  baender: FreiBand[];
  /** Dasselbe Raster wie die Tage — sieben gleiche Spalten. */
  raster: React.CSSProperties;
  /** Klick öffnet die Länderliste des Tages. */
  onDetail: (band: FreiBand) => void;
}) {
  if (!baender.length) return null;

  // Strecken zuerst, Punkte danach: Die Reihenfolge im Baum entscheidet, was
  // oben liegt. Der Punkt gehört auf das Band, weil der Feiertag im
  // Ferienzeitraum liegt und nicht daneben.
  const sortiert = [...baender].sort((a, b) => Number(a.einTag) - Number(b.einTag));

  return (
    <div style={{ ...raster, minHeight: 20, alignItems: "center" }}>
      {sortiert.map((b, i) => (
        <div
          key={`${b.vonIndex}-${b.text}-${i}`}
          onClick={() => onDetail(b)}
          style={{
            gridColumn: `${b.vonIndex + 1} / ${b.bisIndex + 2}`,
            gridRow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: b.einTag ? "center" : "stretch",
            minWidth: 0,
            zIndex: b.einTag ? 1 : 0,
            cursor: "pointer",
          }}
        >
          <InfoTooltip
            ariaLabel={b.text}
            exportNote={false}
            title={b.text}
            trigger={b.einTag ? <Punkt /> : <Balken band={b} />}
          >
            <Inhalt band={b} />
          </InfoTooltip>
        </div>
      ))}
    </div>
  );
}

function Punkt() {
  // Die TREFFERFLÄCHE ist größer als der Punkt: Neun Pixel sind als Ziel für
  // einen Zeiger zu klein — der Hinweis war da und ging trotzdem nicht auf,
  // weil man ihn kaum trifft. Sichtbar neun Pixel, anfassbar zwanzig.
  return (
    <span
      style={{
        width: 20,
        height: 20,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: RUND,
          background: v("--color-kalender-frei"),
          // Der Ring trennt den Punkt vom Band darunter. Ohne ihn geht ein
          // kräftiges Pink auf blassem Pink optisch unter.
          boxShadow: `0 0 0 2px ${v("--color-bg")}`,
        }}
      />
    </span>
  );
}

function Balken({ band }: { band: FreiBand }) {
  return (
    <span
      style={{
        display: "block",
        width: "100%",
        minWidth: 0,
        background: v("--color-kalender-frei-dim"),
        color: v("--color-kalender-frei"),
        borderLeft: `3px solid ${v("--color-kalender-frei")}`,
        borderTopLeftRadius: band.echterBeginn ? RUND : 0,
        borderBottomLeftRadius: band.echterBeginn ? RUND : 0,
        borderTopRightRadius: band.echtesEnde ? RUND : 0,
        borderBottomRightRadius: band.echtesEnde ? RUND : 0,
        padding: pad("xxs", "sm"),
        fontSize: v("--font-size-caption"),
        lineHeight: 1.25,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {band.text}
    </span>
  );
}

/**
 * Was im Hinweis steht.
 *
 * Bei Ferien die ersten Länder mit ihrem Zeitraum — „Hessen hat Ferien" ist eine
 * andere Auskunft als „Hessen hat noch elf Tage". Die vollständige Liste steht
 * im Fenster dahinter; ein Hinweis, der sechzehn Zeilen lang ist, deckt den
 * halben Kalender zu.
 */
function Inhalt({ band }: { band: FreiBand }) {
  if (band.einTag) {
    return <>Gesetzlicher Feiertag. Zum Öffnen klicken: Ferienlage aller Länder an diesem Tag.</>;
  }
  const zeilen = ferienJeLand(band.tagIso).slice(0, 5);
  const rest = ferienJeLand(band.tagIso).length - zeilen.length;
  const kurz = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "numeric", timeZone: "UTC" });
  return (
    <>
      {zeilen.map((z) => (
        <span key={z.land} style={{ display: "flex", justifyContent: "space-between", gap: space.md }}>
          <span>{z.land}</span>
          <span style={{ color: v("--color-text-muted") }}>
            {kurz(z.von)}–{kurz(z.bis)}
          </span>
        </span>
      ))}
      {rest > 0 && <span style={{ color: v("--color-text-muted") }}>und {rest} weitere — klicken für alle</span>}
    </>
  );
}
