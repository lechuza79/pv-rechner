"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { v, space, pad } from "../lib/theme";
import { IconExternal, IconCheck } from "./Icons";
import {
  geraetLeistungTeile,
  geraetPreisTeile,
  leistungAnzeigbar,
  type WpGeraet,
} from "../lib/wp-katalog";
import type { Befund, Empfehlung } from "../lib/wp-empfehlung";
import { BEG_ANTRAG_HREF, BEG_EIGENLEISTUNG } from "../lib/beg-antrag";

// ─── Passende Geräte zum Ergebnis ─────────────────────────────────────────────
//
// Zeigt drei Geräte, die zur gerechneten Anlage passen, mit Preis und den
// Gründen, warum sie passen. Die Reihenfolge richtet sich nach dem Preis für
// den Nutzer, nicht nach unserer Provision — und dieser Grundsatz steht
// sichtbar auf der Seite, sonst ist er nur eine Behauptung im Code.
//
// Auf breiten Schirmen steht die Liste als mitlaufende Seitenspalte neben dem
// Ergebnis (siehe `.wp-ergebnis` in lib/theme.ts), auf schmalen als
// Wischleiste. Beides ist dieselbe Kachel — nur die Anordnung wechselt, und
// zwar über CSS und die Breakpoint-Einstellung des Karussells, nicht über einen
// Zustand in dieser Komponente. Ein `matchMedia`-Flag hätte vor der Hydratation
// einen Startwert gebraucht und damit für jedes Gerät die falsche Variante
// ausgeliefert — derselbe Fehler, der in der Kopfzeile schon einmal steckte.

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

/** Die vier Kennwerte, die über die Eignung entscheiden. Mehr wäre Datenblatt. */
function kennwerte(g: WpGeraet): { label: string; wert: string; mono: boolean }[] {
  const w: { label: string; wert: string; mono: boolean }[] = [];
  if (leistungAnzeigbar(g)) {
    const t = geraetLeistungTeile(g.leistungKw);
    w.push({ label: "Heizleistung", wert: `${t.value} ${t.unit}`, mono: true });
  }
  if (g.vorlaufMaxC !== null) {
    w.push({ label: "Vorlauf max.", wert: `${g.vorlaufMaxC} °C`, mono: true });
  }
  if (g.kaeltemittel) {
    w.push({
      label: "Kältemittel",
      wert: g.kaeltemittel === "r290" ? "Propan" : "R32",
      mono: false,
    });
  }
  if (g.aufbau) {
    w.push({ label: "Bauart", wert: g.aufbau === "monoblock" ? "Monoblock" : "Split", mono: false });
  }
  return w;
}

/**
 * Der eine Satz, der Rechnung und Gerät verbindet — mit den eigenen Zahlen des
 * Nutzers, nicht als Häkchen. Ohne die Zahlen wäre die Kachel Werbung.
 */
function passungsSatz(befunde: Befund[], fall: Props): string | null {
  const leistungOk = befunde.some((b) => b.art === "leistung-passt");
  const vorlaufOk = befunde.some((b) => b.art === "vorlauf-reicht");
  if (leistungOk && vorlaufOk) {
    return `Passt zu ${fall.auslegungKw.toLocaleString("de-DE")} kW und ${fall.vorlaufC} °C Vorlauf`;
  }
  const gross = befunde.find((b) => b.art === "leistung-reichlich");
  if (gross && gross.art === "leistung-reichlich") {
    return `${gross.ueberKw.toLocaleString("de-DE")} kW mehr als berechnet — läuft öfter im Takt`;
  }
  const knapp = befunde.find((b) => b.art === "vorlauf-knapp");
  if (knapp && knapp.art === "vorlauf-knapp") {
    return `Schafft ${knapp.geraetC} °C — wenig Reserve über den nötigen ${knapp.noetigC} °C`;
  }
  return null;
}

function Karte({ e, rang, fall }: { e: Empfehlung; rang: number; fall: Props }) {
  const g = e.geraet;
  const werte = kennwerte(g);
  const satz = passungsSatz(e.befunde, fall);
  const preis = geraetPreisTeile(g.preisEur);
  const empfohlen = rang === 0;

  return (
    <div
      style={{
        // Im Karussell trägt der Rahmen die Kachelbreite, in der Spalte die
        // Spalte selbst — deshalb volle Breite und die Begrenzung außen.
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: v("--color-bg"),
        border: `${empfohlen ? 2 : 1}px solid ${empfohlen ? v("--color-accent") : v("--color-border")}`,
        borderRadius: v("--radius-lg"),
        padding: pad("md", "md"),
      }}
    >
      {empfohlen && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: v("--color-accent"),
            marginBottom: space.sm,
          }}
        >
          Günstigstes passendes
        </div>
      )}

      <div style={{ display: "flex", gap: space.md, marginBottom: space.sm }}>
        <div
          style={{
            width: 64,
            height: 64,
            flex: "0 0 auto",
            borderRadius: v("--radius-sm"),
            // Fester heller Grund, KEIN Theme-Token: Händlerbilder sind auf
            // Weiß freigestellt. Auf einer dunklen Tagesstufe verschwindet das
            // Gerät sonst in der Fläche — gemessen an den ersten drei Kacheln,
            // alle drei praktisch unsichtbar. Das ist kein Farbschema-Verstoß,
            // sondern derselbe Fall wie das feste Ampel-Grün: Die Fläche gehört
            // zum fremden Bild, nicht zu unserer Oberfläche.
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          {g.bildUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={g.bildUrl}
              alt=""
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: v("--color-text-muted"), marginBottom: 2 }}>
            {g.marke}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.35, color: v("--color-text-primary") }}>
            {g.name}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: space.xs,
          marginBottom: space.sm,
          flexWrap: "wrap",
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>
          <span
            style={{
              fontFamily: v("--font-mono"),
              fontSize: 22,
              fontWeight: 700,
              color: v("--color-text-primary"),
            }}
          >
            {preis.value}
          </span>
          <span style={{ fontSize: 13, color: v("--color-text-secondary") }}> {preis.unit}</span>
        </span>
        {/* Der Preis ist rund ein Drittel der Anlage — wer das erst im
            Kleingedruckten liest, hat sich schon verrechnet. */}
        <span style={{ fontSize: 11, color: v("--color-text-muted"), marginLeft: "auto" }}>
          Gerätepreis
        </span>
      </div>

      {werte.length > 0 && (
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: space.sm,
            margin: 0,
            padding: `${space.sm}px 0`,
            borderTop: `1px solid ${v("--color-border")}`,
            borderBottom: `1px solid ${v("--color-border")}`,
            marginBottom: space.sm,
          }}
        >
          {werte.map((w) => (
            <div key={w.label}>
              <dt style={{ fontSize: 11, color: v("--color-text-muted") }}>{w.label}</dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: v("--color-text-primary"),
                  fontFamily: w.mono ? v("--font-mono") : undefined,
                  whiteSpace: "nowrap",
                }}
              >
                {w.wert}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {satz && (
        <div
          style={{
            display: "flex",
            gap: space.xs,
            fontSize: 12,
            lineHeight: 1.4,
            color: v("--color-text-secondary"),
            marginBottom: space.sm,
          }}
        >
          <span aria-hidden style={{ flex: "0 0 auto", marginTop: 1, color: v("--color-positive") }}>
            <IconCheck size={13} />
          </span>
          <span>{satz}</span>
        </div>
      )}

      <a
        href={g.link}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        style={{
          marginTop: "auto",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: space.xs,
          padding: pad("sm", "md"),
          fontSize: 13,
          fontWeight: 700,
          color: v("--color-accent"),
          background: v("--color-accent-dim"),
          border: `1px solid ${v("--color-border-accent")}`,
          borderRadius: v("--radius-sm"),
          textDecoration: "none",
        }}
      >
        Beim Händler ansehen
        <IconExternal size={13} />
      </a>
    </div>
  );
}

export default function WpGeraeteEmpfehlung({ auslegungKw, vorlaufC, wpType }: Props) {
  const [antwort, setAntwort] = useState<Antwort | null>(null);
  const [laedt, setLaedt] = useState(true);

  // Wischleiste auf schmalen Schirmen, ab der Seitenspalte abgeschaltet — die
  // Umschaltung macht Embla selbst über seine Breakpoint-Option, damit es nur
  // EINEN Umschaltpunkt gibt und nicht zwei, die auseinanderlaufen können.
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    breakpoints: { "(min-width: 1024px)": { active: false } },
  });

  useEffect(() => {
    let abgebrochen = false;
    setLaedt(true);
    fetch(`/api/wp-geraete?kw=${auslegungKw}&vorlauf=${vorlaufC}&typ=${wpType}`)
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

  const fall = { auslegungKw, vorlaufC, wpType };

  return (
    <div style={{ display: "grid", gap: space.md }}>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: v("--color-text-secondary") }}>
        Passend zur berechneten Anlage. Sortiert nach dem Preis für dich, nicht nach unserer
        Provision.
      </p>

      {/* Ein Baum für beide Anordnungen: Der Rahmen ist auf schmalen Schirmen
          das Sichtfenster des Karussells, ab 1024 px ein gewöhnlicher Stapel.
          Die Breiten stehen als Inline-Regel am Element, weil sie zur Mechanik
          des Karussells gehören — CSS-Klassen dafür würden die Zuständigkeit
          zwischen Stylesheet und Karussell aufteilen. */}
      <div ref={emblaRef} style={{ overflow: "hidden" }}>
        <ul
          className="wp-geraete-reihe"
          style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: space.md }}
        >
          {treffer.map((e, i) => (
            <li key={e.geraet.id} className="wp-geraete-kachel" style={{ minWidth: 0 }}>
              <Karte e={e} rang={i} fall={fall} />
            </li>
          ))}
        </ul>
      </div>

      {/* Der teuerste Satz der Seite — und er wird hier NICHT formuliert.

          Ziel und Wortlaut kommen aus `lib/beg-antrag.ts`, der einen Quelle für
          diese Regel; ein Test verbietet, sie ein zweites Mal zu tippen.

          Hier steht bewusst NUR der Merksatz mit Verweis, nicht die ganze Regel:
          Der Förderblock derselben Seite trägt sie bereits im Volltext. Am
          Bildschirm standen beide untereinander — zweimal dasselbe, einmal beim
          Betrag und einmal beim Kaufknopf. Der Merksatz gehört trotzdem hierher,
          weil an dieser Stelle geklickt wird.

          Warum das mehr ist als Ordnungsliebe: Die erste hier getippte Fassung
          war FALSCH und zu streng („ein Kauf vor der Förderzusage schließt die
          Förderung aus"). Der Ausschluss hängt an der ANTRAGSTELLUNG — die
          Richtlinie erklärt den Beginn zwischen Antrag und Zusage ausdrücklich
          für zulässig (Nr. 9.2.1). Aufgefallen ist das einer Parallel-Sitzung,
          nicht hier. Aus einer geteilten Quelle korrigiert man solche Sätze
          einmal statt an vier Stellen, von denen man drei vergisst. */}
      <div
        style={{
          borderLeft: `3px solid ${v("--color-negative")}`,
          padding: pad("sm", "md"),
          fontSize: 12,
          lineHeight: 1.5,
          color: v("--color-text-secondary"),
          background: v("--color-negative-dim"),
        }}
      >
        <strong style={{ color: v("--color-text-primary") }}>Erst der Antrag, dann der Kauf.</strong>{" "}
        <Link href={BEG_ANTRAG_HREF} style={{ color: v("--color-accent") }}>
          Die Reihenfolge Schritt für Schritt
        </Link>
      </div>

      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: v("--color-text-muted") }}>
        Angegeben ist der Gerätepreis des Händlers, nicht der Preis der fertigen Anlage —
        Speicher, Regelung, Montage und Inbetriebnahme kommen dazu. Hersteller messen die
        Heizleistung außerdem bei unterschiedlichen Außentemperaturen; die Zahl taugt zum
        Vorauswählen, die verbindliche Auslegung macht der Fachbetrieb. {BEG_EIGENLEISTUNG}{" "}
        Über die Links erhalten wir beim Kauf eine Provision, für dich ändert sich am Preis
        nichts.
        {antwort?.auswahlAus ? ` Ausgewählt aus ${antwort.auswahlAus} Geräten.` : ""}
      </p>
    </div>
  );
}
