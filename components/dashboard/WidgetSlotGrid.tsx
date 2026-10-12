'use client';

import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import type {GridStack, GridStackWidget} from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import {COMPOSITION_GAP, COMPOSITION_ROW} from '../../lib/widget-composition';
import styles from './WidgetSlotGrid.module.css';

export type WidgetSlotGeometry = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type WidgetSlot = WidgetSlotGeometry & {children: ReactNode};

/** Explicit arrangements keep chart minimum sizes a host decision. */
export type WidgetSlotPlan = {
  minWidth: number;
  columns: number;
  slots: readonly WidgetSlotGeometry[];
};

export type WidgetSlotGridProps = {
  slots: readonly WidgetSlot[];
  columns?: number;
  /** Visible row height. A multi-row slot also contains the intervening gaps. */
  rowHeight?: number;
  gap?: number;
  plans?: readonly WidgetSlotPlan[];
  label?: string;
  id?: string;
  className?: string;
};

/**
 * GridStack owns placement; React owns every slot and its descendants.
 * Nest another WidgetSlotGrid in a slot to create an independent composition.
 * Plans must allocate enough height for nested compositions and chart controls.
 */
export function WidgetSlotGrid({
  slots,
  columns = 12,
  rowHeight = COMPOSITION_ROW,
  gap = COMPOSITION_GAP,
  plans,
  label,
  id,
  className,
}: WidgetSlotGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, HTMLDivElement>());
  const registered = useRef(new Map<string, HTMLDivElement>());
  const [width, setWidth] = useState(0);
  const [grid, setGrid] = useState<GridStack | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setWidth(root.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    measure();
    return () => observer.disconnect();
  }, []);

  const sortedPlans = plans && [...plans].sort((a, b) => b.minWidth - a.minWidth);
  const plan = sortedPlans?.find(candidate => candidate.minWidth <= width)
    ?? sortedPlans?.[sortedPlans.length - 1];
  const activeColumns = plan?.columns ?? columns;
  const geometry = plan?.slots ?? slots;
  // Children can re-render independently without asking GridStack to move them.
  const layoutKey = JSON.stringify(geometry.map(({id, x, y, w, h, minW, minH}) =>
    ({id, x, y, w, h, minW, minH})));

  useEffect(() => {
    let disposed = false;
    let instance: GridStack | null = null;
    // GridStack reads browser globals; keep it out of server rendering.
    void import('gridstack').then(({GridStack}) => {
      if (disposed || !gridRef.current) return;
      instance = GridStack.init({
        auto: false,
        staticGrid: true,
        animate: false,
        mode: 'float',
        column: 12,
        cellHeight: COMPOSITION_ROW + COMPOSITION_GAP,
        margin: COMPOSITION_GAP / 2,
      }, gridRef.current);
      if (instance) setGrid(instance);
    });
    return () => {
      disposed = true;
      registered.current.clear();
      // Never remove React-owned elements, including nested grids.
      instance?.destroy(false);
    };
  }, []);

  useLayoutEffect(() => {
    if (!grid) return;
    const layout: WidgetSlotGeometry[] = JSON.parse(layoutKey);
    const desiredIds = new Set(layout.map(slot => slot.id));
    grid.batchUpdate();
    grid.column(activeColumns, 'none');
    grid.cellHeight(rowHeight + gap);
    grid.margin(gap / 2);
    for (const [slotId, element] of registered.current) {
      if (!desiredIds.has(slotId) || elements.current.get(slotId) !== element) {
        grid.removeWidget(element, false, false);
        registered.current.delete(slotId);
      }
    }
    for (const slot of layout) {
      const element = elements.current.get(slot.id);
      if (!element) continue;
      const options: GridStackWidget = {...slot, minW: slot.minW ?? 1, minH: slot.minH ?? 1};
      if (registered.current.has(slot.id)) grid.update(element, options);
      else {
        grid.makeWidget(element, options);
        registered.current.set(slot.id, element);
      }
    }
    grid.batchUpdate(false);
  }, [grid, layoutKey, activeColumns, rowHeight, gap]);

  return <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(' ')}
    aria-label={label} data-example={id} data-slot-grid data-slot-columns={activeColumns}
    style={{'--slot-gap': `${gap}px`} as CSSProperties}>
    <div ref={gridRef} className={`grid-stack ${styles.grid}`} data-ready={grid ? '' : undefined}
      style={{'--slot-initial-height': `${Math.max(0, ...geometry.map(slot => slot.y + slot.h)) * (rowHeight + gap)}px`} as CSSProperties}>
      {slots.map(slot => {
        const position = geometry.find(item => item.id === slot.id) ?? slot;
        return <div key={slot.id} className="grid-stack-item" data-slot-id={slot.id}
        style={{
          '--slot-x': `${position.x / activeColumns * 100}%`,
          '--slot-y': `${position.y * (rowHeight + gap)}px`,
          '--slot-w': `${position.w / activeColumns * 100}%`,
          '--slot-h': `${position.h * (rowHeight + gap)}px`,
        } as CSSProperties}
        ref={element => {
          if (element) elements.current.set(slot.id, element);
          else elements.current.delete(slot.id);
        }}>
        <div className={`grid-stack-item-content ${styles.content}`}>{slot.children}</div>
      </div>;})}
    </div>
  </div>;
}
