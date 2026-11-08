import {gunzipSync} from 'node:zlib';
export const expandedPronunciationCountries=['belgium','netherlands','united-kingdom','south-africa','saudi-arabia','india'];
const indianLanguages=new Set(['en','hi','bn','ta','te','mr','gu','kn','ml','pa','as','or','ne','ur','sd']);
// Only source-attested regional spellings in languages supported by the selected model.
export async function addMultilingualPronunciations(read,add){
 const catalogue=async country=>JSON.parse(gunzipSync(await read('data/'+(country==='south-africa'?'southern-africa/':'europe/')+country+'/catalogue.bin'))).records;
 for(const country of expandedPronunciationCountries){
  const records=(await catalogue(country)).filter(r=>r.level<=(country==='belgium'?2:country==='united-kingdom'?3:1));
  for(const r of records){
   let forms=[];
   if(country==='belgium'){
    if(['BE1','BE10'].includes(r.id))forms=[['fr','Région de Bruxelles-Capitale'],['nl','Brussels Hoofdstedelijk Gewest']];
    else{const lang=r.id==='BE2'||r.parent==='BE2'?'nl':'fr';forms=[[lang,r.local.replace(/^Prov\.\s*/u,'').replace(/\s*\(BE\)$/u,'')]];}
    if(r.id==='BE3')forms.push(['de','Wallonische Region']);
    if(r.id==='BE33')forms.push(['de','Lüttich']);
   }else if(country==='netherlands')forms=[['nl',r.local.replace(/\s*\(NL\)$/u,'')]];
   else if(country==='saudi-arabia')forms=[['ar',r.local]];
   else if(country==='south-africa')forms=[['en',r.en]];
   else if(country==='united-kingdom'){
    const native=(r.regionalNames||[]).filter(n=>['cy','ga'].includes(n.lang));
    forms=[['en',r.en],...native.map(n=>[n.lang,n.text])];
    if(native.some(n=>n.lang==='cy'&&n.text.normalize('NFC')===r.en.normalize('NFC')))forms=forms.filter(([lang])=>lang!=='en');
   }else if(country==='india'){
    forms=[['en',r.en],...[{lang:r.localLang,text:r.local},...(r.regionalNames||[])].filter(n=>indianLanguages.has(n.lang)&&!n.romanized&&!n.lang.includes('-Latn')).map(n=>[n.lang,n.text])];
   }
   const seen=new Set();forms=forms.filter(([lang,text])=>{const key=lang+':'+text.normalize('NFC');if(!text||seen.has(key))return false;seen.add(key);return true;});
   forms.forEach(([language,text],index)=>{
    const locale=language==='en'?({'united-kingdom':'en-GB','south-africa':'en-ZA',india:'en-IN'}[country]||'en'):country==='belgium'&&language==='fr'?'fr-BE':country==='belgium'&&language==='nl'?'nl-BE':country==='saudi-arabia'?'ar-SA':language;
    add(country,r.id,r.level,r.en,text,language,{locale,...(index?{variant:language}:{}),...(language==='ga'?{model:'eleven_v3'}:{})});
   });
  }
 }
}
