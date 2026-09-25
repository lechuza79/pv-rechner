/* Allocate more screen time to changes within the visible top ten, not churn below it. */
window.solarDistrictTimeline = function (indexed, ids) {
  const steps = Math.max(1, (indexed.length - 1) * 12);
  const orderAt = progress => {
    const position = progress * (indexed.length - 1), start = Math.floor(position);
    const from = indexed[start].values, to = indexed[Math.min(start + 1, indexed.length - 1)].values;
    const fraction = position - start;
    return ids.map(id => ({id, value:(from.get(id) ?? 0) * (1 - fraction) + (to.get(id) ?? 0) * fraction}))
      .filter(row => row.value > 0).sort((a,b) => b.value - a.value || a.id.localeCompare(b.id)).map(row => row.id);
  };
  let previous = orderAt(0);
  const activity = [];
  for (let step = 1; step <= steps; step++) {
    const next = orderAt(step / steps), visible = new Set([...previous.slice(0,10), ...next.slice(0,10)]);
    const before = new Map(previous.map((id,index) => [id,index])), after = new Map(next.map((id,index) => [id,index]));
    const peers = [...visible];
    let changes = 0;
    for (let a = 0; a < peers.length; a++) for (let b = a + 1; b < peers.length; b++) {
      const x = peers[a], y = peers[b];
      if (before.has(x) && before.has(y) && after.has(x) && after.has(y) &&
        (before.get(x) - before.get(y)) * (after.get(x) - after.get(y)) < 0) changes++;
    }
    activity.push(changes);
    previous = next;
  }
  // Ease into and out of a busy interval instead of changing speed at a crossing.
  const weights = activity.map((_,i) => 1 + Math.min(3,
    (activity[i-1] ?? 0) * .6 + activity[i] * 1.2 + (activity[i+1] ?? 0) * .6));
  const sum = weights.reduce((a,b) => a+b,0), duration = 45000 * sum / steps;
  const ends = []; let accumulated = 0;
  weights.forEach(weight => { accumulated += weight; ends.push(accumulated); });
  return {duration, weights, progress(time) {
    const t = Math.min(1, Math.max(0,time));
    const eased = t <= .6 ? 1.25*t : .75 + .25*(1-Math.pow(1-(t-.6)/.4,2));
    const target = eased * sum;
    let index = ends.findIndex(end => end >= target);
    if (index < 0) return 1;
    const start = index ? ends[index-1] : 0;
    return (index + (target-start)/weights[index])/steps;
  }};
};

/* Animate actual commissioning-year totals, using the shared ranking's filters and formatting. */
window.solarDistrictRace = async function ({ stage, rows, history, format, unit, animate, current, skip, clockHost }) {
  const race = document.createElement('div');
  race.className = 'district-race';
  race.setAttribute('aria-label', 'Die zehn führenden Gemeinden im Zeitverlauf');
  const clock = clockHost ?? document.createElement('p');
  clock.className = 'district-race-year';
  const positions = document.createElement('div');
  positions.className = 'district-race-positions';
  positions.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < Math.min(10, rows.length); index++) {
    const position = document.createElement('span');
    position.className = 'district-race-rank';
    position.textContent = index + 1;
    position.style.top = `${index * 44 + 10}px`;
    positions.append(position);
  }
  race.append(positions);
  const items = new Map(rows.map(row => {
    const item = document.createElement('div');
    item.className = 'district-race-row';
    item.dataset.raceTown = row.id;
    const name = document.createElement(row.href ? 'a' : 'span');
    name.className = 'district-race-name'; name.textContent = row.name;
    if (row.href) name.href = row.href;
    const value = document.createElement('strong'); value.className = 'district-race-value';
    const track = document.createElement('div'); track.className = 'district-race-track'; track.setAttribute('aria-hidden','true');
    const bar = document.createElement('div'); bar.className = 'district-race-bar'; track.append(bar);
    item.append(name,value,track); race.append(item);
    return [row.id,{row,item,value,bar}];
  }));
  let frames = history.filter(frame => frame.rows.some(row => row.value > 0));
  if (!frames.length) frames = [{year:'Heute',rows}];
  const indexed = frames.map(frame => ({year:frame.year, values:new Map(frame.rows.map(row => [row.id,row.value]))}));
  race.style.height = `${Math.min(10, rows.length) * 44}px`;
  stage.querySelector('.ranking-stage-subline')?.remove();
  if (!clockHost) stage.append(clock);
  stage.append(race);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false;
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{threshold:0}); observer.observe(race);
  function paint(progress) {
    const position=progress*(indexed.length-1), from=indexed[Math.floor(position)], to=indexed[Math.min(indexed.length-1,Math.floor(position)+1)];
    const fraction=position%1;
    clock.textContent=String(fraction<.5?from.year:to.year);
    const order=rows.map(row=>({...row,value:(from.values.get(row.id)??0)*(1-fraction)+(to.values.get(row.id)??0)*fraction})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'de'));
    const max=order[0]?.value||1;
    order.forEach((row,index)=>{
      const {item,value,bar}=items.get(row.id);
      const shown=index<10 && row.value>0;
      item.style.transform=`translateY(${Math.min(index,11)*44}px)`;
      item.style.opacity=shown?'1':'0'; item.inert=!shown;
      item.setAttribute('aria-hidden',String(!shown));
      const place=1+order.filter(other=>other.value>row.value).length;
      item.dataset.rank=place;
      item.setAttribute('aria-label', `Platz ${place}: ${row.name}`);
      value.textContent=format(row.value); bar.style.width=`${100*row.value/max}%`;
    });
    return order;
  }
  const timeline = window.solarDistrictTimeline(indexed, rows.map(row => row.id));
  const raceDuration = timeline.duration, finishDelay = 2000;
  const timelineProgress = timeline.progress;
  async function play(motion) {
    race.dataset.state='racing';
    paint(0);
    let elapsed=0,last=performance.now();
    await new Promise(resolve=>{
      function tick(now){
        if(!current()||!stage.isConnected){resolve();return;}
        const delta=Math.min(80,now-last);last=now;
        if(visible&&!document.hidden)elapsed+=delta;
        if(!motion||reduced.matches||skip())elapsed=raceDuration+finishDelay;
        paint(timelineProgress(elapsed/raceDuration));
        if(elapsed>=raceDuration)race.dataset.state="finishing";
        if(elapsed>=raceDuration+finishDelay){resolve();return;}
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    if(!current()||!stage.isConnected)return;
    race.dataset.state='revealed';
    const order=paint(1),winners=order.filter(row=>row.value>0&&row.value===order[0]?.value);
    if(motion&&!reduced.matches&&visible&&!document.hidden&&winners.length)
      window.dispatchEvent(new CustomEvent('atlas-ranking-celebrate',{detail:{target:items.get(winners[0].id).item}}));
  }
  const cleanup=new MutationObserver(()=>{if(!stage.contains(race)){observer.disconnect();cleanup.disconnect();}});cleanup.observe(stage,{childList:true});
  await play(animate);
};
