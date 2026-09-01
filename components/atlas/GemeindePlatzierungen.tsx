"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { v, space, pad } from "../../lib/theme";
import { fmtTopProzent } from "../../lib/atlas-format";
import { IconArrowRight } from "../Icons";
import Modal from "../Modal";
import InfoTooltip from "../InfoTooltip";
import { GroessenklassenListe, klasseZuSlug } from "./GroessenklasseLink";
import { GROESSENKLASSEN_WARUM } from "../../lib/gemeindegroesse";
import { ownerAnker } from "../../lib/atlas";

// Die beste Platzierung der Gemeinde als EIN fokussiertes Element über dem
// Hero — nicht als zweite Rangliste.
//
// Warum kein eigener Ranglisten-Teaser mehr: Die Seite trug zwei Tabellen
// untereinander, die dieselbe Frage beantworteten ("wo steht die Gemeinde?"),
// nur mit verschiedenen Vergleichsgruppen. Der Leser musste den Unterschied
// selbst herausfinden. Jetzt gilt: EINE sichtbare Rangliste (die im Hero, unter
// Nachbarn), und die Auszeichnung steht als Schlagzeile darüber. Die
// vollständige Liste der Auszeichnungs-Gruppe steckt hinter einem Klick.
//
// Client-geladen: Die Rangdaten kosten ~1,7 s (11.000 Gemeinden), das gehört
// nicht in den Server-Render einer Atlas-Seite — dieselbe Fehlerklasse, die am
// 27.07.2026 die Landkreis-Welle gekippt hat. Muster wie GemeindePotential.

type Platzierung = {
  kategorie: string;
  thema: string;
  themaDativ: string;
  bestleistung: string;
  ebene: string;
  wo: string;
  /** Groessenklasse des Vergleichs ("Kleine Gemeinden"). */
  klasse: string;
  /** Ihr Kuerzel — damit die Anzeige die Klasse erklaeren kann, ohne den Namen
   *  zurueckzuuebersetzen. */
  klasseSlug: string;
  /** Stellung des Eigentuemer-Umschalters, die diese Auszeichnung zeigt. */
  bestandOwner: "privat" | "gewerbe";
  /** Klasse und Gebiet zusammen ("Kleine Gemeinden im Landkreis Miltenberg") —
   *  ohne die Klasse liest sich "Platz 3 im Landkreis" als Vergleich mit ALLEN
   *  Orten des Kreises, gerankt wird aber innerhalb der Groesse. */
  gruppe: string;
  platz: number;
  von: number;
  wert: string;
  /** Jede Auszeichnung hat ihre EIGENE Rangliste — andere Kategorie, andere
   *  Vergleichsebene. Eine gemeinsame gäbe es nicht. */
  tabelle: Zeile[];
  tabelleGekuerzt: boolean;
  /** Die vollständige Rangliste als eigene Seite — teilbar und verlinkbar,
   *  anders als der Dialog. */
  rankingHref: string | null;
};

type Zeile = { platz: number; name: string; href: string | null; wert: string; selbst: boolean };

const nf = (n: number) => n.toLocaleString("de-DE");

/**
 * Die Einleitung des Ranglisten-Fensters — mit erklärter Größenklasse.
 *
 * WARUM HIER EIN TOOLTIP UND KEIN FENSTER (Vorgabe des Betreibers,
 * 20.08.2026): Auf normalen Seiten öffnet der Klassenname die Erklärung als
 * Fenster. Hier steht er SCHON in einem Fenster, und ein zweites darüber wäre
 * zwei Fokus-Fallen übereinander. Der Inhalt ist derselbe Baustein
 * (`GroessenklassenListe`), nur die Hülle ist eine andere.
 *
 * Der Gruppen-Text beginnt mit dem Klassennamen (so baut ihn die Schnittstelle
 * zusammen). Getrennt wird deshalb an dessen Länge — und wenn das nicht passt,
 * bleibt der Satz eben ganz stehen, statt an einer geratenen Stelle zu brechen.
 */
function Einleitung({ p }: { p: Platzierung }) {
  const klasse = klasseZuSlug(p.klasseSlug);
  const rest = p.gruppe.startsWith(p.klasse) ? p.gruppe.slice(p.klasse.length) : null;
  const menge = p.tabelleGekuerzt
    ? `Die ersten ${nf(p.tabelle.length)} von ${nf(p.von)} — `
    : `Alle ${nf(p.tabelle.length)} — `;
  return (
    <>
      {menge}
      {klasse && rest !== null ? (
        <>
          {/* Der Klassenname TRAEGT die Erklaerung — kein „?" daneben. Das
              waere ein zweites Zeichen fuer denselben Zweck und zieht die
              Zeile auseinander; unterstrichen ist es dieselbe Affordanz wie
              der Verweis auf den normalen Seiten. */}
          <InfoTooltip
            title="Größenklassen"
            ariaLabel="Was die Größenklassen bedeuten"
            exportNote={false}
            label={p.klasse}
          >
            <p style={{ margin: `0 0 ${space.md}px` }}>{GROESSENKLASSEN_WARUM}</p>
            <GroessenklassenListe aktiv={klasse} />
          </InfoTooltip>
          {rest}
        </>
      ) : (
        p.gruppe
      )}
      {", gerechnet aus dem Marktstammdatenregister."}
    </>
  );
}

/** Die Kategorienamen sind für den Fliesstext geschrieben ("private
 *  Speicherkapazität je Einwohner"). Als eigene Zeile beginnen sie gross. */
const gross = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

type Daten = {
  name: string;
  beste: Platzierung | null;
  alle: Platzierung[];
};

export default function GemeindePlatzierungen({ regionId }: { regionId: string }) {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState(false);
  /** Welche Rangliste im Dialog steht — Index in `alle`, null = zu. */
  const [offen, setOffen] = useState<number | null>(null);

  useEffect(() => {
    let aktiv = true;
    fetch(`/api/atlas/platzierungen?region=${regionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => aktiv && setDaten(j))
      .catch(() => aktiv && setFehler(true));
    return () => {
      aktiv = false;
    };
  }, [regionId]);

  // Ohne Platzierung erscheint hier gar nichts — ein leerer Kasten ist
  // schlechter als kein Kasten. Auch während des Ladens: Ob es überhaupt eine
  // Auszeichnung gibt, weiß man erst mit den Daten, und ein Platzhalter, der in
  // der Mehrzahl der Fälle wieder verschwindet, lässt die Seite springen.
  if (fehler || !daten?.beste) return null;
  const b = daten.beste;

  return (
    <section className="gemeinde-auszeichnung" style={S.wrap} aria-label={`Auszeichnung von ${daten.name}`}>
      {/* FLACHES BADGE: Rang über der Insignie, keine Hochglanz-Plakette.
          Vorher stand hier ein Kasten mit Kopfzeile, ganzem Satz, eigenem
          Knopf und einer beschrifteten Liste — in der 296px-Spalte neben der
          Einleitung ein Block von über 200 px. Der Satz sagte dabei dasselbe
          wie Kopfzeile und Kategorie zusammen. Jetzt: eine Zeile Rang, eine
          Zeile Kategorie, eine Zeile Bezug — und der ganze Block ist der
          Knopf zur Rangliste. */}
      {/*
        DIE KACHEL IST KEIN KLICKZIEL MEHR (Vorgabe des Betreibers, 21.08.2026).
        Sie war ein einziger grosser Knopf, und damit gab es genau EINEN Weg
        hinaus: die Rangliste. Der zweite — „zeig mir das unten im Bestand" —
        haette einen Knopf im Knopf gebraucht, also ungueltiges Markup.
        Jetzt traegt die Kachel zwei benannte Verweise; dass beide sichtbar
        beschriftet sind, sagt ausserdem, wohin sie fuehren.
      */}
      <div style={S.badge}>
        <span style={S.rangZeile}>
          <Insignie platz={b.platz} gross />
          <span style={S.rang}>Platz {b.platz}</span>
          <span style={S.vonZahl}>/ {nf(b.von)}</span>
          {/* Ab Platz 4 zaehlt die Auszeichnung ueber das oberste Zehntel — dann
              sagt die Zahl allein wenig ("Platz 40"), die Stufe dagegen viel. */}
          {b.platz > 3 && <span style={S.stufe}>Top {fmtTopProzent(b.platz / b.von)}</span>}
        </span>
        <span style={S.thema}>{gross(b.thema)}</span>
        <span style={S.bezug}>
          {b.gruppe} · <span style={S.wert}>{b.wert}</span>
        </span>
        <span style={S.aktionen}>
          <button type="button" onClick={() => setOffen(0)} style={S.aktion} aria-label={`Rangliste: ${b.thema}`}>
            {"Rangliste "}
            <IconArrowRight size={10} />
          </button>
          {/* Der zweite Weg: dieselbe Aussage unten im Bestand, mit der
              Stellung, die sie zeigt. Ohne ihn muesste der Leser raten, ob
              „privat" oder „alle" gemeint ist — und genau dieses Raten ist der
              Fehler, gegen den der ganze Umbau steht. */}
          <a href={`#${ownerAnker(b.bestandOwner)}`} style={S.aktion}>
            {"Im Bestand zeigen "}
            <IconArrowRight size={10} />
          </a>
        </span>
      </div>

      {/* Weitere Auszeichnungen: je eine eigene Zeile mit Rahmen — sie sind
          eigenständige Platzierungen mit eigener Rangliste, keine Fußnote der
          ersten. */}
      {daten.alle.length > 1 && (
        <ul style={S.weitere}>
          {daten.alle.slice(1, 4).map((p, i) => (
            <li key={`${p.kategorie}-${p.ebene}`}>
              <button
                type="button"
                onClick={() => setOffen(i + 1)}
                style={{ ...S.weitereZeile, ...(p.platz === 1 ? S.weitereZeileSieg : null) }}
                aria-label={`Rangliste: ${p.thema}`}
              >
                <Insignie platz={p.platz} />
                <span style={S.weiterePlatz}>{p.platz}.</span>
                <span style={S.weitereText}>{gross(p.thema)}</span>
                <span aria-hidden style={S.pfeil}>
                  <IconArrowRight size={11} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={offen !== null}
        onClose={() => setOffen(null)}
        title={offen !== null ? `${gross(daten.alle[offen].thema)} — ${daten.alle[offen].wo}` : ""}
        // „Alle 300" wäre gelogen, wenn die Gruppe 1.101 Kommunen hat und die
        // Liste bei 300 endet. Der Satz sagt beides.
        intro={offen === null ? "" : <Einleitung p={daten.alle[offen]} />}
        maxWidth={560}
      >
        {offen !== null && (
          <div style={S.liste}>
            {daten.alle[offen].tabelle.map((r) => (
              <RanglistenZeile key={r.platz} zeile={r} />
            ))}
            {daten.alle[offen].tabelleGekuerzt && (
              <p style={S.gekuerzt}>
                Weitere {nf(daten.alle[offen].von - daten.alle[offen].tabelle.length)} Kommunen folgen — hier nicht
                mehr aufgeführt.
              </p>
            )}
            {daten.alle[offen].rankingHref && (
              <Link href={daten.alle[offen].rankingHref!} style={S.ganzes}>
                Alle Einträge <IconArrowRight size={13} />
              </Link>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}

/**
 * Das Zeichen im Kreis: Krone für den Sieg, Stern für jede andere Platzierung.
 * Der Kreis ist der Grund, warum es als Auszeichnung liest und nicht als Emoji
 * im Fließtext — flach gehalten, keine Hochglanz-Plakette.
 */
function Insignie({ platz, gross = false }: { platz: number; gross?: boolean }) {
  const sieg = platz === 1;
  const groesse = gross ? 22 : 17;
  return (
    <span
      aria-hidden
      style={{
        ...S.insignie,
        width: groesse,
        height: groesse,
        fontSize: gross ? 11 : 9,
        background: v("--color-bg"),
        borderColor: sieg ? v("--color-border-accent") : v("--color-border-muted"),
        opacity: sieg ? 1 : 0.85,
      }}
    >
      {sieg ? "👑" : "★"}
    </span>
  );
}

/** Eine Zeile der vollständigen Rangliste — verlinkt auf die jeweilige Kommune. */
function RanglistenZeile({ zeile }: { zeile: Zeile }) {
  const inhalt = (
    <>
      <span style={S.zPlatz}>{zeile.platz}.</span>
      <span style={S.zName}>
        {zeile.platz === 1 && (
          <span aria-hidden style={S.kroneKlein}>
            👑
          </span>
        )}
        {zeile.name}
      </span>
      <span style={S.zWert}>{zeile.wert}</span>
    </>
  );
  const stil = { ...S.zeile, ...(zeile.selbst ? S.zeileSelbst : null) };
  // Die eigene Zeile ist die aktuelle Seite — kein Link auf sich selbst.
  return zeile.href && !zeile.selbst ? (
    <Link href={zeile.href} style={{ ...stil, ...S.zeileLink }}>
      {inhalt}
    </Link>
  ) : (
    <div style={stil}>{inhalt}</div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { marginBottom: space.lg },
  // Der ganze Badge ist der Knopf — ein zusätzliches „Rangliste ansehen"
  // darunter war eine zweite Zeile für dieselbe Handlung.
  badge: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    width: "100%",
    textAlign: "left",
    // Getoente Flaeche, Insignie weiss darauf — nicht umgekehrt: der Kreis soll
    // sich vom Grund abheben, nicht mit ihm verschwimmen.
    background: v("--color-bg-accent"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-md"),
    padding: pad("sm", "md"),
    cursor: "pointer",
    fontFamily: v("--font-text"),
  },
  rangZeile: { display: "flex", alignItems: "center", gap: 6 },
  insignie: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    border: "1px solid",
    flex: "0 0 auto",
    lineHeight: 1,
  },
  rang: {
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-h3"),
    fontWeight: 700,
    lineHeight: 1.1,
    color: v("--color-accent-dark"),
  },
  vonZahl: { fontFamily: v("--font-mono"), fontSize: v("--font-size-small"), color: v("--color-text-muted") },
  stufe: {
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-micro"),
    fontWeight: 700,
    color: v("--color-accent-dark"),
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: 4,
    padding: "1px 5px",
  },
  thema: {
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    lineHeight: 1.35,
    color: v("--color-text-primary"),
  },
  bezug: { fontSize: v("--font-size-caption"), color: v("--color-text-secondary"), lineHeight: 1.35 },
  aktionen: { display: "flex", flexWrap: "wrap", gap: space.md, marginTop: 6 },
  aktion: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: "inherit",
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-accent"),
    textDecoration: "none",
    cursor: "pointer",
  },
  wert: { fontFamily: v("--font-mono") },
  // Weitere Auszeichnungen: eine Zeile je Stück, ohne Überschrift.
  weitere: { margin: 0, padding: 0, listStyle: "none" },
  weitereZeile: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    marginTop: 4,
    padding: pad("xs", "sm"),
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-sm"),
    textAlign: "left",
    cursor: "pointer",
    fontFamily: v("--font-text"),
    fontSize: v("--font-size-caption"),
    color: v("--color-text-secondary"),
  },
  // Ein weiterer erster Platz ist auch einer — gleiche Fläche wie der Kopf-Badge.
  weitereZeileSieg: { background: v("--color-bg-accent"), borderColor: v("--color-border-accent") },
  // Gleiche Farbe wie „Platz 1" im Kopf-Badge: Es ist dieselbe Aussage, nur
  // kleiner — ein graues „3." haette sie zur Fussnote gemacht.
  weiterePlatz: { fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-accent-dark"), flex: "0 0 auto" },
  weitereText: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pfeil: { color: v("--color-accent"), flex: "0 0 auto" },
  liste: { display: "flex", flexDirection: "column" },
  zeile: {
    display: "grid",
    gridTemplateColumns: "34px minmax(0,1fr) auto",
    gap: space.md,
    alignItems: "baseline",
    padding: pad("xs", "sm"),
    borderBottom: `1px solid ${v("--color-border")}`,
    fontSize: v("--font-size-body"),
    color: v("--color-text-primary"),
  },
  zeileLink: { textDecoration: "none", color: "inherit" },
  zeileSelbst: { background: v("--color-bg-accent"), fontWeight: 700 },
  zPlatz: { fontFamily: v("--font-mono"), color: v("--color-text-muted"), fontSize: v("--font-size-small") },
  zName: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  kroneKlein: { marginRight: 4, fontSize: v("--font-size-caption") },
  zWert: { fontFamily: v("--font-mono"), color: v("--color-accent") },
  gekuerzt: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), padding: pad("sm", "sm"), margin: 0 },
  // Der Dialog ist der schnelle Blick; die Seite ist das, was man teilt.
  ganzes: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginTop: space.sm,
    padding: pad("sm", "sm"),
    fontSize: v("--font-size-small"),
    fontWeight: 600,
    color: v("--color-accent"),
    textDecoration: "none",
  },
};
