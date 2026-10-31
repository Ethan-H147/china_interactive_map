import fs from 'node:fs';import {retain,root} from './fetch-world-completion.mjs';
const probe=JSON.parse(fs.readFileSync(root+'probe.json'));let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<probe.length){const d=probe[cursor++],iso=d.iso.toLowerCase();if(d.ab&&d.country!=='central-african-republic'){const r=d.ab.resources.find(r=>/geojson/i.test(r.format)&&/zip$/i.test(r.url));if(r)await retain(iso+'.zip',r.url,{license:d.ab.license,credit:'National provider / OCHA HDX COD-AB'});}
 if(!d.ab||d.country==='central-african-republic')for(const level of [1,2]){const m=d['gb'+level];if(m?.url)await retain(iso+'-adm'+level+'.geojson',m.url,{license:m.license,credit:m.source,year:m.year});}
 if(d.ps){const resources=d.ps.resources.filter(r=>/csv$/i.test(r.name)),years=resources.flatMap(r=>r.name.match(/20[012]\d/g)||[]).map(Number),latest=Math.max(...years);for(const r of resources.filter(r=>!(/20[012]\d/.test(r.name))||r.name.includes(latest)))await retain(iso+'-population-'+r.name,r.url,{license:d.ps.license,credit:'National provider / OCHA HDX COD-PS'});}
 console.log('Downloaded',d.country);
}}));
