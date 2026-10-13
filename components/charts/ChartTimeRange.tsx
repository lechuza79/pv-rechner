import type {InputHTMLAttributes} from 'react';
import './chart-time-range.css';
/** Shared slim time scrubber for race charts and observation playback. */
export function ChartTimeRange(props:Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'className'>){
 return <input {...props} type="range" className="sc-chart-time-range"/>;
}
