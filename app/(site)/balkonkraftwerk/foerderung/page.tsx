import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "../../../../components/Breadcrumb";
import RelatedLinks from "../../../../components/RelatedLinks";
import { FundingStatusBadge, FUNDING_STATUS_NOTE } from "../../../../components/FundingProgramParts";
import { IconArrowRight, IconExternal } from "../../../../components/Icons";
import { getFundingPrograms } from "../../../../lib/funding-data";
import {
  fundingAmount,
  fundingStandLabel,
  fundingZaehlt,
  programmeFuerTechnik,
  type FundingProgram,
} from "../../../../lib/funding-programs";
import { DEFAULT_BALKON_CONFIG as CFG } from "../../../../lib/balkon-config";
import { gemeindeGeo } from "../../../../lib/atlas-geo";
import { pageMetadata } from "../../../../lib/seo";
import { v, space, pad, sectionGap, iconSizes } from "../../../../lib/theme";

// Wie auf den Förderseiten: Die Programme kommen zur Laufzeit aus der Datenbank,
// ein ausgelaufenes verschwindet damit von selbst und nicht erst beim nächsten
// Deploy.
export const revalidate = 3600;

const JAHR = new Date().getFullYear();

export const metadata: Metadata = pageMetadata({
  path: "/balkonkraftwerk/foerderung",
  title: `Balkonkraftwerk-Förderung ${JAHR}: Welche Kommunen zahlen einen Zuschuss?`,
  description:
    "Kommunale Zuschüsse für Balkonkraftwerke, nach Bundesland sortiert: wer fördert, wie viel es für ein übliches Set gibt und wann zuletzt geprüft wurde. Vom Bund gibt es keine Förderung.",
  ogImageTitle: "Balkonkraftwerk-Förderung",
  ogImageSubtitle: "Welche Kommunen einen Zuschuss zahlen",
});

/** Das übliche Set als Bezugsgröße — dieselbe Konfiguration, die der Rechner als
 *  Standard führt. Ein eigener Referenzfall wäre eine zweite Quelle und würde
 *  gegen den Rechner driften, sobald sich die Marktpreise ändern. */
const REFERENZ = CFG.sets.find((s) => s.id === "duo") ?? CFG.sets[0];

const S = {
  page: { background: v("--color-bg"), fontFamily: v("--font-text"), fontSize: "var(--font-size-body)", color: v("--color-text-primary"), minHeight: "100vh", padding: "0 20px 20px" } as React.CSSProperties,
  wrap: { maxWidth: 720, margin: "0 auto" } as React.CSSProperties,
  h1: { fontSize: "var(--font-size-h1)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 8px" } as React.CSSProperties,
  intro: { fontSize: "var(--font-size-body)", lineHeight: 1.6, color: v("--color-text-secondary"), margin: "0 0 16px" } as React.CSSProperties,
  strong: { color: v("--color-text-primary"), fontWeight: 600 } as React.CSSProperties,
  h2: { fontSize: "var(--font-size-h3)", fontWeight: 700, margin: `${space.xl}px 0 ${space.xs}px` } as React.CSSProperties,
  sub: { fontSize: "var(--font-size-small)", color: v("--color-text-muted"), margin: `0 0 ${space.md}px` } as React.CSSProperties,
  section: { marginBottom: sectionGap } as React.CSSProperties,
  karte: { background: v("--color-bg-muted"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: pad("md", "lg"), marginBottom: space.sm } as React.CSSProperties,
  kopf: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space.sm } as React.CSSProperties,
  traeger: { fontWeight: 700, fontSize: "var(--font-size-body)" } as React.CSSProperties,
  zeile: { fontSize: "var(--font-size-small)", color: v("--color-text-secondary"), lineHeight: 1.6, marginTop: 2 } as React.CSSProperties,
  betrag: { fontFamily: v("--font-mono"), fontWeight: 700, color: v("--color-positive") } as React.CSSProperties,
  ortLink: { display: "inline-block", marginTop: space.xs, fontSize: "var(--font-size-small)", fontWeight: 600, color: v("--color-accent"), textDecoration: "none" } as React.CSSProperties,
  cta: { display: "inline-block", marginTop: space.md, padding: pad("sm", "lg"), borderRadius: v("--radius-md"), fontSize: "var(--font-size-body)", fontWeight: 700, background: v("--color-accent"), color: v("--color-text-on-accent"), textDecoration: "none" } as React.CSSProperties,
  hinweis: { background: v("--color-bg-muted"), border: `1px solid ${v("--color-border")}`, borderRadius: v("--radius-md"), padding: pad("md", "lg"), fontSize: "var(--font-size-small)", lineHeight: 1.6, color: v("--color-text-secondary") } as React.CSSProperties,
};

/**
 * Was dieses Programm für ein übliches Set zahlt — oder warum sich das nicht als
 * eine Zahl sagen lässt.
 *
 * Gerechnet wird mit `fundingAmount`, also derselben Funktion, die auch der
 * Balkon-Rechner benutzt. Vier verschiedene Satzformen kommen im Katalog vor
 * (Pauschale, je Watt, Anteil an den Kosten, Staffel); sie hier ein zweites Mal
 * auszuwerten wäre die Sorte Kopie, an der im Projekt schon Einheiten und
 * Rechtssätze auseinandergelaufen sind.
 */
function betragText(p: FundingProgram): { zahl: string | null; text: string } {
  const a = fundingAmount(p, { technik: "balkon", wattPeak: REFERENZ.moduleWp, kosten: REFERENZ.price });
  if (!a.computable) {
    // Kein strukturierter Satz: Das Programm fördert Steckersolar, aber die Höhe
    // hängt an etwas, das dieses Modell nicht kennt (Einkommensgrenze, Bausteine).
    // Lieber keine Zahl als eine falsche.
    return { zahl: null, text: "Betrag richtet sich nach dem Einzelfall — Konditionen beim Träger" };
  }
  return {
    zahl: `${a.total.toLocaleString("de-DE")} €`,
    text: `für ein übliches Set (${REFERENZ.moduleWp} Wp, rund ${REFERENZ.price} €)`,
  };
}

export default async function BalkonFoerderungPage() {
  const programme = programmeFuerTechnik(await getFundingPrograms(), "balkon");

  // Nach Bundesland gruppieren; innerhalb zuerst, was gerade Anträge annimmt.
  const proLand = new Map<string, FundingProgram[]>();
  for (const p of programme) {
    const land = p.bundesland ?? "Bundesweit";
    if (!proLand.has(land)) proLand.set(land, []);
    proLand.get(land)!.push(p);
  }
  for (const liste of proLand.values()) {
    liste.sort(
      (a, b) => Number(fundingZaehlt(b)) - Number(fundingZaehlt(a)) || a.traeger.localeCompare(b.traeger, "de"),
    );
  }
  const laender = [...proLand.entries()].sort(
    (a, b) =>
      b[1].filter((p) => fundingZaehlt(p)).length - a[1].filter((p) => fundingZaehlt(p)).length ||
      a[0].localeCompare(b[0], "de"),
  );

  const aktiv = programme.filter((p) => fundingZaehlt(p)).length;

  // Eine repräsentative Postleitzahl je Programm — damit der Rechner von hier
  // aus schon auf den Ort eingestellt startet, statt den Besucher die
  // Postleitzahl noch einmal eintippen zu lassen, die er gerade angeklickt hat.
  //
  // Dieselbe Auflösung, aus der auch die Standort-Erträge im Verzeichnis
  // kommen: Sie dreht die vorhandene PLZ→Gemeinde-Tabelle einmal um und hält
  // sie im Modul. Die 62 Abfragen kosten deshalb einen Tabellenaufbau, nicht 62.
  // Fünfstellige Schlüssel gehören kreisfreien Städten und werden auf acht
  // Stellen aufgefüllt — dieselbe Normalisierung wie im Releaseplan. Ohne sie
  // fehlte ausgerechnet Zweibrücken und Potsdam der Knopf, also zwei Städte mit
  // aktivem Programm.
  //
  // Nur für kommunale Programme: Ein Landes- oder Kreisprogramm hat keinen
  // einen Ort, auf den sich ein Rechner einstellen ließe — dort auf gut Glück
  // eine Postleitzahl zu setzen hieße, einen Standort zu erfinden.
  const plzFuer = new Map<string, string>();
  for (const p of programme) {
    if (p.level !== "kommune" || !p.agsCode) continue;
    const schluessel = p.agsCode.length === 5 ? `${p.agsCode}000` : p.agsCode;
    if (schluessel.length !== 8) continue;
    const geo = await gemeindeGeo(schluessel);
    if (geo?.plz) plzFuer.set(p.id, geo.plz);
  }

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Breadcrumb
          items={[
            { label: "Start", href: "/" },
            { label: "Balkonkraftwerk", href: "/balkonkraftwerk" },
            { label: "Förderung" },
          ]}
          jsonLd
        />
        <h1 style={S.h1}>Balkonkraftwerk-Förderung: Welche Kommunen zahlen einen Zuschuss?</h1>

        {/* Die Zahlen stehen NICHT im Text, sondern kommen aus der Datenbank —
            eine getippte Zahl auf einer Seite über Förderprogramme veraltet an
            dem Tag, an dem das erste Programm ausläuft. */}
        <p style={S.intro}>
          Vom Bund gibt es für Balkonkraftwerke <span style={S.strong}>keine Förderung</span> — dafür
          von immer mehr Städten und Gemeinden. Wir führen aktuell{" "}
          <span style={S.strong}>{programme.length} kommunale Programme</span> in {laender.length}{" "}
          Bundesländern, davon {aktiv} mit offenen Anträgen. Üblich sind Pauschalen zwischen 50 und
          200 € oder ein Anteil an den Kosten — bei einem Set für rund {REFERENZ.price} € ist das ein
          spürbarer Teil des Preises.
        </p>

        {/* Der Vorbehalt gehört nach oben, nicht ans Ende: Wer aus einem Land ohne
            Eintrag kommt, soll nicht erst die ganze Liste durchsuchen, um zu
            merken, dass wir dazu nichts haben. */}
        <div style={{ ...S.hinweis, marginBottom: space.xl }}>
          <span style={S.strong}>Was hier steht und was nicht:</span> Diese Liste führt{" "}
          <span style={S.strong}>kommunale</span> Programme — Städte, Gemeinden und Landkreise.
          Einige Bundesländer fördern Steckersolar zusätzlich über eigene Landesprogramme; die sind
          hier noch nicht vollständig erfasst. Ein Ort ohne Eintrag heißt also nicht sicher „keine
          Förderung", sondern zuerst: uns ist keine bekannt. Verbindlich ist immer die Auskunft des
          Trägers.
        </div>

        {laender.map(([land, liste]) => {
          const offen = liste.filter((p) => fundingZaehlt(p)).length;
          return (
            <div key={land} style={S.section}>
              <h2 style={S.h2}>{land}</h2>
              <p style={S.sub}>
                {liste.length === 1 ? "1 Programm" : `${liste.length} Programme`}
                {offen < liste.length && ` · ${offen} mit offenen Anträgen`}
              </p>
              {liste.map((p) => {
                const b = betragText(p);
                const zaehlt = fundingZaehlt(p);
                return (
                  <div key={p.id} style={S.karte}>
                    <div style={S.kopf}>
                      <div>
                        <div style={S.traeger}>{p.traeger}</div>
                        <div style={S.zeile}>
                          {p.name} — {fundingStandLabel(p)}
                        </div>
                        <div style={S.zeile}>
                          {zaehlt && b.zahl ? (
                            <>
                              <span style={S.betrag}>{b.zahl}</span> {b.text}
                            </>
                          ) : zaehlt ? (
                            b.text
                          ) : (
                            /* Der Baustein bringt sein „aktuell" selbst mit („aktuell ausgeschöpft
                                 (Fördertopf leer)") und ist auf „… ist {phrase}" gebaut. Ein
                                 eigenes „Aktuell" davor ergab „Aktuell aktuell ausgeschöpft". */
                            <>Programm ist {FUNDING_STATUS_NOTE[p.status]} — die Konditionen stehen hier zum Nachschlagen.</>
                          )}{" "}
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${p.name} — Programmseite des Trägers öffnen`}
                            style={{ display: "inline-flex", verticalAlign: "middle", color: v("--color-accent") }}
                          >
                            <IconExternal size={iconSizes.sm} />
                          </a>
                        </div>
                        {/* Nur wo es etwas zu holen gibt: Bei einem
                            ausgeschöpften Topf führte der Knopf in eine
                            Rechnung, die den Zuschuss ohnehin weglässt. */}
                        {zaehlt && plzFuer.get(p.id) && (
                          <Link
                            href={`/balkonkraftwerk/rechner?plz=${plzFuer.get(p.id)}`}
                            style={S.ortLink}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              Für {p.region} durchrechnen <IconArrowRight size={iconSizes.xs} />
                            </span>
                          </Link>
                        )}
                      </div>
                      <FundingStatusBadge status={p.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={S.section}>
          <h2 style={S.h2}>Ist dein Ort dabei?</h2>
          <p style={S.intro}>
            Der Rechner sucht die Förderung an deiner Postleitzahl selbst heraus und zieht sie von
            den Kosten ab — dann steht da, was das Set bei dir wirklich kostet und wann es sich
            bezahlt macht.
          </p>
          <Link href="/balkonkraftwerk/rechner" style={S.cta}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Balkonkraftwerk durchrechnen <IconArrowRight size={iconSizes.sm} />
            </span>
          </Link>
        </div>

        <RelatedLinks
          links={[
            {
              href: "/balkonkraftwerk",
              label: "Balkonkraftwerk: was es bringt und kostet",
              desc: "Ertrag, Preis und Amortisation eines Steckersolar-Geräts — die drei Kernfragen, live gerechnet.",
            },
            {
              href: "/balkonkraftwerk/ratgeber/anmelden",
              label: "Balkonkraftwerk anmelden",
              desc: "Was bei der Bundesnetzagentur und beim Netzbetreiber zu tun ist — und woran es in der Praxis hakt.",
            },
            {
              href: "/photovoltaik-foerderung",
              label: "Förderung für Dachanlagen",
              desc: "Kommunale Zuschüsse für die große Anlage aufs Dach, nach Bundesland und Stadt.",
            },
          ]}
        />
      </div>
    </div>
  );
}
