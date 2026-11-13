import {compactUrl, decodeData, fetchBytes} from './geo-pack.mjs';
import {chooseChunks} from './boundary-budget.mjs';

const collection = features => ({type: 'FeatureCollection', features});
const read = async (url, select) => decodeData(await fetchBytes(compactUrl(url)), {select, flatPaths: true});

function ringBounds(ring) {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  const flat = ArrayBuffer.isView(ring);
  for (let i = 0; i < ring.length; i += flat ? 2 : 1) {
    const x = flat ? ring[i] : ring[i][0];
    const y = flat ? ring[i + 1] : ring[i][1];
    west = Math.min(west, x);
    south = Math.min(south, y);
    east = Math.max(east, x);
    north = Math.max(north, y);
  }
  return [west, south, east, north];
}

function points(ring) {
  return ArrayBuffer.isView(ring) ? Array.from({length: ring.length / 2}, (_, i) => [ring[i * 2], ring[i * 2 + 1]]) : ring;
}

// Cut oversized polygons outside the buffered view. Every vertex inside the
// clip rectangle is retained, including vertices around inland water holes.
function clipRing(ring, [west, south, east, north]) {
  // Clip flat typed coordinates before creating GeoJSON point pairs. Expanding
  // an entire continent first creates millions of short-lived arrays.
  let result=ArrayBuffer.isView(ring)?ring.subarray(0,ring.length-2):Float64Array.from(ring.slice(0,-1).flat());
  for(const [axis,edge,direction] of [[0,west,1],[0,east,-1],[1,south,1],[1,north,-1]]){
    if(!result.length)return;
    const output=new Float64Array(result.length*2+4);let at=0,px=result[result.length-2],py=result[result.length-1],previous=axis?py:px,wasInside=(previous-edge)*direction>=0;
    for(let i=0;i<result.length;i+=2){const x=result[i],y=result[i+1],value=axis?y:x,inside=(value-edge)*direction>=0;
      if(inside!==wasInside){const t=(edge-previous)/(value-previous);output[at++]=axis?px+(x-px)*t:edge;output[at++]=axis?edge:py+(y-py)*t;}
      if(inside){output[at++]=x;output[at++]=y;}px=x;py=y;previous=value;wasInside=inside;
    }
    result=output.subarray(0,at);
  }
  if(result.length<6)return;
  const output=points(result);output.push(output[0]);return output;
}

// Clip existing line paths without introducing a line along the clip box.
export function contextLinePaths(paths,scope){
 const [w,s,e,n]=scope,out=[];
 for(const path of paths){const flat=ArrayBuffer.isView(path),length=flat?path.length/2:path.length;let run;
  for(let i=1;i<length;i++){
   const ax=flat?path[2*i-2]:path[i-1][0],ay=flat?path[2*i-1]:path[i-1][1],bx=flat?path[2*i]:path[i][0],by=flat?path[2*i+1]:path[i][1];
   const shift=360*Math.round((w+e-ax-bx)/720),x=ax+shift,dx=bx-ax,dy=by-ay;let lo=0,hi=1,hit=true;
   for(const [p,q]of [[-dx,x-w],[dx,e-x],[-dy,ay-s],[dy,n-ay]]){if(p===0){if(q<0){hit=false;break;}}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi){hit=false;break;}}}
   if(!hit||hi-lo<1e-12){run=null;continue;}
   const a=[ax+dx*lo,ay+dy*lo],b=[ax+dx*hi,ay+dy*hi];
   if(!run||Math.abs(run.at(-1)[0]-a[0])>1e-10||Math.abs(run.at(-1)[1]-a[1])>1e-10)out.push(run=[a]);run.push(b);if(hi<1)run=null;
  }
 }return out;
}

export function contextPolygons(features, scope, territories, open, country, {preserveProperties = false, clipThreshold = 32000} = {}) {
  const output = [];
  const [west, south, east, north] = scope;
  for (const {geometry, properties} of features) {
    if (!geometry) continue;
    const territory = preserveProperties ? null : territories.get(properties.id);
    if (territory?.claimedBy === open || territory?.claimants && !territory.claimants.includes(open)) continue;
    const metadata = territory ? {region: territory.region, bounds: territory.bounds} : {};
    const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
    for (const polygon of polygons) {
      if (!polygon[0]?.length) continue;
      const [w, s, e, n] = ringBounds(polygon[0]);
      const shift = 360 * Math.round((w + e - west - east) / 720);
      const x = west + shift, y = east + shift;
      if (e < x || w > y || n < south || s > north) continue;
      const size = polygon.reduce((total, ring) => total + ring.length, 0);
      const clipped = size > clipThreshold && !(w >= x && e <= y && s >= south && n <= north);
      const coordinates = clipped ? polygon.map(ring => clipRing(ring, [x, south, y, north])) : polygon.map(points);
      if (coordinates[0]) output.push({type: 'Feature', properties: preserveProperties ? properties : {country, ...metadata},
        geometry: {type: 'Polygon', coordinates: coordinates.filter(Boolean)}});
    }
  }
  return output;
}

export async function prepareModernContext({file, extra, catalogue, chunks, coarse, country, member, open, scope, tolerance, center, limit}) {
  const portal = await read(coarse, data => data.features.map(feature => feature.properties));
  // Some previews remove a portion of a subdivision where claims overlap.
  // Keep that preview if the active view relies on this geometry split.
  if (portal.some(p => !p.region && (p.claimedBy === open || p.claimants && !p.claimants.includes(open)))) return {};
  const territories = new Map(portal.filter(p => p.region).map(p => [p.region, p]));
  const features = await read(file, data => (member ? data[member] : data).features);
  const refined = new Set();
  const land = [];
  if (chunks) {
    const data = await read(chunks, value => value);
    const [w, s, e, n] = scope;
    let bytes = 0;
    for (const id of chooseChunks(data.records, [[w, s], [e, n]], center, {limit})) {
      const entry = data.chunks[id];
      if (!entry || bytes + entry.decodedBytes > 12 * 1024 * 1024) continue;
      const local = await read(new URL(entry.file, chunks).href, value => value.first.features);
      bytes += entry.decodedBytes;
      refined.add(id);
      land.push(...contextPolygons(local, scope, territories, open, country));
    }
  }
  land.push(...contextPolygons(features.filter(feature => !refined.has(feature.properties.id)), scope, territories, open, country));
  if (extra) land.push(...contextPolygons(await read(extra, data => data.features), scope, territories, open, country));
  const rendering = catalogue ? await read(catalogue, data => data.rendering ?? null) : null;
  return {blob: new Blob([JSON.stringify(collection(land))], {type: 'application/json'}),
    tolerance: rendering?.fillTolerance ?? tolerance};
}
