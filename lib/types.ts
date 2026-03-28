// Alle editierbaren Parameter einer Berechnung
export interface CalcParams {
  anlage: number;        // 0–4 (4 = custom)
  customKwp: number;     // 1–50
  speicher: number;      // 0–3
  personen: number;      // 0–3
  nutzung: number;       // 0–3
  wp: string;            // "nein" | "geplant" | "ja"
  ea: string;            // "nein" | "geplant" | "ja"
  eaKm: number;          // 1000–50000
  oKosten: number | null;
  oEv: number | null;
  oStrom: number;        // 0.05–1.0
  oEinsp: number | null;  // 0–20, null = auto (weighted EEG rate)
  einspeisungModus: "aus" | "teil" | "voll";
  oErtrag: number;       // 700–1400
  plz: string;
  fuelType: string;      // "gas" | "oil"
  // Empfehlungs-Flow Felder
  flowType: "manual" | "empfehlung";
  haustyp: number | null;   // 0–3 (Index in HAUSTYPEN)
  dachart: number | null;   // 0–3 (Index in DACHARTEN)
  budgetLimit: number | null;
}

// DB-Zeile für gespeicherte Berechnungen
export interface CalculationRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  // Inputs
  anlage: number;
  custom_kwp: number | null;
  speicher: number;
  personen: number;
  nutzung: number;
  wp: string;
  ea: string;
  ea_km: number | null;
  // Overrides
  o_kosten: number | null;
  o_ev: number | null;
  o_strom: number;
  o_einsp: number | null;
  einspeisung_modus: string;
  o_ertrag: number;
  plz: string | null;
  fuel_type: string;
  // Empfehlungs-Flow
  flow_type: string;
  haustyp: number | null;
  dachart: number | null;
  budget_limit: number | null;
  // Berechnete Werte (für Dashboard-Anzeige)
  kwp: number;
  amortisation_jahre: number | null;
  rendite_25j: number | null;
  // Metadata
  created_at: string;
  updated_at: string;
}

// CalcParams → DB-Insert-Daten
export function paramsToRow(
  params: CalcParams,
  computed: { kwp: number; amortisationJahre: number | null; rendite25j: number | null }
): Omit<CalculationRow, "id" | "user_id" | "created_at" | "updated_at" | "name" | "description"> {
  return {
    anlage: params.anlage,
    custom_kwp: params.anlage === 4 ? params.customKwp : null,
    speicher: params.speicher,
    personen: params.personen,
    nutzung: params.nutzung,
    wp: params.wp,
    ea: params.ea,
    ea_km: params.ea !== "nein" ? params.eaKm : null,
    o_kosten: params.oKosten,
    o_ev: params.oEv,
    o_strom: params.oStrom,
    o_einsp: params.oEinsp,
    einspeisung_modus: params.einspeisungModus,
    o_ertrag: params.oErtrag,
    plz: params.plz || null,
    fuel_type: params.fuelType,
    flow_type: params.flowType,
    haustyp: params.haustyp,
    dachart: params.dachart,
    budget_limit: params.budgetLimit,
    kwp: computed.kwp,
    amortisation_jahre: computed.amortisationJahre,
    rendite_25j: computed.rendite25j,
  };
}

// DB-Row → CalcParams (für Laden)
export function rowToParams(row: CalculationRow): CalcParams {
  return {
    anlage: row.anlage,
    customKwp: row.custom_kwp ?? 12,
    speicher: row.speicher,
    personen: row.personen,
    nutzung: row.nutzung,
    wp: row.wp,
    ea: row.ea,
    eaKm: row.ea_km ?? 15000,
    oKosten: row.o_kosten,
    oEv: row.o_ev,
    oStrom: row.o_strom,
    oEinsp: row.o_einsp,
    einspeisungModus: (row.einspeisung_modus === "voll" ? "voll" : row.einspeisung_modus === "aus" ? "aus" : "teil") as "aus" | "teil" | "voll",
    oErtrag: row.o_ertrag,
    plz: row.plz ?? "",
    fuelType: row.fuel_type,
    flowType: (row.flow_type === "empfehlung" ? "empfehlung" : "manual") as "manual" | "empfehlung",
    haustyp: row.haustyp ?? null,
    dachart: row.dachart ?? null,
    budgetLimit: row.budget_limit ?? null,
  };
}

// CalcParams → initialParams-Format (wie Share-URL-Params)
export function paramsToInitial(params: CalcParams): Record<string, string> {
  const p: Record<string, string> = {
    a: String(params.anlage),
    s: String(params.speicher),
    p: String(params.personen),
    n: String(params.nutzung),
    wp: params.wp,
    ea: params.ea,
    st: String(params.oStrom),
    eia: params.einspeisungModus === "voll" ? "2" : params.einspeisungModus === "aus" ? "0" : "1",
    er: String(params.oErtrag),
  };
  if (params.anlage === 4) p.ck = String(params.customKwp);
  if (params.oKosten !== null) p.k = String(params.oKosten);
  if (params.oEinsp !== null) p.ei = String(params.oEinsp);
  if (params.oEv !== null) p.ev = String(params.oEv);
  if (params.ea !== "nein") p.km = String(params.eaKm);
  if (params.plz) p.plz = params.plz;
  if (params.flowType === "empfehlung") {
    p.flow = "emp";
    if (params.haustyp !== null) p.ht = String(params.haustyp);
    if (params.dachart !== null) p.da = String(params.dachart);
    if (params.budgetLimit !== null) p.bl = String(params.budgetLimit);
  }
  return p;
}
