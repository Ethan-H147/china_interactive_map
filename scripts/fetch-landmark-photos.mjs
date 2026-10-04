import fs from 'node:fs/promises';
const dir='artifacts/explore/';
const sites=JSON.parse(await fs.readFile(dir+'landmarks.json'));
const pages=JSON.parse(await fs.readFile(dir+'landmark-pages.json')).query;
const api=async params=>{const r=await fetch('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({format:'json',formatversion:'2',...params}),{headers:{'User-Agent':'ChinaAtlas/1.0 (https://china-boundary-atlas.hys0423.chatgpt.site/)'},signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(r.status);return r.json();};
const files=sites.map(s=>{const title=pages.redirects?.find(r=>r.from===s.article)?.to||s.article;return pages.pages.find(p=>p.title===title)?.pageimage}).filter(Boolean);
const data=await api({action:'query',titles:files.map(f=>'File:'+f).join('|'),prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:'2560'});
await fs.writeFile(dir+'photo-metadata.json',JSON.stringify(data));
for(const p of data.query.pages){const i=p.imageinfo?.[0];console.log(JSON.stringify({file:p.title,width:i?.width,height:i?.height,license:i?.extmetadata?.LicenseShortName?.value}));}
// Alternatives are reviewed visually before choosing files for the gallery.
const alternatives={};
for(const term of ['Wuhou Shrine Chengdu','Chengdu panda base panda','Humble Administrator Garden','Yunyan Pagoda','Canton Tower']){
 const result=await api({action:'query',generator:'search',gsrsearch:term+' filetype:bitmap',gsrnamespace:'6',gsrlimit:'8',prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:'2560'});alternatives[term]=result;console.log('Candidates',term,result.query?.pages?.filter(p=>p.imageinfo?.[0]?.width>=2400&&p.imageinfo?.[0]?.height>=1600).map(p=>p.title));
}
await fs.writeFile(dir+'photo-alternatives.json',JSON.stringify(alternatives));
