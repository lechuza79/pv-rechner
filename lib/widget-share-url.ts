/** A dashboard's local selection must travel to a reproducible standalone widget. */
export function widgetShareUrl(pageUrl:string,detailId:string,params?:Record<string,string>,embeddedPath?:string|null,hostQuery?:Record<string,string>){
 const standalone=Boolean(params&&embeddedPath&&hostQuery);
 const url=standalone?new URL(embeddedPath!,pageUrl):new URL(pageUrl);
 if(standalone)for(const [key,value] of Object.entries(hostQuery!))url.searchParams.set(key,value);
 if(!standalone)url.searchParams.set('chart',detailId);
 for(const [key,value] of Object.entries(params??{}))url.searchParams.set(key,value);
 url.hash='';
 return url;
}
