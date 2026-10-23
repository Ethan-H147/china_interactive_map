import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{unzipSync}=createRequire(require.resolve('mapshaper'))('fflate');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
export function readOds(bytes){
 const xml=Buffer.from(unzipSync(bytes)['content.xml']).toString(),tables={};
 for(const table of xml.matchAll(/<table:table\s[^>]*table:name="([^"]+)"[^>]*>([\s\S]*?)<\/table:table>/g)){
  const rows=[];
  for(const row of table[2].matchAll(/<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/g)){
   const values=[];
   for(const cell of row[1].matchAll(/<table:table-cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-cell>)/g)){
    const numeric=/office:value="([^"]+)"/.exec(cell[1]),text=(cell[2]||'').replace(/<text:s\b[^>]*\/>/g,' ').replace(/<[^>]+>/g,'');
    const value=numeric?Number(numeric[1]):decode(text),repeat=Math.min(32-values.length,Number(/table:number-columns-repeated="(\d+)"/.exec(cell[1])?.[1]||1));
    for(let i=0;i<repeat;i++)values.push(value);
   }
   while(values.at(-1)==='')values.pop();if(values.length)rows.push(values);
  }
  tables[decode(table[1])]=rows;
 }
 return tables;
}
