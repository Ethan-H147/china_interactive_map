import fs from 'node:fs';
import {createRequire} from 'node:module';
// Minimal .xlsx reader for statistical tables: returns each sheet as rows of cell
// values (strings or numbers). Shared strings, inline strings and numbers only.
const require=createRequire(import.meta.url);
const {unzipSync,strFromU8}=createRequire(require.resolve('mapshaper'))('fflate');
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&amp;/g,'&');
const column=ref=>[...ref.replace(/\d+/g,'')].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
export function readXlsx(file){
 const files=unzipSync(fs.readFileSync(file)),text=name=>files[name]?strFromU8(files[name]):'';
 const shared=[...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t=>t[1]).join('')));
 const workbook=text('xl/workbook.xml'),rels=text('xl/_rels/workbook.xml.rels');
 const targets=Object.fromEntries([...rels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map(m=>[/Id="([^"]+)"/.exec(m[1])[1],/Target="([^"]+)"/.exec(m[1])[1]]));
 const sheets={};
 for(const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)){
  const name=decode(/name="([^"]+)"/.exec(m[1])[1]),id=/r:id="([^"]+)"/.exec(m[1])[1],path='xl/'+targets[id].replace(/^\/?xl\//,'');
  const rows=[];
  for(const r of text(path).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
   const row=[];
   for(const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
    const attrs=c[1],body=c[2]||'',ref=/r="([A-Z]+\d+)"/.exec(attrs)?.[1],type=/t="([^"]+)"/.exec(attrs)?.[1];
    const v=/<v>([\s\S]*?)<\/v>/.exec(body)?.[1],inline=/<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1];
    const value=type==='s'?shared[+v]:type==='inlineStr'?decode(inline||''):type==='str'?decode(v||''):v===undefined?'':Number(v);
    row[ref?column(ref):row.length]=value;
   }
   rows.push(row);
  }
  sheets[name]=rows;
 }
 return sheets;
}
