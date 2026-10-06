import {describe,it,expect} from 'vitest';
import {distanceBlur,createFlightLensFocus} from '../../components/landkreis/camera-depth-of-field';

describe('camera depth of field',()=>{
  it('keeps the destination and foreground sharp with a generous focus zone',()=>{
    for(const depth of [1,60,100,125])expect(distanceBlur(depth,100)).toBe(0);
  });
  it('softens only the background and caps distant pin/landscape blur',()=>{
    expect(distanceBlur(175,100)).toBeCloseTo(1);
    expect(distanceBlur(225,100)).toBe(2);
    expect(distanceBlur(4000,100)).toBe(2);
    expect(distanceBlur(350,200)).toBeCloseTo(distanceBlur(175,100));
  });
  it('keeps distant pins and turbines soft when steering switches to the next town',()=>{
    const lens=createFlightLensFocus();
    expect(lens(60,60,false)).toBe(60);
    for(const destination of [200,280,500,120]){
      const focus=lens(60,destination,true);
      expect(distanceBlur(150,focus)).toBe(2);
      expect(distanceBlur(60,focus)).toBe(0);
    }
    expect(lens(60,80,false)).toBe(80);
    expect(lens(80,700,true)).toBe(80);
  });
});
