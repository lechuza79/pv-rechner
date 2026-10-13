import {parseGv100} from './gemeindeverband';
import badBreisigSource from './verband-bad-breisig-source.json';
import weilerbachSource from './verband-weilerbach-source.json';

export const REFERENCE_ASSOCIATION = '071315003';
export const REFERENCE_SLUG = 'bad-breisig';
export const RELEASED_ASSOCIATIONS = {'bad-breisig':'071315003',weilerbach:'073355009'} as const;
export type AssociationSlug = keyof typeof RELEASED_ASSOCIATIONS;
export function isAssociationSlug(value:string):value is AssociationSlug { return Object.hasOwn(RELEASED_ASSOCIATIONS,value); }

export function associationFromGv100(text:string, slug:AssociationSlug=REFERENCE_SLUG) {
  const associationId=RELEASED_ASSOCIATIONS[slug];
  const rows=[...parseGv100(text).values()];
  const members=rows.filter(row=>row.verbandKey===associationId);
  const dates=new Set(text.split(/\r?\n/).filter(line=>/^(50|60)/.test(line)).map(line=>line.slice(2,10)));
  if(!members.length || dates.size!==1 || members.some(row=>row.verbandType!=='53'||!row.verbandName)
    || new Set(members.map(row=>row.ags)).size!==members.length
    || text.split(/\r?\n/).filter(line=>line.startsWith('60')).length!==rows.length) {
    throw new Error('Invalid official association membership');
  }
  const date=[...dates][0];
  return {id:associationId,name:`Verbandsgemeinde ${members[0].verbandName}`,slug,
    districtId:associationId.slice(0,5),members:members.map(row=>row.ags).sort(),
    asOf:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`};
}

/** Refuse incomplete or ambiguous register membership; never show a partial group. */
export function selectAssociationMembers<T extends {region_id:string;parent_region_id:string|null}>(rows:T[], members:readonly string[], districtId:string):T[] {
  const ids=new Set(members);
  const selected=rows.filter(row=>ids.has(row.region_id));
  if(selected.length!==ids.size || new Set(selected.map(row=>row.region_id)).size!==ids.size
    || selected.some(row=>row.parent_region_id!==districtId))throw new Error('Association membership incomplete in region register');
  return selected;
}

export const associationPath=(districtPath:string,slug:string=REFERENCE_SLUG)=>`${districtPath}/verbandsgemeinden/${slug}`;

/** Bundled verbatim official records; usable by the publisher and web server. */
export function releasedAssociations() {
 return [associationFromGv100(badBreisigSource,'bad-breisig'),associationFromGv100(weilerbachSource,'weilerbach')];
}
