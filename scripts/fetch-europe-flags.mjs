import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';

// National flags only; original public-domain SVG artwork from Wikimedia Commons.
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
const manifestPath=resolve(dist,'data/europe/flag-sources.json');
let manifest;try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}catch{manifest={flags:{}};}
const commons=(file,path)=>({original:'https://upload.wikimedia.org/wikipedia/commons/'+path+'/'+encodeURIComponent(file).replace(/%2C/g,','),page:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file.replace(/ /g,'_')),credit:'Wikimedia Commons',license:'Public domain'});
const sources={
 denmark:{file:'vendor/flag-dk.svg',...commons('Flag_of_Denmark.svg','9/9c')},
 'vatican-city':{file:'vendor/flag-va.svg',...commons('Flag_of_Vatican_City_(2023–present).svg','b/b3')},
 germany:{file:'vendor/flag-de.svg',...commons('Flag_of_Germany.svg','b/ba')},
 belgium:{file:'vendor/flag-be.svg',...commons('Flag_of_Belgium.svg','6/65')},
 switzerland:{file:'vendor/flag-ch.svg',...commons('Flag_of_Switzerland.svg','f/f3')},
 netherlands:{file:'vendor/flag-nl.svg',...commons('Flag_of_the_Netherlands.svg','2/20')},
 'united-states':{file:'vendor/flag-us.svg',...commons('Flag_of_the_United_States.svg','a/a4')},
 canada:{file:'vendor/flag-ca.svg',...commons('Flag_of_Canada.svg','c/cf')},
 mexico:{file:'vendor/flag-mx.svg',...commons('Flag_of_Mexico.svg','f/fc')},
 'united-kingdom':{file:'vendor/flag-gb.svg',...commons('Flag_of_the_United_Kingdom_(1-2).svg','a/a5')},
 spain:{file:'vendor/flag-es.svg',...commons('Flag_of_Spain.svg','9/9a')},
 france:{file:'vendor/flag-fr.svg',...commons('Flag_of_France.svg','c/c3')},
 italy:{file:'vendor/flag-it.svg',...commons('Flag_of_Italy.svg','0/03')},
 iceland:{file:'vendor/flag-is.svg',...commons('Flag_of_Iceland.svg','c/ce')},
 turkey:{file:'vendor/flag-tr.svg',...commons('Flag_of_Turkey.svg','b/b4')},
 india:{file:'vendor/flag-in.svg',...commons('Flag_of_India.svg','4/41')},
 chile:{file:'vendor/flag-cl.svg',...commons('Flag_of_Chile.svg','7/78')},
 paraguay:{file:'vendor/flag-py.svg',...commons('Flag_of_Paraguay.svg','2/27')},
 peru:{file:'vendor/flag-pe.svg',...commons('Flag_of_Peru.svg','c/cf')}
};
for(const [country,flag] of Object.entries(sources)){
 const known=manifest.flags[country],path=resolve(dist,flag.file);let bytes;
 try{bytes=await readFile(path);}catch{}
 if(!bytes||process.argv.includes('--refresh')){
  let response;
  for(let attempt=0;attempt<4;attempt++){
   response=await fetch(flag.original,{headers:{'User-Agent':'Atlas/1.0 (flag source preservation)'}});
   if(response.ok||![429,502,503].includes(response.status))break;
   await new Promise(resolve=>setTimeout(resolve,3000*(attempt+1)));
  }
  if(!response.ok)throw Error(`${country}: HTTP ${response.status}`);
  bytes=Buffer.from(await response.arrayBuffer());
  if(!bytes.toString('utf8').includes('<svg'))throw Error(`${country}: original is not SVG`);
  await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);
 }
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(known?.sha256&&known.sha256!==sha256&&!process.argv.includes('--refresh'))throw Error(`${country}: original checksum differs`);
 // The SVG is itself the original, so the viewer enlarges the same file at its own proportions.
 const tag=/<svg\b[^>]*>/.exec(bytes.toString('utf8'))[0],attr=name=>new RegExp('\\s'+name+'="([^"]+)"').exec(tag)?.[1];
 const box=(attr('viewBox')||'').trim().split(/[\s,]+/).map(Number);
 const width=parseFloat(attr('width'))||box[2],height=parseFloat(attr('height'))||box[3];
 if(!(width>0&&height>0))throw Error(`${country}: SVG has no size`);
 manifest.flags[country]={...flag,full:flag.file,source:flag.page,width,height,sha256};
 console.log(country,flag.file,bytes.length);
}
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
