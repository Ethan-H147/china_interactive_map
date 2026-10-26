import assert from 'node:assert/strict';
// Known background slits measured before the repair, away from real water.
const cases=[{country:'kazakhstan',points:[[54.526202,50.851137],[62.640341,54.08267],[75.004849,53.806521],[84.266651,50.343176]]},{country:'canada',points:[[-140.999655,64.704072],[-139.072693,60.344265],[-135.305598,59.718529],[-133.173502,58.151657]]}];
async function landPixel(p,point){return p.evaluate(`new Promise(resolve=>{map.once('render',()=>{const q=map.project(${JSON.stringify(point)}),canvas=map.getCanvas(),gl=canvas.getContext('webgl2'),ratio=canvas.width/canvas.clientWidth,pixel=new Uint8Array(4);gl.readPixels(Math.round(q.x*ratio),canvas.height-1-Math.round(q.y*ratio),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);const color=map.getPaintProperty('background','background-color'),rgb=/^#/.test(color)?color.slice(1).match(/../g).map(c=>parseInt(c,16)):[];resolve({pixel:[...pixel],difference:Math.max(...rgb.map((v,i)=>Math.abs(v-pixel[i])))});});map.triggerRepaint();})`);}
export default [1280,390].map(width=>({name:'Northern border slits remain filled in both projections '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.open(base,'#kazakhstan');
 for(const entry of cases){
  if(entry.country!=='kazakhstan'){await p.evaluate(`changeAtlas('${entry.country}',false)`);await p.settle();}
  for(const projection of ['mercator','globe']){
   await p.evaluate(`document.getElementById('globe-view').setAttribute('aria-pressed','${projection==='globe'}');syncGlobe(false);void 0`);
   for(const point of entry.points){
    await p.evaluate(`map.jumpTo({center:${JSON.stringify(point)},zoom:11.5});void 0`);await p.settle();
    assert(await p.evaluate(`map.queryRenderedFeatures(map.project(${JSON.stringify(point)}),{layers:['${entry.country}-first-fill']}).length>0`),entry.country+' includes repaired land at '+point);
    assert((await landPixel(p,point)).difference>8,'No water-colored slit at '+point+' in '+projection);
   }
  }
  await p.screenshot('northern-frontier-'+entry.country+'-'+width);
 }
 await p.evaluate("changeAtlas('finland',false)");await p.settle();
 for(const entry of cases)for(const point of entry.points){await p.evaluate(`map.jumpTo({center:${JSON.stringify(point)},zoom:10});void 0`);await p.settle();assert((await landPixel(p,point)).difference>8,'Unopened-country preview keeps the gap filled at '+point);}
}}));
