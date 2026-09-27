import {afterEach,expect,it,vi} from 'vitest';
import {videoFormat} from '../race-video';
afterEach(()=>vi.unstubAllGlobals());
it('prefers H.264 MP4 even when WebM is supported',()=>{
 vi.stubGlobal('window',{});
 vi.stubGlobal('MediaRecorder',{isTypeSupported:()=>true});
 expect(videoFormat(true)).toEqual({mime:'video/mp4;codecs=avc1.42E01E',ext:'mp4'});
});
it('does not disguise WebM as an MP4 download',()=>{
 vi.stubGlobal('window',{});
 vi.stubGlobal('MediaRecorder',{isTypeSupported:(mime:string)=>mime.startsWith('video/webm')});
 expect(videoFormat(true)).toBeNull();
 expect(videoFormat()?.ext).toBe('webm');
});
