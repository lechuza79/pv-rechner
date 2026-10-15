import './gemeinde/section-nav.css';

/** Filters share the existing section navigation's surface, spacing and states. */
export default function SectionFilter({items,value,onChange,label,links=[]}:{items:readonly {id:string;label:string}[];value:string;onChange:(id:string)=>void;label:string;links?:readonly {href:string;label:string}[]}){
 return <nav className="v3-section-nav" data-theme="light" data-mode="filter" aria-label={label}>
  {items.map(item=><button key={item.id} type="button" className="v3-nav-item" aria-pressed={value===item.id} onClick={()=>onChange(item.id)}>{item.label}</button>)}
  {links.map(link=><a key={link.href} className="v3-nav-item" href={link.href}>{link.label}</a>)}
 </nav>;
}
