"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { v, iconSizes } from "../lib/theme";
import { IconArrowRight } from "./Icons";
import Modal from "./Modal";
import { FundingStatusBadge, FundingRates, FundingConditions, istDachSicht } from "./FundingProgramParts";
import { fundingStandLabel, FUNDING_TECHNIK_FUER, type FundingProgram, type FundingTechnik } from "../lib/funding-programs";

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

// Detail-Modal: zeigt alles, was wir zum Programm haben, ohne die Seite zu
// verlassen. Mechanik (Escape, Klick daneben, Fokus, Bottom-Sheet auf schmalen
// Bildschirmen) kommt aus dem geteilten Modal.
//
// `program` bleibt beim Schließen kurz erhalten, weil der Dialog sonst leer
// ausblendet — das Modal bleibt bis zum Ende der Animation gemountet.
function FundingProgramModal({
  program,
  onClose,
  technik,
}: {
  program: FundingProgram | null;
  onClose: () => void;
  /**
   * Die Technik, die dieser Rechner rechnet — und damit die einzige, deren
   * Bedingungen und Sätze hier etwas zu suchen haben.
   *
   * WARUM (27.08.2026): Das Fenster zeigte alles, was am Programm steht. Im
   * PV-Rechner las man bei Nidda deshalb „Höchstens zwei Module je Haushalt,
   * höchstens 800 W Einspeisung" — eine Bedingung des Balkonkraftwerks, die
   * jede Dachanlage ausschließt. Genau die Fehlerklasse, für die die Stadtseite
   * am 26.08. den Technik-Filter bekommen hat; der Rechner war dabei übersehen
   * worden. Eine Bedingung am falschen Ort ist eine falsche Auskunft.
   *
   * `useFoerderung` entscheidet, WELCHE Programme hier ankommen; welche Zeilen
   * eines Programms gelten, entscheidet erst diese Angabe.
   */
  technik: FundingTechnik;
}) {
  const [shownProgram, setShownProgram] = useState(program);
  useEffect(() => {
    if (program) setShownProgram(program);
  }, [program]);
  if (!shownProgram) return null;

  return (
    <Modal open={!!program} onClose={onClose} title={shownProgram.name}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <FundingStatusBadge status={shownProgram.status} />
        <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary") }}>{shownProgram.traeger}</span>
      </div>
      <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginBottom: 12 }}>
        {/* Der Gesamt-Höchstbetrag beschreibt die Dachanlage; unter einer
            Balkon-Sicht behauptete er bei Nidda das Siebeneinhalbfache des
            echten Deckels. Dieselbe Regel wie auf der Stadtseite, aus einer
            Quelle. */}
        Förderfähig: <span style={{ color: v("--color-text-primary") }}>{shownProgram.coveredCosts}</span>{shownProgram.maxFoerderung && istDachSicht(technik) ? ` · ${shownProgram.maxFoerderung}` : ""}
      </div>
      <div style={{ marginBottom: 14 }}>
        <FundingRates rates={shownProgram.rates} bordered technik={technik} />
      </div>
      <div style={{ marginBottom: shownProgram.conditions.length > 0 ? 14 : 0 }}>
        <FundingConditions conditions={shownProgram.conditions} technik={technik} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", fontSize: v("--font-size-small") }}>
        <a href={shownProgram.url} target="_blank" rel="noopener noreferrer" style={{ color: v("--color-accent"), textDecoration: "none", fontWeight: 700 }}>Zur offiziellen Quelle ›</a>
        <span style={{ color: v("--color-text-muted") }}>{fundingStandLabel(shownProgram)}</span>
      </div>
    </Modal>
  );
}

interface ResultFundingProps {
  loading: boolean;
  /** PLZ candidates from /api/funding; null = not resolved yet. */
  candidates: { ort: string; ags: string }[] | null;
  chosenAgs: string | null;
  onChooseAgs: (ags: string) => void;
  /** All programs matching the chosen AGS (bund + regional). */
  programs: FundingProgram[];
  /** Programs that yield a concrete, currently-active € grant. */
  applied: { program: FundingProgram; amount: number }[];
  total: number;
  enabled: boolean;
  onToggle: (b: boolean) => void;
  brutto: number;
  /**
   * Welche Technik gerechnet wird. Steuert nur den Wortlaut — welche Programme
   * überhaupt hier ankommen, entscheidet `useFoerderung`. Die Voreinstellung
   * hält die Bestandsaufrufe unverändert.
   */
  technik?: FundingTechnik;
  /**
   * Ein Satz über den Stand der Anrechnung — warum gerade weniger (oder nichts)
   * abgezogen wird, als die Programme hergeben. Kommt vom Rechner, nicht von
   * hier: Die Gründe sind rechnerspezifisch (Kumulierungsgrenze der BEG, von
   * Hand gesetzte Investition), und dieser Baustein soll sie nicht kennen
   * müssen. Ohne Hinweis bleibt die Karte unverändert.
   */
  hinweis?: string;
  /**
   * Inhalt direkt unter der Überschrift — gedacht für die Standort-Eingabe.
   *
   * WARUM ALS SLOT: Der Wärmepumpen-Rechner erhebt die Postleitzahl erst im
   * Ergebnis. Als eigener Kasten darüber standen zwei Rahmen mit zwei
   * Überschriften untereinander, obwohl es eine Sache ist — Frage und Antwort
   * gehören in dieselbe Karte. Mit `kopf` bleibt die Karte auch dann sichtbar,
   * wenn noch keine Postleitzahl aufgelöst ist; ohne `kopf` verhält sich alles
   * unverändert (PV- und Balkon-Rechner fragen den Ort woanders).
   */
  kopf?: React.ReactNode;
}

export default function ResultFunding({
  loading, candidates, chosenAgs, onChooseAgs,
  programs, applied, total, enabled, onToggle, brutto, technik = "pv", hinweis, kopf,
}: ResultFundingProps) {
  const [modalProgram, setModalProgram] = useState<FundingProgram | null>(null);

  // Programmname als Link → öffnet das Detail-Modal (kein Seitenwechsel).
  const ProgramLink = ({ p, children }: { p: FundingProgram; children?: React.ReactNode }) => (
    <button
      onClick={() => setModalProgram(p)}
      style={{ border: "none", background: "transparent", padding: 0, font: "inherit", color: v("--color-accent"), cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}
    >
      {children ?? p.name}
    </button>
  );

  // Nothing to show until a PLZ has been resolved (or a program was pre-armed).
  // Ohne Kopf-Inhalt gibt es vor der ersten Auflösung nichts zu zeigen.
  if (!kopf && !loading && candidates === null && !chosenAgs) return null;

  const card: React.CSSProperties = {
    background: v("--color-bg"), borderRadius: v("--radius-lg"),
    padding: "16px 16px", marginBottom: 16, border: `1px solid ${v("--color-border")}`,
  };
  const heading = (
    <div style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: 10 }}>
      Förderung
    </div>
  );

  // Eine Karte, ein Rahmen, eine Überschrift — der Kopf-Inhalt sitzt in jedem
  // Zustand an derselben Stelle, damit das Feld beim Auflösen nicht springt.
  const Karte = ({ children, akzent = false }: { children?: React.ReactNode; akzent?: boolean }) => (
    <div style={akzent ? { ...card, borderColor: v("--color-positive") } : card}>
      {heading}
      {kopf ? <div style={{ marginBottom: 14 }}>{kopf}</div> : null}
      {children}
    </div>
  );

  if (loading && !chosenAgs) {
    return <Karte><div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>Förderprogramme werden geprüft …</div></Karte>;
  }

  // Ambiguous PLZ: ask which municipality the user lives in before computing.
  if (!chosenAgs && candidates && candidates.length > 1) {
    return (
      <Karte>
        <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginBottom: 10 }}>
          Diese PLZ deckt mehrere Orte ab — wo wohnst du?
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {candidates.map((c) => (
            <button key={c.ags} onClick={() => onChooseAgs(c.ags)} style={{
              padding: "6px 12px", fontSize: v("--font-size-small"), fontWeight: 600, cursor: "pointer",
              background: v("--color-bg-muted"), color: v("--color-text-primary"),
              border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-sm"),
            }}>
              {c.ort}
            </button>
          ))}
        </div>
      </Karte>
    );
  }

  if (!chosenAgs) return kopf ? <Karte /> : null;

  // Location label = most specific matched non-bund program, else fall back to
  // the picked candidate's place name.
  const regional = programs.filter((p) => p.level !== "bund");
  const mostSpecific = regional[regional.length - 1];
  const ortLabel = mostSpecific?.region
    ?? candidates?.find((c) => c.ags === chosenAgs)?.ort
    ?? null;

  const hasGrant = applied.length > 0;
  const effektiv = Math.max(0, brutto - (enabled ? total : 0));

  return (
    <Karte akzent={hasGrant}>
      {hasGrant ? (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: enabled ? 12 : 0 }}>
            <span style={{
              position: "relative", width: 38, height: 22, borderRadius: 999, flexShrink: 0,
              background: enabled ? v("--color-positive") : v("--color-border-muted"), transition: "background 0.15s",
            }}>
              <span style={{
                position: "absolute", top: 2, left: enabled ? 18 : 2, width: 18, height: 18, borderRadius: "50%",
                background: v("--color-bg"), transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }} />
              <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "pointer" }} />
            </span>
            <span style={{ fontSize: v("--font-size-small"), color: v("--color-text-primary"), fontWeight: 600 }}>
              Förderung anrechnen{ortLabel ? ` (${ortLabel})` : ""}
            </span>
          </label>

          {enabled ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: v("--font-size-small") }}>
              {applied.map(({ program, amount }) => (
                <div key={program.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <ProgramLink p={program} />
                  <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-positive"), whiteSpace: "nowrap" }}>− {nf(amount)} €</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${v("--color-border")}`, paddingTop: 7 }}>
                <span style={{ color: v("--color-text-secondary") }}>Investition nach Förderung</span>
                <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-text-primary") }}>{nf(effektiv)} €</span>
              </div>
              <p style={{ fontSize: v("--font-size-caption"), lineHeight: 1.5, color: v("--color-text-faint"), margin: "2px 0 0" }}>
                Fördersätze ohne Gewähr — verbindlich ist die offizielle Quelle des Programms, Budgets können erschöpft sein.
              </p>
            </div>
          ) : mostSpecific ? (
            <div style={{ fontSize: v("--font-size-small"), marginTop: 8 }}>
              <ProgramLink p={mostSpecific}>Details zu {mostSpecific.name} ›</ProgramLink>
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-secondary"), lineHeight: 1.6 }}>
          {mostSpecific && hinweis ? (
            // Ein Hinweis nennt den Grund bereits — dann darf hier NICHT zusätzlich
            // „lässt sich nicht berechnen" stehen. Bei der Kumulierungsgrenze der BEG
            // ist der Betrag sehr wohl bekannt (Poing: 600 €), er hat nur keinen Platz
            // mehr. Beide Sätze nebeneinander widersprachen sich offen.
            <>
              Für {ortLabel ?? "deinen Ort"} gibt es <ProgramLink p={mostSpecific} />.
            </>
          ) : mostSpecific ? (
            <>
              Für {ortLabel ?? "deinen Ort"} liegt uns mit dem{" "}
              <ProgramLink p={mostSpecific} /> ein Programm vor, das sich nicht pauschal
              pro Anlage berechnen lässt. Die Details kannst du dir direkt ansehen.
            </>
          ) : (
            <>
              Für deinen Ort kennen wir kein aktives kommunales Förderprogramm für {FUNDING_TECHNIK_FUER[technik]}.
              {/* Der bundesweite Zusatz gilt NICHT für jede Technik: Die Nullsteuer
                  ist ein Umsatzsteuersatz auf Photovoltaik und Speicher, und die
                  BEG rechnet der Wärmepumpen-Rechner längst selbst ab. Der Satz
                  stand hier fest verdrahtet und wäre unter der Wärmepumpe eine
                  Falschaussage gewesen. */}
              {technik === "waermepumpe"
                ? " Die Bundesförderung (BEG) ist oben bereits eingerechnet."
                : " Bundesweit gilt die 0 % Mehrwertsteuer auf Photovoltaik und Speicher — die steckt bereits in den Marktpreisen."}
            </>
          )}
        </div>
      )}

      {hinweis ? (
        <p style={{ fontSize: v("--font-size-caption"), lineHeight: 1.5, color: v("--color-text-muted"), margin: "10px 0 0" }}>{hinweis}</p>
      ) : null}

      <Link href="/photovoltaik-foerderung" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: v("--font-size-small"), color: v("--color-accent"), textDecoration: "none" }}>
        Alle Förderprogramme <IconArrowRight size={iconSizes.xs} />
      </Link>

      <FundingProgramModal program={modalProgram} onClose={() => setModalProgram(null)} technik={technik} />
    </Karte>
  );
}
