import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire}from'node:module';const {PNG}=createRequire(import.meta.url)('pngjs');
export default [{name:'Alaska historical land matches modern mountains and coast, including the Canada frontier and Aleutians',options:{width:1440,height:950},async run(p,base){
 await p.open(base,'#united-states');
 const bg=await p.evaluate('(()=>{const c=document.createElement("canvas"),ctx=c.getContext("2d" );ctx.fillStyle=map.getPaintProperty("background","background-color" );ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3)})()');
 const views=[['kenai',[-150,60.2],6],['glacier-bay',[-136.5,59],7],['canada-frontier',[-141,65],6],['aleutians',[-175,53],5]];
 for(const [name,center,zoom]of views){await p.evaluate('void map.jumpTo('+JSON.stringify({center,zoom})+')');await p.settle();const modern=PNG.sync.read(fs.readFileSync(await p.screenshot('alaska-modern-'+name)));
 await p.evaluate('void document.getElementById("historical-snapshot").click()');await p.waitFor('!!map.getLayer("united-states-history-alaska")');await p.evaluate('void document.querySelector(\'#united-states-history-dock [data-year="1900"]\').click()');await p.settle();await p.evaluate('void map.jumpTo('+JSON.stringify({center,zoom})+')');await p.settle();const history=PNG.sync.read(fs.readFileSync(await p.screenshot('alaska-1900-'+name)));
 let mismatches=0,checked=0;const water=(img,x,y)=>{const i=(y*img.width+x)*4,[r,g,b]=img.data.subarray(i,i+3);return Math.abs(r-bg[0])+Math.abs(g-bg[1])+Math.abs(b-bg[2])<3;};
 for(let x=390;x<1300;x+=4)for(let y=190;y<680;y+=4){const stable=[[-2,-2],[-2,2],[2,-2],[2,2]].every(([dx,dy])=>water(modern,x+dx,y+dy)===water(modern,x,y));if(!stable)continue;checked++;if(water(modern,x,y)!==water(history,x,y)&&[-3,-2,-1,0,1,2,3].every(dx=>[-3,-2,-1,0,1,2,3].every(dy=>water(history,x+dx,y+dy)!==water(modern,x,y))))mismatches++;}
 assert(mismatches/checked<.003,name+' modern/historical water classification mismatch: '+mismatches+'/'+checked);
 assert.equal(await p.evaluate('map.getPaintProperty("united-states-history-alaska","fill-color")'),'#f3eee2','Alaska District color reaches the modern shoreline');
 await p.evaluate('void document.querySelector(\'#united-states-history-dock [data-year="1866"]\').click()');await p.settle();assert.equal(await p.evaluate('map.getPaintProperty("united-states-history-alaska","fill-color")'),'#d7d7d3','Russian America remains foreign');
 await p.evaluate('void document.getElementById("historical-snapshot").click()');await p.settle();assert(await p.evaluate('!map.getLayer("united-states-history-alaska")&&!map.getSource("united-states-history-alaska")'));
 }
}}];
