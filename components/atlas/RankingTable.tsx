"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { v } from "../../lib/theme";
import { IconArrowUp, IconArrowDown, IconChevronDown, IconArrowRight } from "../Icons";
import { useHomeGemeinde, lookupPlz, type GemeindeHit } from "../../lib/home-gemeinde";
import { SEGMENT_OWNER, type ChildYearRow, type RankingRegion } from "../../lib/atlas";
import {
  anteilProzentTeile,
  co2TonnenTeile,
  euroTeile,
  fmtAnteilProzent,
  fmtCo2FaktorKg,
  fmtCtProKwh,
  proJahr,
  pvLeistungTeile,
  speicherKwhTeile,
  wattProKopfTeile,
  type Messwert,
} from "../../lib/atlas-format";
import {
  ATLAS_GRID_CO2,
  co2Tonnen,
  eigenverbrauchAnteilRegion,
  einspeiseZeilen,
  erzeugungKwh,
  segmentWertEuro,
  stromwertBestandteile,
  type PrivatBestand,
} from "../../lib/atlas-impact";
import { FREIFLAECHE_ZUSCHLAG_AB } from "../../lib/freiflaeche-config";
import InfoTooltip from "../InfoTooltip";

type Owner = "alle" | "privat" | "gewerbe";
type Metric = "count" | "kwp" | "perCapita" | "co2" | "wert" | "eigenverbrauch" | "speicher";
/** Sort key: a numeric metric column (descending), the name column (A–Z), or
 *  population (descending). Name and population share the name-column dropdown. */
type Sort = Metric | "name" | "population";
/** What the first column shows — position, or movement. */
type RankMode = "platz" | "delta";

type Row = {
  region_id: string;
  name: string;
  href: string | null;
  population: number | null;
  count: number;
  kwp: number;
  speicher: number;
  perCapita: number | null;
  /** Rechnerische Jahres-Erzeugung (kWp × Bundesland-Ertrag), Basis fürs CO₂. */
  erzeugung: number;
  /** Rechnerisch vermiedenes CO₂ in t/Jahr. */
  co2: number;
  /** Wert des erzeugten Stroms in €/Jahr, je Anlagenart einzeln bewertet. */
  wertEuro: number;
  /** Anteil des Solarstroms privater Dächer, der im Haus bleibt (0…1) —
   *  gerechnet aus der mittleren Anlagengröße und dem Speicherbestand der
   *  Region. `null`, wenn sie keine private Dachanlage führt. */
  evAnteil: number | null;
};

const COLUMNS: { key: Metric; label: string; hint: string }[] = [
  {
    key: "count",
    label: "Anlagen",
    hint: "Solaranlagen in Betrieb. Ein Balkonkraftwerk zählt wie eine Dachanlage — die Zahl sagt, wie viele mitmachen, nicht wie viel Leistung steht.",
  },
  {
    key: "kwp",
    label: "Leistung",
    hint: "Installierte Spitzenleistung zusammen. Ein Einfamilienhaus liegt typisch bei 10 kWp, ein Freiflächen-Park bei mehreren Tausend.",
  },
  {
    key: "perCapita",
    label: "Pro Kopf",
    hint: "Installierte Leistung je Einwohner. Macht große und kleine Gemeinden vergleichbar — Gemeinden mit viel Freifläche liegen hier zwangsläufig vorn.",
  },
  {
    key: "co2",
    label: "CO₂ gespart",
    hint: `Vermiedenes CO₂ pro Jahr, rechnerisch: erzeugter Solarstrom mal ${fmtCo2FaktorKg(ATLAS_GRID_CO2)}. Bewusst konservativ — der amtliche UBA-Vermeidungsfaktor für Photovoltaik liegt höher.`,
  },
  {
    key: "wert",
    label: "Stromwert",
    // Der Text steht als eigene Komponente weiter unten — er zählt die Sätze
    // je Anlagenart auf und ist deshalb kein einzelner Satz.
    hint: "",
  },
  {
    key: "eigenverbrauch",
    label: "Eigenverbrauch",
    // Der Text steht als eigene Komponente weiter unten — er muss sagen, dass
    // die Zahl gerechnet und nicht gemessen ist, und woraus sie entsteht.
    hint: "",
  },
  {
    key: "speicher",
    // NICHT „Speicher": Gezählt werden nur Batterien. Die Schwesterkomponenten
    // (GemeindeHero, gemeinde-solar) schreiben deshalb „Batteriespeicher" und
    // begründen es mit „wie auf der Atlas-Seite" — die Kürzung aus Platzgründen
    // hatte diese Begründung stillschweigend falsch gemacht.
    label: "Batterien",
    hint: "Nutzbare Kapazität der Batteriespeicher, nicht ihre Leistung. Eine Hausbatterie hält typisch 5 bis 15 kWh. Pumpspeicher sind nicht enthalten.",
  },
];

const OWNERS: { key: Owner; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "privat", label: "Privat" },
  { key: "gewerbe", label: "Gewerbe" },
];

const nf = (n: number) => Math.round(n).toLocaleString("de-DE");

/** Write (or clear) ?plz on the current URL without a navigation, so the address
 *  bar stays a shareable deep-link to the marked Gemeinde. */
function setUrlPlz(plz: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (plz) url.searchParams.set("plz", plz);
  else url.searchParams.delete("plz");
  window.history.replaceState(null, "", url.toString());
}


/**
 * Zellinhalt als Zahl UND Einheit getrennt.
 *
 * Genau dafür gibt es die `…Teile()`-Funktionen in lib/atlas-format.ts: Die
 * Zahl trägt die Zelle, die Einheit steht kleiner darunter. Der fertige String
 * (`fmt…()`) taugt hier nicht — er verschmilzt beides und nimmt die
 * Größenstaffelung wieder weg.
 *
 * „Anlagen" hat bewusst keine Einheit: eine Anlage ist eine Anzahl, und
 * „Anlagen" steht schon im Spaltenkopf.
 */
function cellTeile(row: Row, m: Metric): Messwert {
  if (m === "kwp") return pvLeistungTeile(row.kwp);
  if (m === "speicher") return speicherKwhTeile(row.speicher);
  if (m === "perCapita") {
    return row.perCapita === null ? { value: "—", unit: "" } : wattProKopfTeile(row.perCapita);
  }
  // Die beiden Wirkungs-Spalten sind Jahreswerte und stehen neben vier
  // Bestandsgrößen — der Zeitbezug muss an der Zahl stehen, nicht im Tooltip.
  if (m === "co2") return proJahr(co2TonnenTeile(row.co2));
  if (m === "wert") return proJahr(euroTeile(row.wertEuro));
  // Der Eigenverbrauchsanteil ist KEIN Jahreswert, sondern eine Eigenschaft des
  // Bestands — hier gehört deshalb kein „/Jahr" an die Einheit.
  if (m === "eigenverbrauch") {
    return row.evAnteil === null ? { value: "—", unit: "" } : anteilProzentTeile(row.evAnteil);
  }
  return { value: nf(row[m] as number), unit: "" };
}

/** Small inhabitant count shown behind the name. Bundesländer carry millions —
 *  shorten those to "17,9 Mio."; Kreise and Gemeinden stay whole numbers. */
function fmtPop(pop: number, inMillions: boolean): string {
  if (inMillions) return `${(pop / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio.`;
  return nf(pop);
}

function valueOf(row: Row, m: Sort): number | null {
  if (m === "name") return null;
  if (m === "perCapita") return row.perCapita;
  if (m === "population") return row.population;
  if (m === "wert") return row.wertEuro;
  if (m === "eigenverbrauch") return row.evAnteil;
  return row[m] as number;
}

/** Rank movement, sized to sit inline with the rank number beside it. */
function RankDelta({ value, sinceYear, onAccent = false }: { value: number | null; sinceYear: number; onAccent?: boolean }) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  const Icon = up ? IconArrowUp : IconArrowDown;
  return (
    <span
      title={`${Math.abs(value)} ${Math.abs(value) === 1 ? "Platz" : "Plätze"} ${up ? "gutgemacht" : "verloren"} seit Ende ${sinceYear}`}
      // Auf der blau gefüllten Zeile weiß statt grün/rot — der Pfeil trägt die
      // Richtung, grün auf Blau würde untergehen.
      style={{ ...S.delta, color: onAccent ? v("--color-text-on-accent") : up ? v("--color-positive") : v("--color-negative") }}
    >
      <Icon size={9} />
      {Math.abs(value)}
    </span>
  );
}

/**
 * Sortable ranking of a region's children.
 *
 * Every filter runs on the raw segment × year cells the server shipped, so owner
 * and metric recombine without a round trip. The owner filter applies to every
 * column at once — a table where "Anlagen" counted everything while "Pro Kopf"
 * counted only private roofs would put two different worlds in one row.
 */
export default function RankingTable({
  regions,
  cells,
  basePath,
  lastFullYear,
  popInMillions = false,
}: {
  regions: RankingRegion[];
  cells: ChildYearRow[];
  basePath: string;
  lastFullYear: number;
  /** Bundesländer carry millions of inhabitants — show the Einwohner column in
   *  millions there (unit in the header, plain number in the cell). Kreise and
   *  Gemeinden stay whole numbers. */
  popInMillions?: boolean;
}) {
  const [owner, setOwner] = useState<Owner>("alle");
  const [sort, setSort] = useState<Sort>("perCapita");
  const [rankMode, setRankMode] = useState<RankMode>("platz");
  const { home, setHome, ready } = useHomeGemeinde();
  // A shared link can mark a Gemeinde via ?plz=. Resolved on the client (like the
  // saved-home marker already is) so the page itself stays ISR-cached — reading
  // searchParams on the server would force every atlas view to render fresh.
  const [pinnedChildId, setPinnedChildId] = useState<string | null>(null);
  // "andere Gemeinde" has to be able to drop a pin that came in through the URL,
  // not just the saved home — so the pin is dismissable in local state.
  const [pinDismissed, setPinDismissed] = useState(false);
  // The floating row lives outside the horizontal scroller (see below) and has to
  // be shifted by hand to stay under the columns it belongs to.
  const [scrollLeft, setScrollLeft] = useState(0);

  // Resolve ?plz= to the child region it belongs to. A postcode can span several
  // Gemeinden; the one that appears in this very list is the right match, so the
  // list membership is the scope — no separate Kreis filter needed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const plz = new URLSearchParams(window.location.search).get("plz") ?? "";
    if (!/^\d{5}$/.test(plz)) {
      setPinnedChildId(null);
      return;
    }
    const childLen = regions[0]?.region_id.length ?? 8;
    const ids = new Set(regions.map((r) => r.region_id));
    let cancelled = false;
    lookupPlz(plz)
      .then((hits) => {
        if (cancelled) return;
        const match = hits.map((h) => h.region_id.slice(0, childLen)).find((id) => ids.has(id));
        setPinnedChildId(match ?? null);
      })
      .catch(() => {
        if (!cancelled) setPinnedChildId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [regions]);

  /** Aggregate the cells into rows; yearMax rewinds the state to that year. */
  const build = useMemo(() => {
    const keep = (segment: string) =>
      owner === "alle" ? SEGMENT_OWNER[segment] !== null : SEGMENT_OWNER[segment] === owner;
    type Acc = { count: number; kwp: number; speicher: number; wertEuro: number; privat: PrivatBestand };
    const leer = (): Acc => ({
      count: 0,
      kwp: 0,
      speicher: 0,
      wertEuro: 0,
      privat: { dachCount: 0, dachKwp: 0, batterieCount: 0, batterieKwh: 0 },
    });
    return (yearMax: number | null): Row[] => {
      const acc = new Map<string, Acc>();

      // Erster Durchgang: der Bestand. Der Eigenverbrauchsanteil einer Region
      // hängt an ihren privaten Dächern UND Batterien insgesamt — er lässt sich
      // deshalb erst rechnen, wenn alle Zellen gezählt sind, und der Geldwert
      // erst danach.
      for (const c of cells) {
        if (yearMax !== null && c.year > yearMax) continue;
        const a = acc.get(c.region_id) ?? leer();
        acc.set(c.region_id, a);

        // Der private Bestand wird IMMER mitgezählt, auch unter „Gewerbe":
        // Wie viel ein privates Dach im Haus behält, hängt an den Häusern der
        // Region, nicht daran, welchen Filter der Betrachter gerade sieht. Ohne
        // diese Trennung bekäme dieselbe Gemeinde je nach Filter einen anderen
        // Eigenverbrauch — und der Filter würde eine Größe verändern, über die
        // er gar nichts aussagt.
        if (c.segment === "privat_dach") {
          a.privat.dachCount += c.count;
          a.privat.dachKwp += c.kwp;
        } else if (c.segment === "batterie_privat") {
          a.privat.batterieCount += c.count;
          a.privat.batterieKwh += c.kwh;
        }

        if (!keep(c.segment)) continue;
        if (c.segment.startsWith("batterie")) a.speicher += c.kwh;
        else {
          a.count += c.count;
          a.kwp += c.kwp;
        }
      }

      const evAnteile = new Map<string, number | null>();
      for (const [id, a] of acc) evAnteile.set(id, eigenverbrauchAnteilRegion(a.privat, id));

      // Zweiter Durchgang: das Geld. Es entsteht je Segment UND Jahrgang — nicht
      // später aus der Summe: Ein Freiflächen-Park erlöst gut ein Drittel
      // dessen, was ein privates Dach erspart, und die Vergütung eines Dachs von
      // 2010 ist rund das Vierfache der heutigen. Über beides zu mitteln wäre
      // keine Näherung, sondern eine andere Zahl. Der Jahrgang liegt ohnehin in
      // der Zelle, weil die Tabelle für den Rang-Rücklauf nach Jahren filtert.
      for (const c of cells) {
        if (!keep(c.segment)) continue;
        if (c.segment.startsWith("batterie")) continue;
        if (yearMax !== null && c.year > yearMax) continue;
        const a = acc.get(c.region_id);
        if (!a) continue;
        // Mitgereicht wird die mittlere Anlagengröße der Zelle: Die EEG-Staffel
        // ist ein ANTEILIGER Tarif (die ersten 10 kWp bringen den kleinen Satz,
        // jedes weitere Kilowatt den großen). Ohne sie bekäme ein
        // 35-kWp-Gewerbedach den Grenzsatz für alles und stünde rund 4 % zu
        // niedrig da. Zellen ohne Anzahl reichen null herein.
        const kwpMittel = c.count > 0 ? c.kwp / c.count : null;
        a.wertEuro += segmentWertEuro(
          c.kwp,
          c.region_id,
          c.segment,
          c.year,
          kwpMittel,
          evAnteile.get(c.region_id) ?? null,
        );
      }

      return regions.map((r) => {
        const a = acc.get(r.region_id) ?? leer();
        const erzeugung = erzeugungKwh(a.kwp, r.region_id);
        return {
          region_id: r.region_id,
          name: r.name,
          href: r.slug ? `${basePath}/${r.slug}` : null,
          population: r.population,
          count: a.count,
          kwp: a.kwp,
          speicher: a.speicher,
          perCapita: r.population ? Math.round((a.kwp * 1000) / r.population) : null,
          erzeugung,
          co2: co2Tonnen(erzeugung),
          wertEuro: a.wertEuro,
          evAnteil: evAnteile.get(r.region_id) ?? null,
        };
      });
    };
  }, [cells, regions, basePath, owner]);

  const rows = useMemo(() => build(null), [build]);

  // Spannweite der Eigenverbrauchs-Anteile in dieser Liste. Der Hilfetext der
  // Stromwert-Spalte nannte früher EINEN Anteil — seit er je Region aus deren
  // Anlagen und Batterien entsteht, wäre eine einzelne Zahl dort falsch.
  const evSpanne = useMemo(() => {
    const werte = rows.map((r) => r.evAnteil).filter((x): x is number => x !== null);
    if (werte.length === 0) return null;
    return {
      min: Math.min(...werte),
      max: Math.max(...werte),
      mittel: werte.reduce((s, x) => s + x, 0) / werte.length,
    };
  }, [rows]);

  // Current rank against the rank at the end of the last complete year. Naming
  // this "Veränderung zum Vorjahr" would be a lie: it spans that year-end to
  // today, which in July is seven months, not twelve. The header says what it is.
  const deltas = useMemo(() => {
    // Rank movement is only meaningful for the growth metrics. Alphabetical order
    // has no "rank", and population barely moves year to year — no delta there.
    if (sort === "name" || sort === "population") return new Map<string, number | null>();
    const rank = (list: Row[]) => {
      const m = new Map<string, number>();
      list
        .filter((r) => valueOf(r, sort) !== null)
        .sort((a, b) => (valueOf(b, sort) as number) - (valueOf(a, sort) as number))
        .forEach((r, i) => m.set(r.region_id, i + 1));
      return m;
    };
    const now = rank(rows);
    const before = rank(build(lastFullYear));
    const out = new Map<string, number | null>();
    for (const r of rows) {
      const a = before.get(r.region_id);
      const b = now.get(r.region_id);
      out.set(r.region_id, a != null && b != null ? a - b : null);
    }
    return out;
  }, [rows, build, sort, lastFullYear]);

  const sorted = useMemo(() => {
    if (sort === "name") return [...rows].sort((a, b) => a.name.localeCompare(b.name, "de"));
    const withVal = rows.filter((r) => valueOf(r, sort) !== null);
    const without = rows.filter((r) => valueOf(r, sort) === null);
    withVal.sort((a, b) => (valueOf(b, sort) as number) - (valueOf(a, sort) as number));
    return [...withVal, ...without];
  }, [rows, sort]);

  /** Position always comes from the metric sort, even when the list is ordered by movement. */
  const rankOf = useMemo(() => {
    const m = new Map<string, number>();
    sorted.forEach((r, i) => m.set(r.region_id, i + 1));
    return m;
  }, [sorted]);

  const display = useMemo(() => {
    if (rankMode !== "delta") return sorted;
    return [...sorted].sort((a, b) => (deltas.get(b.region_id) ?? -Infinity) - (deltas.get(a.region_id) ?? -Infinity));
  }, [sorted, rankMode, deltas]);

  // The children of this region carry keys at one fixed length (5 for Kreise under
  // a Bundesland, 8 for Gemeinden under a Kreis). A saved home is always an 8-digit
  // Gemeinde, so it has to be cut to the child length to match the right row — on a
  // Bundesland page it marks the Kreis the home sits in.
  const childLen = regions[0]?.region_id.length ?? 8;
  const effectivePin = pinDismissed ? null : pinnedChildId;
  const markedId = effectivePin ?? (home ? home.region_id.slice(0, childLen) : null);
  const markedRow = markedId ? display.find((r) => r.region_id === markedId) ?? null : null;

  // Keep the address bar in step with what is marked, so the link the viewer sees
  // is the link they can share. Never overwrite a ?plz that is already there: a
  // shared link owns the URL (and its pin may still be resolving), and once the
  // user enters their own postcode that write already happened. Only a bare URL
  // gets the saved home's postcode injected, once its row is on this page.
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).has("plz")) return;
    if (home?.plz && markedRow) setUrlPlz(home.plz);
  }, [ready, home, markedRow]);

  // Die schwebende Zeile rastet an der echten ein: sobald die markierte Zeile
  // selbst im Blick ist, blenden wir die schwebende aus (kein Doppel). Ist sie
  // aus dem Blick, merken wir uns die RICHTUNG — liegt sie oberhalb (schon
  // vorbeigescrollt), klebt die Kopie oben; liegt sie unterhalb (noch nicht
  // erreicht), klebt sie unten. So peekt sie immer an der Kante, hinter der die
  // echte Zeile wirklich steht.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [markedPos, setMarkedPos] = useState<"visible" | "above" | "below">("visible");
  useEffect(() => {
    if (!markedId) {
      setMarkedPos("visible");
      return;
    }
    const el = rootRef.current?.querySelector('[data-marked="true"]');
    if (!el) {
      setMarkedPos("visible");
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setMarkedPos("visible");
        } else {
          const rootTop = e.rootBounds?.top ?? 0;
          setMarkedPos(e.boundingClientRect.top < rootTop ? "above" : "below");
        }
      },
      { threshold: 0.9 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [markedId, sort, owner, rankMode, display]);

  // Höhe der oben klebenden Kopie, um sie per negativem Rand aus dem Fluss zu
  // nehmen — sonst schöbe sie beim Einblenden den ganzen Rest nach unten (die
  // Kopie sitzt VOR dem Scroller, ihr Slot liegt beim Einblenden schon über dem
  // sichtbaren Bereich, also fällt der Versatz nur ohne diesen Trick auf).
  const topPeekRef = useRef<HTMLDivElement | null>(null);
  const [topPeekH, setTopPeekH] = useState(56);
  useEffect(() => {
    if (markedPos === "above" && topPeekRef.current) {
      setTopPeekH(topPeekRef.current.offsetHeight);
    }
  }, [markedPos, sort, owner, rankMode, display]);

  const pick = (hit: GemeindeHit, plz: string) => {
    setHome({ ...hit, plz });
    // The viewer just chose their own Gemeinde — the link's pin is stale (its
    // prop can't change without a navigation), so keep it dismissed and let the
    // fresh home drive the marker.
    setPinDismissed(true);
    setUrlPlz(plz);
  };

  const reset = () => {
    setHome(null);
    setPinDismissed(true);
    setUrlPlz(null);
  };

  // One scale for the list and the floating row, capped at the runner-up: a single
  // Gemeinde with a solar park (126.865 W/head against 17.705 on second place)
  // would otherwise flatten every other bar to a hairline.
  const scale = useMemo(() => {
    const vals = display
      .map((r) => valueOf(r, sort))
      .filter((x): x is number => x !== null)
      .sort((a, b) => b - a);
    return Math.max(1, vals[1] ?? vals[0] ?? 1);
  }, [display, sort]);
  const barPct = (val: number | null) =>
    val === null ? 0 : Math.min(100, Math.max(1, Math.round((val / scale) * 100)));

  /**
   * Der Zahlenwert selbst. Alle Werte tragen dieselbe Textfarbe wie der
   * Ortsname — sie sind gleichrangige Messwerte, und ein abgedunkelter Wert
   * sähe aus, als sei er weniger belastbar. Die sortierte Spalte hebt sich
   * über das Gewicht ab (dazu der blaue Kopf und der Balken darunter), nicht
   * über die Farbe.
   */
  const cellNumStyle = (key: Metric): React.CSSProperties => ({
    ...S.valNum,
    fontWeight: sort === key ? 700 : 500,
  });

  // Zellen einer Zeile. `onAccent` = die Zeile ist blau gefüllt (aktive Kommune):
  // Text wird weiß, der Balken weiß auf hellem Schienen-Weiß. Ein Renderer für
  // Liste UND schwebende Kopie, damit beide identisch aussehen.
  const ON_ACCENT = v("--color-text-on-accent");
  const ON_ACCENT_DIM = "rgba(255,255,255,0.72)";
  const rowCells = (r: Row, onAccent: boolean) => (
    <>
      <span style={{ ...S.rank, ...(onAccent ? { color: ON_ACCENT_DIM } : null) }}>
        {valueOf(r, sort) === null ? "—" : `${rankOf.get(r.region_id)}.`}
        <RankDelta value={deltas.get(r.region_id) ?? null} sinceYear={lastFullYear} onAccent={onAccent} />
      </span>
      <span style={S.nameCell}>
        <span style={{ ...S.name, fontWeight: onAccent ? 700 : 500, ...(onAccent ? { color: ON_ACCENT } : null) }}>{r.name}</span>
        <span style={{ ...S.hint, ...(onAccent ? { color: ON_ACCENT_DIM } : null) }}>
          {r.population === null ? "unbewohnt" : fmtPop(r.population, popInMillions)}
        </span>
        {/* Platzhalter für die Balkenschiene der Wertzellen: gleicher Aufbau,
            gleiche Höhe — sonst zentriert die Zeile den kürzeren Namensblock
            und Name und Zahlenreihe stehen nicht auf einer Linie. */}
        <span aria-hidden style={{ ...S.track, visibility: "hidden" }} />
      </span>
      {COLUMNS.map((c) => {
        const teil = cellTeile(r, c.key);
        return (
          <span key={c.key} style={S.val}>
            <span style={{ ...cellNumStyle(c.key), ...(onAccent ? { color: ON_ACCENT } : null) }}>{teil.value}</span>
            {/* Die Einheit steht IMMER als eigene Zeile, auch wenn sie leer ist:
                sonst rutschen Zellen ohne Einheit („Anlagen") in der Zeile hoch
                und die Zahlenreihe verliert ihre gemeinsame Grundlinie. */}
            <span style={{ ...S.valUnit, ...(onAccent ? { color: ON_ACCENT_DIM } : null) }}>
              {teil.unit || " "}
            </span>
            {/* Die Balkenschiene läuft in JEDER Zelle mit, sichtbar nur in der
                sortierten. Nur dort zu rendern machte genau diese eine Zelle
                höher — und damit stand ihre Zahl als einzige der Zeile nicht
                mehr auf der gemeinsamen Linie. */}
            <span
              aria-hidden
              style={{
                ...S.track,
                ...(c.key === sort
                  ? onAccent
                    ? { background: "rgba(255,255,255,0.28)" }
                    : null
                  : { visibility: "hidden" }),
              }}
            >
              <span
                style={{
                  ...S.fill,
                  width: `${barPct(valueOf(r, sort))}%`,
                  background: onAccent ? ON_ACCENT : v("--color-accent-light"),
                }}
              />
            </span>
          </span>
        );
      })}
    </>
  );

  // Die schwebende Kopie der markierten Zeile — oben wie unten dieselbe. Folgt
  // dem Horizontal-Scroll der Liste (translateX), damit die Spalten fluchten.
  const floatingRow = markedRow ? (
    <div
      key={`${sort}-${owner}-${rankMode}`}
      style={{ ...S.table, ...S.rowsFade, transform: `translateX(${-scrollLeft}px)` }}
    >
      <Link href={markedRow.href ?? "#"} className="atlas-rank-row" style={{ ...S.row, ...S.stickyRow, ...S.rowLink }}>
        {rowCells(markedRow, true)}
        <span className="atlas-go" style={{ ...S.go, color: ON_ACCENT }} aria-hidden>
          <IconArrowRight size={13} />
        </span>
      </Link>
    </div>
  ) : null;

  return (
    <div ref={rootRef}>
      <div style={S.controls}>
        <div style={S.chips}>
          {OWNERS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setOwner(o.key)}
              style={{
                ...S.chip,
                background: owner === o.key ? v("--color-accent") : "transparent",
                color: owner === o.key ? v("--color-text-on-accent") : v("--color-text-secondary"),
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Oben klebende Kopie: nur wenn die echte Zeile OBERHALB liegt (schon
          vorbeigescrollt). Vor dem Scroller, damit sie per sticky-top an der
          Viewport-Oberkante fängt; negativer Rand hält den Fluss ruhig. */}
      {ready && markedRow && markedPos === "above" && (
        <div ref={topPeekRef} style={{ ...S.stickyWrapTop, marginBottom: -topPeekH }}>
          {floatingRow}
        </div>
      )}

      <div style={S.scroller} onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}>
        <div style={S.table}>
          {/* Header: every column sorts, the first also picks what it shows. */}
          <div style={{ ...S.row, ...S.header }}>
            <RankHeader mode={rankMode} onChange={setRankMode} sinceYear={lastFullYear} />
            <NameHeader sort={sort} onChange={setSort} />
            {COLUMNS.map((c) => (
              <span key={c.key} style={S.headCell}>
                <button
                  type="button"
                  onClick={() => setSort(c.key)}
                  style={{
                    ...S.headBtn,
                    color: sort === c.key ? v("--color-accent") : v("--color-text-muted"),
                    fontWeight: sort === c.key ? 700 : 600,
                  }}
                >
                  {c.label}
                </button>
                {/* Die Erklärung sitzt am Spaltenkopf, wo die Frage entsteht —
                    nicht als Fließtext unter der Tabelle, den man erst nach dem
                    Lesen aller Zahlen findet. */}
                <InfoTooltip title={c.label} size={11} ariaLabel={`${c.label}: Erklärung`}>
                  {c.key === "wert" ? (
                    <StromwertHilfe spanne={evSpanne} />
                  ) : c.key === "eigenverbrauch" ? (
                    <EigenverbrauchHilfe />
                  ) : (
                    c.hint
                  )}
                </InfoTooltip>
              </span>
            ))}
          </div>

          {/* Re-keyed on metric+filter so the rows fade in on a switch instead of
              snapping — the reorder and the value change land at once otherwise. */}
          <div key={`${sort}-${owner}-${rankMode}`} style={S.rowsFade}>
            {display.map((r, i) => {
              const isMarked = markedId === r.region_id;
              // Highlight-Zeile ohne Tabellenlinie oben und unten: diese Zeile UND
              // die darüber verlieren ihre Trennlinie, damit nichts durch den
              // Rahmen läuft.
              const nextMarked = markedId !== null && display[i + 1]?.region_id === markedId;
              const style = {
                ...S.row,
                ...(isMarked || nextMarked ? { borderBottom: "none" as const } : null),
                ...(isMarked ? S.rowHome : null),
              };
              const marker = isMarked ? { "data-marked": "true" } : {};
              // The whole row leads to the Gemeinde, not just its name — a 60px
              // link inside a 620px row is a target nobody hits on a phone.
              // Uninhabited areas have no page, so they stay a plain row.
              return r.href ? (
                <Link key={r.region_id} href={r.href} {...marker} className="atlas-rank-row" style={{ ...style, ...S.rowLink }}>
                  {rowCells(r, isMarked)}
                  <span className="atlas-go" style={{ ...S.go, ...(isMarked ? { color: ON_ACCENT } : null) }} aria-hidden>
                    <IconArrowRight size={13} />
                  </span>
                </Link>
              ) : (
                <div key={r.region_id} {...marker} style={style}>
                  {rowCells(r, isMarked)}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/*
        Unten klebende Kopie: nur wenn die echte Zeile UNTERHALB liegt (noch nicht
        erreicht). Außerhalb des Scrollers mit Absicht — ein Elternteil mit
        overflow-x: auto wird zum Containing Block für position: sticky, und da der
        nur so hoch ist wie sein Inhalt, feuert "bottom: 4" darin nie. Hier draußen
        klebt sie wieder an der Viewport-Kante.
      */}
      {ready && markedRow && markedPos === "below" && (
        <div style={S.stickyWrap}>{floatingRow}</div>
      )}

      {/* PLZ-CTA sticht wie die aktive Kommune am unteren Rand — sobald eine
          Gemeinde gewählt ist, ersetzt die schwebende Kommunen-Zeile darüber diese
          Karte (sich gegenseitig ausschließende Bedingungen, gleicher Slot). */}
      {ready && !markedRow && !home && (
        <div style={S.stickyPicker}>
          <HomePicker onPick={pick} />
        </div>
      )}
      {ready && markedRow && (
        <p style={S.note}>
          Hervorgehoben: <strong>{markedRow.name}</strong>
          {effectivePin && !home && " (aus geteiltem Link)"} ·{" "}
          <button type="button" onClick={reset} style={S.linkBtn}>
            andere Gemeinde
          </button>
        </p>
      )}
      {ready && home && !markedRow && (
        <p style={S.note}>
          <strong>{home.name}</strong> liegt nicht in dieser Liste.{" "}
          <Link href={home.path} style={S.link}>
            Zur Seite von {home.name}
          </Link>{" "}
          ·{" "}
          <button type="button" onClick={reset} style={S.linkBtn}>
            andere Gemeinde
          </button>
        </p>
      )}

    </div>
  );
}

/**
 * Hilfetext der Stromwert-Spalte. Nennt die Sätze je Anlagenart einzeln —
 * genau das ist der Punkt der Spalte, und eine Zahl, die aus vier verschiedenen
 * Sätzen entsteht, ist ohne diese Aufstellung nicht nachvollziehbar.
 */
function StromwertHilfe({ spanne }: { spanne: { min: number; max: number; mittel: number } | null }) {
  const { eigenverbrauchCt, jahrgang, dachEigenverbrauchAnteil, balkonEigenverbrauchAnteil } =
    stromwertBestandteile(undefined, spanne?.mittel);
  return (
    <>
      Wert des erzeugten Solarstroms pro Jahr, rechnerisch. Jede Kilowattstunde zählt, was sie
      ersetzt oder einbringt — hier für eine Anlage, die {jahrgang} gebaut wird:
      <span style={S.tipListe}>
        <span style={S.tipZeile}>
          <strong>Im Haus verbraucht: {fmtCtProKwh(eigenverbrauchCt)}</strong> — ersetzt
          zugekauften Strom. Wie viel eine Anlagenart im Haus behält, ist verschieden: beim
          Balkonkraftwerk sind es {fmtAnteilProzent(balkonEigenverbrauchAnteil)}. Beim privaten
          Dach hängt der Anteil an den Anlagen und Batterien vor Ort — er steht in der Spalte
          Eigenverbrauch und liegt in dieser Liste{" "}
          {spanne
            ? `zwischen ${fmtAnteilProzent(spanne.min)} und ${fmtAnteilProzent(spanne.max)}`
            : `bei ${fmtAnteilProzent(dachEigenverbrauchAnteil)}`}
          . Beim gewerblichen Dach ist dieser Anteil gar nicht angesetzt, weil uns nicht belegt
          ist, wie viel Betriebe selbst verbrauchen; die Zahl ist dort eine Untergrenze. Bei
          Freiflächen-Parks gibt es ihn nicht.
        </span>
        <span style={S.tipZeile}>
          {/* Der Hinweis steht IMMER dabei, nicht nur wo ein Satz fehlt: Ohne ihn
              liest sich der Freiflächenwert als Einspeisevergütung, obwohl er ein
              Ausschreibungswert abzüglich Vermarktungsgebühr ist. Gebaut wird die
              Zeile in atlas-impact, damit ein Test genau das prüfen kann. */}
          <strong>Eingespeist:</strong> {einspeiseZeilen(jahrgang).join(", ")}. Über 10 kWp ist die Vergütung gestaffelt: Die ersten 10 kWp bringen den höheren Satz,
          jedes weitere Kilowatt den niedrigeren — gerechnet wird mit der mittleren Anlagengröße
          der jeweiligen Gemeinde.
        </span>
      </span>
      Wie sich eine Anlagenart auf beides verteilt, ist verschieden — deshalb wird jede einzeln
      gerechnet. Ältere Anlagen bekommen deutlich mehr: Jede Anlage zählt mit dem Satz ihres
      Baujahrs. Die Vergütung eines privaten Dachs von 2010 ist rund das Vierfache der heutigen;
      in dieser Spalte bleibt davon mehr als das Doppelte übrig, weil der selbst verbrauchte Strom
      bei beiden gleich viel wert ist. Nach 20 Jahren endet die Vergütung, dann zählt nur noch der
      Börsenwert. Eine Lücke kennen wir: Die zusätzliche Eigenverbrauchsvergütung der Baujahre
      2009 bis 2012 fehlt, das setzt die Zahl eher zu niedrig an. Freiflächen-Parks ab Baujahr
      {FREIFLAECHE_ZUSCHLAG_AB} erlösen nicht mehr einen Satz aus dem Gesetz, sondern den
      Zuschlagswert ihrer Ausschreibung. Jedes dieser Baujahre zählt deshalb mit dem Mittel der
      beiden Ausschreibungsjahre davor, weil zwischen Zuschlag und Inbetriebnahme bis zu zwei
      Jahre liegen dürfen und die meisten Projekte diese Frist ausreizen. Wie sich die
      Inbetriebnahmen im Einzelnen darauf verteilen, veröffentlicht die Behörde nicht — das ist
      eine begründete Näherung, keine gemessene Zuordnung. Solange ein Ausschreibungsjahr noch
      läuft, zählt das jüngste vollständige. Strommenge: installierte Leistung mal typischer Ertrag im
      Bundesland, kalibriert an der Erzeugung 2025 (Fraunhofer ISE).
    </>
  );
}

/**
 * Hilfetext der Eigenverbrauchs-Spalte.
 *
 * Der wichtigste Satz steht zuerst: Die Zahl ist GERECHNET, nicht gemessen. Das
 * Anlagenregister kennt Anlagen und Batterien, aber keine Zählerstände — wer die
 * Spalte für eine Messung hält, liest sie als etwas, das sie nicht ist.
 */
function EigenverbrauchHilfe() {
  return (
    <>
      Anteil des Solarstroms von <strong>privaten Dächern</strong>, der im Haus bleibt, statt ins
      Netz zu gehen. Der Wert ist gerechnet, nicht gemessen: Das Anlagenregister sagt, wie viele
      Dächer und Hausbatterien es gibt — wie viel Strom durch den Zähler ging, sagt es nicht.
      <span style={S.tipListe}>
        <span style={S.tipZeile}>
          Gerechnet wird mit derselben Formel wie im Photovoltaik-Rechner, aus drei Zahlen der
          Region: der mittleren Anlagengröße (Leistung durch Anzahl der privaten Dächer), dem
          Anteil der Dächer mit Hausbatterie samt deren mittlerer Größe, und dem üblichen Ertrag
          am Standort.
        </span>
        <span style={S.tipZeile}>
          Der Haushalt dahinter ist überall derselbe Bezugsfall — zwei Personen, teils zuhause —,
          denn wer in diesen Häusern wohnt, steht im Register nicht. Kleinere Anlagen und mehr
          Batterien heben den Anteil, große Dächer senken ihn.
        </span>
      </span>
      Gewerbliche Dächer und Freiflächen-Parks sind nicht enthalten. Der Anteil bestimmt mit, was
      in der Spalte Stromwert steht: Selbst verbrauchter Strom ersetzt teuren Netzbezug,
      eingespeister bringt nur die Vergütung.
    </>
  );
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open, close]);
  return ref;
}

function RankHeader({ mode, onChange, sinceYear }: { mode: RankMode; onChange: (m: RankMode) => void; sinceYear: number }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={
          mode === "platz"
            ? "Platzierung nach der Spalte, nach der gerade sortiert wird."
            : `Gewonnene oder verlorene Plätze seit Ende ${sinceYear}. Das laufende Jahr ist noch unvollständig und daher nicht als Vorjahr gerechnet.`
        }
        style={S.headBtnLeft}
      >
        {mode === "platz" ? "Platz" : `Δ ${sinceYear}`}
        <IconChevronDown size={7} />
      </button>
      {open && (
        <div style={S.dropdown}>
          {(
            [
              ["platz", "Platzierung"],
              ["delta", `Veränderung seit Ende ${sinceYear}`],
            ] as [RankMode, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              style={{ ...S.dropItem, fontWeight: mode === k ? 700 : 400 }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Name column header — a dropdown twin of RankHeader. It flips the sort between
 * alphabetical (A–Z) and by inhabitants: the two orderings that have no value
 * column of their own. "(Einwohner)" in the label names the small number shown
 * behind each place name.
 */
function NameHeader({ sort, onChange }: { sort: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const active = sort === "name" || sort === "population";
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Sortieren: alphabetisch oder nach Einwohnerzahl"
        style={{
          ...S.headNameBtn,
          color: active ? v("--color-accent") : v("--color-text-muted"),
          fontWeight: active ? 700 : 600,
        }}
      >
        Name (Einwohner)
        <IconChevronDown size={7} />
      </button>
      {open && (
        <div style={S.dropdown}>
          {(
            [
              ["name", "Name (A–Z)"],
              ["population", "Einwohner"],
            ] as [Sort, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              style={{ ...S.dropItem, fontWeight: sort === k ? 700 : 400 }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HomePicker({ onPick }: { onPick: (hit: GemeindeHit, plz: string) => void }) {
  const [plz, setPlz] = useState("");
  const [hits, setHits] = useState<GemeindeHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const found = await lookupPlz(plz);
      // One postcode can cover several Gemeinden — ask instead of guessing.
      if (found.length === 1) onPick(found[0], plz);
      else setHits(found);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.picker}>
      <p style={S.pickerTitle}>Eigene Gemeinde eingeben</p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <label htmlFor="home-plz" style={S.pickerLabel}>
          Postleitzahl eingeben — deine Gemeinde wird in dieser und jeder weiteren Liste markiert.
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="home-plz"
            value={plz}
            onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
            inputMode="numeric"
            placeholder="z. B. 97204"
            style={S.input}
          />
          <button type="submit" disabled={plz.length !== 5 || busy} style={S.submit}>
            {busy ? "…" : "Merken"}
          </button>
        </div>
      </form>
      {error && <p style={S.error}>{error}</p>}
      {hits && hits.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <p style={S.pickerLabel}>Diese Postleitzahl deckt mehrere Gemeinden ab:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {hits.map((h) => (
              <button key={h.region_id} type="button" onClick={() => onPick(h, plz)} style={S.hitBtn}>
                {h.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Rank · name · one cell per column. Header, rows and floating row share it — the
 * floating row exists to be compared against the list, so its columns have to land
 * on the same pixels.
 */
/**
 * Acht Spalten in 736 px. Der Platz reicht — er muss nur richtig verteilt sein,
 * und beide Fehlerrichtungen sind schon passiert:
 *
 * - Wertspalten als `minmax(…, max-content)`: sie fallen auf ihre Inhaltsbreite
 *   zusammen, die fr-Namensspalte frisst den Rest (282 statt nötiger 200 px),
 *   und die Zahlen kleben rechts als ein Block ohne erkennbare Spalten.
 * - Wertspalten mit fester Obergrenze plus fr-Name: umgekehrt bläht das Grid
 *   erst alle Wertspalten auf ihr Maximum auf, und lange Namen brechen ab.
 *
 * Deshalb: Wertspalten FEST und gleich breit (sie sind eine Messreihe, sie
 * müssen als Spalten lesbar sein und untereinander fluchten), der Rest gehört
 * dem Namen.
 *
 * Seit Zahl und Einheit übereinander stehen, braucht eine Wertspalte nur noch
 * die Breite ihrer ZAHL — die Einheit ist kurz und steht darunter. Die
 * Spaltenbreite bestimmt deshalb nicht mehr der Wert, sondern die ÜBERSCHRIFT
 * samt „?"-Knopf daneben; sie muss einzeilig bleiben, sonst zieht sie die
 * ganze Kopfzeile auf und stößt an die Nachbarspalte. Die Werte hier sind
 * gemessene Kopfbreiten, nicht geschätzt. Einzige Ausnahme ist „Anlagen"
 * (74): Dort ist die Zahl breiter als der Kopf, weil sie als einzige der
 * Tabelle ungestaffelt bis zu siebenstellig wird ("1.399.105").
 *
 * „Eigenverbrauch" ist mit 83 px der längste Kopf der Reihe (im Browser
 * gemessen, 11 px halbfett) — mit dem „?" daneben also 96. Die Spalte ist
 * dadurch breiter als ihre zweistellige Prozentzahl braucht; das ist der Preis
 * dafür, dass der Titel einzeilig bleibt.
 */
const GRID = "40px minmax(175px,1fr) 74px 60px 60px 78px 70px 96px 62px 12px";

const S: Record<string, React.CSSProperties> = {
  controls: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  chips: { display: "flex", gap: 4 },
  chip: {
    border: `1px solid ${v("--color-border")}`,
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  // Eight columns do not fit a phone. Scroll the table, never the page.
  scroller: { overflowX: "auto", margin: "0 -8px", padding: "0 8px" },
  // Summe des Rasters: 40 + 175 (Name-Minimum) + 500 (Wertspalten) + 12 + 99
  // (neun Lücken à 11). Enger scrollt die Tabelle lieber waagerecht, als
  // Ortsnamen abzuschneiden — ein halber Ortsname ist in einer Rangliste wertlos.
  table: { minWidth: 826 },
  row: {
    display: "grid",
    gridTemplateColumns: GRID,
    alignItems: "center",
    gap: 11,
    padding: "7px 8px",
    margin: "0 -8px",
    borderBottom: `1px solid ${v("--color-border-muted")}`,
    fontSize: 13,
  },
  // Kopfzeile oben ausgerichtet: „CO₂ gespart" bricht auf zwei Zeilen um, und
  // mittig zentriert rutschten die einzeiligen Titel daneben nach unten.
  header: { alignItems: "end", borderBottom: `1px solid ${v("--color-border")}`, paddingBottom: 6, marginBottom: 2 },
  headNameBtn: {
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: "inherit",
    fontSize: 11,
    textAlign: "left",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
  },
  // Titel + „?" nebeneinander. Der Titel darf nicht umbrechen — sonst zieht er
  // die ganze Kopfzeile auf; die Spaltenbreiten sind darauf ausgelegt.
  headCell: { display: "flex", alignItems: "center", gap: 3, minWidth: 0 },
  headBtn: {
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: "inherit",
    fontSize: 11,
    textAlign: "left",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  // Aufzählung der Sätze im Hilfetext der Stromwert-Spalte.
  tipListe: { display: "flex", flexDirection: "column", gap: 4, margin: "8px 0" },
  tipZeile: { display: "block" },
  headBtnLeft: {
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: 600,
    color: v("--color-text-muted"),
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
  },
  // Aktive Kommune voll in unserem Blau (weiße Schrift via rowCells onAccent).
  rowHome: { background: v("--color-accent"), borderRadius: v("--radius-md") },
  // Die Platzziffer gehört auf die Namenslinie, nicht in die Mitte zwischen
  // Name und Einwohnerzahl: sie benennt den Ort, nicht die Zeile als Ganzes.
  rank: {
    fontFamily: v("--font-mono"),
    fontSize: 12,
    lineHeight: 1.25,
    color: v("--color-text-muted"),
    display: "flex",
    alignItems: "baseline",
    alignSelf: "start",
    gap: 4,
  },
  delta: { fontFamily: v("--font-mono"), fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 1 },
  // Name und Einwohnerzahl gestapelt — dieselbe Bauart wie die Wertzellen
  // (Hauptangabe oben, kleine Zusatzangabe darunter). Dadurch fluchten alle
  // acht Spalten in zwei Textebenen statt in einer gemischten Zeile.
  nameCell: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, minWidth: 0 },
  // Zeilenhöhen gleich denen der Wertzelle (valNum/valUnit): sonst sitzen Name
  // und Einwohnerzahl ein paar Pixel tiefer als die Zahlenreihe daneben.
  name: {
    fontSize: 13,
    lineHeight: 1.25,
    color: v("--color-text-primary"),
    textDecoration: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
  hint: { fontSize: 10, lineHeight: 1.2, color: v("--color-text-muted"), whiteSpace: "nowrap" },
  // The bar sits under the number in the sorted column, not in a column of its
  // own: a header names a measure, and "the bar" is not one — it is that measure,
  // drawn.
  // Wertzelle: Zahl oben, Einheit darunter, linksbündig. Linksbündig, weil die
  // Einheit sonst unter einer rechtsbündigen Zahl mit wechselnder Stellenzahl
  // wandert — die Einheiten stünden in derselben Spalte auf verschiedenen
  // Startpunkten.
  val: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 1,
    minWidth: 0,
  },
  valNum: {
    fontFamily: v("--font-mono"),
    fontSize: 13,
    lineHeight: 1.25,
    whiteSpace: "nowrap",
    color: v("--color-text-primary"),
  },
  // Gleiche Größe und Farbe wie die Einwohnerzahl unter dem Namen: beide sind
  // die kleine Zusatzangabe ihrer Zelle.
  //
  // `muted` ist die hellste Stufe, die als tragender Text zulässig ist (4,8:1
  // gegen den Zeilenhintergrund; WCAG AA verlangt 4,5:1). Kurzzeitig stand hier
  // `faint` — heller, aber laut Kontrast-Audit (docs/audit-backlog-2026-07-19.md
  // §4) für Platzhalter reserviert und mit 3,47:1 unter der Schwelle. Das ist
  // ausgerechnet für die Einheit die falsche Sparsamkeit: Sie ist es, die aus
  // „5.028" ein „5.028 Wp" macht. Die Staffelung zur Zahl darüber trägt der
  // Größen- und Gewichtsunterschied (13 px/700 gegen 10 px/normal).
  valUnit: { fontSize: 10, color: v("--color-text-muted"), whiteSpace: "nowrap", lineHeight: 1.2 },
  track: { display: "block", width: "100%", height: 4, marginTop: 2, background: v("--color-border"), borderRadius: 2 },
  // Links verankert → der Balken wächst nach rechts (kein marginLeft:auto mehr).
  fill: { display: "block", height: "100%", borderRadius: 2 },
  // Mirrors S.scroller's box exactly (same negative margin, same padding), so the
  // row inside starts on the same pixel as a row in the list. Getting this wrong
  // by 8px is what broke the alignment twice.
  rowsFade: { animation: "fu 0.28s ease-out" },
  stickyWrap: {
    position: "sticky",
    bottom: 4,
    margin: "10px -8px 0",
    // Vertical padding gives the row's shadow room; overflow: hidden would crop it
    // flat against the wrapper otherwise.
    padding: "6px 8px",
    overflow: "hidden",
  },
  // Oben klebende Kopie: gleicher horizontaler Kasten wie unten (fluchtende
  // Spalten), aber an der Oberkante. z-index über den Listenzeilen; marginBottom
  // wird inline auf die gemessene Höhe negiert (kein Fluss-Versatz).
  stickyWrapTop: {
    position: "sticky",
    top: 4,
    zIndex: 3,
    margin: "0 -8px",
    padding: "6px 8px",
    overflow: "hidden",
  },
  // Same sticky-bottom slot as the marked-Gemeinde row: the PLZ-CTA floats here
  // until a Gemeinde is picked, then the marked row (rendered above) takes over.
  stickyPicker: { position: "sticky", bottom: 4, zIndex: 2 },
  stickyRow: {
    borderBottom: "none",
    // Voll in unserem Blau — die schwebende Kopie sieht aus wie die aktive Zeile
    // in der Liste, nur mit Schlagschatten abgehoben.
    background: v("--color-accent"),
    border: `1px solid ${v("--color-accent-dark")}`,
    borderRadius: v("--radius-md"),
    boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
  },
  rowLink: { textDecoration: "none", color: "inherit", cursor: "pointer" },
  // Blauer „→" am Zeilenende, erst bei Hover sichtbar (Klickbarkeits-Affordanz).
  // Opacity/Slide-Transition steuert die globale CSS-Regel .atlas-rank-row (theme.ts),
  // weil Inline-Styles kein :hover können. Die 14px-Spur dafür steckt in GRID.
  go: { display: "flex", alignItems: "center", justifyContent: "flex-end", color: v("--color-accent") },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    background: v("--color-bg"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-sm"),
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 20,
    padding: "4px 0",
    minWidth: 110,
  },
  dropItem: {
    display: "block",
    width: "100%",
    background: "none",
    border: "none",
    textAlign: "left",
    padding: "6px 12px",
    fontSize: 12,
    fontFamily: "inherit",
    color: v("--color-text-primary"),
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  yearBar: { display: "flex", alignItems: "stretch" },
  yearBtn: {
    border: `1px solid ${v("--color-border")}`,
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    fontFamily: v("--font-mono"),
    fontSize: 12,
    padding: "5px 8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  picker: { marginTop: 16, padding: "14px 16px", background: v("--color-bg-accent"), border: `1px solid ${v("--color-border-accent")}`, borderRadius: v("--radius-md") },
  pickerTitle: { fontSize: 14, fontWeight: 700, color: v("--color-text-primary"), margin: "0 0 8px" },
  pickerLabel: { fontSize: 12, color: v("--color-text-secondary"), margin: 0 },
  input: {
    flex: "0 0 110px",
    padding: "8px 10px",
    fontSize: 16,
    fontFamily: v("--font-mono"),
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    background: v("--color-bg"),
    color: v("--color-text-primary"),
  },
  submit: {
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    border: "none",
    borderRadius: v("--radius-md"),
    background: v("--color-accent"),
    color: v("--color-text-on-accent"),
    cursor: "pointer",
  },
  hitBtn: {
    padding: "6px 10px",
    fontSize: 12,
    fontFamily: "inherit",
    border: `1px solid ${v("--color-border")}`,
    borderRadius: v("--radius-md"),
    background: v("--color-bg"),
    color: v("--color-text-primary"),
    cursor: "pointer",
  },
  error: { fontSize: 12, color: v("--color-negative"), margin: "8px 0 0" },
  note: { fontSize: 12, color: v("--color-text-muted"), margin: "12px 0 0" },
  link: { color: v("--color-accent"), textDecoration: "none" },
  linkBtn: {
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    fontSize: 12,
    color: v("--color-accent"),
    cursor: "pointer",
    textDecoration: "underline",
  },
};
