"use client";
// Umschalter zwischen heutiger Vergütung und den geplanten Konditionen ab 2027,
// plus der abschaltbaren Marktrechnung für die Zeit nach der Förderphase.
//
// Warum das nicht als weitere Zeile ins Ergebnis-Grid gehört: Hier wird nicht
// ein Wert editiert, sondern die RECHTSLAGE gewechselt, unter der alles darüber
// gerechnet wird. Das braucht den Entwurfsvorbehalt daneben und eine Erklärung,
// was der Wechsel konkret tut — sonst steht im Ergebnis eine andere
// Amortisation, ohne dass erkennbar ist, warum.
//
// Der Rahmen kommt NICHT mehr von hier: Dieser Block ist der Inhalt des
// aufklappbaren Abschnitts „Einspeisung und Vergütung" (ResultVerguetung), der
// zugeklappt den gewählten Zustand in einer Zeile trägt.
import Link from "next/link";
import InlineEdit from "../../../../components/InlineEdit";
import GlossaryTerm from "../../../../components/GlossaryTerm";
import { v } from "../../../../lib/theme";
import {
  eegVerfahrenSatz,
  eegDatum,
  eegReformStandLabel,
  EEG_REFORM_STAND,
  EEG_ENTWURF_WERTE,
} from "../../../../lib/eeg-reform-config";
import { MARKTWERT_SOLAR_HISTORIE } from "../../../../lib/marktwert-config";
import type { EinspeiseRegime, RegimeJahr } from "../../../../lib/einspeise-regime";

const letzterMarktwert = MARKTWERT_SOLAR_HISTORIE[MARKTWERT_SOLAR_HISTORIE.length - 1];

export interface ResultRegimeProps {
  regime: EinspeiseRegime;
  setRegime: (r: EinspeiseRegime) => void;
  marktErloes: boolean;
  setMarktErloes: (b: boolean) => void;
  /** Marktwert-Niveau heute in ct/kWh (editierbar). */
  niveauCt: number;
  setNiveauCt: (n: number) => void;
  /** Profilfaktor aus der Stundensimulation dieses Haushalts. */
  profilFaktor: number;
  /** Anteil des Überschusses, der am 50-%-Deckel noch durchgeht (0–1). */
  einspeiseAnteil: number;
  /** Der gerechnete Verlauf — für die Beispielzahlen im Text. */
  verlauf: RegimeJahr[];
  /** Heutiger Satz in ct/kWh, für den Vergleich. */
  heuteSatzCt: number;
  /** Ist im Ergebnis Volleinspeisung gewählt? Der Entwurf streicht den
   *  Volleinspeisungs-Aufschlag für Neuanlagen (§ 48 Abs. 2a EEG 2023 entfällt,
   *  Begründung S. 248/250) — der Schalter bleibt bewusst bedienbar
   *  (Betreiber-Entscheidung 05.08.2026), aber der Reform-Zweig erklärt,
   *  dass sich Volleinspeisen dann nicht mehr lohnt. */
  vollGewaehlt: boolean;
  /**
   * Was der Börsenerlös über die Laufzeit ausmacht, in Euro — der Unterschied
   * zwischen Haken an und Haken aus im gewählten Szenario. Ohne diese Zahl
   * klickt man den Haken und sieht an der Stelle nichts: Die Wirkung setzt erst
   * nach der Übergangszahlung ein, ist klein und bewegt die Amortisation in
   * ganzen Jahren meist gar nicht.
   */
  marktWirkungEuro?: number;
}

function Schalter({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={aktiv}
      style={{
        flex: 1,
        padding: "8px 10px",
        borderRadius: v("--radius-sm"),
        border: `1px solid ${aktiv ? v("--color-accent") : v("--color-border")}`,
        background: aktiv ? v("--color-bg-accent") : "transparent",
        color: aktiv ? v("--color-accent-dark") : v("--color-text-secondary"),
        fontWeight: aktiv ? 700 : 500,
        fontSize: 13,
        cursor: "pointer",
        lineHeight: 1.3,
      }}
    >
      {children}
    </button>
  );
}

export default function ResultRegime({
  regime, setRegime, marktErloes, setMarktErloes, niveauCt, setNiveauCt,
  profilFaktor, einspeiseAnteil, verlauf, heuteSatzCt, vollGewaehlt, marktWirkungEuro,
}: ResultRegimeProps) {
  const reform = regime === "reform2027";
  const uebergang = verlauf.find((j) => j.art === "uebergang");
  const ersterMarkt = verlauf.find((j) => j.art === "markt-bonus" || j.art === "markt");
  const verlustProzent = Math.round((1 - einspeiseAnteil) * 100);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4 }}>
        Nach welchen Konditionen soll gerechnet werden?
      </div>
      <div style={{ fontSize: 12, color: v("--color-text-muted"), lineHeight: 1.6, marginBottom: 10 }}>
        Anlagen, die bis Ende 2026 ans Netz gehen, behalten ihre Vergütung 20 Jahre lang. Für
        Neuanlagen ab 2027 soll sie entfallen.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: reform ? 12 : 0 }}>
        <Schalter aktiv={!reform} onClick={() => setRegime("heute")}>
          Heute
          <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>
            {heuteSatzCt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ct, 20 Jahre
          </div>
        </Schalter>
        <Schalter aktiv={reform} onClick={() => setRegime("reform2027")}>
          Ab 2027
          <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>Entwurf, kein Gesetz</div>
        </Schalter>
      </div>

      {reform && (
        <>
          <div style={{
            fontSize: 12, color: v("--color-text-secondary"), lineHeight: 1.7,
            borderTop: `1px dashed ${v("--color-border")}`, paddingTop: 10,
          }}>
            {uebergang ? (
              <>
                Gerechnet wird mit einer befristeten Übergangszahlung von{" "}
                <strong style={{ color: v("--color-text-primary") }}>
                  {uebergang.satzCt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ct/kWh
                </strong>{" "}
                über {EEG_ENTWURF_WERTE.uebergangMonate} Monate. Danach müsste der Strom über einen
                Dienstleister an der Börse verkauft werden.
              </>
            ) : (
              <>
                Für diese Anlagengröße sieht der Entwurf im gewählten Inbetriebnahmejahr keine
                Übergangszahlung vor — der Strom müsste von Anfang an über einen Dienstleister an
                der Börse verkauft werden.
              </>
            )}
            {vollGewaehlt && (
              <>
                {" "}Den Aufschlag fürs Volleinspeisen gäbe es nach dem Entwurf nicht mehr —
                eingespeister Strom bringt dann denselben Satz, egal ob du zusätzlich selbst
                verbrauchst. Damit lohnt sich Volleinspeisen nicht mehr.
              </>
            )}
            {verlustProzent > 0 && (
              <>
                {" "}Zusätzlich ist die Einspeiseleistung neuer Dachanlagen unter{" "}
                {EEG_ENTWURF_WERTE.einspeiseGrenzeUnterKw} Kilowatt auf die Hälfte der
                installierten Leistung begrenzt; bei dieser Anlage gehen dadurch{" "}
                <strong style={{ color: v("--color-text-primary") }}>{verlustProzent} %</strong> des
                Überschusses verloren{einspeiseAnteil < 1 ? " — ein größerer Speicher fängt davon einen Teil auf" : ""}.
              </>
            )}
          </div>

          <label style={{
            display: "flex", alignItems: "flex-start", gap: 8, marginTop: 12, cursor: "pointer",
            fontSize: 13, color: v("--color-text-primary"), lineHeight: 1.5,
          }}>
            <input
              type="checkbox"
              checked={marktErloes}
              onChange={(e) => setMarktErloes(e.target.checked)}
              style={{ marginTop: 2, accentColor: v("--color-accent"), width: 16, height: 16, flexShrink: 0 }}
            />
            <span>
              <strong style={{ fontWeight: 700 }}>Börsenerlös mitrechnen</strong>
              <span style={{ display: "block", fontSize: 12, color: v("--color-text-muted"), marginTop: 2 }}>
                Aus: Nach der Übergangszahlung bringt die Einspeisung null — die zurückhaltende
                Annahme. An: Der Überschuss wird zum Marktwert bewertet.
              </span>
              {/* Die Wirkung an den Schalter schreiben. Sie steht sonst nur in
                  Zahlen weit oberhalb, und die Amortisation in ganzen Jahren
                  springt dadurch meist nicht — der Haken wirkte wirkungslos. */}
              {marktWirkungEuro !== undefined && marktWirkungEuro > 0 && (
                <span style={{ display: "block", fontSize: 12, color: v("--color-text-secondary"), marginTop: 4 }}>
                  Der Unterschied zwischen an und aus beträgt über 25 Jahre{" "}
                  <strong style={{ fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
                    {Math.round(marktWirkungEuro).toLocaleString("de-DE")} €
                  </strong>.
                </span>
              )}
            </span>
          </label>

          {marktErloes && (
            <div style={{
              marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${v("--color-border")}`,
              fontSize: 12, color: v("--color-text-muted"), lineHeight: 1.8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span>
                  <GlossaryTerm id="marktwert-solar">Marktwert Solar</GlossaryTerm> heute
                </span>
                <InlineEdit
                  value={niveauCt}
                  onCommit={(val) => setNiveauCt(val)}
                  unit=" ct"
                  step={0.1}
                  min={0}
                  max={30}
                  width={70}
                  fmt={(x) => x.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Dein Einspeiseprofil</span>
                <span style={{ fontFamily: v("--font-mono") }}>
                  × {profilFaktor.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {ersterMarkt && (
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: v("--color-text-secondary") }}>
                  <span>Bleibt im ersten Marktjahr</span>
                  <span style={{ fontFamily: v("--font-mono") }}>
                    {ersterMarkt.satzCt.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ct/kWh
                  </span>
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.6 }}>
                Solarstrom fällt an, wenn viel Solarstrom anfällt — also wenn der Börsenpreis am
                niedrigsten ist. Deshalb zählt nicht der mittlere Börsenpreis, sondern der Marktwert
                Solar:{" "}
                {/* Zwei Nachkommastellen wie überall sonst bei Sätzen in ct/kWh. Der
                    amtliche Wert hat drei (4,508) — die stünden hier direkt neben
                    dem Niveau mit zweien und läsen sich wie ein anderer Grad an
                    Genauigkeit. Die volle Stelle steht auf /datenstand. */}
                {letzterMarktwert.ctKwh.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ct/kWh
                im Jahr {letzterMarktwert.jahr}. Weil dein Eigenverbrauch die gut bezahlten Morgen-
                und Abendstunden wegnimmt und die Mittagsspitze übrig lässt, bekommst du davon noch
                einmal etwas weniger. Abgezogen sind die Gebühren des Dienstleisters; der Erlös
                wächst in dieser Rechnung nicht mit dem Strompreis mit.
              </div>
            </div>
          )}
        </>
      )}

      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: `1px solid ${v("--color-border")}`,
        fontSize: 11, color: v("--color-text-muted"), lineHeight: 1.6,
      }}>
        {reform ? (
          <>
            <strong style={{ fontWeight: 700, color: v("--color-text-secondary") }}>Entwurfswerte, kein geltendes Recht.</strong>{" "}
            {eegVerfahrenSatz({ kurz: true })}. Die Beträge stehen im Gesetzentwurf vom{" "}
            {eegDatum(EEG_REFORM_STAND.entwurfIso)} und können sich im Verfahren noch ändern; die
            Fördersätze brauchen zusätzlich die beihilferechtliche Genehmigung der EU-Kommission.
            (Stand: {eegReformStandLabel()})
          </>
        ) : (
          <>Für Inbetriebnahme bis Ende 2026 gilt Bestandsschutz: die volle Vergütung über 20 Jahre.</>
        )}{" "}
        <Link
          href="/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung"
          style={{ color: v("--color-accent"), textDecoration: "none", fontWeight: 600 }}
        >
          Was das für die Rechnung bedeutet →
        </Link>
      </div>
    </div>
  );
}
