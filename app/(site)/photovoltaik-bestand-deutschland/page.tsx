import type { Metadata } from "next";
import Breadcrumb from "../../../components/Breadcrumb";
import Faq from "../../../components/Faq";
import RelatedLinks from "../../../components/RelatedLinks";
import StandNote from "../../../components/StandNote";
import { DataSourceNote } from "../../../components/PoweredBy";
import { DATA_SOURCES } from "../../../lib/data-sources";
import { anlagenbestandFaq } from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import { anlagenbestand } from "../../../lib/anlagenbestand-server";
import { socialKennzahlen } from "../../../lib/social-kennzahlen";
import { baueAllePosts, type SocialPost } from "../../../lib/social-posts";
import {
  laenderNachLeistung, segmentZeile, zeitraumSeitStichtag, zuwachs,
} from "../../../lib/anlagenbestand";
import {
  anteilProzentFeinTeile, fmtAnlagenZahl, fmtPvLeistung, fmtWattProKopf, formatDataAsOf,
} from "../../../lib/atlas-format";
import AnlagenbestandWidget from "../../../components/charts/AnlagenbestandWidget";

// Die Bestandsseite: was im deutschen Anlagenregister wirklich steht.
//
// WARUM ES DIESE SEITE GIBT: „Wie viele Balkonkraftwerke gibt es in
// Deutschland" wird jeden Monat gesucht, und die Antworten im Netz sind
// Jahresstatistiken. Wir werten den Registerauszug monatlich aus — Frische ist
// hier der ganze Vorteil, und deshalb steht der Datenstand an jeder Zahl.
//
// KEINE ZAHL AUF DIESER SEITE IST GETIPPT. Alles kommt aus einer Auswertung des
// Registers; die Formatierung läuft über lib/atlas-format, nicht über an Zahlen
// geklebte Einheiten.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  path: "/photovoltaik-bestand-deutschland",
  title: "Wie viele Solaranlagen gibt es in Deutschland? Aktuelle Zahlen",
  description:
    "Wie viele Photovoltaikanlagen und Balkonkraftwerke in Deutschland gemeldet sind, welche Leistung installiert ist und wie sich beides auf Dächer, Gewerbe und Freiflächen verteilt — monatlich aus dem Marktstammdatenregister.",
  ogImageTitle: "Solaranlagen in Deutschland",
  ogImageSubtitle: "Anzahl, Leistung und Verteilung — aus dem Anlagenregister",
});

const S: Record<string, React.CSSProperties> = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "0 16px 20px",
  },
  wrap: { maxWidth: v("--chart-max-width"), margin: "0 auto", paddingTop: "var(--content-lede-top)" },
  textCol: { maxWidth: v("--content-max-width"), margin: "0 auto" },
  h1: {
    fontSize: v("--font-size-h1"),
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.25,
    marginBottom: 10,
  },
  subtitle: { fontSize: v("--font-size-lead"), color: v("--color-text-muted"), marginBottom: 24, lineHeight: 1.6 },
  h2: { fontSize: v("--font-size-h2"), fontWeight: 700, marginTop: 36, marginBottom: 10 },
  p: { fontSize: v("--font-size-body"), color: v("--color-text-muted"), lineHeight: 1.7, marginBottom: 12 },
  strong: { fontWeight: 700, color: v("--color-text-primary") },
  hero: {
    background: v("--color-bg-accent"),
    borderRadius: v("--radius-lg"),
    padding: "16px 18px",
    marginBottom: 20,
    fontSize: v("--font-size-body"),
    lineHeight: 1.7,
    color: v("--color-text-primary"),
  },
  label: {
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 6,
    display: "block",
  },
  chartBlock: { margin: "20px 0 8px" },
  tabelleWrap: { overflowX: "auto", marginBottom: 8 },
  tabelle: { width: "100%", borderCollapse: "collapse", minWidth: 480 },
  thLeft: {
    textAlign: "left",
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap",
  },
  th: {
    textAlign: "right",
    fontSize: v("--font-size-caption"),
    fontWeight: 700,
    color: v("--color-text-secondary"),
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap",
  },
  td: {
    fontSize: v("--font-size-small"),
    color: v("--color-text-muted"),
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    lineHeight: 1.4,
  },
  tdNum: {
    fontFamily: v("--font-mono"),
    fontSize: v("--font-size-small"),
    color: v("--color-text-primary"),
    textAlign: "right",
    padding: "8px 6px",
    borderBottom: `1px solid ${v("--color-border")}`,
    whiteSpace: "nowrap",
  },
  small: { fontSize: v("--font-size-small"), color: v("--color-text-muted"), lineHeight: 1.6 },
};

const zahl = (n: number) => Math.round(n).toLocaleString("de-DE");

export default async function BestandDeutschlandPage() {
  const bestand = await anlagenbestand().catch(() => null);
  // Die Datengeschichten hängen an einer zweiten Auswertung (Einwohnerbezug je
  // Gemeinde). Fällt sie aus, fehlen zwei Absätze — die Bestandszahlen stehen
  // trotzdem. Zwei Lesepfade, zwei Ausfälle, kein gemeinsamer Absturz.
  const posts = await socialKennzahlen()
    .then((k) => baueAllePosts(k))
    .catch(() => [] as SocialPost[]);

  if (!bestand) {
    return (
      <div style={S.page}>
        <div style={{ ...S.wrap, ...S.textCol }}>
          <h1 style={S.h1}>Wie viele Solaranlagen gibt es in Deutschland?</h1>
          <p style={S.p}>
            Die Zahlen aus dem Anlagenregister sind gerade nicht abrufbar. Bitte später
            noch einmal versuchen.
          </p>
        </div>
      </div>
    );
  }

  const stand = formatDataAsOf(bestand.standIso.slice(0, 10));
  const zeitraum = zeitraumSeitStichtag(bestand.standIso, bestand.stichtagJahr);
  const balkon = segmentZeile(bestand, "steckersolar");
  const privat = segmentZeile(bestand, "privat_dach");
  const gewerbe = segmentZeile(bestand, "gewerbe_dach");
  const frei = segmentZeile(bestand, "freiflaeche");
  const balkonPlus = balkon ? zuwachs(balkon.anzahl, balkon.anzahlStichtag) : null;
  const gesamtPlusKwp = bestand.gesamt.kwp - bestand.gesamt.kwpStichtag;
  const laender = laenderNachLeistung(bestand);
  const postWachstum = posts.find((p) => p.id === "wachstum-balkon-solar");
  const postStadtLand = posts.find((p) => p.id === "stadt-land-balkon");

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.textCol}>
          <Breadcrumb
            items={[
              { label: "Start", href: "/" },
              { label: "Solar-Atlas", href: "/solar-atlas" },
              { label: "Solaranlagen in Deutschland" },
            ]}
            jsonLd
          />

          <h1 style={S.h1}>Wie viele Solaranlagen gibt es in Deutschland?</h1>
          <p style={S.subtitle}>
            Die Antwort steht im Marktstammdatenregister der Bundesnetzagentur — dem
            amtlichen Verzeichnis, in das jede Anlage eingetragen werden muss. Wir werten
            es monatlich aus. Alle Zahlen hier haben den Stand {stand}.
          </p>

          <div style={S.hero}>
            <span style={S.label}>Die Kurzantwort</span>
            In Deutschland sind <strong style={S.strong}>{zahl(bestand.gesamt.anzahl)} Solaranlagen</strong>{" "}
            gemeldet, zusammen{" "}
            <strong style={S.strong}>{fmtPvLeistung(bestand.gesamt.kwp)}</strong> installierte
            Leistung. {balkon ? <>Davon sind <strong style={S.strong}>{zahl(balkon.anzahl)}</strong> Balkonkraftwerke.{" "}</> : null}
            {zeitraum.charAt(0).toUpperCase() + zeitraum.slice(1)} sind{" "}
            {fmtPvLeistung(gesamtPlusKwp)} dazugekommen.
          </div>
        </div>

        {/* Das Widget trägt die Kernaussage: Stückzahl und Leistung laufen
            gegenläufig. Auf der eigenen Seite direkt gerendert statt im iframe —
            ein Rahmen, ein Ladevorgang, dieselbe Komponente wie im Embed. */}
        <div style={S.chartBlock}>
          <AnlagenbestandWidget bestand={bestand} variant="page" />
        </div>

        <div style={S.textCol}>
          <p style={S.small}>
            <DataSourceNote source={DATA_SOURCES.mastr} />
          </p>

          <h2 style={S.h2} id="balkonkraftwerke">
            Wie viele Balkonkraftwerke gibt es in Deutschland?
          </h2>
          {balkon ? (
            <>
              <p style={S.p}>
                <strong style={S.strong}>{zahl(balkon.anzahl)}</strong> Steckersolargeräte sind
                angemeldet (Stand {stand}).
                {balkonPlus ? (
                  <>
                    {" "}
                    {zahl(balkonPlus.absolut)} davon kamen {zeitraum} dazu, ein Plus von{" "}
                    {anteilProzentFeinTeile(balkonPlus.anteil).value} Prozent gegenüber dem Bestand am
                    31. Dezember {bestand.stichtagJahr}.
                  </>
                ) : null}{" "}
                Zusammen bringen sie {fmtPvLeistung(balkon.kwp)} — das sind{" "}
                {anteilProzentFeinTeile(balkon.kwp / bestand.gesamt.kwp).value} Prozent der deutschen
                Solarleistung, obwohl sie{" "}
                {anteilProzentFeinTeile(balkon.anzahl / bestand.gesamt.anzahl).value} Prozent aller Anlagen
                stellen.
              </p>
              <p style={S.p}>
                Die Zahl ist eine Untergrenze, keine Schätzung nach oben: Ein Gerät, das
                niemand anmeldet, steht nicht im Register — obwohl die Anmeldung
                vorgeschrieben ist. Wie viele Geräte ohne Eintrag hängen, weiß niemand.
              </p>
            </>
          ) : (
            <p style={S.p}>Die Zahl der angemeldeten Steckersolargeräte ist gerade nicht abrufbar.</p>
          )}

          <h2 style={S.h2}>Wie viel Leistung ist installiert?</h2>
          <p style={S.p}>
            <strong style={S.strong}>{fmtPvLeistung(bestand.gesamt.kwp)}</strong>. Gemeint ist
            die Nennleistung der Module unter Standard-Testbedingungen — deshalb die Einheit
            Gigawatt-Peak und nicht Gigawatt. Was davon zu einem bestimmten Zeitpunkt
            wirklich fließt, hängt am Wetter und liegt fast immer deutlich darunter.
          </p>
          <p style={S.p}>
            Die Verteilung ist der interessante Teil.{" "}
            {privat && gewerbe && frei ? (
              <>
                Private Dächer stellen mit {fmtAnlagenZahl(privat.anzahl)} die große Mehrheit
                aller Anlagen, tragen aber nur{" "}
                {anteilProzentFeinTeile(privat.kwp / bestand.gesamt.kwp).value} Prozent der Leistung.
                Freiflächenanlagen sind mit {zahl(frei.anzahl)} Stück die kleinste Gruppe
                überhaupt und liefern trotzdem{" "}
                {anteilProzentFeinTeile(frei.kwp / bestand.gesamt.kwp).value} Prozent — eine einzelne
                davon ist im Schnitt so groß wie{" "}
                {zahl(frei.kwp / frei.anzahl / (privat.kwp / privat.anzahl))} private Dächer.
                Gewerbliche Dächer liegen mit {fmtAnlagenZahl(gewerbe.anzahl)} und{" "}
                {anteilProzentFeinTeile(gewerbe.kwp / bestand.gesamt.kwp).value} Prozent der Leistung
                dazwischen.
              </>
            ) : null}
          </p>

          {postWachstum ? (
            <>
              <h2 style={S.h2}>{postWachstum.onsite.ueberschrift}</h2>
              {postWachstum.onsite.absaetze.map((a) => (
                <p key={a} style={S.p}>{a}</p>
              ))}
            </>
          ) : null}

          <h2 style={S.h2}>Wo die Anlagen stehen</h2>
          <p style={S.p}>
            Nach installierter Leistung führt {laender[0].name} mit{" "}
            {fmtPvLeistung(laender[0].kwp)}. Das sagt allerdings vor allem etwas über die
            Größe des Bundeslands. Die dritte Spalte rechnet die Leistung auf die Einwohner
            um — dort sieht die Reihenfolge anders aus.
          </p>
          <div style={S.tabelleWrap}>
            <table style={S.tabelle}>
              <thead>
                <tr>
                  <th style={S.thLeft}>Bundesland</th>
                  <th style={S.th}>Anlagen</th>
                  <th style={S.th}>Leistung</th>
                  <th style={S.th}>je Einwohner</th>
                  <th style={S.th}>Balkonkraftwerke</th>
                </tr>
              </thead>
              <tbody>
                {laender.map((l) => (
                  <tr key={l.ags}>
                    <td style={S.td}>{l.name}</td>
                    <td style={S.tdNum}>{zahl(l.anlagen)}</td>
                    <td style={S.tdNum}>{fmtPvLeistung(l.kwp)}</td>
                    <td style={S.tdNum}>{fmtWattProKopf((l.kwp * 1000) / l.einwohner)}</td>
                    <td style={S.tdNum}>{zahl(l.balkon)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={S.small}>
            Einwohnerzahlen aus dem amtlichen Gemeindeverzeichnis, Anlagen aus dem
            Registerauszug vom {stand}. Die Spalte „je Einwohner" ist die installierte
            Leistung geteilt durch die Einwohner des Landes, nicht durch die Zahl der
            Haushalte.
          </p>

          {postStadtLand ? (
            <>
              <h2 style={S.h2}>{postStadtLand.onsite.ueberschrift}</h2>
              {postStadtLand.onsite.absaetze.map((a) => (
                <p key={a} style={S.p}>{a}</p>
              ))}
            </>
          ) : null}

          <h2 style={S.h2}>Was diese Zahlen nicht sagen</h2>
          <p style={S.p}>
            Das Register zählt gemeldete Anlagen. Stillgelegte fallen heraus, nicht
            angemeldete tauchen nie auf, und je Anlage steht dort nur das Jahr der
            Inbetriebnahme — kein Tag. Ein Vergleich „gegenüber genau vor einem Jahr" ist
            daraus nicht ableitbar; vergleichbar ist der Bestand zum Jahresende, und genau
            das steht überall auf dieser Seite.
          </p>
          <p style={S.p}>
            Die Leistung sagt außerdem nichts darüber, wie viel Strom eine Anlage wirklich
            liefert. Dieselben Module bringen an der Ostsee weniger als am Bodensee, und
            ein Norddach weniger als ein Süddach.
          </p>

          <Faq
            items={anlagenbestandFaq(bestand)}
            title="Häufige Fragen zum deutschen Anlagenbestand"
            currentPath="/photovoltaik-bestand-deutschland"
          />

          <StandNote pfad="/photovoltaik-bestand-deutschland" />

          <RelatedLinks
            currentPath="/photovoltaik-bestand-deutschland"
            links={[
              { href: "/solar-atlas", label: "Solar-Atlas", desc: "Dieselben Registerdaten für deinen Ort: Anlagen, Leistung und Speicher je Gemeinde und Landkreis." },
              { href: "/photovoltaik-zubau-deutschland", label: "PV-Zubau seit 2000", desc: "Wie Einspeisevergütung und Strompreis die Ausbaukurve geformt haben — mit interaktivem Chart." },
              { href: "/balkonkraftwerk", label: "Balkonkraftwerk", desc: "Was ein Steckersolargerät bringt, was es kostet und was bei der Anmeldung zu tun ist." },
              { href: "/photovoltaik-rechner", label: "Photovoltaik-Rechner", desc: "Amortisation und Rendite für das eigene Dach — alle Annahmen sichtbar und anpassbar." },
              { href: "/energie-widgets", label: "Energie-Widgets", desc: "Diese Auswertung als einbettbares Widget für die eigene Website." },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
