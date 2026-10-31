import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
export default [false,true].map(mobile=>({name:'Lower Austria flag has a regular thumbnail and enlarged original '+(mobile?'on phone':'on desktop'),options:{width:mobile?390:1280,height:mobile?844:900,mobile},async run(p,base){
 await p.open(base,'#austria');await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");await searchAndSelect(p,'Lower Austria','Lower Austria');
 await p.waitFor(`document.getElementById('at-flag').complete&&document.getElementById('at-flag').naturalHeight>=120`);
 const preview=await p.evaluate(`(()=>{const i=document.getElementById('at-flag'),r=i.getBoundingClientRect();return {w:r.width,h:r.height}})()`);
 assert(preview.w>=39&&preview.h>=26,'Lower Austria matches the national flag thumbnail frame');
 await p.tap('#at-flag-source');await p.waitFor(`document.getElementById('flag-viewer-image').getAttribute('src').endsWith('AT-B-3.svg')`);
 const full=await p.evaluate(`(()=>{const r=document.getElementById('flag-viewer-image').getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()`);
 assert(full.w>(mobile?280:900)&&full.h>(mobile?180:600),'Original fills the available viewer');assert(Math.abs(full.w/full.h-1.5)<.001);assert(full.left>=0&&full.top>=0&&full.right<=(mobile?390:1280)&&full.bottom<=(mobile?844:900));await p.screenshot('lower-austria-flag-'+(mobile?'phone':'desktop'));
}}));
