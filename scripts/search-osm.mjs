import fs from 'node:fs';
const q='[out:json][timeout:30];(relation(38.8,75.4,39.7,76.9)[boundary=administrative][name~"草湖"];node(38.8,75.4,39.7,76.9)[place][name~"草湖"];);out tags bb;';
const r=await fetch('https://overpass.private.coffee/api/interpreter',{method:'POST',headers:{'User-Agent':'ChinaBoundaryAtlas/1.0 (one-time boundary research)'},body:new URLSearchParams({data:q}),signal:AbortSignal.timeout(70000)});
const t=await r.text();fs.writeFileSync('scripts/additional-sources/osm-search.json',t);console.log(r.status,t.slice(0,5000));
