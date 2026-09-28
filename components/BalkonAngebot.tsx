"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { trackEvent } from "../lib/analytics";
import { useBalkonAngebote, type BalkonKatalog } from "../lib/use-balkon-angebote";
import AffiliateProductTeaser from "./AffiliateProductTeaser";
import AffiliateTrust from "./AffiliateTrust";
import AffiliateActions from "./AffiliateActions";
import AffiliateCarousel from "./AffiliateCarousel";
import Modal from "./Modal";
import AffiliateFundedPrice from "./AffiliateFundedPrice";
import AffiliateDetails from "./AffiliateDetails";
import { v } from "../lib/theme";
import { IconArrowRight, IconCheck, IconPlus } from "./Icons";
import { angebotUrl, type ShopAngebot } from "../lib/shop-solakon";
import type { BalkonFundingContext } from "../lib/balkon-funding";
import { DEFAULT_BALKON_CONFIG } from "../lib/balkon-config";
import { empfehlungAusBewertung, speicherAnnahme, empfiehlAngebot, type AngebotBasis, type BewertetesAngebot } from "../lib/shop-angebot";
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
        background: v("--color-cta"),
        // Auf Vollton gehört die Vollton-Schriftfarbe: `--color-bg` wäre auf
        // den dunklen Tagesstufen dunkle Schrift auf farbiger Fläche.
        color: v("--color-text-on-accent"),
        borderRadius: v("--radius-pill"),
      }
    : { color: v("--color-accent") };

  return (
    <a
      href={angebotUrl(angebot, undefined, hervor ? "bkw-rechner-empfehlung" : "bkw-rechner-alternative")}
      target="_blank"
      // No `noreferrer`: the merchant should see solar-check.io as the source.
      // The site-wide Referrer-Policy (strict-origin-when-cross-origin) sends only
      // the origin cross-site, never the calculator's path or query.
      rel="sponsored noopener"
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
function Preisblock({ eintrag, gross, result = false, showSavings = true, onFundingDetails }: { showSavings?: boolean; onFundingDetails?: () => void; eintrag: BewertetesAngebot; gross: boolean; result?: boolean }) {
  const preis = preisTeile(eintrag.angebot.preis);
  const amort = isFinite(eintrag.ergebnis.amortYears)
    ? `bezahlt nach ${jahreDativ(eintrag.ergebnis.amortYears)}`
    : `innerhalb von ${eintrag.ergebnis.annualCosts.grid.length} Jahren nicht amortisiert`;
  if (result) {
    const netPrice = preisTeile(Math.max(0, eintrag.angebot.preis - eintrag.fundingEuro));
    return <div className="bkw-product-calculation">
      <div className="bkw-product-price-row">
        <strong>{preis.value} <small>{preis.unit}</small></strong>
        <span>{amort}</span>
      </div>
      {eintrag.fundingEuro > 0 && <AffiliateFundedPrice amount={netPrice.value} helpTitle="Setpreis nach Förderung" helpLabel="Wie wird der Setpreis mit Förderung berechnet?" onDetails={eintrag.fundingNeedsInput ? onFundingDetails : undefined}>
        {eintrag.fundingNotes?.map(note => <p key={note}>{note}</p>)}
        Vom Shoppreis werden {nf(eintrag.fundingEuro)} € Förderung für dieses Set abgezogen. Voraussetzung ist, dass du die Programmbedingungen erfüllst und noch Mittel verfügbar sind. Beim Händler zahlst du den vollen Preis; die Förderung wird separat ausgezahlt. Zusätzliche Kosten sind in diesem Setpreis nicht enthalten.
      </AffiliateFundedPrice>}
      {eintrag.fundingEuro <= 0 && <AffiliateFundedPrice amount={preis.value} emptyLabel={eintrag.fundingLabel ?? "Keine Förderung"} helpTitle="Förderung für dieses Set" helpLabel="Warum wird keine Förderung berücksichtigt?">
        {eintrag.fundingReasons?.map(reason => <p key={reason}>{reason}</p>)}
      </AffiliateFundedPrice>}
      {showSavings && <p><strong>{nf(eintrag.ergebnis.lifetimeSaving)} € Vorteil über {eintrag.ergebnis.annualCosts.grid.length} Jahre</strong> nach Anschaffung{eintrag.fundingEuro > 0 ? " und Förderung" : ""}. {nf(eintrag.ergebnis.savingPerYear)} € Ersparnis im ersten Jahr.</p>}
    </div>;
  }
  return (
    <div>
      <div style={{ whiteSpace: "nowrap" }}>
        <span style={{
          fontSize: gross ? v("--font-size-display-sm") : v("--font-size-h3"),
          fontWeight: 700, fontFamily: v("--font-heading"), color: v("--color-text-primary"),
        }}>
          {preis.value}
        </span>{" "}
        <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
          {preis.unit}
        </span>
      </div>
      <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
        {nf(eintrag.ergebnis.savingPerYear)} € im 1. Jahr · {amort}
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
            color: v("--color-positive-text"), textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}>
            Rechnet sich am besten
          </div>
          <div style={{ fontSize: v("--font-size-h3"), fontWeight: 700, fontFamily: v("--font-heading"), color: v("--color-text-primary"), marginTop: 2 }}>
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

export default function BalkonAngebot({ basis, foerderungEuro = 0, funding, design, katalog, ratedOffers, selectedOfferId, onCalculate, onFundingDetails }: { onFundingDetails?: () => void; selectedOfferId?: string; onCalculate?: (offer: ShopAngebot) => void; basis: AngebotBasis; foerderungEuro?: number; funding?: BalkonFundingContext; design?: "result"; katalog?: BalkonKatalog; ratedOffers?: BewertetesAngebot[] }) {
  const ownCatalogue = useBalkonAngebote(katalog === undefined);
  const { daten, fehlgeschlagen } = katalog ?? ownCatalogue;

  const empfehlung = useMemo(
    () => ratedOffers ? empfehlungAusBewertung(ratedOffers) : (daten ? empfiehlAngebot(daten.angebote, basis, DEFAULT_BALKON_CONFIG, funding) : null),
    [daten, basis, funding, ratedOffers],
  );

  // A failed price fetch must not look like an empty product catalogue.
  if (fehlgeschlagen || !daten || !empfehlung) {
    if (design !== "result") return null;
    return <div className="bkw-offer-result">
      <div className="wp-section-heading"><h2>Passende Sets zu kaufen</h2></div>
      <p className="bkw-offer-intro" role="status">{fehlgeschlagen
        ? "Die aktuellen Shopangebote konnten gerade nicht geladen werden. Deine Berechnung funktioniert trotzdem."
        : !daten ? "Aktuelle Shopangebote werden geladen …" : "Zurzeit gibt es keine passenden lieferbaren Sets aus unserem Partnerangebot."}</p>
    </div>;
  }

  const alle = [empfehlung.beste, ...empfehlung.alternativen];

  if (design === "result") return <div className="bkw-offer-result">
    <div className="wp-section-heading"><h2>Passende Sets zu kaufen</h2></div>
    <p className="bkw-offer-intro">Diese Sets sind mit deinen Angaben durchgerechnet und mit Blick auf {basis.horizonYears ?? DEFAULT_BALKON_CONFIG.lifetimeYears} Jahre verglichen. Mögliche Förderung wird für jedes Set einzeln berücksichtigt.{!!basis.additionalCosts && <> Deine zusätzlichen Kosten von {basis.additionalCosts.toLocaleString("de-DE")} € sind jeweils eingerechnet.</>}</p>
    <AffiliateCarousel label="Weitere Balkonkraftwerke">
      {alle.map((entry, index) => <li key={entry.angebot.id} className="wp-geraete-kachel"><ResultProduct entry={entry} recommended={index === 0} selected={entry.angebot.id === selectedOfferId} onCalculate={onCalculate} onFundingDetails={onFundingDetails} date={daten.abgerufenIso} /></li>)}
    </AffiliateCarousel>
    <p className="bkw-offer-price-note">Preisstand {datumKurz(daten.abgerufenIso)} · Maßgeblich sind Preis und Versandbedingungen im Shop.</p>
    <AffiliateTrust id="bkw-produktauswahl"
      promise="Die Empfehlungen sind nach dem berechneten Vorteil für deinen Bedarf ausgewählt – nicht nach unserer Provision."
      disclosure={<>Solar Check nimmt am Partnerprogramm von {daten.angebote[0]?.haendlerName} teil. Die Sets stammen von unserem Partner {daten.angebote[0]?.haendlerName}, nicht aus dem gesamten Markt. Bei einem Kauf über unsere Links erhalten wir eine Provision; dein Preis bleibt gleich.</>}
    />
  </div>;

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
        <h3 style={{ color: v("--color-text-primary"), margin: 0 }}>
          Passende Sets zu kaufen
        </h3>
        {/* Kennzeichnung nach § 5a Abs. 4 UWG — sichtbar, nicht versteckt. */}
        <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>
          Anzeige · Provision bei Kauf
        </span>
      </div>

      <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6, margin: "8px 0 4px" }}>
        Diese Sets haben wir mit deinen Angaben durchgerechnet — dieselbe Rechnung wie oben,
        nur mit den echten Daten der Produkte
        {/* Oben ist der kommunale Zuschuss abgezogen, hier rechnet jedes Set mit
            seinem Kassenpreis. Ohne diesen Satz stand „bezahlt nach 3,0 Jahren"
            unter einer Kachel mit 1,8 und einem Text, der beides für dieselbe
            Rechnung erklärte (Rechenmodell-Council 12.09.2026). */}
        {foerderungEuro > 0 ? <>, und zwar mit dem Kaufpreis, <strong style={{ color: v("--color-text-secondary") }}>vor der Förderung von {Math.round(foerderungEuro).toLocaleString("de-DE")} €</strong> — mit ihr amortisiert sich jedes Set entsprechend früher</> : null}.{" "}<strong style={{ color: v("--color-text-secondary") }}>
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


/** Domain data inside the same product card and actions used by the WP result. */
function ResultProduct({ entry, recommended, selected, onCalculate, onFundingDetails, date }: { onFundingDetails?: () => void; entry: BewertetesAngebot; recommended: boolean; selected: boolean; onCalculate?: (offer: ShopAngebot) => void; date: string }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [status, setStatus] = useState("");
  const offer = entry.angebot;
  const image = modellBild(offer);
  const url = angebotUrl(offer, undefined, recommended ? "bkw-rechner-empfehlung" : "bkw-rechner-alternative");
  const message = `${offer.produkt} – ${ausstattung(offer)}\n${offer.preis.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € (Stand ${datumKurz(date)})\n${url}`;
  return <article className="wp-product-card" data-recommended={selected}>
    <div className="bkw-product-showcase" data-selected={selected}>
    <header className="bkw-product-header">
      <div><strong>{recommended ? "Größte Ersparnis" : "Alternative"}</strong><span>{nf(entry.ergebnis.lifetimeSaving)} € Ersparnis über {entry.ergebnis.annualCosts.grid.length} Jahre</span></div>
      {(selected || onCalculate) && <button type="button" className="bkw-calculate-link" aria-pressed={selected} aria-label={selected ? "In deiner Berechnung" : "Damit berechnen"} title={selected ? "Wird für dein Ergebnis verwendet" : "Mit diesem Set neu berechnen"} onClick={() => { if (!selected) onCalculate?.(offer); }}>{selected ? <IconCheck size={18} /> : <IconPlus size={18} />}</button>}
    </header>
    <div className="wp-product-heading">
      <a href={url} onClick={() => trackEvent("balkon_shop_angebote")} target="_blank" rel="nofollow sponsored noopener" referrerPolicy="origin" className="wp-product-image" aria-label={`${offer.produkt} im Shop ansehen`}>
        <div className="wp-product-rank"><span /><span>ANZEIGE</span></div>
        <span className="wp-product-photo">{BILDER_FREIGEGEBEN && image && <Image src={image} alt="" fill loading="eager" sizes="(max-width:800px) 80vw, 400px" />}</span>
        <span className="wp-product-name wp-product-image-title">{offer.produkt}</span>
      </a>
    </div>
    </div>
    <p className="bkw-offer-intro">{ausstattung(offer)}</p>
    <Preisblock eintrag={entry} gross result showSavings={false} onFundingDetails={onFundingDetails} />
    <AffiliateDetails>
      <div className="bkw-product-details">
      <section><h4>Preis und Ersparnis</h4>
      <p>{nf(entry.ergebnis.savingPerYear)} € Ersparnis im ersten Jahr. Die Ersparnis über {entry.ergebnis.annualCosts.grid.length} Jahre berücksichtigt Anschaffung{entry.fundingEuro > 0 ? " und Förderung" : ""}.</p>
      <p>Shoppreis: {preisTeile(offer.preis).value} € brutto. Stand {datumKurz(date)}; maßgeblich sind Preis und Versandbedingungen im Shop.{entry.fundingEuro > 0 && " Beim Kauf zahlst du den Shoppreis; die Förderung wird separat ausgezahlt."}</p>
      </section>
      <section><h4>Förderung</h4>
      {(entry.fundingEuro > 0 ? entry.fundingNotes : entry.fundingReasons)?.map(text => <p key={text}>{text}</p>)}
      {entry.fundingEuro > 0 && <p>Angerechnete Förderung für dieses Set: {entry.fundingEuro.toLocaleString("de-DE")} €.</p>}
      </section>
      <section><h4>Ausstattung und Speicher</h4>
      <p>{offer.variante}</p>
      {offer.speicherKwh > 0 && <p>{entry.storageComparison ? <>Gegenüber einem Set gleicher Modulleistung ohne Speicher: {entry.storageComparison.additionalInvestment.toLocaleString("de-DE", { maximumFractionDigits: 0 })} € Mehrkosten nach Förderung. {entry.storageComparison.payback === 0 ? "Keine zusätzlichen Anschaffungskosten für den Speicher." : Number.isFinite(entry.storageComparison.payback) ? `Durch den zusätzlichen Speicherertrag nach ${entry.storageComparison.payback.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Jahren ausgeglichen.` : "Innerhalb des betrachteten Zeitraums und der angenommenen Speicherlebensdauer nicht ausgeglichen."}</> : "Für den Speicher allein können wir keine Amortisation nennen: Ein vergleichbares Set ohne Speicher fehlt."}</p>}
      <p>Wechselrichter: {offer.inverterW} W. {offer.speicherKwh > 0 ? <>{speicherAnnahme(offer)}</> : "Ohne Speicher."}</p>
      {BILDER_FREIGEGEBEN && <p>Bildmaterial: {offer.haendlerName}. Abgebildet sind die Module; den Speicherumfang beschreibt die gewählte Variante.</p>}
      </section></div>
    </AffiliateDetails>
    <AffiliateActions allowReferrer url={url} onShopClick={() => trackEvent("balkon_shop_angebote")} onForward={() => { setStatus(""); setShareOpen(true); }} onCopy={async () => {
      try { await navigator.clipboard.writeText(url); setStatus("Link kopiert"); }
      catch { setStatus("Kopieren nicht möglich. Nutze Weiterleiten."); }
    }} />
    {status && !shareOpen && <p className="wp-product-copy-status" role="status">{status}</p>}
    <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Balkonkraftwerk weiterleiten">
      <textarea className="wp-product-share-text" aria-label="Produktnachricht" readOnly rows={6} value={message} />
      <div className="wp-product-share-actions"><button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(message); setStatus("Nachricht kopiert"); }
        catch { setStatus("Bitte den Nachrichtentext markieren und kopieren."); }
      }}>Nachricht kopieren</button><a href={`mailto:?subject=${encodeURIComponent(offer.produkt)}&body=${encodeURIComponent(message)}`}>E-Mail vorbereiten</a></div>
      <p role="status">{status}</p>
    </Modal>
  </article>;
}

/** Reuse the approved image mapping, specifications and affiliate URL. */
export function BalkonProduktTeaser({ offer }: { offer: ShopAngebot }) {
  return <AffiliateProductTeaser allowReferrer onShopClick={() => trackEvent("balkon_shop_ergebnis")} name={`${offer.haendlerName} ${offer.produkt}`} image={BILDER_FREIGEGEBEN ? modellBild(offer) : null} description={ausstattung(offer)} url={angebotUrl(offer, undefined, "bkw-rechner-empfehlung")} disclosure={<>Unsere Partnerangebote sortieren wir nach deinem berechneten Vorteil – nicht nach unserer Provision.</>} />;
}
