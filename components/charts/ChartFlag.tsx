import type {CSSProperties,ReactNode} from "react";
import "./chart-flag.css";
/** Shared chart annotation, anchored to the value it describes. */
export default function ChartFlag({children,placement="above",edge,style,className="",tooltip=false}:{children:ReactNode;placement?:"above"|"below";edge?:"start"|"end"|"middle";style?:CSSProperties;className?:string;tooltip?:boolean}) {
 return <span className={`sc-category-flag ${className}`} data-placement={placement} data-edge={edge} style={style} role={tooltip?"tooltip":undefined}>{children}</span>;
}
