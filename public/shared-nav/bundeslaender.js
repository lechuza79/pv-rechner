/**
 * The sixteen Länder — ONE list for the server (lib/mastr-regions.ts reads it)
 * and the browser menu (the Bundesland picker under "Vor Ort"). Plain JS so the
 * standalone homepage can import it without a build step. `slug` is the
 * atlas path segment (slugify of the name, held against it by a test).
 */
export const BUNDESLAENDER_DATEN = [
 {ags:'01',iso:'DE-SH',name:'Schleswig-Holstein',slug:'schleswig-holstein',short:'SH'},
 {ags:'02',iso:'DE-HH',name:'Hamburg',slug:'hamburg',short:'HH'},
 {ags:'03',iso:'DE-NI',name:'Niedersachsen',slug:'niedersachsen',short:'NI'},
 {ags:'04',iso:'DE-HB',name:'Bremen',slug:'bremen',short:'HB'},
 {ags:'05',iso:'DE-NW',name:'Nordrhein-Westfalen',slug:'nordrhein-westfalen',short:'NW'},
 {ags:'06',iso:'DE-HE',name:'Hessen',slug:'hessen',short:'HE'},
 {ags:'07',iso:'DE-RP',name:'Rheinland-Pfalz',slug:'rheinland-pfalz',short:'RP'},
 {ags:'08',iso:'DE-BW',name:'Baden-Württemberg',slug:'baden-wuerttemberg',short:'BW'},
 {ags:'09',iso:'DE-BY',name:'Bayern',slug:'bayern',short:'BY'},
 {ags:'10',iso:'DE-SL',name:'Saarland',slug:'saarland',short:'SL'},
 {ags:'11',iso:'DE-BE',name:'Berlin',slug:'berlin',short:'BE'},
 {ags:'12',iso:'DE-BB',name:'Brandenburg',slug:'brandenburg',short:'BB'},
 {ags:'13',iso:'DE-MV',name:'Mecklenburg-Vorpommern',slug:'mecklenburg-vorpommern',short:'MV'},
 {ags:'14',iso:'DE-SN',name:'Sachsen',slug:'sachsen',short:'SN'},
 {ags:'15',iso:'DE-ST',name:'Sachsen-Anhalt',slug:'sachsen-anhalt',short:'ST'},
 {ags:'16',iso:'DE-TH',name:'Thüringen',slug:'thueringen',short:'TH'},
];
