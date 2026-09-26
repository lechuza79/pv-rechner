/**
 * The sixteen Länder — ONE list for the server (lib/mastr-regions.ts reads it)
 * and the browser menu (the Bundesland picker under "Vor Ort"). Plain JS so the
 * standalone homepage can import it without a build step.
 */
export const BUNDESLAENDER_DATEN = [
 {ags:'01',iso:'DE-SH',name:'Schleswig-Holstein',short:'SH'},
 {ags:'02',iso:'DE-HH',name:'Hamburg',short:'HH'},
 {ags:'03',iso:'DE-NI',name:'Niedersachsen',short:'NI'},
 {ags:'04',iso:'DE-HB',name:'Bremen',short:'HB'},
 {ags:'05',iso:'DE-NW',name:'Nordrhein-Westfalen',short:'NW'},
 {ags:'06',iso:'DE-HE',name:'Hessen',short:'HE'},
 {ags:'07',iso:'DE-RP',name:'Rheinland-Pfalz',short:'RP'},
 {ags:'08',iso:'DE-BW',name:'Baden-Württemberg',short:'BW'},
 {ags:'09',iso:'DE-BY',name:'Bayern',short:'BY'},
 {ags:'10',iso:'DE-SL',name:'Saarland',short:'SL'},
 {ags:'11',iso:'DE-BE',name:'Berlin',short:'BE'},
 {ags:'12',iso:'DE-BB',name:'Brandenburg',short:'BB'},
 {ags:'13',iso:'DE-MV',name:'Mecklenburg-Vorpommern',short:'MV'},
 {ags:'14',iso:'DE-SN',name:'Sachsen',short:'SN'},
 {ags:'15',iso:'DE-ST',name:'Sachsen-Anhalt',short:'ST'},
 {ags:'16',iso:'DE-TH',name:'Thüringen',short:'TH'},
];
