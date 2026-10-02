// Loaded only by the local /benchmark preview route; never included in production.
const benchmarkButton=document.createElement('button');
benchmarkButton.textContent='Measure panning';
benchmarkButton.id='benchmark-start';
benchmarkButton.style.cssText='position:fixed;bottom:10px;left:10px;z-index:9999;background:white;border:1px solid #555;padding:8px';
const benchmarkResult=document.createElement('pre');
benchmarkResult.id='benchmark-result';
benchmarkResult.style.cssText='position:fixed;bottom:44px;left:10px;z-index:9999;background:white;color:black;padding:8px;max-width:90vw;white-space:pre-wrap;font-size:11px';
document.body.append(benchmarkButton,benchmarkResult);
benchmarkButton.onclick=async()=>{
  if(!allReady)return;
  benchmarkButton.disabled=true;
  benchmarkResult.textContent='Measuring…';
  await selectRegion(provinceLayers.get(120000),120000);
  const gpu=typeof maplibregl!=='undefined';
  map.setZoom(map.getZoom()+2);
  if(gpu&&!map.loaded())await new Promise(resolve=>map.once('idle',resolve));
  await new Promise(resolve=>setTimeout(resolve,250));
  const intervals=[];let running=true,last=0;
  function frame(t){if(!running)return;if(last)intervals.push(t-last);last=t;requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  for(const offset of [[180,0],[-180,0],[0,140],[0,-140]]){
    map.panBy(offset,{animate:true,duration:gpu?1000:1,easeLinearity:1,easing:t=>t});
    await new Promise(resolve=>setTimeout(resolve,1100));
  }
  running=false;
  const sorted=[...intervals].sort((a,b)=>a-b),mean=intervals.reduce((a,b)=>a+b,0)/intervals.length;
  benchmarkResult.textContent=JSON.stringify({renderer:gpu?'WebGL':'SVG',frames:intervals.length,fps:Number((1000/mean).toFixed(1)),p95ms:Number(sorted[Math.floor(sorted.length*.95)].toFixed(1)),over50ms:intervals.filter(t=>t>50).length,viewport:[map.getContainer().clientWidth,map.getContainer().clientHeight]},null,2);
  benchmarkButton.disabled=false;
};
