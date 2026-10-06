export type MicrochartData={
 windSource?:'open-meteo-preview'|'icon-d2';
 windModelRun?:string|null;
 windHeightMetres?:100;
 postcode?:string;
 place:string;solarCapacityKw?:number|null;windCapacityKw?:number|null;at:string;until:string;modelRun:string|null;
 solarPerKw?:{time:string;value:number}[]|null;
 windPerKw?:{time:string;value:number}[]|null;
 solar:{time:string;value:number}[]|null;
 wind:{time:string;value:number}[]|null;
 conditions:{speedMs:number;directionDeg:number;validAt:string}|null;
};
