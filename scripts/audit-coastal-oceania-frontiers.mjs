import fs from 'node:fs';
import assert from 'node:assert/strict';
import {definitions} from './coastal-oceania-definitions.mjs';
import {load,polygons,linesOf,landIndex,lineIndex,metres} from './geo-index.mjs';
import {geographicBounds} from './build-regional-dataset.mjs';
const world=load('dist/data/world-land.bin');
const local=world.features.filter(f=>{const b=geographicBounds(f.geometry);return b[0][0]<61&&b[1][0]>-26&&b[0][1]<39&&b[1][1]>-36;});
const land=landIndex(local.flatMap(f=>polygons(f.geometry).flat())),bad=[],counts={};
for(const d of definitions){
 counts[d.country]=0;
 const ownEdge=lineIndex(load('dist/data/europe/'+d.country+'/first.bin').regions.features.flatMap(f=>polygons(f.geometry).flat()));
 for(const f of load('dist/data/europe/'+d.country+'/international.bin').features.filter(f=>f.properties.boundaryType==='land frontier')){
  for(const path of linesOf({features:[f]}))for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],length=metres(a,b);if(!length)continue;
   const samples=length>60?[10/length,.25,.5,.75,1-10/length]:[.5];
   for(const t of samples){
    const mid=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],endpointDistance=Math.min(metres(mid,path[0]),metres(mid,path.at(-1)));
    const distance=ownEdge(mid);if(distance>=1)bad.push({reason:'stroke off land edge',country:d.country,pair:f.properties.pair,mid,distance,length});
    if(endpointDistance<25)continue; // The end of a land frontier can meet the sea or a lake.
    counts[d.country]++;
    const c=Math.cos(mid[1]*Math.PI/180),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);
    const points=[1,-1].map(side=>[mid[0]-dy/len*side*10/111195/c,mid[1]+dx/len*side*10/111195]),sides=points.map(land);
    if(!sides.every(Boolean))bad.push({country:d.country,pair:f.properties.pair,mid,sides,length,endpointDistance});
   }
  }
 }
}
fs.mkdirSync('artifacts/coastal-oceania',{recursive:true});
fs.writeFileSync('artifacts/coastal-oceania/frontier-probes.json',JSON.stringify({counts,failures:bad},null,2));
console.log('10-metre cross-border land probes',Object.values(counts).reduce((s,n)=>s+n,0),'failures',bad.length,bad.slice(0,12));
assert.equal(bad.length,0,'Every drawn land frontier must have continuous land on both sides at ten metres');
// Detect omitted border stretches as well as gaps beside borders that are drawn.
const codes=new Set(definitions.map(d=>d.iso)),references=load('scripts/boundary-sources/nordics/ne-borders.json.gz'),expected={},actual={},km=path=>path.slice(1).reduce((s,b,i)=>s+metres(path[i],b),0)/1000;
for(const f of references.features){const sides=[f.properties.ADM0_A3_L,f.properties.ADM0_A3_R];if(f.properties.TYPE==='Water Indicator'||!sides.some(c=>codes.has(c)))continue;const pair=sides.sort().join('-');expected[pair]=(expected[pair]||0)+linesOf({features:[f]}).reduce((s,p)=>s+km(p),0);}
for(const d of definitions)for(const f of load('dist/data/europe/'+d.country+'/international.bin').features){actual[f.properties.pair]=(actual[f.properties.pair]||0)+linesOf({features:[f]}).reduce((s,p)=>s+km(p),0);}
const coverage=Object.entries(expected).map(([pair,referenceKm])=>({pair,referenceKm,displayedKm:actual[pair]||0})),missing=coverage.filter(r=>r.referenceKm>5&&r.displayedKm<r.referenceKm*.75);fs.writeFileSync('artifacts/coastal-oceania/frontier-coverage.json',JSON.stringify({coverage,missing},null,2));console.log('Land frontier coverage',coverage.length,'reference pairs; omitted stretches',missing);assert.equal(missing.length,0,'No large source frontier stretch is omitted');
