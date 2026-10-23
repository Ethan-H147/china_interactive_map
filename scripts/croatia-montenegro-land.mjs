import fs from 'node:fs';
import assert from 'node:assert/strict';
import {source,root} from './fetch-balkans.mjs';
import {metres} from './geo-index.mjs';
import {joinReferencePaths,selectFrontierArc} from './frontier-arcs.mjs';
export function croatiaMontenegroLandArc(outline,previous){
 if(!fs.existsSync(root+'croatia-country-members.json.gz'))return previous;
 const hr=JSON.parse(source('croatia-country-members.json')).elements.find(e=>e.type==='relation'),ids=new Set(hr.members.filter(m=>m.type==='way').map(m=>m.ref)),municipality=JSON.parse(source('montenegro-osm.json')).elements.find(e=>e.id===2187901),shared=joinReferencePaths(municipality.members.filter(m=>m.type==='way'&&m.role==='outer'&&ids.has(m.ref)).map(m=>m.geometry.map(p=>[p.lon,p.lat])));
 assert.equal(shared.length,1,'One complete shared Croatia–Montenegro OSM land border');const guide=shared[0].map(p=>p.slice());if(metres(guide[0],previous[0])>metres(guide.at(-1),previous[0]))guide.reverse();guide[0]=previous[0];return selectFrontierArc(outline,guide).path;
}
