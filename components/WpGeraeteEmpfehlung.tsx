"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { v, space, pad } from "../lib/theme";
import { IconExternal, IconCheck } from "./Icons";
import ContactPerson from "./ContactPerson";
import {
  geraetLeistungTeile,
  geraetPreisTeile,
  haendlerAnschrift,
  lieferumfangText,
  preisZusatz,
  umfangText,
  WP_HAENDLER,
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
  alternativ?: Empfehlung[];
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

function unsicherheit(befunde: Befund[]): string | null {
  if (befunde.some((b) => b.art === "vorlauf-unbekannt")) {
    return "Vorlauftemperatur nicht angegeben — beim Fachbetrieb prüfen lassen";
  }
  if (befunde.some((b) => b.art === "leistung-unsicher")) {
    return "Leistung aus der Typenbezeichnung abgeleitet";
  }
  return null;
}

function Karte({ e, rang, fall }: { e: Empfehlung; rang: number; fall: Props }) {
  const g = e.geraet;
  const werte = kennwerte(g);
  const satz = passungsSatz(e.befunde, fall);
  const offen = unsicherheit(e.befunde);
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
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: space.sm,
          marginBottom: space.sm,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: v("--color-accent") }}>
          {empfohlen ? `Günstigstes passendes bei ${WP_HAENDLER.kurz}` : "\u00a0"}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: v("--color-text-muted"),
            flex: "0 0 auto",
          }}
        >
          ANZEIGE
        </span>
      </div>

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
        {/* Was im Preis steckt, gehört NEBEN den Preis. Ein Monoblock allein
            kostet für dieselbe Anlagengröße rund 4.000 € weniger als ein Paket
            mit Speicher — ohne diese Zeile sieht das eine schlicht günstiger
            aus, und der Nutzer kauft die Hälfte. */}
        <span style={{ fontSize: 11, color: v("--color-text-muted"), marginLeft: "auto" }}>
          {umfangText(g)}
        </span>
      </div>

      {/* Pflichtangaben zum Preis (§ 5b Abs. 1 Nr. 3 UWG): Gesamtpreis und
          Lieferkosten sind wesentliche Informationen, sobald Merkmale und Preis
          so zusammenstehen, dass jemand kaufen kann. Der Wortlaut kommt aus
          `preisZusatz` — an der Kachel getippt stünde er beim nächsten Gerät
          mit Versandkosten falsch da. */}
      <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: -4 }}>
        {preisZusatz(g)}
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

      {g.kaeltemittel === "r32" && (
        <div
          style={{
            display: "flex",
            gap: space.xs,
            fontSize: 12,
            lineHeight: 1.4,
            color: v("--color-text-muted"),
            marginBottom: space.sm,
          }}
        >
          <span aria-hidden style={{ flex: "0 0 auto", marginTop: 1 }}>·</span>
          <span>
            Ab {KAELTEMITTEL_STICHTAG_JAHR} nicht mehr förderfähig — dann fördert die BEG nur
            noch natürliche Kältemittel
          </span>
        </div>
      )}

      {offen && (
        <div
          style={{
            display: "flex",
            gap: space.xs,
            fontSize: 12,
            lineHeight: 1.4,
            color: v("--color-text-muted"),
            marginBottom: space.sm,
          }}
        >
          <span aria-hidden style={{ flex: "0 0 auto", marginTop: 1 }}>·</span>
          <span>{offen}</span>
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
        Sortiment von {WP_HAENDLER.kurz}. Das heißt nicht, dass es keins gibt — nur, dass wir
        keins belegen können.
      </div>
    );
  }

  const fall = { auslegungKw, vorlaufC, wpType };
  const alternativ = antwort?.alternativ ?? [];
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
   * Seiten nicht auf. Deshalb steht unser Hinweis oben im Anzeigen-Block statt
   * unter den Kacheln, und er ist konkret (Datum plus "es gilt der Preis im
   * Shop") statt eine allgemeine Haftungsformel. Wer ihn je nach unten
   * verschiebt oder zu "ohne Gewähr" verkürzt, baut genau den Fall nach, den
   * der BGH entschieden hat.
   *
   * Adressat dort war der werbende Händler, nicht das Portal — unser Hinweis
   * ist insoweit vorsorglich, nicht geschuldet.
   */
  const preisStand = antwort?.abgerufenIso
    ? new Date(antwort.abgerufenIso).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;
  const nurEinzelgeraete = treffer.every((e) => e.geraet.umfang === "geraet");

  return (
    <div style={{ display: "grid", gap: space.md }}>
      {/* Werbekennzeichnung — Stelle und Wortlaut sind geprüft, nicht gewählt.

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
      <div
        style={{
          border: `1px solid ${v("--color-border")}`,
          borderRadius: v("--radius-md"),
          padding: pad("md", "md"),
          display: "grid",
          gap: space.sm,
        }}
      >
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: v("--color-text-secondary") }}>
          <strong style={{ color: v("--color-text-primary") }}>Anzeige</strong> — Die Geräte kommen
          aus dem Sortiment der {haendlerAnschrift()}, sind also kein Marktüberblick. Gekauft wird
          dort, nicht bei uns; bei einer Bestellung im Shop besteht ein Widerrufsrecht. Über die
          Links erhalten wir eine Provision, wenn du dort kaufst; für dich ändert sich am Preis
          nichts.
          {preisStand ? ` Preise vom ${preisStand}; es gilt der Preis im Shop.` : null}
        </p>
        {/* Das Versprechen steht NEBEN der Kennzeichnung, nicht statt ihrer.

            Ein Gesicht und ein Satz in der ersten Person sind kein Ersatz für
            die Offenlegung — sie sind die Antwort auf die Frage, die sie
            aufwirft: Wenn ihr mitverdient, wonach wählt ihr dann aus?

            DER SATZ NENNT SEINE DIMENSION — das ist die ganze Korrektur.

            Die erste Fassung endete auf "nie nach unserer Provision". Angreifbar
            war daran nicht die Aussage, sondern ihre Reichweite: Ein Leser
            bezieht sie darauf, ob Provision beeinflusst, WAS ER ÜBERHAUPT SIEHT
            — und da lautet die ehrliche Antwort: ja, vollständig, es gibt genau
            einen Partnershop. Eine absolute Aussage über die eigenen Beweggründe
            ist zudem als irreführungsfähig ausdrücklich benannt (§ 5 Abs. 2
            Nr. 3 UWG), und wer sie aufstellt, trägt sie.

            Ein zweiter Anlauf schrieb daraufhin nur noch über Sortierreihenfolge
            und Partnerprogramm — und warf damit die Zusage weg, um die es geht:
            dass wir nach Sinnhaftigkeit für den Nutzer entscheiden. Das war
            überkorrigiert. Eine wahre Aussage vorsichtshalber vager zu machen
            ist keine Verbesserung, und der Gegenprüfer hatte ausdrücklich davor
            gewarnt.

            Jetzt steht dort, WORAUF sich das Versprechen bezieht: auf die Wahl
            des Geräts. Die ist vollständig durch Heizlast, Vorlauftemperatur und
            Preis bestimmt — nachprüfbar in `beurteile` und `empfehlungenFuer`,
            wo die Provision überhaupt nicht vorkommt. Dass die Geräte alle aus
            einem Sortiment stammen, sagt der Absatz darüber ("kein
            Marktüberblick"), und zwar bevor das Versprechen kommt. */}
        <ContactPerson note="Mein Versprechen: Welches Gerät wir dir empfehlen, entscheiden deine Heizlast, deine Vorlauftemperatur und der Preis für dich — nicht, woran wir mehr verdienen." />
      </div>

      {/* Warum hier nur Einzelgeräte stehen, gehört gesagt.

          Über rund 12,5 kW führt der Händler keine Komplettpakete mehr — bei
          12 kW sind es drei, bei 15 kW keins. Ohne diesen Satz sieht es aus, als
          hätten wir grundsätzlich keine Pakete im Programm, und der Nutzer
          vergleicht einen Gerätepreis mit dem Anlagenpreis oben, ohne zu wissen,
          dass es an seiner Anlagengröße liegt. */}
      {nurEinzelgeraete && (
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: v("--color-text-muted") }}>
          In dieser Anlagengröße führt {WP_HAENDLER.kurz} keine Komplettpakete. Die Geräte unten sind
          die Wärmepumpe allein — Speicher, Regelung und Montage kommen dazu.
        </p>
      )}

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

      {alternativ.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${v("--color-border")}`,
            paddingTop: space.md,
            display: "grid",
            gap: space.sm,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: v("--color-text-secondary") }}>
            <strong style={{ color: v("--color-text-primary") }}>Nur die Wärmepumpe</strong> — wenn
            Speicher und Regelung schon da sind oder getrennt gekauft werden.
          </p>
          <ul
            className="wp-geraete-reihe"
            style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: space.md }}
          >
            {alternativ.map((e) => (
              <li key={e.geraet.id} className="wp-geraete-kachel" style={{ minWidth: 0 }}>
                <Karte e={e} rang={-1} fall={fall} />
              </li>
            ))}
          </ul>
        </div>
      )}

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
        Vorauswählen, die verbindliche Auslegung macht der Fachbetrieb. {BEG_EIGENLEISTUNG}
        {antwort?.auswahlAus ? ` Ausgewählt aus ${antwort.auswahlAus} Geräten des Sortiments.` : ""}
      </p>
    </div>
  );
}
