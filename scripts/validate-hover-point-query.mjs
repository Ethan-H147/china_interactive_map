import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as maplibre from 'maplibre-gl';
import {queryRegions} from '../dist/motion.mjs';
import {createHoverOverview} from '../dist/hover-overview.mjs';

const records=[
 {adcode:220000,en:'Jilin',name:'吉林省',box:[400,0,499,99],layer:'province-fill'},
 {adcode:610000,en:'Shaanxi',name:'陕西省',box:[0,100,149,250],layer:'province-fill'},
 {adcode:370000,en:'Shandong',name:'山东省',box:[150,100,300,250],layer:'province-fill'},
 {adcode:310105,en:'Changning District',name:'长宁区',box:[170,130,180,145],layer:'city-district-fill'}
];
const elements=new Map();const node=()=>({style:{},children:[],hidden:true,offsetWidth:100,offsetHeight:60,setAttribute(){},append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},remove(){}});
const listeners=new Map(),canvas={style:{}},container={...node(),clientWidth:500,clientHeight:300,getBoundingClientRect:()=>({left:350,top:90}),addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
let level='province',districts=false;
const mapHandlers=new Map();
const map={_camera:{transform:{width:500,height:300}},getLayer:id=>records.some(r=>r.layer===id),getContainer:()=>container,getCanvas:()=>canvas,isMoving:()=>false,on:(type,fn)=>mapHandlers.set(type,fn),off:type=>mapHandlers.delete(type),style:{queryRenderedFeatures(geometry,options){
  const [point]=geometry;return records.filter(r=>options.layers.includes(r.layer)&&(geometry.length>1||point.x>=r.box[0]&&point.y>=r.box[1]&&point.x<=r.box[2]&&point.y<=r.box[3])).map(r=>({layer:{id:r.layer},properties:{adcode:r.adcode}}));
 }},queryRenderedFeatures(...args){return maplibre.Map.prototype.queryRenderedFeatures.apply(this,args);}};
const regionByCode=new Map(records.map(r=>[r.adcode,{feature:{properties:r}}]));
const source=fs.readFileSync('dist/app.js','utf8');
const env=vm.createContext({quiz:{active:false},map,regionByCode,districtsVisible:()=>districts,$:id=>id==='map-shell'?{dataset:{level}}:{checked:true},window:{AtlasMotion:{queryRegions}}});
vm.runInContext(source.slice(source.indexOf('function pickedRegion('),source.indexOf('function countryAt(')),env);
assert.equal(env.pickedRegion({x:60,y:150}).feature.properties.adcode,220000,'Reproduce the old invalid plain-object query returning the first visible province');
const hover=createHoverOverview(map,{document:{createElement:node},resolve:point=>env.pickedRegion(point)?.feature.properties});const tip=container.children.at(-1);
Object.assign(env,{atlasMode:'china',cameraBusy:false,allReady:true,hovered:null,setRegionState(){},clearHover(hide=true){env.hovered=null;if(hide)hover.clear();}});
const mouseStart=source.indexOf("map.on('mousemove'");vm.runInContext(source.slice(mouseStart,source.indexOf("map.getCanvas().addEventListener('mouseleave'",mouseStart)),env);
const move=(x,y)=>{listeners.get('pointermove')({target:canvas,clientX:x+350,clientY:y+90,pointerType:'mouse'});mapHandlers.get('mousemove')({point:[x,y]});};
for(const [x,y,name] of [[60,150,'Shaanxi'],[220,150,'Shandong'],[450,40,'Jilin'],[60,150,'Shaanxi']]){move(x,y);assert.equal(tip.children[0].textContent,name);assert(!tip.hidden);}
level='prefecture';districts=true;move(175,135);assert.equal(tip.children[0].textContent,'Changning District','Detailed Chinese district picking keeps its priority');move(350,270);assert(tip.hidden,'Empty space does not retain the previous province');
hover.destroy();console.log('Real MapLibre query parsing: reproduced viewport-wide Jilin bug; corrected pointer queries track Shaanxi, Shandong, Jilin, district priority and empty space.');
