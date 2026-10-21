import assert from 'node:assert/strict';import fs from 'node:fs';
import {searchAndSelect} from './countries.test.mjs';
const paths=JSON.parse(fs.readFileSync('dist/data/europe/brunei/frontier-reference.json')).paths,points=paths.flatMap(p=>[.12,.47,.82].map(t=>p[Math.floor((p.length-1)*t)]));
export default [
 ...[1280,390].map(width=>({name:'Brunei districts, mukims, clickable parent, saved view and quiz '+width,options:{width,height:900,mobile:width===390},async run(p,base){
  await p.open(base,'#brunei');assert.equal(await p.evaluate('AtlasEntry.current'),'brunei');assert(await p.evaluate('map.queryRenderedFeatures({layers:["brunei-first-fill"]}).length>0'));
  await searchAndSelect(p,'Labi','Labi','Mukim');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'BN-M-30');await p.tap('#breadcrumb-region .breadcrumb-parent');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'BN-BE');
  await searchAndSelect(p,'Temburong','Temburong','District');assert.equal(await p.evaluate('currentAtlas().getSelection()'),'BN-TE');assert((await p.evaluate('document.querySelector("#brunei-sidebar").textContent')).includes('9,500'));await p.screenshot('brunei-temburong-'+width);
  const view=await p.evaluate('AtlasView.hashFor(captureView())');await p.open(base,view);assert.equal(await p.evaluate('currentAtlas().getSelection()'),'BN-TE');
  await p.tap('#bn-tab-quiz');assert((await p.evaluate('document.querySelector("#bn-quiz-panel [data-q=count]").textContent')).startsWith('4 Districts available'));await p.tap('#bn-quiz-panel [data-q=start]');await p.settle();assert(await p.evaluate('currentAtlas().quiz.active'));await p.tap('#bn-quiz-panel [data-q=reveal]');assert((await p.evaluate('document.querySelector("#bn-quiz-panel [data-q=feedback]").textContent')).startsWith('Answer shown'));await p.tap('#home');await p.settle();assert.equal(await p.evaluate('currentAtlas().getSelection()'),'BN-TE');assert(!await p.evaluate('quiz.active'));assert(await p.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 }})),
 {name:'Brunei–Malaysia complete western and Temburong outlines at every zoom',options:{width:1280,height:900},async run(p,base){
  for(const country of ['brunei','malaysia']){await p.open(base,'#'+country);assert.equal(await p.evaluate('AtlasEntry.current'),country);for(const zoom of [8,12,14])for(const [i,point]of points.entries()){
   await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:'+zoom+',padding:{top:0,bottom:0,left:0,right:0},bearing:0,pitch:0})');await p.settle();
   const layers=country==='brunei'?'["atlas-frontiers"]':'["malaysia-first-lines"]';assert(await p.evaluate('(()=>{const q=map.project('+JSON.stringify(point)+');return map.queryRenderedFeatures([[q.x-2,q.y-2],[q.x+2,q.y+2]],{layers:'+layers+'}).length>0})()'),'Continuous '+country+' border at zoom '+zoom+' '+point);if(zoom===12&&(i===1||i===4))await p.screenshot('brunei-border-'+country+'-'+i);
  }}
 }}
];