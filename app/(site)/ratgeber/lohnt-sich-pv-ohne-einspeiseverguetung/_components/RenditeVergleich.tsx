"use client";
// Renditeentwicklung im Vergleich: heutige Vergütung, der Entwurf ab 2027 und
// eine frei einstellbare eigene Annahme — dieselbe Anlage, derselbe Haushalt,
// nur andere Konditionen für den eingespeisten Strom.
//
// Warum interaktiv und nicht als feste Grafik: Die Reform ist ein Entwurf, und
// die einzige ehrliche Antwort auf "was passiert dann mit meiner Rendite" ist,
// die Annahme selbst verstellen zu können. Wer meint, es werde 4 ct geben,
// stellt 4 ct ein und sieht die Kurve. Das ist belastbarer als jede Zahl, die
// wir behaupten.
//
// Gerechnet wird mit denselben Funktionen wie im Rechner (calc + das
// Einspeisemodell aus lib/einspeise-regime.ts) — die Kurven können hier also
// nicht gegen den Rechner driften.
import { useMemo, useState } from "react";
import Link from "next/link";
import Chart from "../../../photovoltaik-rechner/_components/Chart";
import InlineEdit from "../../../../../components/InlineEdit";
import { calc } from "../../../../../lib/calc";
import { einspeiseVerlauf, mittlererSatzCt } from "../../../../../lib/einspeise-regime";
import { EEG_UEBERGANG_STAFFEL, eegReformStandLabel } from "../../../../../lib/eeg-reform-config";
import { FEED_IN_YEARS, YEARS } from "../../../../../lib/constants";
import { v, tokens } from "../../../../../lib/theme";

export interface RenditeVergleichProps {
  kwp: number;
  kosten: number;
  /** Eigenverbrauchsquote in Prozent. */
  ev: number;
  strompreis: number;
  stromSteigerung: number;
  ertragKwp: number;
  batteryReplace: number;
  /** Heutiger Satz in ct/kWh (Teileinspeisung, gewichtet). */
  heuteSatzCt: number;
  /** Profilfaktor aus der Stundensimulation des Beispielhaushalts. */
  profilFaktor: number;
  /** Anteil des Überschusses, der unter dem geplanten 50-%-Deckel durchgeht. */
  einspeiseAnteil: number;
  /** Deep-Link in den Rechner, vorbelegt auf die Reform-Konditionen. */
  rechnerHref: string;
}

const FARBEN = {
  heute: tokens["--color-positive"],
  reform: tokens["--color-accent"],
  eigen: tokens["--color-text-secondary"],
};

const JAHRE = [2027, 2028, 2029, 2030] as const;

export default function RenditeVergleich(p: RenditeVergleichProps) {
  const [jahr, setJahr] = useState<number>(2027);
  const [marktErloes, setMarktErloes] = useState(true);
  const [eigenerSatz, setEigenerSatz] = useState<number | null>(null);

  const kurven = useMemo(() => {
    const basis = {
      kwp: p.kwp, kosten: p.kosten, strompreis: p.strompreis, eigenverbrauch: p.ev,
      stromSteigerung: p.stromSteigerung, ertragKwp: p.ertragKwp, monthly: null,
      batteryReplace: p.batteryReplace,
    };

    const heute = calc({ ...basis, einspeisung: p.heuteSatzCt });

    const verlauf = einspeiseVerlauf({
      regime: "reform2027",
      kwp: p.kwp,
      inbetriebnahmeJahr: jahr,
      heuteSatzCt: p.heuteSatzCt,
      marktErloes,
      profilFaktor: p.profilFaktor,
    });
    const reform = calc({
      ...basis,
      einspeisung: 0,
      einspeiseModell: {
        satzCtImJahr: (i) => verlauf[i - 1]?.satzCt ?? 0,
        einspeiseAnteil: p.einspeiseAnteil,
      },
    });

    const eigen = eigenerSatz === null ? null : calc({ ...basis, einspeisung: eigenerSatz });

    return { heute, reform, eigen, verlauf };
  }, [p, jahr, marktErloes, eigenerSatz]);

  const scenarios = [
    { id: "heute", color: FARBEN.heute, data: kurven.heute },
    { id: "reform", color: FARBEN.reform, data: kurven.reform },
    ...(kurven.eigen ? [{ id: "eigen", color: FARBEN.eigen, data: kurven.eigen }] : []),
  ];

  const mittel = mittlererSatzCt(kurven.verlauf);
  const staffel = EEG_UEBERGANG_STAFFEL.find((s) => s.jahr === jahr);
  const uebergangMoeglich = !!staffel && p.kwp < staffel.unterKw;
  const differenz = kurven.heute.total - kurven.reform.total;

  const box: React.CSSProperties = {
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-lg"),
    padding: "16px 16px 10px",
    marginBottom: 16,
  };
  const knopf = (aktiv: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: v("--radius-sm"),
    border: `1px solid ${aktiv ? v("--color-accent") : v("--color-border")}`,
    background: aktiv ? v("--color-bg-accent") : "transparent",
    color: aktiv ? v("--color-accent-dark") : v("--color-text-secondary"),
    fontWeight: aktiv ? 700 : 500,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: v("--font-mono"),
  });

  return (
    <div style={box}>
      <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 2 }}>
        Wie sich die Rendite verschiebt
      </div>
      <div style={{ fontSize: 12, color: v("--color-text-muted"), lineHeight: 1.6, marginBottom: 12 }}>
        Dieselbe Anlage ({p.kwp} kWp), derselbe Haushalt — nur andere Konditionen für den Strom, der
        ins Netz geht. Die Kurven zeigen, was nach Abzug der Investition übrig bleibt.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: v("--color-text-secondary"), marginRight: 2 }}>
          Inbetriebnahme
        </span>
        {JAHRE.map((j) => (
          <button key={j} onClick={() => setJahr(j)} style={knopf(jahr === j)} aria-pressed={jahr === j}>
            {j}
          </button>
        ))}
      </div>

      <label style={{
        display: "flex", alignItems: "center", gap: 7, margin: "10px 0 12px",
        fontSize: 12, color: v("--color-text-secondary"), cursor: "pointer",
      }}>
        <input
          type="checkbox"
          checked={marktErloes}
          onChange={(e) => setMarktErloes(e.target.checked)}
          style={{ accentColor: v("--color-accent"), width: 15, height: 15 }}
        />
        Börsenerlös nach der Förderphase mitrechnen (aus: die Einspeisung bringt dann nichts mehr)
      </label>

      {/* Alle Kurven gleich stark: Hier ist der Vergleich der Inhalt, nicht eine
          hervorgehobene Auswahl. */}
      <Chart scenarios={scenarios} kosten={p.kosten} dimOthers={false} />

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center",
        fontSize: 11, color: v("--color-text-secondary"), margin: "2px 0 12px",
      }}>
        <Legende farbe={FARBEN.heute}>
          Heute: {p.heuteSatzCt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ct, {FEED_IN_YEARS} Jahre
        </Legende>
        <Legende farbe={FARBEN.reform}>
          Ab {jahr} (Entwurf): ⌀ {mittel.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ct
        </Legende>
        {kurven.eigen && (
          <Legende farbe={FARBEN.eigen}>
            Eigene Annahme: {(eigenerSatz ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} ct
          </Legende>
        )}
      </div>

      <div style={{
        borderTop: `1px dashed ${v("--color-border")}`, paddingTop: 10,
        fontSize: 12, color: v("--color-text-secondary"), lineHeight: 1.7,
      }}>
        {uebergangMoeglich ? (
          <>
            Bei Inbetriebnahme {jahr} käme diese Anlage noch in die befristete Übergangszahlung
            ({kurven.verlauf[0].satzCt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ct/kWh
            für drei Jahre).
          </>
        ) : (
          <>
            Bei Inbetriebnahme {jahr} bekäme diese Anlage nach dem Entwurf keine Übergangszahlung mehr
            — {staffel ? `sie gilt dann nur noch unter ${staffel.unterKw} Kilowatt` : "das Instrument läuft bis dahin aus"}.
          </>
        )}{" "}
        Über {YEARS} Jahre gerechnet sind das{" "}
        <strong style={{ color: v("--color-text-primary") }}>
          {Math.abs(Math.round(differenz)).toLocaleString("de-DE")} €{" "}
          {differenz >= 0 ? "weniger" : "mehr"}
        </strong>{" "}
        als unter den heutigen Konditionen. Der Eigenverbrauch bleibt davon völlig unberührt — er ist
        der Grund, warum die Kurve auch ohne Vergütung nach oben zeigt.
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
        marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${v("--color-border")}`,
        fontSize: 12, color: v("--color-text-secondary"),
      }}>
        <span>Eigene Annahme rechnen:</span>
        <InlineEdit
          value={eigenerSatz ?? Math.round(mittel * 100) / 100}
          onCommit={(val) => setEigenerSatz(val)}
          unit=" ct"
          step={0.5}
          min={0}
          max={30}
          width={66}
          fmt={(x) => x.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        />
        <span style={{ color: v("--color-text-muted") }}>
          über {FEED_IN_YEARS} Jahre
        </span>
        {eigenerSatz !== null && (
          <button
            onClick={() => setEigenerSatz(null)}
            style={{
              border: "none", background: "transparent", color: v("--color-accent"),
              fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline",
            }}
          >
            zurücksetzen
          </button>
        )}
      </div>

      <div style={{
        marginTop: 10, paddingTop: 10, borderTop: `1px solid ${v("--color-border")}`,
        fontSize: 11, color: v("--color-text-muted"), lineHeight: 1.6,
      }}>
        Die Werte für 2027 und später stammen aus dem Gesetzentwurf und sind kein geltendes Recht
        (Stand: {eegReformStandLabel()}).{" "}
        <Link href={p.rechnerHref} style={{ color: v("--color-accent"), textDecoration: "none", fontWeight: 600 }}>
          Mit den eigenen Zahlen durchrechnen →
        </Link>
      </div>
    </div>
  );
}

function Legende({ farbe, children }: { farbe: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 10, height: 3, borderRadius: 2, background: farbe, display: "inline-block" }} />
      {children}
    </span>
  );
}
