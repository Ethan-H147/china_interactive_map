import assert from 'node:assert/strict';
import fs from 'node:fs';
import {singaporeLanguages,singaporeName,readSingaporeLanguage} from '../dist/singapore-languages.mjs';
import {hashFor,fromHash,validate,write,read} from '../dist/view-state.mjs';
assert.deepEqual(singaporeLanguages.map(([,name])=>name),['Chinese','Malay','English','Tamil']);
const storage=new Map(),adapter={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
for(const [code,,name] of singaporeLanguages){
 assert.equal(singaporeName(code),name);adapter.setItem('boundary-atlas-singapore-language-v1',code);assert.equal(readSingaporeLanguage(adapter),code);
 const value={v:1,country:'singapore',center:[103.83,1.33],zoom:10,language:code,selection:'SG'};const parsed=fromHash(hashFor(value));assert.equal(parsed.language,code);write(value,adapter);assert.equal(read('singapore',adapter).language,code);
}
assert.equal(readSingaporeLanguage({getItem(){throw Error('Blocked storage');}}),'en');
for(const language of ['both','local','bad'])assert.equal(validate({v:1,country:'singapore',center:[103.83,1.33],zoom:10,language}).language,'en');
for(const country of ['china','japan','korea','malaysia'])for(const language of ['en','local','both'])assert.equal(validate({v:1,country,center:[110,3],zoom:5,language}).language,language);
const app=fs.readFileSync('dist/app.js','utf8');assert(app.includes("if(singapore)select.dataset.singaporeLanguage=''"),'Singapore selector must not be changed by another country’s global language control');
const html=fs.readFileSync('dist/index.html','utf8');for(const [id,lang,name] of [['atlas-title-malay','ms','Singapura'],['atlas-title-tamil','ta','சிங்கப்பூர்']])assert(html.includes('id="'+id+'" lang="'+lang+'" hidden>'+name));
console.log('Four Singapore label languages, names, independent storage, shared views, blocked storage and unchanged country language choices passed.');
