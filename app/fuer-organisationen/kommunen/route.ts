import {readFileSync} from 'node:fs';
import {join} from 'node:path';

// The reviewed composition is built from the original shared components.
export const dynamic = 'force-static';
export function GET(){
 return new Response(readFileSync(join(process.cwd(),'public/kommunen/index.html'),'utf8'),{headers:{'Content-Type':'text/html; charset=utf-8'}});
}
