import assert from 'node:assert/strict';
import {load} from '../geo-index.mjs';
const borders=['myanmar','laos'].flatMap(country=>load('dist/data/europe/'+country+'/alignment-report.json').canonicalNeighbours.map(r=>({name:country+'–'+r.neighbour,id:(country==='myanmar'?'MMR':'LAO')+'-'+r.neighbour,path:r.canonical})));
export default [{name:'Southeast Asian borders remain visible while Russia is open',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#russia');await p.waitFor('map.isSourceLoaded("atlas-frontiers")');
 for(const border of borders){
  const point=border.path[Math.floor(border.path.length*.4)];await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:8})');await p.settle();
  const result=await p.evaluate('new Promise(resolve=>{map.once("render",()=>{const canvas=map.getCanvas(),gl=canvas.getContext("webgl2"),pixels=new Uint8Array(canvas.width*canvas.height*4),scale=canvas.width/canvas.clientWidth;gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let tested=0,missing=0;for(const pt of '+JSON.stringify(border.path)+'){const q=map.project(pt);if(q.x<8||q.y<80||q.x>canvas.clientWidth-8||q.y>canvas.clientHeight-50)continue;tested++;const x=Math.round(q.x*scale),y=canvas.height-1-Math.round(q.y*scale);let found=false;for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=3;dy++){const i=((y+dy)*canvas.width+x+dx)*4;if((pixels[i]+pixels[i+1]+pixels[i+2])/3<210)found=true;}if(!found)missing++;}const q=map.project('+JSON.stringify(point)+');const hits=map.queryRenderedFeatures([[q.x-3,q.y-3],[q.x+3,q.y+3]],{layers:["atlas-frontiers"]}).map(f=>f.properties.canonicalBorder);resolve({tested,missing,hits});});map.triggerRepaint();})');
  assert(result.tested>3,border.name+' has visible samples');assert.equal(result.missing,0,border.name+' has continuous visible strokes '+JSON.stringify(result));assert(result.hits.includes(border.id),border.name+' uses the reconciled border');
 }
 await p.evaluate('void map.jumpTo({center:[102,18],zoom:5.5})');await p.settle();assert.equal(await p.evaluate('AtlasEntry.current'),'russia');assert(await p.evaluate('mapScene.assertOrder()'));await p.screenshot('southeast-asian-shared-frontiers');
}}];
