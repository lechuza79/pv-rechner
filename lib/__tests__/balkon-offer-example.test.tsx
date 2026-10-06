import React from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import BalkonAngebot from '../../components/BalkonAngebot';
import { DEFAULT_BALKON_CONFIG as CFG } from '../balkon-config';
import type { BalkonKatalog } from '../use-balkon-angebote';
const basis = {orientationId:CFG.defaultOrientation,presenceId:CFG.defaultPresence,haushaltKwh:3800,specificYield:CFG.specificYield,stromPrice:CFG.stromPrice};
const katalog: BalkonKatalog = {fehlgeschlagen:false,daten:{abgerufenIso:'2026-09-01T12:00:00Z',angebote:[{id:'test',haendler:'solakon',haendlerName:'Solakon',produkt:'onBasic',moduleWp:1000,inverterW:800,speicherKwh:0,preis:499,streichpreis:null,lieferbar:true,url:'https://www.solakon.de/products/onbasic',bildUrl:null,variante:'Standard'}]}};
it('labels editorial assumptions and preserves the actual product and partner disclosure',()=>{
 const html=renderToString(<BalkonAngebot basis={basis} katalog={katalog} example={{description:'3.800 kWh Haushaltsstrom, Südbalkon.'}}/>);
 expect(html).toContain('Beispielrechnung:');
 expect(html).toContain('3.800 kWh Haushaltsstrom, Südbalkon.');
 expect(html).not.toContain('mit deinen Angaben durchgerechnet');
 expect(html).toContain('Partnerprogramm');
 expect(html).toContain('sponsored');
 expect(html).toContain('Preisstand');
 expect(html).toContain('onBasic');
});
it('keeps a failed catalogue visible in article embeds',()=>{
 const html=renderToString(<BalkonAngebot basis={basis} katalog={{daten:null,fehlgeschlagen:true}} example={{description:'Beispielhaushalt'}}/>);
 expect(html).toContain('role="status"');
 expect(html).toContain('konnten gerade nicht geladen');
});
