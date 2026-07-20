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
export const FUEL_PRICE: Record<"gas" | "oil", { price: number; co2PerKwh: number }> = {
  gas: { price: 0.11, co2PerKwh: 0.20 },   // 11 ct/kWh, 200 g CO2/kWh
  oil: { price: 0.10, co2PerKwh: 0.266 },  // 10 ct/kWh, 266 g CO2/kWh
};

// Gas/Öl-Referenzkosten für WP-Vergleich (Preis + CO2 aus FUEL_PRICE)
export const FUEL: Record<string, { label: string; price: number; efficiency: number; co2PerKwh: number }> = {
  gas: { label: "Gas", price: FUEL_PRICE.gas.price, efficiency: 0.90, co2PerKwh: FUEL_PRICE.gas.co2PerKwh },   // 90% Kessel
  oil: { label: "Heizöl", price: FUEL_PRICE.oil.price, efficiency: 0.85, co2PerKwh: FUEL_PRICE.oil.co2PerKwh }, // 85% Kessel
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
  { id: "pessimistic", label: "Pessimistisch", color: "#EF4444", strom: 0.01, evDelta: -5,
    explain: "Vorsichtig gerechnet: Der Strompreis steigt nur langsam (+1 %/Jahr) — dein selbst genutzter Solarstrom spart dann entsprechend weniger." },
  { id: "realistic", label: "Realistisch", color: "#00D950", strom: 0.02, evDelta: 0,
    explain: "Mittlere Annahme: Der Strompreis steigt moderat (+2 %/Jahr), wie die aktuellen Prognosen erwarten." },
  { id: "optimistic", label: "Optimistisch", color: "#1365EA", strom: 0.05, evDelta: 5,
    explain: "Günstige Entwicklung: Steigt der Strompreis kräftig (+5 %/Jahr), lohnt sich jede selbst genutzte Kilowattstunde stärker." },
];

export const SHARE_KEYS = ["a", "s", "p", "n", "wp", "ea", "k", "ev", "st", "ei", "eia", "er", "ck", "km", "plz", "flow", "ht", "da", "bl", "foe", "vb", "kl", "km2", "klr", "klwh", "wf", "wi", "wh", "wht", "sc"];

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

export const DACHARTEN = [
  { label: "Satteldach", sub: "Klassisch, eine Dachseite", factor: 0.40 },
  { label: "Flachdach", sub: "Aufständerung möglich", factor: 0.65 },
  { label: "Walmdach", sub: "4 Seiten, weniger Fläche", factor: 0.30 },
  { label: "Pultdach", sub: "Einseitig geneigt, sehr gut", factor: 0.55 },
];

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

export const INSULATION_BESTAND = [
  { label: "Unsaniert", sub: "Baujahr vor ~1995, keine Dämmung", specKwh: 220 },
  { label: "Teilsaniert", sub: "Fenster/Dach oder Fassade erneuert", specKwh: 160 },
  { label: "Gut saniert", sub: "Vollsanierung, moderner Standard", specKwh: 100 },
];

export const INSULATION_NEUBAU = [
  { label: "EnEV 2014", sub: "Gesetzlicher Mindeststandard", specKwh: 75 },
  { label: "KfW 55", sub: "Effizienzhaus 55", specKwh: 50 },
  { label: "KfW 40 oder besser", sub: "Passivhaus-Niveau", specKwh: 30 },
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

export const WP_TYPE = [
  { id: "lwwp", label: "Luft/Wasser", sub: "Standard, günstigere Investition" },
  { id: "swwp", label: "Sole/Wasser (Erdsonde)", sub: "Höhere JAZ, teurer" },
];

// Preis + CO2 aus FUEL_PRICE; nur der Wirkungsgrad unterscheidet die Varianten.
export const WP_FUEL_OPTIONS = [
  { id: "gas_neu", label: "Gas-Brennwert", price: FUEL_PRICE.gas.price, efficiency: 0.95, co2PerKwh: FUEL_PRICE.gas.co2PerKwh },
  { id: "gas_alt", label: "Alter Gaskessel", price: FUEL_PRICE.gas.price, efficiency: 0.80, co2PerKwh: FUEL_PRICE.gas.co2PerKwh },
  { id: "oil", label: "Heizöl", price: FUEL_PRICE.oil.price, efficiency: 0.85, co2PerKwh: FUEL_PRICE.oil.co2PerKwh },
];
