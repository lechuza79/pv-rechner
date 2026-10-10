"use client";
import {useCallback, useState, type Ref, type RefObject, type ReactNode} from 'react';
import {WidgetIconButton} from '../dashboard/WidgetControls';
import {IconPlay, IconPause, IconRefresh} from '../Icons';
import styles from './RaceChart.module.css';

/** Shared playback contract for horizontal bar races: controls belong to the year. */
export function useBarRacePlayback(stage: RefObject<HTMLElement | null>, autoplay: boolean) {
 const [state, setState] = useState<'playing' | 'paused' | 'ended'>(autoplay ? 'playing' : 'paused');
 const reset = useCallback(() => setState(autoplay ? 'playing' : 'paused'), [autoplay]);
 const onProgress = useCallback((progress: number) => { if (progress === 1) setState('ended'); }, []);
 const toggle = () => {
  const mode = state === 'ended' ? 'restart' : state === 'playing' ? 'pause' : 'resume';
  stage.current?.dispatchEvent(new CustomEvent('chart-export-animation', {detail: {mode}}));
  setState(state === 'playing' ? 'paused' : 'playing');
 };
 return {state, reset, onProgress, toggle};
}
export function BarRaceHeading({clock, year, playback, children}: {
 children?: ReactNode; clock: Ref<HTMLSpanElement>; year: number; playback: ReturnType<typeof useBarRacePlayback>;
}) {
 return <span className={styles.barRaceHeading}>
  <span className={styles.currentYear} ref={clock}>{year}</span>
  {children}
  <span data-sc-export-ignore="">
   <WidgetIconButton size="xs" label={playback.state === 'ended' ? 'Erneut abspielen' : playback.state === 'playing' ? 'Pausieren' : 'Abspielen'} onClick={playback.toggle}>
    {playback.state === 'ended' ? <IconRefresh size={14}/> : playback.state === 'playing' ? <IconPause size={14}/> : <IconPlay size={14}/>}
   </WidgetIconButton>
  </span>
 </span>;
}
