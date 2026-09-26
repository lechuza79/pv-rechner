import MunicipalStoryPreview from "../gemeinde/GemeindeInsights";
import type {DistrictContent} from "../../lib/district-monitor-server";

export default async function LandkreisStories({content,name}:{content:Promise<DistrictContent>;name:string}) {
  try {
    const {stories,prepared}=await content;
    if(prepared.state==='unavailable')return <p role="status">Die Geschichten aus den Gemeinden werden gerade neu zusammengestellt.</p>;
    if(!stories.length)return <p>Für die Gemeinden liegen derzeit keine Geschichten vor.</p>;
    return <MunicipalStoryPreview stories={stories} name={name} showTown showDate={false} showHeader={false} surfaceScheme="dark"/>;
  } catch {
    return <p>Die Geschichten lassen sich gerade nicht laden.</p>;
  }
}
