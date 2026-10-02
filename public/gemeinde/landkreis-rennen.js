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

/* Shared, time-based row motion: capture speed never changes a rank transition. */
window.solarRaceRowPosition = function (state, target, time) {
  if (!state || time < state.time) return {from:target, target, start:time, time, value:target};
  const value=state.from+(state.target-state.from)*Math.min(1,Math.max(0,(time-state.start)/220));
  return target===state.target ? {...state,time,value} : {from:value,target,start:time,time,value};
};

/* Animate actual commissioning-year totals, using the shared ranking's filters and formatting. */
window.solarDistrictRace = async function ({ stage, label = "Die zehn führenden Gemeinden im Zeitverlauf", rows, history, format, unit, animate, current, skip, clockHost }) {
  const race = document.createElement('div');
  race.className = 'district-race';
  race.setAttribute('aria-label', label);
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
    if(stage.dataset.highlight===row.id)item.dataset.highlighted='true';
    const name = document.createElement(row.href ? 'a' : 'span');
    name.className = 'district-race-name'; name.textContent = row.name;
    if (row.href) name.href = row.href;
    const value = document.createElement('strong'); value.className = 'district-race-value';
    const number = document.createElement('span'); value.append(number);
    const unitLabel=document.createElement('small');unitLabel.className='district-race-unit';
    if(unit||stage.dataset.valueUnit){unitLabel.textContent=stage.dataset.valueUnit||'';value.append(unitLabel);}
    const track = document.createElement('div'); track.className = 'district-race-track'; track.setAttribute('aria-hidden','true');
    const bar = document.createElement('div'); bar.className = 'district-race-bar'; track.append(bar);
    item.append(name,value,track); race.append(item);
    return [row.id,{row,item,value:number,bar,unitLabel}];
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
  let lastProgress=0, exportProgress=null, savedProgress=0, paintTime=0, savedTime=0;
  const motionStates=new Map();
  let playbackGeneration=0;
  function paint(progress,time=paintTime,entrance=1) {
    paintTime=time;
    lastProgress=progress;
    const position=progress*(indexed.length-1), from=indexed[Math.floor(position)], to=indexed[Math.min(indexed.length-1,Math.floor(position)+1)];
    const fraction=position%1;
    clock.textContent=String(fraction<.5?from.year:to.year);
    const order=rows.map(row=>({...row,value:(from.values.get(row.id)??0)*(1-fraction)+(to.values.get(row.id)??0)*fraction})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'de'));
    const frameMaximum=order[0]?.value??0;
    const frameUnit=typeof unit==='function'?unit(frameMaximum):stage.dataset.valueUnit||'';
    const max=frameMaximum||1;
    order.forEach((row,index)=>{
      const {item,value,bar,unitLabel}=items.get(row.id);
      const shown=index<10 && row.value>0;
      const motion=window.solarRaceRowPosition(motionStates.get(row.id),Math.min(index,11)*44,time);
      motionStates.set(row.id,motion);
      item.style.transition="none";
      item.style.transform=`translateY(${motion.value}px)`;
      item.style.opacity=shown?'1':'0'; item.inert=!shown;
      item.setAttribute('aria-hidden',String(!shown));
      const place=1+order.filter(other=>other.value>row.value).length;
      item.dataset.rank=place;
      item.setAttribute('aria-label', `Platz ${place}: ${row.name}`);
      value.textContent=format(row.value,frameMaximum);
      unitLabel.textContent=frameUnit;
      // Clip a stable box with fixed-radius caps; scaling would flatten the caps.
      const width=Math.max(0,Math.min(1,row.value/max))*entrance;
      bar.style.clipPath=`inset(0 ${(1-width)*100}% 0 0 round 0 4px 4px 0)`;
    });
    return order;
  }
  const exportControl=event=>{
    const command=event.detail;
    if(command.mode==='restart'){exportProgress=null;void play(true);return;}
    if(command.mode==='describe'){command.report({durationMs:introDuration+raceDuration+finishDelay});return;}
    if(command.mode==='restore'){
      if(exportProgress!==null){motionStates.clear();paint(savedProgress,savedTime,entranceAt(savedTime));exportProgress=null;}
    }else{
      if(exportProgress===null){savedProgress=lastProgress;savedTime=paintTime;}
      if(command.mode==='seek'&&command.timeMs===undefined)motionStates.clear();
      exportProgress=command.mode==='pause'?lastProgress:command.timeMs!==undefined?timelineProgress(Math.max(0,command.timeMs-introDuration)/raceDuration):Math.max(0,Math.min(1,command.progress??0));
      const time=command.timeMs??paintTime;
      paint(exportProgress,time,command.mode==='seek'&&command.timeMs===undefined?1:entranceAt(time));
    }
  };
  stage.addEventListener('chart-export-animation',exportControl);
  const timeline = window.solarDistrictTimeline(indexed, rows.map(row => row.id));
  const raceDuration = timeline.duration, finishDelay = 2000, introDuration = 800;
  const entranceAt=time=>1-Math.pow(1-Math.min(1,Math.max(0,time/introDuration)),3);
  const timelineProgress = timeline.progress;
  async function play(motion) {
    const generation=++playbackGeneration;
    race.dataset.state='racing';
    motionStates.clear();paint(0,0,motion&&!reduced.matches?0:1);
    let elapsed=0,last=performance.now();
    await new Promise(resolve=>{
      function tick(now){
        if(generation!==playbackGeneration||!current()||!stage.isConnected){resolve();return;}
        const delta=Math.min(80,now-last);last=now;
        if(exportProgress!==null){requestAnimationFrame(tick);return;}
        if(visible&&!document.hidden)elapsed+=delta;
        if(!motion||reduced.matches||skip())elapsed=introDuration+raceDuration+finishDelay;
        paint(timelineProgress(Math.max(0,elapsed-introDuration)/raceDuration),elapsed,entranceAt(elapsed));
        if(elapsed>=introDuration+raceDuration)race.dataset.state="finishing";
        if(elapsed>=introDuration+raceDuration+finishDelay){resolve();return;}
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    if(generation!==playbackGeneration||!current()||!stage.isConnected)return;
    race.dataset.state='revealed';
    // Reduced motion and skipped playback must settle immediately at final ranks.
    motionStates.clear();
    const order=paint(1),winners=order.filter(row=>row.value>0&&row.value===order[0]?.value);
    if(motion&&!reduced.matches&&visible&&!document.hidden&&winners.length)
      window.dispatchEvent(new CustomEvent('atlas-ranking-celebrate',{detail:{target:items.get(winners[0].id).item}}));
  }
  const cleanup=new MutationObserver(()=>{if(!stage.contains(race)){observer.disconnect();cleanup.disconnect();stage.removeEventListener('chart-export-animation',exportControl);}});cleanup.observe(stage,{childList:true});
  await play(animate);
};
