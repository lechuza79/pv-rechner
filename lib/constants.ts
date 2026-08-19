import { v } from "./theme";

// ─── Zeitkonstanten ──────────────────────────────────────────────────────────
// YEAR = current calendar year, used as the projection start year (Chart x-axis,
// amortization timeline). Computed at module load → re-evaluated per dev-server
// restart, per Vercel cold start, or per client mount; that's good enough for a
// 25-year projection where being off by a few weeks at year-rollover is fine.
// Keep this dynamic — never hardcode a year here.
export const YEAR = new Date().getFullYear();
export const YEARS = 25;
export const DEGRAD = 0.005;
// EEG-Einspeisevergütung ist auf 20 Jahre (+ Inbetriebnahmejahr) garantiert.
// Danach fällt die Anlage aus dem EEG — Einspeisung bringt dann nur noch den
// Marktwert, den wir konservativ nicht ansetzen. Über den 25-Jahre-Horizont
// wird die Einspeisevergütung also nur bis Jahr 20 gezahlt.
export const FEED_IN_YEARS = 20;

// ─── PV-Standortertrag (kWh/kWp·a) ───────────────────────────────────────────
// Kanonische Quelle für den Ertrag ist PVGIS (ortsgenau via PLZ, lib/pvgis.ts).
// NATIONAL_AVG_YIELD ist der PVGIS-Bundesschnitt (optimale Ausrichtung) und dient
// serverseitig als Fallback, wenn PVGIS nicht erreichbar ist. Hier zentral, damit
// Client (Rechner/Empfehlung/Balkon) und Server denselben Wert teilen.
// Er ist zugleich der Startwert der Rechner ohne PLZ. Hier stand bis zum
// 18.08.2026 ein zweiter, um 100 kWh gekürzter Wert („Puffer für nicht-optimale
// Dachausrichtung") — und damit ein Dachabschlag an einer Stelle, an der die
// Größe „Standort-OPTIMUM" heißt. Seit es die Dach-Frage gibt, zieht
// dachErtragKwp() den Abschlag selbst ab: Wer sein Ost/West-Dach angab, bekam
// ihn zweimal (rund 20 % zu wenig statt 20 %), und der Hinweis daneben behauptete
// trotzdem „bei optimaler Neigung nach Süden". Der Abschlag gehört genau an eine
// Stelle — in die Dach-Matrix, wo er zur Angabe des Nutzers passt und sichtbar
// begründet ist. Solange niemand sein Dach angegeben hat, gilt das Optimum, und
// die Rechner schreiben das ausdrücklich hin (dachErtragHinweis).
export const NATIONAL_AVG_YIELD = 1050;

// Saisonaler Verbrauchsfaktor (BDEW Standardlastprofil H0)
// Winter ~17% über Durchschnitt, Sommer ~15% unter
export const CONSUMPTION_MONTHLY = [1.17, 1.05, 1.08, 0.97, 0.93, 0.84, 0.87, 0.87, 0.91, 1.00, 1.13, 1.17];

// ─── Autarkiegrad-Kennfeld (HTW Berlin / Quaschning) ─────────────────────────
// Der Autarkiegrad (Netz-Unabhängigkeit) lässt sich NICHT aus dem Eigenverbrauch
// zurückrechnen — bei überdimensionierten Anlagen läuft eine Jahresbilanz gegen
// 100 %, obwohl im Winter mangels Sonne immer Netzstrom gezogen wird. Der wahre
// Wert kommt aus derselben zeitaufgelösten HTW-Simulation wie das
// Eigenverbrauchs-Power-Law (25.000 Konfigurationen, 1-Min-Auflösung). HTW liefert
// dazu ein eigenes Autarkie-Kennfeld über zwei Achsen:
//   x = installierte kWp pro 1000 kWh Jahresverbrauch
//   y = nutzbare Speicher-kWh pro 1000 kWh Jahresverbrauch
// Werte hier sind eine verlustarme Ausdünnung der HTW-Matrix (Original: 162×162 in
// 0,0625-Schritten). Bilinear interpoliert bleibt der Fehler im realistischen
// Bereich (x 0,15–6, y 0–4) bei ⌀ 0,26 pp, max 2,7 pp (nur im Winzanlagen-Eck).
// Quelle: solar.htw-berlin.de/rechner/unabhaengigkeitsrechner (Referenz-Ertrag
// 1024 kWh/kWp — siehe AUTARKY_HTW_YIELD, wir skalieren die x-Achse auf den echten
// Standort-Ertrag). Autarkie sättigt physikalisch bei ~90 %, nie 100 %.
export const AUTARKY_HTW_YIELD = 1024;
export const AUTARKY_X = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10];
export const AUTARKY_Y = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5];
export const AUTARKY_GRID = [
  [0, 0.166, 0.238, 0.279, 0.305, 0.338, 0.359, 0.374, 0.385, 0.393, 0.400, 0.411, 0.418, 0.429, 0.436], // y=0
  [0, 0.223, 0.323, 0.366, 0.393, 0.426, 0.447, 0.461, 0.472, 0.480, 0.487, 0.497, 0.504, 0.513, 0.519], // y=0.25
  [0, 0.237, 0.367, 0.421, 0.452, 0.489, 0.512, 0.529, 0.541, 0.551, 0.558, 0.570, 0.578, 0.589, 0.595], // y=0.5
  [0, 0.242, 0.401, 0.469, 0.506, 0.548, 0.575, 0.593, 0.607, 0.618, 0.627, 0.640, 0.650, 0.663, 0.670], // y=0.75
  [0, 0.242, 0.425, 0.511, 0.555, 0.605, 0.633, 0.653, 0.669, 0.680, 0.689, 0.703, 0.714, 0.728, 0.736], // y=1
  [0, 0.242, 0.454, 0.569, 0.626, 0.685, 0.716, 0.738, 0.755, 0.768, 0.779, 0.795, 0.807, 0.824, 0.836], // y=1.5
  [0, 0.242, 0.463, 0.594, 0.660, 0.727, 0.763, 0.787, 0.806, 0.821, 0.834, 0.853, 0.868, 0.888, 0.902], // y=2
  [0, 0.242, 0.465, 0.606, 0.673, 0.744, 0.784, 0.809, 0.828, 0.844, 0.858, 0.879, 0.895, 0.917, 0.934], // y=2.5
  [0, 0.242, 0.466, 0.613, 0.681, 0.756, 0.797, 0.822, 0.841, 0.857, 0.871, 0.892, 0.907, 0.931, 0.948], // y=3
  [0, 0.242, 0.468, 0.623, 0.692, 0.769, 0.811, 0.839, 0.860, 0.876, 0.889, 0.908, 0.923, 0.946, 0.962], // y=4
  [0, 0.242, 0.469, 0.628, 0.698, 0.776, 0.820, 0.849, 0.871, 0.889, 0.902, 0.921, 0.936, 0.958, 0.972], // y=5
];

// Gas/Öl-Marktpreis + CO2-Faktor — EINZIGE QUELLE (Single Source of Truth).
// Preis in €/kWh, co2PerKwh in kg/kWh. FUEL, WP_FUEL_OPTIONS und
// lib/heatpump-config.ts leiten ihre Gas-/Öl-Werte hieraus ab — bitte nur hier
// pflegen (jährlicher WP-Wächter, scripts/waermepumpe-verify.md). Der
// Kessel-Wirkungsgrad bleibt pro Kontext separat (Brennwert/alt/Öl).
//
// DIE BEIDEN PREISE STEHEN AUF VERSCHIEDENEN SKALEN — BLOCKER (19.08.2026):
// Erdgas wird in Deutschland auf den BRENNWERT abgerechnet (thermische
// Gasabrechnung nach DVGW G 685: m³ × Brennwert × Zustandszahl), Heizöl wird
// üblicherweise über rund 10 kWh je Liter umgerechnet — und das ist der
// HEIZWERT (Heizöl EL: Heizwert ~9,8, Brennwert ~10,6 kWh/l). Brennwert und
// Heizwert unterscheiden sich bei Erdgas um rund 11 %, bei Heizöl um 6–8 %.
// Folge für jeden, der hier etwas anfasst: Der Gas-Wirkungsgrad (0,95) und der
// Öl-Wirkungsgrad (0,85) sind NICHT direkt vergleichbar, und ein gemeinsamer
// Auf- oder Abschlag über beide Brennstoffe hinweg ist immer falsch. Ein
// Wirkungsgrad gehört auf dieselbe Bezugsgröße wie der Preis, gegen den er
// rechnet. Zweimal ist genau daran eine Korrektur gescheitert; die vollständige
// Begründung samt geprüfter Sackgassen steht in scripts/waermepumpe-verify.md.
export const FUEL_PRICE: Record<"gas" | "oil", { price: number; co2PerKwh: number }> = {
  gas: { price: 0.11, co2PerKwh: 0.20 },   // 11 ct/kWh, 200 g CO2/kWh
  oil: { price: 0.10, co2PerKwh: 0.266 },  // 10 ct/kWh, 266 g CO2/kWh
};

// Gas/Öl-Referenzkosten für WP-Vergleich (Preis + CO2 aus FUEL_PRICE).
// `label` ist der Brennstoff (Umschalter), `refLabel` die Heizung — dieselbe Trennung
// wie in WP_FUEL_OPTIONS. Ohne refLabel entstand im PV-Ergebnis „Heizölheizung", weil
// dort „heizung" an das Brennstoff-Label geklebt wurde.
export const FUEL: Record<string, { label: string; refLabel: string; price: number; efficiency: number; co2PerKwh: number }> = {
  gas: { label: "Gas", refLabel: "Gasheizung", price: FUEL_PRICE.gas.price, efficiency: 0.90, co2PerKwh: FUEL_PRICE.gas.co2PerKwh },   // 90% Kessel
  oil: { label: "Heizöl", refLabel: "Ölheizung", price: FUEL_PRICE.oil.price, efficiency: 0.85, co2PerKwh: FUEL_PRICE.oil.co2PerKwh }, // 85% Kessel
};

// ─── Optionen für den Rechner-Flow ──────────────────────────────────────────
export const ANLAGEN = [
  { kwp: 5, label: "5 kWp", sub: "Klein · ~12 Module", icon: "🔆" },
  { kwp: 8, label: "8 kWp", sub: "Mittel · ~19 Module", icon: "🔆" },
  { kwp: 10, label: "10 kWp", sub: "Standard · ~24 Module", icon: "☀️" },
  { kwp: 15, label: "15 kWp", sub: "Groß · ~36 Module", icon: "☀️" },
];

// Indices 0–3 are stable for legacy share-URL compatibility ("s=2" → 10 kWh).
// New intermediate sizes (7.5 / 12.5 kWh) appended at the end — UI re-sorts by kWh on display.
export const SPEICHER = [
  { kwh: 0,    label: "Kein Speicher", sub: "Nur Direktverbrauch", icon: "—" },
  { kwh: 5,    label: "5 kWh",         sub: "Kompakt",             icon: "🔋" },
  { kwh: 10,   label: "10 kWh",        sub: "Standard",            icon: "🔋" },
  { kwh: 15,   label: "15 kWh",        sub: "Groß",                icon: "🔋" },
  { kwh: 7.5,  label: "7,5 kWh",       sub: "Mittel",              icon: "🔋" },
  { kwh: 12.5, label: "12,5 kWh",      sub: "Groß+",               icon: "🔋" },
];

// count = mittlere Kopfzahl je Index — für die WP-Warmwasser-Berechnung
// (kWh/Person) im PV- und WP-Rechner. Single Source, damit beide Rechner
// dieselbe Personenzahl annehmen.
export const PERSONEN = [
  { label: "1", verbrauch: 1800, count: 1 },
  { label: "2", verbrauch: 2800, count: 2 },
  { label: "3–4", verbrauch: 3800, count: 3.5 },
  { label: "5+", verbrauch: 5000, count: 5 },
];

export const NUTZUNG = [
  { label: "Tagsüber weg", sub: "Klassisch berufstätig", tagQuote: 0.24 },
  { label: "Teils zuhause", sub: "1–2 Tage Homeoffice", tagQuote: 0.30 },
  { label: "Homeoffice", sub: "Überwiegend daheim", tagQuote: 0.38 },
  { label: "Immer zuhause", sub: "Rente, Elternzeit …", tagQuote: 0.45 },
];

export const TRI = [
  { id: "nein", label: "Nein" },
  { id: "geplant", label: "Geplant" },
  { id: "ja", label: "Vorhanden" },
];

export const EA_KM_PRESETS = [10000, 15000, 20000];

// Strompreis-Szenarien für die PV-Prognose. `explain` beschreibt die Annahme
// aus PV-Sicht (hoher Strompreis-Anstieg = mehr Ersparnis). Die Bandbreite
// bildet die 25-Jahres-Unsicherheit ab: 3 % als Mitte deckt sich mit dem
// langjährigen Schnitt, die Ränder spannen von „kaum Anstieg" bis „kräftig".
export const SCENARIOS = [
  { id: "pessimistic", label: "Pessimistisch", color: v("--color-negative"), strom: 0.01, evDelta: -5,
    explain: "Vorsichtig gerechnet: Der Strompreis steigt nur langsam (+1 %/Jahr) — dein selbst genutzter Solarstrom spart dann entsprechend weniger." },
  { id: "realistic", label: "Realistisch", color: v("--color-positive"), strom: 0.02, evDelta: 0,
    explain: "Mittlere Annahme: Der Strompreis steigt moderat (+2 %/Jahr), wie die aktuellen Prognosen erwarten." },
  { id: "optimistic", label: "Optimistisch", color: v("--color-accent"), strom: 0.05, evDelta: 5,
    explain: "Günstige Entwicklung: Steigt der Strompreis kräftig (+5 %/Jahr), lohnt sich jede selbst genutzte Kilowattstunde stärker." },
];

// Vereinigung beider Zweige: `az`/`ng` (Ausrichtung, Neigung) und `sk` (freie
// Speichergröße) sind unabhängig voneinander entstanden. Fehlt einer, rechnet
// der Empfänger eines geteilten Links etwas anderes als der Absender.
export const SHARE_KEYS = ["a", "s", "sk", "p", "n", "wp", "ea", "k", "ev", "st", "ei", "eia", "er", "ck", "km", "plz", "flow", "ht", "da", "az", "ng", "bl", "foe", "vb", "kl", "km2", "klr", "klwh", "wf", "wi", "wh", "wht", "sc", "rg", "mk", "mw"];

// ─── Empfehlungs-Flow ───────────────────────────────────────────────────────
// footprint = nutzbare Dachfläche (Empfehlung); wpFaktor = Heizlast-Faktor durch
// geteilte Wände (Wärmepumpen-Strom, analog HAUSTYP_WP). Reihenhaus liegt
// zwischen End- (0,9) und Mittellage (0,78), daher konservativ 0,85.
export const HAUSTYPEN = [
  { label: "Reihenhaus", sub: "Schmal, begrenzte Dachfläche", footprint: 50, wpFaktor: 0.85 },
  { label: "Doppelhaushälfte", sub: "Halbes Dach nutzbar", footprint: 70, wpFaktor: 0.9 },
  { label: "Einfamilienhaus", sub: "Freistehend, gute Dachfläche", footprint: 100, wpFaktor: 1.0 },
  { label: "Großes EFH", sub: "Freistehend, große Dachfläche", footprint: 150, wpFaktor: 1.0 },
];

// typNeigung = typische Modulneigung je Dachform (Modellannahme, Grad):
// Satteldach 30–45° → 35, Walmdach 25–35° → 30, Pultdach 10–20° → 15,
// Flachdach aufgeständert 10–15° → 10 (deckt sich mit dem Hinweis auf
// /photovoltaik-neigungswinkel). Wird mit lib/tilt-config.ts → tiltPct() zur
// Ertrags-Verfeinerung kombiniert — Grad-Abfrage beim Nutzer wäre Schein-
// genauigkeit, die Dachform kennt jeder.
// `id` statt Positionswissen: Ob eine Dachform nach Norden ausgerichtet werden
// kann, hängt an der Form selbst (aufgeständert = die Ausrichtung wählt der
// Monteur), nicht an ihrer Stelle in dieser Liste. Vorher stand dafür ein
// `dachartIdx === 1` im Rechner — das bricht still, sobald jemand die Liste
// umsortiert oder eine Dachform ergänzt.
export const DACHARTEN = [
  { id: "sattel", label: "Satteldach", sub: "Klassisch, eine Dachseite", factor: 0.40, typNeigung: 35, aufgestaendert: false },
  { id: "flach", label: "Flachdach", sub: "Aufständerung möglich", factor: 0.65, typNeigung: 10, aufgestaendert: true },
  { id: "walm", label: "Walmdach", sub: "4 Seiten, weniger Fläche", factor: 0.30, typNeigung: 30, aufgestaendert: false },
  { id: "pult", label: "Pultdach", sub: "Einseitig geneigt, sehr gut", factor: 0.55, typNeigung: 15, aufgestaendert: false },
] as const;

// ─── Wärmepumpen-Flow ───────────────────────────────────────────────────────

export const SITUATION = [
  { id: "bestand", label: "Bestandsgebäude", sub: "Alte Heizung tauschen" },
  { id: "neubau", label: "Neubau", sub: "Frische Planung, keine Altheizung" },
];

export const WOHNFLAECHEN = [
  { m2: 100, label: "100 m²", sub: "Kleines EFH / DHH" },
  { m2: 140, label: "140 m²", sub: "Typisches EFH" },
  { m2: 180, label: "180 m²", sub: "Großes EFH" },
  { m2: 220, label: "220 m²", sub: "Sehr groß" },
];

// Haustyp für die Heizlast: geteilte Wände senken den Wärmeverlust. Faktor
// relativ zum freistehenden Haus. Wände sind ~25–35 % des Gesamtverlusts
// (Rest Dach/Boden/Fenster/Lüftung), daher moderate Abschläge pro geteilter Wand.
export const HAUSTYP_WP = [
  { id: "frei", label: "Freistehend", sub: "Vier Außenwände", faktor: 1.0 },
  { id: "doppel", label: "Doppelhaushälfte", sub: "Eine Wand geteilt", faktor: 0.9 },
  { id: "reihenend", label: "Reihenendhaus", sub: "Eine Wand geteilt, Endlage", faktor: 0.9 },
  { id: "reihenmitte", label: "Reihenmittelhaus", sub: "Zwei Wände geteilt", faktor: 0.78 },
] as const;

// Dämmzustand — EINZIGE QUELLE für den Jahres-Heizwärmebedarf (specKwh, kWh/m²·a
// Wohnfläche) UND die spezifische Heizlast (heatLoadW, W/m²). lib/heatpump-config.ts
// leitet specDemandBestand/specHeatLoadBestand hieraus ab, lib/aircon-config.ts den
// Heizwärmebedarf des Split-Heizen-Blocks — bitte nur hier pflegen. Eine zweite
// handgetippte Kopie dieser Zahlen ist ein Fehler, kein Duplikat.
//
// `art` SAGT, WAS DIE ZAHL IST — und das ist keine Formalie (BLOCKER-Lehre
// 31.07.2026). Diese Tabelle mischt zwei Größen, die gleich aussehen:
//   "bedarf"    = Norm-Rechenwert (DIN V 18599 / Energieausweis): vollständig auf
//                 Solltemperatur beheiztes Gebäude bei Norm-Klima.
//   "verbrauch" = gemessener Endenergieverbrauch echter Gebäude.
// Der Norm-Bedarf liegt im Bestand systematisch ÜBER dem realen Verbrauch
// (Prebound, siehe lib/heat-consumption.ts). Für Betriebskosten zählt der
// Verbrauch — deshalb rechnet der Rechner die Bedarfsstufen um. Eine bereits
// gemessene Stufe darf dabei NICHT ein zweites Mal korrigiert werden; genau das
// wäre bei „Vollsaniert" passiert, dessen 70 aus gemessenen Verbräuchen stammt
// und nicht aus einer Normrechnung.
//
// Quellen (geprüft 28.07.2026, `art` ergänzt 31.07.2026):
//   specKwh   — dena-Gebäudereport + DIN V 18599 (unsaniert bis gut saniert).
//               Die Stufe „Vollsaniert" (70) ist belegt durch die dena-Studie
//               „Auswertung von Verbrauchskennwerten energieeffizienter
//               Wohngebäude", S. 25 / Abb. 7: gemessene Endenergieverbräuche
//               sanierter Gebäude mit gut gedämmter Hülle (H'T ≤ 0,5 W/(m²K))
//               streuen bei fossiler Beheizung zwischen 10 und 90 kWh/(m²AN·a);
//               90 % aller 121 untersuchten Gebäude liegen unter rund 70. Der
//               Wert sitzt damit bewusst am OBEREN Rand des Sanierten-Bandes.
//   heatLoadW — Faustwerte Verbraucherzentrale / 42watt (unsaniert 100–140,
//               teilsaniert 70–100, saniert 30–50 W/m²), im Bestand am oberen
//               Rand angesetzt, um die Wärmepumpe nicht zu unterdimensionieren.
//
// WARUM es die vierte Stufe gibt (Nutzerkritik 28.07.2026, haustechnikdialog):
// Die beste Bestandsstufe war mit 100 kWh/m²·a schlechter als die SCHLECHTESTE
// Neubaustufe (75) und trug trotzdem das Etikett „Vollsanierung". Wer sein Haus
// wirklich rundum saniert hat, konnte sich nicht abbilden und bekam über die zu
// hohe Heizlast eine zu große und zu teure Wärmepumpe gerechnet.
export type KennwertArt = "bedarf" | "verbrauch";

export const INSULATION_BESTAND: { label: string; sub: string; specKwh: number; heatLoadW: number; art: KennwertArt }[] = [
  { label: "Unsaniert", sub: "Baujahr vor ~1995, keine Dämmung", specKwh: 220, heatLoadW: 115, art: "bedarf" },
  { label: "Teilsaniert", sub: "Fenster/Dach oder Fassade erneuert", specKwh: 160, heatLoadW: 95, art: "bedarf" },
  { label: "Gut saniert", sub: "Fenster, Dach und Fassade gedämmt", specKwh: 100, heatLoadW: 60, art: "bedarf" },
  // Gemessene Endenergieverbräuche (dena-Verbrauchskennwerte-Studie, S. 25/Abb. 7)
  // — bereits die reale Größe, deshalb `verbrauch` und keine weitere Korrektur.
  { label: "Vollsaniert", sub: "Rundum gedämmt, Effizienzhaus-Niveau", specKwh: 70, heatLoadW: 45, art: "verbrauch" },
];

export const INSULATION_NEUBAU: { label: string; sub: string; specKwh: number; heatLoadW: number; art: KennwertArt }[] = [
  { label: "EnEV 2014", sub: "Gesetzlicher Mindeststandard", specKwh: 75, heatLoadW: 40, art: "bedarf" },
  { label: "KfW 55", sub: "Effizienzhaus 55", specKwh: 50, heatLoadW: 30, art: "bedarf" },
  { label: "KfW 40 oder besser", sub: "Passivhaus-Niveau", specKwh: 30, heatLoadW: 20, art: "bedarf" },
];

export const HEIZSYSTEM = [
  { id: "fbh", label: "Fußbodenheizung", sub: "Niedrige Vorlauftemperatur (35°C)" },
  { id: "hk_neu", label: "Moderne Heizkörper", sub: "Flächig, ausreichend dimensioniert (45°C)" },
  { id: "hk_alt", label: "Alte Heizkörper", sub: "Klein, hohe Vorlauftemperatur (55°C+)" },
];

export type Heizsystem = "fbh" | "hk_neu" | "hk_alt";

/** Kurzlabels für die Heizsystem-Buttons — die vollen Labels sprengen den Platz. */
export const HEIZSYSTEM_SHORT: Record<string, string> = { fbh: "Fußboden", hk_neu: "Heizkörper", hk_alt: "Alte HK" };

/** Wohnflächen-Presets der WP-Gebäudeabfrage (PV-Rechner + Empfehlungs-Flow). */
export const WP_M2_PRESETS = [100, 140, 180];
/** Grenzen der Wohnfläche — EINE Quelle für Flow und Ergebnis. Vorher ließ das
 *  Ergebnis 20–1000 m² zu, der Flow des Wärmepumpen-Rechners nur 30–500: Ein im
 *  Ergebnis eingetragener Wert von 800 wurde eingerechnet, im Flow aber
 *  abgelehnt — dieselbe Größe mit zwei Gültigkeitsbereichen. 30 m² ist die
 *  kleinste Wohnung, für die eine eigene Wärmepumpe überhaupt gerechnet wird,
 *  500 m² die Grenze, ab der es kein Einfamilienhaus mehr ist (dafür fehlt dem
 *  Modell die Mehrfamilien-Struktur, siehe Roadmap „MFH-Rechner"). */
export const WP_M2_MIN = 30;
export const WP_M2_MAX = 500;

export const WP_TYPE = [
  { id: "lwwp", label: "Luft/Wasser", sub: "Standard, günstigere Investition" },
  { id: "swwp", label: "Sole/Wasser (Erdsonde)", sub: "Höhere JAZ, teurer" },
];

/** Energieträger der Referenzheizung — bestimmt Preis, CO₂ UND Beschriftung. */
export type FuelKind = "gas" | "oil";

// Preis + CO2 aus FUEL_PRICE; der Wirkungsgrad unterscheidet die Kessel-Varianten.
// `kind` steuert zwei Dinge, die NICHT am Brennstoffpreis hängen:
//   1. die Grundgebühr — ein Gasanschluss hat einen Netz-/Zählergrundpreis,
//      ein Öltank nicht (siehe fixCostPerYear in lib/heatpump-config.ts);
//   2. die Grüngas-Pflicht — der Preispfad des GModG-Gas-Mixes ist an Biomethan
//      und Gas-Netzentgelten kalibriert und gilt so nicht für Heizöl.
// `refLabel` ist die Beschriftung der Referenzheizung im Ergebnis. Sie MUSS
// überall statt eines festen „Gas" stehen: wer Heizöl wählt und dann durchgehend
// „Gasheizung" liest, hält das zu Recht für einen Rechenfehler (Nutzerkritik
// 28.07.2026) — auch wenn Öl und Gas je Kilowattstunde Wärme fast gleich kosten.
// `bestandsanlage: true` markiert einen Kessel, den man WEITERBETREIBT — kein Gerät,
// das man heute neu einbaut. Der Unterschied ist teuer: Ein alter Kessel arbeitet mit
// 80 % Nutzungsgrad, ein neuer mit 95 %. Wird die Referenz als NEUE Heizung gerechnet
// (Anschaffung + Beimischungspflicht), darf der alte Kessel dort nicht auftauchen —
// sonst trägt die fossile Seite die Kosten des Neubaus und den Verbrauch der Altanlage,
// was den Vorteil der Wärmepumpe um rund 14.000 € aufbläht (Council-Prüfung 28.07.2026,
// zwei unabhängige Prüfer). Die Auswahl wird deshalb im UI danach gefiltert, ob eine
// Anschaffung angesetzt ist.
export const WP_FUEL_OPTIONS: {
  id: string; label: string; refLabel: string; kind: FuelKind;
  price: number; efficiency: number; co2PerKwh: number; bestandsanlage?: boolean;
}[] = [
  { id: "gas_neu", label: "Gas-Brennwert", refLabel: "Gasheizung", kind: "gas", price: FUEL_PRICE.gas.price, efficiency: 0.95, co2PerKwh: FUEL_PRICE.gas.co2PerKwh },
  { id: "oil", label: "Heizöl", refLabel: "Ölheizung", kind: "oil", price: FUEL_PRICE.oil.price, efficiency: 0.85, co2PerKwh: FUEL_PRICE.oil.co2PerKwh },
  // Die beiden Bestands-Einträge sind der Fall „Anschaffung 0" — und der heißt
  // laut Beschreibung des Feldes ausdrücklich „meine Heizung ist noch jung".
  // Bis 18.08.2026 gab es dafür nur den 30 Jahre alten Kessel mit 80 %: Wer
  // seine junge Brennwerttherme meinte, bekam den Verbrauch einer Altanlage
  // gerechnet — 8.084 € zu viel zugunsten der Wärmepumpe (140 m², teilsaniert).
  // Und für Heizöl gab es gar keinen Bestands-Eintrag, weshalb ein Öl-Haushalt
  // beim Umstellen still auf Gas rutschte (andere Grundgebühr, anderer
  // CO₂-Faktor). Die Nutzungsgrade sind KEINE neuen Zahlen: 90 % Gas / 85 % Öl
  // sind die vorhandene Heizung aus FUEL oben, dieselben, mit denen der
  // PV-Rechner seit jeher gegen die bestehende Heizung rechnet.
  //
  // OFFEN (bis 01/2027): Für Heizöl fehlt der Bestands-Eintrag noch. Er braucht
  // zwei verschiedene Nutzungsgrade (vorhanden / neu eingebaut), und die eine Zahl,
  // die das Projekt heute für Öl kennt (0,85), beschreibt die VORHANDENE Anlage —
  // sie steht derzeit an der neu eingebauten. Ein zweiter Eintrag mit derselben
  // Zahl wäre kein Fall, sondern eine Dublette. Das geht zugunsten der Wärmepumpe
  // (die Ölheizung verbrennt zu viel) — die Richtung ist bekannt und benannt.
  // Eine naheliegende Quelle wurde am 18.08.2026 geprüft und trägt den Wert NICHT
  // (Baujahr-Spalten von 2002, Teillast statt Jahresnutzungsgrad, andere
  // Bezugsgröße) — die Begründung steht ausgeschrieben in
  // scripts/waermepumpe-verify.md, damit sie niemand ein zweites Mal geht.
  // Gebraucht wird ein Jahresnutzungsgrad nach DIN V 18599-5. Bis dahin rutscht
  // ein Öl-Haushalt bei „Anschaffung 0" auf Gas — sichtbar, aber besser als eine
  // erfundene Zahl.
  { id: "gas_vorhanden", label: "Vorhandene Gastherme", refLabel: "Gasheizung", kind: "gas", price: FUEL_PRICE.gas.price, efficiency: FUEL.gas.efficiency, co2PerKwh: FUEL_PRICE.gas.co2PerKwh, bestandsanlage: true },
  { id: "gas_alt", label: "Alter Gaskessel", refLabel: "Gasheizung", kind: "gas", price: FUEL_PRICE.gas.price, efficiency: 0.80, co2PerKwh: FUEL_PRICE.gas.co2PerKwh, bestandsanlage: true },
];
