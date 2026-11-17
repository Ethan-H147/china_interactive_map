// geojson-vt normally simplifies whole rings independently. Historical faces
// must instead inherit one importance value from their shared political arcs.
// This runs only in the compiler, against the pinned geojson-vt build.
export function alignHistoricalSimplification(faces,edges){
 const root=tree=>tree.tileIndex.tiles[0]?.source;
 const edgeFeatures=root(edges),faceFeatures=root(faces);
 if(!edgeFeatures||!faceFeatures)throw Error('Missing native historical root');
 const key=(x,y)=>Math.round((((x%1)+1)%1)*1e13)+','+Math.round(y*1e13),importance=new Map();
 for(const f of edgeFeatures){const lines=f.type==='LineString'?[f.geometry]:f.geometry;for(const line of lines){const p=line.points;for(let i=0;i<p.length;i+=3){const k=key(p[i],p[i+1]);importance.set(k,Math.max(importance.get(k)||0,p[i+2]));}}}
 let shared=0;
 for(const f of faceFeatures){if(f.tags?.water)continue;const polygons=f.type==='Polygon'?[f.geometry]:f.geometry;for(const polygon of polygons)for(const ring of polygon){ring.size=Infinity;const p=ring.points;for(let i=0;i<p.length;i+=3){const value=importance.get(key(p[i],p[i+1]));if(value!==undefined){p[i+2]=value;shared++;}else if(!f.tags?.neutral)p[i+2]=1;}}}
 faces.tileIndex.tiles={};faces.tileIndex.tileCoords=[];faces.tileIndex.splitTile(faceFeatures,0,0,0);
 return shared;
}
