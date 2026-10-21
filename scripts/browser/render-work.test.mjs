import assert from 'node:assert/strict';
import sharp from 'sharp';
const capture=p=>p.evaluate('new Promise(resolve=>{map.once("render",()=>resolve(map.getCanvas().toDataURL()));map.triggerRepaint();})');
const raw=async url=>sharp(Buffer.from(url.slice(url.indexOf(',')+1),'base64')).ensureAlpha().raw().toBuffer();
async function samePixels(p,name){
 await p.evaluate('mapScene.setHorizonCulling(true);mapScene.setSelectionCulling(true)');await p.settle();const culled=await raw(await capture(p));
 await p.evaluate('mapScene.setHorizonCulling(false);mapScene.setSelectionCulling(false)');await p.settle();const all=await raw(await capture(p));
 let changed=0;assert.equal(culled.length,all.length);for(let i=0;i<all.length;i+=4)if(Math.max(Math.abs(culled[i]-all[i]),Math.abs(culled[i+1]-all[i+1]),Math.abs(culled[i+2]-all[i+2]))>2)changed++;
 assert(changed<=5,name+': changed '+changed+' visible pixels');
 await p.evaluate('mapScene.setHorizonCulling(true);mapScene.setSelectionCulling(true)');
}
export default [{name:'globe horizon and empty selection culling preserve overview, selected boundaries, flat maps and reloads',options:{width:1366,height:1024,mobile:true},async run(p,base){
 await p.open(base,'#china');if(await p.evaluate('map.getProjection().type')!=='globe')await p.tap('#globe-view');await p.settle();
 const views=[['china',[105,36],3.3],['pole',[0,82],2],['south-pole',[0,-82],2],['date-line',[179,-10],2.8],['america',[-65,20],2.8],['horizon-cutoff',[105,36],4.9],['flat-transition',[105,36],5.1]];
 for(const [name,center,zoom]of views){await p.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:'+zoom+'})');await p.settle();await samePixels(p,name);}
 await p.evaluate('void map.jumpTo({center:[105,36],zoom:3.3})');await p.settle();assert.equal(await p.evaluate('map.getLayoutProperty("province-selection","visibility")'),'none');
 for(const code of [110000,810000]){await p.evaluate('selectRegion(provinceLayers.get('+code+'),'+code+',false)');await p.settle();assert.equal(await p.evaluate('map.getLayoutProperty("province-selection","visibility")'),'visible');await samePixels(p,'selected '+code);}
 await p.evaluate('selectRegion(regionByCode.get(510100),510000,false)');await p.settle();assert.equal(await p.evaluate('map.getLayoutProperty("prefecture-selection","visibility")'),'visible');await samePixels(p,'selected prefecture');
 await p.evaluate('saveView(true)');await p.send('Page.reload');await p.settle();assert.equal(await p.evaluate('selected.layer.feature.properties.adcode'),510100);assert.equal(await p.evaluate('map.getLayoutProperty("prefecture-selection","visibility")'),'visible');
 await p.tap('#globe-view');await p.settle();assert.equal(await p.evaluate('map.getProjection().type'),'mercator');await samePixels(p,'flat selection');await p.screenshot('render-work-selected-boundaries');
}}];
