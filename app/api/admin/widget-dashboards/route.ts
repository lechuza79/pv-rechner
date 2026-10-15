import {NextResponse} from 'next/server';
import {isAdminSession} from '../../../../lib/admin-guard';
import {parseDashboardConfiguration} from '../../../../lib/widget-dashboard';
import {saveWidgetDashboard} from '../../../../lib/widget-dashboard-store.server';
export async function POST(request:Request){
 if(!await isAdminSession())return NextResponse.json({error:'Zum Speichern bitte als Admin anmelden.'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Ungültige Herkunft.'},{status:403});
 let configuration;
 try{const raw=await request.text();configuration=parseDashboardConfiguration(raw);}catch{return NextResponse.json({error:'Ungültige Dashboard-Konfiguration.'},{status:400});}
 try{const id=await saveWidgetDashboard(configuration);return NextResponse.json({id,url:`/widget-galerie/dashboard?dashboard=${id}`});}
 catch{return NextResponse.json({error:'Dashboard konnte nicht gespeichert werden. Der Speicher ist nicht verfügbar.'},{status:503});}
}
