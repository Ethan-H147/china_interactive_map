import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {queryRegions} from '../dist/motion.mjs';
import {setSubdivisionHeading} from '../dist/country-page.mjs';
import {readDataText} from './read-data.mjs';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const app=read('../dist/app.js'),html=read('../dist/index.html')+read('../dist/china-page.mjs');
const geometry=readDataText('display-boundaries.json');
const display=JSON.parse(geometry);
const administration=JSON.parse(read('../dist/data/xinjiang-administration.json'));
const elements=new Map();
for(const id of ['province-layer','prefecture-layer','other-layer']){
  const input=html.match(new RegExp(`<input id="${id}"[^>]*>`))[0];
  elements.set(id,{checked:/\bchecked\b/.test(input)});
}
elements.set('map-shell',{dataset:{level:'prefecture'}});
const regions=[...display.provinces.features,...display.subdivisions.features];
const regionByCode=new Map(regions.map(feature=>[feature.properties.adcode,{feature}]));
function inRing([x,y],ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [ax,ay]=ring[i],[bx,by]=ring[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
const parts=g=>g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
const inPolygon=(p,rings)=>inRing(p,rings[0])&&!rings.slice(1).some(r=>inRing(p,r));
const context=vm.createContext({window:{AtlasMotion:{queryRegions}},$:id=>elements.get(id),regionByCode,provinceTypes:{},quiz:{active:false},districtsVisible:()=>false,map:{
  getLayer:id=>['province-fill','prefecture-fill','other-fill','province-fragment-fill','prefecture-fragment-fill'].includes(id)?{id}:undefined,
  queryRenderedFeatures(point,{layers}){
    return regions.filter(f=>parts(f.geometry).some(poly=>inPolygon(point,poly))).map(f=>({
      properties:f.properties,layer:{id:f.properties.level==='province'?'province-fill':context.isPrefectureLevel(f.properties)?'prefecture-fill':'other-fill'}
    })).filter(f=>layers.includes(f.layer.id));
  }
}});
vm.runInContext(app.slice(app.indexOf('function isPrefectureLevel('),app.indexOf('function controls(')),context);
vm.runInContext(app.slice(app.indexOf('function pickedRegion('),app.indexOf("map.on('click'")),context);
function interior(rings){
  const ring=rings[0],xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  for(let y=1;y<40;y++)for(let x=1;x<40;x++){
    const p=[minX+(maxX-minX)*x/40,minY+(maxY-minY)*y/40];
    if(inPolygon(p,rings))return p;
  }
  throw new Error('No test point found inside polygon');
}
let checkedParts=0;
const direct=display.subdivisions.features.filter(f=>String(f.properties.adcode).slice(2,4)==='90');
const xinjiang=direct.filter(f=>f.properties.provinceCode===650000);
assert.equal(xinjiang.length,12);
for(const feature of xinjiang){
  assert.equal(context.kind(feature.properties),'Directly administered county-level city');
  for(const polygon of parts(feature.geometry)){
    const point=interior(polygon);
    assert.equal(context.pickedRegion(point)?.feature.properties.adcode,feature.properties.adcode,`Click selects ${feature.properties.name}`);
    checkedParts++;
  }
}
assert.equal(parts(regionByCode.get(659005).feature.geometry).length,2);
assert.equal(context.kind(regionByCode.get(469025).feature.properties),'Directly administered autonomous county');
assert.equal(context.kind(regionByCode.get(469021).feature.properties),'Directly administered county');
assert.equal(context.kind(regionByCode.get(429021).feature.properties),'Directly administered forestry district');
const beitunPoint=interior(parts(regionByCode.get(659005).feature.geometry)[1]);
elements.get('map-shell').dataset.level='province';
assert.equal(context.pickedRegion(beitunPoint).feature.properties.adcode,650000);
elements.get('map-shell').dataset.level='prefecture';
elements.get('other-layer').checked=false;
assert.equal(context.pickedRegion(beitunPoint).feature.properties.adcode,650000);
elements.get('other-layer').checked=true;
assert.equal(context.pickedRegion(beitunPoint).feature.properties.adcode,659005);
console.log(JSON.stringify({xinjiangCities:xinjiang.length,polygonPartsChecked:checkedParts,defaultSelection:'all mapped subdivisions'}));

assert.deepEqual(Object.keys(administration.mappedCities).map(Number).sort(),xinjiang.map(f=>f.properties.adcode).sort());
assert.equal(administration.mappedCities[659002].division,'1st');
assert.equal(administration.mappedCities[659004].division,'6th');
for(const city of Object.values(administration.mappedCities))assert.equal(city.formalLevel,'County-level city');
assert.deepEqual(administration.iliPrefectures,[654200,654300]);
assert.deepEqual(administration.missingCities.map(c=>c.en),['Caohu']);
for(const city of administration.missingCities){assert(!xinjiang.some(f=>f.properties.name===city.zh));assert(city.source.startsWith('https://www.xinjiang.gov.cn/'));}

function element(){return {hidden:false,textContent:'',children:[],dataset:{},get childElementCount(){return this.children.length;},replaceChildren(){this.children=[];this.textContent='';},append(...nodes){this.children.push(...nodes);}};}
elements.set('division-note',element());
elements.set('subdivisions',element());elements.set('subdivisions-title',element());elements.set('region-list',element());
context.document={createElement:element};context.xinjiangAdministration=administration;
globalThis.document=context.document;context.window.AtlasCountryPage={setSubdivisionHeading};
context.englishName=p=>p.name;context.selectRegion=()=>{};
const caohu={type:'Feature',properties:{adcode:659013,name:'草湖市',level:'city',provinceCode:650000,boundaryAvailable:false},geometry:null};
context.detailLayers=new Map([[650000,[...display.subdivisions.features.filter(f=>f.properties.provinceCode===650000),caohu].map(feature=>({feature}))]]);
vm.runInContext(app.slice(app.indexOf('function renderChildren('),app.indexOf('function selectRegion(')),context);
const text=el=>[el.textContent,...el.children.map(text)].join(' ');
for(const f of regions){
  context.renderDivisionNote({feature:f});
  const expected=f.properties.adcode===650000||f.properties.adcode===654000||administration.iliPrefectures.includes(f.properties.adcode)||!!administration.mappedCities[f.properties.adcode];
  assert.equal(elements.get('division-note').hidden,!expected,`Note scoped to ${f.properties.adcode}`);
}
context.renderDivisionNote(regionByCode.get(659002));
assert.match(text(elements.get('division-note')),/1st Division/);
assert.match(text(elements.get('division-note')),/sub-prefectural/);
context.renderDivisionNote(regionByCode.get(659004));
assert.match(text(elements.get('division-note')),/6th Division/);
assert(!text(elements.get('division-note')).includes('Aral'));
context.renderDivisionNote(regionByCode.get(650000));
assert.match(text(elements.get('division-note')),/12 of 13/);
context.renderChildren(650000);
assert.equal(elements.get('region-list').children.filter(el=>el.type==='button').length,27);
assert.match(text(elements.get('region-list')),/Prefecture-level areas \(14\)/);
assert.match(text(elements.get('region-list')),/Directly administered county-level cities \(13\)/);
assert.match(text(elements.get('region-list')),/草湖市 · Boundary unavailable/);
context.renderDivisionNote({feature:caohu});
assert.match(text(elements.get('division-note')),/17 April 2026/);
assert.match(text(elements.get('division-note')),/no mapped outline/);
context.renderChildren(659002);
assert.equal(elements.get('subdivisions').hidden,true);
console.log(JSON.stringify({administrationNotesVerified:regions.length,formalCityLevels:xinjiang.length,unmappedCities:administration.missingCities.length,iliHierarchy:'documented'}));
