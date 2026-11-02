import assert from 'node:assert/strict';
import sharp from 'sharp';
const layers=['canada-lake-water','major-lake-water','americas-inland-water','cyprus-control'];
const capture=async p=>{
 const url=await p.evaluate('new Promise(resolve=>{map.once("render",()=>resolve(map.getCanvas().toDataURL()));map.triggerRepaint();})');
 return sharp(Buffer.from(url.split(',')[1],'base64')).ensureAlpha().raw().toBuffer();
};
export default [1280,390].map(width=>({name:'Unused water, control lines and empty neighbours avoid tile work with identical visible pixels '+width,options:{width,height:900,mobile:width===390},async run(p,base){
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('boundary-atlas-rendering-v1',JSON.stringify({quality:'full'}));"});
 // Phone adapters load on demand; retain Cyprus's reference layer before leaving it.
 await p.open(base,'#cyprus');await p.waitFor('!!map.getLayer("cyprus-control")');
 assert(await p.evaluate("changeAtlas('japan',false)"));await p.settle();
 for(const country of ['chile','peru','paraguay'])assert(!await p.evaluate(`!!map.getSource('${country}-neighbours')`),'Verified empty neighbours never enter the renderer: '+country);
 await p.evaluate('void map.jumpTo({center:[137,36],zoom:6.3})');await p.settle();
 await p.evaluate(`window.unusedLoads={};for(const id of ${JSON.stringify(layers)}){const source=map.getSource(id),load=source.loadTile.bind(source);source.loadTile=(...args)=>{unusedLoads[id]=(unusedLoads[id]||0)+1;return load(...args);};}void 0`);
 for(const z of [6.7,6.1,6.6]){await p.evaluate(`new Promise(resolve=>{map.once('moveend',()=>resolve(true));map.easeTo({zoom:${z},duration:220});})`);await p.settle();}
 const idle=await p.evaluate(`({loads:unusedLoads,used:${JSON.stringify(layers)}.filter(id=>map.style.tileManagers[id].used)})`);
 assert.equal(Object.values(idle.loads).reduce((a,b)=>a+b,0),0,'No distant overlay requests empty tiles');assert.deepEqual(idle.used,[]);
 // Compare actual map pixels with and without culling, including lakes and the control line themselves.
 for(const projection of ['mercator','globe'])for(const [name,center,zoom,layer]of [
  ['Japan',[137,36],6.3,null],['Great Bear',[-121,66],5.8,'canada-lake-water'],
  ['Baikal',[108,53.5],6,'major-lake-water'],['Nicaragua',[-85.4,11.6],7,'americas-inland-water'],
  ['Cyprus',[33.2,35.1],8,'cyprus-control'],['Africa overview',[20,0],2.5,null],
  ['North Pole',[0,82],2,null],['date line',[179,5],2,null]
 ]){
  await p.evaluate(`mapScene.setCulling(true);map.setProjection({type:${JSON.stringify(projection)}});void map.jumpTo({center:${JSON.stringify(center)},zoom:${zoom}})`);await p.settle();
  const culled=await capture(p);
  if(layer){const result=await p.evaluate(`({visible:map.getLayoutProperty('${layer}','visibility')!=='none',hits:map.queryRenderedFeatures({layers:['${layer}']}).length})`);assert(result.visible&&result.hits>0,'Visible '+name+' geometry returns in '+projection+': '+JSON.stringify(result));}
  await p.evaluate('mapScene.setCulling(false)');await p.settle();const complete=await capture(p);
  assert.equal(culled.length,complete.length);let changed=0;
  for(let i=0;i<culled.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(culled[i+c]-complete[i+c])))>2)changed++;
  assert(changed<=5,'Culling preserves '+name+' pixels in '+projection+': '+changed);
 }
 await p.evaluate('mapScene.setCulling(true);void 0');assert(await p.evaluate('mapScene.assertOrder()'));
 await p.screenshot('unused-source-work-'+width);
}}));
