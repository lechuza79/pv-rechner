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
 * Produktbilder: die FREIGESTELLTEN Aufnahmen des Händlers, aus unserem eigenen
 * Ordner — nicht die Bilder, die seine Schnittstelle mitliefert.
 *
 * DIE SHOP-BILDER TRAGEN DREI FREMDE TESTSIEGEL (Focus Money „Deutschlands
 * Beste", Deutschland Test „Preis-Tipp", TestBild „Top Marke"), und sie standen
 * damit einen halben Tag live in einem Block, der wie unsere eigene Rechnung
 * aussieht. Das erste davon beruht auf einer Kundenbefragung, ist also eine
 * Verbraucherbewertung: Wer sie zugänglich macht, muss angeben, ob und wie er
 * ihre Echtheit prüft (§ 5b Abs. 4 UWG), und sie ungeprüft als echt
 * darzustellen ist per se unlauter (Anhang Nr. 23b zu § 3 Abs. 3 UWG). Genau
 * deshalb zeigt dieses Projekt bei den Fachbetrieben keine Bewertungen — hier
 * wären sie durch die Hintertür wieder hereingekommen. Alle 98 Bilder je
 * Produkt tragen sie (nachgesehen, nicht vermutet).
 *
 * WARUM DIE MODUL-ANSICHT UND NICHT DIE MIT SPEICHER: Die Freisteller „mit
 * Speicher" haben die Kapazität aufgedruckt, und zwar immer die kleinste Stufe
 * (2,11 kWh). Neben einem Angebot mit 4,22 kWh stünde das Bild gegen den Text —
 * die Fehlerklasse „zwei Zahlen für dieselbe Sache". Die Modul-Ansicht behauptet
 * über den Speicher nichts, ihre Leistungsangabe (1000 W) deckt sich mit unserer
 * (1 kWp), und es gibt sie für alle drei Modelle.
 *
 * Zugeordnet wird über die MODULLEISTUNG, weil die aus dem Produktnamen des
 * Shops kommt und die drei Modelle eindeutig trennt (900 / 1000 / 2000 W). Ein
 * unbekanntes Modell bekommt kein Bild, nie ein falsches.
 *
 * FREIGABE DES HÄNDLERS LIEGT VOR (09.09.2026, per Mail an den Betreiber:
 * „verwende gerne die Bilder"), dazu der Ordner „Media Hub für Partner &
 * Kooperationen", aus dem diese Aufnahmen stammen. Ohne diese Erlaubnis wäre
 * das Spiegeln fremder Produktfotos Vervielfältigung und öffentliche
 * Zugänglichmachung (EuGH C-161/17, Renckhoff — Rn. 21 zur Kopie auf den
 * eigenen Server, Rn. 36 dazu, dass freie Abrufbarkeit daran nichts ändert);
 * die Mail ist der Beleg und gehört aufgehoben. Sie deckt die Bilder DIESES
 * Händlers — ein zweiter Shop braucht seine eigene.
 *
 * Der Schalter bleibt, weil eine Erlaubnis widerruflich ist.
 */
export const BILDER_FREIGEGEBEN = true;

/**
 * Modulleistung des Sets → freigestellte Aufnahme des Modells.
 *
 * Aus unserem eigenen Ordner ausgeliefert: Damit geht keine Besucher-IP an den
 * Shop, bevor jemand den Kauflink angeklickt hat.
 */
const MODELL_BILD: Record<number, string> = {
  900: "/shop/solakon/onlite-900.png",
  1000: "/shop/solakon/onbasic-1000.png",
  2000: "/shop/solakon/onpower-2000.png",
};

function modellBild(a: ShopAngebot): string | null {
  return MODELL_BILD[a.moduleWp] ?? null;
}

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

/**
 * Der Kaufweg. Steht in beiden Darstellungen und trägt deshalb seine eigene
 * Begründung:
 *
 * EIN KAUFWEG IST EIN LINK, KEIN KNOPF — und beim Bauen war er einer
 * (09.09.2026): Der Knopf öffnete den Shop per Skript, weshalb im
 * ausgelieferten HTML KEINE einzige Shop-Adresse stand. Drei Folgen, alle von
 * außen unsichtbar, weil die Seite dabei normal aussieht — die Partnerkennung
 * war nirgends nachweisbar, „in neuem Tab öffnen" und Mittelklick taten
 * nichts, und ein Screenreader meldete kein Ziel.
 *
 * `rel="sponsored"` ist bei einem Provisionslink Googles ausdrückliche Vorgabe
 * für bezahlte Verweise; `noopener` verhindert, dass die Zielseite über
 * `window.opener` auf unseren Tab zugreift.
 */
function ZumShop({ angebot, hervor }: { angebot: ShopAngebot; hervor: boolean }) {
  // Die Alternative bekommt einen Textlink statt eines Knopfes. Das ist nicht
  // nur Hierarchie: Mit Rahmen war die Zeile aus Name, Preis und Knopf zu
  // breit, der Knopf rutschte in eine eigene Zeile und riss ein Loch in den
  // Block (im Bild gesehen, 09.09.2026).
  const rahmen = hervor
    ? {
        padding: "10px 18px",
        border: `1px solid ${v("--color-accent")}`,
        background: v("--color-accent"),
        // Auf Vollton gehört die Vollton-Schriftfarbe: `--color-bg` wäre auf
        // den dunklen Tagesstufen dunkle Schrift auf farbiger Fläche.
        color: v("--color-text-on-accent"),
        borderRadius: v("--radius-md"),
      }
    : { color: v("--color-accent") };

  return (
    <a
      href={angebotUrl(angebot)}
      target="_blank"
      rel="sponsored noopener noreferrer"
      style={{
        flex: "0 0 auto",
        display: "inline-flex", alignItems: "center", gap: 6,
        textDecoration: "none", whiteSpace: "nowrap",
        fontSize: v("--font-size-small"), fontWeight: 600,
        ...rahmen,
      }}
    >
      Zum Shop <IconArrowRight size={14} />
    </a>
  );
}

/** Preis und was er einbringt — in beiden Darstellungen gleich aufgebaut. */
function Preisblock({ eintrag, gross }: { eintrag: BewertetesAngebot; gross: boolean }) {
  const preis = preisTeile(eintrag.angebot.preis);
  const amort = isFinite(eintrag.ergebnis.amortYears)
    ? jahreDativ(eintrag.ergebnis.amortYears)
    : "rechnet sich nicht";
  return (
    <div>
      <div style={{ whiteSpace: "nowrap" }}>
        <span style={{
          fontSize: gross ? v("--font-size-h2") : v("--font-size-h3"),
          fontWeight: 700, color: v("--color-text-primary"),
        }}>
          {preis.value}
        </span>{" "}
        <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
          {preis.unit}
        </span>
      </div>
      <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
        {nf(eintrag.ergebnis.savingPerYear)} €/Jahr · bezahlt nach {amort}
      </div>
    </div>
  );
}

/**
 * Das empfohlene Set — mit Bild, weil hier eines etwas trägt.
 *
 * DAS BILD STEHT NUR HIER, UND DAS IST DER GANZE PUNKT. Die drei Angebote sind
 * regelmäßig dasselbe Modell und unterscheiden sich nur im Speicher; die
 * freigestellte Aufnahme zeigt die Module. Bei jeder Zeile ein Bild hieß
 * deshalb: dreimal exakt dasselbe Bild übereinander (so am 09.09.2026 gebaut
 * und im Bild gesehen) — das liest sich wie ein Fehler und behauptet obendrein,
 * die Sets seien gleich. Einmal groß beim empfohlenen Set zeigt, worum es
 * geht; die Alternativen sind Varianten davon und brauchen es nicht.
 */
function Empfehlung({ eintrag }: { eintrag: BewertetesAngebot }) {
  const { angebot } = eintrag;
  const bild = modellBild(angebot);
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16,
      padding: "16px 0",
      borderTop: `1px solid ${v("--color-border")}`,
    }}>
      {BILDER_FREIGEGEBEN && bild && (
        <div style={{
          flex: "0 0 auto",
          width: 132, height: 132,
          borderRadius: v("--radius-md"),
          overflow: "hidden",
          position: "relative",
        }}>
          <Image
            src={bild}
            alt=""
            fill
            sizes="132px"
            style={{ objectFit: "contain" }}
            // Rein schmückend: Was das Set ausmacht, steht als Text daneben.
            // Ein Alternativtext, der die Ausstattung wiederholt, liest sich im
            // Screenreader doppelt.
            aria-hidden
          />
        </div>
      )}

      <div style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div style={{
            fontSize: v("--font-size-caption"), fontWeight: 700,
            color: v("--color-positive"), textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}>
            Rechnet sich am besten
          </div>
          <div style={{ fontSize: v("--font-size-h3"), fontWeight: 700, color: v("--color-text-primary"), marginTop: 2 }}>
            {angebot.produkt}
          </div>
          <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
            {ausstattung(angebot)}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <Preisblock eintrag={eintrag} gross />
          <ZumShop angebot={angebot} hervor />
        </div>
      </div>
    </div>
  );
}

/** Eine Alternative — kompakt, ohne Bild. */
function Alternative({ eintrag }: { eintrag: BewertetesAngebot }) {
  const { angebot } = eintrag;
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
      padding: "12px 0",
      borderTop: `1px solid ${v("--color-border")}`,
    }}>
      <div style={{ flex: "1 1 150px", minWidth: 0 }}>
        <div style={{ fontSize: v("--font-size-body"), fontWeight: 600, color: v("--color-text-primary") }}>
          {angebot.produkt}
        </div>
        <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
          {ausstattung(angebot)}
        </div>
      </div>
      <div style={{ flex: "0 0 auto" }}>
        <Preisblock eintrag={eintrag} gross={false} />
      </div>
      <div style={{ marginLeft: "auto" }}>
        <ZumShop angebot={angebot} hervor={false} />
      </div>
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

      <Empfehlung eintrag={empfehlung.beste} />
      {empfehlung.alternativen.map(eintrag => (
        <Alternative key={eintrag.angebot.id} eintrag={eintrag} />
      ))}

      <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: 10, lineHeight: 1.6 }}>
        Preise von {daten.angebote[0]?.haendlerName}, abgerufen am {datumKurz(daten.abgerufenIso)} — im Shop kann
        inzwischen ein anderer Preis stehen.{" "}
        {/*
          URHEBERBENENNUNG (§ 13 S. 2 UrhG, über § 72 Abs. 1 auch für
          Lichtbilder): Der Händler kann auf dieses Recht nicht wirksam für
          einen Fotografen verzichten, den er selbst nur einfach lizenziert hat
          — und ein Händler haftet dem Fotografen eigenständig, auch wenn sein
          Lieferant die Nutzung zugesagt hat (OLG Celle, 12.05.2026, 13 U
          88/25: Wer ein fremdes Werk nutzt, muss die ganze Rechtekette prüfen).
          Die Zeile kostet nichts und nimmt die häufigste Anspruchsgrundlage weg.
        */}
        {BILDER_FREIGEGEBEN && <>Bildmaterial: {daten.angebote[0]?.haendlerName}.{" "}</>}
        {/*
          VERTRAGLICHE PFLICHTANGABE, keine Höflichkeit: Abschnitt 10 der
          Programmbedingungen (Stand 03/2019) verlangt wörtlich, dass die
          Teilnahme am Partnerprogramm auf der Seite steht („You must, however,
          clearly state the following on your site"). Die Kennzeichnung darüber
          („Anzeige · Provision bei Kauf") erfüllt § 5a Abs. 4 UWG, aber nicht
          diese Pflicht — sie nennt die Provision, nicht das Programm.
        */}
        Solar Check nimmt am Partnerprogramm von {daten.angebote[0]?.haendlerName} teil und
        erhält für vermittelte Käufe eine Provision.{" "}
        {alle.some(a => a.angebot.speicherKwh > 0) && (
          <>Die Speichergröße ist die Herstellerangabe der Batteriekapazität; nutzbar ist etwas
          weniger, der Speichernutzen fällt hier also eher am oberen Rand aus.</>
        )}
      </div>
    </div>
  );
}
