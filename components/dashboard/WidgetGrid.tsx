import type {CSSProperties,ReactNode} from 'react';
import styles from './WidgetGrid.module.css';

/** Columns contain explicit stacks; DOM order is also the narrow reading order. */
export default function WidgetGrid({columns,layout='equal'}:{columns:{id:string;preferredWidth:number;minWidth?:number;children:ReactNode}[];layout?:'equal'|'feature'}) {
 const minimum=Math.max(...columns.map(column=>column.minWidth??column.preferredWidth),280);
 return <div className={styles.container}><div className={styles.grid} data-layout={layout} style={{'--widget-column-min':`${minimum}px`} as CSSProperties}>
  {columns.map(column=><div key={column.id} className={styles.stack}>{column.children}</div>)}
 </div></div>;
}
