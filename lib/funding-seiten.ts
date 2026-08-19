// ─── Förderseiten je Gemeinde: mehrere statt einer ───────────────────────────
//
// WARUM ES DIESE DATEI GIBT (19.08.2026): Der Betreiber will vier Dinge
// zuverlässig — alle Förderseiten EINER Gemeinde erfasst, regelmäßig gescannt,
// bei aktiven Programmen Seite und Info vorhanden, Status aktuell. Je für
// Photovoltaik, Wärmepumpe und Balkonkraftwerk.
//
// Punkt 1 war strukturell unmöglich. Die Erfassung hielt an DREI Stellen genau
// eine Adresse je Gemeinde fest: `kommunen_kontakt.thema_foerderung_url` als
// einzelnes Textfeld, `funding_url_suche` und `funding_coverage` jeweils mit dem
// Gemeindeschlüssel als Primärschlüssel. Eine Stadt, die Photovoltaik auf der
// einen und Balkonkraftwerke auf einer anderen Seite fördert — der Normalfall,
// nicht die Ausnahme —, verlor eine der beiden. Kein Fehler, keine Meldung: Die
// zweite Seite existierte für uns schlicht nicht, und damit konnte der Katalog je
// Technik gar nicht vollständig werden, egal wie viel jemand liest.
//
// WAS HIER NICHT PASSIERT: Der Katalog (`funding_programs`) wird nicht angefasst.
// Eine Gemeinde mit drei Fundstellen bleibt EIN Programm, das eben drei Techniken
// fördert (`foerdert: ["pv","balkon","waermepumpe"]`) — dafür gibt es das Feld
// bereits, und 16 Gemeinden nutzen es. Wer hier zwei Katalog-Einträge auf
// denselben Gemeindeschlüssel erzeugt, bricht die Stadtseite LEISE: Die
// Zuordnung liefert bei Mehrdeutigkeit bewusst nichts, die Adresse fällt aus der
// Seitenerzeugung und die Seite antwortet 404 — ohne Fehler, ohne roten Test.
// Festgenagelt von `funding-erfassung-grenze.test.ts`.
//
// DIE ALTEN TABELLEN BLEIBEN. `funding_url_suche` beantwortet „haben wir die
// Website dieser Gemeinde schon durchsucht" — dafür ist eine Zeile je Gemeinde
// richtig, das ist der Suchversuch, nicht sein Ergebnis. Falsch war nur, dass
// die FUNDE auf einen einzigen zusammengedrückt wurden. Die bekommen hier ihren
// eigenen Platz, additiv; niemandes laufende Arbeit wird umgeschlüsselt.

import type { FundingTechnik } from "./funding-programs";

/** Woher eine Fundstelle stammt. Bestimmt, wie sehr wir ihr trauen. */
export type SeitenQuelle =
  /** Die URL-Suche hat sie auf der Amtsdomain gefunden. */
  | "suche"
  /** Aus dem Kommunen-Outreach mitgesammelt (Altbestand). */
  | "outreach"
  /** Ein Mensch hat sie eingetragen. */
  | "hand";

/** Ob die Seite beim letzten Abruf erreichbar war. */
export type SeitenZustand = "erreichbar" | "unerreichbar" | "unbekannt";

/**
 * Was ein Mensch beim Lesen der Seite herausgefunden hat.
 *
 * Getrennt vom Zustand der Seite, weil es zwei verschiedene Fragen sind: „kommt
 * die Seite noch?" beantwortet ein Abruf, „steht da eine Förderung?" nur ein
 * Mensch. Eine erreichbare Seite ohne Förderung ist kein Fehler, sondern ein
 * Ergebnis — und ohne dieses Gedächtnis stünde sie beim nächsten Lauf wieder
 * oben im Arbeitsvorrat.
 */
export type LeseErgebnis =
  /** Förderung gefunden und in den Katalog übernommen. */
  | "aufgenommen"
  /** Seite gelesen, es ist keine Förderung (Beratung, Planungsleistung, Altpapier). */
  | "keine-foerderung"
  /** Es war eine, sie ist ausgelaufen. */
  | "ausgelaufen"
  /** Gelesen, aber nicht entscheidbar — braucht einen Menschen mit mehr Kontext. */
  | "unklar";

export type FoerderSeite = {
  /** Amtlicher Gemeindeschlüssel. */
  regionId: string;
  /** Normalisierte Adresse — siehe {@link seitenSchluessel}. */
  url: string;
  /** Wofür die Seite ein Signal trug. Leer heißt „noch nicht eingeordnet". */
  techniken: FundingTechnik[];
  quelle: SeitenQuelle;
  zustand: SeitenZustand;
  /** Fingerabdruck des sichtbaren Texts, mit Herkunftsmarke (live:/archiv:). */
  fingerprint?: string | null;
  /** Wann die Seite zuletzt LIVE gelesen wurde. Nur das bestätigt sie. */
  seiteGesehenAm?: string | null;
  /** Wann sich ihr Inhalt zuletzt bewegt hat. Startet die Nachprüf-Frist. */
  seiteGeaendertAm?: string | null;
  gelesenAm?: string | null;
  gelesenErgebnis?: LeseErgebnis | null;
  gelesenNotiz?: string | null;
};

// ─── Adressen: eine Seite darf nicht zweimal im Bestand stehen ────────────────

/**
 * Adresse auf ihre Kennform bringen, damit (Gemeinde × Adresse) ein tragfähiger
 * Schlüssel ist.
 *
 * WARUM SO VORSICHTIG: Sobald mehrere Seiten je Gemeinde erlaubt sind, entscheidet
 * allein diese Funktion darüber, ob wir eine Seite als „schon bekannt" erkennen.
 * Ist sie zu lasch, sammeln sich Dubletten (`…/foerderung` und `…/foerderung/`),
 * jede mit eigenem Fingerabdruck, und der Wächter meldet ewig Bewegung. Ist sie
 * zu streng, verschmelzen zwei ECHTE Seiten zu einer — und genau die zweite
 * wollten wir ja gewinnen.
 *
 * Deshalb wird nur entfernt, was nachweislich dieselbe Seite bezeichnet:
 * Schema und Vorsilbe „www.", Groß-/Kleinschreibung des Hosts, der Anker (er
 * springt innerhalb derselben Seite) und ein abschließender Schrägstrich.
 * **Der Query-Teil bleibt im Übrigen** — viele Verwaltungssysteme adressieren
 * ihre Seiten ausschließlich darüber (`?id=1234`), ihn zu strippen würde eine
 * ganze Gemeinde auf eine einzige Seite zusammenfalten.
 *
 * Ausgenommen sind Parameter, die nur die ANSICHT umschalten und nicht die
 * Seite bezeichnen. Gemessen am ersten Lauf mit Mehrfach-Erfassung
 * (19.08.2026): Leipzig lieferte dieselben drei Seiten doppelt, einmal blank und
 * einmal mit `?ADMCMD_prev=LIVE` (die Vorschau-Adresse des Redaktionssystems),
 * und Aachen einen Barrierefreiheits-Melder mit der Förderseite im `referer`.
 * Solche Zwillinge tragen je einen eigenen Fingerabdruck und ließen den Wächter
 * dauerhaft Bewegung melden, wo keine ist.
 */
const NUR_ANSICHT = /^(admcmd_prev|referer|referrer|print|pdf|drucken|highlight|utm_[a-z]+)$/i;
export function seitenSchluessel(url: string): string {
  let u = url.trim();
  if (!u) return "";
  u = u.replace(/^https?:\/\//i, "");
  u = u.replace(/^www\./i, "");
  u = u.replace(/#.*$/, "");
  // Host kleinschreiben, Pfad NICHT — Pfade sind bei manchen Systemen empfindlich.
  const schnitt = u.search(/[/?]/);
  if (schnitt === -1) return u.toLowerCase().replace(/\/+$/, "");
  u = u.slice(0, schnitt).toLowerCase() + u.slice(schnitt);

  const frage = u.indexOf("?");
  if (frage !== -1) {
    const pfad = u.slice(0, frage);
    const behalten = u
      .slice(frage + 1)
      .split("&")
      .filter((teil) => teil && !NUR_ANSICHT.test(teil.split("=")[0]));
    u = behalten.length ? `${pfad}?${behalten.join("&")}` : pfad;
  }
  return u.replace(/\/+$/, "");
}

/** Zwei Adressen bezeichnen dieselbe Seite. */
export function gleicheSeite(a: string, b: string): boolean {
  return seitenSchluessel(a) === seitenSchluessel(b);
}

// ─── Techniken: Liste ↔ Textfeld ─────────────────────────────────────────────

const TECHNIKEN: FundingTechnik[] = ["pv", "balkon", "waermepumpe"];

/** Technik-Liste als Textfeld (die Tabelle hält sie als CSV). */
export function technikenSchreiben(t: FundingTechnik[]): string {
  return TECHNIKEN.filter((x) => t.includes(x)).join(",");
}

/**
 * Textfeld zurück in die Liste. Unbekanntes fliegt raus statt zu raten.
 *
 * Bewusst KEIN Rückfall auf `["pv"]` wie bei `technikenVon` im Katalog: Dort ist
 * die Vorgabe ehrlich, weil der Katalog bis 18.08.2026 ein reiner PV-Katalog war.
 * Hier hieße sie „diese Seite trägt ein PV-Signal", und das wäre eine Behauptung
 * über eine Seite, die niemand eingeordnet hat.
 */
export function technikenLesen(feld: string | null | undefined): FundingTechnik[] {
  if (!feld) return [];
  const teile = feld.split(",").map((s) => s.trim());
  return TECHNIKEN.filter((t) => teile.includes(t));
}

// ─── Abdeckung: Punkt 1 des Betreibers, nachprüfbar gemacht ──────────────────

export type TechnikAbdeckung = Record<FundingTechnik, boolean>;

/**
 * Für welche Techniken haben wir bei dieser Gemeinde überhaupt eine Seite?
 *
 * Das ist die Frage „haben wir alle Förderseiten einer Gemeinde" in messbarer
 * Form. Sie lässt sich erst beantworten, seit es mehr als eine Seite je Gemeinde
 * geben kann — vorher war die Antwort immer „eine Seite, Technik unbekannt".
 *
 * Gezählt werden nur GELESENE Seiten mit Ergebnis: Eine Fundstelle, die noch
 * niemand angesehen hat, ist eine Vermutung. Sie als Abdeckung zu zählen wäre
 * dieselbe Fehlerklasse wie ein Prüfdatum für eine Prüfung, die nie stattfand.
 */
export function abdeckungJeTechnik(seiten: FoerderSeite[]): TechnikAbdeckung {
  const raus: TechnikAbdeckung = { pv: false, balkon: false, waermepumpe: false };
  for (const s of seiten) {
    if (s.gelesenErgebnis !== "aufgenommen") continue;
    for (const t of s.techniken) raus[t] = true;
  }
  return raus;
}

/** Techniken, für die bei dieser Gemeinde eine Fundstelle vorliegt, die niemand gelesen hat. */
export function offeneTechniken(seiten: FoerderSeite[]): FundingTechnik[] {
  const abgedeckt = abdeckungJeTechnik(seiten);
  const offen = new Set<FundingTechnik>();
  for (const s of seiten) {
    if (s.gelesenErgebnis) continue;
    for (const t of s.techniken) if (!abgedeckt[t]) offen.add(t);
  }
  return TECHNIKEN.filter((t) => offen.has(t));
}

// ─── Arbeitsvorrat: was als Nächstes drankommt ───────────────────────────────

/**
 * Muss diese Seite (erneut) gelesen werden?
 *
 * Zwei Auslöser, und der zweite ist der wichtigere: nie gelesen — oder seit dem
 * Lesen bewegt. Nicht der Kalender entscheidet, sondern der Fingerabdruck.
 * Dieselbe Einsicht, die schon die 180-Tage-Frist beim Beleg-Verfall gekippt
 * hat: Eine feste Frist heißt, dass ein Programm bis zum nächsten Termin den
 * falschen Stand tragen darf.
 */
export function brauchtLesen(s: FoerderSeite): boolean {
  if (s.zustand === "unerreichbar") return false; // erst wieder erreichbar machen
  if (!s.gelesenAm || !s.gelesenErgebnis) return true;
  if (!s.seiteGeaendertAm) return false;
  return new Date(s.seiteGeaendertAm) > new Date(s.gelesenAm);
}

/**
 * Reihenfolge des Lesens: erst was sich bewegt hat, dann was nie gelesen wurde,
 * dann der Rest — und innerhalb dessen die ältesten zuerst.
 *
 * Bewegte Seiten zuerst, weil dort ein Wert im Katalog steht, der falsch sein
 * KANN; bei nie gelesenen fehlt er nur.
 */
export function leseReihenfolge(seiten: FoerderSeite[]): FoerderSeite[] {
  const rang = (s: FoerderSeite): number => {
    if (s.gelesenAm && s.seiteGeaendertAm && new Date(s.seiteGeaendertAm) > new Date(s.gelesenAm)) return 0;
    if (!s.gelesenAm) return 1;
    return 2;
  };
  return seiten
    .filter(brauchtLesen)
    .slice()
    .sort((a, b) => {
      const d = rang(a) - rang(b);
      if (d !== 0) return d;
      const az = a.seiteGesehenAm ?? "";
      const bz = b.seiteGesehenAm ?? "";
      return az.localeCompare(bz);
    });
}

/**
 * Einen neuen Fund in den vorhandenen Bestand einfügen.
 *
 * Kennt die Seite schon: Techniken werden VEREINIGT statt ersetzt (ein Lauf, der
 * nur nach Balkon sucht, darf ein bekanntes PV-Signal nicht löschen), und die
 * Lese- und Abruf-Historie bleibt unangetastet — ein erneuter Fund ist kein
 * Grund, ein Prüfergebnis zu vergessen.
 */
export function fundEinfuegen(bestand: FoerderSeite[], fund: FoerderSeite): FoerderSeite[] {
  const i = bestand.findIndex((s) => s.regionId === fund.regionId && gleicheSeite(s.url, fund.url));
  if (i === -1) return [...bestand, { ...fund, url: seitenSchluessel(fund.url) }];
  const alt = bestand[i];
  const zusammen: FoerderSeite = {
    ...alt,
    techniken: TECHNIKEN.filter((t) => alt.techniken.includes(t) || fund.techniken.includes(t)),
    // Eine von Hand eingetragene Quelle sticht eine automatisch gefundene.
    quelle: alt.quelle === "hand" || fund.quelle === "hand" ? "hand" : alt.quelle,
  };
  const kopie = bestand.slice();
  kopie[i] = zusammen;
  return kopie;
}


/**
 * Interne Route des Redaktionssystems statt einer echten Seite.
 *
 * Pfadsegmente, die mit einem Doppelpunkt beginnen, sind bei mehreren
 * Kommunal-Systemen der Einstieg in Maschinenrouten — Aachen liefert seine
 * Förderseite so dreimal zusätzlich aus (`/:translation/en|fr|nl/…`), andere
 * legen dort ihre Bilder und Skripte ab (`/:res/…`). Das sind dieselben Inhalte
 * unter anderer Adresse; als eigene Fundstellen wären sie reine Dubletten.
 */
export function istInterneRoute(url: string): boolean {
  const s = seitenSchluessel(url);
  const i = s.indexOf("/");
  if (i === -1) return false;
  const segmente = s.slice(i + 1).split("/");
  if (segmente.some((seg) => seg.startsWith(":"))) return true;
  return FREMDSPRACHE.test(segmente[0] ?? "");
}

/**
 * Vorangestelltes Sprachkürzel — dieselbe Seite in einer Fremdsprache.
 *
 * Gemessen an Mainz (19.08.2026): dieselbe Seite unter `/en/`, `/es/`, `/fr/`
 * und `/uk/`, dazu die deutsche Fassung ohne Kürzel. Als eigene Fundstellen
 * wären das vier Dubletten mit vier Fingerabdrücken.
 *
 * **`de` steht bewusst NICHT in der Liste** — viele Verwaltungen liefern ihre
 * einzige, deutsche Fassung unter `/de/` aus (Lübeck, Bad Homburg). Wer das
 * mitfiltert, wirft die richtige Seite weg statt der Übersetzung. Deshalb eine
 * geschlossene Liste der Fremdsprachen statt „zwei Buchstaben am Anfang".
 */
const FREMDSPRACHE = /^(en|fr|es|it|nl|pl|ru|uk|tr|ar|pt|cs|ro|el|da|sv|fi|hu|bg|hr|sr|zh|ja|ko|fa|ku)$/i;
