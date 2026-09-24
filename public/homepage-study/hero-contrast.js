// Pure sRGB math shared by the host controller and regression tests.
(function(scope) {
  const palettes = { dark: [18,44,59], light: [255,255,255], 'strong-dark': [0,0,0] };
  function luminance(color) {
    return color.slice(0,3).reduce((sum,c,i) => {
      const n=c/255; return sum+[.2126,.7152,.0722][i]*(n<=.04045?n/12.92:((n+.055)/1.055)**2.4);
    },0);
  }
  function contrast(a,b) {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
  function choose(samples,previous) {
    const scores=Object.fromEntries(Object.entries(palettes).map(([name,color])=>[name,Math.min(...samples.map(bg=>contrast(color,bg)))]));
    const best=scores.dark>=4.5?'dark':scores.light>=scores['strong-dark']?'light':'strong-dark';
    // Keep a safe existing tone across small fluctuations, never a failing one.
    const tone=previous && scores[previous]>=4.5 && scores[best]<scores[previous]+.5?previous:best;
    return {tone,ratio:scores[tone]};
  }
  function over(bg,fg,opacity=1) {const alpha=(fg[3]??1)*opacity;return bg.map((v,i)=>v*(1-alpha)+fg[i]*alpha);}
  function stops(image) {
    const matches=[...image.matchAll(/rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)\s*([\d.]+%)?/g)];
    return matches.map((m,i)=>({color:[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]],at:m[5]?parseFloat(m[5])/100:i/(matches.length-1||1)}));
  }
  function sample(image,y) {
    const colors=stops(image); if(!colors.length)return null;
    if(y<=colors[0].at)return colors[0].color;
    for(let i=1;i<colors.length;i++)if(y<=colors[i].at){const a=colors[i-1],b=colors[i],t=(y-a.at)/(b.at-a.at||1);return a.color.map((v,j)=>v+(b.color[j]-v)*t);}
    return colors.at(-1).color;
  }
  scope.SolarHeroContrast={palettes,luminance,contrast,choose,over,sample};
})(typeof window==='undefined'?globalThis:window);
