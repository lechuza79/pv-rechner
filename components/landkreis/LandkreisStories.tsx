import MunicipalStoryPreview from "../gemeinde/GemeindeInsights";
import type {DistrictContent} from "../../lib/district-monitor-server";

export default async function LandkreisStories({content,name}:{content:Promise<DistrictContent>;name:string}) {
  try {
    const {stories}=await content;
    if(!stories.length)return <p>Für die Gemeinden liegen derzeit keine Geschichten vor.</p>;
    return <MunicipalStoryPreview stories={stories} name={name} showTown showDate={false} showHeader={false} surfaceScheme="dark"/>;
  } catch {
    return <p>Die Geschichten lassen sich gerade nicht laden.</p>;
  }
}
