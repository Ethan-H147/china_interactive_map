import {gunzipSync} from 'node:zlib';
export async function addBalticPronunciations(read,add) {
 for (const [country,language,levels] of [['estonia','et',[1,2]],['latvia','lv',[1]],['lithuania','lt',[1,2]]]) {
  const {records}=JSON.parse(gunzipSync(await read(`data/europe/${country}/catalogue.bin`)));
  for (const r of records.filter(r=>levels.includes(r.level))) {
   if (!r.local || r.local.includes('/')) throw Error('Check local name: '+r.id);
   add(country,r.id,r.level,r.en,r.local,language,{locale:language,context:`Read this ${country} place name once, clearly and naturally in the local language, without introduction or music.`});
  }
 }
}
