import {it,expect} from 'vitest';
import {boundaryWeatherPoint} from '../story-weather-location';
it('handles multipolygons and holes without weighting repeated vertices',()=>{expect(boundaryWeatherPoint([[[[7,50],[9,50],[9,52],[7,50]]],[[[8,51],[8,51],[8,51]]]])).toEqual({latitude:51,longitude:8});});
it('does not invent a point for absent geometry',()=>{expect(boundaryWeatherPoint(undefined)).toBeNull();expect(boundaryWeatherPoint([])).toBeNull();});
