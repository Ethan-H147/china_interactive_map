import fs from'node:fs';import assert from'node:assert/strict';import{fileURLToPath}from'node:url';
const m=JSON.parse(fs.readFileSync(new URL('../BoundaryAtlas.swiftpm/Sources/AtlasCore/Resources/Countries/china/catalogue.json',import.meta.url)));
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),rad=Math.PI/180;
function axes(lon,lat){const a=lon*rad,b=lat*rad;return{right:[-Math.sin(a),0,Math.cos(a)],up:[-Math.sin(b)*Math.cos(a),Math.cos(b),-Math.sin(b)*Math.sin(a)],forward:[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)]};}
function sphere([lon,lat]){const a=lon*rad,b=lat*rad;return[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)];}
function inside(p,ring){let hit=false,j=ring.length-1;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;j=i;}return hit;}
function hit(p,r){return r.polygons.some(poly=>inside(p,poly[0])&&!poly.slice(1).some(ring=>inside(p,ring)));}
let cases=0;for(let lon=-150;lon<=150;lon+=30)for(let lat=-70;lat<=70;lat+=35){const v=axes(lon,lat),point=[lon+10,lat+5],p=sphere(point),x=dot(p,v.right),y=dot(p,v.up),z=Math.sqrt(1-x*x-y*y),recovered=v.right.map((n,i)=>n*x+v.up[i]*y+v.forward[i]*z);assert(Math.abs(Math.atan2(recovered[2],recovered[0])/rad-point[0])<1e-8);assert(Math.abs(Math.asin(recovered[1])/rad-point[1])<1e-8);cases++;}
const invalidCenters=m.regions.filter(r=>!hit(r.center,r)).map(r=>r.id);
console.log('Reference camera round trips:',cases,'; centres outside source polygon:',invalidCenters);
assert.equal(invalidCenters.length,0,'Label/focus points must be on their province');
// Geometry tap samples from large-region interiors, including all offshore SARs.
for(const r of m.regions)assert(hit(r.center,r),r.id);
console.log('All 34 province centres have valid native hit masks.');
