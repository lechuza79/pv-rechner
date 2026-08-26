"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { v, space, pad } from "../lib/theme";
import { IconExternal, IconCheck } from "./Icons";
import {
  geraetLeistungTeile,
  geraetPreisTeile,
  leistungAnzeigbar,
  type WpGeraet,
} from "../lib/wp-katalog";
import type { Befund, Empfehlung } from "../lib/wp-empfehlung";
import { BEG_ANTRAG_HREF, BEG_ANTRAG_KURZ, BEG_EIGENLEISTUNG } from "../lib/beg-antrag";

// ─── Passende Geräte zum Ergebnis ─────────────────────────────────────────────
//
// Zeigt drei Geräte, die zur gerechneten Anlage passen, mit Preis und den
// Gründen, warum sie passen. Die Reihenfolge richtet sich nach dem Preis für
// den Nutzer, nicht nach unserer Provision — und dieser Grundsatz steht
// sichtbar auf der Seite, sonst ist er nur eine Behauptung im Code.

interface Props {
  auslegungKw: number;
  vorlaufC: number;
  wpType: "lwwp" | "swwp";
}

interface Antwort {
  empfehlungen: Empfehlung[];
  abgerufenIso?: string | null;
  auswahlAus?: number;
  grund?: string;
}

/** Übersetzt einen Befund in einen Satz. Nur belegte Aussagen, keine Werbung. */
function befundText(b: Befund): { text: string; gut: boolean } | null {
  switch (b.art) {
    case "leistung-passt":
      return { text: "Leistung passt zur berechneten Anlagengröße", gut: true };
    case "leistung-reichlich":
      return { text: `${b.ueberKw} kW mehr als berechnet — läuft öfter im Takt`, gut: false };
    case "leistung-unsicher":
      return { text: "Leistung aus der Typenbezeichnung abgeleitet", gut: false };
    case "vorlauf-reicht":
      return { text: `Schafft ${b.geraetC} °C Vorlauf, nötig sind ${b.noetigC} °C`, gut: true };
    case "vorlauf-knapp":
      return { text: `Schafft ${b.geraetC} °C — wenig Reserve über den nötigen ${b.noetigC} °C`, gut: false };
    case "kaeltemittel-natuerlich":
      return { text: "Propan als Kältemittel", gut: true };
    case "kaeltemittel-fluoriert":
      return { text: "Fluoriertes Kältemittel (R32)", gut: false };
    case "aufbau-monoblock":
      return { text: "Monoblock — kein Kältekreis im Haus", gut: true };
    case "aufbau-split":
      return { text: "Split — Kältetechniker für den Anschluss nötig", gut: false };
    default:
      return null;
  }
}

function Abzeichen({ text, gut }: { text: string; gut: boolean }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: space.xs,
        fontSize: 12,
        lineHeight: 1.45,
        color: v("--color-text-secondary"),
      }}
    >
      <span
        aria-hidden
        style={{
          flex: "0 0 auto",
          marginTop: 2,
          color: gut ? v("--color-positive") : v("--color-text-muted"),
        }}
      >
        {gut ? <IconCheck size={13} /> : <span style={{ fontSize: 13, lineHeight: 1 }}>·</span>}
      </span>
      <span>{text}</span>
    </li>
  );
}

/**
 * Zahl groß, Einheit kleiner daneben, beide untrennbar in einer Zeile.
 *
 * Das Leerzeichen ist ein echtes (geschütztes), kein Außenabstand: Ein bloßes
 * `marginLeft` ist im Textfluss nicht vorhanden — kopierter Text und
 * Vorlese-Software bekommen dann „4.598€" und „14kW" zu sehen. Beim ersten
 * Blick auf die fertige Seite stand genau das da.
 */
function Wert({ teile, gross }: { teile: { value: string; unit: string }; gross?: boolean }) {
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: gross ? 20 : 15,
          fontWeight: 700,
          color: v("--color-text-primary"),
        }}
      >
        {teile.value}
      </span>
      <span
        style={{
          fontSize: gross ? 13 : 11,
          color: v("--color-text-secondary"),
        }}
      >
        {" "}
        {teile.unit}
      </span>
    </span>
  );
}

function Karte({ e, rang }: { e: Empfehlung; rang: number }) {
  const g: WpGeraet = e.geraet;
  const befunde = e.befunde.map(befundText).filter(Boolean) as { text: string; gut: boolean }[];

  return (
    <li
      style={{
        border: `1px solid ${rang === 0 ? v("--color-accent") : v("--color-border")}`,
        borderRadius: v("--radius-lg"),
        padding: pad("md", "md"),
        background: v("--color-bg"),
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
      }}
    >
      {rang === 0 && (
        <span
          style={{
            alignSelf: "flex-start",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.3,
            color: v("--color-accent"),
            textTransform: "uppercase",
          }}
        >
          Günstigstes passendes Gerät
        </span>
      )}

      <div style={{ display: "flex", gap: space.md, alignItems: "flex-start" }}>
        {g.bildUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={g.bildUrl}
            alt=""
            width={64}
            height={64}
            loading="lazy"
            style={{
              flex: "0 0 auto",
              width: 64,
              height: 64,
              objectFit: "contain",
              borderRadius: v("--radius-sm"),
              background: v("--color-bg-muted"),
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.3,
              color: v("--color-text-muted"),
              textTransform: "uppercase",
            }}
          >
            {g.marke}
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.4,
              color: v("--color-text-primary"),
              fontWeight: 600,
            }}
          >
            {g.name}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: space.sm,
          flexWrap: "wrap",
        }}
      >
        <Wert teile={geraetPreisTeile(g.preisEur)} gross />
        {leistungAnzeigbar(g) && (
          <span style={{ fontSize: 12, color: v("--color-text-secondary") }}>
            Heizleistung <Wert teile={geraetLeistungTeile(g.leistungKw)} />
          </span>
        )}
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: space.xs }}>
        {befunde.map((b, i) => (
          <Abzeichen key={i} text={b.text} gut={b.gut} />
        ))}
      </ul>

      <a
        href={g.link}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: space.xs,
          alignSelf: "flex-start",
          fontSize: 13,
          fontWeight: 700,
          color: v("--color-accent"),
          textDecoration: "none",
        }}
      >
        Beim Händler ansehen
        <IconExternal size={13} />
      </a>
    </li>
  );
}

export default function WpGeraeteEmpfehlung({ auslegungKw, vorlaufC, wpType }: Props) {
  const [antwort, setAntwort] = useState<Antwort | null>(null);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    let abgebrochen = false;
    setLaedt(true);
    const u = `/api/wp-geraete?kw=${auslegungKw}&vorlauf=${vorlaufC}&typ=${wpType}`;
    fetch(u)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Antwort | null) => {
        if (!abgebrochen) setAntwort(d);
      })
      .catch(() => {
        if (!abgebrochen) setAntwort(null);
      })
      .finally(() => {
        if (!abgebrochen) setLaedt(false);
      });
    return () => {
      abgebrochen = true;
    };
  }, [auslegungKw, vorlaufC, wpType]);

  if (laedt) {
    return (
      <div style={{ fontSize: 12, color: v("--color-text-muted") }}>
        Passende Geräte werden gesucht …
      </div>
    );
  }

  const treffer = antwort?.empfehlungen ?? [];
  if (treffer.length === 0) {
    // Kein Grund zur Beschönigung: Wenn nichts passt, ist das die Auskunft.
    return (
      <div style={{ fontSize: 13, color: v("--color-text-secondary"), lineHeight: 1.5 }}>
        Für diese Anlagengröße und Vorlauftemperatur ist gerade kein passendes Gerät im
        Sortiment unseres Partners. Das heißt nicht, dass es keins gibt — nur, dass wir
        keins belegen können.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: space.md }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: v("--color-text-secondary") }}>
        Diese Geräte passen zur berechneten Anlage. Sortiert nach dem Preis für dich, nicht
        nach unserer Provision.
      </p>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: space.md }}>
        {treffer.map((e, i) => (
          <Karte key={e.geraet.id} e={e} rang={i} />
        ))}
      </ul>

      {/* Der teuerste Satz der Seite — und er wird hier NICHT formuliert.

          Wortlaut und Ziel kommen aus `lib/beg-antrag.ts`, der einen Quelle für
          diese Regel. Dieselbe Aussage steht im Ergebnis des Rechners, im
          Förder-Check-Widget und im Ratgeber; ein Test verbietet, sie ein
          zweites Mal zu tippen.

          Warum das mehr ist als Ordnungsliebe: Die erste hier getippte Fassung
          war FALSCH und zu streng („ein Kauf vor der Förderzusage schließt die
          Förderung aus"). Der Ausschluss hängt an der ANTRAGSTELLUNG — die
          Richtlinie erklärt den Beginn zwischen Antrag und Zusage ausdrücklich
          für zulässig (Nr. 9.2.1). Aufgefallen ist das einer Parallel-Sitzung,
          nicht hier. Aus einer geteilten Quelle korrigiert man solche Sätze
          einmal statt an vier Stellen, von denen man drei vergisst. */}
      <div
        style={{
          border: `1px solid ${v("--color-border")}`,
          borderLeft: `3px solid ${v("--color-negative")}`,
          borderRadius: v("--radius-sm"),
          padding: pad("sm", "md"),
          fontSize: 12,
          lineHeight: 1.55,
          color: v("--color-text-secondary"),
        }}
      >
        <strong style={{ color: v("--color-text-primary") }}>Erst der Antrag, dann der Kauf.</strong>{" "}
        {BEG_ANTRAG_KURZ} {BEG_EIGENLEISTUNG}{" "}
        <Link href={BEG_ANTRAG_HREF} style={{ color: v("--color-accent") }}>
          So läuft es richtig
        </Link>
      </div>

      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: v("--color-text-muted") }}>
        Angegeben ist der Gerätepreis des Händlers, nicht der Preis der fertigen Anlage —
        Speicher, Regelung, Montage und Inbetriebnahme kommen dazu. Hersteller messen die
        Heizleistung außerdem bei unterschiedlichen Außentemperaturen; die Zahl taugt zum
        Vorauswählen, die verbindliche Auslegung macht der Fachbetrieb. Über die Links
        erhalten wir beim Kauf eine Provision, für dich ändert sich am Preis nichts.
        {antwort?.auswahlAus ? ` Ausgewählt aus ${antwort.auswahlAus} Geräten.` : ""}
      </p>
    </div>
  );
}
