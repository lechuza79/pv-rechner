import {it,expect} from 'vitest';
import {commercialCluster,commercialValueScenarios} from '../story-commercial-clusters';
const roof={art:'853',usage:'714',feedInMode:'689'};
it('keeps declared full feed-in above business assumptions',()=>{
 expect(commercialCluster({...roof,usage:'715',feedInMode:'688'}).cluster).toBe('full-feed-in');
 expect(commercialValueScenarios('full-feed-in',1000,.08,.25).cases.every(c=>c.selfConsumedKwh===0&&c.valueEuro===80)).toBe(true);
});
it('does not promote names or roof size into verified business evidence',()=>{
 expect(commercialCluster({...roof,siteName:'PV Supermarkt'})).toMatchObject({cluster:'commerce-unspecified',reviewHint:'food-retail'});
 expect(commercialCluster({...roof,verifiedActivity:'food-retail'}).cluster).toBe('food-retail');
 expect(commercialCluster({...roof,usage:'715',siteName:'PV Supermarkt'}).cluster).toBe('industry');
});
it('keeps a partial-feed-in solar park separate from a full-feed-in plant',()=>{
 expect(commercialCluster({...roof,art:'852'}).cluster).toBe('ground-mounted');
});
it('conserves energy and does not assume a higher self-use always means more money',()=>{
 const result=commercialValueScenarios('industry',1000,.4,.2);
 for(const c of result.cases)expect(c.selfConsumedKwh+c.feedInKwh).toBe(1000);
 expect(result.cases[0].valueEuro).toBeGreaterThan(result.cases[2].valueEuro);
 expect(result.valueMin).toBe(result.cases[2].valueEuro);
});
