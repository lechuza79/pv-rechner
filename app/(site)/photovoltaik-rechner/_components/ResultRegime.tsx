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
  eegReformStandLabel,
  EEG_ENTWURF_WERTE,
} from "../../../../lib/eeg-reform-config";
import { MARKTWERT_SOLAR_HISTORIE, DIREKTVERMARKTUNG } from "../../../../lib/marktwert-config";
import type { EinspeiseRegime, RegimeJahr } from "../../../../lib/einspeise-regime";
import { EINSPEISESATZ_MAX_CT } from "../../../../lib/constants";

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
   *  Begründung S. 251/250) — der Schalter bleibt bewusst bedienbar
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
  /** Rechnet der Nutzer mit einem selbst gesetzten Satz? (dritter Reiter) */
  eigenerSatz: boolean;
  setEigenerSatz: (b: boolean) => void;
  /** Setzt den Satz von Hand — damit ist er automatisch der eigene. */
  setHeuteSatzCt: (v: number) => void;
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
        fontSize: v("--font-size-small"),
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
  eigenerSatz, setEigenerSatz, setHeuteSatzCt,
}: ResultRegimeProps) {
  const reform = regime === "reform2027";
  const uebergang = verlauf.find((j) => j.art === "uebergang");
  const ersterMarkt = verlauf.find((j) => j.art === "markt-bonus" || j.art === "markt");
  const verlustProzent = Math.round((1 - einspeiseAnteil) * 100);

  return (
    <div>
      <div style={{ fontSize: v("--font-size-small"), fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4 }}>
        Nach welchen Konditionen soll gerechnet werden?
      </div>
      <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6, marginBottom: 10 }}>
        Anlagen, die bis Ende 2026 ans Netz gehen, behalten ihre Vergütung 20 Jahre lang. Für
        Neuanlagen ab 2027 soll sie entfallen.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Schalter aktiv={!reform && !eigenerSatz} onClick={() => { setRegime("heute"); setEigenerSatz(false); }}>
          Heute
          <div style={{ fontSize: v("--font-size-caption"), fontWeight: 400, opacity: 0.8 }}>
            {heuteSatzCt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ct, 20 J.
          </div>
        </Schalter>
        <Schalter aktiv={reform} onClick={() => setRegime("reform2027")}>
          Ab 2027
          <div style={{ fontSize: v("--font-size-caption"), fontWeight: 400, opacity: 0.8 }}>Entwurf</div>
        </Schalter>
        {/* Rückfallebene für alles, was der Rechner nicht kennt: eine
            Bestandsanlage mit ihrem alten Satz, ein Bescheid mit einer
            abweichenden Zahl. Gerechnet wird sie wie die heutige Lage —
            fester Satz über 20 Jahre. */}
        <Schalter aktiv={!reform && eigenerSatz} onClick={() => { setRegime("heute"); setEigenerSatz(true); }}>
          Eigener Satz
          <div style={{ fontSize: v("--font-size-caption"), fontWeight: 400, opacity: 0.8 }}>z. B. Bestandsanlage</div>
        </Schalter>
      </div>

      {/* Der Satz gehört unter die Reiter, weil er zu ihnen gehört: „Heute" ist
          der amtliche Wert (nur lesbar), „Eigener Satz" der selbst gesetzte. Im
          Entwurfs-Modus gibt es ihn nicht — dort ist der Erlös ein Verlauf. */}
      {!reform && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12, fontSize: v("--font-size-small"), color: v("--color-text-secondary"),
        }}>
          <span>Vergütungssatz</span>
          {eigenerSatz ? (
            <InlineEdit value={heuteSatzCt} onCommit={setHeuteSatzCt} unit=" ct" step={0.01} min={0} max={EINSPEISESATZ_MAX_CT} width={56} />
          ) : (
            <span style={{ fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-text-primary") }}>
              {heuteSatzCt.toLocaleString("de-DE", { minimumFractionDigits: 2 })} ct/kWh
            </span>
          )}
        </div>
      )}

      {reform && (
        <>
          <div style={{
            fontSize: v("--font-size-small"), color: v("--color-text-secondary"), lineHeight: 1.7,
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
                {" "}Den Aufschlag fürs Volleinspeisen streicht der Entwurf — damit lohnt es
                sich nicht mehr.
              </>
            )}
            {verlustProzent > 0 && (
              <>
                {" "}Neue Gebäudeanlagen unter {EEG_ENTWURF_WERTE.einspeiseGrenzeUnterKw} Kilowatt
                dürfen zudem nur die Hälfte ihrer Leistung einspeisen; hier gehen dadurch{" "}
                <strong style={{ color: v("--color-text-primary") }}>{verlustProzent} %</strong> des
                Überschusses verloren{einspeiseAnteil < 1 ? " — ein größerer Speicher fängt einen Teil auf" : ""}.
              </>
            )}
          </div>

          <label style={{
            display: "flex", alignItems: "flex-start", gap: 8, marginTop: 12, cursor: "pointer",
            fontSize: v("--font-size-body"), color: v("--color-text-primary"), lineHeight: 1.5,
          }}>
            <input
              type="checkbox"
              checked={marktErloes}
              onChange={(e) => setMarktErloes(e.target.checked)}
              style={{ marginTop: 2, accentColor: v("--color-accent"), width: 16, height: 16, flexShrink: 0 }}
            />
            <span>
              <strong style={{ fontWeight: 700 }}>Börsenerlös mitrechnen</strong>
              <span style={{ display: "block", fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginTop: 2 }}>
                Aus: Nach der Übergangszahlung bringt die Einspeisung null. An: Der Überschuss
                wird zum Marktwert bewertet.
              </span>
              {/* Die Wirkung an den Schalter schreiben. Sie steht sonst nur in
                  Zahlen weit oberhalb, und die Amortisation in ganzen Jahren
                  springt dadurch meist nicht — der Haken wirkte wirkungslos. */}
              {marktWirkungEuro !== undefined && Math.round(marktWirkungEuro) > 0 && (
                <span style={{ display: "block", fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginTop: 4 }}>
                  Der Unterschied zwischen an und aus beträgt über 25 Jahre{" "}
                  <strong style={{ fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
                    {Math.round(marktWirkungEuro).toLocaleString("de-DE")} €
                  </strong>.
                </span>
              )}
              {/* Bleibt die Wirkung bei null, ist das kein fehlender Wert, sondern
                  das Ergebnis: Bei kleinen Anlagen bringt der Börsenverkauf über
                  die Laufzeit weniger ein, als der Dienstleister an Grundgebühr
                  verlangt — dann vermarktet niemand. Ohne diesen Satz sieht der
                  Haken aus, als sei er kaputt. */}
              {marktWirkungEuro !== undefined && Math.round(marktWirkungEuro) <= 0 && (
                <span style={{ display: "block", fontSize: v("--font-size-small"), color: v("--color-text-secondary"), marginTop: 4 }}>
                  Bei dieser Anlagengröße bringt der Börsenverkauf über die Laufzeit nicht mehr
                  ein, als die Grundgebühr des Dienstleisters kostet — deshalb ändert der Haken
                  hier nichts.
                </span>
              )}
            </span>
          </label>

          {marktErloes && (
            <div style={{
              marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${v("--color-border")}`,
              fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.8,
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
              {/* Die Aufschlüsselung muss auf die Zahl führen, die unter ihr steht.
                  Ohne diese beiden Zeilen sprang sie von „4,93 ct × 0,90" direkt
                  auf einen GRÖSSEREN Wert — eine Rechnung, die man nicht
                  nachvollziehen kann, und damit genau das, was diese Seite nicht
                  sein will (Council 15.08.2026). Nur die mengenabhängige Gebühr
                  gehört in diese ct-Kette; die Grundgebühr ist ein Jahresbetrag
                  in Euro und steht deshalb im Text darunter. */}
              {ersterMarkt?.art === "markt-bonus" && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Bonus, erste {EEG_ENTWURF_WERTE.bonusMonate} Monate</span>
                  <span style={{ fontFamily: v("--font-mono") }}>
                    + {EEG_ENTWURF_WERTE.bonusCt.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ct
                  </span>
                </div>
              )}
              {ersterMarkt && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Gebühr des Dienstleisters</span>
                  <span style={{ fontFamily: v("--font-mono") }}>
                    − {DIREKTVERMARKTUNG.gebuehrCtKwh.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ct
                  </span>
                </div>
              )}
              {ersterMarkt && (
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: v("--color-text-secondary") }}>
                  <span>Bleibt im ersten Marktjahr</span>
                  <span style={{ fontFamily: v("--font-mono") }}>
                    {ersterMarkt.satzCt.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ct/kWh
                  </span>
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: v("--font-size-caption"), lineHeight: 1.6 }}>
                Solarstrom bringt am wenigsten, wenn viel davon anfällt — deshalb zählt der
                Marktwert Solar (
                {/* Zwei Nachkommastellen wie überall sonst bei Sätzen in ct/kWh. Der
                    amtliche Wert hat drei (4,508) — die stünden hier direkt neben
                    dem Niveau mit zweien und läsen sich wie ein anderer Grad an
                    Genauigkeit. Die volle Stelle steht auf /datenstand. */}
                {letzterMarktwert.ctKwh.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ct/kWh
                im Jahr {letzterMarktwert.jahr}), nicht der mittlere Börsenpreis. Dein
                Eigenverbrauch nimmt die gut bezahlten Morgen- und Abendstunden weg, also kommt
                davon noch etwas weniger an. Dazu kommen{" "}
                {DIREKTVERMARKTUNG.grundgebuehrProJahr.toLocaleString("de-DE")} € Grundgebühr im
                Jahr — aber erst ab dem Marktjahr: In den{" "}
                {EEG_ENTWURF_WERTE.uebergangMonate} Monaten der Übergangszahlung nimmt der
                Netzbetreiber ab, da gibt es keinen Dienstleister. Der Erlös wächst hier nicht
                mit dem Strompreis mit.
              </div>
            </div>
          )}
        </>
      )}

      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: `1px solid ${v("--color-border")}`,
        fontSize: v("--font-size-caption"), color: v("--color-text-muted"), lineHeight: 1.6,
      }}>
        {reform ? (
          <>
            {/* Die vier Aussagen, die hier stehen MÜSSEN (festgenagelt von
                e2e/eeg-reform-sachstand.spec.ts): Entwurfswerte statt geltendem
                Recht, der Verfahrensstand samt Datum (steckt im Satz aus der
                einen Quelle), der Änderungsvorbehalt und der EU-Beihilfevorbehalt.
                Gekürzt wurde nur, was doppelt dastand — das Entwurfsdatum nennt
                eegVerfahrenSatz() bereits. */}
            <strong style={{ fontWeight: 700, color: v("--color-text-secondary") }}>Entwurfswerte, kein geltendes Recht.</strong>{" "}
            {eegVerfahrenSatz({ kurz: true })}. Die Beträge können sich im Verfahren noch ändern
            und brauchen die beihilferechtliche Genehmigung der EU-Kommission.
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
