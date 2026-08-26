"use client";
// Umschalter zwischen dem heute geltenden BEG-Förderstand und dem Stand ab dem
// nächsten Stichtag der Richtlinie.
//
// Warum es diesen Schalter gibt: Die Förderrichtlinie schreibt ihre eigene
// Absenkung im Voraus fest. Anfang 2027 halbiert sich der Grundfördersatz für
// Wärmepumpen von 30 auf 15 Prozent, ab Februar 2027 sinken zusätzlich der
// Klimageschwindigkeits-Bonus und der Höchstbetrag der anrechenbaren Kosten.
// Wer heute plant und erst im nächsten Jahr beantragt, bekommt also etwas
// anderes, als der Rechner ihm zeigt.
//
// WAS DIESER BLOCK VOR ALLEM LEISTEN MUSS: die Reform richtig benennen. Zum
// selben Zeitpunkt kommt ein Bonus von 15 Prozentpunkten für Wärmepumpen mit
// Ursprung in der EU — betragsgleich mit der Halbierung. Für ein solches Gerät
// ändert sich am Fördersatz gar nichts. Die Reform ist damit keine Kürzung,
// sondern eine BEDINGUNG, und ein Rechner, der nur die Halbierung zeigte,
// beantwortete die falsche Frage. Deshalb wird der Ursprung gefragt und nicht
// angenommen (Council 26.08.2026).
//
// Dasselbe Muster wie ResultRegime im PV-Rechner, mit einem Unterschied in der
// Beschriftung: Dort steht ein GESETZENTWURF zur Debatte, hier eine seit dem
// 21.07.2026 GELTENDE Richtlinie mit künftigem Stichtag. „Entwurfswerte, kein
// geltendes Recht" wäre hier falsch. Der Vorbehalt ist trotzdem nicht keiner,
// sondern ein anderer: Eine Förderrichtlinie ist Verwaltungsvorschrift, das
// Ministerium kann sie ohne parlamentarisches Verfahren ändern — genau das ist
// am 17.07.2026 passiert, als sie die Fassung von 2023 ersetzte. Und einen
// Rechtsanspruch auf die Förderung gibt es nicht (Nr. 7.2).
import InfoTooltip from "../../../../components/InfoTooltip";
import { v, space } from "../../../../lib/theme";
import {
  BEG_WERTSCHOEPFUNGS_BONUS,
  type BegStand,
  type BegStufe,
} from "../../../../lib/heatpump-config";

export interface BegStandSchalterProps {
  stand: BegStand;
  setStand: (s: BegStand) => void;
  /** Die heute geltende Stufe. */
  jetzt: BegStufe;
  /** Die Stufe ab dem nächsten Stichtag — fehlt, wenn der Fahrplan ausgelaufen ist. */
  naechste?: BegStufe;
  /** Hat die Wärmepumpe ihren Ursprung in der EU? */
  euUrsprung: boolean;
  setEuUrsprung: (b: boolean) => void;
  /** Zuschuss in Euro nach heutigem Stand — nach allen Boni und nach Kappung. */
  betragJetzt: number;
  /** Zuschuss nach dem nächsten Stand, OHNE EU-Bonus. */
  betragNaechsteOhneEu: number;
  /** Zuschuss nach dem nächsten Stand, MIT EU-Bonus. */
  betragNaechsteMitEu: number;
}

function Schalter({ aktiv, onClick, titel, unter }: {
  aktiv: boolean; onClick: () => void; titel: string; unter: string;
}) {
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
      {titel}
      <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>{unter}</div>
    </button>
  );
}

export default function BegStandSchalter({
  stand, setStand, jetzt, naechste, euUrsprung, setEuUrsprung,
  betragJetzt, betragNaechsteOhneEu, betragNaechsteMitEu,
}: BegStandSchalterProps) {
  // Ist der Fahrplan ausgelaufen (nach dem letzten Stichtag), gibt es nichts
  // gegenüberzustellen. Zwei Reiter mit demselben Inhalt sähen kaputt aus.
  if (!naechste) return null;

  const kuenftig = stand === "naechste";
  // Trägt die nächste Stufe den EU-Bonus schon? Er beginnt zum selben Zeitpunkt
  // wie die Halbierung; bei späteren Stufen gilt er ohnehin.
  const bonusLaeuft = naechste.abIso >= BEG_WERTSCHOEPFUNGS_BONUS.abIso;
  const verlustOhneEu = betragJetzt - betragNaechsteOhneEu;
  const verlustMitEu = betragJetzt - betragNaechsteMitEu;

  return (
    <div style={{ marginBottom: space.md }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: v("--color-text-primary"), marginBottom: 4 }}>
        Nach welchem Förderstand soll gerechnet werden?
      </div>
      <div style={{ fontSize: 12, color: v("--color-text-muted"), lineHeight: 1.6, marginBottom: 10 }}>
        Die Förderung ändert sich zu festen Stichtagen. Maßgeblich ist, wann der Antrag eingeht —
        nicht, wann eingebaut wird.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Schalter
          aktiv={!kuenftig}
          onClick={() => setStand("jetzt")}
          titel="Heute"
          unter={`${Math.round(jetzt.grundfoerderung * 100)} % Grundförderung`}
        />
        <Schalter
          aktiv={kuenftig}
          onClick={() => setStand("naechste")}
          titel={naechste.bezeichnung.replace(/^./, (c) => c.toUpperCase())}
          unter={`${Math.round(naechste.grundfoerderung * 100)} % Grundförderung`}
        />
      </div>

      <div style={{
        fontSize: 12, color: v("--color-text-secondary"), lineHeight: 1.7,
        borderTop: `1px dashed ${v("--color-border")}`, paddingTop: 10,
      }}>
        {naechste.aenderung}
        {/* Der Unterschied gehört in EURO an den Schalter, nicht in
            Prozentpunkten. Wer nur die Punkte liest, verrechnet sich
            systematisch: Der Fördersatz ist bei 70 % bzw. 80 % gekappt, und wer
            heute über die Kappung kommt, verliert weniger als die vollen 15
            Punkte. Für einen selbstnutzenden Haushalt mit niedrigem Einkommen
            sind es 11 %, für einen ohne Einkommens-Bonus ein Drittel und für
            einen ganz ohne Boni tatsächlich die Hälfte. Nur der Euro-Betrag
            stimmt für alle. */}
        {bonusLaeuft ? (
          <>
            {" "}Gleichzeitig kommt ein Bonus von{" "}
            {Math.round(BEG_WERTSCHOEPFUNGS_BONUS.satz * 100)} Prozentpunkten für Wärmepumpen mit
            Ursprung in der EU hinzu — genau so viel, wie die Halbierung wegnimmt.
            <InfoTooltip title="Bonus für Wärmepumpen aus der EU" ariaLabel="Bonus für Wärmepumpen aus der EU">
              Die Förderrichtlinie gibt ab dem ersten Quartal 2027 zusätzlich 15 Prozentpunkte,
              wenn die Wärmepumpe ihren Ursprung in der EU hat. Weil der Grundsatz zum selben
              Zeitpunkt um 15 Punkte sinkt, ändert sich für ein solches Gerät am Fördersatz
              nichts — die Kürzung trifft nur Geräte von außerhalb.
              Ob ein bestimmtes Gerät den Bonus bekommt, können wir nicht für dich beantworten:
              Der Ursprung hängt am Produktionsort und an der Fertigungstiefe, nicht am
              Firmensitz — ein deutscher Markenname belegt ihn nicht, ein asiatischer schließt
              ihn nicht aus, und mehrere asiatische Hersteller fertigen in Europa. Die
              amtlichen Gerätelisten führen dazu kein Feld, und die Einzelheiten regelt ein
              gesondertes Infoblatt. Dein Angebot nennt das Gerät — danach lässt sich fragen.
              Anders als Klima- und Einkommens-Bonus setzt dieser Bonus keine Selbstnutzung
              voraus.
            </InfoTooltip>
          </>
        ) : null}
      </div>

      {kuenftig && bonusLaeuft && (
        <div style={{
          marginTop: 10, padding: "8px 10px", borderRadius: v("--radius-sm"),
          background: v("--color-bg-muted"), border: `1px solid ${v("--color-border")}`,
        }}>
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer",
            fontSize: 12.5, color: v("--color-text-primary"), lineHeight: 1.5,
          }}>
            <input
              type="checkbox"
              checked={euUrsprung}
              onChange={(e) => setEuUrsprung(e.target.checked)}
              style={{ marginTop: 2, accentColor: v("--color-accent"), width: 16, height: 16, flexShrink: 0 }}
            />
            <span>
              <strong style={{ fontWeight: 700 }}>Wärmepumpe mit Ursprung in der EU</strong>
              <span style={{ display: "block", fontSize: 12, color: v("--color-text-muted"), marginTop: 2 }}>
                {verlustMitEu > 0 ? (
                  <>
                    Mit EU-Gerät bleiben{" "}
                    <strong style={{ fontFamily: v("--font-mono"), color: v("--color-text-secondary") }}>
                      {betragNaechsteMitEu.toLocaleString("de-DE")} €
                    </strong>{" "}
                    statt{" "}
                    <strong style={{ fontFamily: v("--font-mono"), color: v("--color-text-secondary") }}>
                      {betragNaechsteOhneEu.toLocaleString("de-DE")} €
                    </strong>
                    {" "}— heute wären es {betragJetzt.toLocaleString("de-DE")} €.
                  </>
                ) : (
                  <>
                    Mit EU-Gerät bleibt es bei{" "}
                    <strong style={{ fontFamily: v("--font-mono"), color: v("--color-text-secondary") }}>
                      {betragNaechsteMitEu.toLocaleString("de-DE")} €
                    </strong>
                    {" "}— also bei genau dem Betrag von heute. Ohne wären es{" "}
                    {betragNaechsteOhneEu.toLocaleString("de-DE")} €.
                  </>
                )}
              </span>
            </span>
          </label>
        </div>
      )}

      {kuenftig && verlustOhneEu > 0 && !euUrsprung && (
        <div style={{ marginTop: 8, fontSize: 12, color: v("--color-text-secondary"), lineHeight: 1.6 }}>
          Für deine Anlage sind das{" "}
          <strong style={{ fontFamily: v("--font-mono"), color: v("--color-text-primary") }}>
            {verlustOhneEu.toLocaleString("de-DE")} €
          </strong>{" "}
          weniger Zuschuss als heute.
        </div>
      )}

      <div style={{
        marginTop: 10, paddingTop: 8, borderTop: `1px solid ${v("--color-border")}`,
        fontSize: 11, color: v("--color-text-muted"), lineHeight: 1.6,
      }}>
        {kuenftig ? (
          <>
            <strong style={{ fontWeight: 700, color: v("--color-text-secondary") }}>
              Geltende Richtlinie, künftiger Stichtag.
            </strong>{" "}
            Diese Änderungen stehen bereits in der Förderrichtlinie, die seit dem 21. Juli 2026
            gilt — anders als bei einem Gesetzentwurf ist dafür kein weiterer Beschluss nötig.
            Einen tagesgenauen Termin nennt sie für die Wärmepumpen-Sätze allerdings nicht,
            sondern nur das erste Quartal 2027.{" "}
            <InfoTooltip title="Was ab 2027 sonst noch gilt" ariaLabel="Was ab 2027 sonst noch gilt">
              Zwei weitere Änderungen zum selben Zeitpunkt rechnen wir nicht mit, weil sie von
              Angaben abhängen, die dieser Rechner nicht kennt: Wer schon eine geförderte
              Anlage im Haus hat — eine Pelletheizung, eine Wärmepumpe, unter Umständen auch
              eine Solarthermieanlage —, die seit Anfang 2008 in Betrieb ist, bekommt für den
              Austausch möglicherweise gar keine Förderung mehr. Ist eine solche Anlage älter,
              werden nur noch 25 Prozent der Kosten angerechnet. Wer dagegen eine Gas-, Öl-,
              Kohle- oder Nachtspeicherheizung ersetzt — der Fall, den dieser Rechner
              abbildet —, ist von beidem nicht betroffen. Unabhängig davon gilt: Ab 2028
              werden nur noch Wärmepumpen mit natürlichen Kältemitteln gefördert, und wo eine
              Gemeinde den Anschluss an ein Wärmenetz beschlossen hat, wird nur dieser
              gefördert.
            </InfoTooltip>
          </>
        ) : (
          <>Diese Sätze gelten für Anträge, die noch in diesem Jahr eingehen.</>
        )}{" "}
        Ein Rechtsanspruch auf die Förderung besteht nicht; entschieden wird über den Antrag.
      </div>
    </div>
  );
}
