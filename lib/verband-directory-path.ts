/** Stable association segment; municipality URLs are untouched. */
export function associationSlug(name:string) {
 return name.toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
export function associationDirectoryPath(districtPath:string,name:string) {
 return `${districtPath}/verbandsgemeinden/${associationSlug(name)}`;
}
