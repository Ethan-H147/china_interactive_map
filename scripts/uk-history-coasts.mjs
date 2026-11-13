import assert from 'node:assert/strict';
import {packShapes,shapeAtLocation} from '../dist/historic-borders.mjs';
import {polygonParts} from '../dist/polygon-parts.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const clip = createRequire(import.meta.url)('polygon-clipping');
import {gzipSync} from 'node:zlib';
import {encodeGeo} from '../dist/geo-pack.mjs';
import {command, fc, geographicBounds} from './build-regional-dataset.mjs';
import {landIndex, lineIndex, linesOf, metres, polygons} from './geo-index.mjs';
import {australiaHistoryMesh} from './uk-history-australia.mjs';
import {reconcileNorthAmerica} from './uk-history-north-america.mjs';

const exact = (data, instructions) => command(data, instructions, {precision: .0000001});
const asShape = (geometry, f) => ({type: 'Feature', geometry, properties: {f, sharedSource: true}});
const line = coordinates => ({type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates}});
const isPolygon = f => polygons(f.geometry).length > 0;
const multipart = features => ({type: 'MultiPolygon', coordinates: features.flatMap(f => polygons(f.geometry))});
export function physicalShoreLines(features, bounds) {
  const artificial = (a,b) => bounds && [0,1,2,3].some(i => {
    const axis=i%2,value=bounds[i];
    return Math.abs(a[axis]-value)<1e-7 && Math.abs(b[axis]-value)<1e-7;
  });
  return fc(features.flatMap(f=>polygons(f.geometry).flatMap(p=>p.flatMap(r=>{
    const parts=[];let run=[];
    for(let i=1;i<r.length;i++){
      if(artificial(r[i-1],r[i])){if(run.length>1)parts.push(line(run));run=[];}
      else {if(!run.length)run.push(r[i-1]);run.push(r[i]);}
    }
    if(run.length>1)parts.push(line(run));
    return parts;
  }))));
}
const valid = collection => fc(collection.features.filter(isPolygon));
const dissolve = async features => features.length ? valid(await exact(fc(features), '-dissolve2')) : fc([]);
async function overlay(source, mask, operation, explode = false) {
  if (!source.features.length) return source;
  if (!mask.features.length && operation==='clip') return fc([]);
  if (!mask.features.length && !explode) return source;
  // Classify disconnected land components separately. Erasing a compound
  // island/mainland feature can otherwise discard components outside the mask.
  const cmd = '-explode ' + (mask.features.length ? '-'+operation+' mask.json' : '') + (explode ? ' -explode' : '');
  return valid(await exact({'source.json':source,'mask.json':mask},cmd));
}
const bins = [
  {id: 'antarctic', countries: ['antarctica'], units: ['antarctic'], bounds: [-80,-85.051128,-20,-60]},
  {id: 'new-zealand', countries: ['new-zealand'], units: ['new-zealand'], bounds: [164,-53,180,-28]},
  {id: 'north-america', countries: ['united-states','canada'], units: ['atlantic-colonies','floridas','british-north-america','canada','newfoundland','oregon','ruperts-land','nova-scotia','prince-edward-island','cape-breton','new-brunswick','british-columbia','north-western-territory','arctic-territories'], bounds: [-170,19,-50,84]},
  {id: 'south-asia', countries: ['india','pakistan','bangladesh','sri-lanka','maldives','myanmar'], units: ['india','ceylon','maldives','burma'], bounds: [60,-1,102,31]},
  {id: 'malaya', countries: ['malaysia','singapore','brunei'], units: ['malaya','straits','singapore','penang','sarawak','north-borneo','brunei'], bounds: [97,.5,121,9]},
  {id: 'western-pacific', countries: ['papua-new-guinea','solomon-islands'], units: ['papua','solomons'], bounds: [139,-14,164,1]},
  {id: 'central-pacific', countries: ['kiribati','tuvalu','new-zealand'], units: ['gilbert','line-islands','cook-islands','niue','tokelau'], bounds: [155,-24,213,7], pacific: true},
  {id: 'west-africa', countries: ['gambia','sierra-leone','ghana','nigeria','cameroon'], units: ['gambia','sierra-leone','gold-coast','togoland','nigeria','southern-cameroons','northern-cameroons'], bounds: [-18,1,17,15]},
  {id: 'east-africa', countries: ['kenya','tanzania','somalia'], units: ['kenya','tanganyika','zanzibar','somaliland'], bounds: [29,-13,52,13]},
  {id: 'south-africa', countries: ['south-africa'], units: ['cape','south-africa'], bounds: [14,-37,34,-20]},
  {id: 'arabia', countries: ['egypt','sudan','israel','palestine','jordan','iraq','kuwait','bahrain','qatar','united-arab-emirates','yemen'], units: ['egypt','sudan','iraq','palestine','transjordan','kuwait','bahrain','qatar','trucial-states','aden','aden-protectorate'], bounds: [21,10,58,34]},
  {id: 'mediterranean', countries: ['spain','greece','cyprus','united-kingdom'], units: ['minorca','ionian-islands','cyprus'], bounds: [3,33,36,41]},
  {id: 'crown-dependencies', countries: ['united-kingdom'], units: ['isle-of-man','jersey','guernsey'], bounds: [-6,48,-1.7,55]},
  {id: 'falklands', countries: ['united-kingdom'], units: ['falklands'], bounds: [-62,-53,-57.6,-50.8]},
  {id: 'guyana', countries: ['guyana'], units: ['guyana'], bounds: [-62,0,-55,10]},
  {id: 'java', countries: ['indonesia'], units: ['java'], bounds: [104,-10,116,-5]}
];
const files = {
  antarctica: ['antarctica/coast.bin', 'antarctica/context.bin'],
  indonesia: ['archipelago/indonesia-overview.bin', 'archipelago/indonesia-context.bin'],
  malaysia: ['southeast-asia/malaysia-first.bin', 'southeast-asia/malaysia-context.bin'],
  singapore: ['southeast-asia/singapore-first.bin', 'southeast-asia/singapore-context.bin'],
  'south-africa': ['southern-africa/south-africa/first.bin', 'southern-africa/south-africa/context.bin']
};

function rectangle([w,s,e,n]) {
  return fc([{type: 'Feature', properties: {}, geometry: {type: 'Polygon',
    coordinates: [[[w,s],[e,s],[e,n],[w,n],[w,s]]]}}]);
}

async function inBox(collection, box) {
  const [w,s,e,n] = box;
  const candidates = collection.features.flatMap(f => {
    const parts = polygons(f.geometry).filter(p => {
      const [[a,b],[x,y]] = geographicBounds({type: 'Polygon', coordinates:p});
      return a <= e && x >= w && b <= n && y >= s;
    });
    return parts.length ? [{...f, geometry: {type:'MultiPolygon',coordinates:parts}}] : [];
  });
  if (!candidates.length) return fc([]);
  return overlay(fc(candidates),rectangle(box),'clip');
}

const britishSource = {
  mediterranean: id => id === 'GB-O-SBA',
  'crown-dependencies': id => id.startsWith('GB-X-'),
  falklands: id => id === 'GB-O-FK'
};

function pacificLongitudes(collection) {
  return fc(collection.features.map(f=>({...f,geometry:{type:'MultiPolygon',coordinates:polygons(f.geometry).map(p=>
    p.map(r=>r.map(([x,y])=>[x<0?x+360:x,y])) )}})));
}

async function regionalData({id, countries, bounds, pacific}, load) {
  const detailed = [], gray = [], frontiers = [], sources = [];
  for (const country of countries) {
    const root = 'europe/' + country + '/';
    const [first, context] = files[country] || [root + 'first.bin', root + 'context.bin'];
    if (!fs.existsSync('dist/data/' + first)) continue;
    const data = await load(first);
    const raw = data.regions || data.first || data;
    if (!raw.features) continue;
    const relevant = country === 'united-kingdom' ? fc(raw.features.filter(f => britishSource[id](f.properties.id))) :
      country === 'new-zealand' && pacific ? fc(raw.features.filter(f=>['NZ-COK','NZ-NIU','NZ-TKL'].includes(f.properties.id))) : raw;
    const precise = await inBox(pacific?pacificLongitudes(relevant):relevant, bounds);
    if (!precise.features.length) continue;
    detailed.push(...precise.features);
    sources.push(first);
    if (country !== 'united-kingdom' && fs.existsSync('dist/data/' + context)) {
      const contextData=await load(context);
      gray.push(...(await inBox(pacific?pacificLongitudes(contextData):contextData,bounds)).features);
    }
    const border = root + 'international.bin';
    if (fs.existsSync('dist/data/' + border)) {
      const arcs = await load(border);
      frontiers.push(...linesOf(arcs).filter(p => p.some(([x,y]) =>
        x >= bounds[0] && x <= bounds[2] && y >= bounds[1] && y <= bounds[3])).map(line));
    }
  }
  return {detailed, gray, frontiers, sources};
}

// Bucket historic face edges for assigning a newly resolved sliver to nearby
// land. Historical records supply the ownership in each frame. Modern
// administrative geometry constrains matching detached islands to nearby land.
function coastOwners(faces, configs, features, selected, modern) {
  const cells = new Map(), size = .08;
  const key = (x,y) => x + ',' + y;
  for (const {properties:{f},geometry} of faces) for (const polygon of polygons(geometry)) {
    for (const ring of polygon) for (let i=1; i<ring.length; i++) {
      const a = ring[i-1], b = ring[i], segment = {f,a,b};
      for (let x=Math.floor(Math.min(a[0],b[0])/size)-1; x<=Math.floor(Math.max(a[0],b[0])/size)+1; x++) {
        for (let y=Math.floor(Math.min(a[1],b[1])/size)-1; y<=Math.floor(Math.max(a[1],b[1])/size)+1; y++) {
          const k=key(x,y);
          if (!cells.has(k)) cells.set(k,[]);
          cells.get(k).push(segment);
        }
      }
    }
  }
  const units = new Map();
  for (const {properties:{id},geometry} of modern) {
    if (!units.has(id)) units.set(id,[]);
    units.get(id).push(...polygons(geometry).flat(1));
  }
  const contains = [...units].map(([id,rings])=>({id,inside:landIndex(rings)}));
  const unitAt = point => contains.find(unit=>unit.inside(point))?.id;
  const signatures = new Map(selected.map(({properties:{f}}) => [configs.map(c=>c.face[f]).join(','), f]));
  return ([x,y]) => {
    const nearby = cells.get(key(Math.floor(x/size),Math.floor(y/size))) || [];
    const cos = Math.cos(y * Math.PI / 180);
    const distances = new Map();
    for (const {f,a,b} of nearby) {
      const dx=(b[0]-a[0])*cos, dy=b[1]-a[1];
      const u=Math.max(0,Math.min(1,((x-a[0])*cos*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
      const d=metres([x,y],[a[0]+u*(b[0]-a[0]),a[1]+u*dy]);
      if(d<6500 && d<(distances.get(f)??Infinity)) distances.set(f,d);
    }
    {
      // An island omitted by the coarse source may be farther from the old
      // mainland shore. Match its modern administrative unit before extending
      // the dated assignment across water.
      const unit = unitAt([x,y]);
      if (unit !== undefined) {
        const candidates = new Set();
        const col = Math.floor(x/size), row = Math.floor(y/size);
        for (let dx=-9;dx<=9;dx++) for (let dy=-9;dy<=9;dy++) {
          for (const segment of cells.get(key(col+dx,row+dy))||[]) candidates.add(segment);
        }
        for (const segment of candidates) {
          const {f,a,b} = segment;
          if (!('unit' in segment)) segment.unit = unitAt([(a[0]+b[0])/2,(a[1]+b[1])/2]);
          if (segment.unit !== unit) continue;
          const dx=(b[0]-a[0])*Math.cos(y*Math.PI/180),dy=b[1]-a[1];
          const u=Math.max(0,Math.min(1,((x-a[0])*Math.cos(y*Math.PI/180)*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));
          const d=metres([x,y],[a[0]+u*(b[0]-a[0]),a[1]+u*dy]);
          if (d<50000 && d<(distances.get(f)??Infinity)) distances.set(f,d);
        }
      }
    }
    const nearest = [...distances].sort((a,b)=>a[1]-b[1]).map(([f])=>f);
    if (!nearest.length) return -1;
    // New shore inherits the nearest territory that exists in each dated frame.
    // A shore face visible in a later year must not leave a hole in an earlier one.
    const assignment = configs.map(c => {
      const f = nearest.find(f=>c.face[f]>=0);
      return f===undefined ? -1 : c.face[f];
    });
    const signature = assignment.join(',');
    if (signatures.has(signature)) return signatures.get(signature);
    const f = features.length;
    features.push(asShape({type:'MultiPolygon',coordinates:[]}, f));
    configs.forEach((c,i)=>c.face.push(assignment[i]));
    signatures.set(signature,f);
    return f;
  };
}

// Bounded cells restrict shoreline work to its immediate surroundings.
// Shared cell edges dissolve before overlay, without buffering millions
// of source vertices or introducing approximate coast coordinates.
async function shoreBand(lines) {
  const rows = new Map(), scale=20;
  for (const path of linesOf(lines)) for (let i=1;i<path.length;i++) {
    const a=path[i-1], b=path[i];
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))*scale*2));
    for(let j=0;j<=steps;j++){
      const x=Math.floor((a[0]+(b[0]-a[0])*j/steps)*scale);
      const y=Math.floor((a[1]+(b[1]-a[1])*j/steps)*scale);
      for(let row=y-1;row<=y+1;row++){
        if(!rows.has(row))rows.set(row,new Set());
        for(let col=x-1;col<=x+1;col++)rows.get(row).add(col);
      }
    }
  }
  const strips=[];
  for(const [y,cols] of rows){
    const xs=[...cols].sort((a,b)=>a-b);
    for(let i=0;i<xs.length;){
      const start=xs[i++];
      while(i<xs.length&&xs[i]===xs[i-1]+1)i++;
      strips.push(rectangle([start/scale,y/scale,(xs[i-1]+1)/scale,(y+1)/scale]).features[0]);
    }
  }
  return dissolve(strips);
}

// A connected coastal fringe can run for hundreds of kilometres. Its single
// interior point cannot identify every coastal owner. Split it locally first,
// then dissolve matching ownership after assigning the pieces.
function splitFringe(fringe) {
  const pieces = [];
  const split = polygon => {
    const [[w,s],[e,n]] = geographicBounds({type:'Polygon',coordinates:polygon});
    if (Math.max(e-w,n-s)<=.04) {
      pieces.push({type:'Feature',properties:{i:pieces.length},geometry:{type:'Polygon',coordinates:polygon}});
      return;
    }
    const boxes = e-w>n-s ? [[w,s,(w+e)/2,n],[(w+e)/2,s,e,n]] :
      [[w,s,e,(s+n)/2],[w,(s+n)/2,e,n]];
    for (const box of boxes) {
      const mask = rectangle(box).features[0].geometry.coordinates;
      for (const part of clip.intersection([polygon],[mask])) split(part);
    }
  };
  for (const feature of fringe.features) for (const polygon of polygons(feature.geometry)) split(polygon);
  return fc(pieces);
}

async function refinedRegion(region, selected, load, configs, features, years) {
  const {detailed, gray, frontiers, sources} = await regionalData(region, load);
  if(region.pacific)selected=pacificLongitudes(fc(selected)).features;
  if (!detailed.length) return null;
  console.log('Aligning', region.id, 'to', sources.join(', '));
  const land = await dissolve(detailed);
  const smooth = await exact(land, '-simplify dp interval=.008 planar keep-shapes');
  const band = await shoreBand(physicalShoreLines(smooth.features,region.bounds));
  // Keep the dated political line where the modern land boundary meets the
  // sea. A modern border discrepancy must not be treated as a coastline.
  const guards = frontiers.length ? await shoreBand(fc(frontiers)) : fc([]);
  const scope = await overlay(await overlay(band,guards,'erase'),rectangle(region.bounds),'clip');
  const clippedGray = await overlay(fc(gray),scope,'clip');
  const clippedOld = await overlay(fc(selected),scope,'clip');
  const oldLand = await dissolve(clippedOld.features);
  if (!oldLand.features.length) return null;
  const cover = await dissolve([...clippedGray.features,...oldLand.features]);
  let water = await overlay(cover,land,'erase');
  const revised = await overlay(fc(selected),water,'erase');
  const inScope = await overlay(land,scope,'clip');
  const fringe = splitFringe(await overlay(inScope,oldLand,'erase',true));
  fringe.features.forEach((f,i) => { f.properties={i}; });
  const before = features.length;
  const nearest = coastOwners(clippedOld.features, configs, features, selected, detailed);
  const additions = [];
  if (fringe.features.length) {
    const labels = await exact(fringe, '-points inner');
    for (const f of labels.features) {
      const id = f.geometry && nearest(f.geometry.coordinates);
      if (id >= 0) additions.push(asShape(fringe.features[f.properties.i].geometry,id));
    }
  }
  let corrected = fc([...revised.features,...additions]);
  if (region.id === 'malaya') {
    // Singapore is a separate island jurisdiction in the dated frames. Put
    // its modern reclaimed shore on the same face as the historic city,
    // even where the nearest coarse polygon is across the strait.
    const island = await load(files.singapore[0]);
    const singapore = await dissolve(island.regions.features);
    const owner = selected.find(f=>landIndex(polygons(f.geometry).flat(1))([103.85,1.29]));
    assert(owner, 'Singapore has a dated face for its island coastline');
    corrected = await overlay(corrected,singapore,'erase');
    corrected.features.push(...singapore.features.map(f=>asShape(f.geometry,owner.properties.f)));
  }
  // Faces with the same owner in every frame have no political border
  // between them. Joining them removes tile seams and duplicate edge storage.
  const signatures = new Map(), canonical = new Map();
  for (const {properties:{f}} of corrected.features) {
    if (canonical.has(f)) continue;
    const signature = configs.map(c=>c.face[f]).join(',');
    if (!signatures.has(signature)) signatures.set(signature,f);
    canonical.set(f,signatures.get(signature));
  }
  corrected = fc(corrected.features.map(f=>({...f,properties:{f:canonical.get(f.properties.f)}})));
  corrected = await exact(corrected, '-dissolve2 f');
  let neutral = inScope;
  if (region.id === 'north-america') {
    const shared = await reconcileNorthAmerica({land,gray,faces:corrected,configs,years,features,load});
    sources.push('europe/united-states/second/US-NY.bin','europe/canada/second/CA-NS.bin','europe/canada/second/CA-NL.bin');
    corrected = shared.faces;
    water = shared.water;
    neutral = shared.neutral;
  }
  const finalOwners = new Map(), merged = new Map();
  for (const {properties:{f}} of corrected.features) {
    if (merged.has(f)) continue;
    const signature = configs.map(c=>c.face[f]).join(',');
    if (!finalOwners.has(signature)) finalOwners.set(signature,f);
    merged.set(f,finalOwners.get(signature));
  }
  corrected = fc(corrected.features.map(f=>({...f,properties:{f:merged.get(f.properties.f)}})));
  const combined = await exact(corrected, '-dissolve2 f');
  const byId = new Map(combined.features.map(f=>[f.properties.f,f.geometry]));
  const affected = [...selected.map(f => f.properties.f), ...features.slice(before).map(f=>f.properties.f)];
  const faces = fc([
    ...neutral.features.filter(isPolygon).map(f=>asShape(f.geometry,-1)),
    ...affected.map(f=>asShape(byId.get(f)||{type:'MultiPolygon',coordinates:[]},f))
  ]);
  return {faces, water, affected, sources,...(region.id==='north-america'?{land}:{})};
}


// The overview uses corrected land borders without loading the detailed coast
// fill. Original coarse arcs remain available for overview selection outlines.
export function useHistoricalCoastBorders(arcs, configs, coast, region) {
  const affected = new Set(coast.affected);
  const obsolete = new Set();
  let next = 0;
  const retained = [];
  for (const arc of arcs) {
    const p = arc.properties;
    next = Math.max(next,p.a+1);
    if (p.borderOnly && p.coastRegion === region) {
      obsolete.add(p.a);
      continue;
    }
    if (affected.has(p.l) || affected.has(p.r)) {
      p.selectionOnly = true;
      obsolete.add(p.a);
    }
    retained.push(arc);
  }
  // All paths with the same adjacent faces have the same ownership in every
  // frame. One multipart feature keeps the overview filters and metadata small.
  const pairs = new Map();
  for (const arc of coast.arcs.features) {
    if (arc.properties.coast) continue;
    const [left,right] = [arc.properties.l,arc.properties.r].sort((a,b)=>a-b);
    const key = left+','+right;
    if (!pairs.has(key)) pairs.set(key,{left,right,coordinates:[]});
    pairs.get(key).coordinates.push(...(arc.geometry.type==='MultiLineString'?
      arc.geometry.coordinates:[arc.geometry.coordinates]));
  }
  const borders = [...pairs.values()].map(({left,right,coordinates})=>({
    type:'Feature',
    properties:{a:next++,l:left,r:right,coast:false,exact:true,borderOnly:true,coastRegion:region},
    geometry:{type:'MultiLineString',coordinates}
  }));
  for (const config of configs) {
    config.lines = config.lines.filter(id=>!obsolete.has(id));
    config.frontiers = config.frontiers.filter(id=>!obsolete.has(id));
    for (const {properties:p} of borders) {
      const left = config.face[p.l] ?? -1, right = config.face[p.r] ?? -1;
      if (left === right || left < 0 && right < 0) continue;
      (left < 0 || right < 0 ? config.frontiers : config.lines).push(p.a);
    }
  }
  arcs.length = 0;
  for (const arc of retained) arcs.push(arc);
  for (const arc of borders) arcs.push(arc);
  return {selectionArcs:obsolete.size,borders:borders.length};
}

// Both zoom ranges derive from the modern physical land partition. The
// overview is a display LOD of this same mesh, never an old shoreline.
export async function useModernCoastOverview(features, coast, region) {
  const overview=valid(await exact(fc(coast.faces.features.filter(f=>f.properties.f>=0)), '-simplify dp interval=.001 planar keep-shapes'));
  const byId=new Map(overview.features.map(f=>[f.properties.f,f.geometry]));
  for(const f of coast.affected){
    features[f].geometry=byId.get(f)||{type:'MultiPolygon',coordinates:[]};
    features[f].properties={...features[f].properties,sharedSource:'canonical-coast:'+region};
  }
  return overview;
}

export function coastWriter(output, topology, feature, manifest) {
  fs.mkdirSync(output + '/coasts', {recursive: true});
  return async function write(id, bounds, data, areas) {
    const positive = data.faces.features.filter(f=>f.properties.f>=0 && isPolygon(f));
    const residual = data.land ? await overlay(data.land,await dissolve(positive),'erase') : fc([]);
    const mesh = topology({land:fc([...positive,...residual.features.map(f=>asShape(f.geometry,-1))])});
    const sides = new Map();
    for (const cell of mesh.objects.land.geometries) {
      for (const arc of new Set(cell.arcs.flat(Infinity).map(a=>a<0?~a:a))) {
        if (!sides.has(arc)) sides.set(arc,[]);
        sides.get(arc).push(cell.properties.f);
      }
    }
    const coastDistance = data.land ? lineIndex(data.land.features.flatMap(f=>polygons(f.geometry).flat(1))) : null;
    const followsCoast = coordinates => coastDistance && coordinates.every((point,i) =>
      coastDistance(point) < 2 && (!i || coastDistance(point.map((v,k)=>(v+coordinates[i-1][k])/2)) < 2));
    // Administrative strokes need land on both sides. Collapsed overlay
    // slivers have no such interior; their fill coordinates stay untouched.
    const ringsByFace = new Map();
    if (coastDistance) for (const f of [...positive,...residual.features.map(f=>asShape(f.geometry,-1))]) {
      const id=f.properties.f;
      if(!ringsByFace.has(id))ringsByFace.set(id,[]);
      ringsByFace.get(id).push(...polygons(f.geometry).flat(1));
    }
    const interior = new Map([...ringsByFace].map(([f,rings])=>[f,landIndex(rings)]));
    const hasBothSides = (a,b,l,r) => {
      const middle=a.map((v,k)=>(v+b[k])/2),cos=Math.cos(middle[1]*Math.PI/180);
      const dx=(b[0]-a[0])*cos,dy=b[1]-a[1],length=Math.hypot(dx,dy);
      if(!length)return false;
      // Sample beyond coordinate-rounding noise on each side of the edge.
      const step=.25/111195;
      const x=-dy/length*step/cos,y=dx/length*step;
      const left=[middle[0]+x,middle[1]+y],right=[middle[0]-x,middle[1]-y];
      const insideL=interior.get(l),insideR=interior.get(r);
      return !!insideL&&!!insideR&&((insideL(left)&&insideR(right))||(insideL(right)&&insideR(left)));
    };
    const arcs = fc([...sides].flatMap(([a,owners])=>{
      const [l,r=-1]=owners,geometry=feature(mesh,{type:'LineString',arcs:[a]}).geometry;
      if(!coastDistance)return [{type:'Feature',properties:{l,r,exact:true,coast:owners.length===1},geometry}];
      const coordinates=geometry.coordinates,parts=[];
      let start=0,status;
      const append=end=>{if(end>start)parts.push({type:'Feature',properties:{l,r,exact:true,coast:status},
        geometry:{type:'LineString',coordinates:coordinates.slice(start,end+1)}});start=end;};
      for(let i=1;i<coordinates.length;i++){
        const coast=owners.length===1||!!followsCoast([coordinates[i-1],coordinates[i]])||
          !hasBothSides(coordinates[i-1],coordinates[i],l,r);
        if(status!==undefined&&coast!==status)append(i-1);
        status=coast;
      }
      append(coordinates.length-1);
      return parts;
    }));
    const {land,...display} = data;
    const bytes = gzipSync(encodeGeo({...display,arcs}),{level:9});
    const file = 'coasts/' + id + '.bin';
    fs.writeFileSync(output + '/' + file,bytes);
    manifest.push({id,bounds,file,faces:data.affected,...(areas?{areas}:{}),
      ...(id==='north-america'?{minZoom:7,sides:arcs.features.flatMap(({properties:p},i)=>p.coast?[]:[[i,p.l,p.r]])}:{})});
    console.log(id, 'coast', bytes.length, 'bytes,', positive.length, 'historical faces');
    return {arcs,affected:data.affected,faces:data.faces};
  };
}

export async function writeUKCoasts({features, ownerVersions, versions, configs, years, baseArcs, australiaFaces, load, lineIndex, topology, feature, merge, output}) {
  const manifest = [];
  const write=coastWriter(output,topology,feature,manifest);
  console.log('Building the full-resolution Australian coast');
  const precise = await australiaHistoryMesh(versions,{load,topology,merge,lineIndex,detailed:true});
  const context = await load('europe/australia/context.bin');
  const current = await load('europe/australia/first.bin');
  const ids = new Map(australiaFaces.map(({properties:{f}})=>[ownerVersions[f].join(','),f]));
  const faces = precise.map(({owners,geometry})=>{
    const f=ids.get(owners.join(','));
    assert(f!==undefined,'Australian coast needs a matching dated assignment');
    return asShape(geometry,f);
  });
  const norfolk = features.find(f=>f.properties.sharedSource==='europe/australia/context.bin' &&
    ownerVersions[f.properties.f].some(i=>versions[i].id==='norfolk'));
  faces.push(asShape(current.regions.features.find(f=>f.properties.id==='AU-NFK').geometry,norfolk.properties.f));
  const affected = faces.map(f=>f.properties.f);
  const missing = australiaFaces.filter(f=>!affected.includes(f.properties.f));
  for (const {properties:{f}} of missing) {
    affected.push(f);
    faces.push(asShape({type:'MultiPolygon',coordinates:[]},f));
  }
  const gray = context.features.filter(f=>!f.properties.region || ['AU-NFK','AU-JBT','AU-MAC'].includes(f.properties.region));
  const detailLand = fc([{type:'Feature',geometry:multipart(faces),properties:{}}]);
  const water = await exact({'gray.json':fc(gray),'land.json':detailLand},'-erase land.json');
  const australia=await write('australia',[111,-55,168.5,-8],{affected,faces:fc(faces),water,sources:['europe/australia/first.bin']},australianAreas);
  await useModernCoastOverview(features,australia,'australia');
  useHistoricalCoastBorders(baseArcs,configs,australia,'australia');
  const ownership = features.map(()=>new Set());
  for (const config of configs) config.face.forEach((u,f)=>{if(u>=0)ownership[f].add(config.units[u].id);});
  const ownedBy = (f, units) => [...ownership[f]].some(id=>units.has(id));
  return writeRegionalCoasts({features, configs, years, baseArcs, ownedBy, load, topology, feature, output, manifest});
}

export const australianAreas = [[111,-45,155.5,-9.25],[158.75,-54.9,159.1,-54.2],[167.6,-29.5,168.3,-28.6],[158.9,-31.9,159.3,-31.3]];
export const regionBounds = id => bins.find(r=>r.id===id)?.bounds;
export async function writeRegionalCoasts({features, configs, years, baseArcs, ownedBy, load, topology, feature, output, manifest = []}) {
  const write=coastWriter(output,topology,feature,manifest);
  const assigned = new Set(manifest.flatMap(r=>r.faces));
  for (const region of bins) {
    if(manifest.some(r=>r.id===region.id))continue;
    const units = new Set(region.units);
    const selected = features.filter(({properties:{f,sharedSource,hostId}})=>
      !sharedSource&&!hostId&&!assigned.has(f)&&ownedBy(f,units));
    if (!selected.length) continue;
    const data = await refinedRegion(region,selected,load,configs,features,years);
    if (!data) continue;
    data.affected.forEach(f=>assigned.add(f));
    const coast = await write(region.id,region.bounds,data);
    await useModernCoastOverview(features,coast,region.id);
    useHistoricalCoastBorders(baseArcs,configs,coast,region.id);
  }
  return manifest;
}

// A preferred label may fall in water once the canonical shore replaces a
// rough historical coast. Move only those labels, inside the same dated unit.
export async function alignCanonicalLabels(features,configs){
 const shapes=packShapes(polygonParts(fc(features)).features),areas=new Map(),labels=new Map();let moved=0;
 for(const config of configs)for(const[index,unit]of config.units.entries()){
  if(shapeAtLocation(shapes,{lng:unit.label[0],lat:unit.label[1]},({f})=>config.face[f]===index))continue;
  const parts=features.filter(f=>config.face[f.properties.f]===index&&isPolygon(f));
  assert(parts.length,'Dated unit retains physical land: '+unit.name);
  const key=parts.map(f=>f.properties.f).join(',');let point=labels.get(key);
  if(!point){for(const f of parts)if(!areas.has(f.properties.f))areas.set(f.properties.f,geographicAreaKm2(f.geometry));
   const biggest=parts.reduce((a,b)=>areas.get(a.properties.f)>=areas.get(b.properties.f)?a:b);
   point=(await exact(fc([biggest]),'-points inner')).features[0].geometry.coordinates;labels.set(key,point);}
  unit.label=point;moved++;
 }
 return moved;
}
