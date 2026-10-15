import {inflateRawSync} from 'node:zlib';
import {parseDashboardConfiguration} from './widget-dashboard';

/** Bound both compressed input and output before validating untrusted embed data. */
export function decodeDashboardConfiguration(value:string){
  if(!value.startsWith('z1.'))return parseDashboardConfiguration(value);
  const encoded=value.slice(3);
  if(encoded.length>8000||!encoded.length||!/^[a-zA-Z0-9_-]+$/.test(encoded))throw new Error('Invalid dashboard encoding');
  const raw=inflateRawSync(Buffer.from(encoded,'base64url'),{maxOutputLength:72000}).toString('utf8');
  return parseDashboardConfiguration(raw);
}
