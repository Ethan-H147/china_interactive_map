import assert from 'node:assert/strict';
import {regionalFlags} from '../../dist/regional-flags.mjs';
import {load} from '../geo-index.mjs';
import {searchAndSelect} from './countries.test.mjs';
const cases=[['palau','pw','PW-002'],['micronesia','fm','FM-YAP'],['papua-new-guinea','pg','PG20'],['solomon-islands','sb','SB10'],['romania','ro','RO322'],['bulgaria','bg','BG411']];
const scenarios=cases.map(([country,prefix,example])=>({name:country+' adopted flags use shared details and original viewer',options:{width:1280,height:900},async run(p,base){
 await p.open(base,'#'+country);await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");const units=load('dist/data/europe/'+country+'/catalogue.bin').records,first=units.find(r=>r.id===example);await searchAndSelect(p,first.en,first.en,first.kind);
 for(const [level,flags]of [[1,regionalFlags[country].firstFlags],[2,regionalFlags[country].detailFlags]])for(const [id,f]of Object.entries(flags)){
  await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');const imgId=prefix+(level===1?'-flag':'-detail-flag');
  await p.waitFor(`(()=>{const i=document.getElementById(${JSON.stringify(imgId)});return i&&i.getAttribute('src')===${JSON.stringify(f.file)}&&i.complete&&i.naturalWidth>0&&!i.closest('a').hidden})()`,{label:country+' '+id+' flag'});
 }
 await p.evaluate('currentAtlas().restore('+JSON.stringify(example)+')');await p.waitFor(`document.getElementById('${prefix}-flag').getAttribute('src')===${JSON.stringify(regionalFlags[country].firstFlags[example].file)}`);await p.tap('#'+prefix+'-flag-source');
 await p.waitFor(`document.getElementById('flag-viewer').open&&document.getElementById('flag-viewer-image').getAttribute('src')===${JSON.stringify(regionalFlags[country].firstFlags[example].full)}`);assert((await p.evaluate("document.getElementById('flag-viewer-credit').textContent")).length>10);await p.screenshot(country+'-regional-flag-original');await p.key('Escape');
 if(country==='romania'||country==='bulgaria'){const id=country==='romania'?'RO223':'BG412';await p.evaluate('currentAtlas().restore('+JSON.stringify(id)+')');await p.waitFor(`document.getElementById('${prefix}-flag-source').hidden`);}
}}));

for(const [country,prefix,id]of [['palau','pw','PW-004'],['romania','ro','RO_40198']])scenarios.push({name:country+' local flag fits the phone viewer',options:{width:390,height:844,mobile:true},async run(p,base){
 await p.open(base,'#'+country);await p.evaluate("AtlasSettings.setSettings({motion:'reduce'})");const r=load('dist/data/europe/'+country+'/catalogue.bin').records.find(r=>r.id===id),f=regionalFlags[country][r.level===1?'firstFlags':'detailFlags'][id];await searchAndSelect(p,r.en,r.en,r.kind);const img=prefix+(r.level===1?'-flag':'-detail-flag');await p.waitFor('document.getElementById('+JSON.stringify(img)+').complete');await p.tap('#'+img+'-source');await p.waitFor('document.getElementById("flag-viewer-image").getAttribute("src")==='+JSON.stringify(f.full));const size=await p.evaluate('(()=>{const r=document.getElementById("flag-viewer-image").getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom}})()');assert(size.width>260&&size.height>100);assert(size.left>=0&&size.top>=0&&size.right<=390&&size.bottom<=844);await p.screenshot(country+'-local-flag-phone');
}});
export default scenarios;
