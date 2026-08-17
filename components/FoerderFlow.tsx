"use client";
import { useMemo, useState } from "react";
import { v, space, pad } from "../lib/theme";
import FlowNav, { flowSelect } from "./FlowNav";
import OptionCard from "./OptionCard";
import type { FundingProgram } from "../lib/funding-programs";
import { fundingStandLabel } from "../lib/funding-programs";
import {
  fragenFuer,
  werteAus,
  type FlowAntworten,
  type ProgrammBefund,
} from "../lib/funding-flow";

/**
 * Der Förderflow: „Bekomme ich das überhaupt, und was muss ich wann tun?"
 *
 * Die Schritte stehen NICHT fest — sie kommen aus den erfassten Bedingungen der
 * Programme dieser Region (lib/funding-flow.ts). Ein Ort ohne Speicherregel
 * bekommt die Speicherfrage gar nicht erst zu sehen.
 *
 * Interaktion nach der Flow-Konvention (components/FlowNav.tsx): keine
 * Vorauswahl, Klick wählt nur aus, Weiter erst bei gültiger Auswahl aktiv.
 */
export default function FoerderFlow({
  programme,
  ortName,
  imFenster = false,
}: {
  programme: FundingProgram[];
  ortName: string;
  /** Im Fenster trägt der Dialog schon Rahmen und Abstand — ein zweiter Rahmen
   *  darin ist ein Kasten im Kasten. */
  imFenster?: boolean;
}) {
  const fragen = useMemo(() => fragenFuer(programme), [programme]);
  const [schritt, setSchritt] = useState(0);
  const [antworten, setAntworten] = useState<FlowAntworten>({});
  const [nudge, setNudge] = useState(false);
  const [fertig, setFertig] = useState(false);

  const ergebnis = useMemo(() => werteAus(programme, antworten), [programme, antworten]);

  if (fragen.length === 0) return null;

  const aktuell = fragen[schritt];
  const letzter = schritt === fragen.length - 1;

  function antwortFuer(id: string): string | number | undefined {
    switch (id) {
      case "auftrag":
        return antworten.auftragVergeben === undefined ? undefined : antworten.auftragVergeben ? "ja" : "nein";
      case "anlage":
        return antworten.anlage;
      case "kwp":
        return antworten.kwp === undefined ? undefined : String(antworten.kwp);
      case "gebaeude":
        return antworten.gebaeude;
      default:
        return undefined;
    }
  }

  function setze(id: string, wert: string) {
    setNudge(false);
    setAntworten((a) => {
      switch (id) {
        case "auftrag":
          return { ...a, auftragVergeben: wert === "ja" };
        case "anlage":
          return { ...a, anlage: wert as FlowAntworten["anlage"] };
        case "gebaeude":
          return { ...a, gebaeude: wert as FlowAntworten["gebaeude"] };
        case "kwp":
          return { ...a, kwp: Number(wert) };
        default:
          return a;
      }
    });
  }

  const weiterAktiv = antwortFuer(aktuell.id) !== undefined;

  if (fertig) {
    return (
      <Ergebnis
        ergebnis={ergebnis}
        imFenster={imFenster}
        ortName={ortName}
        onNeu={() => {
          setAntworten({});
          setSchritt(0);
          setFertig(false);
        }}
      />
    );
  }

  return (
    <div style={imFenster ? {} : box}>
      <div style={{ fontSize: 12, color: v("--color-text-muted"), marginBottom: space.xs }}>
        Schritt {schritt + 1} von {fragen.length}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: v("--color-text-primary"), margin: `0 0 ${space.xs}px` }}>
        {aktuell.titel}
      </h3>
      {aktuell.hinweis && (
        <p style={{ fontSize: 13, color: v("--color-text-secondary"), margin: `0 0 ${space.md}px`, lineHeight: 1.5 }}>
          {aktuell.hinweis}
        </p>
      )}

      {aktuell.optionen && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(aktuell.optionen.length, 3)}, 1fr)`,
            gap: space.sm,
            marginBottom: space.md,
            animation: nudge ? "fadeUp 0.3s ease-out" : undefined,
          }}
        >
          {aktuell.optionen.map((o) => (
            <OptionCard
              key={o.wert}
              selected={antwortFuer(aktuell.id) === o.wert}
              onClick={() => {
                setze(aktuell.id, o.wert);
                flowSelect(() => (letzter ? setFertig(true) : setSchritt(schritt + 1)));
              }}
              label={o.label}
              sub={o.sub ?? ""}
            />
          ))}
        </div>
      )}

      <FlowNav
        weiterAktiv={weiterAktiv}
        weiterLabel={letzter ? "Ergebnis anzeigen" : "Weiter"}
        onWeiter={() => (letzter ? setFertig(true) : setSchritt(schritt + 1))}
        onZurueck={() => setSchritt(Math.max(0, schritt - 1))}
        zurueckSichtbar={schritt > 0}
        inaktivHinweis="Bitte erst eine Option wählen."
        onInaktivKlick={() => setNudge(true)}
      />
    </div>
  );
}

function Ergebnis({
  imFenster = false,
  ergebnis,
  ortName,
  onNeu,
}: {
  ergebnis: ReturnType<typeof werteAus>;
  ortName: string;
  onNeu: () => void;
  imFenster?: boolean;
}) {
  const { moeglich, ausgeschlossen, ungeprueft, durchBeauftragungVerloren } = ergebnis;
  return (
    <div style={imFenster ? {} : box}>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: v("--color-text-primary"), margin: `0 0 ${space.md}px` }}>
        Das gilt für dich in {ortName}
      </h3>

      {durchBeauftragungVerloren.length > 0 && (
        <div
          style={{
            background: v("--color-bg-muted"),
            border: `1px solid ${v("--color-negative")}`,
            borderRadius: v("--radius-md"),
            padding: pad("md", "md"),
            marginBottom: space.md,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: v("--color-negative"), marginBottom: space.xs }}>
            {durchBeauftragungVerloren.length === 1
              ? "Ein Programm ist nicht mehr möglich"
              : `${durchBeauftragungVerloren.length} Programme sind nicht mehr möglich`}
          </div>
          <p style={{ fontSize: 13, color: v("--color-text-secondary"), margin: 0, lineHeight: 1.5 }}>
            Weil der Auftrag schon vergeben ist. Diese Frist lässt sich nicht nachholen — bei
            künftigen Vorhaben zuerst den Antrag stellen.
          </p>
          <ul style={liste}>
            {durchBeauftragungVerloren.map((b) => (
              <li key={b.program.id} style={{ marginTop: space.xs }}>
                <strong style={{ color: v("--color-text-primary") }}>{b.program.name}</strong>
                {b.gruende[0] && (
                  <div style={{ fontSize: 12, color: v("--color-text-secondary") }}>{b.gruende[0]}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {moeglich.length > 0 ? (
        moeglich.map((b) => <MoeglichesProgramm key={b.program.id} befund={b} />)
      ) : (
        <p style={{ fontSize: 14, color: v("--color-text-secondary"), lineHeight: 1.5 }}>
          Nach deinen Angaben passt hier keines der geprüften Programme.
        </p>
      )}

      {ausgeschlossen.length > 0 && (
        <details style={{ marginTop: space.md }}>
          <summary style={zusammen}>Nicht passend ({ausgeschlossen.length})</summary>
          <ul style={liste}>
            {ausgeschlossen.map((b) => (
              <li key={b.program.id} style={{ marginTop: space.xs }}>
                <strong style={{ color: v("--color-text-primary") }}>{b.program.name}</strong> —{" "}
                <span style={{ color: v("--color-text-secondary") }}>{b.gruende.join(" ")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {ungeprueft.length > 0 && (
        <details style={{ marginTop: space.sm }}>
          <summary style={zusammen}>Noch nicht im Check enthalten ({ungeprueft.length})</summary>
          <p style={{ fontSize: 13, color: v("--color-text-secondary"), lineHeight: 1.5, marginTop: space.xs }}>
            Für diese Programme haben wir die Bedingungen noch nicht in prüfbarer Form erfasst.
            Wir sagen dazu lieber nichts, als etwas zu raten — die Bedingungen stehen bei der
            jeweiligen Stelle.
          </p>
          <ul style={liste}>
            {ungeprueft.map((b) => (
              <li key={b.program.id} style={{ marginTop: space.xs }}>
                <a href={b.program.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent") }}>
                  {b.program.name}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button onClick={onNeu} style={neuKnopf}>
        Angaben ändern
      </button>

      <p style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: space.md, lineHeight: 1.5 }}>
        Diese Angaben informieren und ersetzen keine Beratung. Verbindlich ist immer die
        Förderstelle — Bedingungen und Mittel ändern sich, ohne Gewähr.
      </p>
    </div>
  );
}

function MoeglichesProgramm({ befund }: { befund: ProgrammBefund }) {
  const { program: p, schritte } = befund;
  return (
    <div
      style={{
        border: `1px solid ${v("--color-border")}`,
        borderRadius: v("--radius-md"),
        padding: pad("md", "md"),
        marginBottom: space.sm,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: space.sm, alignItems: "baseline" }}>
        <strong style={{ fontSize: 15, color: v("--color-text-primary") }}>{p.name}</strong>
        <span style={{ fontSize: 12, color: v("--color-text-muted"), whiteSpace: "nowrap" }}>{p.traeger}</span>
      </div>
      <div style={{ fontSize: 13, color: v("--color-text-secondary"), marginTop: 2 }}>{p.coveredCosts}</div>

      {schritte.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-primary"), marginTop: space.md }}>
            In dieser Reihenfolge:
          </div>
          <ol style={{ ...liste, listStyle: "decimal", paddingLeft: 20 }}>
            {schritte.map((s, i) => (
              <li key={i} style={{ marginTop: 4, fontSize: 13, color: v("--color-text-secondary") }}>
                {s}
              </li>
            ))}
          </ol>
        </>
      )}

      <div style={{ fontSize: 11, color: v("--color-text-muted"), marginTop: space.sm }}>
        {fundingStandLabel(p)} ·{" "}
        <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent") }}>
          Zum Programm
        </a>
      </div>
    </div>
  );
}

const box: React.CSSProperties = {
  background: v("--color-bg"),
  border: `1px solid ${v("--color-border")}`,
  borderRadius: v("--radius-lg"),
  padding: pad("lg", "lg"),
};

const liste: React.CSSProperties = {
  margin: `${space.xs}px 0 0`,
  paddingLeft: 18,
  fontSize: 13,
  lineHeight: 1.5,
};

const zusammen: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: v("--color-text-secondary"),
  cursor: "pointer",
};

const neuKnopf: React.CSSProperties = {
  marginTop: space.md,
  padding: "10px 20px",
  borderRadius: v("--radius-md"),
  fontSize: 14,
  fontWeight: 600,
  background: "transparent",
  border: `1px solid ${v("--color-border-muted")}`,
  color: v("--color-text-secondary"),
  cursor: "pointer",
};
