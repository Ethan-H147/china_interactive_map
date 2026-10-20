import assert from 'node:assert/strict';import {load,linesOf,metres} from '../geo-index.mjs';
const resolved=load('dist/data/korean-frontiers.bin'),islands=load('dist/data/korean-river-islands.bin');
const path=pair=>linesOf({features:resolved.features.filter(f=>f.properties.pair===pair)})[0];
function samples(points){const out=[];let distance=0;for(let i=1;i<points.length;i++){distance+=metres(points[i-1],points[i]);if(distance>500){out.push(points[i]);distance=0;}}return out;}
async function stroke(page,pair){const points=samples(path(pair)),layer=pair==='CHN-PRK'?'shared-context-borders':'russia-international';return page.evaluate(`new Promise(resolve=>{map.once('render',()=>{const c=map.getCanvas(),gl=c.getContext('webgl2'),pixels=new Uint8Array(c.width*c.height*4),scale=c.width/c.clientWidth;gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let tested=0,missing=0;for(const pt of ${JSON.stringify(points)}){const q=map.project(pt);if(q.x<12||q.y<90||q.x>c.clientWidth-12||q.y>c.clientHeight-50)continue;tested++;let ink=false;const x=Math.round(q.x*scale),y=c.height-1-Math.round(q.y*scale);for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const i=((y+dy)*c.width+x+dx)*4;if((pixels[i]+pixels[i+1]+pixels[i+2])/3<208)ink=true;}if(!ink)missing++;}resolve({tested,missing});});map.triggerRepaint();})`);}
export default [
 {name:'China close-up river bends have no duplicate orange borders or unfilled enclaves',options:{width:1280,height:950},async run(p,base){
  await p.open(base,'#china');await p.evaluate('window.AtlasSheet?.collapse();true');
  for(const [tag,center,zoom]of [['junction',[130.63,42.42],12],['bend',[130.55,42.53],12],['stretch',[130.61,42.47],11],['island',[130.240949,42.789957],12],['small-island',[130.448689,42.546989],14]]){
   await p.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:'+zoom+'})');await p.settle();
   const lines=await p.evaluate('map.queryRenderedFeatures({layers:["province-lines"]}).map(f=>f.properties)');assert.equal(lines.length,0,'No orange national-edge fragments in '+tag);
   const holes=await p.evaluate('('+function(points){return points.map(point=>{const p=map.project(point);if(p.x<20||p.x>map.getCanvas().clientWidth-20||p.y<120||p.y>map.getCanvas().clientHeight-80)return null;const hits=map.queryRenderedFeatures(p,{layers:['province-fill','province-fragment-fill','korea-portal-fill'].filter(id=>map.getLayer(id))});return{point,korea:hits.some(f=>f.layer.id==='korea-portal-fill'),china:hits.some(f=>f.layer.id!=='korea-portal-fill')};}).filter(Boolean);}.toString()+')('+JSON.stringify(islands.features.map(f=>f.properties.center))+')');
   for(const h of holes){assert(!h.korea,'No Korean island overlay remains '+JSON.stringify(h));assert(h.china,'Enclosing Chinese display fills the cutout '+JSON.stringify(h));}
   await p.screenshot('china-border-fixed-'+tag);
  }
 }},
 ...[1280,390].map(width=>({name:'Korean river borders meet without gaps or fading fragments '+width,options:{width,height:950,mobile:width===390},async run(p,base){
  for(const country of ['china','korea','russia']){await p.open(base,'#'+country);await p.evaluate('window.AtlasSheet?.collapse();true');
   for(const [pair,center,zoom]of [['CHN-PRK',[126.2,41.15],7.2],['CHN-PRK',[129.8,42.9],8.2],['PRK-RUS',[130.66,42.36],10],['CHN-RUS-TUMEN',[130.61,42.47],10]]){await p.evaluate('void map.jumpTo({center:'+JSON.stringify(center)+',zoom:'+zoom+'})');await p.settle();const r=await stroke(p,pair);assert(r.tested>2,country+' '+pair+' has visible samples '+JSON.stringify(r));assert.equal(r.missing,0,country+' '+pair+' complete visible ink '+JSON.stringify(r));if(pair==='PRK-RUS')await p.screenshot('korean-frontiers-'+country+'-'+width);}
   assert.equal(await p.evaluate('mapScene.assertOrder()'),true);
  }
 }})),
 {name:'Åland overview has detailed islands and no coarse gray background',options:{width:1280,height:900},async run(p,base){await p.open(base,'#finland');await p.evaluate('void map.jumpTo({center:[20.08,60.2],zoom:8.5})');await p.settle();assert(!await p.evaluate('map.queryRenderedFeatures({layers:["world-country-outlines"]}).some(f=>(f.properties.countries||"").split(" ").includes("ALD"))'));await p.screenshot('aland-detailed-islands');await p.evaluate('currentAtlas().restore("FI-21").then(()=>true)');await p.settle();await p.screenshot('aland-detailed-selected');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'FI-21');}}
];
