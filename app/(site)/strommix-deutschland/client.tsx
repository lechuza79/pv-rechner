"use client";
import StrommixWidget from "../../../components/StrommixWidget";
import type {GenerationData} from "../../../lib/energy";
export default function EnergieClient({initialData,review=false}:{review?:boolean;initialData?:GenerationData}) {
  return <StrommixWidget initialData={initialData} initialNuclear={!review} editorial />;
}
