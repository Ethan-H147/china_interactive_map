import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
export async function addHanja(data){
 const manifest=JSON.parse(await fs.readFile(new URL('./korea-hanja.json',import.meta.url),'utf8'));
 const features=[...data.first.features,...data.second.features];
 for(const {properties:p} of features){
  const entry=manifest.names[p.id]||manifest.omitted[p.id];
  assert(entry&&entry.ko===p.ko,'Hanja record must match the mapped region: '+p.id);
  delete p.hanja;delete p.hanjaSource;
  if(entry.hanja){p.hanja=entry.hanja;p.hanjaSource=entry.url;}
 }
 return manifest;
}
