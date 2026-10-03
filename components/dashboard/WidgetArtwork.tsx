import type {CSSProperties} from 'react';

/** Decorative layers never participate in the widget's content layout. */
export function WidgetArtwork({src,texture}:{src:string;texture?:string}) {
  const layers=[src,texture].filter(Boolean).map(url=>`url(${JSON.stringify(url)})`).join(',');
  const style:CSSProperties={
    position:'absolute',inset:0,borderRadius:'inherit',pointerEvents:'none',
    overflow:'hidden',opacity:.16,filter:'grayscale(1)',
    backgroundImage:layers,backgroundSize:'cover',backgroundPosition:'center',
    backgroundRepeat:'no-repeat',
    maskImage:'linear-gradient(transparent 10%,#000 45%,#000 80%,transparent)',
  };
  return <div data-widget-artwork aria-hidden="true" style={style}/>;
}
