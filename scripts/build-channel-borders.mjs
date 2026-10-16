// Borders down narrow river and estuary channels (channel-lines.mjs) for every country's
// subdivisions, added to the lines each adapter already draws:
// - regional countries (Europe, Russia, southern Africa): boundaries features {owners, channel}
//   in first.bin, each chunk holding an owner, and all.bin;
// - edge-run collections (Philippines, Indonesia, Japan's municipal chunks, Malaysia): a
//   `channels` member that dist/edge-runs.mjs joins to each owner unit;
// - Japan's prefecture overview: features added to its boundary lines; Korea and Mongolia:
//   <country>-channels.bin per level (the boundary files stay exact), merged into the edges by
//   dist/edge-runs.mjs withChannels;
// - South America: channels where no line bridges the gap yet (Uruguay's departments already
//   draw their river borders);
// tolerance: how far apart two units' shared edges may sit in that data (see build-unit-edges.mjs).
// Below the first level, a channel's middle must lie outside every first-level unit: lower levels
// need not cover the land (Botswana's localities, Russia's inter-settlement territories,
// Uruguay's unincorporated areas). China's province lines keep both sides of narrow water
// (china-shore.mjs).
// Re-running replaces earlier channels. Run after build-unit-edges.mjs.
// Usage: node scripts/build-channel-borders.mjs [regional|asia|south-america] (default: all)
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {load,polygons,landIndex,lineIndex,linesOf} from './geo-index.mjs';
import {channelLines,channelLength,withoutRetraced} from './channel-lines.mjs';

const data='dist/data/',only=process.argv[2],run=family=>!only||only===family;
const write=(file,value)=>{const json=JSON.stringify(value),bytes=gzipSync(json,{level:9});fs.writeFileSync(data+file,bytes);return {bytes:bytes.length,decodedBytes:Buffer.byteLength(json)};};
const fc=features=>({type:'FeatureCollection',features});
const report=[];
const landOf=features=>landIndex(features.flatMap(f=>polygons(f.geometry).flat()));
function channels(name,features,tolerance,land=null){const c=channelLines(features,{tolerance,land});report.push([name,c.features.length,channelLength(c)]);return c;}
const has=(collection,owners)=>{const ids=new Set(collection.features.map(f=>f.properties.id));return owners.some(id=>ids.has(id));};
const marked=c=>c.features.map(f=>({...f,properties:{...f.properties,channel:true}}));
const unmarked=c=>c.features.filter(f=>!f.properties.channel);

// Regional countries: catalogue chunks hold the level below their parent.
if(run('regional'))for(const base of ['europe/united-kingdom','europe/spain','europe/france','europe/italy','europe/iceland','europe/turkey','europe/india','europe/chile','europe/paraguay','europe/peru','russia',...['south-africa','botswana','namibia','eswatini','lesotho'].map(c=>'southern-africa/'+c)]){
 const catalogue=load(data+base+'/catalogue.bin'),first=load(data+base+'/first.bin'),levelOf=new Map(catalogue.records.map(r=>[r.id,r.level]));
 const parts=[{level:1,file:'first.bin',payload:first},...Object.entries(catalogue.chunks).map(([id,e])=>({level:e.level??levelOf.get(id)+1,file:e.file,entry:e,payload:load(data+base+'/'+e.file)}))];
 const land=landOf(first.regions.features),byLevel=new Map();for(const p of parts){if(!byLevel.has(p.level))byLevel.set(p.level,[]);byLevel.get(p.level).push(p);}
 const found=new Map();
 for(const [level,list] of byLevel){
  found.set(level,withoutRetraced(marked(channels(base+' '+level,list.flatMap(p=>p.payload.regions.features),0,level>1?land:null)),list.flatMap(p=>unmarked(p.payload.boundaries))));
 }
 for(const p of parts){const extra=(found.get(p.level)||[]).filter(f=>has(p.payload.regions,f.properties.owners));p.payload.boundaries=fc([...unmarked(p.payload.boundaries),...extra]);const size=write(base+'/'+p.file,p.payload);if(p.entry?.bytes!==undefined)Object.assign(p.entry,size);}
 write(base+'/catalogue.bin',catalogue);
 if(fs.existsSync(data+base+'/all.bin')){const all=load(data+base+'/all.bin');for(const l of all.levels)l.boundaries=fc([...unmarked(l.boundaries),...(found.get(l.level)||[])]);write(base+'/all.bin',all);}
}

// Edge-run collections: channels of a level go to each collection holding an owner.
function attachChannels(name,collections,tolerance,land=null){const c=fc(withoutRetraced(channels(name,collections.flatMap(x=>x.features),tolerance,land).features));for(const x of collections)x.channels=fc(c.features.filter(f=>has(x,f.properties.owners)));}
if(run('asia'))for(const country of ['philippines','indonesia']){
 const catalogue=load(data+'archipelago/'+country+'-catalogue.bin'),overview=load(data+'archipelago/'+country+'-overview.bin'),chunks=Object.values(catalogue.chunks).map(e=>({e,payload:load(data+'archipelago/'+e.file)}));
 const overviewLand=landOf(overview.first.features),chunkLand=landOf(chunks.flatMap(c=>c.payload.first.features));
 for(const [level,tolerance] of [['first',600],['second',1000]]){const lower=level==='second';attachChannels(country+' overview '+level,[overview[level]],tolerance,lower?overviewLand:null);attachChannels(country+' '+level,chunks.map(c=>c.payload[level]),60,lower?chunkLand:null);}
 write('archipelago/'+country+'-overview.bin',overview);for(const c of chunks)Object.assign(c.e,write('archipelago/'+c.e.file,c.payload));write('archipelago/'+country+'-catalogue.bin',catalogue);
}
if(run('asia')){
 const catalogue=load(data+'japan-local/catalogue.bin'),chunks=Object.values(catalogue.chunks).map(e=>({e,payload:load(data+'japan-local/'+e.file)}));
 const land=landOf(chunks.flatMap(c=>c.payload.first.features));
 for(const level of new Set(chunks.flatMap(c=>Object.keys(c.payload))))attachChannels('japan '+level,chunks.filter(c=>c.payload[level]).map(c=>c.payload[level]),60,level==='first'?null:land);
 for(const c of chunks)Object.assign(c.e,write('japan-local/'+c.e.file,c.payload));write('japan-local/catalogue.bin',catalogue);
}
if(run('asia')){
 const catalogue=load(data+'southeast-asia/malaysia-catalogue.bin'),first=load(data+'southeast-asia/malaysia-first.bin'),chunks=Object.values(catalogue.chunks).map(e=>({e,payload:load(data+'southeast-asia/'+e.file)}));
 attachChannels('malaysia 1',[first],300);attachChannels('malaysia 2',chunks.map(c=>c.payload),60,landOf(first.features));
 write('southeast-asia/malaysia-first.bin',first);for(const c of chunks)Object.assign(c.e,write('southeast-asia/'+c.e.file,c.payload));write('southeast-asia/malaysia-catalogue.bin',catalogue);
}

// Japan's prefecture overview, Korea and Mongolia.
if(run('asia')){
 const japan=load(data+'japan-boundaries.bin');japan.boundaries=fc(withoutRetraced([...unmarked(japan.boundaries),...marked(channels('japan overview',japan.first.features,300))]));write('japan-boundaries.bin',japan);
 for(const name of ['korea','mongolia']){
  const d=load(data+name+'-boundaries.bin');
  const land=landOf(d.first.features);write(name+'-channels.bin',Object.fromEntries(['first','second'].map(level=>[level,fc(withoutRetraced(channels(name+' '+level,d[level].features,0,level==='second'?land:null).features,[{type:'Feature',properties:{},geometry:d.boundaries[level]}]))])));
 }
}

// South America: its lines are already the edges two units share (validate-south-america-borders),
// so channels are added only where no line bridges the gap yet. Uruguay's departments already draw
// their river borders through the water (uruguay-border-topology.mjs) and are left as built.
if(run('south-america'))for(const country of ['brazil','argentina','uruguay']){
 const sourcesFile=data+'south-america/'+country+'-sources.json',sources=JSON.parse(fs.readFileSync(sourcesFile)),first=load(data+'south-america/'+country+'-first.bin');
 const index=load(data+'south-america/'+country+'-local/index.bin'),locals=Object.values(index.groups).map(g=>({g,payload:load(data+'south-america/'+country+'-local/'+g.file)}));
 const before=new Map([first,...locals.map(l=>l.payload)].map(p=>[p,JSON.stringify(p.lines)]));
 const levels=[...(country==='uruguay'?[]:[[country+' 1',[first],null]]),[country+' 2',locals.map(l=>l.payload),landOf(first.regions.features)]];
 for(const [name,payloads,land] of levels){
  const units=payloads.flatMap(p=>p.regions.features);for(const p of payloads)p.lines=fc(unmarked(p.lines));
  // Channels the lines already bridge (their sources were joined across small gaps) are not added again.
  const drawn=lineIndex(payloads.flatMap(p=>linesOf(p.lines)));
  const found=marked(channels(name,units,100,land)).map(f=>({...f,properties:{regionIds:f.properties.owners,channel:true},geometry:{type:'MultiLineString',coordinates:f.geometry.coordinates.flatMap(line=>{const out=[];let run=null;for(const p of line){if(drawn(p)>250){if(run)run.push(p);else out.push(run=[p]);}else run=null;}return out.filter(l=>l.length>1);})}})).filter(f=>f.geometry.coordinates.length);
  const kept=withoutRetraced(found,payloads.flatMap(p=>p.lines.features));
  // A chunk's lines name only its own units: a channel along a parent border is the parent level's.
  const inside=(p,ids)=>{const own=new Set(p.regions.features.map(f=>f.properties.id));return ids.every(id=>own.has(id));};
  for(const p of payloads)p.lines=fc([...p.lines.features,...kept.filter(f=>inside(p,f.properties.regionIds))]);
 }
 const changed=p=>before.get(p)!==JSON.stringify(p.lines);
 if(changed(first)){Object.assign(sources,write('south-america/'+country+'-first.bin',first));fs.writeFileSync(sourcesFile,JSON.stringify(sources,null,2)+'\n');}
 let indexChanged=false;
 for(const l of locals)if(changed(l.payload)){const size=write('south-america/'+country+'-local/'+l.g.file,l.payload);l.g.bytes=size.bytes;if(l.g.decodedBytes!==undefined)l.g.decodedBytes=size.decodedBytes;indexChanged=true;}
 if(indexChanged)write('south-america/'+country+'-local/index.bin',index);
}
for(const [name,pairs,length] of report)console.log(name.padEnd(36),String(pairs).padStart(4),'pairs',String(Math.round(length/1000)).padStart(6),'km');
