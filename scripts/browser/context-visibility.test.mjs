import assert from 'node:assert/strict';
import sharp from 'sharp';
const capture=p=>p.evaluate('new Promise(resolve=>{map.once("render",()=>resolve(map.getCanvas().toDataURL()));map.triggerRepaint();})');
const png=url=>Buffer.from(url.slice(url.indexOf(',')+1),'base64');
export default [{name:'off-screen context culling preserves globe, date-line, polar and flat map pixels',options:{width:1366,height:1024,mobile:true},async run(p,base){
 await p.open(base,'#china');
 let mostCulled=0;
 for(const projection of ['globe','mercator'])for(const [name,center,zoom]of [['china',[105,36],3.3],['europe',[13,49],4],['pacific',[178,-20],3],['north-pole',[0,82],2],['south-america',[-65,-20],4],['alaska',[-150,60],2]]){
  await p.evaluate(`(()=>{mapScene.setCulling(true);map.setProjection({type:${JSON.stringify(projection)}});map.jumpTo({center:${JSON.stringify(center)},zoom:${zoom}});})()`);await p.settle();
  const culled=await capture(p),stats=await p.evaluate('mapScene.cullingStats()');mostCulled=Math.max(mostCulled,stats.culledLayers);
  await p.evaluate('mapScene.setCulling(false)');await p.settle();const complete=await capture(p);
  const a=await sharp(png(culled)).raw().toBuffer(),b=await sharp(png(complete)).raw().toBuffer();
  assert.equal(a.length,b.length);let changed=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>2)changed++;
  assert(changed<=5,`${projection} ${name}: culling changed ${changed} visible pixels`);
 }
 assert(mostCulled>50,'The overview should skip many off-screen context layers');
 await p.evaluate('mapScene.setCulling(true)');await p.tap('#settings-open');await p.tap('#settings-rendering-diagnostics');await p.tap('#settings-close');
 await p.drag('#map',{dx:160,dy:25},{steps:40,duration:1000});await p.settle();
 const report=await p.evaluate('AtlasPerformanceController.snapshot()');
 assert.equal(report.lastGesture.pixelRatioMin,1.5);assert.equal(report.lastGesture.pixelRatioMax,1.5);assert(report.lastGesture.durationMs>=1000);assert(report.lastGesture.renderGapP95>0);assert(report.contextCulling.enabled);
 await p.screenshot('context-culling-globe-diagnostics');
}}];
