import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const app=read('../dist/app.js'),html=read('../dist/index.html');
const geometry=read('../dist/data/display-boundaries.json');
assert.equal(createHash('sha256').update(geometry).digest('hex'),'7af3f1b451ba98675414149d6ad3a458330d67761e831350013c75265574225e');
const display=JSON.parse(geometry);
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
const context=vm.createContext({$:id=>elements.get(id),regionByCode,provinceTypes:{},map:{
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
assert.equal(xinjiang.length,10);
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
console.log(JSON.stringify({xinjiangCities:xinjiang.length,polygonPartsChecked:checkedParts,defaultSelection:'all mapped subdivisions',geometry:'unchanged'}));
