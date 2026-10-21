import assert from 'node:assert/strict';
import sharp from 'sharp';
const capture=p=>p.evaluate('new Promise(resolve=>{map.once("render",()=>resolve(map.getCanvas().toDataURL()));map.triggerRepaint();})');
const pixels=async url=>sharp(Buffer.from(url.slice(url.indexOf(',')+1),'base64')).ensureAlpha().raw().toBuffer();
export default [{name:'visible native symbols retain their separate tile order, placement and pixels',options:{width:1024,height:909,mobile:true},async run(p,base){
 await p.open(base,'#china');if(await p.evaluate('map.getProjection().type')!=='globe')await p.tap('#globe-view');await p.settle();
 await p.evaluate(`(()=>{map.addImage('test-label',{width:8,height:8,data:new Uint8Array(8*8*4).map((_,i)=>i%4===0||i%4===3?255:0)});map.addSource('test-labels',{type:'geojson',data:{type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[105,36]}}]}});map.addLayer({id:'test-labels',type:'symbol',source:'test-labels',layout:{'icon-image':'test-label','icon-size':3,'icon-allow-overlap':true}});map.jumpTo({center:[105,36],zoom:3.3});})()`);await p.settle();
 for(const zoom of [3.3,3.8,4.2]){
  await p.evaluate('void map.jumpTo({center:[105,36],zoom:'+zoom+'})');await p.settle();
  await p.evaluate('AtlasGlobeRendererController.setEnabled(false);void map.triggerRepaint()');await p.settle();const native=[await pixels(await capture(p)),await pixels(await capture(p))];
  await p.evaluate('AtlasGlobeRendererController.setEnabled(true);void map.triggerRepaint()');await p.settle();const optimized=[await pixels(await capture(p)),await pixels(await capture(p))];
  let persistent=0;const changed=[0,0];for(let i=0;i<native[0].length;i+=4){const out=optimized.map(frame=>[0,1,2].some(c=>frame[i+c]<Math.min(native[0][i+c],native[1][i+c])-2||frame[i+c]>Math.max(native[0][i+c],native[1][i+c])+2));out.forEach((value,j)=>{if(value)changed[j]++;});if(out.every(Boolean))persistent++;}
  assert(persistent<=5&&Math.max(...changed)<=32,JSON.stringify({zoom,persistent,changed}));assert(await p.evaluate('map.queryRenderedFeatures({layers:["test-labels"]}).length>0'));
 }
 await p.evaluate('map.setLayoutProperty("test-labels","visibility","none");void 0');await p.settle();assert.equal(await p.evaluate('map.queryRenderedFeatures({layers:["test-labels"]}).length'),0);
 await p.evaluate('map.setLayoutProperty("test-labels","visibility","visible");void 0');await p.settle();assert(await p.evaluate('map.queryRenderedFeatures({layers:["test-labels"]}).length>0'));
 await p.screenshot('native-symbol-tiles-preserved');
 }}];
