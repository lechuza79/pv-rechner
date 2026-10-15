"use client";
import windStops from '../public/geo/landscape-wind-stops.json';
import {useMicrocharts} from './use-microcharts';
import type {LandscapeTourData,TourStop} from '../components/landkreis/HeroLandscapeTour';
/** A scene sign and its standalone widget must request the identical model scope. */
export function useLandscapeWeather(data:Pick<LandscapeTourData,'municipality'|'weatherMunicipality'>|null,stop:TourStop|undefined){
 const municipality=data?.weatherMunicipality??data?.municipality;
 const park=Boolean(data&&stop&&(windStops as Record<string,Record<string,unknown>>)[data.municipality]?.[stop.id]);
 return {...useMicrocharts(stop?municipality??null:null,stop?.overview?data?.municipality:undefined,park?data?.municipality:undefined,park?stop?.id:undefined),municipality};
}
