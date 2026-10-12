import {it,expect} from 'vitest';
import {chartAnnotationCorner} from '../chart-annotation-placement';
const tile={width:100,height:50};
it('prefers the upper right when clear',()=>expect(chartAnnotationCorner(300,200,tile,[])).toBe('top-right'));
it('moves left when the rightmost positive bar reaches the top',()=>expect(chartAnnotationCorner(300,200,tile,[{x:240,y:10,width:40,height:90}])).toBe('top-left'));
it('reserves a separate row when all corners contain data',()=>expect(chartAnnotationCorner(300,200,tile,[{x:0,y:0,width:300,height:200}])).toBe('above'));
