"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { v } from "../lib/theme";
import { IconArrowRight } from "./Icons";
import { angebotUrl, type ShopAngebot, type ShopAngebote } from "../lib/shop-solakon";
import { empfiehlAngebot, type AngebotBasis, type BewertetesAngebot } from "../lib/shop-angebot";
import { preisTeile, jahreDativ, produktSpeicherTeile, pvLeistungTeile } from "../lib/atlas-format";

/**
 * Konkrete Sets am Ende des Balkonrechners — das, was der Rechner bis hierhin
 * ausgerechnet hat, als kaufbares Angebot.
 *
 * DIE REIHENFOLGE IST DER GEWINN FÜR DEN NUTZER, NICHT UNSERE PROVISION. Das ist
 * die Vorgabe des Betreibers vom 19.08.2026 und steht sichtbar am Block, nicht
 * nur im Code — ein Grundsatz, den man nicht nachprüfen kann, ist eine
 * Behauptung. Gerechnet wird mit derselben Stundensimulation wie das Ergebnis
 * darüber (siehe lib/shop-angebot.ts).
 *
 * KENNZEICHNUNG IST PFLICHT, KEINE HÖFLICHKEIT (§ 5a Abs. 4 UWG): Der
 * kommerzielle Zweck muss erkennbar sein, „sofern sich dieser nicht unmittelbar
 * aus den Umständen ergibt" — bei einem Block, der wie ein Rechenergebnis
 * aussieht, ergibt er sich gerade nicht. Der Hinweis steht deshalb AM Block und
 * nicht im Impressum.
 */

/**
 * Produktbilder: über UNSEREN Server, nie direkt vom Shop eingebunden.
 *
 * Ein Bild direkt von der fremden Adresse zu laden hieße, dass der Browser
 * jedes Besuchers beim Shop anklopft — dessen IP-Adresse ginge dorthin, bevor
 * er irgendetwas angeklickt hat. Die Bildoptimierung holt das Bild deshalb
 * serverseitig und liefert es von unserer Domain aus; der Shop erfährt erst vom
 * Klick auf den Kauflink. Der erlaubte Fremd-Host steht in der Next-Konfiguration.
 *
 * FREIGABE DES HÄNDLERS LIEGT VOR (09.09.2026, per Mail an den Betreiber:
 * „verwende gerne die Bilder"), dazu ein Ordner mit weiteren Aufnahmen zum
 * Herunterladen. Ohne diese Erlaubnis wäre das Spiegeln fremder Produktfotos
 * Vervielfältigung und öffentliche Zugänglichmachung (EuGH C-161/17,
 * Renckhoff — Rn. 21 zur Kopie auf den eigenen Server, Rn. 36 dazu, dass freie
 * Abrufbarkeit daran nichts ändert); die Mail ist deshalb der Beleg und gehört
 * aufgehoben. Sie deckt die Bilder DIESES Händlers — ein zweiter Shop braucht
 * seine eigene.
 *
 * Der Schalter bleibt, weil eine Erlaubnis widerruflich ist: Er ist der eine
 * Ort, an dem sich das zurücknehmen lässt.
 */
export const BILDER_FREIGEGEBEN = true;

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

function datumKurz(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Was das Set ausmacht, in einer Zeile: Modulleistung und Speicher. */
function ausstattung(a: ShopAngebot): string {
  const module = pvLeistungTeile(a.moduleWp / 1000);
  const modulText = `${module.value} ${module.unit} Module`;
  if (a.speicherKwh <= 0) return `${modulText} · ohne Speicher`;
  const sp = produktSpeicherTeile(a.speicherKwh);
  return `${modulText} · ${sp.value} ${sp.unit} Speicher`;
}

function Zeile({ eintrag, hervor }: {
  eintrag: BewertetesAngebot;
  hervor: boolean;
}) {
  const { angebot, ergebnis } = eintrag;
  const preis = preisTeile(angebot.preis);
  const amort = isFinite(ergebnis.amortYears) ? jahreDativ(ergebnis.amortYears) : "rechnet sich nicht";

  return (
    <div
      style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
        padding: "12px 0",
        borderTop: `1px solid ${v("--color-border")}`,
      }}
    >
      {BILDER_FREIGEGEBEN && angebot.bildUrl && (
        <div
          style={{
            flex: "0 0 auto",
            width: 56, height: 56,
            borderRadius: v("--radius-md"),
            overflow: "hidden",
            background: v("--color-bg-muted"),
            border: `1px solid ${v("--color-border")}`,
            position: "relative",
          }}
        >
          <Image
            src={angebot.bildUrl}
            alt=""
            fill
            sizes="56px"
            style={{ objectFit: "contain" }}
            // Rein schmückend: Was das Set ausmacht, steht als Text daneben.
            // Ein Alternativtext, der die Ausstattung wiederholt, liest sich im
            // Screenreader doppelt.
            aria-hidden
          />
        </div>
      )}

      <div style={{ flex: "1 1 160px", minWidth: 0 }}>
        <div style={{ fontSize: v("--font-size-body"), fontWeight: 700, color: v("--color-text-primary") }}>
          {angebot.produkt}
          {hervor && (
            <span style={{
              marginLeft: 8, fontSize: v("--font-size-caption"), fontWeight: 700,
              color: v("--color-positive"), whiteSpace: "nowrap",
            }}>
              rechnet sich am besten
            </span>
          )}
        </div>
        <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginTop: 2 }}>
          {ausstattung(angebot)}
        </div>
      </div>

      <div style={{ flex: "0 0 auto", textAlign: "right" }}>
        <div style={{ whiteSpace: "nowrap" }}>
          <span style={{ fontSize: v("--font-size-h3"), fontWeight: 700, fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
            {preis.value}
          </span>{" "}
          <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>{preis.unit}</span>
        </div>
        <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), whiteSpace: "nowrap" }}>
          {nf(ergebnis.savingPerYear)} €/Jahr · bezahlt nach {amort}
        </div>
      </div>

      {/*
        EIN KAUFWEG IST EIN LINK, KEIN KNOPF — und beim Bauen war er einer
        (09.09.2026): Der Knopf öffnete den Shop per Skript, weshalb im
        ausgelieferten HTML KEINE einzige Shop-Adresse stand. Drei Folgen, alle
        von außen unsichtbar, weil die Seite dabei normal aussieht — die
        Partnerkennung war nirgends nachweisbar, „in neuem Tab öffnen" und
        Mittelklick taten nichts, und ein Screenreader meldete kein Ziel.

        `rel="sponsored"` ist bei einem Provisionslink Googles ausdrückliche
        Vorgabe für bezahlte Verweise; `noopener` verhindert, dass die
        Zielseite über `window.opener` auf unseren Tab zugreift.
      */}
      <a
        href={angebotUrl(angebot)}
        target="_blank"
        rel="sponsored noopener noreferrer"
        style={{
          flex: "0 0 auto",
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 14px", borderRadius: v("--radius-md"),
          textDecoration: "none",
          border: `1px solid ${hervor ? v("--color-accent") : v("--color-border")}`,
          background: hervor ? v("--color-accent") : v("--color-bg"),
          color: hervor ? v("--color-bg") : v("--color-text-primary"),
          fontSize: v("--font-size-small"), fontWeight: 600,
        }}
      >
        Zum Shop <IconArrowRight size={14} />
      </a>
    </div>
  );
}

export default function BalkonAngebot({ basis }: { basis: AngebotBasis }) {
  const [daten, setDaten] = useState<ShopAngebote | null>(null);
  const [fehlgeschlagen, setFehlgeschlagen] = useState(false);

  useEffect(() => {
    let aktiv = true;
    fetch("/api/shop/balkon")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: ShopAngebote) => { if (aktiv) setDaten(d); })
      .catch(() => { if (aktiv) setFehlgeschlagen(true); });
    return () => { aktiv = false; };
  }, []);

  const empfehlung = useMemo(
    () => (daten ? empfiehlAngebot(daten.angebote, basis) : null),
    [daten, basis],
  );

  // Kommt der Abruf nicht durch, verschwindet der Block ganz. Ein Kaufhinweis
  // ohne Preis wäre schlechter als keiner — und der Rechner darüber ist
  // vollständig, er braucht diesen Block nicht.
  if (fehlgeschlagen || !daten || !empfehlung) return null;

  const alle = [empfehlung.beste, ...empfehlung.alternativen];

  return (
    <div
      style={{
        background: v("--color-bg"),
        borderRadius: v("--radius-lg"),
        padding: 16,
        marginBottom: 16,
        border: `1px solid ${v("--color-border")}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: v("--font-size-h3"), fontWeight: 700, color: v("--color-text-primary"), margin: 0 }}>
          Passende Sets zu kaufen
        </h3>
        {/* Kennzeichnung nach § 5a Abs. 4 UWG — sichtbar, nicht versteckt. */}
        <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          Anzeige · Provision bei Kauf
        </span>
      </div>

      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6, margin: "8px 0 4px" }}>
        Diese Sets haben wir mit deinen Angaben durchgerechnet — dieselbe Rechnung wie oben,
        nur mit den echten Daten der Produkte. <strong style={{ color: v("--color-text-secondary") }}>
        Sortiert nach dem, was dir das Set bringt, nicht nach unserer Provision.</strong>{" "}
        Kaufst du über einen dieser Links, bekommen wir eine Provision vom Händler — für dich
        ändert sich am Preis nichts.
      </p>

      {alle.map((eintrag, i) => (
        <Zeile
          key={eintrag.angebot.id}
          eintrag={eintrag}
          hervor={i === 0}
        />
      ))}

      <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 10, lineHeight: 1.6 }}>
        Preise von {daten.angebote[0]?.haendlerName}, abgerufen am {datumKurz(daten.abgerufenIso)} — im Shop kann
        inzwischen ein anderer Preis stehen.{" "}
        {alle.some(a => a.angebot.speicherKwh > 0) && (
          <>Die Speichergröße ist die Herstellerangabe der Batteriekapazität; nutzbar ist etwas
          weniger, der Speichernutzen fällt hier also eher am oberen Rand aus.</>
        )}
      </div>
    </div>
  );
}
