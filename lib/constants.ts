// ─── Zeitkonstanten ──────────────────────────────────────────────────────────
export const YEAR = 2026;
export const YEARS = 25;
export const DEGRAD = 0.005;

// Saisonaler Verbrauchsfaktor (BDEW Standardlastprofil H0)
// Winter ~17% über Durchschnitt, Sommer ~15% unter
export const CONSUMPTION_MONTHLY = [1.17, 1.05, 1.08, 0.97, 0.93, 0.84, 0.87, 0.87, 0.91, 1.00, 1.13, 1.17];

// Gas/Öl-Referenzkosten für WP-Vergleich
export const FUEL: Record<string, { label: string; price: number; efficiency: number; co2PerKwh: number }> = {
  gas: { label: "Gas", price: 0.12, efficiency: 0.90, co2PerKwh: 0.20 },   // 12 ct/kWh, 90% Kessel, 200g CO2/kWh
  oil: { label: "Heizöl", price: 0.10, efficiency: 0.85, co2PerKwh: 0.266 }, // 10 ct/kWh, 85% Kessel, 266g CO2/kWh
};

// ─── Optionen für den Rechner-Flow ──────────────────────────────────────────
export const ANLAGEN = [
  { kwp: 5, label: "5 kWp", sub: "Klein · ~12 Module", icon: "sun" },
  { kwp: 8, label: "8 kWp", sub: "Mittel · ~19 Module", icon: "sun" },
  { kwp: 10, label: "10 kWp", sub: "Standard · ~24 Module", icon: "sun" },
  { kwp: 15, label: "15 kWp", sub: "Groß · ~36 Module", icon: "sun" },
];

export const SPEICHER = [
  { kwh: 0, label: "Kein Speicher", sub: "Nur Direktverbrauch", icon: null },
  { kwh: 5, label: "5 kWh", sub: "Kompakt", icon: "battery" },
  { kwh: 10, label: "10 kWh", sub: "Standard", icon: "battery" },
  { kwh: 15, label: "15 kWh", sub: "Groß", icon: "battery" },
];

export const PERSONEN = [
  { label: "1", verbrauch: 1800 },
  { label: "2", verbrauch: 2800 },
  { label: "3–4", verbrauch: 3800 },
  { label: "5+", verbrauch: 5000 },
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

export const SCENARIOS = [
  { id: "pessimistic", label: "Pessimistisch", color: "#EF4444", strom: 0.01, evDelta: -5 },
  { id: "realistic", label: "Realistisch", color: "#00D950", strom: 0.03, evDelta: 0 },
  { id: "optimistic", label: "Optimistisch", color: "#1365EA", strom: 0.05, evDelta: 5 },
];

export const SHARE_KEYS = ["a", "s", "p", "n", "wp", "ea", "k", "ev", "st", "ei", "eia", "er", "ck", "km", "plz", "flow", "ht", "da", "bl"];

// ─── Empfehlungs-Flow ───────────────────────────────────────────────────────
export const HAUSTYPEN = [
  { label: "Reihenhaus", sub: "Schmal, begrenzte Dachfläche", footprint: 50 },
  { label: "Doppelhaushälfte", sub: "Halbes Dach nutzbar", footprint: 70 },
  { label: "Einfamilienhaus", sub: "Freistehend, gute Dachfläche", footprint: 100 },
  { label: "Großes EFH", sub: "Freistehend, große Dachfläche", footprint: 150 },
];

export const DACHARTEN = [
  { label: "Satteldach", sub: "Klassisch, eine Dachseite", factor: 0.40 },
  { label: "Flachdach", sub: "Aufständerung möglich", factor: 0.65 },
  { label: "Walmdach", sub: "4 Seiten, weniger Fläche", factor: 0.30 },
  { label: "Pultdach", sub: "Einseitig geneigt, sehr gut", factor: 0.55 },
];
