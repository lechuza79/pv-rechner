"use client";
import { useState } from "react";
import KlimaDetailModal from "../../../../components/KlimaDetailModal";

/** Cooling details update the surrounding settings draft, never the result. */
export default function PvCoolingEditor({rooms,kwh,plz,price,onApply}:{rooms:number;kwh:number|null;plz:string;price:number;onApply:(kwh:number)=>void}) {
  const [open,setOpen]=useState(false);
  return <div>
    {kwh !== null && <p>Übernommen: {kwh.toLocaleString("de-DE")} kWh/Jahr.</p>}
    <button type="button" className="wp-secondary-text" onClick={()=>setOpen(true)}>Klimaverbrauch genauer berechnen</button>
    <KlimaDetailModal open={open} onClose={()=>setOpen(false)} rooms={rooms} plz={plz} stromPrice={price} onApply={onApply} />
  </div>;
}
