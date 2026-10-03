import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { hasDimensions, sceneTurbines, selectWindTurbines, windBounds, type WindTurbine } from "../wind-map";
import { interiorPoint, polygons, regionProjection, type RegionGeometry } from "../region-perspektive";

const feature:RegionGeometry={properties:{id:"test",name:"Test"},geometry:{type:"Polygon",coordinates:[[[8,51],[8.1,51],[8.1,51.1],[8,51.1],[8,51]]]}};
const turbine=(lon:number|null,lat:number|null,extra:Partial<WindTurbine>={}):WindTurbine=>({mastr_nr:"one",region_id:"different municipality",status:"35",lage:"Windkraft an Land",lat,lon,nabenhoehe_m:100,rotor_m:80,brutto_kw:2000,hersteller:null,typ:null,windpark:null,inbetriebnahme:null,...extra});
describe("wind map coordinate selection",()=>{
  it("uses location, never register municipality, and excludes invalid/offshore/inactive records",()=>{
    const values=[turbine(8.05,51.05),turbine(9,51,{region_id:"test"}),turbine(null,51),turbine(8,null),turbine(8.05,51.05,{status:"38"}),turbine(8.05,51.05,{lage:"Windkraft auf See"})];
    expect(selectWindTurbines(feature,values)).toEqual([values[0]]);
  });
  it("includes 450 metres, excludes 550 metres, covers the exact boundary",()=>{
    const metresPerDegree=111195.0802335;
    const values=[turbine(8.05,51.1+450/metresPerDegree),turbine(8.05,51.1+550/metresPerDegree),turbine(8.05,51.1)];
    expect(selectWindTurbines(feature,values)).toEqual([values[0],values[2]]);
    expect(selectWindTurbines(feature,values,0)).toEqual([values[2]]);
    const b=windBounds(feature);expect(b.maxLat).toBeGreaterThan(values[0].lat!);expect(b.maxLat).toBeLessThan(values[1].lat!);
  });
  it("keeps holes empty except the positive boundary buffer",()=>{
    const hole:RegionGeometry={...feature,geometry:{type:"Polygon",coordinates:[polygons(feature)[0][0],[[8.02,51.02],[8.08,51.02],[8.08,51.08],[8.02,51.08],[8.02,51.02]]]}};
    expect(selectWindTurbines(hole,[turbine(8.05,51.05)])).toEqual([]);
  });
  it("selects the real Fehmarn outline and all parts of a multipart outline",()=>{
    const data=JSON.parse(readFileSync("public/geo/gemeinden/01055.geo.json","utf8"));
    const fehmarn=data.features.find((f:RegionGeometry)=>f.properties.id==="01055046") as RegionGeometry;
    // The checked-in simplified Fehmarn outline has only one polygon.
    expect(polygons(fehmarn).length).toBeGreaterThanOrEqual(1);
    const values=polygons(fehmarn).map((poly,i)=>{const [lon,lat]=interiorPoint(poly);return turbine(lon,lat,{mastr_nr:String(i)});});
    expect(selectWindTurbines(fehmarn,values)).toEqual(values);
    const multi:RegionGeometry={...feature,geometry:{type:"MultiPolygon",coordinates:[polygons(feature)[0],polygons(feature)[0].map(r=>r.map(([x,y])=>[x+1,y]))]}};
    const parts=[turbine(8.05,51.05),turbine(9.05,51.05),turbine(8.5,51.05)];
    expect(selectWindTurbines(multi,parts)).toEqual(parts.slice(0,2));
  });
  it("uses identical horizontal and vertical metre scale and never invents missing dimensions",()=>{
    const p=regionProjection([feature]);const t=sceneTurbines(feature,[turbine(8.05,51.05),turbine(8.05,51.05,{nabenhoehe_m:200,rotor_m:160}),turbine(8.05,51.05,{rotor_m:null})]);
    const a=p.groundPoint([8.05,51.05]),b=p.groundPoint([8.05,51.05+100/111195.0802335]);
    expect(t[0].hub).toBeCloseTo(Math.abs(b[1]-a[1]),6);
    expect(t[1].hub).toBe(t[0].hub!*2);expect(t[1].rotor).toBe(t[0].rotor!*2);
    expect(t[2].hub).toBeNull();expect(t[2].rotor).toBeNull();expect(hasDimensions(turbine(8,51,{rotor_m:0}))).toBe(false);
  });
});

it("uses the detailed official boundary for the two disputed edge locations",()=>{
  const precise=JSON.parse(readFileSync("public/geo/wind-boundaries/05774040.geo.json","utf8"));
  const points=[turbine(8.830882,51.538748,{mastr_nr:"SEE932024973834"}),turbine(8.835972,51.53862,{mastr_nr:"SEE977961319611"})];
  expect(selectWindTurbines(precise,points,0).map(t=>t.mastr_nr)).toEqual(["SEE932024973834"]);
});

it("matches the independently audited official-boundary selection for every captured register coordinate",()=>{
 const precise=JSON.parse(readFileSync("public/geo/wind-boundaries/05774040.geo.json","utf8"));
 const {rows}=JSON.parse(readFileSync("docs/windraeder-3d-grenzpruefung.json","utf8"));
 expect(selectWindTurbines(precise,rows,0).map(t=>t.mastr_nr).sort()).toEqual(rows.filter((t:WindTurbine&{officialInside:boolean})=>t.officialInside).map((t:WindTurbine)=>t.mastr_nr).sort());
});
