type StockRow={region_id:string;solar_kwp:number|string|null;wind_kwp:number|string|null};
/** Sum complete municipal stock only; incomplete or truncated stock stays unavailable. */
export function districtCapacity(rows:unknown,district:string,key:'solar_kwp'|'wind_kwp',count:number|null|undefined):number|null{
 if(!/^\d{5}$/.test(district)||!Array.isArray(rows)||!rows.length||count!==rows.length)return null;
 let total=0;
 for(const row of rows as StockRow[]){
  if(!/^\d{8}$/.test(row.region_id)||!row.region_id.startsWith(district))return null;
  const value=row[key];if(value==null||value==='')return null;
  const number=Number(value);if(!Number.isFinite(number)||number<0)return null;
  total+=number;
 }
 return total;
}
