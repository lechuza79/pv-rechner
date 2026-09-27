import { v, space, pad } from "../../../../lib/theme";
import AdminSeitenkopf from "../../../../components/admin/AdminSeitenkopf";
import InfoTooltip from "../../../../components/InfoTooltip";
import { leseBilanz } from "../../../../lib/projekt-bilanz-db";
import { STUNDENSATZ_BELEG, STUNDEN_JE_TAG } from "../../../../lib/projekt-bilanz";
import { ROLLENSAETZE, ERHEBUNG } from "../../../../lib/rollensaetze";
import { MESSUNGEN, FEHLERRICHTUNG, KI_ANNAHME_STAND } from "../../../../lib/ki-wirkung";
import { KURS_USD_EUR, PREISE_STAND } from "../../../../lib/modellpreise";

export const metadata = {
  title: "Projekt-Bilanz – Solar Check Admin",
  robots: { index: false, follow: false },
};

// ─── Was hineinging, was herauskam ───────────────────────────────────────────
//
// Die Zahlen gab es seit dem 23.09.2026 nur als Ausgabe eines Befehls auf der
// Kommandozeile. Der Betreiber kommt daran nicht heran — und braucht sie
// wiederholt und aktuell, für ein Pitchdeck und später eine Über-uns-Seite.
//
// DREI GRÖSSEN, DIE HIER NEBENEINANDERSTEHEN UND NICHT DASSELBE SIND: bezahlt
// (Euro, gemessen), Listenwert (Dollar, Vergleichsmaßstab) und Herstellwert
// (Euro, geschätzt). Es gibt deshalb bewusst keine Gesamtsumme; wer sie bildet,
// behauptet eine Vergleichbarkeit, die keine zwei von ihnen haben.
//
// Diese Seite bleibt intern. Drei ihrer Zahlen gehören nicht nach außen: was das
// Projekt an Abos kostet, was die Stunde des Betreibers wert ist, und was ein
// Team verlangt hätte. Welche Zahlen je öffentlich werden, ist eine
// Produktentscheidung — nicht die Nebenwirkung einer Ansicht.
export const dynamic = "force-dynamic";

const z = (n: number) => Math.round(n).toLocaleString("de-DE");
const eur = (n: number) => `${z(n)} €`;
const usd = (n: number) => `${z(n)} $`;
/** Eine Nachkommastelle, deutsch — nie über `toFixed`, das liefert einen Punkt. */
const dez = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Ein Tag oder Monat aus der Ablage, in deutscher Schreibweise. */
function datum(s: string): string {
  const t = s.split("-");
  return t.length === 3 ? `${t[2]}.${t[1]}.${t[0]}` : `${t[1]}/${t[0]}`;
}

function Block({ titel, hilfe, children }: {
  titel: string;
  hilfe?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: space.xxl }}>
      <div style={{ display: "flex", alignItems: "center", gap: space.xs, marginBottom: space.md }}>
        <h2 style={{ margin: 0, fontSize: v("--font-size-h3") }}>{titel}</h2>
        {hilfe ? (
          <InfoTooltip title={titel} ariaLabel={`Was zeigt „${titel}"?`} exportNote={false}>
            {hilfe}
          </InfoTooltip>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Eine Zeile: Beschriftung links, Wert rechts, Einordnung darunter. */
function Zeile({ was, wert, dazu }: { was: string; wert: string; dazu?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: space.md,
        padding: `${space.sm}px 0`,
        borderBottom: `1px solid ${v("--color-border")}`,
      }}
    >
      <div>
        <div style={{ fontSize: v("--font-size-body") }}>{was}</div>
        {dazu ? (
          <div style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>{dazu}</div>
        ) : null}
      </div>
      <div
        style={{
          fontFamily: v("--font-mono"),
          fontSize: v("--font-size-body"),
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {wert}
      </div>
    </div>
  );
}

function raum(r: { von: string; bis: string } | null): string | undefined {
  return r ? `${datum(r.von)} bis ${datum(r.bis)}` : undefined;
}

export default async function BilanzPage() {
  const stand = await leseBilanz();

  if (stand.art === "leer") {
    return (
      <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary"), maxWidth: 760 }}>
        <AdminSeitenkopf titel="Projekt-Bilanz" />
        <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted") }}>
          {stand.grund}
        </p>
      </div>
    );
  }

  const { bilanz: b, bestandVom } = stand;
  const i = b.investiert;
  const w = b.wert;
  const abschlag = Math.round((1 - w.personentage / w.tageKlassisch) * 100);

  return (
    <div style={{ fontFamily: v("--font-text"), color: v("--color-text-primary"), maxWidth: 760 }}>
      <AdminSeitenkopf
        titel="Projekt-Bilanz"
        hilfe={
          <>
            Drei Größen stehen hier nebeneinander und sind <strong>nicht</strong> dasselbe:
            bezahltes Geld (gemessen), der Listenwert der Rechenleistung (ein
            Vergleichsmaßstab, kein Geld) und der Herstellwert (eine Schätzung).
            Deshalb gibt es hier keine Gesamtsumme. Bestand vom {datum(bestandVom)}.
          </>
        }
      />

      <Block
        titel="Investiert"
        hilfe={
          <>
            Die Arbeitszeit kommt aus den Zeitstempeln der Gesprächsprotokolle:
            aufeinanderfolgende Stempel bilden einen Block, eine Lücke über 15 Minuten
            trennt zwei. Überlappende Blöcke paralleler Arbeitsstände werden{" "}
            <strong>zusammengelegt</strong>, nicht addiert. Was ohne offene Sitzung
            passiert — nachdenken, prüfen, lesen — zählt nicht mit; die Zahl ist also
            eher zu niedrig.
          </>
        }
      >
        <Zeile
          was="Arbeitszeit, gemessen"
          wert={`${z(i.stunden)} h`}
          dazu={`an ${z(i.arbeitstage)} Tagen · ${raum(i.zeitraum.zeit) ?? "Zeitraum unbekannt"}`}
        />
        <Zeile
          was="davon parallel zu einem anderen Projekt"
          wert={`${z(i.stundenParallel)} h`}
          dazu={`zur Hälfte angerechnet → gerechnet wird mit ${z(i.stundenBereinigt)} h`}
        />
        {i.stundenHochgerechnet > 0 && (
          <Zeile
            was="Frühphase, hochgerechnet"
            wert={`${z(i.stundenHochgerechnet)} h`}
            dazu="Protokolle gelöscht — über die Änderungen geschätzt, getrennt geführt"
          />
        )}
        <Zeile
          was="Eigene Zeit in Geld"
          wert={eur(i.eigeneZeitEur)}
          dazu={STUNDENSATZ_BELEG}
        />
        <Zeile
          was="Bezahlt (Abos, Hosting, Dienste)"
          wert={eur(i.bezahltEur)}
          dazu={`nur der Anteil dieses Projekts · ${raum(i.zeitraum.geld) ?? "Zeitraum unbekannt"}`}
        />
        <Zeile
          was="Rechenleistung"
          wert={`${dez(i.tokens / 1e9)} Mrd. Tokens`}
          dazu="ganze Laufzeit, Frühphase hochgerechnet"
        />
        <Zeile
          was="Listenwert dieser Rechenleistung"
          wert={usd(i.listenwertUsd)}
          dazu={`Preisliste vom ${datum(PREISE_STAND)}, Kurs ${dez(KURS_USD_EUR * 100)} Cent · ${raum(i.zeitraum.listenwert) ?? "nur erhaltene Protokolle"}`}
        />
      </Block>

      <Block titel="Entstanden">
        <Zeile was="Zeilen Code" wert={z(b.entstanden.codezeilen)} />
        <Zeile was="Zeilen Dokumentation" wert={z(b.entstanden.dokuzeilen)} />
        <Zeile was="Prüfungen" wert={z(b.entstanden.testfaelle)} />
        <Zeile was="Dateien" wert={z(b.entstanden.dateien)} />
        <Zeile was="Änderungen" wert={z(b.entstanden.commits)} />
      </Block>

      <Block
        titel="Wert — was ein Team dafür verlangt hätte"
        hilfe={
          <>
            Geschätzt, nicht gemessen. Gerechnet wird nach <strong>Gewerken</strong>, nicht
            nach Codezeilen: Das übliche Verfahren aus Zeilen (COCOMO, 1981) liefert hier
            ein Ergebnis, das um Faktor 200 neben der tatsächlichen Arbeitszeit liegt — es
            unterstellt handgeschriebenen Code ohne fertige Bausteine. Stattdessen werden
            die Lieferbestandteile gezählt und jedem Erfahrungswerte in Personentagen
            gegeben, wie eine Agentur ein Angebot rechnet. Die Menge ist gezählt, die Tage
            sind Urteil.
          </>
        }
      >
        <Zeile
          was="Personentage, klassisch entwickelt"
          wert={z(w.tageKlassisch)}
          dazu="ohne KI-Unterstützung — die Vergleichsgrundlage"
        />
        <Zeile
          was="Personentage mit KI-Unterstützung"
          wert={z(w.personentage)}
          dazu={`−${abschlag} % · ${dez(w.personenjahre)} Personenjahre — damit wird gerechnet`}
        />
        <Zeile
          was="In Geld, zu Agentursätzen"
          wert={eur(w.eur)}
          dazu={`Spanne ${eur(w.vonEur)} bis ${eur(w.bisEur)} · Mischsatz ${eur(w.mischsatzEurProStunde)}/h`}
        />

        <div style={{ marginTop: space.lg }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: v("--font-size-small"),
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", color: v("--color-text-muted") }}>
                <th style={{ padding: `${space.xs}px 0`, fontWeight: 400 }}>Rolle</th>
                <th style={{ padding: `${space.xs}px 0`, fontWeight: 400, textAlign: "right" }}>Stunden</th>
                <th style={{ padding: `${space.xs}px 0`, fontWeight: 400, textAlign: "right" }}>Anteil</th>
                <th style={{ padding: `${space.xs}px 0`, fontWeight: 400, textAlign: "right" }}>Satz</th>
                <th style={{ padding: `${space.xs}px 0`, fontWeight: 400, textAlign: "right" }}>Summe</th>
              </tr>
            </thead>
            <tbody>
              {ROLLENSAETZE.map((r) => {
                const std = w.stundenJeRolle[r.rolle];
                if (!std) return null;
                const anteil = Math.round((std / (w.personentage * STUNDEN_JE_TAG)) * 100);
                return (
                  <tr key={r.rolle} style={{ borderTop: `1px solid ${v("--color-border")}` }}>
                    <td style={{ padding: `${space.xs}px 0` }}>{r.name}</td>
                    <td style={{ padding: `${space.xs}px 0`, textAlign: "right", fontFamily: v("--font-mono") }}>{z(std)}</td>
                    <td style={{ padding: `${space.xs}px 0`, textAlign: "right", color: v("--color-text-muted") }}>{anteil} %</td>
                    <td style={{ padding: `${space.xs}px 0`, textAlign: "right", color: v("--color-text-muted") }}>{eur(r.eurProStunde)}</td>
                    <td style={{ padding: `${space.xs}px 0`, textAlign: "right", fontFamily: v("--font-mono") }}>{eur(std * r.eurProStunde)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: v("--font-size-small"), color: v("--color-text-muted"), marginTop: space.sm }}>
            Anker ist die einzige belastbare Erhebung: {ERHEBUNG.quelle}, Median
            Software- und Webentwicklung {ERHEBUNG.softwareEntwicklungEurProStunde} € bei
            n={ERHEBUNG.stichprobeSoftware}. Sie schlüsselt <strong>nicht</strong> nach
            Seniorität auf — Aufschlag und Spreizung sind ausgewiesenes Urteil.
          </p>
        </div>
      </Block>

      <Block
        titel="Verhältnisse"
        hilfe={
          <>
            Jedes Verhältnis vergleicht eine Schätzung mit einer Messung oder einen
            Listenpreis mit einer Abbuchung. Sie sind auf ganze Zahlen gerundet: eine
            Stelle hinter dem Komma würde eine Genauigkeit behaupten, die keine der
            beteiligten Zahlen hat.
          </>
        }
      >
        {b.hebelGeld !== null && (
          <Zeile
            was="Herstellwert je investiertem Euro"
            wert={`${b.hebelGeld}×`}
            dazu="gegen Rechnungen UND eigene Zeit — die Hauptleistung zählt mit"
          />
        )}
        {b.hebelNurGeld !== null && (
          <Zeile
            was="… ohne die eigene Zeit"
            wert={`${b.hebelNurGeld}×`}
            dazu="nur gegen die Rechnungsbeträge — rechnet die Hauptleistung heraus"
          />
        )}
        {b.hebelRechenleistung !== null && (
          <Zeile
            was="Listenwert je bezahltem Euro"
            wert={`${b.hebelRechenleistung}×`}
            dazu={`nur über die ${b.hebelRechenleistungMonate} Monate, für die beide Zahlen vorliegen`}
          />
        )}
        {b.hebelZeit !== null && (
          <Zeile
            was="Geschätzte Personentage je gearbeitetem Tag"
            wert={`${b.hebelZeit}×`}
            dazu={`bei ${STUNDEN_JE_TAG} Stunden je Personentag`}
          />
        )}
      </Block>

      <Block
        titel="Der KI-Abschlag und seine Beleglage"
        hilfe={
          <>
            Stand der Annahme: {datum(KI_ANNAHME_STAND)}. Der Abschlag steht{" "}
            <strong>je Gewerk</strong>, nicht pauschal — ein einheitlicher Faktor
            behauptete, eine Rechtsrecherche im Volltext profitiere so stark wie eine
            Reihe gleichförmiger Schnittstellen.
          </>
        }
      >
        <p style={{ fontSize: v("--font-size-small"), marginTop: 0, marginBottom: space.md }}>
          Die Beleglage ist widersprüchlich, und zwar fundamental. Alle vier Messungen
          stehen hier, auch die, die gegen die Annahme spricht.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: v("--font-size-small") }}>
          <thead>
            <tr style={{ textAlign: "left", color: v("--color-text-muted") }}>
              <th style={{ padding: `${space.xs}px 0`, fontWeight: 400 }}>Messung</th>
              <th style={{ padding: `${space.xs}px 0`, fontWeight: 400, textAlign: "right" }}>Wirkung</th>
            </tr>
          </thead>
          <tbody>
            {MESSUNGEN.map((m) => (
              <tr key={m.quelle} style={{ borderTop: `1px solid ${v("--color-border")}` }}>
                <td style={{ padding: `${space.xs}px 0` }}>
                  <div>
                    <strong>{m.urheber}</strong> ({m.jahr}): {m.titel}
                  </div>
                  <div style={{ color: v("--color-text-muted") }}>
                    {m.fundstelle} — {m.aufbau}
                  </div>
                </td>
                <td
                  style={{
                    padding: `${space.xs}px 0`,
                    textAlign: "right",
                    fontFamily: v("--font-mono"),
                    whiteSpace: "nowrap",
                    color: m.zeitaenderung > 0 ? v("--color-negative-text") : v("--color-positive-text"),
                  }}
                >
                  {m.zeitaenderung > 0 ? "+" : ""}
                  {Math.round(m.zeitaenderung * 100)} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p
          style={{
            fontSize: v("--font-size-small"),
            marginTop: space.md,
            padding: pad("md", "lg"),
            background: v("--color-bg-muted"),
            borderRadius: v("--radius-md"),
          }}
        >
          <strong>Richtung des Fehlers:</strong> {FEHLERRICHTUNG}.
        </p>
      </Block>
    </div>
  );
}
