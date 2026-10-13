/** Local corner rounding shared by radial plots; never overshoots samples. */
export function roundedRadialPath(points:number[][],rounding=2) {
 if(!points.length)return '';
    const coordinate = (p: number[]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    const corners = points.map((current, i) => {
      const previous = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length];
      const toward = (neighbor: number[]) => {const distance = Math.hypot(neighbor[0] - current[0], neighbor[1] - current[1]), fraction = distance === 0 ? 0 : Math.min(rounding / distance, .25); return current.map((value, axis) => value + (neighbor[axis] - value) * fraction);};
      return {current, entry: toward(previous), exit: toward(next)};
    });
    return corners.map((corner, i) => `${i ? 'L' : 'M'}${coordinate(corner.entry)} Q${coordinate(corner.current)} ${coordinate(corner.exit)}`).join(' ') + ' Z';
}
