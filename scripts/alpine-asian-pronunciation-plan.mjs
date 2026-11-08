import{gunzipSync}from'node:zlib';import{swissNameRows}from'../dist/swiss-names.mjs';
export const alpineAsianCountries=['thailand','bulgaria','austria','switzerland'];
const contexts={
 th:'อ่านชื่อจังหวัดหรือเขตการปกครองของประเทศไทยที่ระบุเพียงครั้งเดียว ด้วยภาษาไทยมาตรฐานอย่างเป็นธรรมชาติ ไม่ต้องเกริ่นนำหรืออธิบาย',
 bg:'Прочети само посоченото име на българската област веднъж, ясно и естествено на български, без увод или обяснение.',
 'de-AT':'Lies nur den angegebenen Namen eines österreichischen Bundeslandes einmal, in natürlichem österreichischem Standarddeutsch, ohne Einleitung oder Erklärung.',
 'de-CH':'Lies nur den angegebenen Schweizer Kantonsnamen einmal in Schweizer Standarddeutsch, kein Dialekt, ohne Einleitung oder Erklärung.',
 'fr-CH':'Prononce seulement le nom de canton indiqué une fois, naturellement en français de Suisse, sans introduction ni explication.',
 'it-CH':'Pronuncia soltanto il nome del cantone indicato una volta, in italiano svizzero naturale, senza introduzioni o spiegazioni.'
};
export async function addAlpineAsianPronunciations(read,add){
 for(const country of alpineAsianCountries){const records=JSON.parse(gunzipSync(await read('data/europe/'+country+'/catalogue.bin'))).records.filter(r=>r.level===1);
  for(const r of records){const forms=country==='switzerland'?swissNameRows(r).filter(n=>n.lang!=='rm'):[{lang:{thailand:'th',bulgaria:'bg',austria:'de'}[country],text:r.local}];
   forms.forEach(({lang,text,source},i)=>{const locale=country==='switzerland'?lang+'-CH':country==='austria'?'de-AT':lang;
    add(country,r.id,1,r.en,text,lang,{locale,context:contexts[locale],...(i?{variant:lang}:{}),...(source?{nameSource:source}:{}),voiceSettings:{stability:1,similarity_boost:.75,speed:1}});
   });
  }
 }
}
