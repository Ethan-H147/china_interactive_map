export const normalizeName=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
export const shortEnglish=value=>value.replace(/\s+(?:(?:Tibetan|Mongol|Kazakh|Kyrgyz|Korean|Hui|Tujia|Miao|Dai|Jingpo|Lisu|Yi|Hani|Bai|Bouyei|Buyi|Zhuang|Dong|Qiang|Tu)\b.*)?(?:Autonomous Prefecture|Prefecture|League|City|County)$/i,'');
export const shortChinese=value=>value.replace(/(?:土家族|布依族|蒙古族|蒙古|哈萨克|柯尔克孜|朝鲜族|藏族|羌族|回族|土族|苗族|侗族|壮族|傣族|彝族|白族|哈尼族|傈僳族|景颇族).*自治州$/u,'').replace(/(?:自治州|地区|地區|市|县|縣|盟)$/u,'');
const commonAliases={540100:['Lasa'],540200:['Rikaze','Shigatse'],540300:['Changdu'],540400:['Linzhi'],540500:['Shannan'],540600:['Naqu'],542500:['Ali'],652800:['Bayinguoleng'],653000:['Kezilesu','Kizilsu'],653100:['Kashi'],653200:['Hetian'],654000:['Yili'],654200:['Tacheng'],654300:['Aletai'],632800:['Haixi'],222400:['Yanbian']};
export function aliases(place){return new Set([place.en,place.zh,shortEnglish(place.en),shortChinese(place.zh),...(place.aliases||[]),...(commonAliases[place.code]||[])].map(normalizeName).filter(Boolean));}
export function createNameRound(places,saved){
  if(!places.length)throw Error('Choose a province with mapped prefectures.');
  const valid=new Set(places.map(p=>p.code));
  const found=new Set((Array.isArray(saved?.found)?saved.found:[]).filter(c=>valid.has(c)));
  const hinted=new Set((Array.isArray(saved?.hinted)?saved.hinted:[]).filter(c=>valid.has(c)));
  return{places,found,hinted,complete:found.size===places.length,elapsed:Math.max(0,Number(saved?.elapsed)||0)};
}
export function submitName(round,value){
  if(round.complete)return{status:'complete'};
  const text=normalizeName(value);if(!text)return{status:'empty'};
  const matches=round.places.filter(p=>aliases(p).has(text));
  if(matches.length>1)return{status:'ambiguous'};
  if(!matches.length)return{status:'unknown'};
  const place=matches[0];if(round.found.has(place.code))return{status:'duplicate',place};
  round.found.add(place.code);round.complete=round.found.size===round.places.length;
  return{status:'correct',place};
}
export function nameHint(round){
  const place=round.places.find(p=>!round.found.has(p.code)&&!round.hinted.has(p.code))||round.places.find(p=>!round.found.has(p.code));
  if(!place)return null;round.hinted.add(place.code);
  return{place,en:[...shortEnglish(place.en)][0],zh:[...shortChinese(place.zh)][0]};
}
export const nameScore=round=>({found:round.found.size,total:round.places.length,unassisted:[...round.found].filter(c=>!round.hinted.has(c)).length,hints:round.hinted.size});
export function serializeNameRound(round){return{found:[...round.found],hinted:[...round.hinted],elapsed:round.elapsed};}
