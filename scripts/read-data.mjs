import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const root=new URL('../dist/data/',import.meta.url);
export function readDataText(name){
  if(name==='display-boundaries.json'){
    const manifest=JSON.parse(fs.readFileSync(new URL('display-boundaries.parts.json',root)));
    return gunzipSync(Buffer.concat(manifest.parts.map(part=>fs.readFileSync(new URL(part,root))))).toString('utf8');
  }
  const plain=new URL(name,root),compressed=new URL(name+'.gz',root);
  return (fs.existsSync(compressed)?gunzipSync(fs.readFileSync(compressed)):fs.readFileSync(plain)).toString('utf8');
}
export const readData=name=>JSON.parse(readDataText(name));
