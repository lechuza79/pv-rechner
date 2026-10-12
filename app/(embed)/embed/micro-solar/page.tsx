import MicrochartEmbed from '../../../../components/dashboard/MicrochartEmbed';
export const dynamic='force-dynamic';
export const metadata={title:'Mikrochart · solar',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 return <MicrochartEmbed kind="solar" query={await searchParams}/>;
}
