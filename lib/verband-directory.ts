import data from './verband-directory-data.json';

/** Official directory membership, independent of published energy-monitor packages. */
export type AssociationGroup = {id:string;name:string;districtId:string;members:string[]};
export const associationDirectory:readonly AssociationGroup[]=data.groups;
export const associationDirectoryDate=data.asOf;
export function districtAssociations(districtId:string) {
  return associationDirectory.filter(group=>group.districtId===districtId)
    .sort((a,b)=>a.name.localeCompare(b.name,'de'));
}
export function directoryAssociation(id:string) {
  return associationDirectory.find(group=>group.id===id);
}
export {associationDirectoryPath} from './verband-directory-path';
const fold=(value:string)=>value.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
export function searchAssociations(query:string) {
  const term=fold(query.trim());
  return term.length<2?[]:associationDirectory.filter(group=>fold(`Verbandsgemeinde ${group.name}`).includes(term));
}
