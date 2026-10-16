// Land frontiers of every public atlas country, drawn whichever country is open.
// Each country's frontier comes from its own detailed outline: an outline edge is a frontier
// when a Natural Earth 1:10m land boundary line passes nearby and the land just beyond the
// edge (probed up to 2.5 km out, so border rivers count) is land (Natural Earth's countries,
// lakes excluded) outside the country's own outline. Only the Natural Earth lines between the
// country and another count, so lines inside it (Korea's demarcation line, China's with Hong
// Kong and Macau, Malaysia's with Singapore across the Johor Strait) are not frontiers. Short
// unflagged stretches between frontier edges are closed when land lies beyond them (wide
// rivers, sources that sit apart); open pieces under 1 km are coastline beside a frontier.
// Frontiers already drawn by a dedicated layer (Russia, southern Africa, South America's
// shared borders, China's with Korea and Mongolia) are left out, and a frontier between two
// atlas countries is drawn once. European frontiers come from the Europe build.
// Usage: node scripts/build-atlas-frontiers.mjs (Natural Earth sources are downloaded once)
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {lineData} from '../dist/adaptive-lines.mjs';
import {withoutRetraced} from './channel-lines.mjs';
import {sources,load,polygons,metres,landIndex,lineIndex,linesOf,countryAt,land,boundaryLines} from './natural-earth.mjs';

// Frontiers drawn by their own layers already.
const existing=lineIndex([
 ...linesOf(load('dist/data/shared-context-borders.bin')),
 ...linesOf(load('dist/data/russia/international.bin')),
 ...['south-africa','botswana','namibia','eswatini','lesotho'].flatMap(c=>linesOf(load(`dist/data/southern-africa/${c}/international.bin`))),
 ...(({landBorders,riverBorders})=>[...linesOf(landBorders),...linesOf(riverBorders)])(load('dist/data/flight-context.bin'))
]);

// Each public country's own outline (European countries are drawn by the Europe build).
const flight=load('dist/data/flight-context.bin');
const outlines={
 china:load('dist/data/china-context.bin'),korea:load('dist/data/korea-context.bin'),mongolia:load('dist/data/mongolia-context.bin'),
 indonesia:load('dist/data/archipelago/indonesia-context.bin'),philippines:load('dist/data/archipelago/philippines-context.bin'),
 malaysia:load('dist/data/southeast-asia/malaysia-context.bin'),singapore:load('dist/data/southeast-asia/singapore-context.bin'),
 russia:load('dist/data/russia/context.bin'),
 ...Object.fromEntries(['brazil','uruguay','argentina'].map(c=>[c,{type:'FeatureCollection',features:flight.features.filter(f=>f.properties.country===c)}])),
 ...Object.fromEntries(['south-africa','botswana','namibia','eswatini','lesotho'].map(c=>[c,load(`dist/data/southern-africa/${c}/context.bin`)]))
};
// The Natural Earth countries each atlas country covers. Singapore has no land frontier (the
// Johor Strait is sea), so it counts as Malaysia's own and draws none of its own.
const ownIso={china:['CHN','TWN','HKG','MAC'],korea:['KOR','PRK'],mongolia:['MNG'],indonesia:['IDN'],philippines:['PHL'],malaysia:['MYS','SGP'],russia:['RUS'],brazil:['BRA'],uruguay:['URY'],argentina:['ARG','FLK'],'south-africa':['ZAF'],botswana:['BWA'],namibia:['NAM'],eswatini:['SWZ'],lesotho:['LSO']};
delete outlines.singapore;
const rings=Object.fromEntries(Object.entries(outlines).map(([c,d])=>[c,d.features.flatMap(f=>polygons(f.geometry))]));
const inside=Object.fromEntries(Object.entries(rings).map(([c,polys])=>[c,landIndex(polys.flat())]));
const signedArea=ring=>ring.slice(1).reduce((s,p,i)=>s+ring[i][0]*p[1]-p[0]*ring[i][1],0);

// Claims that overlap: China's frontier inside India's outline (developer mode's India, with
// India's official boundaries) is hidden while India's map is open.
const indiaFile='dist/data/europe/india/first.bin',inIndia=fs.existsSync(indiaFile)?landIndex(load(indiaFile).regions.features.flatMap(f=>polygons(f.geometry)).flat()):()=>false;
function claimRuns(path,country){
 const inside=(a,b)=>{if(country!=='china')return false;const c=Math.cos((a[1]+b[1])*Math.PI/360),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)return false;const m=[(a[0]+b[0])/2,(a[1]+b[1])/2];return [1,-1].every(side=>inIndia([m[0]-dy/len*side*100/111195/c,m[1]+dx/len*side*100/111195]));};
 const runs=[];let current=null;
 for(let i=1;i<path.length;i++){const claim=inside(path[i-1],path[i])?'india':null;if(!current||claim!==current.claim){current={claim,coordinates:[path[i-1]]};runs.push(current);}current.coordinates.push(path[i]);}
 return runs;
}
const accepted=[],features=[];
const taken=()=>lineIndex(accepted);
for(const country of Object.keys(outlines)){
 const own=inside[country],already=taken(),mine=ownIso[country],coast=[],landPaths=[];
 // Lines to another atlas country, and to the rest of the world. Beside an atlas neighbour,
 // foreign land must be inside its own outline, so a border lagoon between the two is water.
 // Elsewhere it is Natural Earth land (lakes excluded) up to 5 km beyond: a border river's
 // far bank, so the country's own bank is its frontier, continuous with the land beside it.
 const frontierLines=boundaryLines.filter(b=>b.sides.filter(s=>mine.includes(s)).length===1),atlasIso=new Set(Object.values(ownIso).flat());
 const toAtlas=lineIndex(frontierLines.filter(b=>b.sides.some(s=>!mine.includes(s)&&atlasIso.has(s))).flatMap(b=>b.lines)),toWorld=lineIndex(frontierLines.filter(b=>b.sides.some(s=>!mine.includes(s)&&!atlasIso.has(s))).flatMap(b=>b.lines));
 const boundary=p=>Math.min(toAtlas(p),toWorld(p));
 const insideOther=p=>Object.entries(inside).some(([c,test])=>c!==country&&test(p));
 let pieces=0;
 for(const poly of rings[country])for(const [r,ring] of poly.entries()){
  const n=ring.length-1;if(n<3)continue;
  // Foreign side: outside an exterior ring, inside a hole.
  const side=(signedArea(ring)>0)===(r===0)?-1:1;
  // China's outline follows its claims in the Himalaya and Karakoram (Aksai Chin, the Shaksgam
  // valley, South Tibet), far from Natural Earth's lines, so there an edge is a frontier when land
  // outside China lies all the way out to 3 km (not a sliver between two provinces' sources).
  const claimZone=ring.map(p=>country==='china'&&p[0]>72&&p[0]<98.5&&p[1]>26&&p[1]<37.5);
  const near=ring.map((p,i)=>boundary(p)<=6000||claimZone[i]);
  if(!near.some(Boolean))continue;
  const outward=(i,d)=>{const a=ring[i],b=ring[i+1],c=Math.cos((a[1]+b[1])*Math.PI/360),dx=(b[0]-a[0])*c,dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)return null;return [(a[0]+b[0])/2-dy/len*side*d/111195/c,(a[1]+b[1])/2+dx/len*side*d/111195];};
  const foreign=(p,atlasSide)=>!!p&&!own(p)&&(atlasSide?insideOther(p):land(p));
  // Land frontier: foreign land immediately beyond the edge. Water borders come later.
  const flags=Array.from({length:n},(_,i)=>{if(!near[i]||!near[i+1])return false;if(boundary(ring[i])>6000||boundary(ring[i+1])>6000)return [300,1000,3000].every(d=>foreign(outward(i,d),false));const m=[(ring[i][0]+ring[i+1][0])/2,(ring[i][1]+ring[i+1][1])/2],atlasSide=toAtlas(m)<toWorld(m);return (atlasSide?[100,300,600]:[100,300,600,1000,1500,2500,5000]).some(d=>foreign(outward(i,d),atlasSide));});
  const coastEdges=()=>{for(let i=0;i<n;i++)if(!flags[i])coast.push([ring[i],ring[i+1]]);};
  if(!flags.some(Boolean)){coastEdges();continue;}
  // Gaps of up to 15 km close where land lies within 5 km beyond (river islands, a channel of
  // varying width); a lake or the sea beyond keeps them open.
  const beyond=i=>[300,600,1500,3000,5000].some(d=>{const p=outward(i,d);return !p||land(p);});
  const start=flags.indexOf(true);
  for(let k=1;k<=n;k++){const i=(start+k)%n;if(flags[i])continue;const span=[];let length=0,j=i;while(!flags[j]&&length<=15000){span.push(j);length+=metres(ring[j],ring[j+1]);j=(j+1)%n;}if(length<=15000&&span.every(beyond))span.forEach(t=>flags[t]=true);k+=span.length-1;}
  coastEdges();
  // Already drawn by a dedicated layer, or by an earlier country: within 3 km of that line.
  for(let i=0;i<n;i++)if(flags[i]){const m=[(ring[i][0]+ring[i+1][0])/2,(ring[i][1]+ring[i+1][1])/2];if(existing(m)<3000||already(m)<3000)flags[i]=false;}
  const paths=[];
  if(flags.every(Boolean))paths.push(ring.slice());
  else{const first=flags.indexOf(false);let current=null;for(let k=1;k<=n;k++){const i=(first+k)%n;if(flags[i]){if(!current){current=[ring[i]];paths.push(current);}current.push(ring[i+1]);}else current=null;}}
  for(const p of paths){
   const length=p.slice(1).reduce((t,q,i)=>t+metres(p[i],q),0);if(length<1000&&metres(p[0],p.at(-1))>1)continue;
   // The neighbour, when it is an atlas country too (the frontier is then drawn once).
   const mid=p[Math.floor(p.length/2)],neighbours=Object.keys(inside).filter(c=>c!==country&&[1500,3000].some(d=>{const i=ring.indexOf(mid);return i>=0&&i<n&&inside[c](outward(i,d)||mid);}));
   // Where China's claim line runs inside India's outline, India's map (when open) draws its own.
   for(const run of claimRuns(p,country))features.push({type:'Feature',properties:{countries:[country,...neighbours].join(' '),...(run.claim?{claimedBy:run.claim}:{})},geometry:{type:'LineString',coordinates:run.coordinates}});
   accepted.push(p);landPaths.push(p);pieces++;
  }
 }
 // Water frontiers between two atlas countries (a border lagoon, where both outlines leave
 // water and no dedicated line runs): Natural Earth's line through the water, outside every
 // atlas outline, within 4 km of this country's shore, and more than 3 km from its land
 // frontiers and from frontiers already drawn.
 const shore=lineIndex(coast),landFrontier=lineIndex(landPaths),otherAtlas=p=>Object.entries(inside).some(([c,test])=>c!==country&&test(p));
 const atlasOf=iso=>Object.keys(ownIso).find(c=>c!==country&&ownIso[c].includes(iso));
 for(const b of frontierLines.filter(b=>b.sides.some(s=>!mine.includes(s)&&atlasIso.has(s)))){
  const neighbour=atlasOf(b.sides.find(s=>!mine.includes(s)));
  for(const line of b.lines){
   let current=null;const runs=[];
   for(const p of line){if(!own(p)&&!otherAtlas(p)&&shore(p)<=4000&&landFrontier(p)>3000&&existing(p)>3000&&already(p)>3000){if(!current)runs.push(current=[]);current.push(p);}else current=null;}
   for(const p of runs){if(p.length<2||p.slice(1).reduce((t,q,i)=>t+metres(p[i],q),0)<2000)continue;features.push({type:'Feature',properties:{countries:[country,...(neighbour?[neighbour]:[])].join(' '),water:true},geometry:{type:'LineString',coordinates:p}});accepted.push(p);pieces++;}
  }
 }
 console.log(country.padEnd(13),pieces,'frontier pieces');
}
// Pieces found from both sides of a frontier may overlap; each segment is drawn once.
const out=lineData({type:'FeatureCollection',features:withoutRetraced(features)});
fs.writeFileSync('dist/data/atlas-frontiers.bin',gzipSync(JSON.stringify(out),{level:9}));
const km=features.reduce((s,f)=>s+f.geometry.coordinates.slice(1).reduce((t,q,i)=>t+metres(f.geometry.coordinates[i],q),0),0)/1000;
fs.writeFileSync('dist/data/atlas-frontiers-sources.json',JSON.stringify({description:'Frontiers of the public atlas countries not drawn by a dedicated layer: land frontiers from each country\'s own outline, and the water borders between two atlas countries from Natural Earth 1:10m boundary lines.',retrieved:new Date().toISOString().slice(0,10),frontierKm:Math.round(km),pieces:features.length,sources},null,2)+'\n');
console.log('Atlas frontiers:',features.length,'pieces,',Math.round(km),'km,',fs.statSync('dist/data/atlas-frontiers.bin').size,'bytes');
