// ─── Angebotsprüfung: die drei Urteile ────────────────────────────────────────
//
// Nimmt ein ausgelesenes Wärmepumpen-Angebot und das Gebäude, das der Rechner
// ohnehin schon kennt, und fällt drei Urteile: Größe, Vollständigkeit, Preis.
//
// DIESES MODUL KENNT KEINE ZAHL. Alle Referenzwerte kommen aus
// angebot-check-config.ts, alles Gebäudebezogene wird hereingereicht. Damit ist
// die Prüfung ohne Netz, ohne Datenbank und ohne Modell testbar — und das ist der
// Punkt: Das Auslesen des PDF darf schiefgehen, das Urteil darüber nicht.
//
// WAS HIER NIE ENTSTEHEN DARF: eine Aussage über den BETRIEB. Zulässig ist
// "im Angebot fehlt der Umbau des Zählerschranks", unzulässig "dein Heizungsbauer
// verschweigt Kosten". Der Unterschied ist nicht Höflichkeit, sondern die Grenze
// zwischen Verbraucherinformation und Herabsetzung eines Wettbewerbers.

import {
  ANGEBOTS_POSITIONEN,
  GROESSEN_TOLERANZ,
  SPEZ_KOSTEN,
  SPEZ_KOSTEN_BAENDER,
  type AngebotsPosition,
} from "./angebot-check-config";

// ─── Was der Auslese-Schritt liefert ─────────────────────────────────────────

/** Eine Kostenposition, wie sie im Angebot steht. */
export interface AusgelesenePosition {
  /** Schlüssel aus ANGEBOTS_POSITIONEN, oder null wenn nicht zuzuordnen. */
  id: string | null;
  /** Wortlaut aus dem Angebot — für die Anzeige, damit der Nutzer es wiederfindet. */
  wortlaut: string;
  /** Einzelpreis brutto, falls das Angebot einen nennt. */
  betragEur: number | null;
  /**
   * Was diese Position zusätzlich einschließt (andere Positions-Schlüssel).
   * DAS ist die Angabe, an der die Prüfung hängt: Eine Geräteposition, die
   * Hydraulikmodul und Regelung enthält, ist mit einem Gerätepreis aus dem
   * Onlinehandel nicht vergleichbar. Ohne diese Angabe wird nicht verglichen.
   */
  enthaeltAuch: string[];
}

/**
 * Eine Rückfrage an den Heizungsbauer, formuliert für DIESES Angebot.
 *
 * WARUM DER MEISTER SIE SCHREIBT UND NICHT EINE VORLAGE: Was in einem Angebot
 * fehlt oder schief steht, lässt sich nicht vorwegnehmen. Der hydraulische
 * Abgleich, der als Pflicht-Überschrift dasteht und dessen Unterposten alle auf
 * „Alternativ" stehen, ist keine Kategorie in irgendeiner Liste — den sieht nur,
 * wer das Dokument liest. Eine feste Vorlage je fehlender Position würde genau
 * die Fälle verschweigen, für die es die Prüfung gibt.
 *
 * WAS DER MEISTER TROTZDEM NICHT DARF: eine Zahl nennen. Beträge und
 * Häufigkeiten kommen aus der Referenz und werden beim Anzeigen angehängt —
 * so kann in einer Rückfrage kein Betrag stehen, den niemand belegt hat.
 */
export interface Rueckfrage {
  /** Die Frage im Wortlaut, an den Nutzer gerichtet. */
  text: string;
  /** Worauf sie sich bezieht — Positions-Schlüssel, wenn es einer ist. */
  bezug: string | null;
}

export interface AusgelesenesAngebot {
  /** Herstellerbezeichnung des Geräts, so wie sie im Angebot steht. */
  geraet: string | null;
  marke: string | null;
  /** Heizleistung in kW, falls genannt. */
  leistungKw: number | null;
  /** Gesamtpreis brutto in Euro. */
  gesamtpreisEur: number | null;
  positionen: AusgelesenePosition[];
  /**
   * Konkrete Rückfragen an den Heizungsbauer, für dieses Angebot formuliert.
   * Leer, wenn nichts zu fragen ist — das ist ein zulässiges Ergebnis.
   */
  rueckfragen: Rueckfrage[];
  /**
   * Was der Auslese-Schritt NICHT sicher lesen konnte — im Klartext, für die
   * Anzeige. Eine leere Liste ist eine Behauptung; wer hier nie etwas einträgt,
   * hat den Schritt falsch gebaut.
   */
  unsicher: string[];
}

/** Was der Rechner über das Gebäude bereits weiß. */
export interface GebaeudeBezug {
  /** Norm-Heizlast in kW, wie der Rechner sie aus dem Gebäude ableitet. */
  heizlastKw: number;
  /** Auslegungsleistung in kW — die Größe, auf die ausgelegt wird. */
  auslegungKw: number;
}

// ─── Urteil 1: Anlagengröße ──────────────────────────────────────────────────

export type GroessenUrteil = "unbekannt" | "knapp" | "passend" | "reichlich" | "deutlich-groesser";

export interface GroessenBefund {
  urteil: GroessenUrteil;
  /** Leistung laut Angebot in kW. */
  angebotKw: number | null;
  /** Unsere Auslegungsleistung in kW. */
  erwartetKw: number;
  /** Abweichung als Anteil (0,25 = 25 % mehr als erwartet). */
  abweichung: number | null;
}

export function pruefeGroesse(angebot: AusgelesenesAngebot, gebaeude: GebaeudeBezug): GroessenBefund {
  const erwartetKw = gebaeude.auslegungKw;
  if (angebot.leistungKw == null || angebot.leistungKw <= 0 || erwartetKw <= 0) {
    return { urteil: "unbekannt", angebotKw: angebot.leistungKw, erwartetKw, abweichung: null };
  }
  const abweichung = angebot.leistungKw / erwartetKw - 1;
  const urteil: GroessenUrteil =
    abweichung < GROESSEN_TOLERANZ.knappAb ? "knapp"
    : abweichung <= GROESSEN_TOLERANZ.passendBis ? "passend"
    : abweichung <= GROESSEN_TOLERANZ.reichlichBis ? "reichlich"
    : "deutlich-groesser";
  return { urteil, angebotKw: angebot.leistungKw, erwartetKw, abweichung };
}

// ─── Urteil 2: Vollständigkeit ───────────────────────────────────────────────

export interface FehlendePosition {
  position: AngebotsPosition;
  /**
   * "fehlt" = im Angebot nicht auffindbar.
   * "ohne-preis" = genannt, aber ohne eigenen Betrag — dann weiß niemand, was
   * sie kostet, und ein Vergleich mit einem zweiten Angebot ist unmöglich.
   */
  art: "fehlt" | "ohne-preis";
}

export interface VollstaendigkeitsBefund {
  /** Nur was wirklich fehlt und wirklich gebraucht wird. */
  fehlend: FehlendePosition[];
  /**
   * Enthalten, aber ohne eigenen Betrag — im Pauschalpreis untergegangen.
   *
   * BEWUSST EIGENE KATEGORIE, kein Mangel. Die Leistung ist da, der Nutzer wird
   * sie bekommen. Es ist trotzdem ein Befund: Gebündelte Preise sind genau der
   * Grund, warum sich zwei Angebote nicht vergleichen lassen — die Beobachtung,
   * mit der die Auswertung der Verbraucherzentrale anfängt. Sie unter „fehlt"
   * zu führen wäre eine falsche Auskunft, sie wegzulassen eine verschwiegene.
   */
  ohnePreis: FehlendePosition[];
  /** Positionen, deren Fehlen je nach Lage in Ordnung ist. */
  moeglicherweiseNoetig: FehlendePosition[];
  /** Wie viele der geforderten Positionen das Angebot mit Preis ausweist. */
  ausgewiesen: number;
  /** Bezugsgröße dazu. */
  gefordert: number;
}

export function pruefeVollstaendigkeit(angebot: AusgelesenesAngebot): VollstaendigkeitsBefund {
  // Eine Position gilt als abgedeckt, wenn sie als eigene Zeile auftaucht ODER
  // eine andere Position sie ausdrücklich einschließt. Ohne den zweiten Fall
  // meldeten wir jedem Pauschalangebot neun fehlende Positionen.
  const genannt = new Set<string>();
  const mitPreis = new Set<string>();
  for (const p of angebot.positionen) {
    if (p.id) {
      genannt.add(p.id);
      if (p.betragEur != null) mitPreis.add(p.id);
    }
    for (const zusatz of p.enthaeltAuch) {
      genannt.add(zusatz);
      // Bewusst NICHT in mitPreis: eingeschlossen heißt gerade, dass es keinen
      // eigenen Betrag gibt.
    }
  }

  const fehlend: FehlendePosition[] = [];
  const ohnePreis: FehlendePosition[] = [];
  const moeglicherweiseNoetig: FehlendePosition[] = [];
  let ausgewiesen = 0;
  let gefordert = 0;

  for (const pos of ANGEBOTS_POSITIONEN) {
    if (pos.pflicht !== "je-nach-fall") gefordert++;
    if (mitPreis.has(pos.id)) {
      if (pos.pflicht !== "je-nach-fall") ausgewiesen++;
      continue;
    }
    if (genannt.has(pos.id)) {
      ohnePreis.push({ position: pos, art: "ohne-preis" });
      continue;
    }
    const eintrag: FehlendePosition = { position: pos, art: "fehlt" };
    if (pos.pflicht === "je-nach-fall") moeglicherweiseNoetig.push(eintrag);
    else fehlend.push(eintrag);
  }

  return { fehlend, ohnePreis, moeglicherweiseNoetig, ausgewiesen, gefordert };
}

// ─── Urteil 3: Preis ─────────────────────────────────────────────────────────

export type PreisUrteil = "unbekannt" | "darunter" | "im-band" | "darueber";

export interface PreisBefund {
  urteil: PreisUrteil;
  /** Spezifische Kosten des Angebots in €/kW. */
  spezKostenEurProKw: number | null;
  /** Das leistungsabhängige Vergleichsband. */
  band: { von: number; bis: number; beschriftung: string } | null;
  /** Median über alle ausgewerteten Angebote — als Zusatz, nie als Maßstab. */
  medianAlle: number;
}

export function pruefePreis(angebot: AusgelesenesAngebot): PreisBefund {
  const basis: PreisBefund = {
    urteil: "unbekannt",
    spezKostenEurProKw: null,
    band: null,
    medianAlle: SPEZ_KOSTEN.median,
  };
  const { gesamtpreisEur, leistungKw } = angebot;
  if (gesamtpreisEur == null || leistungKw == null || leistungKw <= 0) return basis;

  const spez = gesamtpreisEur / leistungKw;
  // Das Band richtet sich nach der Leistung LAUT ANGEBOT, nicht nach unserer
  // Auslegung: Verglichen wird der Preis der angebotenen Anlage mit den Preisen
  // gleich großer Anlagen. Ob die Größe stimmt, ist Urteil 1 und eine andere Frage.
  const treffer = SPEZ_KOSTEN_BAENDER.find((b) => leistungKw <= b.bisKw) ?? SPEZ_KOSTEN_BAENDER[SPEZ_KOSTEN_BAENDER.length - 1];
  const band = { von: treffer.von, bis: treffer.bis, beschriftung: treffer.beschriftung };
  const urteil: PreisUrteil = spez < band.von ? "darunter" : spez > band.bis ? "darueber" : "im-band";
  return { urteil, spezKostenEurProKw: spez, band, medianAlle: SPEZ_KOSTEN.median };
}

// ─── Alles zusammen ──────────────────────────────────────────────────────────

/** Eine Rückfrage samt der Zahlen, die der Code beisteuert. */
export interface BelegteRueckfrage extends Rueckfrage {
  /** Anteil der ausgewerteten Angebote, in denen die Leistung enthalten war. */
  anteilEnthalten: number | null;
  /** Median des Einzelpreises, wo er ausgewiesen war. */
  medianKosten: number | null;
  /** Auf wie vielen Angeboten dieser Median beruht. */
  medianBasis: number | null;
}

export interface AngebotsBefund {
  groesse: GroessenBefund;
  vollstaendigkeit: VollstaendigkeitsBefund;
  preis: PreisBefund;
  /** Was der Nutzer nachfragen sollte — Frage vom Meister, Zahlen aus der Referenz. */
  rueckfragen: BelegteRueckfrage[];
  /** Durchgereicht aus dem Auslesen — gehört sichtbar ins Ergebnis. */
  unsicher: string[];
}

/**
 * Hängt an jede Rückfrage die belegten Zahlen ihrer Position.
 *
 * Der Meister formuliert „Frag nach, ob der Umbau des Zählerschranks enthalten
 * ist" — wie oft der fehlt und was er kostet, steht in der Referenz. Damit kann
 * in einer Rückfrage keine Zahl auftauchen, die niemand belegt hat, auch wenn
 * das Modell es versuchen würde.
 */
function belege(fragen: Rueckfrage[]): BelegteRueckfrage[] {
  return fragen.map((f) => {
    const p = f.bezug ? ANGEBOTS_POSITIONEN.find((x) => x.id === f.bezug) : undefined;
    return {
      ...f,
      anteilEnthalten: p?.anteilEnthalten ?? null,
      medianKosten: p?.medianKosten ?? null,
      medianBasis: p?.medianBasis ?? null,
    };
  });
}

export function pruefeAngebot(angebot: AusgelesenesAngebot, gebaeude: GebaeudeBezug): AngebotsBefund {
  return {
    groesse: pruefeGroesse(angebot, gebaeude),
    vollstaendigkeit: pruefeVollstaendigkeit(angebot),
    preis: pruefePreis(angebot),
    rueckfragen: belege(angebot.rueckfragen),
    unsicher: angebot.unsicher,
  };
}

/**
 * Darf der Gerätepreis des Angebots einem Onlinepreis gegenübergestellt werden?
 *
 * BLOCKER. Zwei Rechtsprüfungen sind unabhängig darauf gekommen: Ein Onlinepreis
 * neben einem Preis, der Planung, Montage, Inbetriebnahme und Gewährleistung
 * einschließt, ist ein Vergleich zweier verschiedener Dinge und damit irreführend.
 * Vergleichbar ist nur eine Geräteposition, die nichts weiter enthält.
 *
 * Das ist auch der Grund, warum der Auslese-Schritt `enthaeltAuch` füllen muss:
 * Ohne diese Angabe ist nicht entscheidbar, ob verglichen werden darf — und dann
 * wird nicht verglichen. Lieber keine Zahl als eine falsche.
 */
export function geraetepreisVergleichbar(angebot: AusgelesenesAngebot): boolean {
  const geraet = angebot.positionen.find((p) => p.id === "geraet");
  return !!geraet && geraet.betragEur != null && geraet.enthaeltAuch.length === 0;
}
