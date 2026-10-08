import fs from 'node:fs';
import {mkdir,rm} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
const folder='artifacts/brazil-codes/',file=folder+'municipios.zip';
await mkdir(folder,{recursive:true});
if(fs.existsSync(file)){console.log('Using cached official IBGE 2025 municipal mesh');}
else{
 const url='https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/BR_Municipios_2025.zip';
 const response=await fetch(url,{signal:AbortSignal.timeout(600000)});if(!response.ok)throw Error('IBGE municipal download: '+response.status);
 const temporary=file+'.partial';
 try{await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(temporary));fs.renameSync(temporary,file);await rm(folder+'municipalities.geojson',{force:true});}catch(error){await rm(temporary,{force:true});throw error;}
 console.log('Downloaded official IBGE 2025 municipal mesh');
}
