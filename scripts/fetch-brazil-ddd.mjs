import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {execFileSync} from 'node:child_process';
const folder='artifacts/brazil-codes';await fs.mkdir(folder,{recursive:true});
const sources={
 'municipios.zip':'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/BR_Municipios_2025.zip',
 'ddd.zip':'https://www.anatel.gov.br/dadosabertos/paineis_de_dados/areastarifarias/pgcn.zip'
};
await Promise.all(Object.entries(sources).map(async([name,url])=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(600000)});if(!response.ok)throw Error(name+': '+response.status);
 await pipeline(Readable.fromWeb(response.body),createWriteStream(folder+'/'+name));console.log('Downloaded '+name);
}));
await fs.mkdir(folder+'/ddd',{recursive:true});
if(process.platform==='win32')execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Expand-Archive -LiteralPath 'artifacts/brazil-codes/ddd.zip' -DestinationPath 'artifacts/brazil-codes/ddd' -Force"],{stdio:'inherit'});
else execFileSync('unzip',['-o',folder+'/ddd.zip','-d',folder+'/ddd'],{stdio:'inherit'});
// An updated official snapshot must never reuse a previous processed mesh.
await fs.rm(folder+'/municipalities.geojson',{force:true});
