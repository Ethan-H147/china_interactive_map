import {koreanNameAliases} from './korean-names.mjs';
export const normalizeName=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
export const shortEnglish=value=>value.replace(/\s+(?:(?:Tibetan|Mongol|Kazakh|Kyrgyz|Korean|Hui|Tujia|Miao|Dai|Jingpo|Lisu|Yi|Hani|Bai|Bouyei|Buyi|Zhuang|Dong|Qiang|Tu)\b.*)?(?:Autonomous Prefecture|Prefecture|League|City|County)$/i,'');
export const shortChinese=value=>value.replace(/(?:土家族|布依族|蒙古族|蒙古|哈萨克|柯尔克孜|朝鲜族|藏族|羌族|回族|土族|苗族|侗族|壮族|傣族|彝族|白族|哈尼族|傈僳族|景颇族).*自治州$/u,'').replace(/(?:自治州|地区|地區|市|县|縣|盟)$/u,'');
const commonAliases={'US-DC':['Washington DC','DC','Washington, District of Columbia'],820000:['Macao','Macau'],540100:['Lasa'],540200:['Rikaze','Shigatse'],540300:['Changdu'],540400:['Linzhi'],540500:['Shannan'],540600:['Naqu'],542500:['Ali'],652800:['Bayinguoleng'],653000:['Kezilesu','Kizilsu'],653100:['Kashi'],653200:['Hetian'],654000:['Yili'],654200:['Tacheng'],654300:['Aletai'],632800:['Haixi'],222400:['Yanbian']};
export function aliases(place){return new Set([place.en,place.zh,shortEnglish(place.en),shortChinese(place.zh),...(place.aliases||[]),...koreanNameAliases(place),...(commonAliases[place.code]||[])].map(normalizeName).filter(Boolean));}

// Adjacent swaps, missing letters and extra letters count as small spelling edits.
function spellingDistance(a,b,limit){
 const x=[...a],y=[...b];if(Math.abs(x.length-y.length)>limit)return limit+1;
 let older=new Uint16Array(y.length+1),previous=Uint16Array.from({length:y.length+1},(_,i)=>i),current=new Uint16Array(y.length+1);
 for(let i=1;i<=x.length;i++){current[0]=i;for(let j=1;j<=y.length;j++){current[j]=Math.min(previous[j]+1,current[j-1]+1,previous[j-1]+(x[i-1]===y[j-1]?0:1));if(i>1&&j>1&&x[i-1]===y[j-2]&&x[i-2]===y[j-1])current[j]=Math.min(current[j],older[j-2]+1);}const reuse=older;older=previous;previous=current;current=reuse;}return previous[y.length];
}
export function spellingCandidate(value,places){
 const text=normalizeName(value);if([...text].length<3||[...text].length>80)return null;
 let nearest=null,best=Infinity,tied=false;
 for(const place of places){let distance=Infinity;for(const alias of aliases(place)){const length=Math.max([...alias].length,[...text].length);if(length<3||length>80||alias===text)continue;const limit=length>=8?2:1,d=spellingDistance(text,alias,limit);if(d<=limit)distance=Math.min(distance,d);}if(distance<best){best=distance;nearest=place;tied=false;}else if(distance===best&&Number.isFinite(distance)&&place.code!==nearest?.code)tied=true;}
 return tied?null:nearest;
}
export const spellingWarning=count=>'Close spelling. Try again ('+count+'/2).';

export function createNameRound(places,saved){
  if(!places.length)throw Error('Choose a province with mapped prefectures.');
  const valid=new Set(places.map(p=>p.code));
  const found=new Set((Array.isArray(saved?.found)?saved.found:[]).filter(c=>valid.has(c)));
  const hinted=new Set((Array.isArray(saved?.hinted)?saved.hinted:[]).filter(c=>valid.has(c)));
  const spellingWarnings=new Map(); // Older saved attempt counters do not apply to naming mode.
  return{places,found,hinted,spellingWarnings,complete:found.size===places.length,elapsed:Math.max(0,Number(saved?.elapsed)||0)};
}
export function submitName(round,value){
  if(round.complete)return{status:'complete'};
  const text=normalizeName(value);if(!text)return{status:'empty'};
  // Prefer complete display names before considering shared short aliases.
  const exact=round.places.filter(p=>[p.en,p.zh].some(n=>n&&normalizeName(n)===text));
  const matches=exact.length?exact:round.places.filter(p=>aliases(p).has(text));
  if(matches.length>1)return{status:'ambiguous'};
  if(!matches.length){const near=spellingCandidate(text,round.places.filter(p=>!round.found.has(p.code)));if(!near)return{status:'unknown'};return{status:'spelling'};}
  const place=matches[0];if(round.found.has(place.code))return{status:'duplicate',place};
  round.found.add(place.code);round.spellingWarnings.delete(place.code);round.complete=round.found.size===round.places.length;
  return{status:'correct',place};
}
export function nameHint(round){
  const place=round.places.find(p=>!round.found.has(p.code)&&!round.hinted.has(p.code))||round.places.find(p=>!round.found.has(p.code));
  if(!place)return null;round.hinted.add(place.code);
  return{place,en:[...shortEnglish(place.en)][0],zh:[...shortChinese(place.zh)][0]};
}
export const nameScore=round=>({found:round.found.size,total:round.places.length,unassisted:[...round.found].filter(c=>!round.hinted.has(c)).length,hints:round.hinted.size});
export function serializeNameRound(round){return{found:[...round.found],hinted:[...round.hinted],spellingWarnings:[...round.spellingWarnings],elapsed:round.elapsed};}
