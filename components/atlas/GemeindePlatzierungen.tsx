"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { v, space, pad } from "../../lib/theme";
import Modal from "../Modal";

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
  platz: number;
  von: number;
  wert: string;
};

type Zeile = { platz: number; name: string; href: string | null; wert: string; selbst: boolean };

const nf = (n: number) => n.toLocaleString("de-DE");

type Daten = {
  name: string;
  beste: Platzierung | null;
  alle: Platzierung[];
  tabelle: Zeile[];
  tabelleGekuerzt: boolean;
};

export default function GemeindePlatzierungen({ regionId }: { regionId: string }) {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState(false);
  const [offen, setOffen] = useState(false);

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
      <div style={S.band}>
        <div style={S.kopf}>
          <span aria-hidden style={S.krone}>
            👑
          </span>
          {/* Gezählt werden Kommunen — nicht die Ebene, in der verglichen wird.
              „Platz 1 von 52 Landkreis im Landkreis Würzburg" stand hier, weil
              das Etikett der Vergleichsebene an die Stelle des Gezählten
              geriet. */}
          <span>
            Platz {b.platz} von {nf(b.von)} Kommunen {b.wo}
          </span>
        </div>
        <p style={S.satz}>
          {daten.name} hat {b.bestleistung} {b.wo} — <strong style={S.wert}>{b.wert}</strong>.
        </p>

        {daten.alle.length > 1 && (
          <>
            <div style={S.weitereTitel}>Außerdem</div>
            <ul style={S.weitere}>
              {/* Das WO gehört an jede Zeile: Ohne es standen hier zweimal
                  „Balkonkraftwerke" untereinander — einmal im Kreis, einmal im
                  Land — und die Liste sah aus wie ein Doppeleintrag. */}
              {daten.alle.slice(1, 4).map((p) => (
                <li key={`${p.kategorie}-${p.ebene}`} style={S.weitereZeile}>
                  {p.platz === 1 && (
                    <span aria-hidden style={S.kroneKlein}>
                      👑
                    </span>
                  )}
                  Platz {p.platz} bei {p.themaDativ} {p.wo}
                </li>
              ))}
            </ul>
          </>
        )}

        {daten.tabelle.length > 0 && (
          <button type="button" onClick={() => setOffen(true)} style={S.btn}>
            Rangliste ansehen
          </button>
        )}
      </div>

      <Modal
        open={offen}
        onClose={() => setOffen(false)}
        title={`${b.thema} — ${b.wo}`}
        // „Alle 300" wäre gelogen, wenn die Gruppe 1.101 Kommunen hat und die
        // Liste bei 300 endet. Der Satz sagt beides.
        intro={
          daten.tabelleGekuerzt
            ? `Die ersten ${nf(daten.tabelle.length)} von ${nf(b.von)} Kommunen der Vergleichsgruppe, gerechnet aus dem Marktstammdatenregister.`
            : `Alle ${nf(daten.tabelle.length)} Kommunen der Vergleichsgruppe, gerechnet aus dem Marktstammdatenregister.`
        }
        maxWidth={560}
      >
        <div style={S.liste}>
          {daten.tabelle.map((r) => (
            <RanglistenZeile key={r.platz} zeile={r} />
          ))}
          {daten.tabelleGekuerzt && (
            <p style={S.gekuerzt}>
              Weitere {nf(b.von - daten.tabelle.length)} Kommunen folgen — hier nicht mehr aufgeführt.
            </p>
          )}
        </div>
      </Modal>
    </section>
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
  band: {
    background: v("--color-bg-accent"),
    border: `1px solid ${v("--color-border-accent")}`,
    borderRadius: v("--radius-md"),
    padding: pad("md", "lg"),
  },
  kopf: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    fontSize: 13,
    fontWeight: 800,
    color: v("--color-accent-dark"),
    letterSpacing: "-0.01em",
  },
  krone: { fontSize: 14 },
  satz: { margin: `${space.xs}px 0 0`, fontSize: 15, lineHeight: 1.5, color: v("--color-text-primary") },
  wert: { fontFamily: v("--font-mono"), fontWeight: 700 },
  weitereTitel: { marginTop: space.sm, fontSize: 12, fontWeight: 700, color: v("--color-text-secondary") },
  weitere: {
    margin: `2px 0 0`,
    paddingLeft: 0,
    listStyle: "none",
    fontSize: 13,
    color: v("--color-text-secondary"),
    lineHeight: 1.6,
  },
  btn: {
    marginTop: space.sm,
    padding: 0,
    background: "transparent",
    border: "none",
    color: v("--color-accent"),
    fontFamily: v("--font-text"),
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  liste: { display: "flex", flexDirection: "column" },
  zeile: {
    display: "grid",
    gridTemplateColumns: "34px minmax(0,1fr) auto",
    gap: space.md,
    alignItems: "baseline",
    padding: pad("xs", "sm"),
    borderBottom: `1px solid ${v("--color-border")}`,
    fontSize: 14,
    color: v("--color-text-primary"),
  },
  zeileLink: { textDecoration: "none", color: "inherit" },
  zeileSelbst: { background: v("--color-bg-accent"), fontWeight: 700 },
  zPlatz: { fontFamily: v("--font-mono"), color: v("--color-text-muted"), fontSize: 12 },
  zName: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  kroneKlein: { marginRight: 4, fontSize: 11 },
  zWert: { fontFamily: v("--font-mono"), color: v("--color-accent") },
  weitereZeile: { display: "flex", alignItems: "baseline", gap: 4 },
  gekuerzt: { fontSize: 12, color: v("--color-text-muted"), padding: pad("sm", "sm"), margin: 0 },
};
