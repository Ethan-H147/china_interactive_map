import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readData} from './read-data.mjs';
import {gcjToWgs84,wgsToGcj02} from './coordinates.mjs';
for(const p of [[113.578,22.211],[116.397,39.908],[87.62,43.82],[104.06,30.67],[121.47,31.23]]) {
  const converted=gcjToWgs84(p),roundTrip=wgsToGcj02(converted);
  assert(Math.max(...p.map((v,i)=>Math.abs(v-roundTrip[i])))<1e-9,'Coordinate inverse failed: '+p);
}
const display=readData('display-boundaries.json');
function inRing([x,y],r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const polygons=g=>g.type==='MultiPolygon'?g.coordinates:[g.coordinates];
const contains=(g,p)=>polygons(g).some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));
const owner=p=>display.subdivisions.features.filter(f=>contains(f.geometry,p)).map(f=>f.properties.adcode);
assert.deepEqual(owner([113.578,22.211]),[440400],'Northern port must select Zhuhai');
assert.deepEqual(owner([113.579,22.200]),[820011],'Southern port must select Macau port administration area');
assert.deepEqual(owner([113.587,22.210]),[],'Old angular port corner must be water');
assert.deepEqual(owner([113.530,22.190]),[],'Wanzai channel must remain open water');
assert.deepEqual(owner([113.525,22.190]),[440400],'Wanzai land must remain in Zhuhai');
assert(owner([113.540,22.190]).some(code=>String(code).startsWith('820')),'Macau peninsula must retain its government jurisdiction');
const source=readData('zhuhai-port-land.json').features[0].geometry.coordinates[0];
const gd=display.subdivisions.features.find(f=>f.properties.adcode===440400);
const mo=display.provinces.features.find(f=>f.properties.adcode===820000);
const vertices=polygons(gd.geometry).flat(2);
let checked=0;
for(const p of source.filter(p=>p[1]>22.2041&&!contains(mo.geometry,p))) {
  assert(vertices.some(v=>Math.hypot(p[0]-v[0],p[1]-v[1])<1e-8),'Port coastline vertex lost: '+p);checked++;
}
assert(checked>50,'Port shoreline coverage is insufficient');
const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
let zoom=15;
const context=vm.createContext({cameraBusy:false,countrySwitching:false,homeBounds:[],navigateBounds:(bounds,options)=>{zoom=options.camera.zoom;},allReady:true,reducedMotion:{matches:true},updateLabels(){},lockCamera(){},unlockCamera(){},map:{stop(){},getCenter:()=>[113.5,22.2],getZoom:()=>zoom,getMinZoom:()=>1,getMaxZoom:()=>16,jumpTo(options){zoom=options.zoom;}}});
vm.runInContext(app.slice(app.indexOf('function zoomBy('),app.indexOf("$('zoom-in').onclick")),context);
context.zoomBy(-1);assert.equal(zoom,14,'SAR zoom out must decrease by one level');
context.zoomBy(1);assert.equal(zoom,15);context.zoomBy(1);assert.equal(zoom,16);context.zoomBy(1);assert.equal(zoom,16,'Respect map maximum zoom');
console.log(JSON.stringify({coordinateRoundTrips:5,portAndChannelLocations:6,retainedPortVertices:checked,sarZoomControlsVerified:true,coordinateSystem:'WGS84'}));
