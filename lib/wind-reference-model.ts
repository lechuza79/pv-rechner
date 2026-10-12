/** Illustrative reference curve, not a calibrated municipal turbine model. */
export function referenceWindFactor(speed:number){
 if(!Number.isFinite(speed)||speed<0)throw Error('Invalid wind speed');
 if(speed<3||speed>=25)return 0;
 if(speed>=12)return 1;
 return (speed**3-3**3)/(12**3-3**3);
}
