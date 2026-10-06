/** Resolved by the local preview build to the landscape owner's entry point. */
declare module 'shared-landscape-hero' {
 export function LandscapeSources(props:{placeId:string}):import('react').ReactElement;
 export default function LandscapeHero(props:{placeId:string;showPlacePicker?:boolean;sourcesHref?:string}):import('react').ReactElement;
}

declare module 'shared-landscape-styles' { const styles:Record<string,string>; export default styles; }

declare module 'shared-landscape-places' { export const landscapePlaces:Record<string,string>; }
