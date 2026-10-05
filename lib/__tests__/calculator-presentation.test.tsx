import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {tokens} from '../theme';

describe('Reusable calculator presentation',()=>{
 it('resolves font roles when Next font variables are absent',()=>{
  for(const role of ['--font-heading','--font-text','--font-chart-number','--font-display','--font-mono'] as const){
   expect(tokens[role]).not.toMatch(/var\([^,)]+\)/);
  }
 });
 it('shares complete result and consumer sections instead of recreating their cards',()=>{
  for(const file of ['app/(site)/photovoltaik-rechner/rechner.tsx','docs/design/kommunen/CalculatorShowcase.tsx']){
   const source=readFileSync(file,'utf8');
   expect(source).toContain('<PvResultOverview');
   expect(source).toContain('<PvHouseholdQuestion');
   expect(source).toContain('<PvConsumerSection');
   expect(source).not.toContain('<StatCard');
   expect(source).not.toContain('<ResultChoiceHeader');
  }
 });
});
