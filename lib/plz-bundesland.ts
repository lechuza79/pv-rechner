// PLZ-Prefix (2 Stellen) → Bundesland-Kürzel. Shared lookup, used by the PVGIS
// yield route and the cooling-degree route. Single source of truth so the two
// never drift apart.
export const PLZ_BL: Record<string, string> = {
  "01": "SN", "02": "SN", "03": "BB", "04": "SN", "06": "ST", "07": "TH",
  "08": "SN", "09": "SN", "10": "BE", "12": "BE", "13": "BE", "14": "BB",
  "15": "BB", "16": "BB", "17": "MV", "18": "MV", "19": "MV", "20": "HH",
  "21": "NI", "22": "HH", "23": "SH", "24": "SH", "25": "SH", "26": "NI",
  "27": "NI", "28": "HB", "29": "NI", "30": "NI", "31": "NI", "32": "NW",
  "33": "NW", "34": "HE", "35": "HE", "36": "HE", "37": "NI", "38": "NI",
  "39": "ST", "40": "NW", "41": "NW", "42": "NW", "44": "NW", "45": "NW",
  "46": "NW", "47": "NW", "48": "NW", "49": "NI", "50": "NW", "51": "NW",
  "52": "NW", "53": "NW", "54": "RP", "55": "RP", "56": "RP", "57": "NW",
  "58": "NW", "59": "NW", "60": "HE", "61": "HE", "63": "HE", "64": "HE",
  "65": "HE", "66": "SL", "67": "RP", "68": "BW", "69": "BW", "70": "BW",
  "71": "BW", "72": "BW", "73": "BW", "74": "BW", "75": "BW", "76": "BW",
  "77": "BW", "78": "BW", "79": "BW", "80": "BY", "81": "BY", "82": "BY",
  "83": "BY", "84": "BY", "85": "BY", "86": "BY", "87": "BY", "88": "BW",
  "89": "BW", "90": "BY", "91": "BY", "92": "BY", "93": "BY", "94": "BY",
  "95": "BY", "96": "BY", "97": "BY", "98": "TH", "99": "TH",
};

/** Bundesland-Kürzel aus einer (vollständigen oder Prefix-)PLZ, oder null. */
export function bundeslandFromPlz(plz: string | null | undefined): string | null {
  if (!plz) return null;
  return PLZ_BL[plz.slice(0, 2)] ?? null;
}
