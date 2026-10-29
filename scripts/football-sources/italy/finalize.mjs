import fs from'node:fs';import{gunzipSync}from'node:zlib';import{createHash}from'node:crypto';import{retain,root}from'./fetch.mjs';
const read=n=>gunzipSync(fs.readFileSync(root+n+'.gz')).toString();
const rows=JSON.parse(fs.readFileSync(root+'crests-result.json'));
const euro=[...read('extra/europlan-italy.html').matchAll(/fromLonLat\(\[\s*([\d.-]+),([\d.-]+)\]\)[\s\S]*?name: '([\s\S]*?)'\s*\}\);/g)].map(m=>({center:[+m[1],+m[2]],url:'https://www.europlan-online.de/'+m[3].match(/href=\\?"([^"\\]+)/)?.[1]}));
const patches={
 'albinoleffe':76571,'desenzano':83126,'ospitaletto':83126,'dolomiti-bellunesi':26415,'folgore-caratese':26253,'renate':26253,'atalanta-u23':25792,'sambenedettese':4160,'vado':26258,'pianese':82501,'altamura':26668,'scafatese':39260,
 'catanzaro':4103,'forli':4146,'audace-cerignola':26327,'barletta':4252,'giugliano':31156,'picerno':26328,'savoia':4231,'pineto':36319
};
for(const [id,venue]of Object.entries(patches)){const r=rows.find(r=>r.id==='it-'+id),p=euro.find(p=>p.url.endsWith('/stadion-'+venue+'.html'));if(!r||!p)throw Error('Missing stadium '+id);r.center=p.center;r.coordinateSource=p.url;}
const qs=Object.fromEntries(['stadiums-wikidata.json','extra-known-coordinates.json','extra-more-coordinates.json'].flatMap(n=>JSON.parse(read(n)).results.bindings).filter(x=>x.coord).map(x=>[(x.stadium||x.s).value.split('/').at(-1),x.coord.value.match(/[\d.-]+/g).map(Number)]));
for(const [id,q]of Object.entries({'guidonia-montecelio':'Q138039517','ostia-mare':'Q140537125'})){const r=rows.find(r=>r.id==='it-'+id);if(!qs[q])throw Error('Missing QID '+q);r.center=qs[q];r.coordinateSource='https://www.wikidata.org/wiki/'+q;}
const notes={
 'albinoleffe':'AlbinoLeffe Stadium is the main pitch at the Zanica campus, not the older municipal ground. The coarse article point was replaced with the named stadium point.',
 'desenzano':'2026–27 home matches at Gino Corioni in Ospitaletto, away from Desenzano del Garda.',
 'dolomiti-bellunesi':'Home matches at Zugni Tauro in Feltre.',
 'renate':'2026–27 home matches at XXV Aprile (Sportitalia Arena) in Carate Brianza.',
 'atalanta-u23':'Home matches at the current Comunale di Caravaggio, not the old municipal ground or club offices.',
 'ostia-mare':'2026–27 relocation to Pasquale Giannattasio (Stella Polare), replacing Anco Marzio.',
 'vado':'2026–27 home matches at Giuseppe Sivori in Sestri Levante, while Ferruccio Chittolina is unavailable.',
 'juventus-next-gen':'2026–27 home ground is Giuseppe Moccagatta in Alessandria; do not use the former 2024–25 ground in Biella.',
 'sorrento':'Current 2026–27 venue is Stadio Italia in Sorrento, replacing the previous temporary use of Potenza.',
 'sambenedettese':'Coarse article coordinate replaced with the center of the named Riviera delle Palme stadium.'
};
const groups={
 'it-san-siro':['inter-milan','ac-milan'],
 'it-olimpico':['roma','lazio'],
 'it-luigi-ferraris':['genoa','sampdoria'],
 'it-mapei':['sassuolo','reggiana'],
 'it-ernesto-breda':['alcione-milano','inter-milan-u23'],
 'it-gino-corioni':['desenzano','ospitaletto'],
 'it-xxv-aprile':['folgore-caratese','renate']
};
for(const [key,ids]of Object.entries(groups)){const center=rows.find(r=>r.id==='it-'+ids[0]).center;for(const id of ids){const r=rows.find(r=>r.id==='it-'+id);r.center=[...center];r.sharedGround=key;}}
for(const r of rows){r.center=r.center.map(x=>Number(x.toFixed(8)));if(notes[r.id.slice(3)])r.note=notes[r.id.slice(3)];r.aliases=[...new Set([...(r.aliases||[]),...({'it-inter-milan':['Inter','Internazionale'],'it-ac-milan':['Milan'],'it-inter-milan-u23':['Inter U23','Inter Under 23'],'it-ostia-mare':['Ostiamare'],'it-guidonia-montecelio':['Guidonia']}[r.id]||[])])].filter(x=>x&&x!==r.en);for(const field of['error','crestError'])delete r[field];}
for(const [name,url]of Object.entries({
 'official/desenzano-ground.html':'https://calciolecco1912.com/desenzano-lecco-le-formazioni-ufficiali/',
 'official/atalanta-u23-ground.html':'https://www.atalanta.it/news/atalanta-u23-guidonia-cosi-in-campo',
 'official/b-season.html':'https://www.legab.it/news/le-novita-della-serie-bkt-2026-2027'
})){try{await retain(name,url)}catch(e){console.log('Supplementary source',name,e.message)}}
const data={country:'italy',season:'2026–27',asOf:'2026-10-29',leagues:[{tier:1,name:'Serie A',count:20,sourceUrl:'https://images.legaseriea.it/image/private/fl_attachment/prd/czailts3apyt3kuxjran.pdf'},{tier:2,name:'Serie B',count:20,sourceUrl:'https://www.legab.it/seriebkt/squadre'},{tier:3,name:'Serie C',count:60,sourceUrl:'https://www.lega-pro.com/campionato/classifiche/girone-a/'}],clubs:rows};
fs.writeFileSync(root+'clubs.json',JSON.stringify(data,null,2)+'\n');
const m=JSON.parse(fs.readFileSync(root+'manifest.json'));
for(const name of['extra/scafatese-europlan.html','extra/scafatese-osm.json','extra/altamura-osm.json','extra/pianese-osm.json']){const file=root+name+'.gz';if(fs.existsSync(file))fs.unlinkSync(file);delete m.files[name];}
for(const r of rows){const name='crests/'+r.crest,b=fs.readFileSync(root+name);m.files[name]={url:r.crestSource,credit:'Club crest; PNG derivative of original-crests/'+r.id,sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length,compressed:false};}
fs.writeFileSync(root+'manifest.json',JSON.stringify(m,null,2)+'\n');console.log('Wrote',rows.length,'clubs,',Object.keys(groups).length,'shared grounds');