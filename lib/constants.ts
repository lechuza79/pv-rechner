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
  { id: "realistic", label: "Realistisch", color: "#00D950", strom: 0.03, evDelta: 0,
    explain: "Mittlere Annahme: Der Strompreis steigt etwa wie im langjährigen Schnitt (+3 %/Jahr)." },
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
