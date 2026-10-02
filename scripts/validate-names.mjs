import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readData} from './read-data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const display=readData('display-boundaries.json');
const names=read('../dist/data/region-names.json').regions;
const features=[...display.provinces.features,...display.subdivisions.features];
assert.equal(Object.keys(names).length,536);
const languageCounts={};
for(const {properties:p} of features){
  const entry=names[p.adcode];
  assert(entry?.en&&!/[\u3400-\u9fff]/.test(entry.en),`English name: ${p.adcode}`);
  assert.equal(entry.zh,p.name);
  assert(entry.source.startsWith('https://'));
  for(const n of entry.regional){
    assert(n.text&&n.source.startsWith('https://')&&n.license);
    const arabic=['ug','kk-Arab','ky-Arab'].includes(n.lang);
    assert.equal(n.dir,arabic?'rtl':'ltr');
    if(arabic)assert(/[\u0600-\u06ff]/.test(n.text));
    assert.equal(n.vertical,['mn-Mong','mnc-Mong'].includes(n.lang));
    if(n.vertical){assert(/[\u1820-\u18aa]/.test(n.text));assert(!/[\u0400-\u04ff]/.test(n.text));}
    if(n.lang==='bo')assert(/[\u0f00-\u0fff]/.test(n.text));
    languageCounts[n.language]=(languageCounts[n.language]||0)+1;
  }
}
assert.equal(names[420100].en,'Wuhan');
assert(names[654000].regional.some(n=>n.lang==='kk-Arab'));
assert(names[653000].regional.some(n=>n.lang==='ky-Arab'));
for(const f of display.subdivisions.features.filter(f=>f.properties.provinceCode===150000))assert(names[f.properties.adcode].regional.some(n=>n.lang==='mn-Mong'));
assert.equal(names[420100].regional.length,0);
const manchu=read('name-sources/manchu.json');
for(const [code,source] of Object.entries(manchu.regions)){
  const name=names[code].regional.find(n=>n.lang==='mnc-Mong');
  assert.equal(name?.text,source.text);
  assert.equal(name?.source,source.source);
  assert.equal(name?.language,'Manchu');
}
assert.equal(languageCounts.Manchu,3);
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const elements=new Map();
function element(){return {hidden:false,textContent:'',children:[],dataset:{},classList:{toggle(){}},replaceChildren(){this.children=[];},append(...children){this.children.push(...children);}};}
const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
const context=vm.createContext({$,regionNames:names,english:{},document:{createElement:element}});
vm.runInContext(app.slice(app.indexOf('const english='),app.indexOf('const reducedMotion=')),context);
vm.runInContext(app.slice(app.indexOf('function englishName('),app.indexOf('function isPrefectureLevel(')),context);
for(const f of features){
  context.renderRegionNames(f.properties);
  if(f.properties.level==='province')assert($('selection-name').textContent&&!/[\u3400-\u9fff]/.test($('selection-name').textContent));
  else assert.equal($('selection-name').textContent,names[f.properties.adcode].en);
  assert.equal($('selection-chinese').textContent,f.properties.name);
  assert.equal($('selection-regional').hidden,names[f.properties.adcode].regional.length===0);
  assert.equal($('selection-regional').children.length,names[f.properties.adcode].regional.length);
}
console.log(JSON.stringify({regions:features.length,languageCounts,selectionNamesVerified:features.length}));
