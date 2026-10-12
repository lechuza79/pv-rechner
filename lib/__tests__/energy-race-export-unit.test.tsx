import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import WorldCapacityRaceWidget from '../../components/energy/WorldCapacityRaceWidget';
import WorldElectricityRaceWidget from '../../components/energy/WorldElectricityRaceWidget';
describe('energy race export metadata',()=>{
 it('keeps capacity and generation units on their shared frame instead of inheriting currency',()=>{
  for(const [html,unit] of [[renderToStaticMarkup(<WorldCapacityRaceWidget/>),'GW'],[renderToStaticMarkup(<WorldElectricityRaceWidget autoplay={false}/>),'TWh']]){
   expect(html).toContain(`in ${unit}`);
   expect(html).not.toContain('in €');
  }
 });
});
