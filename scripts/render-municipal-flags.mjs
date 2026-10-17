
import fs from'node:fs';import{createHash}from'node:crypto';
const source=JSON.parse(fs.readFileSync('scripts/flag-renderings/sources.json'));
for(const [city,bottom]of [['Garbsen','#0f47af'],['Langenhagen','#fcdd09']]){
 const arm=fs.readFileSync('scripts/flag-renderings/'+city.toLowerCase()+'-arms.svg');
 if(createHash('sha256').update(arm).digest('hex')!==source[city].sha256)throw Error(city+' arms changed');
 // Reproduce municipal colours and the retained arms; no heraldic details are redrawn.
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600"><title>'+city+' municipal flag rendition</title><path fill="#da121a" d="M0 0h900v300H0z"/><path fill="'+bottom+'" d="M0 300h900v300H0z"/><image x="300" y="112" width="300" height="365" href="data:image/svg+xml;base64,'+arm.toString('base64')+'"/></svg>';
 fs.writeFileSync('scripts/flag-renderings/'+city.toLowerCase()+'-flag.svg',svg);
}
