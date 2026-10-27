import assert from 'node:assert/strict';
import sharp from 'sharp';
async function capPixels(p,name,color){
 const probes=await p.evaluate('(()=>{const b=map.getCanvas().getBoundingClientRect(),samples=[];for(let lng=-180;lng<180;lng+=2)for(const lat of [-86,-87,-88,-89,-89.5]){const a=map.project([lng,lat]);if(a.x>20&&a.y>20&&a.x<b.width-20&&a.y<b.height-20)samples.push([a.x,a.y,lng,lat]);}return samples;})()');
 assert(probes.length>20,'Keep polar land on-screen: '+name+' ('+probes.length+' samples)');
 assert(probes.some(p=>p[2]===-158||p[2]===-156),'Probe the Ross Sea wedge, not only the antimeridian');
 // Inspect the canvas itself; floating mobile controls cast CSS shadows over
 // screenshots that must not count as holes in the geographic surface.
 const url=await p.evaluate('new Promise(resolve=>{map.once("render",()=>resolve(map.getCanvas().toDataURL()));map.triggerRepaint();})');
 const {data,info}=await sharp(Buffer.from(url.slice(url.indexOf(',')+1),'base64')).removeAlpha().raw().toBuffer({resolveWithObject:true}),width=await p.evaluate('map.getCanvas().getBoundingClientRect().width'),scale=info.width/width;
 await p.screenshot(name);
 for(const [x,y,lng,lat]of probes){const i=(Math.round(y*scale)*info.width+Math.round(x*scale))*info.channels;assert.deepEqual([...data.slice(i,i+3)],color,'Continuous polar land at '+lng+','+lat+' in '+name);}
}
async function capViews(p,name,color,width){
 const h=await p.evaluate('map.getCanvas().getBoundingClientRect().height');
 for(const [zoom,bearing,padding]of [[0,45,0],[1,135,0],[2,225,.4],[3,180,.85]]){
  await p.evaluate('void map.jumpTo('+JSON.stringify({center:[-157,-85.051128],zoom,bearing,padding:{top:h*padding,bottom:0,left:0,right:0}})+')');
  await p.settle();await capPixels(p,name+'-z'+zoom+'-'+width,color);
 }
}
export default [1280,390].map(width=>({name:'Antarctic globe drag, zoom-out escape and selected/background pole fill '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#antarctica');await p.waitFor('AtlasEntry.current==="antarctica"&&currentAtlas()?.ready&&!countrySwitching');await p.settle();
 assert.equal(await p.evaluate('map.getProjection().type'),'globe');
 const rect=await p.evaluate('(()=>{const b=map.getCanvas().getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height}})()'),start=[rect.x+rect.w*.53,rect.y+rect.h*.4];
 const grabbed=await p.evaluate('map.unproject(['+(start[0]-rect.x)+','+(start[1]-rect.y)+']).toArray()');
 await p.drag(start,{dx:width===390?45:80,dy:110},{duration:500});await p.settle();
 const pose=await p.evaluate('({lat:map.getCenter().lat,bearing:map.getBearing()})');assert(pose.lat>-82,'Dragging away from the pole moves the globe away rather than circling it');assert(Math.abs(pose.bearing)>1,'The globe can change its orientation during a drag');
 const moved=await p.evaluate('(()=>{const p=map.project('+JSON.stringify(grabbed)+');return [p.x,p.y]})()');assert(moved[1]-(start[1]-rect.y)>50,'The grabbed ground follows the drag');
 const view=await p.evaluate('AtlasView.hashFor(captureView())');assert(view);await p.open(base,view);await p.waitFor('Math.abs(map.getBearing()-'+pose.bearing+')<.01');
 await p.screenshot('antarctica-free-globe-drag-'+width);
 await p.evaluate('currentAtlas().home()');await p.settle();
 await p.tap('#zoom-out');await p.settle();await p.tap('#zoom-out');await p.settle();
 const countryPoint=await p.evaluate('(()=>{const p=map.project([-65,-42]),b=map.getCanvas().getBoundingClientRect();return [p.x+b.x,p.y+b.y]})()');
 await p.tap(countryPoint);await p.waitFor('AtlasEntry.current==="argentina"&&!countrySwitching');assert.equal(await p.evaluate('currentAtlas()?.ready'),true,'Another country opens directly from the globe');
 await p.open(base,'#antarctica');await p.waitFor('AtlasEntry.current==="antarctica"&&currentAtlas()?.ready&&!countrySwitching');
 await p.evaluate('for(const id of ["aq-label-layer","aq-station-layer"]){const e=document.getElementById(id);e.checked=false;e.dispatchEvent(new Event("change"));}');
 await capViews(p,'antarctica-selected-no-wedge',[227,237,242],width);
 await p.evaluate('AtlasSettings.setSettings({projection:"globe"})');assert(await p.evaluate('changeAtlas("bahrain",false)'));
 await capViews(p,'antarctica-background-no-wedge',[215,215,211],width);
 assert.equal(await p.evaluate('countryAt(map.project([-157,-88]))?.country'),'antarctica','The repaired polar surface is clickable');
 assert.equal(await p.evaluate('map.getProjection().type'),'globe');
}}));
