import assert from 'node:assert/strict';
import {searchAndSelect} from './countries.test.mjs';
const fixtures=[{"id":"RU-D-23468215787928","en":"Barun-Khemchiksky Kozhuun","local":"Барун-Хемчикский кожуун","kind":"Kozhuun","audio":false},{"id":"RU-D-43089956732561","en":"Agapovsky Municipal Okrug","local":"Агаповский муниципальный округ","kind":"Municipal okrug","audio":false},{"id":"RU-D-35606429719645","en":"Kostomuksha","local":"Костомукша","kind":"Municipal okrug","audio":true},{"id":"RU-D-66849950652275","en":"Taymyrsky Dolgano-Nenetsky Municipal Okrug","local":"Таймырский Долгано-Ненецкий муниципальный округ","kind":"Municipal okrug","audio":false},{"id":"RU-D-96751570188026","en":"Cheremkhovo","local":"Черемхово","kind":"Urban okrug","audio":false},{"id":"RU-D-76144209526439","en":"Egvekinot Municipal Okrug","local":"муниципальный округ Эгвекинот","kind":"Municipal okrug","audio":false}];
export default [false,true].map(mobile=>({name:'Russia current municipal types and kozhuuns '+(mobile?'phone':'desktop'),options:mobile?{width:390,height:844,mobile:true}:{width:1280,height:900},async run(p,base){
 await p.open(base,'#russia');await p.settle();
 for(const f of fixtures){await p.evaluate('currentAtlas().restore('+JSON.stringify(f.id)+').then(()=>true)');await p.settle();if(mobile)for(let i=0;i<3&&await p.evaluate('document.documentElement.dataset.sheet!=="full"');i++)await p.tap('#russia-sidebar .sheet-handle');
 const card=await p.evaluate('(()=>{const b=document.querySelector("#ru-pronunciation");return {en:document.querySelector("#ru-name").textContent,local:document.querySelector("#ru-local").textContent,kind:document.querySelector("#ru-kind").textContent,audio:!!b&&!b.hidden,overflow:document.documentElement.scrollWidth>innerWidth+1};})()');
 assert.equal(card.en,f.en);assert.equal(card.local,f.local);assert.equal(card.kind,f.kind.toUpperCase());assert.equal(card.audio,f.audio);assert(!card.overflow);}
 await searchAndSelect(p,'Egvekinot Municipal Okrug','Egvekinot Municipal Okrug');
 await p.screenshot('russia-municipal-labels-'+(mobile?'phone':'desktop'));
 await p.evaluate('currentAtlas().restore("RU-D-49783608080364").then(()=>true)');await p.settle();assert.equal(await p.evaluate('document.querySelector("#ru-name").textContent'),'Achinsky District');
}}));
