"use client";

import ContactPerson from "./ContactPerson";
import InfoTooltip from "./InfoTooltip";
import Modal from "./Modal";

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { v, space, pad, iconSizes } from "../lib/theme";
import { IconExternal, IconAlert, IconInfo, IconShare, IconCopy, IconChevronDown } from "./Icons";
import ResultSection from "./ResultSection";
import {
  geraetLeistungTeile,
  geraetPreisTeile,
  lieferumfangText,
  preisZusatz,
  umfangText,
  WP_HAENDLER,
  leistungAnzeigbar,
  type WpGeraet,
} from "../lib/wp-katalog";
import type { Befund, Empfehlung, PaketLage } from "../lib/wp-empfehlung";
import {
  geraeteHinweise,
  fallHinweise,
  gemeinsameHinweise,
  hinweiseNachArt,
  WP_HINWEIS_SCHLUSS,
  type Hinweis,
  type WpHinweisFall,
} from "../lib/wp-hinweise";

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

/**
 * Der Fall, wie ihn der Rechner übergibt.
 *
 * Die vier Gebäudeangaben unten kamen am 05.09.2026 dazu — sie speisen die
 * fachlichen Hinweise (`lib/wp-hinweise.ts`) und kosten KEINE zusätzliche
 * Nutzerfrage: Alle vier stehen im Rechner bereits. Übergeben wird der Zustand
 * NACH dem gewählten Sanierungsweg, nicht die Rohantwort — wer „Heizkörper fit
 * machen" gewählt hat, bekommt sonst einen Hinweis, der ihm genau das noch
 * einmal vorschlägt.
 */
interface Props extends WpHinweisFall {
  buildShareUrl: () => string;
  onFundingDetails: () => void;
  fundingEstimate?: { gross: number; net: number; grant: number; assumptions: string };
}

interface Antwort {
  empfehlungen: Empfehlung[];
  alternativ?: Empfehlung[];
  paketLage?: PaketLage;
  abgerufenIso?: string | null;
  auswahlAus?: number;
  grund?: string;
}

/** Die vier Kennwerte, die über die Eignung entscheiden. Mehr wäre Datenblatt. */
function kennwerte(g: WpGeraet): { label: string; wert: string; mono: boolean }[] {
  const w: { label: string; wert: string; mono: boolean }[] = [
    {
      label: "Umfang",
      wert: lieferumfangText(g),
      mono: false,
    },
  ];
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
      wert: g.kaeltemittel === "r290" ? "Propan (natürlich)" : "R32 (fluoriert)",
      mono: false,
    });
  }
  if (g.aufbau === "split") {
    w.push({ label: "Bauart", wert: "Split", mono: false });
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
  // Der frühere Zweig „X kW mehr als berechnet — läuft öfter im Takt" ist am
  // 05.09.2026 weggefallen. Die fachliche Prüfung hat ihn als Verharmlosung
  // beanstandet: Er nennt die Folge nicht. Ersetzt durch den Hinweis
  // `leistung-takten`, der Jahresarbeitszahl und Verdichterlebensdauer benennt
  // und als Warnung eingestuft ist. Hier stehenzulassen hieße, dieselbe Sache
  // zweimal zu sagen, einmal davon zu weich.
  const knapp = befunde.find((b) => b.art === "vorlauf-knapp");
  if (knapp && knapp.art === "vorlauf-knapp") {
    return `Schafft ${knapp.geraetC} °C — wenig Reserve über den nötigen ${knapp.noetigC} °C`;
  }
  return null;
}

/**
 * Was wir NICHT wissen — als eigene Zeile, nicht weggelassen.
 *
 * Die Vorlauftemperatur fehlt bei rund vier von zehn Angeboten, weil sie im
 * Serientext der Baureihe steht und manche Hersteller sie dort nicht nennen.
 * Solche Geräte auszuschließen kostete zwei Drittel der Komplettpakete; sie
 * kommentarlos zu zeigen wäre die andere Übertreibung. Also steht die Lücke da,
 * wo sie zählt — direkt an der Kachel, für den, der 55 °C braucht.
 */
/**
 * Der Stichtag, ab dem das Kältemittel über die Förderfähigkeit entscheidet.
 *
 * Wortlaut der Technischen Mindestanforderungen zur Förderrichtlinie, Nr. 3.4.4
 * (`docs/quellen/BEG-EM-Richtlinie_2026-07-17.pdf`, am 26.08.2026 im Volltext
 * gelesen): „Empfohlen wird die Installation von Wärmepumpen mit natürlichen
 * Kältemitteln. Ab 1. Januar 2028 werden nur noch Wärmepumpen mit natürlichen
 * Kältemitteln gefördert." Als natürlich anerkannt sind dort R290, R600a,
 * R1270, R717, R718 und R744 — R32 gehört nicht dazu.
 *
 * Warum das an die Kachel gehört und nicht in einen Ratgeber: Es ist die eine
 * Frage zur künftigen Förderung, die wir am einzelnen Gerät beantworten können.
 * Der EU-Ursprungsbonus zum selben Zeitraum ist es nicht — woran er sich
 * entscheidet, steht in einem Infoblatt, das nicht vorliegt, und aus dem
 * Markennamen folgt er nicht.
 *
 * Der Satz sagt bewusst „ab 2028", nicht „nicht förderfähig": Heute gekauft
 * bekommt auch ein R32-Gerät den vollen Zuschuss. Es ist eine Information für
 * den, der später plant, keine Warnung vor dem Gerät.
 */
const KAELTEMITTEL_STICHTAG_JAHR = 2028;

/**
 * Die frühere Funktion `unsicherheit()` stand hier und ist am 05.09.2026
 * weggefallen.
 *
 * Sie fasste zwei Lücken in je einen Halbsatz („Vorlauftemperatur nicht
 * angegeben", „Leistung aus der Typenbezeichnung abgeleitet") und behandelte
 * beide gleich. Beide sind jetzt Hinweise mit eigener Abstufung: Die fehlende
 * Vorlauf-Angabe ist bei 55 °C eine Warnung und bei 35 °C eine Einordnung —
 * derselbe Satz für beides erzeugte im Neubau Sorge ohne Anlass.
 */

/** Farbe und Zeichen je Dringlichkeit — an EINER Stelle, für Kachel und Fuß. */
function hinweisTon(gewicht: Hinweis["gewicht"]): { farbe: string; Icon: typeof IconAlert } {
  if (gewicht === "warnung") return { farbe: v("--color-negative"), Icon: IconAlert };
  return { farbe: v("--color-text-muted"), Icon: IconInfo };
}

/**
 * Eine Zeile fachlicher Einordnung.
 *
 * Das Zeichen trägt die Dringlichkeit MIT, nicht die Farbe allein: Dreieck und
 * Kreis unterscheiden sich auch im Druck, im Bild-Export und bei
 * Farbsehschwäche.
 */
function HinweisZeile({ hinweis }: { hinweis: Hinweis }) {
  const { farbe, Icon } = hinweisTon(hinweis.gewicht);
  return (
    <div
      style={{
        display: "flex",
        gap: space.xs,
        fontSize: v("--font-size-small"),
        lineHeight: 1.4,
        color: v("--color-text-secondary"),
      }}
    >
      <span aria-hidden style={{ flex: "0 0 auto", marginTop: 1, color: farbe }}>
        <Icon size={13} />
      </span>
      <span>{hinweis.text}</span>
    </div>
  );
}

/**
 * Die beiden Blöcke unter der Geräteliste.
 *
 * Oben die Auswahl, darunter das Apropos — abgesetzt durch eine eigene
 * Überschrift, nicht durch eine zweite Trennlinie: Zwei Linien so dicht
 * untereinander lesen sich wie zwei Abschnitte der Seite, nicht wie zwei Teile
 * einer Sache.
 */
function HinweisBloecke({ hinweise }: { hinweise: Hinweis[] }) {
  const { auswahl, apropos } = hinweiseNachArt(hinweise);
  return <div className="wp-selection-explanation">
    {auswahl.length > 0 && <section>
      <h3>Was die Auswahl beeinflusst</h3>
      <ul>{auswahl.map(h => <li key={h.id}>{h.text}</li>)}</ul>
    </section>}
    {apropos.length > 0 && <ResultSection title="Was sonst noch dazugehört" summary={`${apropos.length} Punkte`}>
      <ul>{apropos.map(h => <li key={h.id}>{h.text}</li>)}</ul>
    </ResultSection>}
  </div>;
}

export function WpAuswahlHeading(fall: WpHinweisFall) {
  const [open, setOpen] = useState(false);
  return <>
    <div className="wp-section-heading wp-products-heading">
      <h2>Passende Wärmepumpen</h2>
      <button type="button" className="wp-selection-learn-more" onClick={() => setOpen(true)}>Mehr erfahren</button>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title="So wählen wir passende Wärmepumpen aus">
      <div className="wp-selection-explanation">
        <p>Die Vorauswahl richtet sich nach deiner berechneten Auslegung: <strong>{fall.auslegungKw.toLocaleString("de-DE")} kW · {fall.vorlaufC} °C Vorlauf.</strong> Die passenden Geräte werden nach Preis sortiert.</p>
      </div>
      <HinweisBloecke hinweise={fallHinweise(fall)} />
    </Modal>
  </>;
}

/**
 * Der Erhebungstag der Preise, als deutsches Datum.
 *
 * Steht an EINER Stelle, weil ihn seit dem 27.08.2026 zwei Orte brauchen: die
 * Kachel (dort korrigiert das Datum die Fehlvorstellung "das ist der aktuelle
 * Preis") und — falls er dort einmal fehlt — der Block darüber. Zweimal
 * getippt liefen die beiden beim ersten Formatwechsel auseinander.
 */
function preisStandText(abgerufenIso: string | null | undefined): string | null {
  if (!abgerufenIso) return null;
  return new Date(abgerufenIso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Karte({
  e,
  rang,
  fall,
  preisStand,
  ohneHinweise = [],
}: {
  e: Empfehlung;
  rang: number;
  fall: Props;
  /** Erhebungstag der Preise — gehört an den Preis, nicht in den Block darüber. */
  preisStand: string | null;
  /** Kennungen, die schon über der Liste stehen — dreimal derselbe Satz ist Füllung. */
  ohneHinweise?: readonly string[];
}) {
  const g = e.geraet;
  const werte = kennwerte(g);
  const satz = passungsSatz(e.befunde, fall);
  const hinweise = geraeteHinweise(g, fall, undefined, ohneHinweise);
  const preis = geraetPreisTeile(g.preisEur);
  const empfohlen = rang === 0;
  // Allocate the capped project subsidy proportionally; never deduct the whole
  // project grant from one merchant item or imply an uncapped personal rate.
  const fundingFraction = fall.fundingEstimate && fall.fundingEstimate.gross > 0
    ? Math.min(1, Math.max(0, fall.fundingEstimate.grant / fall.fundingEstimate.gross)) : 0;
  const estimatedOwnPrice = Math.round(g.preisEur * (1 - fundingFraction));
  const displayName = g.name.replace(/Luft\s*\/\s*Wasser[- ]?/gi, "").replace(/Wärmepumpe[n]?/gi, "").replace(/-+(?=[ ,]|$)/g, "").replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim();
  const [linkStatus, setLinkStatus] = useState("");
  const [shareText, setShareText] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const openShare = () => {
    setCopyStatus("");
    setShareText(`Hallo, könnten Sie bitte prüfen, ob diese Wärmepumpe für mein Haus geeignet ist, und mir ein vollständiges Angebot inklusive benötigtem Zubehör und Montage erstellen?

${g.name}
${g.preisEur.toLocaleString("de-DE")} € (${umfangText(g)}, ${preisZusatz(g)}${preisStand ? `, Preisabruf ${preisStand}` : ""}; maßgeblich ist der Shoppreis)
${g.link}

Geschätzte Auslegung: ${fall.auslegungKw.toLocaleString("de-DE")} kW, Vorlauf: ${fall.vorlaufC} °C. Bitte vor Ort prüfen.
Meine Modellrechnung: ${fall.buildShareUrl()}

Vielen Dank!`);
  };

  return (
    <div className="wp-product-card" data-recommended={empfohlen}
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
      {/* Kopfzeile der Kachel: Spitzenstellung mit Bezugsgröße links, Anzeigen-
          Kennzeichnung rechts.

          BEIDES ist eine Korrektur, keine Verzierung.

          "Günstigstes passendes" allein ist eine Spitzenstellungsbehauptung
          ohne Grundgesamtheit — günstigstes wovon? Gemeint ist: von den Geräten
          EINES Shops, die zur berechneten Heizlast passen. Die Bezugsgröße muss
          dort stehen, wo der Superlativ steht, nicht drei Absätze höher.

          Und die Kennzeichnung steht je Kachel, nicht nur einmal über dem
          Block: Der Leitfaden der Medienanstalten verlangt Erkennbarkeit
          "insbesondere ohne Scrollen oder Ausklappen" und sagt ausdrücklich,
          ein pauschaler Hinweis für ein ganzes Angebot genüge nicht. Wer auf
          der Wischleiste bei der dritten Kachel ankommt, hatte den Block oben
          längst aus dem Blick. */}
      <div className="wp-product-heading" style={{ display: "flex", gap: space.md, marginBottom: space.sm }}>
        <a href={g.link} target="_blank" rel="nofollow sponsored noopener noreferrer" aria-label={`${displayName} im Shop ansehen`} className="wp-product-image"
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
      <div className="wp-product-rank"
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: space.sm,
          marginBottom: space.sm,
        }}
      >
        <span title={empfohlen ? `Günstigstes passendes bei ${WP_HAENDLER.kurz}` : undefined} className={empfohlen ? "wp-product-badge" : undefined}>
          {empfohlen ? "Günstigstes Angebot" : "\u00a0"}
        </span>
        <span
          style={{
            fontSize: v("--font-size-micro"),
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: v("--color-text-muted"),
            flex: "0 0 auto",
          }}
        >
          ANZEIGE
        </span>
      </div>

          <span className="wp-product-photo">{g.bildUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={g.bildUrl}
              alt={g.name}
              loading="eager"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}</span>
          <span className="wp-product-name wp-product-image-title" title={g.name}>{displayName}</span>
        </a>
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
              fontFamily: v("--font-heading"),
              fontSize: v("--font-size-display-sm"),
              fontWeight: 700,
              color: v("--color-text-primary"),
            }}
          >
            {preis.value}
          </span>
          <span style={{ fontSize: v("--font-size-body"), color: v("--color-text-secondary") }}> {preis.unit}</span>
        </span>
        {/* Was im Preis steckt, gehört NEBEN den Preis. Ein Monoblock allein
            kostet für dieselbe Anlagengröße rund 4.000 € weniger als ein Paket
            mit Speicher — ohne diese Zeile sieht das eine schlicht günstiger
            aus, und der Nutzer kauft die Hälfte. */}
        {g.umfang === "paket" && <span style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginLeft: "auto" }}>{umfangText(g)}</span>}
      </div>

      {/* Pflichtangaben zum Preis (§ 5b Abs. 1 Nr. 3 UWG): Gesamtpreis und
          Lieferkosten sind wesentliche Informationen, sobald Merkmale und Preis
          so zusammenstehen, dass jemand kaufen kann. Der Wortlaut kommt aus
          `preisZusatz` — an der Kachel getippt stünde er beim nächsten Gerät
          mit Versandkosten falsch da. */}
      <div style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted"), marginTop: -4 }}>
        {g.umfang === "paket" && <span className="wp-product-extras">Vollständige Installation nicht enthalten.</span>}
        {preisZusatz(g)}
        {/* Datum UND Vorrang — der Zusatz war beim Umbau auf drei Stellen
            ersatzlos entfallen (Gegenprüfung 05.09.2026). Das Datum allein sagt,
            wann wir geholt haben; es sagt nicht, welcher Preis gilt, wenn der
            Shop inzwischen einen anderen nennt. Genau diese zweite Aussage macht
            aus dem Hinweis einen „klaren gegenteiligen Hinweis" im Sinne der
            Espressomaschinen-Entscheidung — ohne sie bleibt die Erwartung
            höchstmöglicher Aktualität unwidersprochen. */}
        {preisStand ? ` · Preis vom ${preisStand}; es gilt der Preis im Shop.` : null}
      </div>

      {fundingFraction > 0 && <div className="wp-product-funded-price">
        <div className="wp-funded-amount"><strong><small>ca.</small> {estimatedOwnPrice.toLocaleString("de-DE")} <small>€</small></strong></div>
        <div className="wp-funded-label"><span>mit Förderung</span></div>
        <span className="wp-funded-help">
          <InfoTooltip ariaLabel="Wie wird der Gerätepreis mit Förderung geschätzt?" title="Geschätzter Geräteanteil nach Förderung">
            Die Förderung aus deiner Modellrechnung wird anteilig auf den Gerätepreis verteilt ({(fundingFraction * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %). Der Förderdeckel ist dabei berücksichtigt. {fall.fundingEstimate?.assumptions} Voraussetzung ist, dass das Gerät und dein Vorhaben förderfähig sind; das ist noch nicht bestätigt. Beim Händler zahlst du zunächst den vollen Preis, die Förderung wird separat ausgezahlt. Montage und weiteres Zubehör sind in diesem Geräteanteil nicht enthalten.
          </InfoTooltip>
        </span>
        <button className="wp-funded-footer" onClick={fall.onFundingDetails} aria-label="Förderung genau berechnen">Förderung genau berechnen</button>
      </div>}

      {(werte.length > 0 || satz || g.kaeltemittel === "r32" || hinweise.length > 0) && (
        <details className="wp-card-disclosure wp-card-specs"><summary><span>Details</span><IconChevronDown size={iconSizes.sm} /></summary>
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
              <dt style={{ fontSize: v("--font-size-caption"), color: v("--color-text-muted") }}>{w.label}</dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: v("--font-size-body"),
                  color: v("--color-text-primary"),
                  fontFamily: w.mono ? v("--font-mono") : undefined,
                  // `nowrap` NUR für Zahlen mit Einheit — dort gehört beides in
                  // eine Zeile, sonst steht die Einheit allein darunter und
                  // liest sich so groß wie der Wert. Ein Textwert dagegen muss
                  // umbrechen dürfen: Mit erzwungenem `nowrap` lief die
                  // Umfangs-Angabe quer über die Nachbarspalte, statt eine
                  // zweite Zeile zu nehmen.
                  whiteSpace: w.mono ? "nowrap" : "normal",
                  overflowWrap: "anywhere",
                }}
              >
                {w.wert}
              </dd>
            </div>
          ))}
        </dl>
      {(satz || g.kaeltemittel === "r32" || hinweise.length > 0) && <div className="wp-card-notes"><p>Anmerkungen</p>
        <ul className="wp-product-notes">
          {satz && <li>{satz}</li>}
          {g.kaeltemittel === "r32" && <li>Ab {KAELTEMITTEL_STICHTAG_JAHR} nicht mehr förderfähig — dann fördert die BEG nur noch natürliche Kältemittel</li>}
          {hinweise.map((h) => <li key={h.id}>{h.text}</li>)}
        </ul>
      </div>}
        </details>
      )}

      <div className="wp-product-actions">
        <button className="wp-product-forward" onClick={openShare} aria-label="An deinen Heizungsbauer weiterleiten"><IconShare size={16} /> Weiterleiten</button>
        <a className="wp-product-shop" href={g.link} target="_blank" rel="nofollow sponsored noopener noreferrer">Zum Shop <IconExternal size={14} /></a>
        <button className="wp-product-copy" aria-label="Produktlink kopieren" title="Produktlink kopieren" onClick={async () => {
          try { await navigator.clipboard.writeText(g.link); setLinkStatus("Link kopiert"); }
          catch { setLinkStatus("Kopieren nicht möglich. Nutze Weiterleiten."); }
        }}><IconCopy size={16} /></button>
      </div>
      {linkStatus && <p className="wp-product-copy-status" role="status">{linkStatus}</p>}
      <Modal open={shareText !== null} onClose={() => setShareText(null)} title="An deinen Heizungsbauer weiterleiten" intro="Die Nachricht enthält das Gerät und deine Auslegung zur Prüfung durch den Fachbetrieb.">
        <textarea className="wp-product-share-text" aria-label="Nachricht an deinen Heizungsbauer" value={shareText ?? ""} readOnly rows={10} />
        <div className="wp-product-share-actions">
          <button onClick={async () => {
            try { await navigator.clipboard.writeText(shareText ?? ""); setCopyStatus("Nachricht kopiert."); }
            catch { setCopyStatus("Bitte den Nachrichtentext markieren und kopieren."); }
          }}>Nachricht kopieren</button>
          <a href={`mailto:?subject=${encodeURIComponent("Wärmepumpe – Bitte um Prüfung und Angebot")}&body=${encodeURIComponent(shareText ?? "")}`}>E-Mail vorbereiten</a>
        </div>
        <p role="status">{copyStatus}</p>
      </Modal>
    </div>
  );
}

export default function WpGeraeteEmpfehlung(fall: Props) {
  const { auslegungKw, vorlaufC, wpType } = fall;
  const [antwort, setAntwort] = useState<Antwort | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [selectionDetailsOpen, setSelectionDetailsOpen] = useState(false);

  // Wischleiste auf schmalen Schirmen, ab der Seitenspalte abgeschaltet — die
  // Umschaltung macht Embla selbst über seine Breakpoint-Option, damit es nur
  // EINEN Umschaltpunkt gibt und nicht zwei, die auseinanderlaufen können.
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    breakpoints: { "(min-width: 1200px)": { active: false } },
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
      <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
        Passende Geräte werden gesucht …
      </div>
    );
  }

  const treffer = antwort?.empfehlungen ?? [];
  if (treffer.length === 0) {
    /**
     * DREI LAGEN, DREI SÄTZE — und bis zum 10.09.2026 stand hier für alle drei
     * derselbe.
     *
     * „Für diese Anlagengröße ist gerade kein passendes Gerät im Sortiment von
     * Heizungsdiscount24" ist eine Aussage über das Sortiment eines DRITTEN.
     * Sie stimmt genau dann, wenn wir den Katalog gelesen und nichts Passendes
     * gefunden haben. Kamen wir gar nicht an ihn heran, oder ist der Bestand zu
     * alt zum Anzeigen, behauptet derselbe Satz etwas, das wir nicht belegen
     * können — dieselbe Trennlinie wie beim Förder-Wächter zwischen „hat sich
     * geändert" und „Abruf kam nicht durch".
     *
     * Die Route benennt den Grund seit demselben Tag; das Feld gab es hier
     * schon, es wurde nur nie gelesen. Aufgefallen ist es in einem
     * Arbeitsstand ohne Datenbankzugang: Die Seite sah normal aus.
     */
    const grund = antwort?.grund;
    const text =
      grund === "katalog-unerreichbar"
        ? "Die Geräteliste lässt sich gerade nicht abrufen. Das sagt nichts über das Sortiment — bitte später noch einmal versuchen."
        : grund === "katalog-veraltet"
          ? `Aktuelle Gerätepreise sind derzeit nicht verfügbar.`
          : `Für diese Anlagengröße und Vorlauftemperatur ist gerade kein passendes Gerät im Sortiment von ${WP_HAENDLER.kurz}. Das heißt nicht, dass es keins gibt — nur, dass wir keins belegen können.`;
    return (
      <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), lineHeight: 1.5 }}>
        {text}
      </div>
    );
  }

  const alternativ = antwort?.alternativ ?? [];
  // Hinweise, die an jeder Kachel gleich stünden — sie stehen einmal über der
  // Liste und werden an den Kacheln ausgelassen.
  const gemeinsam = gemeinsameHinweise(treffer.map((e) => e.geraet), fall);
  const gemeinsameIds = gemeinsam.map((h) => h.id);
  /**
   * Wann wir die Preise geholt haben.
   *
   * Ein Preis ohne Erhebungszeitpunkt behauptet Aktualität, die wir nicht
   * zusagen können: Der Datenstrom wird einmal täglich abgerufen, der Händler
   * ändert seine Preise, wann er will.
   *
   * Fundstelle ist BGH, Urt. v. 11.03.2010 – I ZR 123/08 (Espressomaschine),
   * Leitsatz 1: Der Nutzer eines Preisvergleichsportals erwartet "vorbehaltlich
   * klarer gegenteiliger Hinweise regelmäßig ... höchstmögliche Aktualität" —
   * schon eine Preiserhöhung, die nur für einige Stunden auseinanderfällt,
   * führt in die Irre. (Am 27.08.2026 im Volltext gelesen. Ein früherer
   * Kommentar nannte hier I ZR 140/07; das ist "Versandkosten bei Froogle" und
   * betrifft eine andere Frage.)
   *
   * ZWEI Dinge folgen daraus für die FORM des Hinweises, nicht nur für sein
   * Vorhandensein — Leitsatz 2 derselben Entscheidung verwarf ein "Alle Angaben
   * ohne Gewähr" in der FUSSZEILE als untauglich, ausdrücklich auch dann, wenn
   * es auf eine Erläuterungsseite verlinkt: Kaufinteressenten rufen solche
   * Seiten nicht auf.
   *
   * Der Hinweis steht deshalb AN JEDEM PREIS statt einmal irgendwo, und er ist
   * konkret: Datum plus die Angabe, welcher Preis im Zweifel gilt. Beides
   * zusammen — eine allgemeine Haftungsformel wäre genau der verworfene Fall.
   *
   * ACHTUNG, hier stand der Kommentar schon einmal falsch (Gegenprüfung
   * 05.09.2026): Nach dem Umbau auf drei Stellen behauptete er weiterhin, der
   * Hinweis stehe "oben im Anzeigen-Block" und trage den Vorrang-Zusatz — der
   * war zu dem Zeitpunkt ersatzlos entfallen. Ein Kommentar, der einen
   * Schutzmechanismus beschreibt, den es nicht gibt, ist schlimmer als keiner:
   * Wer ihn liest, prüft nicht nach.
   *
   * Adressat der Entscheidung war der werbende Händler, nicht das Portal —
   * unser Hinweis ist insoweit vorsorglich, nicht geschuldet.
   */
  const preisStand = preisStandText(antwort?.abgerufenIso);
  const paketLage = antwort?.paketLage;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0, overflow: "hidden", overflowWrap: "anywhere", gap: space.md }}>
      {/* Werbekennzeichnung — Stelle und Wortlaut sind geprüft, nicht gewählt.

          DREI STELLEN, NICHT EIN ABSATZ. Eine frühere Fassung packte alle fünf
          Pflichtangaben in einen Fließtext über den Kacheln — 70 Wörter, die
          niemand liest, und der Betreiber hielt sie zu Recht für praxisfern
          ("das würde jeden affiliate shop zerschießen"). Die dritte
          Rechtsprüfung (27.08.2026) hat ihm recht gegeben und zugleich den
          naheliegenden Ausweg verworfen: Auslagern hinter einen Aufklapper geht
          NICHT, weil § 5a Abs. 3 UWG auf einer scrollbaren Seite gar nicht
          greift — der EuGH hat entschieden, dass die eigene Entscheidung über
          die Raumaufteilung für die Beurteilung "irrelevant" ist (C-430/17,
          Walbusch, Rn. 39). Der Weg ist ZERLEGEN: jede Angabe dorthin, wo sie
          hingehört. Sichtbar bleiben dadurch rund 55 Wörter statt 70.

          Hier oben: Kennzeichnung, Herkunft aus einem Sortiment, Provision.
          An der Kachel: Preis, Steuer, Versand, Preisstand.
          Unter den Kacheln: Verkäufer mit Anschrift und Widerrufsrecht.

          Der PREISSTAND wandert damit von hier an den Preis — und das ist kein
          Layout-Detail: Das Datum korrigiert die Fehlvorstellung "das ist der
          aktuelle Preis", und der BGH hat für einen Vorbehalt an anderer Stelle
          ausdrücklich entschieden, dass er die Irreführung nicht ausräumt
          (I ZR 123/08, Espressomaschine, Leitsatz 2).

          ÜBER den Kacheln, nicht darunter: Die Aufsicht verlangt Erkennbarkeit
          „ohne Scrollen", die Rechtsprechung „auf den ersten Blick". Der Hinweis
          stand zuvor als vierter Satz eines 11-px-Absatzes UNTER allen Kacheln —
          auf dem Handy erreichbar erst nach der Wischleiste, auf dem Desktop
          unterhalb des Sichtbereichs der klebenden Spalte. Beide Male ist der
          Kaufknopf vorher da. Das Landgericht Berlin hat 2024 einen fast
          gleichen Fall entschieden (102 O 27/24).

          Das Wort „Anzeige": Zwei Prüfer sind hier auseinandergegangen. Der
          Leitfaden der Medienanstalten trennt Affiliate-Links (Symbol plus
          Erläuterung genügt) von werblichen Links (Wort nötig) — und wir liegen
          näher am zweiten Fall, weil wir das Sortiment EINES Händlers zeigen,
          nicht eine Marktauswahl. Dazu ist die Frage für Zivilgerichte
          ungeklärt: Es gibt keine obergerichtliche Entscheidung, die einen
          reinen Provisionshinweis genügen lässt. Bei ungeklärter Lage
          entscheidet die Fehlerrichtung — eine Kennzeichnung zu viel ist
          praktisch nicht angreifbar, eine zu wenig war der Grund, aus dem ein
          vergleichbares Verbraucherportal verurteilt wurde (OLG Dresden
          14 U 207/19, rechtskräftig).

          Der Händlername steht ausdrücklich da: § 6 Abs. 1 Nr. 2 DDG verlangt,
          dass erkennbar ist, in wessen Auftrag geworben wird. „Unser Partner"
          erfüllt das nicht, und das Linkziel ist eine Netzwerk-Adresse.

          Und der Sortiments-Zuschnitt: Der BGH hat für ein Preisportal
          entschieden, dass die Beschränkung auf provisionspflichtige Anbieter
          eine wesentliche Information ist (I ZR 55/16). Unser Fall ist enger —
          ein einziger Händler. Ohne den Satz lesen sich Überschrift und
          „ausgewählt aus N Geräten" als Marktüberblick. */}
      <div className="wp-product-package-note"><span className="wp-awareness-icon"><IconAlert size={iconSizes.lg} /></span><div>
        <p>{(paketLage === "keine" || paketLage === "unpassend")
          ? <><strong>{WP_HAENDLER.kurz} hat kein passendes Komplettset für deinen Bedarf.</strong> Hier siehst du Einzelgeräte; Zubehör und Montage kommen hinzu.</>
          : <>Auch bei Komplettsets können Zubehör und Montage hinzukommen. Prüfe den Lieferumfang.</>}
        {" "}<button type="button" className="wp-selection-details-link" onClick={() => setSelectionDetailsOpen(true)}>Details</button></p>
        <Modal open={selectionDetailsOpen} onClose={() => setSelectionDetailsOpen(false)} title="Lieferumfang und zusätzliche Kosten">
          <ul className="wp-product-notes">
            {[...new Map(treffer.flatMap(e => geraeteHinweise(e.geraet, fall, Infinity).filter(h => h.id.startsWith("umfang-"))).map(h => [h.id, h])).values()].map(h => <li key={h.id}>{h.text}</li>)}
            <li>{WP_HINWEIS_SCHLUSS}</li>
            <li>Mit „Zum Shop“ verlässt du solar-check.io. Den Kaufvertrag schließt du mit {WP_HAENDLER.kurz}; dort besteht ein Widerrufsrecht. Der Gerätepreis ist nicht der Preis der fertigen Anlage.</li>
          </ul>
        </Modal>
      </div></div>

      {/* One product list: swipe on mobile, three columns on desktop. */}
      <div ref={emblaRef} style={{ overflow: "hidden" }}>
        <ul
          className="wp-geraete-reihe"
          style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: space.md }}
        >
          {treffer.map((e, i) => (
            <li key={e.geraet.id} className="wp-geraete-kachel" style={{ minWidth: 0 }}>
              <Karte e={e} rang={i} fall={fall} preisStand={preisStand} ohneHinweise={gemeinsameIds} />
            </li>
          ))}
        </ul>
      </div>

      {alternativ.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${v("--color-border")}`,
            paddingTop: space.md,
            display: "grid",
            gap: space.sm,
          }}
        >
          <p style={{ margin: 0, fontSize: v("--font-size-small"), lineHeight: 1.5, color: v("--color-text-secondary") }}>
            <strong style={{ color: v("--color-text-primary") }}>Nur die Wärmepumpe</strong> — wenn
            Speicher und Regelung schon da sind oder getrennt gekauft werden.
          </p>
          <ul
            className="wp-geraete-reihe"
            style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: space.md }}
          >
            {alternativ.map((e) => (
              <li key={e.geraet.id} className="wp-geraete-kachel" style={{ minWidth: 0 }}>
                <Karte e={e} rang={-1} fall={fall} preisStand={preisStand} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="wp-product-trust">
        <ContactPerson beforeName={<span className="wp-product-promise"><strong>Mein Versprechen:</strong> Die Empfehlungen sind nach Preis und passender Heizleistung für deinen Bedarf ausgewählt – nicht nach unserer Provision.</span>} />
        <p className="wp-product-disclosure">Die Geräte stammen von unserem Partner {WP_HAENDLER.kurz}, nicht aus dem gesamten Markt. Bei einem Kauf über unsere Links erhalten wir eine Provision; dein Preis bleibt gleich.</p>
      </div>

      {/* Shared safety restrictions stay visible; longer cost explanations are optional. */}
      {gemeinsam.filter((h) => !h.id.startsWith("umfang-")).map((h) => <HinweisZeile key={h.id} hinweis={h} />)}


    </div>
  );
}
