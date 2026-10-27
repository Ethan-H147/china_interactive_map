import fs from 'node:fs';
import {createHash} from 'node:crypto';
export function buildAntarcticFlags(){
 const definitions=JSON.parse(fs.readFileSync('scripts/antarctic-flag-definitions.json')),source=JSON.parse(fs.readFileSync('dist/data/antarctica/flag-sources.json')),facilities=JSON.parse(fs.readFileSync('dist/data/antarctica/facilities.json')).records;
 for(const r of facilities)for(const operator of new Set(r.operators)){const flag=definitions.national[operator];if(!flag||!fs.existsSync('dist/'+flag.file))throw Error('Missing operator flag: '+operator);}
 for(const [id,flag]of Object.entries(source.flags)){if(!facilities.some(r=>r.id===id)||!definitions.stations[id])throw Error('Unknown station flag: '+id);if(createHash('sha256').update(fs.readFileSync('dist/'+flag.full)).digest('hex')!==flag.sha256)throw Error('Station artwork changed: '+id);}
 const flags=Object.fromEntries(Object.entries(source.flags).map(([id,f])=>[id,{name:f.name,file:f.file,full:f.full,page:f.page,credit:f.credit,license:f.license,classification:f.classification}]));
 fs.writeFileSync('dist/data/antarctica/flags.json',JSON.stringify({national:definitions.national,stations:flags})+'\n');
 console.log(facilities.length+' facilities: '+Object.keys(definitions.national).length+' operator-country flags and '+Object.keys(flags).length+' station flags.');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/build-antarctic-flags.mjs'))buildAntarcticFlags();
