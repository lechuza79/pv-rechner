import {it,expect} from 'vitest';
import {compareContactSelection as compare} from '../contact-selection-comparison';
it('calls losing a proven personal contact worse even when there are more new addresses',()=>{expect(compare(['person@a.de'],['presse@a.de','klima@a.de'],['person@a.de','presse@a.de','klima@a.de'],true).verdict).toBe('worse');});
it('does not call unselected old addresses incorrect or gains proof of whole-case superiority',()=>{expect(compare(['old@a.de'],['new@a.de'],['new@a.de'],true)).toMatchObject({verdict:'unresolved',lost:[],unresolvedBaseline:['old@a.de']});});
it('compares retained contacts and real gains with the same evidence standard',()=>{expect(compare(['old@a.de'],['old@a.de','new@a.de'],['old@a.de','new@a.de'],true)).toMatchObject({verdict:'better',gained:['new@a.de'],retained:['old@a.de'],lost:[]});});
it('cannot approve an incomplete case or an unsupported selection',()=>{expect(compare([],['new@a.de'],['new@a.de'],false).verdict).toBe('unresolved');expect(compare([],['new@a.de'],[],true).verdict).toBe('unresolved');});
