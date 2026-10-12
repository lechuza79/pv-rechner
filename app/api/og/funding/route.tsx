import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cityBySlug, fundingListFrom, isCityPublished } from "../../../../lib/atlas-cities";
import { getFundingPrograms } from "../../../../lib/funding-data";
import { leitProgramm, stadtseiteThema, STADTSEITE_UEBERSCHRIFT } from "../../../../lib/foerder-stadt-meta";
import { fundingPromotion, fundingPromotionTitle } from "../../../../lib/funding-promotion";
import { stageDefaults } from "../../../../lib/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const city = cityBySlug(new URL(request.url).searchParams.get("stadt") ?? "");
  if (!city || !isCityPublished(city)) return new Response("Not found", { status: 404 });
  const programs = fundingListFrom(await getFundingPrograms(), city);
  const program = leitProgramm(programs);
  const topic = stadtseiteThema(programs);
  const title = topic === "pv" ? fundingPromotionTitle(city.name, program) : `${STADTSEITE_UEBERSCHRIFT[topic]} in ${city.name}`;
  const promotion = fundingPromotion(program);
  const theme = stageDefaults(0);
  const [font, money, logoSource] = await Promise.all([
    readFile(join(process.cwd(), "app/api/og/Montserrat-Bold.ttf")),
    readFile(join(process.cwd(), "public/brand/funding-money.png")),
    readFile(join(process.cwd(), "public/brand/logo-result.svg"), "utf8"),
  ]);
  const logo = logoSource.replace(/var\(--color-accent\)/g, theme["--color-text-primary"]).replace(/var\(--color-brand-deep\)/g, theme["--color-brand-deep"]).replace(/var\(--color-brand\)/g, theme["--color-brand"]).replace(/var\(--color-text-faint\)/g, theme["--color-text-secondary"]);
  return new ImageResponse(<div style={{display:"flex",flexDirection:"column",width:"100%",height:"100%",padding:56,background:theme["--color-bg"],color:theme["--color-text-primary"],fontFamily:"Montserrat"}}>
    <img src={`data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`} width={260} height={61} alt="" />
    <div style={{display:"flex",flex:1,alignItems:"center"}}>
      <div style={{display:"flex",position:"relative",width:400,height:400,flexShrink:0,marginLeft:-32}}>
        <div style={{position:"absolute",left:84,top:92,width:216,height:216,borderRadius:"50%",background:theme["--color-bg-muted"]}} />
        <img src={`data:image/png;base64,${money.toString("base64")}`} width={400} height={400} style={{position:"absolute",left:0,top:0}} alt="" />
      </div>
      <div style={{display:"flex",fontSize:48 /* schriftgroesse: Fixed 1200px social image export, not responsive web typography. */,lineHeight:1.18,width:720}}>{title}</div>
    </div>
    <div style={{fontSize:18 /* schriftgroesse: Fixed 1200px social image export caption. */,color:theme["--color-text-secondary"]}}>{promotion ? "Je nach Vorhaben · Voraussetzungen und verfügbare Mittel beachten" : "Aktuelle Konditionen und Voraussetzungen auf solar-check.io"}</div>
  </div>, {width:1200,height:630,fonts:[{name:"Montserrat",data:font,weight:700}],headers:{"Cache-Control":"public, max-age=300, s-maxage=300"}});
}
