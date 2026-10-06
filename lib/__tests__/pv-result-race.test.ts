import { describe, expect, it } from "vitest";
import { calc } from "../calc";
import { pvResultRace } from "../pv-result-race";
import { electricityPriceAtYear } from "../electricity-projection";

const monthly = [25,45,80,110,130,135,135,115,85,60,40,30];
describe("PV result race adopts the calculation ledger", () => {
  for (const profile of [null, monthly]) for (const batteryReplace of [0, 4500]) {
    it(`reconciles every annual balance, monthly=${!!profile}, replacement=${batteryReplace}`, () => {
      const result = calc({kwp:8,kosten:15000,strompreis:0.31,eigenverbrauch:45,einspeisung:7.7,stromSteigerung:0.014,ertragKwp:990,monthly:profile,batteryReplace});
      const race = pvResultRace(result,4500,0.31,0.014,2026,monthly);
      expect(race.solar[0]).toBe(15000);
      let grid = 0;
      for(let year=1;year<=25;year++) {
        grid += 4500 * electricityPriceAtYear(0.31,year-1,0.014);
        const day=(Date.UTC(2026+year,0,1)-Date.UTC(2026,0,1))/86400000;
        expect(race.grid[day]).toBeCloseTo(grid,5);
        expect(race.grid[day]-race.solar[day]).toBeCloseTo(result.years[year].kum,5);
      }
      expect(race.grid[race.days]-race.solar[race.days]).toBeCloseTo(result.total,8);
      expect(race.dateAt(race.days)).toEqual({jahr:2050,monat:11,tag:31});
      expect(race.firstDay).toHaveLength(301);
      expect([...race.solar,...race.grid].every(Number.isFinite)).toBe(true);
    });
  }
  it("keeps zero generation and negative benefit finite",()=>{
    const result=calc({kwp:0,kosten:5000,strompreis:0,eigenverbrauch:0,einspeisung:0,stromSteigerung:0,ertragKwp:0,monthly:null});
    const race=pvResultRace(result,0,0,0,2028,[]);
    expect(race.solar[race.days]).toBe(5000);
    expect(race.grid[race.days]).toBe(0);
  });
});
